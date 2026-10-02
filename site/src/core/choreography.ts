import { LABELS as L } from '../config/scenes';
import { Track } from './tracks';

// Regia del film. Ogni canale è una traccia a keyframe sul tempo della timeline
// (1 unità = 100vh di scroll). Etichette: prologue 0 · noise 0.8 · split 2.4 · lines/ignite 4.4 ·
// analisi 5.0 · pilota 6.1 · produzione 7.2 · manifesto 8.3 · symbol 8.6 · finale 10.2 · end 11.6

export interface SceneState {
  t: number;
  camK: number;
  fov: number;
  roll: number;
  // particelle
  pState: number;
  pScan: number;
  pFlow: number;
  pPointer: number;
  pWidth: number;
  // simbolo
  front: [number, number, number];
  lift: [number, number, number];
  extend: number;
  rigPhase: number;
  head: number;
  // post
  bloom: number;
  ca: number;
  // DOM
  flood: number;
}

const n = (k: [number, number, string?][]) => new Track(k);

const tracks = {
  camK: n([
    [0, 0],
    [L.noise - 0.5, 0],
    [L.noise + 0.7, 1],
    [L.split - 0.1, 1.15, 'none'],
    [L.split + 0.7, 2],
    [L.split + 1.6, 2.1, 'none'],
    [L.ignite - 0.05, 3, 'power2.in'],
    [L.ignite + 0.5, 4, 'power2.out'],
    [L.analisi + 0.1, 4.1, 'none'],
    [L.analisi + 0.8, 5],
    [L.pilota - 0.05, 5.35, 'none'],
    [L.pilota + 0.6, 6],
    [L.produzione - 0.05, 6.2, 'none'],
    [L.produzione + 0.9, 7, 'power2.in'],
    [L.manifesto + 0.25, 7.25, 'none'],
    [L.symbol + 0.9, 8],
    [L.finale - 0.1, 8.1, 'none'],
    [L.finale + 0.7, 9],
  ]),
  fov: n([
    [0, 38],
    [L.noise + 0.7, 46],
    [L.split + 0.7, 40],
    [L.ignite, 54, 'power2.in'],
    [L.ignite + 0.5, 46],
    [L.analisi + 0.8, 50],
    [L.produzione + 0.4, 52],
    [L.produzione + 1.0, 68, 'power2.in'],
    [L.manifesto + 0.2, 70, 'none'],
    [L.symbol + 0.9, 36],
    [L.finale + 0.7, 28],
  ]),
  roll: n([
    [L.pilota + 0.3, 0],
    [L.pilota + 0.6, -0.03],
    [L.produzione + 0.4, 0],
  ]),
  pState: n([
    [0, 0],
    [L.noise - 0.05, 0],
    [L.noise + 0.55, 1],
    [L.split + 0.1, 1],
    [L.split + 0.85, 2],
    [L.ignite - 0.2, 2],
    [L.analisi + 0.25, 3],
    [L.pilota + 0.25, 3],
    [L.pilota + 0.95, 4],
    [L.finale + 0.05, 4],
    [L.finale + 0.6, 5, 'power2.in'],
  ]),
  pScan: n([
    [L.analisi + 0.15, 0],
    [L.pilota + 0.2, 1, 'power1.inOut'],
  ]),
  pFlow: n([
    [L.pilota + 0.6, 0.12],
    [L.produzione + 0.2, 0.25],
    [L.produzione + 0.9, 2.2, 'power2.in'],
    [L.manifesto + 0.2, 2.2, 'none'],
    [L.symbol + 0.8, 0.1],
  ]),
  pPointer: n([
    [0, 1],
    [L.split + 0.3, 1],
    [L.split + 0.8, 0],
  ]),
  pWidth: n([
    [0, 1],
    [L.split + 0.3, 1],
    [L.split + 0.8, 0.85],
    [L.ignite, 1],
  ]),
  front0: n([[L.ignite + 0.02, 0], [L.ignite + 0.55, 1, 'power3.out']]),
  front1: n([[L.ignite + 0.09, 0], [L.ignite + 0.62, 1, 'power3.out']]),
  front2: n([[L.ignite + 0.16, 0], [L.ignite + 0.69, 1, 'power3.out']]),
  lift0: n([[L.pilota + 0.3, 0], [L.pilota + 0.62, 1, 'power3.out']]),
  lift1: n([[L.pilota + 0.36, 0], [L.pilota + 0.68, 1, 'power3.out']]),
  lift2: n([[L.pilota + 0.42, 0], [L.pilota + 0.74, 1, 'power3.out']]),
  extend: n([
    [L.analisi - 0.3, 0],
    [L.analisi + 0.4, 160],
    [L.produzione + 0.1, 220, 'none'],
    [L.produzione + 1.0, 700, 'power2.in'],
    [L.manifesto + 0.25, 760, 'none'],
    [L.symbol + 0.8, 0, 'power3.inOut'],
  ]),
  rigPhase: n([
    [L.manifesto + 0.2, 0],
    [L.symbol + 0.9, 1, 'power3.inOut'],
    [L.finale + 0.05, 1],
    [L.finale + 0.45, 2],
  ]),
  head: n([
    [L.ignite, 0],
    [L.ignite + 0.1, 1],
    [L.ignite + 0.75, 1],
    [L.analisi + 0.2, 0],
  ]),
  bloom: n([
    [0, 0.9],
    [L.split + 0.6, 0.55],
    [L.ignite, 0.6],
    [L.ignite + 0.2, 1.6],
    [L.analisi + 0.2, 0.9],
    [L.produzione + 0.9, 1.3],
    [L.symbol + 0.9, 0.7],
  ]),
  ca: n([
    [0, 0],
    [L.ignite - 0.15, 0],
    [L.ignite + 0.05, 0.9],
    [L.ignite + 0.4, 0],
    [L.produzione + 0.5, 0],
    [L.produzione + 1.0, 1],
    [L.manifesto + 0.25, 1, 'none'],
    [L.symbol + 0.5, 0],
  ]),
  flood: n([
    [L.finale + 0.25, 0],
    [L.finale + 0.85, 1, 'power2.inOut'],
  ]),
};

