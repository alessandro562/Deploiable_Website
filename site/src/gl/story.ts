import {
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
} from 'three';
import { PALETTES } from '../config/brand';
import { t, type Key } from '../i18n';
import { BarGeometry } from './symbol/barGeometry';
import { createBarMaterial, setPalette } from './symbol/barMaterial';
import { PIVOT, REST, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';

// Prova (?story=1): il racconto a scorrimento sotto l'hero. Il 3D resta fermo nello schermo e segue lo
// scorrimento, avanti e indietro. Cinque tappe:
//   0  il problema: i tre pezzi sono sparsi e fluttuano, non si incastrano (l'AI che resta una demo)
//   1–3 il metodo: trovare, costruire, misurare; ogni tappa porta una barra al suo posto (dal basso)
//   4  la chiusura: simbolo completo e di fronte, "We make AI deployable." e il pulsante per la review
// Profondità: barre spesse con luce da studio, un pavimento a griglia in prospettiva che riflette il simbolo.

const ORDER = [2, 1, 0]; // barra che arriva nelle tappe 1, 2, 3: bassa, centrale, alta
const STEPS = 5;
// dove fluttuano i pezzi nella tappa del problema (posizione e rotazione di ognuno)
const SCATTER = [
  { p: [3.2, 1.6, -4], r: [0.9, -1.1, 0.5] },
  { p: [-4.2, 0.4, -1.5], r: [-0.6, 0.9, -0.35] },
  { p: [2.4, -2.2, 2], r: [0.5, 0.6, 0.8] },
];

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export class Story {
  private readonly scene = new Scene();
  private readonly floorScene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 1, 600);
  private readonly group = new Group();
  private readonly inner = new Group();
  private readonly bars: { mesh: Mesh; mat: ShaderMaterial }[] = [];
  private readonly floor: ShaderMaterial;
  private readonly floorY = -SYMBOL_H * 0.95;
  private readonly section: HTMLElement;
  private readonly steps: HTMLElement[];
  private readonly rail: HTMLElement;
  private visible = false;
  progress = -1;

  constructor() {
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      geo.update(REST, true);
      const mat = createBarMaterial();
      setPalette(mat, PALETTES.forest); // Lime su Forest
      mat.uniforms.uLit.value = 1;
      mat.side = DoubleSide; // il riflesso è il simbolo capovolto
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.inner.add(mesh);
      this.bars.push({ mesh, mat });
    }
    this.inner.scale.z = 2.1; // barre spesse: il volume si legge anche di fronte
    this.group.add(this.inner);
    this.scene.add(this.group);

    // Pavimento: Forest quasi opaco (il riflesso traspare appena sotto il simbolo e si spegne in lontananza)
    // con una griglia sottile, nitida, che si dissolve verso l'orizzonte.
    this.floor = new ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vW;
        void main() {
          vec2 g = vW.xz / 2.4;
          vec2 a = abs(fract(g - 0.5) - 0.5) / fwidth(g);
          float line = 1.0 - min(min(a.x, a.y), 1.0);
          float r = length(vW.xz * vec2(1.0, 1.5));
          float near = 1.0 - smoothstep(4.0, 46.0, r);
          vec3 forest = vec3(0.0052, 0.0194, 0.0103);
          vec3 pine = vec3(0.0116, 0.0423, 0.0232);
          vec3 lime = vec3(0.578, 0.888, 0.102);
          vec3 col = forest + (pine * 2.2 + lime * 0.05) * line * near;
          float alpha = mix(1.0, 0.8, smoothstep(26.0, 3.0, r));
          gl_FragColor = vec4(col, alpha);
          #include <colorspace_fragment>
        }
      `,
    });
    const plane = new Mesh(new PlaneGeometry(220, 220), this.floor);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = this.floorY;
    plane.frustumCulled = false;
    this.floorScene.add(plane);

    // il testo: cinque tappe (titolo e riga di spiegazione) e una barra di avanzamento
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
    const copy: [Key, Key, string][] = [
      ['story.0', 'story.0s', ''],
      ['story.1', 'story.1s', '01'],
      ['story.2', 'story.2s', '02'],
      ['story.3', 'story.3s', '03'],
    ];
    this.steps = copy.map(([title, sub, num]) => {
      const a = el('article', 'act');
      a.append(num ? el('p', 'act-num', undefined, `${num} / 03`) : el('p', 'act-num', 'story.label'));
      a.append(el('h2', 'act-title', title), el('p', 'act-sub', sub));
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
    this.rail = el('div', 'story-rail');
    this.rail.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < STEPS; i++) this.rail.append(el('i', ''));
    pin.append(this.rail, ...this.steps);
    this.section.append(pin);
    document.querySelector('.hero')!.after(this.section);
  }

  update(time: number, width: number, height: number) {
    const r = this.section.getBoundingClientRect();
    this.visible = r.bottom > 0 && r.top < height;
    const s = (-r.top / Math.max(1, r.height - height)) * (STEPS - 1);
    this.progress = s;

    this.steps.forEach((a, i) => {
      const inn = smooth(i - 0.45, i - 0.05, s);
      const out = i < STEPS - 1 ? smooth(i + 0.55, i + 0.9, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.transform = `translate3d(0, ${((1 - inn) * 36 - out * 36).toFixed(1)}px, 0)`;
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    this.rail.style.setProperty('--p', Math.min(1, Math.max(0, s / (STEPS - 1))).toFixed(4));
    this.rail.style.opacity = String(smooth(-0.4, 0, s) * (1 - smooth(STEPS - 0.6, STEPS - 0.1, s)));
    Array.from(this.rail.children).forEach((c, i) => c.classList.toggle('on', s > i - 0.5));
    if (!this.visible) return;

    // pezzi: sparsi e fluttuanti nella tappa del problema, poi ognuno al suo posto nella sua tappa
    ORDER.forEach((b, i) => {
      const k = smooth(i + 0.2, i + 0.95, s);
      const away = 1 - k;
      const sc = SCATTER[b];
      const f = time * 0.6 + b * 2.1;
      const m = this.bars[b].mesh;
      m.position.set(
        PIVOT[b][0] + away * (sc.p[0] + Math.sin(f) * 0.5),
        PIVOT[b][1] + away * (sc.p[1] + Math.cos(f * 0.8) * 0.5),
        away * (sc.p[2] + Math.sin(f * 0.7) * 0.6),
      );
      m.rotation.set(away * (sc.r[0] + Math.sin(f * 0.5) * 0.15), away * sc.r[1], away * sc.r[2]);
    });
    const front = smooth(3.2, 4, s);
    const breathe = Math.sin(time * 0.45) * 0.08 * (1 - front * 0.7);
    // il simbolo ruota piano mentre si costruisce, poi si gira di fronte
    this.group.rotation.set(0.18 * (1 - front), -0.75 + 0.35 * smooth(0, 3, s) + 0.4 * front + breathe, 0);

    const narrow = width < 760;
    const aspect = width / height;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const spread = 1.4 - 0.4 * smooth(0.3, 3, s); // i pezzi sparsi occupano più spazio
    const fitH = (SYMBOL_H * spread) / ((narrow ? 0.36 : 0.56) * 2 * tan);
    const fitW = (SYMBOL_W * spread) / ((narrow ? 0.7 : 0.42) * 2 * tan * aspect);
    const d = Math.max(fitH, fitW) * (1 - 0.06 * front);
    // la camera guarda leggermente dall'alto: si vedono il pavimento e il riflesso
    this.camera.position.set(0, d * 0.16, d);
    this.camera.lookAt(0, -SYMBOL_H * 0.12, 0);
    this.camera.aspect = aspect;
    this.camera.setViewOffset(width, height, narrow ? 0 : -width * 0.18, narrow ? height * 0.14 : 0, width, height);
    this.camera.updateMatrixWorld();
    for (const { mat } of this.bars) mat.uniforms.uCam.value.copy(this.camera.position);
  }

  /** Riflesso (il simbolo capovolto sotto il pavimento), pavimento, poi il simbolo. */
  render(renderer: WebGLRenderer) {
    if (!this.visible) return;
    renderer.clearDepth();
    const g = this.group;
    g.position.y = 2 * this.floorY;
    g.scale.y = -1;
    g.updateMatrixWorld();
    renderer.render(this.scene, this.camera);
    g.position.y = 0;
    g.scale.y = 1;
    g.updateMatrixWorld();
    renderer.render(this.floorScene, this.camera);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  under(y: number) {
    const r = this.section.getBoundingClientRect();
    return r.top <= y && r.bottom > y;
  }
}
