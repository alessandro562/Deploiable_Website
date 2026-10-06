import { Track } from '../core/tracks';
import { PIVOT } from './symbol/symbolSpec';
import { WORDMARK_COUNT } from './wordmark';

// La regia dell'animazione. Ogni canale è una traccia a keyframe sul tempo (secondi): con lo stesso
// tempo si ottiene sempre lo stesso fotogramma, in avanti, all'indietro o fermi per i test.
//
//   0.0 – 1.3  La linea     una linea Lime si allarga e diventa una barra: sembra una sola
//   1.2 – 2.7  Il segreto   la camera gira di lato: sono tre barre, una dietro l'altra in profondità
//   2.65 – 4.1 Il deploy    ognuna vola al suo posto nel simbolo avvitandosi, la camera torna frontale;
//                           si incastrano dal basso con un clic secco, all'ultimo lo schermo passa al Lime
//   4.1 – 4.6  Silenzio     tutto fermo
//   4.6 – 6.6  Il logo      una linea a 8° attraversa lo schermo, la camera si ritira sul logo completo,
//                           le lettere del naming si aprono una dopo l'altra, compare la frase, poi il modulo

import { DURATION, LOCK, LOOP_PERIOD, LOOP_START, SILENZIO_A, TW_EMPTY, TW_ERASE, TW_HOLD, TW_START, TW_TYPE } from './timeline';

export { DURATION, LOCK, LOOP_PERIOD, LOOP_START, TIMES } from './timeline';

type Ch = 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz' | 'sx' | 'sy' | 'lift';
type Key = [time: number, value: number, ease?: string];
const CHANNELS: Ch[] = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'sx', 'sy', 'lift'];

export interface BarPose {
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number;
  lift: number;
}

export interface SceneState {
  t: number;
  bars: [BarPose, BarPose, BarPose];
  roll: [number, number, number]; // giro su se stessa di ogni barra del logo, nel ciclo dopo la fine
  bgIn: [number, number, number]; // 0..1 ingresso delle barre della supergrafica
  bgSlide: [number, number, number]; // 0..1 il "deploy" in ciclo delle barre della supergrafica
  bgRx: number;
  bgRy: number;
  az: number;
  el: number;
  dist: number; // moltiplicatore della distanza che inquadra il simbolo
  fov: number;
  spread: number; // 0..1 quanto le barre sono sparse: su schermi stretti la camera si allontana per tenerle dentro
  pull: number; // 0 camera sul simbolo, 1 camera sul logo completo
  letters: number[]; // 0..1 quanto è aperta ogni lettera del naming (da sinistra a destra)
  flatten: number;
  sweepHead: number; // la linea del finale: 0..1 quanto si è tracciata
  sweepTail: number; // 0..1 quanto si è già cancellata
  claim: number;
  outro: number;
}

/** Costruisce le tracce di una barra "andando da un punto al successivo", senza sovrapposizioni. */
class BarTimeline {
  private readonly keys = {} as Record<Ch, Key[]>;
  private readonly cur = {} as Record<Ch, number>;

  constructor(init: BarPose) {
    for (const c of CHANNELS) {
      this.keys[c] = [[0, init[c]]];
      this.cur[c] = init[c];
    }
  }

  go(t0: number, t1: number, ease: string, vals: Partial<Record<Ch, number>>) {
    for (const c of Object.keys(vals) as Ch[]) {
      const list = this.keys[c];
      const last = list[list.length - 1];
      if (last[0] > t0 + 1e-9) throw new Error(`regia: sovrapposizione su "${c}" a t=${t0}`);
      if (last[0] < t0) list.push([t0, this.cur[c]]);
      list.push([t1, vals[c]!, ease]);
      this.cur[c] = vals[c]!;
    }
    return this;
  }

  tracks(): Record<Ch, Track> {
    const out = {} as Record<Ch, Track>;
    for (const c of CHANNELS) out[c] = new Track(this.keys[c]);
    return out;
  }
}

const HAIR = 0.012; // spessore della linea iniziale
const A = PIVOT; // posizione di incastro: il simbolo assemblato
// In profondità: davanti la barra alta, in mezzo la centrale, dietro la bassa. Da davanti coincidono.
const DEPTH = [6, 0, -6];

const FLIGHT = 1.15; // durata del volo di ogni barra verso il suo posto
/** Il silenzio: nessun movimento di camera dall'ultimo clic (meno 0,3 s) fino alla linea del finale. */
const SILENZIO_DA = LOCK[0] - 0.3;

