import { Track } from '../core/tracks';
import { PIVOT } from './symbol/symbolSpec';

// La regia dell'animazione. Ogni canale è una traccia a keyframe sul tempo (secondi): con lo stesso
// tempo si ottiene sempre lo stesso fotogramma, in avanti, all'indietro o fermi per i test.
//
//   0.0 –  2.1  Buio          una linea Lime si apre in tre barre (motion ufficiale: 120 ms, ease-out)
//   2.1 –  5.0  Le tre carte  le barre si scambiano di posto in 3D, sempre più veloci
//   5.1 –  8.4  Il tentativo  si impilano storte, oscillano, cadono, si disperdono
//   8.4 – 10.4  Il gradino    si incastrano una dopo l'altra, ognuna con un clic secco (niente luce)
//  10.4 – 10.9  Silenzio      tutto fermo
//  10.9 – 12.9  Rivelazione   una linea Lime a 8° attraversa lo schermo, il simbolo si appiattisce, compare la frase

export const DURATION = 12.9;

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
  bump: [number, number, number];
  az: number;
  el: number;
  dist: number; // moltiplicatore della distanza che inquadra il simbolo
  fov: number;
  shiftY: number;
  flatten: number;
  sweepHead: number; // la linea del finale: 0..1 quanto si è tracciata
  sweepTail: number; // 0..1 quanto si è già cancellata
  claim: number;
  cta: number;
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

const ROW = [4.4, 0, -4.4]; // le tre righe: alta, centrale, bassa
const HAIR = 0.012; // spessore della linea iniziale
const A = PIVOT; // posizione di incastro: il simbolo assemblato

// Primo tentativo, sbagliato: barre quasi impilate ma storte.
const WRONG = [
  { x: 2.3, y: 3.5, z: 0.4, rz: 0.15 },
  { x: -0.7, y: 0.5, z: 0.0, rz: -0.07 },
  { x: -2.1, y: -2.7, z: 0.2, rz: -0.11 },
];
// Dove restano sparse dopo la caduta.
const SCATTER = [
  { x: 6.6, y: -3.4, z: 3.0, rx: 0.45, ry: -0.8, rz: 0.35 },
  { x: -6.2, y: 2.5, z: -4.0, rx: -0.3, ry: 0.9, rz: -0.5 },
  { x: 0.9, y: -5.4, z: 5.0, rx: 0.2, ry: 0.35, rz: 0.7 },
];
// Scambi di posto: [inizio, durata, riga A, riga B].
const SWAPS: [number, number, number, number][] = [
  [2.25, 0.75, 0, 1],
  [3.05, 0.6, 1, 2],
  [3.7, 0.5, 0, 2],
  [4.25, 0.4, 0, 1],
  [4.7, 0.3, 1, 2],
];
// Istante in cui ogni barra (alta, centrale, bassa) scatta al suo posto: prima la bassa.
export const LOCK: [number, number, number] = [10.2, 9.7, 9.2];
/** Il silenzio: nessun movimento di camera tra l'ultimo clic (meno 0,3 s) e la linea del finale. */
const SILENZIO_DA = LOCK[0] - 0.3;
const SILENZIO_A = 10.9;

