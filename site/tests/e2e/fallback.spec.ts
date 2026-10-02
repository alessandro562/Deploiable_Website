import { expect, test } from '@playwright/test';

test.describe('modalità statica', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('con reduced motion: tutto il testo, nessun codice 3D scaricato', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
    await page.goto('/');
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('static');
    expect(scripts.some((u) => /\/app-.*\.js/.test(u))).toBe(false);
    for (const text of ['Tutti parlano', 'In mezzo', 'Più deploy', 'fino al risultato']) {
      const el = page.locator('.blk').filter({ hasText: text }).first();
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
    }
    await page.locator('#finale').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /sta arrivando/ })).toBeVisible();
  });
});

test('senza WebGL si usa la modalità statica', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error simulazione di un browser senza WebGL
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return type.startsWith('webgl') ? null : orig.call(this, type, ...rest);
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.reason)).toBe('no-webgl2');
  await ctx.close();
});
