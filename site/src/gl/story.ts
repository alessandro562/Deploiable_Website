import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { COLORS } from '../config/brand';
import { BarGeometry, DEPTH as BAR_DEPTH } from './symbol/barGeometry';
import { createStudioMaterial } from './symbol/studioMaterial';
import { PIVOT, REST, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';

// Il racconto a scorrimento sotto l'hero (sezione .story dell'HTML), in uno "studio infinito": pavimento e
// parete raccordati in curva, luce morbida, ombre sotto le barre. Il 3D segue lo scorrimento, avanti e indietro;
// ogni step ha un tratto di sosta in cui testo e barra restano fermi.
//   step 1–3  una barra per step entra da fuori scena come vetro smerigliato, si posa al suo posto nel simbolo
//             (un piccolo assestamento e un lampo sugli spigoli) e diventa Lime metallico; al terzo step il
//             simbolo è completo
//   chiusura  il Lime sale dal basso, il simbolo diventa Forest e si gira di fronte, sopra
//             "Built to work. Ready to be yours." e il pulsante per la review
// Senza WebGL (o con riduzione del movimento) la stessa sezione è una pagina statica: testi uno sotto l'altro.

const ORDER = [2, 1, 0]; // barra di ogni step: bassa, centrale, alta
const STAGES = 4; // tre step più la chiusura
const FLOOR = -SYMBOL_H * 0.68;
const WALL_Z = -13;
const COVE = 9;
// Proporzioni vere: profondità circa metà dell'altezza di una barra (1,3 × 0,7 ≈ 0,9 unità). Con barre più
// profonde, viste di tre quarti, fianchi e facce superiori chiudevano gli spazi fra le barre.
const DEPTH = 0.7;
// Negli step il simbolo è girato di 17°: abbastanza per leggerne il volume, poco per chiudere gli spazi.
const YAW = -0.3;
// Ogni barra su un suo piano negli step (l'alta più indietro, la bassa più avanti): tre oggetti distinti anche
// quando hanno lo stesso colore. Nella chiusura tornano allineate. In unità del gruppo (× DEPTH in profondità).
const LAYER = [-0.45, 0, 0.45];

// Colori: per tutti e tre gli step lo sfondo è Forest e i blocchi diventano Lime metallico (Lime su Forest,
// come vuole il brand). Alla chiusura il Lime sale come un'onda dal basso e riempie lo schermo; dove l'onda
// passa i blocchi diventano Forest metallico (un taglio netto che sale con lei) e i testi passano a Forest.
const FOREST = new Color(COLORS.forest);
const LIME = new Color(COLORS.lime);
/** Avanzamento dell'onda Lime della chiusura (0 → 1). */
const waveAt = (s: number) => smooth(2.5, 2.86, s);
// Filo di luce sugli spigoli: bianco sul vetro, Lime chiaro sul metallo Lime, Mist sul metallo Forest.
const WHITE = new Color('#ffffff');
const EDGE_LIME = new Color(COLORS.lime).lerp(WHITE, 0.6);
const EDGE_FOREST = new Color(COLORS.mist);
// Luce del Lime: centro più chiaro, bordi nel Lime profondo (come il bianco della sezione due)
const LIME_HI = new Color(COLORS.lime).lerp(WHITE, 0.35);
const LIME_BASE = new Color(COLORS.limeDeep);

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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

/** Spigoli delle due facce di una barra (davanti e dietro), ognuno con la sua normale: la bisettrice fra la
 *  parete e la faccia. Il filo di luce si accende solo dove lo spigolo guarda la luce, come un bordo smussato. */
function edgeLines(geo: BarGeometry) {
  const { pts, ccw } = geo.contour();
  const h = BAR_DEPTH / 2;
  const pos: number[] = [];
  const nor: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    // normale esterna della parete a→b: (dy, -dx) con il contorno antiorario
    let nx = b[1] - a[1];
    let ny = a[0] - b[0];
    const l = (ccw ? 1 : -1) / (Math.hypot(nx, ny) || 1);
    nx *= l;
    ny *= l;
    for (const z of [h, -h]) {
      const nz = Math.sign(z);
      pos.push(a[0], a[1], z, b[0], b[1], z);
      nor.push(nx, ny, nz, nx, ny, nz);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color() }, // sopra l'onda Lime della chiusura
      uColorTo: { value: new Color() }, // dove l'onda è passata
      uOpacity: { value: 0 },
      uFlash: { value: 0 },
      uEdge: { value: -1 },
      uLight: { value: KEY },
    },
    vertexShader: /* glsl */ `
      uniform vec3 uLight;
      varying float vGlow;
      void main() {
        vGlow = smoothstep(0.05, 0.75, dot(normalize(mat3(modelMatrix) * normal), uLight));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uColorTo;
      uniform float uOpacity, uFlash, uEdge;
      varying float vGlow;
      void main() {
        float under = 1.0 - smoothstep(uEdge - 1.5, uEdge + 1.5, gl_FragCoord.y);
        gl_FragColor = vec4(mix(uColor, uColorTo, under), uOpacity * mix(1.0, 0.67, under) * max(vGlow, uFlash));
        #include <colorspace_fragment>
      }
    `,
  });
  const lines = new LineSegments(g, mat);
  lines.renderOrder = 2; // dopo le facce (che arretrano di un soffio: polygonOffset nel loro materiale)
  lines.frustumCulled = false;
  return { lines, mat };
}