function buildBars(): Record<Ch, Track>[] {
  const slot = [0, 1, 2]; // slot[b] = riga occupata dalla barra b
  const tls = [0, 1, 2].map(
    (b) =>
      new BarTimeline({
        x: 0, y: b === 1 ? 0 : 14, z: 0, rx: 0, ry: 0, rz: 0,
        sx: b === 1 ? 0 : 1, sy: b === 1 ? HAIR : 0, lift: 0,
      }),
  );

  for (let b = 0; b < 3; b++) {
    const tl = tls[b];
    // ---- Buio: una linea al centro, due che cadono dall'alto (sfasamento ufficiale 120 ms), poi si aprono
    if (b === 1) tl.go(0.25, 1.0, 'expo.out', { sx: 1 });
    else {
      const d = b === 0 ? 0 : 0.12; // la barra resta invisibile finché non inizia a cadere
      tl.go(1.049 + d, 1.05 + d, 'none', { sy: HAIR });
      tl.go(1.05 + d, 1.45 + d, 'power2.out', { y: ROW[b] });
    }
    tl.go(1.65 + 0.12 * b, 2.1 + 0.12 * b, 'back.out(1.7)', { sy: 1 });
  }

  // ---- Le tre carte: la barra che scende passa davanti, quella che sale passa dietro
  for (const [t0, dur, ra, rb] of SWAPS) {
    const t1 = t0 + dur;
    const tm = t0 + dur / 2;
    for (let b = 0; b < 3; b++) {
      if (slot[b] !== ra && slot[b] !== rb) continue;
      const to = slot[b] === ra ? rb : ra;
      const sign = to > slot[b] ? 1 : -1;
      tls[b]
        .go(t0, t1, 'power2.inOut', { y: ROW[to] })
        .go(t0, tm, 'sine.out', { z: sign * 3.4, rx: -sign * 0.4 })
        .go(tm, t1, 'sine.in', { z: 0, rx: 0 });
      slot[b] = to;
    }
  }

  // ---- Il tentativo sbagliato
  for (let b = 0; b < 3; b++) {
    const w = WRONG[b];
    const tl = tls[b];
    tl.go(5.1, 5.8, 'back.out(1.4)', { x: w.x, y: w.y, z: w.z, rz: w.rz, lift: 0.35 });
    tl.go(5.8, 5.95, 'sine.inOut', { rz: w.rz + 0.06 })
      .go(5.95, 6.1, 'sine.inOut', { rz: w.rz - 0.05 })
      .go(6.1, 6.25, 'sine.inOut', { rz: w.rz + 0.03 })
      .go(6.25, 6.4, 'sine.inOut', { rz: w.rz });
  }
  // una alla volta scivolano via e cadono con un rimbalzo, poi restano sparse
  const s = SCATTER;
  tls[0]
    .go(6.5, 7.0, 'power2.in', { x: 6.9, rz: 0.35 })
    .go(7.0, 7.6, 'bounce.out', { y: -7.8, z: 1.5, rz: 1.1 })
    .go(7.7, 8.3, 'power2.inOut', { x: s[0].x, y: s[0].y, z: s[0].z, rx: s[0].rx, ry: s[0].ry, rz: s[0].rz, lift: 0 });
  tls[1]
    .go(6.7, 7.2, 'power2.in', { x: -1.6, rz: -0.6 })
    .go(7.2, 7.8, 'bounce.out', { y: -5.2 })
    .go(7.85, 8.3, 'power2.inOut', { x: s[1].x, y: s[1].y, z: s[1].z, rx: s[1].rx, ry: s[1].ry, rz: s[1].rz, lift: 0 });
  tls[2]
    .go(7.0, 7.5, 'power2.in', { x: -5.8, rz: -0.3 })
    .go(7.5, 8.0, 'bounce.out', { y: -6.8 })
    .go(8.0, 8.4, 'power2.inOut', { x: s[2].x, y: s[2].y, z: s[2].z, rx: s[2].rx, ry: s[2].ry, rz: s[2].rz, lift: 0 });

  // ---- Il gradino: si incastrano dal basso, ognuna alza il suo blocco di mezzo spessore
  const lockStart = [9.4, 8.9, 8.4];
  for (let b = 0; b < 3; b++) {
    tls[b]
      .go(lockStart[b], LOCK[b], 'back.out(1.15)', { x: A[b][0], y: A[b][1], z: 0, rx: 0, ry: 0, rz: 0 })
      .go(LOCK[b] - 0.4, LOCK[b], 'power3.out', { lift: 1 })
      // Il clic: la barra si abbassa di un soffio e torna al suo posto. Niente luce, niente scintille.
      .go(LOCK[b], LOCK[b] + 0.06, 'power2.in', { y: A[b][1] - 0.14 })
      .go(LOCK[b] + 0.06, LOCK[b] + 0.24, 'power2.out', { y: A[b][1] });
  }
  return tls.map((t) => t.tracks());
}

