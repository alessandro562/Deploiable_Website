// Porting in TypeScript del generatore del simbolo contenuto nel brand book
// (Deploiable Brand Book.dc.html, metodo geo()). Stesse costanti, stesso raccordo r 1,5:
// l'output coincide con deploiable-symbol-*.svg (verificato in tests/unit/symbolSpec.test.ts).
// In più tiene traccia di quale angolo canonico genera ogni vertice, così le barre si possono
// deformare (gradino, estensione, accensione) mantenendo il raccordo corretto.

export type Vec2 = [number, number];

export const TAN8 = Math.tan((8 * Math.PI) / 180);
export const RR = 1.5; // raccordo
export const DX = 9; // gradino = ½ spessore
export const W = 18; // spessore

export interface BarSpec {
  y: number;
  x0: number;
  x1: number;
  kx: number;
}

// Dall'alto in basso: barra 1 = fase 01 Analisi, 2 = Pilota, 3 = Produzione.
export const BARS: BarSpec[] = [27, 52, 77].map((y, i) => {
  const x0 = [30, 22, 14][i];
  return { y, x0, x1: x0 + 54, kx: [40, 46, 52][i] };
});

/** Gli 8 angoli canonici di una barra (y verso il basso, prima dell'inclinazione). */
export function corners(b: BarSpec, dx = DX, w = W): Vec2[] {
  const h = w / 2;
  return [
    [b.x0, b.y - h],
    [b.kx, b.y - h],
    [b.kx, b.y - dx - h],
    [b.x1, b.y - dx - h],
    [b.x1, b.y - dx + h],
    [b.kx, b.y - dx + h],
    [b.kx, b.y + h],
    [b.x0, b.y + h],
  ];
}

export const shear = (p: Vec2): Vec2 => [p[0], p[1] - (p[0] - 50) * TAN8];

const area = (p: Vec2[]) =>
  p.reduce((a, q, i) => {
    const r = p[(i + 1) % p.length];
    return a + q[0] * r[1] - r[0] * q[1];
  }, 0);

export interface OutlineVertex {
  corner: number; // indice dell'angolo canonico (0..7)
  off: Vec2; // spostamento del raccordo, configurazione a gradino
  offFlat: Vec2; // spostamento del raccordo, barra piatta (nessuna tacca al gradino)
}

/** Contorno con raccordi di una barra, come off() nel brand book, con indice dell'angolo d'origine. */
export function outline(b: BarSpec): OutlineVertex[] {
  let idx = [0, 1, 2, 3, 4, 5, 6, 7];
  const raw = corners(b).map(shear);
  if (area(raw) < 0) idx = idx.reverse();
  const p = idx.map((i) => raw[i]);
  const n = p.length;
  const out: OutlineVertex[] = [];

  const l = Math.hypot(1, TAN8);
  const nTop: Vec2 = [(-TAN8 / l) * RR, (-1 / l) * RR];
  const nBottom: Vec2 = [(TAN8 / l) * RR, (1 / l) * RR];
  const flatFor = (corner: number, off: Vec2): Vec2 =>
    corner === 1 || corner === 2 ? nTop : corner === 5 || corner === 6 ? nBottom : off;

  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], bb = p[i], c = p[(i + 1) % n];
    const e1 = [bb[0] - a[0], bb[1] - a[1]], e2 = [c[0] - bb[0], c[1] - bb[1]];
    const l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2];
    const cr = e1[0] * e2[1] - e1[1] * e2[0];
    const corner = idx[i];
    if (cr > 0) {
      const a1 = Math.atan2(n1[1], n1[0]);
      let a2 = Math.atan2(n2[1], n2[0]);
      while (a2 < a1) a2 += 2 * Math.PI;
      const st = Math.max(2, Math.ceil((a2 - a1) / (Math.PI / 16)));
      for (let s = 0; s <= st; s++) {
        const t = a1 + ((a2 - a1) * s) / st;
        const off: Vec2 = [RR * Math.cos(t), RR * Math.sin(t)];
        out.push({ corner, off, offFlat: flatFor(corner, off) });
      }
    } else {
      const m = [n1[0] + n2[0], n1[1] + n2[1]], ml = Math.hypot(m[0], m[1]);
      const mu = [m[0] / ml, m[1] / ml];
      const k = RR / (mu[0] * n1[0] + mu[1] * n1[1]);
      const off: Vec2 = [mu[0] * k, mu[1] * k];
      out.push({ corner, off, offFlat: flatFor(corner, off) });
    }
  }
  return out;
}

export const OUTLINES = BARS.map(outline);

export interface Deform {
  lift: number; // 0 barra piatta, 1 gradino del brand
  extend: number; // allungamento in unità SVG
  front: number; // 0..1 crescita durante l'accensione
}

export const REST: Deform = { lift: 1, extend: 0, front: 1 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Posizione di un vertice del contorno (spazio SVG inclinato, y verso il basso). */
export function vertexAt(bar: number, v: OutlineVertex, d: Deform, out: Vec2 = [0, 0]): Vec2 {
  const b = BARS[bar];
  const c = corners(b)[v.corner];
  let x = c[0];
  let y = c[1];
  const block = v.corner >= 2 && v.corner <= 5 ? 1 : 0;
  const end = v.corner === 3 || v.corner === 4 ? 1 : 0;
  y += block * DX * (1 - d.lift);
  x += end * d.extend;
  x = Math.min(x, b.x0 + (b.x1 + d.extend - b.x0) * d.front);
  const sy = y - (x - 50) * TAN8;
  const s = smooth(0, 0.25, d.lift);
  out[0] = x + v.offFlat[0] + (v.off[0] - v.offFlat[0]) * s;
  out[1] = sy + v.offFlat[1] + (v.off[1] - v.offFlat[1]) * s;
  return out;
}

// Origine del viewBox ufficiale (73 × 89,834): minimo del contorno a riposo.
const restPts = OUTLINES.flatMap((o, i) => o.map((v) => vertexAt(i, v, REST, [0, 0])));
export const ORIGIN: Vec2 = [Math.min(...restPts.map((p) => p[0])), Math.min(...restPts.map((p) => p[1]))];
export const SIZE: Vec2 = [
  Math.max(...restPts.map((p) => p[0])) - ORIGIN[0],
  Math.max(...restPts.map((p) => p[1])) - ORIGIN[1],
];

/** Tracciato SVG di una barra a riposo, nello stesso formato del brand book. */
export function toSvgD(bar: number): string {
  const f = (n: number) => +n.toFixed(3);
  return (
    'M' +
    OUTLINES[bar]
      .map((v) => vertexAt(bar, v, REST, [0, 0]))
      .map((q) => `${f(q[0] - ORIGIN[0])} ${f(q[1] - ORIGIN[1])}`)
      .join('L') +
    'Z'
  );
}

/** Da coordinate SVG (inclinate) a spazio locale 3D: centrato, y verso l'alto, 1 unità = 10 SVG. */
export const UNIT = 10;
export const CENTER: Vec2 = [ORIGIN[0] + SIZE[0] / 2, ORIGIN[1] + SIZE[1] / 2];
export const toLocal = (p: Vec2): Vec2 => [(p[0] - CENTER[0]) / UNIT, -(p[1] - CENTER[1]) / UNIT];
