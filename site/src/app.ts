import { gsap } from 'gsap';
import type { Capabilities } from './core/capabilities';
import { QUALITY } from './config/quality';
import { Engine } from './gl/engine';
import { Stage } from './gl/stage';
import { DURATION, LOCK, ROLL_DUR, createState, rollAt, stateAt, typewriter } from './gl/choreography';
import { PALETTES, type PaletteName } from './config/brand';
import { Color } from 'three';
import { Backdrop } from './gl/backdrop';
import { onLangChange } from './i18n';
import { Story } from './gl/story';
import { SILENZIO_A } from './gl/timeline';

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
  // il racconto a scorrimento sotto l'hero (la sezione è nell'HTML: senza 3D resta una pagina statica)
  const storyEl = document.querySelector<HTMLElement>('.story');
  const story = storyEl ? new Story(storyEl, testMode) : null;
  let darkUnder = false;

  const claim = Array.from(document.querySelectorAll<HTMLElement>('.claim .line'));
  const sweep = document.querySelector<HTMLElement>('.sweep')!;
  const outro = document.querySelector<HTMLElement>('.outro')!;
  // la pillola di conferma prende il posto del modulo: entra con lui
  const outroItems = [['.sub'], ['.soon'], ['.offer-title', '.offer'], ['.signup', '.signup-done'], ['.signup-note'], ['.proof']].map((sel) =>
    sel.map((q) => document.querySelector<HTMLElement>(q)!),
  );
  const slotEl = document.querySelector<HTMLElement>('.logo-slot')!;

  // Macchina da scrivere su "companies run on.": ogni lettera è uno <span>; quelle "cancellate" restano al loro posto
  // (visibility: hidden), così la parola non si ricentra a ogni lettera. Il testo intero resta per i lettori di schermo.
  const twLine = document.querySelector<HTMLElement>('.line--black')!;
  const word = twLine.textContent ?? '';
  const twVisual = document.createElement('span');
  twVisual.className = 'tw';
  twVisual.setAttribute('aria-hidden', 'true');
  const letters = Array.from(word, (ch) => {
    const el = document.createElement('span');
    el.className = 'ch';
    el.textContent = ch;
    return el;
  });
  const caret = document.createElement('i');
  caret.className = 'tw-caret';
  twVisual.append(...letters, caret);
  const twText = document.createElement('span');
  twText.className = 'sr-only';
  twText.textContent = word;
  twLine.replaceChildren(twText, twVisual);
  let caretX: number[] = []; // posizione del cursore dopo 0, 1, … n lettere (px, misurata una volta)
  const measureCaret = () => {
    caretX = [0, ...letters.map((l) => l.offsetLeft + l.offsetWidth)];
  };
  let twShown = -1;
  let twCaret = false;

  // Il simbolo nell'header gira su se stesso quando ci si passa sopra (o lo si raggiunge con la tastiera),
  // con lo stesso giro del ciclo. Solo a animazione finita, e mai sopra un giro già in corso.
  let hoverAt: number | null = null;
  const spin = () => {
    if (time < DURATION || hoverAt !== null || docked) return;
    hoverAt = time;
  };
  slotEl.addEventListener('pointerenter', spin);
  slotEl.addEventListener('focus', spin);
  const state = createState();

  let time = 0;
  let playing = true;
  let paused = false;

  // I testi che la supergrafica non deve mai toccare (in coordinate della pagina, non della finestra).
  const textSel = '.lang, .claim .line, .sub, .soon, .offer-title, .offer, .signup, .signup-done, .signup-note, .proof, .clients, .foot';
  let scrollY = window.scrollY;
  let moved = true; // la pagina si è mossa dall'ultimo disegno: il segnaposto del logo va rimisurato
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

  // Header fisso: scorrendo compare la barra di vetro e, a intro finita, il logo passa all'SVG sopra il vetro
  // (il vetro sfocherebbe il logo 3D, che sta sul canvas sotto la pagina).
  let scrolled = false;
  let docked = false;
  const dock = () => {
    const root = document.documentElement;
    if (scrolled !== scrollY > 2) root.classList.toggle('is-scrolled', (scrolled = scrollY > 2));
    if (docked !== (scrolled && time >= DURATION)) {
      docked = !docked;
      root.classList.toggle('is-docked', docked);
      stage.setHidden(docked);
      if (docked) hoverAt = null;
    }
  };

  const draw = () => {
    if (moved) {
      moved = false;
      measureSlot();
    }
    stateAt(time, state);
    dock();
    if (hoverAt !== null) {
      const u = time - hoverAt;
      if (u > ROLL_DUR + 0.3 || u < 0) hoverAt = null;
      else for (let b = 0; b < 3; b++) if (state.roll[b] === 0) state.roll[b] = rollAt(u, b);
    }
    const tw = typewriter(time, letters.length);
    if (tw.shown !== twShown || tw.caret !== twCaret) {
      for (let i = 0; i < letters.length; i++) letters[i].classList.toggle('off', i >= tw.shown);
      caret.style.transform = `translateX(${(caretX[tw.shown] ?? 0).toFixed(1)}px)`;
      caret.classList.toggle('on', tw.caret);
      twShown = tw.shown;
      twCaret = tw.caret;
    }
    applyPalette(paletteAt(time));
    // il simbolo è metallo nel colore del brand (Lime sul Forest dell'apertura, Forest dopo); le luci dello
    // studio ruotano piano, così i riflessi scorrono anche a simbolo fermo
    // (nel silenzio fra il clic e la linea anche le luci si fermano: il fotogramma resta immobile)
    const lightT = time < LOCK[0] ? time : time < SILENZIO_A ? LOCK[0] : time - (SILENZIO_A - LOCK[0]);
    stage.setChrome(1, Math.sin(lightT * 0.35) * 0.5);
    story?.update(time, engine.width, engine.height);
    // sopra la fascia scura del racconto l'header passa al vetro scuro
    if (story && story.dark !== darkUnder) document.documentElement.classList.toggle('is-dark-under', (darkUnder = story.dark));
    // camera cinematografica nell'intro: giri più ampi, che rientrano prima dell'incastro
    const amp = 1 + 0.7 * (1 - Math.min(1, Math.max(0, (time - (LOCK[2] - 0.6)) / 0.6)));
    state.az *= amp;
    state.el *= amp;
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
      const p = Math.min(1, Math.max(0, state.outro * 2 - i * 0.18));
      const e = 1 - Math.pow(1 - p, 3);
      for (const el of els) {
        el.style.opacity = e.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - e) * 10).toFixed(2)}px, 0)`;
      }
    });
    // la linea: testa e coda sono percentuali della sua lunghezza
    sweep.style.clipPath = `inset(0 ${((1 - state.sweepHead) * 100).toFixed(2)}% 0 ${(state.sweepTail * 100).toFixed(2)}%)`;
    engine.render(story ? () => story.render(engine.renderer, engine.width, engine.height, engine.dpr) : undefined);
  };

  measureSlot();
  measureTexts();
  // Stato iniziale: testo nascosto prima del primo disegno, poi si attende font e shader.
  stateAt(0, state);
  claim.forEach((el) => (el.style.transform = 'translate3d(0, 150%, 0)'));
  await document.fonts.ready;
  measureTexts(); // con i font veri le righe hanno la loro larghezza definitiva
  story?.measure();
  measureCaret();
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
    measureCaret();
    story?.measure();
    twShown = -1; // ridisegna il cursore nella nuova posizione
    draw();
  });
  // Lo scorrimento porta via con sé la supergrafica dell'hero (il 3D la segue) e accende il vetro dell'header.
  // Al massimo un disegno per fotogramma: lo scorrimento segna solo che la pagina si è mossa; se l'animazione
  // gira ci pensa il ticker, altrimenti (tempo fermo) si chiede un solo fotogramma.
  let queued = false;
  window.addEventListener(
    'scroll',
    () => {
      moved = true;
      if ((playing && !paused) || queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        draw();
      });
    },
    { passive: true },
  );
  // Cambiando lingua le righe cambiano larghezza: la supergrafica e il racconto si ricalcolano.
  onLangChange(() => requestAnimationFrame(() => (measureTexts(), story?.measure(), draw())));
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
  hooks.state = () => ({ tw: twShown, caret: twCaret, t: state.t, roll: [...state.roll], bgIn: [...state.bgIn], bgSlide: [...state.bgSlide], sweep: [state.sweepHead, state.sweepTail], letters: [...state.letters] });
  hooks.ready = true;
}
