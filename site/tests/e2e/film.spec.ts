import { expect, test } from '@playwright/test';
import { brightPixels, brightness, openFilm, peakColumn, sample, seek } from './helpers';

const LIME = [200, 242, 90];
const FOREST = [16, 38, 27];
const near = (px: number[], ref: number[], tol: number) => ref.forEach((v, i) => expect(Math.abs(px[i] - v)).toBeLessThanOrEqual(tol));

test('parte in WebGL, senza errori e senza scroll', async ({ page }) => {
  const errors = await openFilm(page);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('webgl');
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  expect(errors).toEqual([]);
});

test('suspense: nessun testo finché le barre non scattano al loro posto', async ({ page }) => {
  await openFilm(page);
  // il browser normalizza lo stile in "translate3d(0px, 110%, 0px)": si legge la percentuale verticale
  const offset = () =>
    page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.line')).map((l) => parseFloat(/,\s*(-?[\d.]+)%/.exec(l.style.transform)?.[1] ?? 'NaN')));
  const hidden = async () => (await offset()).every((v) => v === 110);
  for (const t of [0.8, 3, 6.5, 9.5, 10.5]) {
    await seek(page, t);
    expect(await hidden(), `t=${t}`).toBe(true);
  }
  await seek(page, 12.9);
  expect((await offset()).every((v) => v === 0)).toBe(true);
});

test('ogni atto disegna qualcosa', async ({ page }) => {
  await openFilm(page);
  const dark = FOREST[0] + FOREST[1] + FOREST[2] + 12;
  // t=0: buio. t=0.8: solo la linea al centro, sottile un paio di pixel.
  await seek(page, 0.05);
  expect(await peakColumn(page, 0.5, 0.3, 0.7)).toBeLessThan(dark);
  await seek(page, 0.8);
  expect(await peakColumn(page, 0.5, 0.45, 0.55)).toBeGreaterThan(300);
  // poi le tre carte, la caduta, l'incastro con le scintille
  for (const t of [3.4, 5.5, 8.9, 10.25]) {
    await seek(page, t);
    const px = await Promise.all([[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.5, 0.3]].map(([x, y]) => sample(page, x, y, 90)));
    expect(Math.max(...px.map(brightness)), `t=${t}`).toBeGreaterThan(dark);
  }
});

test('colori del brand esatti nell’inquadratura finale', async ({ page }) => {
  await openFilm(page);
  await seek(page, 12.9);
  // tutte le facce luminose del simbolo sono Lime esatto (nessun lampo, nessuna sfumatura rimasta)
  const lit = await brightPixels(page, 0.3, 0.1, 0.7, 0.7);
  expect(lit.length).toBeGreaterThan(200);
  for (const px of lit) near(px, LIME, 2);
  near(await sample(page, 0.05, 0.5, 8), FOREST, 2); // fondo: Forest, al valore
});

test('il tempo fermo dà sempre lo stesso fotogramma (anche tornando indietro)', async ({ page }) => {
  await openFilm(page);
  const sig = async () => {
    const out: number[] = [];
    for (const [x, y] of [[0.3, 0.4], [0.5, 0.5], [0.6, 0.6], [0.45, 0.35], [0.55, 0.45]]) out.push(...(await sample(page, x, y, 10)));
    return out;
  };
  await seek(page, 6.3);
  const a = await sig();
  await seek(page, 12.9);
  await seek(page, 2.5);
  await seek(page, 6.3);
  const b = await sig();
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(2));
});

test('dopo la rivelazione le tre barre respirano in sequenza', async ({ page }) => {
  await openFilm(page);
  await seek(page, 12.9);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.state!().bump)).toEqual([0, 0, 0]);
  // 1,5 s dopo la fine parte la spinta: prima la barra alta, poi le altre con 120 ms di sfasamento
  await seek(page, 12.9 + 1.5 + 0.35);
  const [a, b, c] = await page.evaluate(() => window.__DEPLOIABLE__!.state!().bump);
  expect(a).toBeGreaterThan(0.05);
  expect(b).toBeGreaterThan(0);
  expect(a).toBeGreaterThan(b);
  expect(b).toBeGreaterThan(c);
});
