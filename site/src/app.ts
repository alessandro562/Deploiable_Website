import { gsap } from 'gsap';
import type { Capabilities } from './core/capabilities';
import { QUALITY } from './config/quality';
import { Engine } from './gl/engine';
import { Stage } from './gl/stage';
import { DURATION, LOCK, createState, stateAt } from './gl/choreography';
import { PALETTES, type PaletteName } from './config/brand';
import { Color } from 'three';

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

  const claim = Array.from(document.querySelectorAll<HTMLElement>('.claim .line'));
  const sweep = document.querySelector<HTMLElement>('.sweep')!;
  const outro = document.querySelector<HTMLElement>('.outro')!;
  const slotEl = document.querySelector<HTMLElement>('.logo-slot')!;
  const state = createState();

  let time = 0;
  let playing = true;
  let paused = false;

  const measureSlot = () => {
    const r = slotEl.getBoundingClientRect();
    stage.setSlot({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width });
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
    (engine.scene.background as Color).set(PALETTES[name].background);
    document.documentElement.dataset.palette = name;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[name].background);
  };

  const draw = () => {
    stateAt(time, state);
    applyPalette(paletteAt(time));
    stage.apply(state, engine.camera, engine.width, engine.height);
    claim.forEach((el, i) => {
      const p = Math.min(1, Math.max(0, state.claim * 1.25 - i * 0.25));
      el.style.transform = `translate3d(0, ${((1 - p) * 110).toFixed(2)}%, 0)`;
    });
    // "Coming soon" e modulo: salgono di poco e compaiono; finché sono invisibili non si possono raggiungere col tab
    outro.style.opacity = state.outro.toFixed(3);
    outro.style.transform = `translate3d(0, ${((1 - state.outro) * 0.6).toFixed(3)}em, 0)`;
    outro.style.visibility = state.outro > 0.01 ? 'visible' : 'hidden';
    // la linea: testa e coda sono percentuali della sua lunghezza
    sweep.style.clipPath = `inset(0 ${((1 - state.sweepHead) * 100).toFixed(2)}% 0 ${(state.sweepTail * 100).toFixed(2)}%)`;
    engine.render();
  };

  measureSlot();
  // Stato iniziale: testo nascosto prima del primo disegno, poi si attende font e shader.
  stateAt(0, state);
  claim.forEach((el) => (el.style.transform = 'translate3d(0, 110%, 0)'));
  await document.fonts.ready;
  // Riscaldamento: shader e geometrie vengono compilati e caricati sulla GPU ora, con la pagina ancora
  // nel Forest iniziale, così nessun scatto arriva all'incastro (9,2 s) o al lampo (10,2 s).
  stage.forceVisible();
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
    draw();
  });
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
  hooks.state = () => ({ t: state.t, bump: [...state.bump], sweep: [state.sweepHead, state.sweepTail], letters: [...state.letters] });
  hooks.ready = true;
}
