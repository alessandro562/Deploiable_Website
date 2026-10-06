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
import { t, type Key } from '../i18n';
import { BarGeometry } from './symbol/barGeometry';
import { createStudioMaterial } from './symbol/studioMaterial';
import { PIVOT, REST, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';

// Prova (?story=1): il racconto a scorrimento sotto l'hero, in uno "studio infinito" Lime (pavimento e parete
// raccordati in curva, luce morbida, ombre sotto le barre). Il 3D segue lo scorrimento, avanti e indietro.
//   step 1–3  una barra per step entra da fuori scena come vetro smerigliato, prende il suo posto nel simbolo
//             e diventa Forest metallico; al terzo step il simbolo è completo
//   chiusura  il simbolo si gira di fronte, accanto a "We make AI deployable." e al pulsante per la review

const ORDER = [2, 1, 0]; // barra di ogni step: bassa, centrale, alta
const STAGES = 4; // tre step più la chiusura
const FLOOR = -SYMBOL_H * 0.68;
const WALL_Z = -13;
const COVE = 9;

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

export class Story {
  private readonly scene = new Scene();
  private readonly room = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 1, 800);
  private readonly group = new Group();
  private readonly bars: { mesh: Mesh; mat: ShaderMaterial; shadow: Mesh; shadowMat: ShaderMaterial }[] = [];
  private readonly roomMat: ShaderMaterial;
  private readonly section: HTMLElement;
  private readonly steps: HTMLElement[];
  private rect = { top: 0, bottom: 0 };
  private visible = false;
  private readonly tmp = new Vector3();
  progress = -1;

  constructor() {
    const lime = new Color(COLORS.lime);
    const limeDeep = new Color(COLORS.limeDeep);
    this.roomMat = new ShaderMaterial({
      side: DoubleSide,
      depthWrite: false,
      uniforms: { uLime: { value: lime }, uLimeDeep: { value: limeDeep }, uTop: { value: 0 }, uVh: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLime, uLimeDeep;
        uniform float uTop, uVh;
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
          // in alto la fascia si fonde con il Lime pieno dell'hero
          float fade = smoothstep(uTop - uVh * 0.32, uTop - uVh * 0.02, gl_FragCoord.y);
          gl_FragColor = vec4(mix(col, uLime, fade), 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const room = new Mesh(cycloramaGeometry(), this.roomMat);
    room.frustumCulled = false;
    this.room.add(room);

    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      geo.update(REST, true);
      const mat = createStudioMaterial();
      mat.uniforms.uLime.value = lime;
      mat.uniforms.uLimeDeep.value = limeDeep;
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      // ombra morbida sul pavimento, sotto la barra
      const shadowMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new Color(COLORS.forest) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
          void main() {
            float r = length((vUv - 0.5) * 2.0);
            float a = pow(1.0 - smoothstep(0.0, 1.0, r), 1.6) * uOpacity;
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
          }
        `,
      });
      const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.frustumCulled = false;
      this.room.add(shadow);
      this.bars.push({ mesh, mat, shadow, shadowMat });
    }
    this.group.scale.z = 1.6; // barre spesse: il volume si legge anche di fronte
    this.scene.add(this.group);

    // il testo: tre step (numero, titolo, riga) e la chiusura
    const el = (tag: string, cls: string, key?: Key, text?: string) => {
      const e = document.createElement(tag);
      e.className = cls;
      if (key) {
        e.dataset.i18n = key;
        e.textContent = t(key);
      } else if (text) e.textContent = text;
      return e;
    };
    this.section = el('section', 'story');
    this.section.setAttribute('aria-label', t('story.label'));
    this.section.dataset.i18nAttr = 'aria-label:story.label';
    const pin = el('div', 'story-pin');
    this.steps = ([1, 2, 3] as const).map((n) => {
      const a = el('article', 'act');
      a.append(el('p', 'act-num', undefined, `0${n} / 03`));
      a.append(el('h2', 'act-title', `story.${n}` as Key), el('p', 'act-sub', `story.${n}s` as Key));
      return a;
    });
    const end = el('article', 'act act--end');
    const claim = el('p', 'act-claim');
    claim.lang = 'en';
    claim.append(el('span', '', undefined, 'We make AI '), el('strong', '', undefined, 'deployable.'));
    const cta = el('a', 'act-cta', 'form.submit') as HTMLAnchorElement;
    cta.href = '#signup-email';
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => document.querySelector<HTMLInputElement>('#signup-email')?.focus({ preventScroll: true }), 700);
    });
    end.append(claim, cta);
    this.steps.push(end);
    pin.append(...this.steps);
    this.section.append(pin);
    document.querySelector('.hero')!.after(this.section);
  }

  update(time: number, width: number, height: number) {
    const r = this.section.getBoundingClientRect();
    this.rect = { top: r.top, bottom: r.bottom };
    this.visible = r.bottom > 0 && r.top < height;
    const s = (-r.top / Math.max(1, r.height - height)) * (STAGES - 1);
    this.progress = s;

    this.steps.forEach((a, i) => {
      const inn = smooth(i - 0.45, i - 0.05, s);
      const out = i < STAGES - 1 ? smooth(i + 0.55, i + 0.9, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.transform = `translate3d(0, ${((1 - inn) * 40 - out * 40).toFixed(1)}px, 0)`;
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    if (!this.visible) return;

    // ogni barra entra da fuori scena (in alto a destra, dal fondo), avvitandosi, poi diventa metallo
    ORDER.forEach((b, i) => {
      const k = smooth(i - 0.8, i - 0.12, s);
      const away = Math.pow(1 - k, 1.6);
      const metal = smooth(i - 0.2, i + 0.35, s);
      const { mesh, mat } = this.bars[b];
      mesh.visible = k > 0.001;
      mesh.position.set(PIVOT[b][0] + away * 26, PIVOT[b][1] + away * 16, -away * 10);
      mesh.rotation.set(away * 1.3, -away * 2.2, away * 0.9);
      mat.uniforms.uMetal.value = metal;
      mesh.renderOrder = metal > 0.5 ? 0 : 1; // il vetro dopo il metallo
    });
    const front = smooth(2.35, 3, s);
    const click = smooth(1.8, 1.95, s) * (1 - smooth(1.95, 2.25, s)); // il simbolo si chiude: un piccolo colpo
    const breathe = Math.sin(time * 0.5) * 0.035 * (1 - front);
    this.group.rotation.set(0.1 * (1 - front), -0.6 * (1 - front) + breathe, 0);
    const g = 1 + 0.035 * click;
    this.group.scale.set(g, g, 1.6 * g);
    this.group.updateMatrixWorld();

    // ombre: sotto ogni barra, più nette e scure quanto più la barra è metallo e vicina al suo posto
    ORDER.forEach((b, i) => {
      const { mesh, shadow, shadowMat } = this.bars[b];
      mesh.getWorldPosition(this.tmp);
      const k = smooth(i - 0.8, i - 0.12, s);
      shadow.position.set(this.tmp.x + SYMBOL_W * 0.08, FLOOR + 0.02, this.tmp.z + 1.2);
      shadow.scale.set(SYMBOL_W * 0.8, SYMBOL_H * 0.42, 1);
      shadowMat.uniforms.uOpacity.value = k * (0.16 + 0.2 * (this.bars[b].mat.uniforms.uMetal.value as number));
    });

    const narrow = width < 760;
    const aspect = width / height;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitH = SYMBOL_H / ((narrow ? 0.34 : 0.56) * 2 * tan);
    const fitW = SYMBOL_W / ((narrow ? 0.66 : 0.42) * 2 * tan * aspect);
    const d = Math.max(fitH, fitW) * (1 + 0.14 * front);
    // camera appena sopra il simbolo: si vedono il pavimento, le ombre e la curva dello studio
    this.camera.position.set(0, d * 0.14, d);
    this.camera.lookAt(0, -SYMBOL_H * 0.18, 0);
    this.camera.aspect = aspect;
    this.camera.setViewOffset(width, height, narrow ? 0 : -width * 0.19, narrow ? height * 0.15 : 0, width, height);
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