function buildBars(): Record<Ch, Track>[] {
  const tls = [0, 1, 2].map(
    (b) => new BarTimeline({ x: 0, y: 0, z: DEPTH[b], rx: 0, ry: 0, rz: 0, sx: 0, sy: HAIR, lift: 0 }),
  );

  for (let b = 0; b < 3; b++) {
    const tl = tls[b];
    // ---- La linea: si allarga dal centro e diventa una barra piena (le tre insieme: da davanti è una sola)
    tl.go(0.2, 0.95, 'expo.out', { sx: 1 });
    tl.go(0.85, 1.3, 'back.out(1.6)', { sy: 1 });
    // ---- Il segreto: mentre la camera gira, le lastre si aprono un po' di più e si sfalsano appena
    tl.go(1.2, 2.6, 'power2.inOut', { z: DEPTH[b] * 1.25, y: (1 - b) * 0.9, x: (b - 1) * 1.2 });

    // ---- Il deploy: ognuna vola al suo posto con un avvitamento completo; la traiettoria curva nasce
    // da andature diverse in profondità (rapida) e in altezza (morbida).
    const t1 = LOCK[b];
    const t0 = t1 - FLIGHT;
    tl.go(t0, t1, 'power3.inOut', { x: A[b][0], y: A[b][1] })
      .go(t0, t1, 'power2.inOut', { z: 0 })
      .go(t0, t1, 'power3.inOut', { rx: -Math.PI * 2 })
      .go(t1 - 0.35, t1, 'power3.out', { lift: 1 })
      // Il clic: la barra si abbassa di un soffio e torna al suo posto. Niente luce, niente scintille.
      .go(t1, t1 + 0.06, 'power2.in', { y: A[b][1] - 0.14 })
      .go(t1 + 0.06, t1 + 0.24, 'power2.out', { y: A[b][1] });
  }
  return tls.map((t) => t.tracks());
}

const bars = buildBars();
const T = (keys: Key[]) => new Track(keys);

const tracks = {
  // La camera gira di lato e sale (le tre lastre), poi torna frontale mentre le barre arrivano.
  // Si ferma a SILENZIO_DA e resta ferma fino a SILENZIO_A.
  az: T([[0, 0], [1.15, 0], [2.65, 0.62, 'power3.inOut'], [2.85, 0.64], [SILENZIO_DA, 0, 'power3.inOut'], [SILENZIO_A, 0], [5.4, 0]]),
  el: T([[0, 0], [1.15, 0], [2.65, 0.38, 'power3.inOut'], [2.85, 0.39], [SILENZIO_DA, 0.04, 'power3.inOut'], [SILENZIO_A, 0.04], [5.4, 0, 'power3.inOut']]),
  dist: T([[0, 1.0], [1.15, 1.0], [2.65, 1.02, 'power3.inOut'], [2.85, 1.03], [SILENZIO_DA, 1.08, 'power3.inOut'], [SILENZIO_A, 1.08], [5.4, 1.0, 'power3.inOut']]),
  fov: T([[0, 36], [SILENZIO_A, 36], [5.4, 22, 'power3.inOut']]),
  // Quando le lastre sono in profondità e di lato occupano più larghezza: sui telefoni la camera si ritira.
  spread: T([[0, 0], [1.15, 0], [2.4, 1, 'sine.inOut'], [3.2, 1], [3.75, 0, 'sine.inOut']]),
  // La camera si ritira e si sposta sul logo completo: il simbolo scivola a sinistra, il naming gli sta accanto.
  pull: T([[0, 0], [SILENZIO_A, 0], [5.45, 1, 'power3.inOut']]),
  flatten: T([[0, 1], [SILENZIO_A, 1], [5.3, 0.002, 'power3.inOut']]),
  // La linea del finale: la testa corre da sinistra a destra, la coda la cancella subito dopo.
  sweepHead: T([[0, 0], [SILENZIO_A, 0], [5.05, 1, 'power2.inOut']]),
  sweepTail: T([[0, 0], [SILENZIO_A + 0.15, 0], [5.25, 1, 'power2.inOut']]),
  claim: T([[0, 0], [5.65, 0], [6.25, 1, 'power3.out']]),
  // "Coming soon" e il modulo d'iscrizione: per ultimi, quando la frase è già ferma.
  outro: T([[0, 0], [6.15, 0], [6.6, 1, 'power2.out']]),
};

// Il naming: ogni lettera si apre da una linea, come le barre all'inizio, una dopo l'altra, da sinistra a destra,
// mentre la linea del finale attraversa lo schermo. Nessun altro movimento.
const letterTracks = Array.from({ length: WORDMARK_COUNT }, (_, i) => {
  const t0 = 4.9 + 0.04 * i;
  return new Track([[0, 0], [t0, 0], [t0 + 0.38, 1, 'back.out(1.5)']]);
});

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// La supergrafica entra con la linea del finale: le barre giganti arrivano dal bordo, prima la bassa.
const bgInTracks = [0, 1, 2].map((b) => {
  const t0 = SILENZIO_A + 0.1 + 0.12 * (2 - b);
  return new Track([[0, 0], [t0, 0], [t0 + 1.1, 1, 'power3.out']]);
});