type Bar = {
  mesh: Mesh;
  mat: ShaderMaterial;
  edges: ShaderMaterial;
  contact: Mesh;
  penumbra: Mesh;
  center: Vector3; // centro visivo della barra, nelle sue coordinate (la mesh è centrata sul perno)
  size: Vector3; // ingombro della barra
};

// Luce principale dello studio (dall'alto, da sinistra e da davanti): le ombre cadono dalla parte opposta.
// Lo studio ha una luce morbida e alta, quindi lo spostamento è ridotto rispetto a una luce puntiforme.
const LIGHT = new Vector3(-0.55, 0.75, 0.45).normalize();
const SHADOW_DRIFT = 0.45;
// la luce che accende il filo sugli spigoli: dall'alto e da sinistra, come quella che fa le ombre
const KEY = new Vector3(-0.5, 0.8, 0.35).normalize();

export class Story {
  private readonly scene = new Scene();
  private readonly room = new Scene();
  private readonly camera = new PerspectiveCamera(22, 1, 1, 800);
  private readonly group = new Group();
  private readonly bars: Bar[] = [];
  private readonly roomMat: ShaderMaterial;
  private readonly section: HTMLElement;
  private readonly pin: HTMLElement;
  private readonly steps: HTMLElement[];
  private readonly acts: HTMLElement;
  private readonly copy: HTMLElement;
  private readonly meter: HTMLElement | null;
  private readonly segments: HTMLElement[];
  private rect = { top: 0, bottom: 0 };
  private visible = false;
  private readonly tmp = new Vector3();
  private readonly bg = new Color(COLORS.forest); // sfondo dello studio (per i riflessi e le ombre)
  private readonly shadowColor = new Color();
  private wave = 0; // avanzamento dell'onda Lime della chiusura
  private readonly symShadow: Mesh[];
  private readonly header: HTMLElement | null;
  /** Lo sfondo del racconto è scuro in questo momento (l'header passa al vetro scuro). */
  dark = false;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  // lo scorrimento arriva a scatti (rotellina, trackpad): il racconto lo insegue con una molla smorzata,
  // così ogni movimento parte e si ferma morbido; in modalità test segue lo scorrimento all'istante
  private spring = { x: NaN, v: 0, last: 0 };
  // con il dito l'inerzia la fa già il telefono: la molla segue più stretta, senza ritardo
  private readonly stiff = matchMedia('(pointer: coarse)').matches ? 180 : 70;
  // misure della pagina che cambiano solo con resize, lingua e font (measure()): nessuna lettura di layout
  // per fotogramma oltre al rettangolo della sezione. Le quote sono relative alla fascia fissa (.story-pin).
  private lay = { pinH: 1, headerH: 64, copyTop: 0, copyRight: 0, actsTop: 0, actsBottom: 0, endTop: 0 };
  progress = -1;

