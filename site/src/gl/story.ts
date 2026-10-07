import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { COLORS } from '../config/brand';
import { BarGeometry } from './symbol/barGeometry';
import { createStudioMaterial } from './symbol/studioMaterial';
import { PIVOT, REST, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';

// Il racconto a scorrimento sotto l'hero (sezione .story dell'HTML), in uno "studio infinito" Lime: pavimento
// e parete raccordati in curva, luce morbida, ombre sotto le barre. Il 3D segue lo scorrimento, avanti
// e indietro; ogni step ha un tratto di sosta in cui testo e barra restano fermi.
//   step 1–3  una barra per step entra da fuori scena come vetro smerigliato, prende il suo posto nel simbolo
//             e diventa Forest metallico; al terzo step il simbolo è completo
//   chiusura  il simbolo si gira di fronte, accanto a "We make AI deployable." e al pulsante per la review
// Senza WebGL (o con riduzione del movimento) la stessa sezione è una pagina statica: testi uno sotto l'altro.

const ORDER = [2, 1, 0]; // barra di ogni step: bassa, centrale, alta
const STAGES = 4; // tre step più la chiusura
const FLOOR = -SYMBOL_H * 0.68;
const WALL_Z = -13;
const COVE = 9;
const DEPTH = 1.6; // barre spesse: il volume si legge anche di fronte

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Profilo dello studio: pavimento, curva di raccordo, parete; esteso lungo x. */
function cycloramaGeometry() {
  const prof: [number, number][] = [[90, FLOOR]];
  const zc = WALL_Z + COVE;
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    prof.push([zc - COVE * Math.sin(a), FLOOR + COVE - COVE * Math.cos(a)]);
  }
  prof.push([WALL_Z, FLOOR + 140]);
  const pos: number[] = [];
  const X = 260;
  for (let i = 0; i < prof.length - 1; i++) {
    const [z0, y0] = prof[i];
    const [z1, y1] = prof[i + 1];
    pos.push(-X, y0, z0, X, y0, z0, X, y1, z1, -X, y0, z0, X, y1, z1, -X, y1, z1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

/** Ombra morbida sul pavimento: un disco sfumato (sharp alto = ombra di contatto, basso = penombra). */
function shadowMaterial(sharp: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new Color(COLORS.forest) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float r = length((vUv - 0.5) * 2.0);
        float a = pow(1.0 - smoothstep(0.0, 1.0, r), ${sharp.toFixed(1)}) * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

type Bar = { mesh: Mesh; mat: ShaderMaterial; contact: Mesh; penumbra: Mesh };

export class Story {
  private readonly scene = new Scene();
  private readonly room = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 1, 800);
  private readonly group = new Group();
  private readonly bars: Bar[] = [];
  private readonly roomMat: ShaderMaterial;
  private readonly section: HTMLElement;
  private readonly steps: HTMLElement[];
  private rect = { top: 0, bottom: 0 };
  private visible = false;
  private readonly tmp = new Vector3();
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  progress = -1;

  constructor(section: HTMLElement) {
    this.section = section;
    this.steps = Array.from(section.querySelectorAll<HTMLElement>('.act'));
    const lime = new Color(COLORS.lime);
    const limeDeep = new Color(COLORS.limeDeep);
    this.roomMat = new ShaderMaterial({
      side: DoubleSide,
      depthWrite: false,
      uniforms: {
        uLime: { value: lime },
        uLimeDeep: { value: limeDeep },
        uTop: { value: 0 },
        uBottom: { value: 0 },
        uVh: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLime, uLimeDeep;
        uniform float uTop, uBottom, uVh;
        varying vec3 vW;
        void main() {
          // pavimento più chiaro (la luce cade dall'alto), parete un tono sotto, raccordo in leggera ombra:
          // si legge la stanza. Tutto nella famiglia Lime / Lime Deep, mai verso l'oliva.
          float h = vW.y - ${FLOOR.toFixed(2)};
          float wall = smoothstep(0.5, ${COVE.toFixed(1)} * 0.9, h);
          float pool = exp(-(vW.x * vW.x * 0.6 + (vW.z + 1.0) * (vW.z + 1.0)) / (2.0 * 15.0 * 15.0));
          float side = exp(-vW.x * vW.x / (2.0 * 55.0 * 55.0));
          vec3 col = mix(uLime * (0.97 + 0.06 * pool), mix(uLimeDeep, uLime, 0.55), wall * 0.8);
          col *= mix(0.94, 1.0, side);
          float cove = exp(-pow((h - ${COVE.toFixed(1)} * 0.35) / 2.2, 2.0)) * smoothstep(${(WALL_Z + COVE).toFixed(1)}, ${(WALL_Z + COVE * 0.3).toFixed(1)}, vW.z);
          col *= 1.0 - 0.06 * cove;
          // in alto e in basso la fascia si fonde con il Lime pieno della pagina: nessuno stacco
          float fade = smoothstep(uTop - uVh * 0.32, uTop - uVh * 0.02, gl_FragCoord.y)
                     + 1.0 - smoothstep(uBottom + uVh * 0.02, uBottom + uVh * 0.3, gl_FragCoord.y);
          gl_FragColor = vec4(mix(col, uLime, clamp(fade, 0.0, 1.0)), 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const room = new Mesh(cycloramaGeometry(), this.roomMat);
    room.frustumCulled = false;
    this.room.add(room);

    const plane = new PlaneGeometry(1, 1);
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      geo.update(REST, true);
      const mat = createStudioMaterial();
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      // due ombre sotto ogni barra: quella di contatto, stretta e scura, e una penombra larga e chiara
      const contact = new Mesh(plane, shadowMaterial(2.4));
      const penumbra = new Mesh(plane, shadowMaterial(1.2));
      for (const m of [penumbra, contact]) {
        m.frustumCulled = false;
        this.room.add(m);
      }
      this.bars.push({ mesh, mat, contact, penumbra });
    }
    this.group.scale.z = DEPTH;
    this.scene.add(this.group);

    // la camera segue appena il puntatore: pochi gradi, smorzata (non sugli schermi touch)
    if (matchMedia('(hover: hover)').matches) {
      addEventListener(
        'pointermove',
        (e) => {
          this.pointer.tx = e.clientX / innerWidth - 0.5;
          this.pointer.ty = e.clientY / innerHeight - 0.5;
        },
        { passive: true },
      );
    }
    // il pulsante della chiusura riporta al modulo in cima e mette il cursore nell'email
    section.querySelector('.act-cta')?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => document.querySelector<HTMLInputElement>('#signup-email')?.focus({ preventScroll: true }), 700);
    });
  }

  update(time: number, width: number, height: number) {
    const r = this.section.getBoundingClientRect();
    this.rect = { top: r.top, bottom: r.bottom };
    this.visible = r.bottom > 0 && r.top < height;
    const s = (-r.top / Math.max(1, r.height - height)) * (STAGES - 1);
    this.progress = s;

    // testi: entrano e restano fermi per buona parte dello step, poi escono salendo
    this.steps.forEach((a, i) => {
      const inn = smooth(i - 0.42, i - 0.08, s);
      const out = i < STAGES - 1 ? smooth(i + 0.6, i + 0.9, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.setProperty('--y', `${((1 - inn) * 32 - out * 32).toFixed(1)}px`);
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    if (!this.visible) return;

    // ogni barra entra da fuori scena (in alto a destra, dal fondo), avvitandosi, poi diventa metallo
    const envRot = Math.sin(time * 0.35) * 0.5;
    const metals: number[] = [];
    ORDER.forEach((b, i) => {
      const k = smooth(i - 0.85, i - 0.25, s);
      const away = Math.pow(1 - k, 1.6);
      const metal = smooth(i - 0.32, i - 0.1, s); // vetro mentre arriva, metallo pieno quando si ferma
      metals[b] = metal;
      const { mesh, mat } = this.bars[b];
      mesh.visible = k > 0.001;
      mesh.position.set(PIVOT[b][0] + away * 26, PIVOT[b][1] + away * 16, -away * 10);
      mesh.rotation.set(away * 1.3, -away * 2.2, away * 0.9);
      mat.uniforms.uMetal.value = metal;
      mat.uniforms.uEnvRot.value = envRot;
      mesh.renderOrder = metal > 0.5 ? 0 : 1; // il vetro dopo il metallo
    });
    const front = smooth(2.35, 3, s);
    const click = smooth(1.75, 1.85, s) * (1 - smooth(1.85, 2.15, s)); // il simbolo si chiude: un piccolo colpo
    const breathe = Math.sin(time * 0.5) * 0.035 * (1 - front);
    const yaw = -0.6 * (1 - front) + breathe;
    this.group.rotation.set(0.1 * (1 - front), yaw, 0);
    const g = 1 + 0.035 * click;
    this.group.scale.set(g, g, DEPTH * g);
    this.group.updateMatrixWorld();

    // ombre: seguono la barra e la sua rotazione; più alta è la barra, più l'ombra si allarga e si schiarisce;
    // il vetro ne fa una leggera, il metallo una piena
    ORDER.forEach((b, i) => {
      const { mesh, contact, penumbra } = this.bars[b];
      mesh.getWorldPosition(this.tmp);
      const k = smooth(i - 0.85, i - 0.25, s);
      const lift = Math.max(0, this.tmp.y - FLOOR) / SYMBOL_H; // distanza dal pavimento, in altezze di simbolo
      const strength = k * (0.35 + 0.65 * metals[b]);
      const turn = yaw + mesh.rotation.y;
      const across = Math.max(0.4, Math.abs(Math.cos(mesh.rotation.x)));
      contact.rotation.set(-Math.PI / 2, 0, -turn);
      contact.position.set(this.tmp.x + SYMBOL_W * 0.04, FLOOR + 0.03, this.tmp.z + 0.6);
      contact.scale.set(SYMBOL_W * 0.62 * (1 + lift * 0.3), SYMBOL_H * 0.2 * across * (1 + lift * 0.4), 1);
      (contact.material as ShaderMaterial).uniforms.uOpacity.value = strength * 0.34 / (1 + lift * 1.6);
      penumbra.rotation.set(-Math.PI / 2, 0, -turn);
      penumbra.position.set(this.tmp.x + SYMBOL_W * 0.1, FLOOR + 0.02, this.tmp.z + 1.4);
      penumbra.scale.set(SYMBOL_W * 1.05 * (1 + lift * 0.5), SYMBOL_H * 0.55 * (1 + lift * 0.5), 1);
      (penumbra.material as ShaderMaterial).uniforms.uOpacity.value = strength * 0.16 / (1 + lift);
    });

    const narrow = width < 760;
    const aspect = width / height;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitH = SYMBOL_H / ((narrow ? 0.32 : 0.52) * 2 * tan);
    const fitW = SYMBOL_W / ((narrow ? 0.62 : 0.4) * 2 * tan * aspect);
    const d = Math.max(fitH, fitW) * (1 + 0.16 * front);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.05;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.05;
    // camera appena sopra il simbolo: si vedono il pavimento, le ombre e la curva dello studio
    this.camera.position.set(this.pointer.x * d * 0.08, d * (0.14 - this.pointer.y * 0.05), d);
    this.camera.lookAt(0, -SYMBOL_H * 0.2, 0);
    this.camera.aspect = aspect;
    this.camera.setViewOffset(width, height, narrow ? 0 : -width * 0.2, narrow ? height * 0.17 : 0, width, height);
    this.camera.updateMatrixWorld();
    for (const { mat } of this.bars) mat.uniforms.uCam.value.copy(this.camera.position);
  }

  /** Lo studio (solo dentro la fascia visibile), le ombre, poi le barre. */
  render(renderer: WebGLRenderer, width: number, height: number, dpr: number) {
    if (!this.visible) return;
    const top = Math.max(0, this.rect.top);
    const bottom = Math.min(height, this.rect.bottom);
    if (bottom <= top) return;
    this.roomMat.uniforms.uTop.value = (height - this.rect.top) * dpr;
    this.roomMat.uniforms.uBottom.value = (height - this.rect.bottom) * dpr;
    this.roomMat.uniforms.uVh.value = height * dpr;
    renderer.setScissorTest(true);
    renderer.setScissor(0, height - bottom, width, bottom - top);
    renderer.clearDepth();
    renderer.render(this.room, this.camera);

    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
  }
}
