// Frammenti dello stesso sistema per le sezioni dopo il racconto: cosa realizziamo, metodo, esempi.
// Stessi moduli, stessi colori, stessa camera del racconto: ogni frammento mostra una forma concreta.
// Ogni frammento ha tre stati chiave: 0 entrata (prima di essere visto), 1 a riposo, 2 attivo (passaggio del
// mouse, fuoco, oppure su telefono quando è al centro dello schermo). Lo stato 2 aggiunge, non spiega: tutto ciò
// che serve per capire è già nello stato 1.
import type { LinkProps, LinkSpec, ObjSpec, Props, SceneSpec } from './engine';
import type { CamKey } from './camera';
import { appSkeleton, liveDot, person, productUI } from './faces';

type Obj = Record<string, Partial<Props>>;
type Lk = Record<string, Partial<LinkProps>>;
export interface Mini {
  spec: SceneSpec;
  cam: CamKey;
}

const SH = -0.14;
const tile = { w: 120, d: 46, h: 10 };
const l = (it: string, en = it) => ({ it, en });

function mk(objects: ObjSpec[], links: LinkSpec[], frames: [Obj, Lk][], cam: CamKey): Mini {
  return {
    spec: { objects: objects.map((o) => ({ shear: SH, fs: 12, ...o })), links, frames: frames.map(([obj, link]) => ({ obj, link })) },
    cam,
  };
}
/** stato d'entrata: tutto un po' più in basso e trasparente */
const enter = (o: Obj, dy = -30): Obj => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, y: (v.y ?? 0) + dy, o: 0, lo: 0, ui: 0 }]));
const linksOff = (lk: Lk): Lk => Object.fromEntries(Object.keys(lk).map((k) => [k, { o: 0, draw: 0, pulse: 0 }]));

const CAM = (span: number, t: [number, number, number] = [0, 20, 0]): CamKey => ({ t, span, yaw: -12, pitch: 50 });

