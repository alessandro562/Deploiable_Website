import { BufferAttribute, ExtrudeGeometry, Mesh, Path, Shape, Vector2 } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import brand from '../generated/brand.json';
import { DEPTH } from './symbol/barGeometry';
import { SIZE, UNIT } from './symbol/symbolSpec';
import { createBarMaterial } from './symbol/barMaterial';

// Il naming in 3D: il lettering è il tracciato ufficiale del logo (Satoshi Bold, −5,5 %, già in curve),
// estruso con la stessa profondità delle barre e posizionato dove il logo orizzontale lo vuole rispetto al simbolo.
// Tutto deriva da deploiable-logo-*.svg: nessuna misura inventata.

/** Numero di forme del lettering: d e p l o i (stelo) i (punto) a b l e. */
export const WORDMARK_COUNT = 11;

const nums = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]] as [number, number]);

// Il simbolo nel logo: ingombro e scala rispetto al simbolo generato da symbolSpec (SIZE).
const symPts = brand.logo.bars.flatMap(nums);
const sx0 = Math.min(...symPts.map((p) => p[0]));
const sx1 = Math.max(...symPts.map((p) => p[0]));
const sy0 = Math.min(...symPts.map((p) => p[1]));
const sy1 = Math.max(...symPts.map((p) => p[1]));
const SCALE = (sy1 - sy0) / SIZE[1]; // pixel del logo per unità del simbolo
const scx = (sx0 + sx1) / 2;
const scy = (sy0 + sy1) / 2;
const [, , vbW, vbH] = brand.logo.viewBox.split(' ').map(Number);

/** Dal piano del logo (pixel SVG, y verso il basso) allo spazio 3D del simbolo (centrato sul simbolo, y verso l'alto). */
const toWorld = (x: number, y: number): [number, number] => [(x - scx) / SCALE / UNIT, -(y - scy) / SCALE / UNIT];

/** Ingombro dell'intero logo (il viewBox) nello spazio 3D: larghezza e centro. */
export const LOGO_W = vbW / SCALE / UNIT;
export const LOGO_H = vbH / SCALE / UNIT;
export const LOGO_CENTER: [number, number] = toWorld(vbW / 2, vbH / 2);

export interface Letter {
  mesh: Mesh;
  /** Centro della lettera nello spazio 3D: perno di tutte le sue animazioni. */
  center: [number, number];
}

export function buildWordmark(): { letters: Letter[]; material: ReturnType<typeof createBarMaterial> } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path transform="${brand.logo.lettering.transform}" d="${brand.logo.lettering.d}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => p.toShapes());
  if (shapes.length !== WORDMARK_COUNT) throw new Error(`Lettering: attese ${WORDMARK_COUNT} forme, trovate ${shapes.length}`);

  const material = createBarMaterial();
  const letters: Letter[] = shapes.map((shape) => {
    const { shape: outline, holes } = shape.extractPoints(12);
    const w = (v: Vector2) => new Vector2(...toWorld(v.x, v.y));
    const out = new Shape(outline.map(w));
    out.holes = holes.map((h) => new Path(h.map(w)));
    const geo = new ExtrudeGeometry(out, { depth: DEPTH, bevelEnabled: false, curveSegments: 1, steps: 1 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    geo.translate(-cx, -cy, -DEPTH / 2); // centrata sul perno; la faccia frontale a +DEPTH/2, come le barre

    // Stesso schema delle barre: 0 faccia frontale, 1 posteriore, 2 pareti.
    const nor = geo.attributes.normal;
    const pos = geo.attributes.position;
    const kind = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const nz = nor.getZ(i);
      kind[i] = nz > 0.9 ? 0 : nz < -0.9 ? 1 : 2;
    }
    geo.setAttribute('aKind', new BufferAttribute(kind, 1));

    const mesh = new Mesh(geo, material);
    mesh.position.set(cx, cy, 0);
    mesh.frustumCulled = false;
    mesh.visible = false;
    return { mesh, center: [cx, cy] as [number, number] };
  });

  // Da sinistra a destra: è l'ordine in cui compaiono.
  letters.sort((a, b) => a.center[0] - b.center[0]);
  return { letters, material };
}