/** Posizione nel ciclo dopo la fine (secondi dall'inizio del ciclo corrente), o -1 prima che il ciclo parta. */
const loopPhase = (t: number) => (t < LOOP_START ? -1 : (t - LOOP_START) % LOOP_PERIOD);

// Il logo: ogni ciclo le tre barre fanno un giro completo su se stesse (come nell'intro), sfalsate di 120 ms.
// Il logo è piatto: ogni barra si chiude in una linea e si riapre. Fra un giro e l'altro è fermo e allineato.
export const ROLL_DUR = 0.9;
/** Il giro di una barra a partire dal suo inizio (u in secondi, b = barra: 120 ms di sfasamento). */
export const rollAt = (u: number, b: number) => {
  const v = (u - 0.12 * b) / ROLL_DUR;
  return v > 0 && v < 1 ? -Math.PI * 2 * inOutCubic(v) : 0;
};
const roll = (t: number, b: number) => {
  const u = loopPhase(t);
  return u < 0 ? 0 : rollAt(u, b);
};

// La supergrafica: a metà ciclo le barre scivolano in avanti lungo gli 8° e tornano, sfalsate.
const SLIDE_DUR = 1.4;
const bgSlide = (t: number, b: number) => {
  const u = loopPhase(t);
  if (u < 0) return 0;
  const v = (u - LOOP_PERIOD / 2 - 0.12 * b) / SLIDE_DUR;
  return v > 0 && v < 1 ? Math.pow(Math.sin(Math.PI * v), 2) : 0;
};

export function createState(): SceneState {
  const pose = (): BarPose => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, lift: 0 });
  return {
    t: 0, bars: [pose(), pose(), pose()], roll: [0, 0, 0], bgIn: [0, 0, 0], bgSlide: [0, 0, 0], bgRx: 0, bgRy: 0, az: 0, el: 0, dist: 1.5, fov: 36, spread: 0, pull: 0,
    letters: Array(WORDMARK_COUNT).fill(0), flatten: 1, sweepHead: 0, sweepTail: 0, claim: 0, outro: 0,
  };
}

export function stateAt(t: number, s: SceneState): SceneState {
  s.t = t;
  for (let b = 0; b < 3; b++) {
    const p = s.bars[b];
    const tr = bars[b];
    for (const c of CHANNELS) p[c] = tr[c].at(t);
    s.roll[b] = roll(t, b);
    s.bgIn[b] = bgInTracks[b].at(t);
    s.bgSlide[b] = bgSlide(t, b);
  }
  s.az = tracks.az.at(t);
  s.el = tracks.el.at(t);
  s.dist = tracks.dist.at(t);
  s.fov = tracks.fov.at(t);
  s.spread = tracks.spread.at(t);
  s.pull = tracks.pull.at(t);
  for (let i = 0; i < WORDMARK_COUNT; i++) s.letters[i] = letterTracks[i].at(t);
  s.flatten = tracks.flatten.at(t);
  s.sweepHead = tracks.sweepHead.at(t);
  s.sweepTail = tracks.sweepTail.at(t);
  s.claim = tracks.claim.at(t);
  s.outro = tracks.outro.at(t);
  // la supergrafica ruota lentissima su due assi con periodi diversi: non si ripete in modo meccanico
  const k = smooth((t - DURATION) / 2);
  const w = t - DURATION;
  s.bgRy = k * 0.2 * Math.sin((2 * Math.PI * w) / 11);
  s.bgRx = k * 0.1 * Math.sin((2 * Math.PI * w) / 7.3);
  return s;
}

/**
 * Macchina da scrivere: quante lettere di `length` sono visibili al tempo t, e se il cursore è acceso.
 * Prima di TW_START la parola è intera e senza cursore. Poi, in ciclo: ferma (cursore che lampeggia),
 * cancellata da destra, pausa a vuoto, riscritta da sinistra.
 */
export function typewriter(t: number, length: number): { shown: number; caret: boolean } {
  if (t < TW_START) return { shown: length, caret: false };
  const erase = length * TW_ERASE;
  const type = length * TW_TYPE;
  const period = TW_HOLD + erase + TW_EMPTY + type;
  const u = (t - TW_START) % period;
  const blink = (x: number) => x % 1.06 < 0.53; // lampeggio del cursore, ~1 s
  if (u < TW_HOLD) return { shown: length, caret: u > 0.4 && blink(u) };
  let w = u - TW_HOLD;
  if (w < erase) return { shown: length - Math.floor(w / TW_ERASE) - 1, caret: true };
  w -= erase;
  if (w < TW_EMPTY) return { shown: 0, caret: blink(w + 0.53) };
  w -= TW_EMPTY;
  return { shown: Math.min(length, Math.floor(w / TW_TYPE) + 1), caret: true };
}
