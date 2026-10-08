// Motore 2.5D in SVG: un sistema di moduli (lastre estruse), collegamenti e impulsi di dati, visto da una camera
// con prospettiva. Nessun WebGL: ogni lastra è un rettangolo stondato con una trasformazione affine (la faccia
// resta nitida, le etichette sono testo vero), più i fianchi calcolati a ogni fotogramma. La prospettiva è
// "debole": ogni oggetto prende la scala della sua profondità, così le facce restano affini e i testi non si
// deformano, ma gli oggetti lontani sono più piccoli e la camera può girare, avvicinarsi e scorrere.
//
// Una scena è un elenco di oggetti con stati chiave (src/system/narrative.ts e src/system/minis.ts):
//   scene.frame(p) interpola fra gli stati chiave (p reale: 0 = primo stato, 1 = secondo, …) e ridisegna.
//
// Colori: solo la palette del brand. I moduli sono Pine sul Forest, i passaggi attivi e l'AI in Lime (su Lime
// il testo è Forest), le interfacce di prodotto in Mist.

export type V3 = [number, number, number];

export interface Cam {
  /** punto inquadrato (mondo) */
  t: V3;
  /** rotazione attorno all'asse verticale, gradi (negativa: la camera è a sinistra, le righe salgono a destra) */
  yaw: number;
  /** inclinazione verso il basso, gradi (90 = vista dall'alto) */
  pitch: number;
  /** pixel per unità al punto inquadrato */
  zoom: number;
  /** posizione a schermo del punto inquadrato (px) */
  cx: number;
  cy: number;
  /** distanza della camera (unità): più è piccola, più la prospettiva è forte */
  dist: number;
}