export const MINIS: Record<string, () => Mini> = {
  // un flusso: passaggi in fila, l'AI in mezzo, i dati che scorrono
  workflows() {
    const rest: Obj = {
      a: { ...tile, x: -200, z: 0 },
      b: { ...tile, x: -66, z: 0, lime: 1, lo: 1 },
      c: { ...tile, x: 68, z: 0 },
      d: { ...tile, x: 202, z: 0 },
    };
    const lk: Lk = { ab: { active: 1, pulse: 1 }, bc: { active: 1, pulse: 1 }, cd: { active: 1, pulse: 1 } };
    const act: Obj = { ...rest, b: { ...rest.b, y: 16 }, c: { ...rest.c, y: 8, delay: 0.1 } };
    return mk(
      [{ id: 'a' }, { id: 'b', label: l('AI') }, { id: 'c' }, { id: 'd' }],
      [
        { id: 'ab', from: 'a', to: 'b', fa: 'r', ta: 'l' },
        { id: 'bc', from: 'b', to: 'c', fa: 'r', ta: 'l' },
        { id: 'cd', from: 'c', to: 'd', fa: 'r', ta: 'l' },
      ],
      [[enter(rest), linksOff(lk)], [rest, lk], [act, { ...lk, ab: { active: 1, pulse: 1 } }]],
      CAM(500, [0, 0, 0]),
    );
  },
  // un agente: il modulo AI al centro, gli strumenti attorno; attivo, li usa
  agents() {
    const rest: Obj = {
      ag: { ...tile, w: 130, x: 0, z: 20, lime: 1, lo: 1 },
      t1: { ...tile, w: 92, d: 40, x: -190, z: -70 },
      t2: { ...tile, w: 92, d: 40, x: 190, z: -70 },
      t3: { ...tile, w: 92, d: 40, x: -170, z: 110 },
      t4: { ...tile, w: 92, d: 40, x: 175, z: 110 },
    };
    const lk: Lk = { a1: { o: 0.9 }, a2: { o: 0.9 }, a3: { o: 0.9 }, a4: { o: 0.9 } };
    const on: Lk = { a1: { active: 1, pulse: 1 }, a2: { active: 1, pulse: 1, delay: 0.1 }, a3: { active: 1, pulse: 1, delay: 0.2 }, a4: { active: 1, pulse: 1, delay: 0.3 } };
    return mk(
      [{ id: 'ag', label: l('AGENTE', 'AGENT'), fs: 11 }, { id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
      [
        { id: 'a1', from: 'ag', to: 't1', fa: 'l', ta: 'c', via: 'x' },
        { id: 'a2', from: 'ag', to: 't2', fa: 'r', ta: 'c', via: 'x' },
        { id: 'a3', from: 'ag', to: 't3', fa: 'l', ta: 'c', via: 'x' },
        { id: 'a4', from: 'ag', to: 't4', fa: 'r', ta: 'c', via: 'x' },
      ],
      [[enter(rest), linksOff(lk)], [rest, { ...lk, a2: { active: 1, pulse: 1 } }], [{ ...rest, ag: { ...rest.ag, y: 12 } }, on]],
      CAM(470, [0, 0, 20]),
    );
  },
  // uno strumento interno: un'interfaccia costruita per un team
  tools() {
    const rest: Obj = { ui: { w: 300, d: 196, h: 10, mist: 1, ui: 1, lo: 0, x: 0, z: 0 }, base: { w: 280, d: 180, h: 8, x: -14, y: -26, z: 0 } };
    const act: Obj = { ui: { ...rest.ui, y: 22 }, base: rest.base };
    return mk([{ id: 'base', r: 9 }, { id: 'ui', face: productUI(), r: 9 }], [], [[enter(rest), {}], [rest, {}], [act, {}]], CAM(420, [0, 0, 0]));
  },
  // un prodotto AI-native: interfaccia, sistema AI, dati e integrazioni; attivo, gli strati si separano
  products() {
    const L = { w: 260, d: 160, h: 12 };
    const rest: Obj = {
      p1: { ...L, x: -22, y: 0 },
      p2: { ...L, x: 0, y: 34, lime: 1 },
      p3: { ...L, w: 300, d: 196, x: 24, y: 68, mist: 1, ui: 1, lo: 0 },
    };
    const act: Obj = { p1: rest.p1, p2: { ...rest.p2, y: 50 }, p3: { ...rest.p3, y: 104 } };
    return mk(
      [{ id: 'p1', r: 9 }, { id: 'p2', r: 9 }, { id: 'p3', r: 9, face: productUI() }],
      [],
      [[enter(rest, -40), {}], [rest, {}], [act, {}]],
      CAM(460, [0, 50, 0]),
    );
  },
  // un'interfaccia AI dentro un software esistente: il pannello Lime si aggancia di lato
  interfaces() {
    const rest: Obj = {
      app: { w: 250, d: 170, h: 10, x: -40, z: 0, ui: 1, lo: 0 },
      side: { w: 96, d: 150, h: 10, x: 126, y: 10, z: 0, lime: 1, lo: 1 },
    };
    const act: Obj = { app: rest.app, side: { ...rest.side, x: 98, y: 22 } };
    return mk(
      [
        { id: 'app', face: appSkeleton(250, 170) },
        { id: 'side', label: l('AI'), fs: 14 },
      ],
      [],
      [[enter({ app: rest.app, side: { ...rest.side, x: 220 } }), {}], [rest, {}], [act, {}]],
      CAM(470, [20, 0, 0]),
    );
  },
  // i sistemi sotto: un nucleo collegato ai dati e ai software dell'azienda
  systems() {
    const n = { w: 84, d: 34, h: 8 };
    const rest: Obj = {
      core: { w: 150, d: 90, h: 16, x: 0, z: 0, lo: 1 },
      n1: { ...n, x: -200, z: -90 },
      n2: { ...n, x: -210, z: 70 },
      n3: { ...n, x: 200, z: -90 },
      n4: { ...n, x: 210, z: 70 },
      n5: { ...n, x: 0, z: -150 },
    };
    const lk: Lk = Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [`l${k}`, { active: 1, pulse: k === '1' || k === '4' ? 1 : 0 }]));
    const on: Lk = Object.fromEntries(Object.keys(lk).map((k, i) => [k, { active: 1, pulse: 1, delay: i * 0.06 }]));
    return mk(
      [{ id: 'core', label: l('SISTEMA AI', 'AI SYSTEM'), fs: 11 }, { id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }, { id: 'n5' }],
      ['1', '2', '3', '4', '5'].map((k) => ({ id: `l${k}`, from: `n${k}`, to: 'core', fa: 'c' as const, ta: 'c' as const, via: k === '5' ? ('direct' as const) : ('x' as const) })),
      [[enter(rest), linksOff(lk)], [rest, lk], [rest, on]],
      CAM(490, [0, 0, -20]),
    );
  },

  // ---- metodo: lo stesso stack in tre stati ----
  understand() {
    const L = { w: 240, d: 150, h: 12, ghost: 1 };
    const rest: Obj = {
      p1: { ...L, x: -20, y: 0 },
      p2: { ...L, x: 0, y: 40 },
      p3: { ...L, x: 20, y: 80 },
      q1: { ...tile, w: 70, d: 30, x: -230, z: -40, lo: 0 },
      q2: { ...tile, w: 70, d: 30, x: 220, z: 60, lo: 0 },
      q3: { ...tile, w: 70, d: 30, x: -180, z: 120, lo: 0 },
    };
    const lk: Lk = { k1: { o: 0.9 }, k2: { o: 0.9 }, k3: { o: 0.9 } };
    return mk(
      [{ id: 'p1', r: 9 }, { id: 'p2', r: 9 }, { id: 'p3', r: 9 }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
      [
        { id: 'k1', from: 'q1', to: 'p1', fa: 'c', ta: 'ground', via: 'x' },
        { id: 'k2', from: 'q2', to: 'p1', fa: 'c', ta: 'ground', via: 'x' },
        { id: 'k3', from: 'q3', to: 'p1', fa: 'c', ta: 'ground', via: 'x' },
      ],
      [[enter(rest, 0), linksOff(lk)], [rest, lk], [{ ...rest, p2: { ...rest.p2, y: 54 }, p3: { ...rest.p3, y: 108 } }, lk]],
      CAM(560, [0, 40, 20]),
    );
  },
  construct() {
    const L = { w: 240, d: 150, h: 12 };
    const rest: Obj = {
      p1: { ...L, x: -20, y: 0 },
      p2: { ...L, x: 0, y: 40, lime: 1 },
      p3: { ...L, x: 20, y: 130, ghost: 1 },
    };
    const act: Obj = { ...rest, p3: { ...L, x: 20, y: 80, mist: 1, ui: 1, w: 260, d: 170 } };
    return mk(
      [{ id: 'p1', r: 9 }, { id: 'p2', r: 9 }, { id: 'p3', r: 9, face: appSkeleton(260, 170, true) }],
      [],
      [[enter(rest, -40), {}], [rest, {}], [act, {}]],
      CAM(500, [0, 60, 0]),
    );
  },
  deploy() {
    const L = { w: 240, d: 150, h: 12 };
    const rest: Obj = {
      p1: { ...L, x: -20, y: 0 },
      p2: { ...L, x: 0, y: 40, lime: 1 },
      p3: { ...L, x: 20, y: 80, mist: 1, ui: 1, lo: 1, lx: -0.8, ly: -0.7 },
      s1: { ...tile, w: 80, d: 30, x: -230, z: 70 },
      s2: { ...tile, w: 80, d: 30, x: 230, z: -60 },
    };
    const lk: Lk = { d1: { active: 1, pulse: 1 }, d2: { active: 1, pulse: 1 } };
    return mk(
      [{ id: 'p1', r: 9 }, { id: 'p2', r: 9 }, { id: 'p3', r: 9, label: l('LIVE'), anchor: 'start', fs: 11, face: liveDot(-104) }, { id: 's1' }, { id: 's2' }],
      [
        { id: 'd1', from: 's1', to: 'p1', fa: 'c', ta: 'ground', via: 'x' },
        { id: 'd2', from: 's2', to: 'p1', fa: 'c', ta: 'ground', via: 'x' },
      ],
      [[enter(rest, -40), linksOff(lk)], [rest, lk], [{ ...rest, p3: { ...rest.p3, y: 92 } }, lk]],
      CAM(560, [0, 40, 0]),
    );
  },

  // ---- esempi: catene di passaggi (le etichette leggibili sono nel testo accanto) ----
  finance() {
    const s = { w: 96, d: 34, h: 8 };
    const rest: Obj = {
      i1: { ...s, x: -230, z: -60 },
      i2: { ...s, x: -230, z: 0 },
      i3: { ...s, x: -230, z: 60 },
      ai: { ...tile, x: -10, z: 0, lime: 1, lo: 1 },
      out: { w: 130, d: 84, h: 8, x: 210, z: 0, mist: 1, ui: 1 },
    };
    const lk: Lk = { f1: { active: 1, pulse: 1 }, f2: { active: 1, pulse: 1 }, f3: { active: 1, pulse: 1 }, f4: { active: 1, pulse: 1 } };
    return mk(
      [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'ai', label: l('AI') }, { id: 'out', face: appSkeleton(130, 84, true) }],
      [
        { id: 'f1', from: 'i1', to: 'ai', fa: 'r', ta: 'l', via: 'x' },
        { id: 'f2', from: 'i2', to: 'ai', fa: 'r', ta: 'l' },
        { id: 'f3', from: 'i3', to: 'ai', fa: 'r', ta: 'l', via: 'x' },
        { id: 'f4', from: 'ai', to: 'out', fa: 'r', ta: 'l' },
      ],
      [[enter(rest), linksOff(lk)], [rest, lk], [{ ...rest, ai: { ...rest.ai, y: 14 } }, lk]],
      CAM(600, [0, 0, 0]),
    );
  },
  operations() {
    const s = { w: 96, d: 34, h: 8 };
    const rest: Obj = {
      i1: { ...s, x: -230, z: -60 },
      i2: { ...s, x: -230, z: 0 },
      i3: { ...s, x: -230, z: 60 },
      ai: { ...tile, x: -10, z: 0, lime: 1, lo: 1 },
      ok: { ...tile, x: 210, z: 0, ui: 1, lo: 0 },
    };
    const lk: Lk = { f1: { active: 1, pulse: 1 }, f2: { active: 1, pulse: 1 }, f3: { active: 1, pulse: 1 }, f4: { active: 1, pulse: 1 } };
    return mk(
      [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'ai', label: l('AI') }, { id: 'ok', face: person(0) }],
      [
        { id: 'f1', from: 'i1', to: 'ai', fa: 'r', ta: 'l', via: 'x' },
        { id: 'f2', from: 'i2', to: 'ai', fa: 'r', ta: 'l' },
        { id: 'f3', from: 'i3', to: 'ai', fa: 'r', ta: 'l', via: 'x' },
        { id: 'f4', from: 'ai', to: 'ok', fa: 'r', ta: 'l' },
      ],
      [[enter(rest), linksOff(lk)], [rest, lk], [{ ...rest, ok: { ...rest.ok, lime: 0.25 } }, lk]],
      CAM(600, [0, 0, 0]),
    );
  },
  studio() {
    const rest: Obj = {
      a: { ...tile, w: 90, d: 40, x: -250, z: 0 },
      b: { w: 100, d: 70, h: 8, x: -110, z: 0, ghost: 1 },
      c: { w: 150, d: 100, h: 10, x: 50, z: 0, mist: 1, ui: 1 },
      d: { ...tile, w: 90, d: 40, x: 220, z: 0, lime: 1, lo: 1 },
    };
    const lk: Lk = { s1: { active: 1, pulse: 1 }, s2: { active: 1, pulse: 1 }, s3: { active: 1, pulse: 1 } };
    return mk(
      [{ id: 'a' }, { id: 'b' }, { id: 'c', face: appSkeleton(150, 100, true) }, { id: 'd', label: l('LIVE'), fs: 11 }],
      [
        { id: 's1', from: 'a', to: 'b', fa: 'r', ta: 'l' },
        { id: 's2', from: 'b', to: 'c', fa: 'r', ta: 'l' },
        { id: 's3', from: 'c', to: 'd', fa: 'r', ta: 'l' },
      ],
      [[enter(rest), linksOff(lk)], [rest, lk], [{ ...rest, b: { ...rest.b, ghost: 0 }, c: { ...rest.c, y: 14 } }, lk]],
      CAM(620, [0, 0, 0]),
    );
  },
};
