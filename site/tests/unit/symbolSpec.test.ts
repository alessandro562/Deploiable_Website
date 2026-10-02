import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BARS, OUTLINES, REST, SIZE, toSvgD, vertexAt, ORIGIN } from '../../src/gl/symbol/symbolSpec';

const svg = readFileSync(new URL('../../../deploiable-symbol-lime.svg', import.meta.url), 'utf8');
const d = /<path[^>]* d="([^"]+)"/.exec(svg)![1];
const official = d.split('Z').filter((s) => s.trim()).map((s) => [...s.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]));
const parse = (path: string) => [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);

describe('simbolo', () => {
  it('ha la stessa dimensione del viewBox ufficiale', () => {
    expect(SIZE[0]).toBeCloseTo(73, 2);
    expect(SIZE[1]).toBeCloseTo(89.834, 2);
  });

  it('coincide con il file SVG ufficiale, punto per punto', () => {
    expect(official).toHaveLength(3);
    BARS.forEach((_, i) => {
      const mine = parse(toSvgD(i));
      expect(mine).toHaveLength(official[i].length);
      mine.forEach((p, j) => {
        expect(Math.abs(p[0] - official[i][j][0])).toBeLessThan(0.002);
        expect(Math.abs(p[1] - official[i][j][1])).toBeLessThan(0.002);
      });
    });
  });

  it('la fase 01 è la barra in alto', () => {
    const top = (i: number) => Math.min(...parse(toSvgD(i)).map((p) => p[1]));
    expect(top(0)).toBeLessThan(top(1));
    expect(top(1)).toBeLessThan(top(2));
  });

  it('da piatta a gradino il contorno resta orientato (nessun triangolo capovolto)', () => {
    for (let bar = 0; bar < 3; bar++) {
      for (const lift of [0, 0.1, 0.25, 0.5, 1]) {
        const pts = OUTLINES[bar].map((v) => vertexAt(bar, v, { ...REST, lift }, [0, 0]));
        const a = pts.reduce((s, q, i) => {
          const r = pts[(i + 1) % pts.length];
          return s + q[0] * r[1] - r[0] * q[1];
        }, 0);
        expect(a).toBeGreaterThan(0);
      }
    }
    expect(ORIGIN[0]).toBeGreaterThan(0);
  });
});
