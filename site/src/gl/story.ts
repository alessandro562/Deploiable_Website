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

// Colori: per tutti e tre gli step lo sfondo è Forest e i blocchi diventano Lime metallico (Lime su Forest,
// come vuole il brand). Alla chiusura il Lime sale come un'onda dal basso e riempie lo schermo; i blocchi
// passano a Forest metallico e i testi a Forest.
const FOREST = new Color(COLORS.forest);
const LIME = new Color(COLORS.lime);
/** Avanzamento dell'onda Lime della chiusura (0 → 1). */
const waveAt = (s: number) => smooth(2.5, 2.86, s);

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

type Bar = {
  mesh: Mesh;
  mat: ShaderMaterial;
  contact: Mesh;
  penumbra: Mesh;
  center: Vector3; // centro visivo della barra, nelle sue coordinate (la mesh è centrata sul perno)
  size: Vector3; // ingombro della barra
};

// Luce principale dello studio (dall'alto, da sinistra e da davanti): le ombre cadono dalla parte opposta.
// Lo studio ha una luce morbida e alta, quindi lo spostamento è ridotto rispetto a una luce puntiforme.
const LIGHT = new Vector3(-0.55, 0.75, 0.45).normalize();
const SHADOW_DRIFT = 0.45;

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
  private readonly bg = new Color(COLORS.forest); // sfondo dello studio (per i riflessi e le ombre)
  private readonly barColor = new Color(COLORS.lime);
  private readonly shadowColor = new Color();
  private readonly symShadow: Mesh[];
  private readonly header: HTMLElement | null;
  /** Lo sfondo del racconto è scuro in questo momento (l'header passa al vetro scuro). */
  dark = false;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  // lo scorrimento arriva a scatti (rotellina, trackpad): il racconto lo insegue con una molla smorzata,
  // così ogni movimento parte e si ferma morbido; in modalità test segue lo scorrimento all'istante
  private spring = { x: NaN, v: 0, last: 0 };
  progress = -1;

  constructor(section: HTMLElement, private readonly instant = false) {
    this.section = section;
    this.steps = Array.from(section.querySelectorAll<HTMLElement>('.act'));
    const lime = new Color(COLORS.lime);
    this.roomMat = new ShaderMaterial({
      side: DoubleSide,
      depthWrite: false,
      uniforms: {
        uLime: { value: lime },
        uForest: { value: FOREST },
        uWave: { value: 0 },
        uTop: { value: 0 },
        uBottom: { value: 0 },
        uVh: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLime, uForest;
        uniform float uTop, uBottom, uVh, uWave;
        varying vec3 vW;
        void main() {
          // pavimento più chiaro (la luce cade dall'alto), parete un tono sotto, raccordo in leggera ombra:
          // si legge la stanza. Tutto nella famiglia Lime / Lime Deep, mai verso l'oliva.
          float h = vW.y - ${FLOOR.toFixed(2)};
          float wall = smoothstep(0.5, ${COVE.toFixed(1)} * 0.9, h);
          float pool = exp(-(vW.x * vW.x * 0.6 + (vW.z + 1.0) * (vW.z + 1.0)) / (2.0 * 15.0 * 15.0));
          float side = exp(-vW.x * vW.x / (2.0 * 55.0 * 55.0));
          // l'onda Lime della chiusura sale dal basso dello schermo, con un bordo morbido di pochi pixel
          float edge = uWave * uVh * 1.12 - uVh * 0.04;
          float lime = 1.0 - smoothstep(edge - 3.0, edge + 3.0, gl_FragCoord.y);
          vec3 bg = mix(uForest, uLime, lime);
          vec3 col = mix(bg * (0.97 + 0.06 * pool), bg * mix(0.86, 1.0, 0.55), wall * 0.8);
          col *= mix(0.94, 1.0, side);
          float cove = exp(-pow((h - ${COVE.toFixed(1)} * 0.35) / 2.2, 2.0)) * smoothstep(${(WALL_Z + COVE).toFixed(1)}, ${(WALL_Z + COVE * 0.3).toFixed(1)}, vW.z);
          col *= 1.0 - 0.06 * cove;
          // in basso la fascia si fonde con il Lime pieno della pagina
          // in alto un bordo netto: il racconto è un capitolo nuovo, con il suo colore
          float fade = smoothstep(uTop - uVh * 0.004, uTop, gl_FragCoord.y)
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
      mat.uniforms.uBase.value = this.barColor;
      mat.uniforms.uLime.value = this.bg; // il pavimento che si riflette nel metallo è lo sfondo dello step
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      // due ombre sotto ogni barra: quella di contatto, stretta e scura, e una penombra larga e chiara
      const contact = new Mesh(plane, shadowMaterial(2.4));
      const penumbra = new Mesh(plane, shadowMaterial(1.2));
      for (const m of [penumbra, contact]) {
        (m.material as ShaderMaterial).uniforms.uColor.value = this.shadowColor;
        m.frustumCulled = false;
        this.room.add(m);
      }
      geo.geometry.computeBoundingBox();
      const bb = geo.geometry.boundingBox!;
      this.bars.push({ mesh, mat, contact, penumbra, center: bb.getCenter(new Vector3()), size: bb.getSize(new Vector3()) });
    }
    // l'ombra del simbolo intero, per la chiusura: centrata sotto il simbolo e dritta
    this.symShadow = [shadowMaterial(1.2), shadowMaterial(2.4)].map((m) => {
      m.uniforms.uColor.value = this.shadowColor;
      const mesh = new Mesh(plane, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.frustumCulled = false;
      this.room.add(mesh);
      return mesh;
    });
    this.header = document.querySelector('.top');
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
    const target = (-r.top / Math.max(1, r.height - height)) * (STAGES - 1);
    const now = performance.now();
    const sp = this.spring;
    const dt = Math.min(0.05, (now - sp.last) / 1000);
    sp.last = now;
    if (this.instant || Number.isNaN(sp.x) || Math.abs(target - sp.x) > 2.5) {
      sp.x = target;
      sp.v = 0;
    } else {
      // molla smorzata criticamente (circa 0,25 s per assestarsi): niente rimbalzi, niente scatti
      const k = 70;
      const c = 2 * Math.sqrt(k);
      for (let t = dt; t > 0; t -= 1 / 240) {
        const h = Math.min(t, 1 / 240);
        sp.v += (k * (target - sp.x) - c * sp.v) * h;
        sp.x += sp.v * h;
      }
    }
    const s = sp.x;
    this.progress = s;
    const wave = waveAt(s);
    this.roomMat.uniforms.uWave.value = wave;
    this.bg.copy(FOREST).lerp(LIME, wave);
    this.barColor.copy(LIME).lerp(FOREST, smooth(2.55, 2.86, s));
    this.shadowColor.copy(FOREST).multiplyScalar(0.3).lerp(FOREST, wave);
    this.dark = this.visible && r.top <= 40 && wave < 0.5;

    // testi: entrano e restano fermi per buona parte dello step, poi escono salendo
    this.steps.forEach((a, i) => {
      // il testo vecchio esce prima del cambio di colore, il nuovo entra subito dopo: mai due testi insieme
      // la chiusura entra quando l'onda Lime ha quasi riempito lo schermo
      const inn = i < STAGES - 1 ? smooth(i - 0.33, i - 0.12, s) : smooth(2.8, 2.95, s);
      const out = i < STAGES - 1 ? smooth(i + 0.42, i + 0.52, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.setProperty('--y', `${((1 - inn) * 32 - out * 32).toFixed(1)}px`);
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    if (!this.visible) return;

    // ogni barra entra da fuori scena (in alto a destra, dal fondo), avvitandosi, poi diventa metallo
    const envRot = Math.sin(time * 0.3) * 0.3;
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
    // fluttuazione della chiusura: due frequenze non multiple (niente altalena meccanica), un leggero dondolio
    // sugli assi che fa scorrere i riflessi sul metallo, e il simbolo che segue appena il puntatore
    const float = Math.sin(time * 0.9) * 0.72 + Math.sin(time * 0.37 + 1.1) * 0.28;
    this.group.rotation.set(
      0.1 * (1 - front) + front * (0.05 * Math.sin(time * 0.53 + 0.4) + this.pointer.y * 0.08),
      yaw + front * (0.08 * Math.sin(time * 0.41) + this.pointer.x * 0.14),
      0,
    );
    // nella chiusura il simbolo, di fronte, fluttua piano su e giù (l'ombra respira con lui)
    this.group.position.y = front * float * SYMBOL_H * 0.05; // stesso ritmo dell'ombra
    // respiro: salendo le tre barre si separano appena lungo il passo del simbolo, poi si richiudono
    const sep = front * SYMBOL_H * 0.03 * (float + 1) * 0.5;
    for (let b = 0; b < 3; b++) {
      this.bars[b].mesh.position.y += (1 - b) * sep;
      this.bars[b].mesh.position.x += (1 - b) * sep * 0.14;
    }
    const g = 1 + 0.035 * click;
    this.group.scale.set(g, g, DEPTH * g);
    this.group.updateMatrixWorld();

    // ombre: sotto il centro reale di ogni barra, spostate dalla parte opposta alla luce quanto più la barra è
    // alta, allungate come la barra e ruotate con lei; più è alta, più si allargano e si schiariscono.
    // Il vetro ne fa una leggera, il metallo una piena.
    ORDER.forEach((b, i) => {
      const { mesh, contact, penumbra, center, size } = this.bars[b];
      this.tmp.copy(center);
      mesh.localToWorld(this.tmp);
      const k = smooth(i - 0.85, i - 0.25, s);
      const h = Math.max(0, this.tmp.y - FLOOR); // altezza dal pavimento
      const lift = h / SYMBOL_H;
      const sx = this.tmp.x - (LIGHT.x / LIGHT.y) * h * SHADOW_DRIFT;
      const sz = this.tmp.z - (LIGHT.z / LIGHT.y) * h * SHADOW_DRIFT;
      const strength = k * (0.35 + 0.65 * metals[b]) * (1 - front); // nella chiusura: un'ombra sola, centrata
      const turn = yaw + mesh.rotation.y;
      const across = Math.max(0.45, Math.abs(Math.cos(mesh.rotation.x)));
      const len = size.x * g;
      const depth = size.z * DEPTH * g;
      contact.rotation.set(-Math.PI / 2, 0, -turn);
      contact.position.set(sx, FLOOR + 0.03, sz);
      contact.scale.set(len * 1.0 * (1 + lift * 0.25), depth * 1.5 * across * (1 + lift * 0.35), 1);
      (contact.material as ShaderMaterial).uniforms.uOpacity.value = (strength * 0.32) / (1 + lift * 1.4);
      penumbra.rotation.set(-Math.PI / 2, 0, -turn);
      penumbra.position.set(sx, FLOOR + 0.02, sz);
      penumbra.scale.set(len * 1.45 * (1 + lift * 0.4), depth * 3.2 * (1 + lift * 0.5), 1);
      (penumbra.material as ShaderMaterial).uniforms.uOpacity.value = (strength * 0.14) / (1 + lift);
    });

    // ombra della chiusura: centrata sotto il simbolo; respira con la fluttuazione (più su, più chiara e larga)
    const [symPen, symCon] = this.symShadow;
    symPen.position.set(0, FLOOR + 0.02, 0);
    symPen.scale.set(SYMBOL_W * 1.15 * (1 + 0.05 * float), SYMBOL_H * 0.42, 1);
    (symPen.material as ShaderMaterial).uniforms.uOpacity.value = front * 0.16 * (1 - 0.15 * float);
    symCon.position.set(0, FLOOR + 0.03, 0);
    symCon.scale.set(SYMBOL_W * 0.8 * (1 + 0.04 * float), SYMBOL_H * 0.16, 1);
    (symCon.material as ShaderMaterial).uniforms.uOpacity.value = front * 0.3 * (1 - 0.2 * float);

    const narrow = width < 760;
    const aspect = width / height;
    // negli step la camera guarda appena dall'alto (si leggono pavimento, ombre e curva dello studio); nella
    // chiusura scende all'altezza del simbolo e lo guarda dritto, con un obiettivo più lungo (prospettiva piatta)
    this.camera.fov = 28 - 12 * front;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    // negli step: simbolo alto metà schermo, a destra del testo (sopra, su telefono)
    const dStep = Math.max(SYMBOL_H / ((narrow ? 0.32 : 0.58) * 2 * tan), SYMBOL_W / ((narrow ? 0.62 : 0.4) * 2 * tan * aspect));
    // nella chiusura: il simbolo sta nello spazio libero fra l'header e la frase, misurato sulla pagina,
    // così non tocca mai il testo, a qualsiasi dimensione dello schermo (lascia posto anche all'ombra)
    const top = (this.header?.offsetHeight ?? 64) + 20;
    const textTop = this.steps[STAGES - 1].getBoundingClientRect().top;
    const room = Math.max(80, textTop - 14 - top);
    const symH = Math.min(height * 0.42, room * 0.8);
    const dEnd = Math.max(SYMBOL_H / ((symH / height) * 2 * tan), SYMBOL_W / ((narrow ? 0.66 : 0.5) * 2 * tan * aspect));
    // il simbolo (con la sua ombra sotto) si appoggia subito sopra la frase, senza vuoti in mezzo
    const centerY = Math.max(top + symH / 2, textTop - 14 - symH * 0.74);
    const d = dStep + (dEnd - dStep) * front;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.05;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.05;
    const tilt = 1 - front;
    // appena sopra il simbolo negli step; quasi dritta nella chiusura (resta un filo d'altezza per l'ombra)
    const camY = d * (0.14 * tilt + 0.05 * front);
    const lookY = -SYMBOL_H * 0.2 * tilt;
    this.camera.aspect = aspect;
    // dove cade il centro del simbolo sullo schermo con questa camera (senza spostamenti né puntatore)
    this.camera.position.set(0, camY, d);
    this.camera.lookAt(0, lookY, 0);
    this.camera.clearViewOffset();
    this.camera.updateMatrixWorld();
    const centerPx = ((1 - this.tmp.set(0, 0, 0).project(this.camera).y) / 2) * height;
    // dove deve stare: negli step all'altezza del centro del testo (un filo sopra, l'ombra sta sotto); su
    // telefono nella metà alta, sopra il testo; nella chiusura nello spazio libero sopra la frase
    const active = this.steps[Math.min(STAGES - 2, Math.max(0, Math.round(s)))].getBoundingClientRect();
    const textMid = active.height > 0 ? (active.top + active.bottom) / 2 : height * 0.5;
    const stepY = narrow ? height * 0.33 : textMid - height * 0.02;
    const targetY = stepY + (centerY - stepY) * front;
    this.camera.position.set(this.pointer.x * d * 0.06, camY - this.pointer.y * d * 0.04, d);
    this.camera.lookAt(0, lookY, 0);
    // composizione: negli step simbolo a destra del testo; nella chiusura al centro, sopra la frase e il pulsante
    // testo e simbolo formano un blocco unico centrato: il simbolo sta appena a destra della colonna di testo
    const shiftX = narrow ? 0 : -Math.min(width * 0.14, 230) * tilt;
    const shiftY = centerPx - targetY;
    this.camera.setViewOffset(width, height, shiftX, shiftY, width, height);
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