const bars = buildBars();
const T = (keys: Key[]) => new Track(keys);

const tracks = {
  // La camera si ferma a SILENZIO_DA, 0,3 s prima dell'ultimo clic, e resta ferma fino a SILENZIO_A.
  az: T([[0, 0], [2.1, -0.2, 'sine.inOut'], [5.1, 0.25, 'sine.inOut'], [8.4, -0.1, 'sine.inOut'], [SILENZIO_DA, 0.05, 'sine.inOut'], [SILENZIO_A, 0.05], [11.7, 0, 'power3.inOut']]),
  el: T([[0, 0], [2.1, 0.1, 'sine.inOut'], [5.1, 0.14, 'sine.inOut'], [8.4, 0.1, 'sine.inOut'], [SILENZIO_DA, 0.08, 'sine.inOut'], [SILENZIO_A, 0.08], [11.7, 0, 'power3.inOut']]),
  dist: T([
    [0, 1.1], [1.0, 1.1], [2.1, 0.95, 'sine.inOut'], [5.1, 1.1, 'sine.inOut'],
    [8.4, 1.2, 'sine.inOut'], [SILENZIO_DA, 1.1, 'sine.inOut'], [SILENZIO_A, 1.1], [11.7, 1.0, 'power3.inOut'],
  ]),
  fov: T([[0, 36], [SILENZIO_A, 36], [11.7, 22, 'power3.inOut']]),
  shiftY: T([[0, 0], [SILENZIO_A, 0], [11.7, 0.1, 'power3.inOut']]),
  flatten: T([[0, 1], [SILENZIO_A, 1], [11.6, 0.002, 'power3.inOut']]),
  // La linea del finale: la testa corre da sinistra a destra, la coda la cancella subito dopo.
  sweepHead: T([[0, 0], [SILENZIO_A, 0], [11.35, 1, 'power2.inOut']]),
  sweepTail: T([[0, 0], [SILENZIO_A + 0.15, 0], [11.55, 1, 'power2.inOut']]),
  claim: T([[0, 0], [11.6, 0], [12.3, 1, 'power3.out']]),
  cta: T([[0, 0], [12.2, 0], [12.85, 1, 'power2.out']]),
};

const bump = (t: number, i: number) => {
  // dopo la rivelazione: ogni ~6 s le tre barre si danno una piccola spinta in sequenza (120 ms)
  if (t < DURATION) return 0;
  const u = ((t - DURATION - 1.5) % 6) - 0.12 * i;
  return u >= 0 && u < 0.7 ? Math.pow(Math.sin((Math.PI * u) / 0.7), 2) * 0.16 : 0;
};

export function createState(): SceneState {
  const pose = (): BarPose => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, lift: 0 });
  return {
    t: 0, bars: [pose(), pose(), pose()], bump: [0, 0, 0], az: 0, el: 0, dist: 1.5, fov: 36, shiftY: 0,
    flatten: 1, sweepHead: 0, sweepTail: 0, claim: 0, cta: 0,
  };
}

export function stateAt(t: number, s: SceneState): SceneState {
  s.t = t;
  for (let b = 0; b < 3; b++) {
    const p = s.bars[b];
    const tr = bars[b];
    for (const c of CHANNELS) p[c] = tr[c].at(t);
    s.bump[b] = bump(t, b);
  }
  s.az = tracks.az.at(t);
  s.el = tracks.el.at(t);
  s.dist = tracks.dist.at(t);
  s.fov = tracks.fov.at(t);
  s.shiftY = tracks.shiftY.at(t);
  s.flatten = tracks.flatten.at(t);
  s.sweepHead = tracks.sweepHead.at(t);
  s.sweepTail = tracks.sweepTail.at(t);
  s.claim = tracks.claim.at(t);
  s.cta = tracks.cta.at(t);
  return s;
}