const RAD = Math.PI / 180;
const NS = 'http://www.w3.org/2000/svg';
export const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
};
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class Projector {
  r: V3 = [1, 0, 0];
  u: V3 = [0, 1, 0];
  b: V3 = [0, 0, 1];
  cam: Cam = { t: [0, 0, 0], yaw: 0, pitch: 50, zoom: 1, cx: 0, cy: 0, dist: 2400 };
  set(cam: Cam) {
    this.cam = cam;
    const th = cam.yaw * RAD;
    const ph = cam.pitch * RAD;
    const st = Math.sin(th);
    const ct = Math.cos(th);
    const sp = Math.sin(ph);
    const cp = Math.cos(ph);
    this.b = [st * cp, sp, ct * cp];
    this.r = [ct, 0, -st];
    this.u = [-sp * st, cp, -sp * ct];
  }
  /** profondità verso la camera (positiva = più vicino) */
  depth(x: number, y: number, z: number) {
    const c = this.cam.t;
    return (x - c[0]) * this.b[0] + (y - c[1]) * this.b[1] + (z - c[2]) * this.b[2];
  }
  /** pixel per unità a una certa profondità */
  scale(zc: number) {
    return this.cam.zoom * (this.cam.dist / Math.max(this.cam.dist * 0.2, this.cam.dist - zc));
  }
  pt(x: number, y: number, z: number, out: number[] = [0, 0, 0]) {
    const c = this.cam;
    const dx = x - c.t[0];
    const dy = y - c.t[1];
    const dz = z - c.t[2];
    const xc = dx * this.r[0] + dz * this.r[2];
    const yc = dx * this.u[0] + dy * this.u[1] + dz * this.u[2];
    const zc = dx * this.b[0] + dy * this.b[1] + dz * this.b[2];
    const s = this.scale(zc);
    out[0] = c.cx + xc * s;
    out[1] = c.cy - yc * s;
    out[2] = zc;
    return out;
  }
  /** direzione a schermo di un vettore del mondo (scala 1) */
  dir(x: number, y: number, z: number): [number, number] {
    return [x * this.r[0] + z * this.r[2], -(x * this.u[0] + y * this.u[1] + z * this.u[2])];
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Oggetti

/** Le proprietà animabili di un oggetto (tutte numeriche: si interpolano fra gli stati chiave). */
export interface Props {
  x: number;
  y: number;
  z: number;
  /** larghezza (lungo X) e profondità (lungo Z, o altezza per i pannelli in piedi) */
  w: number;
  d: number;
  /** spessore */
  h: number;
  /** opacità */
  o: number;
  /** scala uniforme (entrate e uscite) */
  s: number;
  /** tinta: 0 Pine → 1 Lime; mist: 0 → 1 Mist (le interfacce) */
  lime: number;
  mist: number;
  /** 1 = solo contorno tratteggiato (un modulo ancora da costruire) */
  ghost: number;
  /** opacità dell'etichetta */
  lo: number;
  /** avanzamento dei contenuti della faccia (interfacce, icone) */
  ui: number;
  /** posizione dell'etichetta nella faccia (frazioni della metà: -1..1) */
  lx: number;
  ly: number;
  /** ritardo dell'entrata in questo stato (0..0.6 del passaggio): i moduli arrivano uno dopo l'altro */
  delay: number;
}

export const DEFAULTS: Props = { x: 0, y: 0, z: 0, w: 120, d: 48, h: 10, o: 1, s: 1, lime: 0, mist: 0, ghost: 0, lo: 1, ui: 0, lx: 0, ly: 0, delay: 0 };

export interface FaceContent {
  /** disegna i contenuti nella faccia (coordinate locali: origine al centro, x a destra, y verso chi guarda) */
  build(g: SVGGElement, w: number, d: number): void;
  /** aggiorna i contenuti (avanzamento 0..1, tempo in secondi) */
  update(ui: number, time: number): void;
  /** testi da tradurre */
  setLang?(lang: 'it' | 'en'): void;
}

export interface ObjSpec {
  id: string;
  kind?: 'slab' | 'panel' | 'text';
  /** etichetta (testo per lingua); per 'text' è il testo stesso */
  label?: { it: string; en: string };
  /** dimensione dell'etichetta in unità del mondo */
  fs?: number;
  /** allineamento dell'etichetta */
  anchor?: 'start' | 'middle' | 'end';
  /** inclinazione della faccia (unità di X per unità di Z): -0,18 dà lati verticali con la camera a -10° */
  shear?: number;
  /** raggio degli angoli */
  r?: number;
  /** contenuti della faccia */
  face?: FaceContent;
  /** colore del testo per 'text' */
  ink?: 'lime' | 'sage' | 'mist';
  /** ombra a terra quando è sollevato */
  shadow?: boolean;
}

export interface LinkSpec {
  id: string;
  from: string | V3;
  to: string | V3;
  /** punto di aggancio sugli oggetti: c centro, l/r sinistra/destra, f/b davanti/dietro, ground (a terra, al centro) */
  fa?: Anchor;
  ta?: Anchor;
  /** percorso: diretto, prima lungo X o prima lungo Z (ortogonale, come uno schema tecnico) */
  via?: 'direct' | 'x' | 'z';
  /** spostamento laterale del percorso (unità), per due collegamenti fra gli stessi moduli */
  bend?: number;
}
type Anchor = 'c' | 'l' | 'r' | 'f' | 'b' | 'ground';

/** Le proprietà animabili di un collegamento. */
export interface LinkProps {
  /** opacità */
  o: number;
  /** tracciato disegnato (0..1) */
  draw: number;
  /** 0 Sage tratteggiato (manuale, frammentato) → 1 Lime pieno (il percorso nuovo) */
  active: number;
  /** impulsi di dati che scorrono (0..1 visibilità); il segno della velocità dà la direzione */
  pulse: number;
  delay: number;
}
export const LINK_DEFAULTS: LinkProps = { o: 1, draw: 1, active: 0, pulse: 0, delay: 0 };

// colori del brand e le loro ombre (fianchi delle lastre), in RGB
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0})`;
const TONES = {
  // faccia, fronte, fianco, filo di luce sul bordo, testo
  pine: { top: hex('#21412f'), front: hex('#0b1c13'), side: hex('#152f21'), edge: hex('#6f8a75'), ink: hex('#f1f3ea') },
  lime: { top: hex('#c8f25a'), front: hex('#7fa337'), side: hex('#a4cd45'), edge: hex('#e2fa9c'), ink: hex('#10261b') },
  mist: { top: hex('#f1f3ea'), front: hex('#8fa596'), side: hex('#c3cbbd'), edge: hex('#ffffff'), ink: hex('#10261b') },
};
export const INK = { lime: '#c8f25a', sage: '#8fa596', mist: '#f1f3ea', forest: '#10261b', pine: '#1c3a2a' };

function tone(p: Props, key: keyof typeof TONES.pine): RGB {
  let c = mix(TONES.pine[key], TONES.lime[key], clamp(p.lime));
  c = mix(c, TONES.mist[key], clamp(p.mist));
  return c;
}

/** Contorno di un rettangolo stondato centrato nell'origine (senso orario a schermo), campionato. */
function roundRect(w: number, d: number, r: number): number[] {
  const hw = w / 2;
  const hd = d / 2;
  r = Math.max(0, Math.min(r, hw, hd));
  const pts: number[] = [];
  const corners: [number, number, number][] = [
    [hw - r, -hd + r, -90],
    [hw - r, hd - r, 0],
    [-hw + r, hd - r, 90],
    [-hw + r, -hd + r, 180],
  ];
  const N = 4;
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= N; i++) {
      const a = (a0 + (90 * i) / N) * RAD;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }
  return pts;
}
const pathOf = (pts: number[]) => {
  let s = `M${f1(pts[0])} ${f1(pts[1])}`;
  for (let i = 2; i < pts.length; i += 2) s += `L${f1(pts[i])} ${f1(pts[i + 1])}`;
  return s + 'Z';
};

class Obj {
  readonly spec: ObjSpec;
  readonly kind: 'slab' | 'panel' | 'text';
  readonly g: SVGGElement;
  private readonly frameG: SVGGElement;
  private readonly sideF?: SVGPathElement;
  private readonly sideL?: SVGPathElement;
  private readonly face?: SVGPathElement;
  private readonly text?: SVGTextElement;
  private readonly shadow?: SVGPathElement;
  private readonly shadowG?: SVGGElement;
  private readonly content?: SVGGElement;
  private outline: number[] = [];
  private outlineKey = '';
  p: Props = { ...DEFAULTS };
  zc = 0;
  visible = true;

  constructor(spec: ObjSpec, layer: SVGGElement, shadows: SVGGElement) {
    this.spec = spec;
    this.kind = spec.kind ?? 'slab';
    this.g = el('g', { class: `obj obj--${this.kind}`, 'data-id': spec.id }, layer);
    this.frameG = el('g', {}, this.g);
    if (this.kind !== 'text') {
      if (spec.shadow !== false) {
        this.shadowG = el('g', {}, shadows);
        this.shadow = el('path', { fill: '#030b07' }, this.shadowG);
      }
      this.sideL = el('path', {}, this.frameG);
      this.sideF = el('path', {}, this.frameG);
      this.face = el('path', { 'vector-effect': 'non-scaling-stroke', 'stroke-width': 1 }, this.frameG);
    }
    if (spec.face) {
      this.content = el('g', { class: 'face-content' }, this.frameG);
      spec.face.build(this.content, 0, 0);
    }
    if (spec.label) {
      this.text = el(
        'text',
        {
          class: this.kind === 'text' ? 'sys-text' : 'sys-label',
          'text-anchor': spec.anchor ?? 'middle',
          'dominant-baseline': 'central',
          'font-size': spec.fs ?? 10,
        },
        this.frameG,
      );
      if (this.kind === 'text') this.text.setAttribute('fill', INK[spec.ink ?? 'sage']);
    }
  }

  setLang(lang: 'it' | 'en') {
    if (this.text && this.spec.label) this.text.textContent = this.spec.label[lang];
    this.spec.face?.setLang?.(lang);
  }

  /** world point of an anchor on the object's top face */
  anchor(a: Anchor = 'c'): V3 {
    const p = this.p;
    const sh = this.spec.shear ?? 0;
    const top = this.kind === 'panel' ? p.y : p.y + p.h * p.s;
    if (this.kind === 'panel') {
      // in piedi: facce verso chi guarda; agganci sui bordi
      const hw = (p.w * p.s) / 2;
      const hd = (p.d * p.s) / 2;
      switch (a) {
        case 'l': return [p.x - hw, top, p.z];
        case 'r': return [p.x + hw, top, p.z];
        case 'b': return [p.x, top + hd, p.z];
        case 'f':
        case 'ground': return [p.x, p.y - hd, p.z];
        default: return [p.x, top, p.z + p.h];
      }
    }
    const hw = (p.w * p.s) / 2;
    const hd = (p.d * p.s) / 2;
    switch (a) {
      case 'l': return [p.x - hw, top, p.z];
      case 'r': return [p.x + hw, top, p.z];
      case 'f': return [p.x + sh * hd, top, p.z + hd];
      case 'b': return [p.x - sh * hd, top, p.z - hd];
      case 'ground': return [p.x, 0, p.z];
      default: return [p.x, top, p.z];
    }
  }

  draw(P: Projector, time: number) {
    const p = this.p;
    const vis = p.o > 0.005 && p.s > 0.01;
    if (vis !== this.visible) {
      this.visible = vis;
      this.g.style.display = vis ? '' : 'none';
      if (this.shadowG) this.shadowG.style.display = vis ? '' : 'none';
    }
    if (!vis) return;
    const sh = this.spec.shear ?? 0;
    const panel = this.kind === 'panel';
    // centro della faccia visibile
    const fx = p.x;
    const fy = panel ? p.y : p.y + p.h * p.s;
    const fz = panel ? p.z + p.h * p.s : p.z;
    const c = P.pt(fx, fy, fz);
    this.zc = c[2];
    const k = P.scale(c[2]) * p.s;
    // assi della faccia: U = X; V = Z (+ inclinazione) per le lastre a terra, V = -Y per i pannelli in piedi
    const U = P.dir(1, 0, 0);
    const V = panel ? P.dir(0, -1, 0) : P.dir(sh, 0, 1);
    const a = U[0] * k;
    const b = U[1] * k;
    const cc = V[0] * k;
    const dd = V[1] * k;
    this.frameG.setAttribute('transform', `matrix(${f3(a)} ${f3(b)} ${f3(cc)} ${f3(dd)} ${f1(c[0])} ${f1(c[1])})`);
    this.g.setAttribute('opacity', f3(clamp(p.o)));

    if (this.kind !== 'text') {
      const r = this.spec.r ?? 7;
      const key = `${f1(p.w)}:${f1(p.d)}:${r}`;
      if (key !== this.outlineKey) {
        this.outlineKey = key;
        this.outline = roundRect(p.w, p.d, r);
        this.face!.setAttribute('d', pathOf(this.outline));
        if (this.shadow) this.shadow.setAttribute('d', pathOf(this.outline));
      }
      // estrusione: verso il basso (lastre) o all'indietro (pannelli), in coordinate locali della faccia
      const E = panel ? P.dir(0, 0, -1) : P.dir(0, -1, 0);
      const ex = (E[0] * p.h * k) / p.s;
      const ey = (E[1] * p.h * k) / p.s;
      const det = a * dd - b * cc;
      const wx = (dd * ex - cc * ey) / det;
      const wy = (-b * ex + a * ey) / det;
      const ghost = clamp(p.ghost);
      let front = '';
      let side = '';
      const o = this.outline;
      const n = o.length / 2;
      if (p.h > 0.2 && ghost < 0.99) {
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const x0 = o[i * 2];
          const y0 = o[i * 2 + 1];
          const x1 = o[j * 2];
          const y1 = o[j * 2 + 1];
          // normale uscente (contorno in senso orario a schermo): visibile se va nella direzione dell'estrusione
          const nx = y1 - y0;
          const ny = x0 - x1;
          if (nx * wx + ny * wy <= 0) continue;
          // fronte o fianco, secondo la direzione della normale a schermo
          const snx = a * nx + cc * ny;
          const sny = b * nx + dd * ny;
          const q = `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}L${f1(x1 + wx)} ${f1(y1 + wy)}L${f1(x0 + wx)} ${f1(y0 + wy)}Z`;
          if (sny > Math.abs(snx) * 0.8) front += q;
          else side += q;
        }
      }
      this.sideF!.setAttribute('d', front);
      this.sideL!.setAttribute('d', side);
      const sideO = f3(1 - ghost);
      this.sideF!.setAttribute('fill', css(tone(p, 'front')));
      this.sideL!.setAttribute('fill', css(tone(p, 'side')));
      this.sideF!.setAttribute('opacity', sideO);
      this.sideL!.setAttribute('opacity', sideO);
      // da costruire: la faccia è quasi del colore del fondo (copre ciò che sta dietro), solo il contorno si vede
      this.face!.setAttribute('fill', css(mix(tone(p, 'top'), hex('#10261b'), ghost * 0.85)));
      this.face!.setAttribute('fill-opacity', f3(1 - ghost * 0.1));
      const edge = ghost > 0.01 ? hex('#8fa596') : tone(p, 'edge');
      this.face!.setAttribute('stroke', css(edge));
      this.face!.setAttribute('stroke-opacity', f3(ghost > 0.01 ? 0.35 + 0.4 * ghost : p.mist > 0.5 ? 0 : 0.3 + 0.3 * p.lime));
      this.face!.setAttribute('stroke-dasharray', ghost > 0.5 ? '3 3' : 'none');

      // ombra a terra se la lastra è sollevata
      if (this.shadow && !panel) {
        const lift = p.y;
        // ombre leggere: si sommano dove gli strati si sovrappongono, quindi restano tenui
        const so = lift > 1 ? clamp(0.24 - lift / 900, 0.07, 0.22) * clamp(p.o) * (1 - ghost) : 0;
        if (so > 0.01) {
          // la luce viene dall'alto a sinistra: l'ombra cade un poco a destra e indietro
          const g = P.pt(p.x + lift * 0.18, 0, p.z - lift * 0.08);
          const kg = P.scale(g[2]) * p.s;
          const blur = 1 + lift / 700; // più alto, ombra un poco più larga
          this.shadowG!.setAttribute(
            'transform',
            `matrix(${f3(a * (kg / k) * blur)} ${f3(b * (kg / k) * blur)} ${f3(cc * (kg / k) * blur)} ${f3(dd * (kg / k) * blur)} ${f1(g[0])} ${f1(g[1])})`,
          );
          this.shadow.setAttribute('opacity', f3(so));
          this.shadowG!.style.display = '';
        } else this.shadowG!.style.display = 'none';
      }
    }
    if (this.text) {
      const hw = p.w / 2;
      const hd = p.d / 2;
      this.text.setAttribute('x', f1(p.lx * hw));
      this.text.setAttribute('y', f1(p.ly * hd));
      this.text.setAttribute('opacity', f3(clamp(p.lo)));
      if (this.kind !== 'text') this.text.setAttribute('fill', css(tone(p, 'ink')));
    }
    if (this.content && this.spec.face) {
      this.content.setAttribute('opacity', f3(clamp(p.ui * 3)));
      this.spec.face.update(p.ui, time);
    }
  }
}

class Link {
  readonly spec: LinkSpec;
  readonly path: SVGPathElement;
  readonly pulse: SVGPathElement;
  p: LinkProps = { ...LINK_DEFAULTS };
  speed: number;
  constructor(spec: LinkSpec, layer: SVGGElement, i: number) {
    this.spec = spec;
    this.path = el('path', { class: 'sys-link', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, layer);
    this.pulse = el('path', { class: 'sys-pulse', fill: 'none', 'stroke-linecap': 'round', pathLength: 1 }, layer);
    this.speed = 0.32 + ((i * 37) % 11) / 60;
  }
}

export interface SceneSpec {
  objects: ObjSpec[];
  links?: LinkSpec[];
  /** stati chiave: per ogni oggetto le proprietà diverse dai valori predefiniti; gli oggetti assenti sono invisibili */
  frames: { obj: Record<string, Partial<Props>>; link?: Record<string, Partial<LinkProps>> }[];
  /** suolo a puntini (lo spazio in cui si muove il sistema) */
  ground?: { size: number; step: number };
}

/** Riempie gli stati mancanti: un oggetto assente in uno stato resta dove era (o dove sarà), invisibile. */
function resolve<T extends object>(frames: (Partial<T> | undefined)[], defaults: T, hidden: Partial<T>): T[] {
  const out: T[] = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f) {
      out.push({ ...defaults, ...f });
      continue;
    }
    // il più vicino definito: prima indietro, poi avanti
    let near: Partial<T> | undefined;
    for (let d = 1; d < frames.length && !near; d++) near = frames[i - d] ?? frames[i + d];
    out.push({ ...defaults, ...(near ?? {}), ...hidden });
  }
  return out;
}

export class Scene {
  readonly svg: SVGSVGElement;
  readonly P = new Projector();
  private readonly objs: Obj[] = [];
  private readonly byId = new Map<string, Obj>();
  private readonly links: Link[] = [];
  private readonly objFrames: Props[][] = [];
  private readonly linkFrames: LinkProps[][] = [];
  private readonly objLayer: SVGGElement;
  private readonly ground?: { g: SVGGElement; size: number };
  private order: Obj[] = [];
  readonly count: number;
  lang: 'it' | 'en' = 'it';

  constructor(svg: SVGSVGElement, spec: SceneSpec) {
    this.svg = svg;
    svg.classList.add('sys');
    this.count = spec.frames.length;
    const root = el('g', {}, svg);
    if (spec.ground) {
      // puntini ogni `step` unità, in un motivo: un solo rettangolo trasformato come il suolo
      const id = `g${Math.random().toString(36).slice(2, 8)}`;
      const defs = el('defs', {}, svg);
      const pat = el('pattern', { id, width: spec.ground.step, height: spec.ground.step, patternUnits: 'userSpaceOnUse', x: spec.ground.step / 2, y: spec.ground.step / 2 }, defs);
      el('circle', { cx: spec.ground.step / 2, cy: spec.ground.step / 2, r: 1.1, fill: INK.sage }, pat);
      const mid = `${id}m`;
      const grad = el('radialGradient', { id: `${mid}g` }, defs);
      el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': 1 }, grad);
      el('stop', { offset: '0.55', 'stop-color': '#fff', 'stop-opacity': 0.5 }, grad);
      el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': 0 }, grad);
      const mask = el('mask', { id: mid, maskContentUnits: 'objectBoundingBox' }, defs);
      el('rect', { width: 1, height: 1, fill: `url(#${mid}g)` }, mask);
      const g = el('g', { class: 'sys-ground' }, root);
      const s = spec.ground.size;
      el('rect', { x: -s / 2, y: -s / 2, width: s, height: s, fill: `url(#${id})`, mask: `url(#${mid})` }, g);
      this.ground = { g, size: s };
    }
    const shadows = el('g', { class: 'sys-shadows' }, root);
    const linkLayer = el('g', { class: 'sys-links' }, root);
    this.objLayer = el('g', { class: 'sys-objs' }, root);
    for (const o of spec.objects) {
      const obj = new Obj(o, this.objLayer, shadows);
      this.objs.push(obj);
      this.byId.set(o.id, obj);
      this.objFrames.push(resolve(spec.frames.map((f) => f.obj[o.id]), DEFAULTS, { o: 0, lo: 0, ui: 0, delay: 0 }));
    }
    (spec.links ?? []).forEach((l, i) => {
      this.links.push(new Link(l, linkLayer, i));
      this.linkFrames.push(resolve(spec.frames.map((f) => f.link?.[l.id]), LINK_DEFAULTS, { o: 0, draw: 0, pulse: 0, delay: 0 }));
    });
    this.order = [...this.objs];
  }

  setLang(lang: 'it' | 'en') {
    this.lang = lang;
    for (const o of this.objs) o.setLang(lang);
  }

  /** Interpola gli stati chiave all'avanzamento p (0..count-1) e prepara le proprietà. */
  set(p: number) {
    const last = this.count - 1;
    p = clamp(p, 0, last);
    const i = Math.min(Math.floor(p), last - 1 < 0 ? 0 : last - 1);
    const t = this.count === 1 ? 0 : p - i;
    const j = Math.min(i + 1, last);
    this.objs.forEach((o, n) => {
      const A = this.objFrames[n][i];
      const B = this.objFrames[n][j];
      // ritardo dell'entrata nello stato B: il passaggio comincia più tardi e finisce in tempo
      const dl = B.delay;
      const u = smooth(clamp((t - dl) / Math.max(0.0001, 1 - dl)));
      const q = o.p;
      for (const k in A) (q as unknown as Record<string, number>)[k] = lerp((A as unknown as Record<string, number>)[k], (B as unknown as Record<string, number>)[k], u);
    });
    this.links.forEach((l, n) => {
      const A = this.linkFrames[n][i];
      const B = this.linkFrames[n][j];
      const dl = B.delay;
      const u = smooth(clamp((t - dl) / Math.max(0.0001, 1 - dl)));
      const q = l.p;
      for (const k in A) (q as unknown as Record<string, number>)[k] = lerp((A as unknown as Record<string, number>)[k], (B as unknown as Record<string, number>)[k], u);
    });
  }

  /** Disegna con la camera indicata. time anima impulsi e indicatori (secondi). */
  draw(cam: Cam, time: number) {
    const P = this.P;
    P.set(cam);
    if (this.ground) {
      const c = P.pt(0, 0, 0);
      const k = P.scale(c[2]);
      const U = P.dir(1, 0, 0);
      const V = P.dir(0, 0, 1);
      this.ground.g.setAttribute('transform', `matrix(${f3(U[0] * k)} ${f3(U[1] * k)} ${f3(V[0] * k)} ${f3(V[1] * k)} ${f1(c[0])} ${f1(c[1])})`);
    }
    for (const o of this.objs) o.draw(P, time);
    // ordine di disegno: dal più lontano al più vicino (solo se cambia)
    const sorted = [...this.objs].sort((a, b) => a.zc - b.zc);
    if (sorted.some((o, i) => o !== this.order[i])) {
      for (const o of sorted) this.objLayer.appendChild(o.g);
      this.order = sorted;
    }
    for (const l of this.links) this.drawLink(l, time);
  }

  /** Solo ciò che si muove col tempo (impulsi, indicatori): per i fotogrammi in cui la scena è ferma. */
  tick(time: number) {
    for (const l of this.links) {
      if (l.p.pulse > 0.01 && l.p.o > 0.005 && l.p.draw > 0.005) l.pulse.setAttribute('stroke-dashoffset', f3(-((time * l.speed) % 1)));
    }
    for (const o of this.objs) if (o.visible && o.spec.face && o.p.ui > 0) o.spec.face.update(o.p.ui, time);
  }

  private point(ref: string | V3, a: Anchor | undefined): V3 | null {
    if (typeof ref !== 'string') return ref;
    const o = this.byId.get(ref);
    return o ? o.anchor(a) : null;
  }

  private drawLink(l: Link, time: number) {
    const p = l.p;
    const vis = p.o > 0.005 && p.draw > 0.005;
    l.path.style.display = vis ? '' : 'none';
    l.pulse.style.display = vis && p.pulse > 0.01 ? '' : 'none';
    if (!vis) return;
    const A = this.point(l.spec.from, l.spec.fa);
    const B = this.point(l.spec.to, l.spec.ta);
    if (!A || !B) return;
    const bend = l.spec.bend ?? 0;
    const pts: V3[] = [A];
    const via = l.spec.via ?? 'direct';
    const ym = (A[1] + B[1]) / 2;
    if (via === 'x') pts.push([B[0], ym, A[2] + bend]);
    else if (via === 'z') pts.push([A[0] + bend, ym, B[2]]);
    else if (bend) pts.push([(A[0] + B[0]) / 2, ym, (A[2] + B[2]) / 2 + bend]);
    pts.push(B);
    const sp = pts.map((q) => this.P.pt(q[0], q[1], q[2]));
    // angoli arrotondati a schermo
    let d = `M${f1(sp[0][0])} ${f1(sp[0][1])}`;
    for (let i = 1; i < sp.length - 1; i++) {
      const [x0, y0] = sp[i - 1];
      const [x1, y1] = sp[i];
      const [x2, y2] = sp[i + 1];
      const l0 = Math.hypot(x1 - x0, y1 - y0);
      const l2 = Math.hypot(x2 - x1, y2 - y1);
      const r = Math.min(10, l0 / 2, l2 / 2);
      const ax = x1 - ((x1 - x0) / (l0 || 1)) * r;
      const ay = y1 - ((y1 - y0) / (l0 || 1)) * r;
      const bx = x1 + ((x2 - x1) / (l2 || 1)) * r;
      const by = y1 + ((y2 - y1) / (l2 || 1)) * r;
      d += `L${f1(ax)} ${f1(ay)}Q${f1(x1)} ${f1(y1)} ${f1(bx)} ${f1(by)}`;
    }
    const e = sp[sp.length - 1];
    d += `L${f1(e[0])} ${f1(e[1])}`;
    const act = clamp(p.active);
    const path = l.path;
    path.setAttribute('d', d);
    path.setAttribute('stroke', css(mix(hex(INK.sage), hex(INK.lime), act)));
    path.setAttribute('stroke-width', f1(1.2 + 0.6 * act));
    path.setAttribute('opacity', f3(clamp(p.o) * (0.75 + 0.25 * act)));
    // tratteggiato (manuale) o pieno (attivo); il pieno si disegna lungo il percorso
    if (act < 0.5) {
      path.removeAttribute('pathLength');
      path.setAttribute('stroke-dasharray', '4 4');
      path.removeAttribute('stroke-dashoffset');
    } else {
      path.setAttribute('pathLength', '1');
      path.setAttribute('stroke-dasharray', '1 1');
      path.setAttribute('stroke-dashoffset', f3(1 - clamp(p.draw)));
    }
    if (p.pulse > 0.01) {
      l.pulse.setAttribute('d', d);
      l.pulse.setAttribute('stroke', INK.lime);
      l.pulse.setAttribute('stroke-width', '3');
      l.pulse.setAttribute('stroke-dasharray', '0.07 0.43');
      l.pulse.setAttribute('stroke-dashoffset', f3(-((time * l.speed) % 1)));
      l.pulse.setAttribute('opacity', f3(clamp(p.pulse) * clamp(p.o)));
    }
  }
}
