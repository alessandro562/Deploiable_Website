import { gsap } from 'gsap';
import type { Capabilities } from './core/capabilities';
import { QUALITY } from './config/quality';
import { Engine } from './gl/engine';
import { Stage } from './gl/stage';
import { DURATION, LOCK, createState, stateAt } from './gl/choreography';
import { PALETTES, type PaletteName } from './config/brand';
import { Color } from 'three';
import { Backdrop } from './gl/backdrop';
import { onLangChange } from './i18n';

// Tre livelli, come nella skill web3d-integration-patterns (Pattern 1):
//  · 3D      Three.js: renderer, barre, scintille (src/gl)
//  · regia   keyframe sul tempo, con le curve di GSAP (src/gl/choreography.ts)
//  · testo   DOM, mosso dallo stesso tempo
// Un solo ciclo di rendering (il ticker di GSAP); si ferma quando la scheda è nascosta.
/** Palette predefinita dell'animazione (vedi src/config/brand.ts). */
const DEFAULT_PALETTE: PaletteName | 'flip' = 'flip';

export async function start(caps: Capabilities) {
  const q = new URLSearchParams(location.search);
  const testMode = q.has('__test');

  const hooks: DeploiableHooks = { ready: false, mode: 'webgl', tier: caps.tier, errors: [], duration: DURATION };
  window.__DEPLOIABLE__ = hooks;
  const onError = (e: ErrorEvent) => hooks.errors.push(String(e.message));
  window.addEventListener('error', onError);

  const quality = QUALITY[caps.tier];
  const canvas = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
  const engine = new Engine(canvas, quality, testMode);
  const stage = new Stage(engine.scene);
  const backdrop = new Backdrop(engine.bgScene);

  const claim = Array.from(document.querySelectorAll<HTMLElement>('.claim .line'));
  const sweep = document.querySelector<HTMLElement>('.sweep')!;
  const outro = document.querySelector<HTMLElement>('.outro')!;
  // la pillola di conferma prende il posto del modulo: entra con lui
  const outroItems = [['.sub'], ['.soon'], ['.signup', '.signup-done'], ['.signup-note'], ['.proof']].map((sel) =>
    sel.map((q) => document.querySelector<HTMLElement>(q)!),
  );
  const slotEl = document.querySelector<HTMLElement>('.logo-slot')!;
  const state = createState();

  let time = 0;
  let playing = true;
  let paused = false;

  // I testi che la supergrafica non deve mai toccare (in coordinate della pagina, non della finestra).
  const textSel = '.lang, .claim .line, .sub, .soon, .signup, .signup-done, .signup-note, .proof, .clients, .foot';
  let scrollY = window.scrollY;
  const measureSlot = () => {
    scrollY = window.scrollY;
    const r = slotEl.getBoundingClientRect();
    stage.setSlot({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width });
  };
  const measureTexts = () => {
    const y = window.scrollY;
    const rects = Array.from(document.querySelectorAll<HTMLElement>(textSel))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x0: r.left, y0: r.top + y, x1: r.right, y1: r.bottom + y }));
    backdrop.layout(rects, engine.width, engine.height);
  };

  // Palette: "forest" (barre Lime su Forest), "lime" (barre Forest su Lime) oppure "flip" (Forest fino al clic
  // dell'ultima barra, poi Lime). Si sceglie con ?palette=; il valore predefinito è in DEFAULT_PALETTE.
  const mode = (q.get('palette') ?? DEFAULT_PALETTE) as PaletteName | 'flip';
  const paletteAt = (t: number): PaletteName => (mode === 'flip' ? (t >= LOCK[0] ? 'lime' : 'forest') : mode);
  let current: PaletteName | null = null;
  const applyPalette = (name: PaletteName) => {
    if (name === current) return;
    current = name;
    stage.setPalette(name);
    backdrop.setPalette(name);
    (engine.bgScene.background as Color).set(PALETTES[name].background);
    // il cambio di palette è un taglio netto: nessuna transizione CSS deve sfumarlo
    const root = document.documentElement;
    root.classList.add('palette-snap');
    root.dataset.palette = name;
    void root.offsetWidth;
    root.classList.remove('palette-snap');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[name].background);
  };

  const draw = () => {
    stateAt(time, state);
    applyPalette(paletteAt(time));
    stage.apply(state, engine.camera, engine.width, engine.height);
    backdrop.apply(state, engine.bgCamera, engine.width, engine.height, scrollY);
    claim.forEach((el, i) => {
      const p = Math.min(1, Math.max(0, state.claim * 1.25 - i * 0.25));
      el.style.transform = `translate3d(0, ${((1 - p) * 150).toFixed(2)}%, 0)`;
    });
    // "Coming soon", modulo e nota: entrano uno dopo l'altro (80 ms), salendo di poco; finché sono invisibili
    // non si possono raggiungere col tab
    outro.style.visibility = state.outro > 0.01 ? 'visible' : 'hidden';
    outroItems.forEach((els, i) => {
      const p = Math.min(1, Math.max(0, state.outro * 1.75 - i * 0.18));
      const e = 1 - Math.pow(1 - p, 3);
      for (const el of els) {
        el.style.opacity = e.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - e) * 10).toFixed(2)}px, 0)`;
      }
    });
    // la linea: testa e coda sono percentuali della sua lunghezza
    sweep.style.clipPath = `inset(0 ${((1 - state.sweepHead) * 100).toFixed(2)}% 0 ${(state.sweepTail * 100).toFixed(2)}%)`;
    engine.render();
  };

  measureSlot();
  measureTexts();
  // Stato iniziale: testo nascosto prima del primo disegno, poi si attende font e shader.
  stateAt(0, state);
  claim.forEach((el) => (el.style.transform = 'translate3d(0, 150%, 0)'));
  await document.fonts.ready;
  measureTexts(); // con i font veri le righe hanno la loro larghezza definitiva
  // Riscaldamento: shader e geometrie vengono compilati e caricati sulla GPU ora, con la pagina ancora
  // nel Forest iniziale, così nessun scatto arriva all'incastro (9,2 s) o al lampo (10,2 s).
  stage.forceVisible();
  backdrop.forceVisible();
  await engine.warmup();
  engine.render();
  draw();

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((_t, deltaMs) => {
    if (!playing || paused) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    time += dt;
    draw();
  });
  window.addEventListener('resize', () => {
    engine.resize();
    measureSlot();
    measureTexts();
    draw();
  });
  // Lo scorrimento porta via con sé il logo dell'header e la supergrafica dell'hero: il 3D li segue.
  window.addEventListener(
    'scroll',
    () => {
      measureSlot();
      draw();
    },
    { passive: true },
  );
  // Cambiando lingua le righe cambiano larghezza: la supergrafica si ricalcola.
  onLangChange(() => requestAnimationFrame(() => (measureTexts(), draw())));
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused) gsap.ticker.sleep();
    else gsap.ticker.wake();
  });

  hooks.seek = (seconds) => {
    playing = false;
    time = seconds;
    draw();
    engine.sync(); // con la GPU software un fotogramma costoso può non essere ancora pronto per lo screenshot
  };
  hooks.play = () => {
    playing = true;
  };
  hooks.backdrop = () => ({ ...backdrop.box });
  hooks.state = () => ({ t: state.t, roll: [...state.roll], bgIn: [...state.bgIn], bgSlide: [...state.bgSlide], sweep: [state.sweepHead, state.sweepTail], letters: [...state.letters] });
  hooks.ready = true;
}
