import { Color, Group, Mesh, PerspectiveCamera, Scene, type ShaderMaterial, type WebGLRenderer } from 'three';
import { PALETTES } from '../config/brand';
import { t, type Key } from '../i18n';
import { BarGeometry } from './symbol/barGeometry';
import { createBarMaterial, setPalette } from './symbol/barMaterial';
import { PIVOT, REST, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';

// Prova (?story=1): il racconto a scorrimento. Sotto l'hero una fascia Forest alta cinque schermate; il 3D
// resta fermo al centro e segue lo scorrimento, avanti e indietro. Tre atti, tre barre, le frasi del
// sottotitolo: ogni barra entra con il suo atto (dal basso, come nell'intro), al terzo il simbolo è completo;
// in chiusura si gira di fronte, accanto a "We make AI deployable." e al pulsante per la review.

const ORDER = [2, 1, 0]; // barra che entra in ogni atto: bassa, centrale, alta
const ACTS = 4; // tre atti più la chiusura

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export class Story {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 1, 400);
  private readonly group = new Group(); // ruota attorno al centro dei pezzi arrivati
  private readonly inner = new Group(); // sposta i pezzi arrivati sul centro
  private readonly bars: { mesh: Mesh; mat: ShaderMaterial; center: [number, number] }[] = [];
  private readonly section: HTMLElement;
  private readonly acts: HTMLElement[];
  private readonly forest = new Color(PALETTES.forest.background);
  private readonly clear = new Color();
  private rect = { top: 0, bottom: 0, height: 1 };
  private visible = false;
  /** Avanzamento del racconto: 0 primo atto a schermo, 3 chiusura; negativo mentre la fascia entra. */
  progress = -1;

  constructor() {
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      geo.update(REST, true);
      const mat = createBarMaterial();
      setPalette(mat, PALETTES.forest); // Lime su Forest
      mat.uniforms.uLit.value = 1;
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.inner.add(mesh);
      // centro visivo della barra (la mesh è centrata sul perno, non sul suo centro)
      geo.geometry.computeBoundingBox();
      const bb = geo.geometry.boundingBox!;
      const center: [number, number] = [PIVOT[i][0] + (bb.min.x + bb.max.x) / 2, PIVOT[i][1] + (bb.min.y + bb.max.y) / 2];
      this.bars.push({ mesh, mat, center });
    }
    this.group.add(this.inner);
    this.scene.add(this.group);

    // il testo: un'etichetta, tre atti e la chiusura (le chiavi seguono il cambio di lingua)
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
    this.acts = (['story.1', 'story.2', 'story.3'] as Key[]).map((key, i) => {
      const a = el('article', 'act');
      a.append(el('p', 'act-num', undefined, `0${i + 1} / 03`), el('h2', 'act-title', key));
      return a;
    });
    const end = el('article', 'act act--end');
    const claim = el('p', 'act-claim');
    claim.append(el('span', '', undefined, 'We make AI '), el('strong', '', undefined, 'deployable.'));
    claim.lang = 'en';
    const cta = el('a', 'act-cta', 'form.submit') as HTMLAnchorElement;
    cta.href = '#signup-email';
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => document.querySelector<HTMLInputElement>('#signup-email')?.focus({ preventScroll: true }), 700);
    });
    end.append(claim, cta);
    this.acts.push(end);
    pin.append(...this.acts);
    this.section.append(pin);
    document.querySelector('.hero')!.after(this.section);
  }

  /** Misura la fascia e calcola la posa del simbolo per l'istante (time per il respiro lento). */
  update(time: number, width: number, height: number) {
    const r = this.section.getBoundingClientRect();
    this.rect = { top: r.top, bottom: r.bottom, height: r.height };
    this.visible = r.bottom > 0 && r.top < height;
    const s = (-r.top / Math.max(1, r.height - height)) * (ACTS - 1);
    this.progress = s;

    // testi: ogni atto entra salendo e se ne va salendo; la chiusura resta
    this.acts.forEach((a, i) => {
      const inn = smooth(i - 0.45, i - 0.05, s);
      const out = i < ACTS - 1 ? smooth(i + 0.55, i + 0.9, s) : 0;
      const o = inn * (1 - out);
      a.style.opacity = o.toFixed(3);
      a.style.transform = `translate3d(0, ${((1 - inn) * 28 - out * 28).toFixed(1)}px, 0)`;
      a.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    if (!this.visible) return;

    // barre: ognuna arriva da destra e dal fondo, avvitandosi, durante il suo atto
    let wx = 0, wy = 0, ws = 0;
    ORDER.forEach((b, act) => {
      const k = smooth(act - 0.8, act - 0.05, s);
      const m = this.bars[b].mesh;
      m.visible = k > 0.001;
      const away = 1 - k;
      m.position.set(PIVOT[b][0] + away * 16, PIVOT[b][1] - away * 3, -away * 14);
      m.rotation.set(away * 0.9, away * -1.4, away * 0.5);
      wx += this.bars[b].center[0] * k;
      wy += this.bars[b].center[1] * k;
      ws += k;
    });
    // la camera inquadra i pezzi già arrivati; a simbolo completo, il centro del simbolo
    const cx = ws > 0 ? wx / ws : 0;
    const cy = ws > 0 ? wy / ws : 0;
    const front = smooth(2.2, 3.1, s);
    const breathe = Math.sin(time * 0.5) * 0.06 * (1 - front * 0.6);
    this.inner.position.set(-cx, -cy, 0);
    this.group.rotation.set(0.22 * (1 - front) + breathe * 0.5, -0.62 * (1 - front) + breathe, 0);

    // inquadratura: simbolo alto metà schermo; su desktop a destra del testo, su telefono sopra
    const narrow = width < 760;
    const aspect = width / height;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitH = SYMBOL_H / (0.5 * 2 * tan);
    const fitW = SYMBOL_W / ((narrow ? 0.5 : 0.4) * 2 * tan * aspect);
    const zoom = 1 + 0.25 * (1 - smooth(-0.6, 0.3, s)) - 0.08 * smooth(2.4, 3.2, s);
    this.camera.position.set(0, 0, Math.max(fitH, fitW) * zoom);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = aspect;
    const shiftX = narrow ? 0 : -width * 0.17;
    const shiftY = narrow ? height * 0.17 : 0;
    this.camera.setViewOffset(width, height, shiftX, shiftY, width, height);
    this.camera.updateMatrixWorld();
    for (const { mat } of this.bars) mat.uniforms.uCam.value.copy(this.camera.position);
  }

  /** Disegna la fascia Forest e il simbolo, solo dentro la parte visibile della sezione. */
  render(renderer: WebGLRenderer, width: number, height: number) {
    if (!this.visible) return;
    const top = Math.max(0, this.rect.top);
    const bottom = Math.min(height, this.rect.bottom);
    if (bottom <= top) return;
    renderer.getClearColor(this.clear);
    const alpha = renderer.getClearAlpha();
    renderer.setScissorTest(true);
    renderer.setScissor(0, height - bottom, width, bottom - top);
    renderer.setClearColor(this.forest, 1);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setClearColor(this.clear, alpha);
  }

  /** La fascia copre l'header (per il vetro scuro). */
  under(y: number) {
    return this.rect.top <= y && this.rect.bottom > y;
  }
}
