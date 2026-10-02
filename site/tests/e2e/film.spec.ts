import { expect, test } from '@playwright/test';
import { openFilm, sample, seek } from './helpers';

test('il film parte in WebGL senza errori', async ({ page }) => {
  const errors = await openFilm(page);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('webgl');
  await seek(page, 'noise+0.8');
  const px = await sample(page, 0.5, 0.45, 40);
  expect(px[0] + px[1] + px[2]).toBeGreaterThan(60); // la nube di particelle è visibile
  expect(errors).toEqual([]);
});

test('ogni scena ha il suo testo visibile', async ({ page }) => {
  await openFilm(page);
  const cases: [string, string][] = [
    ['noise+0.9', 'Tutti parlano'],
    ['split+1.8', 'In mezzo'],
    ['analisi+0.6', 'Mappiamo processi'],
    ['pilota+0.8', 'gradino'],
    ['manifesto+0.1', 'Più deploy'],
    ['symbol+1.1', "fino al risultato"],
  ];
  for (const [at, text] of cases) {
    await seek(page, at);
    await expect(page.locator('.blk').filter({ hasText: text }).first()).toBeVisible();
  }
});

test('lo scroll all’indietro ricostruisce lo stesso fotogramma', async ({ page }) => {
  await openFilm(page);
  const sig = async () => {
    const pts: number[] = [];
    for (const [x, y] of [[0.3, 0.4], [0.5, 0.5], [0.7, 0.6], [0.6, 0.3]]) pts.push(...(await sample(page, x, y, 12)));
    return pts;
  };
  await seek(page, 'pilota+0.5');
  const a = await sig();
  await seek(page, 'finale+0.1');
  await seek(page, 'noise+0.2');
  await seek(page, 'pilota+0.5');
  const b = await sig();
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(3));
});

test('colori del brand esatti: vuoto Forest, finale Lime', async ({ page }) => {
  await openFilm(page);
  await seek(page, 'split+1.9');
  const forest = await sample(page, 0.5, 0.12);
  [16, 38, 27].forEach((v, i) => expect(Math.abs(forest[i] - v)).toBeLessThanOrEqual(4));
  await seek(page, 'end');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lime');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(200, 242, 90)');
  await expect(page.getByRole('heading', { name: /sta arrivando/ })).toBeVisible();
});

test('il link "Salta all’invito" porta al finale', async ({ page, isMobile }) => {
  test.skip(isMobile, 'tastiera solo su desktop');
  await openFilm(page);
  await page.evaluate(() => window.__DEPLOIABLE__!.freezeTime!(null));
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'lime', null, { timeout: 30_000 });
});
