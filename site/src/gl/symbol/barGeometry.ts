import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three';
import { OUTLINES, PIVOT, REST, toLocal, vertexAt, type Deform, type OutlineVertex, type Vec2 } from './symbolSpec';

// Geometria estrusa di una barra, ricalcolata sulla CPU quando cambiano gradino, estensione o
// accensione (poche centinaia di vertici: costa meno di un frame di shader).
// Attributo aKind: 0 faccia frontale (Lime esatto), 1 faccia posteriore, 2 pareti.

export const DEPTH = 1.3; // profondità in unità mondo

export class BarGeometry {
  readonly geometry = new BufferGeometry();
  private readonly bar: number;
  private readonly outline: OutlineVertex[];
  private readonly capTris: number[];
  private readonly ccw: boolean;
  private readonly pts: Vec2[];
  private readonly pos: Float32Array;
  private readonly nor: Float32Array;
  private last = '';

  constructor(bar: number) {
    this.bar = bar;
    this.outline = OUTLINES[bar];
    const n = this.outline.length;
    this.pts = this.outline.map(() => [0, 0] as Vec2);
    this.compute(REST);
    const contour = this.pts.map((p) => new Vector2(p[0], p[1]));
    const tris = ShapeUtils.triangulateShape(contour, []);
    // La faccia frontale deve essere antioraria vista da +z: si orienta ogni triangolo.
    const signed = (a: number, b: number, c: number) =>
      (contour[b].x - contour[a].x) * (contour[c].y - contour[a].y) -
      (contour[c].x - contour[a].x) * (contour[b].y - contour[a].y);
    this.capTris = tris.flatMap(([a, b, c]) => (signed(a, b, c) >= 0 ? [a, b, c] : [a, c, b]));
    // Pareti: con contorno antiorario la normale esterna di a→b è (dy, -dx).
    this.ccw = ShapeUtils.area(contour) > 0;

    const vertCount = this.capTris.length * 2 + n * 6;
    this.pos = new Float32Array(vertCount * 3);
    this.nor = new Float32Array(vertCount * 3);
    const kind = new Float32Array(vertCount);
    let v = 0;
    for (let i = 0; i < this.capTris.length; i++) kind[v++] = 0;
    for (let i = 0; i < this.capTris.length; i++) kind[v++] = 1;
    for (let i = 0; i < n * 6; i++) kind[v++] = 2;

    this.geometry.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('normal', new BufferAttribute(this.nor, 3));
    this.geometry.setAttribute('aKind', new BufferAttribute(kind, 1));
    this.update(REST, true);
  }

  private compute(d: Deform) {
    const tmp: Vec2 = [0, 0];
    this.outline.forEach((v, i) => {
      vertexAt(this.bar, v, d, tmp);
      const l = toLocal(tmp);
      // centrata sul perno: la posizione della mesh è la posizione della barra
      this.pts[i][0] = l[0] - PIVOT[this.bar][0];
      this.pts[i][1] = l[1] - PIVOT[this.bar][1];
    });
  }

  update(d: Deform, force = false) {
    const key = `${d.lift.toFixed(4)}|${d.extend.toFixed(3)}|${d.front.toFixed(4)}`;
    if (!force && key === this.last) return;
    this.last = key;
    this.compute(d);

    const p = this.pts;
    const h = DEPTH / 2;
    const pos = this.pos;
    let o = 0;
    const put = (x: number, y: number, z: number) => {
      pos[o++] = x;
      pos[o++] = y;
      pos[o++] = z;
    };
    const t = this.capTris;
    for (let i = 0; i < t.length; i += 3) {
      put(p[t[i]][0], p[t[i]][1], h);
      put(p[t[i + 1]][0], p[t[i + 1]][1], h);
      put(p[t[i + 2]][0], p[t[i + 2]][1], h);
    }
    for (let i = 0; i < t.length; i += 3) {
      put(p[t[i]][0], p[t[i]][1], -h);
      put(p[t[i + 2]][0], p[t[i + 2]][1], -h);
      put(p[t[i + 1]][0], p[t[i + 1]][1], -h);
    }
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[this.ccw ? i : (i + 1) % n];
      const b = p[this.ccw ? (i + 1) % n : i];
      put(a[0], a[1], h);
      put(a[0], a[1], -h);
      put(b[0], b[1], -h);
      put(a[0], a[1], h);
      put(b[0], b[1], -h);
      put(b[0], b[1], h);
    }
    this.flatNormals();
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  private flatNormals() {
    const p = this.pos, nr = this.nor;
    for (let i = 0; i < p.length; i += 9) {
      const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2];
      const bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-9) {
        nx = 0; ny = 0; nz = 1;
      } else {
        nx /= l; ny /= l; nz /= l;
      }
      for (let k = 0; k < 9; k += 3) {
        nr[i + k] = nx;
        nr[i + k + 1] = ny;
        nr[i + k + 2] = nz;
      }
    }
  }
}