  constructor(section: HTMLElement, private readonly instant = false) {
    this.section = section;
    this.pin = section.querySelector<HTMLElement>('.story-pin') ?? section;
    this.steps = Array.from(section.querySelectorAll<HTMLElement>('.act'));
    this.acts = section.querySelector<HTMLElement>('.story-acts') ?? section;
    this.copy = section.querySelector<HTMLElement>('.story-copy') ?? section;
    this.meter = section.querySelector<HTMLElement>('.story-meter');
    this.segments = Array.from(section.querySelectorAll<HTMLElement>('.story-meter i'));
    this.roomMat = new ShaderMaterial({
      side: DoubleSide,
      depthWrite: false,
      uniforms: {
        uForest: { value: FOREST },
        uEdge: { value: -1 },
        uTop: { value: 0 },
        uBottom: { value: 0 },
        uVh: { value: 1 },
        uRes: { value: new Vector2(1, 1) },
        uLimeHi: { value: LIME_HI },
        uLimeBase: { value: LIME_BASE },
      },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uForest;
        uniform float uTop, uBottom, uVh, uEdge;
        uniform vec2 uRes;
        uniform vec3 uLimeHi, uLimeBase;
        varying vec3 vW;
        void main() {
          // pavimento più chiaro (la luce cade dall'alto), parete un tono sotto, raccordo in leggera ombra:
          // si legge la stanza, sempre nella tinta dello sfondo.
          float h = vW.y - ${FLOOR.toFixed(2)};
          float wall = smoothstep(0.5, ${COVE.toFixed(1)} * 0.9, h);
          float pool = exp(-(vW.x * vW.x * 0.6 + (vW.z + 1.0) * (vW.z + 1.0)) / (2.0 * 15.0 * 15.0));
          float side = exp(-vW.x * vW.x / (2.0 * 55.0 * 55.0));
          // l'onda Lime della chiusura sale dal basso dello schermo, con un bordo morbido di pochi pixel
          float lime = 1.0 - smoothstep(uEdge - 1.5, uEdge + 1.5, gl_FragCoord.y);
          // il Lime ha la stessa luce della sezione bianca: ellisse 55% × 85%, centro chiaro, bordi Lime profondo
          vec2 q = (gl_FragCoord.xy / uRes - 0.5) / vec2(0.55, 0.85);
          vec3 limeLit = mix(uLimeHi, uLimeBase, clamp(length(q), 0.0, 1.0));
          vec3 bg = mix(uForest, limeLit, lime);
          vec3 col = mix(bg * (0.97 + 0.06 * pool), bg * mix(0.86, 1.0, 0.55), wall * 0.8);
          col *= mix(0.94, 1.0, side);
          float cove = exp(-pow((h - ${COVE.toFixed(1)} * 0.35) / 2.2, 2.0)) * smoothstep(${(WALL_Z + COVE).toFixed(1)}, ${(WALL_Z + COVE * 0.3).toFixed(1)}, vW.z);
          col *= 1.0 - 0.06 * cove;
          // in basso la fascia si fonde con il Lime pieno della pagina
          // in alto un bordo netto: il racconto è un capitolo nuovo, con il suo colore
          float fade = smoothstep(uTop - uVh * 0.004, uTop, gl_FragCoord.y)
                     + 1.0 - smoothstep(uBottom + uVh * 0.02, uBottom + uVh * 0.3, gl_FragCoord.y);
          gl_FragColor = vec4(mix(col, limeLit, clamp(fade, 0.0, 1.0)), 1.0);
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
      mat.uniforms.uLime.value = this.bg; // il pavimento che si riflette nel metallo è lo sfondo dello step
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      // filo di luce sugli spigoli delle due facce
      const { lines, mat: edges } = edgeLines(geo);
      mesh.add(lines);
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
      this.bars.push({ mesh, mat, edges, contact, penumbra, center: bb.getCenter(new Vector3()), size: bb.getSize(new Vector3()) });
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

    this.measure();
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
  }

  /** Rilegge le misure della pagina: da chiamare a resize, cambio lingua e font caricati. */
  measure() {
    const pin = this.pin.getBoundingClientRect();
    const c = this.copy.getBoundingClientRect();
    const a = this.acts.getBoundingClientRect();
    this.lay = {
      pinH: this.pin.clientHeight || innerHeight,
      headerH: this.header?.offsetHeight ?? 64,
      copyTop: c.top - pin.top,
      copyRight: c.right,
      actsTop: a.top - pin.top,
      actsBottom: a.bottom - pin.top,
      endTop: this.steps[STAGES - 1].offsetTop,
    };
  }

  /** width, height: il canvas (alto quanto lo schermo più grande); l'area visibile è lay.pinH. */
  update(time: number, width: number, height: number) {
    const L = this.lay;
    const r = this.section.getBoundingClientRect();
    this.rect = { top: r.top, bottom: r.bottom };
    this.visible = r.bottom > 0 && r.top < height;
    // la fascia è sticky in cima: dove sta adesso, senza leggerla dal layout
    const pinTop = Math.max(r.top, Math.min(0, r.bottom - L.pinH));
    const target = (-r.top / Math.max(1, r.height - L.pinH)) * (STAGES - 1);
    const now = performance.now();
    const sp = this.spring;
    const dt = Math.min(0.05, (now - sp.last) / 1000);
    sp.last = now;
    if (this.instant || Number.isNaN(sp.x) || Math.abs(target - sp.x) > 2.5) {
      sp.x = target;
      sp.v = 0;
    } else {
      // molla smorzata criticamente (circa 0,25 s per assestarsi): niente rimbalzi, niente scatti
      const k = this.stiff;
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
    this.wave = wave;
    this.bg.copy(FOREST).lerp(LIME, wave);
    this.shadowColor.copy(FOREST).multiplyScalar(0.3).lerp(FOREST, wave);
    // l'header resta vetro scuro finché l'onda Lime non arriva a metà della sua altezza
    const headerH = L.headerH;
    this.dark = this.visible && r.top <= 40 && (wave * 1.12 - 0.04) * height < height - headerH / 2;

    // testi: entrano e restano fermi per buona parte dello step, poi escono salendo
    this.steps.forEach((a, i) => {
      // il testo vecchio esce prima del cambio di colore, il nuovo entra subito dopo: mai due testi insieme
      // la chiusura entra quando l'onda Lime ha quasi riempito lo schermo
      const inn = i < STAGES - 1 ? smooth(i - 0.33, i - 0.12, s) : smooth(2.8, 2.95, s);
      const out = i < STAGES - 1 ? smooth(i + 0.42, i + 0.52, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.setProperty('--y', `${((1 - inn) * 24 - out * 24).toFixed(1)}px`);
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    // avanzamento: resta fermo sotto i testi per tutti e tre gli step; ogni segmento si riempie mentre il suo
    // step è sullo schermo e resta pieno dopo
    if (this.meter) {
      const shown = smooth(-0.33, -0.12, s) * (1 - smooth(2.42, 2.52, s));
      this.meter.style.opacity = shown.toFixed(3);
      this.meter.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
      this.segments.forEach((seg, i) => seg.style.setProperty('--fill', clamp01((s - (i - 0.33)) / 0.85).toFixed(3)));
    }
    if (!this.visible) return;

    // ogni barra entra da fuori scena (in alto a destra, dal fondo), avvitandosi, poi si posa e diventa metallo
    const envRot = Math.sin(time * 0.3) * 0.3;
    const front = smooth(2.35, 3, s);
    const tilt = 1 - front;
    const metals: number[] = [];
    ORDER.forEach((b, i) => {
      const k = smooth(i - 0.85, i - 0.25, s);
      const away = Math.pow(1 - k, 1.6);
      const metal = smooth(i - 0.32, i - 0.1, s); // vetro mentre arriva, metallo pieno quando si ferma
      // si posa: arrivata al suo posto scende ancora un poco (2% dell'altezza del simbolo) e risale;
      // intanto un lampo corre sugli spigoli
      const land = Math.sin(Math.PI * smooth(i - 0.34, i - 0.1, s));
      const flash = Math.sin(Math.PI * smooth(i - 0.3, i - 0.15, s));
      metals[b] = metal;
      const { mesh, mat, edges } = this.bars[b];
      mesh.visible = k > 0.001;
      mesh.position.set(PIVOT[b][0] + away * 26, PIVOT[b][1] + away * 16 - land * SYMBOL_H * 0.02, LAYER[b] * tilt - away * 10);
      mesh.rotation.set(away * 1.3, -away * 2.2, away * 0.9);
      mat.uniforms.uMetal.value = metal;
      mat.uniforms.uEnvRot.value = envRot;
      mesh.renderOrder = metal > 0.5 ? 0 : 1; // il vetro dopo il metallo
      edges.uniforms.uColor.value.copy(WHITE).lerp(EDGE_LIME, metal);
      edges.uniforms.uColorTo.value.copy(WHITE).lerp(EDGE_FOREST, metal);
      edges.uniforms.uOpacity.value = Math.min(1, 0.6 + 0.15 * metal + 0.4 * flash);
      edges.uniforms.uFlash.value = flash;
    });
    const click = smooth(1.75, 1.85, s) * (1 - smooth(1.85, 2.15, s)); // il simbolo si chiude: un piccolo colpo
    const breathe = Math.sin(time * 0.5) * 0.035 * tilt;
    const yaw = YAW * tilt + breathe;
    // fluttuazione della chiusura: due frequenze non multiple (niente altalena meccanica), un leggero dondolio
    // sugli assi che fa scorrere i riflessi sul metallo, e il simbolo che segue appena il puntatore
    const float = Math.sin(time * 0.9) * 0.72 + Math.sin(time * 0.37 + 1.1) * 0.28;
    this.group.rotation.set(
      front * (0.05 * Math.sin(time * 0.53 + 0.4) + this.pointer.y * 0.08),
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
      const strength = k * (0.35 + 0.65 * metals[b]) * tilt; // nella chiusura: un'ombra sola, centrata
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
    // telefono e tablet in verticale: simbolo sopra, testo sotto (stessa regola del CSS)
    const stacked = narrow || width / height <= 0.8;
    const aspect = width / height;
    // negli step la camera guarda appena dall'alto (si leggono pavimento, ombre e curva dello studio) con un
    // obiettivo medio-lungo, poca distorsione; nella chiusura scende all'altezza del simbolo e lo guarda dritto,
    // con un obiettivo più lungo (prospettiva piatta)
    this.camera.fov = 22 - 6 * front;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const pad = Math.min(48, Math.max(16, width * 0.04));
    // Negli step il simbolo sta accanto alla colonna di testo (sopra, su telefono e tablet in verticale), dentro
    // la griglia della pagina (al massimo 1120 px): le misure vengono dalla pagina, così a qualsiasi dimensione
    // dello schermo il simbolo non tocca mai il testo.
    // il blocco dei tre step (alto quanto il più alto) e la colonna con l'avanzamento, sullo schermo adesso
    const copyTop = pinTop + L.copyTop;
    let stepH: number, stepW: number, stepX: number, stepY: number;
    if (stacked) {
      const top = headerH + 16;
      const room = Math.max(80, copyTop - 32 - top);
      stepH = Math.min(room * 0.78, height * 0.42);
      stepW = (width - 2 * pad) * 0.8;
      stepX = width / 2;
      stepY = top + room / 2;
    } else {
      const left = L.copyRight + 48;
      const right = Math.min(width - pad, width / 2 + 560);
      stepH = height * 0.56;
      stepW = Math.max(120, right - left);
      stepX = (left + right) / 2;
      stepY = pinTop + (L.actsTop + L.actsBottom) / 2 - height * 0.02; // un filo sopra: l'ombra sta sotto
    }
    const dStep = Math.max(SYMBOL_H / ((stepH / height) * 2 * tan), SYMBOL_W / ((stepW / width) * 2 * tan * aspect));
    // nella chiusura: il simbolo sta nello spazio libero fra l'header e la frase, misurato sulla pagina (senza lo
    // spostamento d'ingresso del testo), così non tocca mai il testo e lascia posto anche all'ombra
    const top = headerH + 20;
    const textTop = pinTop + L.endTop;
    const room = Math.max(80, textTop - 14 - top);
    const symH = Math.min(height * 0.42, room * 0.8);
    const dEnd = Math.max(SYMBOL_H / ((symH / height) * 2 * tan), SYMBOL_W / ((narrow ? 0.66 : 0.5) * 2 * tan * aspect));
    // il simbolo (con la sua ombra sotto) si appoggia subito sopra la frase, senza vuoti in mezzo
    const centerY = Math.max(top + symH / 2, textTop - 14 - symH * 0.74);
    const d = dStep + (dEnd - dStep) * front;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.05;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.05;
    // appena sopra il simbolo negli step; quasi dritta nella chiusura (resta un filo d'altezza per l'ombra)
    const camY = d * (0.08 * tilt + 0.05 * front);
    const lookY = -SYMBOL_H * 0.2 * tilt;
    this.camera.aspect = aspect;
    // dove cade il centro del simbolo sullo schermo con questa camera (senza spostamenti né puntatore)
    this.camera.position.set(0, camY, d);
    this.camera.lookAt(0, lookY, 0);
    this.camera.clearViewOffset();
    this.camera.updateMatrixWorld();
    const centerPx = ((1 - this.tmp.set(0, 0, 0).project(this.camera).y) / 2) * height;
    const targetX = stepX + (width / 2 - stepX) * front;
    const targetY = stepY + (centerY - stepY) * front;
    this.camera.position.set(this.pointer.x * d * 0.06, camY - this.pointer.y * d * 0.04, d);
    this.camera.lookAt(0, lookY, 0);
    this.camera.setViewOffset(width, height, width / 2 - targetX, centerPx - targetY, width, height);
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
    this.roomMat.uniforms.uRes.value.set(width * dpr, height * dpr);
    // il bordo dell'onda Lime, in pixel dal basso: lo stesso per il fondo, le barre e i loro spigoli
    const edge = (this.wave * 1.12 - 0.04) * height * dpr;
    this.roomMat.uniforms.uEdge.value = edge;
    for (const { mat, edges } of this.bars) {
      mat.uniforms.uEdge.value = edge;
      edges.uniforms.uEdge.value = edge;
    }
    renderer.setScissorTest(true);
    renderer.setScissor(0, height - bottom, width, bottom - top);
    renderer.clearDepth();
    renderer.render(this.room, this.camera);

    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
  }
}