export function stateAt(t: number, out: SceneState): SceneState {
  out.t = t;
  out.camK = tracks.camK.at(t);
  out.fov = tracks.fov.at(t);
  out.roll = tracks.roll.at(t);
  out.pState = tracks.pState.at(t);
  out.pScan = tracks.pScan.at(t);
  out.pFlow = tracks.pFlow.at(t);
  out.pPointer = tracks.pPointer.at(t);
  out.pWidth = tracks.pWidth.at(t);
  out.front[0] = tracks.front0.at(t);
  out.front[1] = tracks.front1.at(t);
  out.front[2] = tracks.front2.at(t);
  out.lift[0] = tracks.lift0.at(t);
  out.lift[1] = tracks.lift1.at(t);
  out.lift[2] = tracks.lift2.at(t);
  out.extend = tracks.extend.at(t);
  out.rigPhase = tracks.rigPhase.at(t);
  out.head = tracks.head.at(t);
  out.bloom = tracks.bloom.at(t);
  out.ca = tracks.ca.at(t);
  out.flood = tracks.flood.at(t);
  return out;
}

export const createState = (): SceneState =>
  stateAt(0, {
    t: 0, camK: 0, fov: 38, roll: 0, pState: 0, pScan: 0, pFlow: 0, pPointer: 1, pWidth: 1,
    front: [0, 0, 0], lift: [0, 0, 0], extend: 0, rigPhase: 0, head: 0, bloom: 1, ca: 0, flood: 0,
  });

// Posizione del simbolo nel mondo e keyframe della camera.
export const RIG_POSITION: [number, number, number] = [0, 0, -24];

export interface CamKey {
  pos: [number, number, number];
  look: [number, number, number];
  // varianti per schermi verticali (telefono): soggetto centrato, testo sotto
  mpos?: [number, number, number];
  mlook?: [number, number, number];
}

export const CAMERA: CamKey[] = [
  /* 0 prologo   */ { pos: [0, 0, 14], look: [0, 0, 0] },
  /* 1 rumore    */ { pos: [2.6, 0.7, 8.6], look: [0, 0, 0] },
  /* 2 split     */ { pos: [0, 0.2, 15.5], look: [0, 0, 0] },
  /* 3 nel vuoto */ { pos: [0, 0.1, 2.5], look: [0, 0.4, -20] },
  /* 4 accensione*/ { pos: [7.5, 3.4, -12.5], look: [0.8, 1.6, -30], mpos: [6.5, 4.5, -8.5], mlook: [0.4, 2.0, -30] },
  /* 5 analisi   */ { pos: [6.8, 5.6, -16.5], look: [0.8, 0.6, -34], mpos: [6.5, 7.5, -12], mlook: [0.6, 1.0, -34] },
  /* 6 pilota    */ { pos: [5.2, 7.0, -18.5], look: [0.2, 2.4, -25.5], mpos: [6.0, 9.0, -15], mlook: [0.2, 2.0, -26] },
  /* 7 produzione*/ { pos: [2.6, 6.6, -46], look: [-0.2, 9.5, -84] },
  /* 8 simbolo   */ { pos: [-5.6, 0.3, -1.5], look: [-5.6, 0.1, -24], mpos: [0, -4.2, -2], mlook: [0, -4.2, -24] },
  /* 9 finale    */ { pos: [-1.6, 0.1, -7], look: [-1.6, 0, -24], mpos: [0, -1, -7], mlook: [0, -1, -24] },
];
