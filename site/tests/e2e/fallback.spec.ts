import { expect, test } from '@playwright/test';

test.describe('versione statica', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('con riduzione del movimento: logo e frase subito visibili, niente 3D scaricato', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
    await page.goto('/');
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('static');
    expect(scripts.some((u) => /\/app-.*\.js/.test(u))).toBe(false);
    await expect(page.locator('.logo-slot svg')).toBeVisible();
    await expect(page.getByRole('heading', { name: /We deploy AI/ })).toBeVisible();
    // il logo completo sta sopra la frase, e tutto dentro lo schermo
    const sym = (await page.locator('.logo-slot svg').boundingBox())!;
    const txt = (await page.locator('.claim').boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(txt.y).toBeGreaterThan(sym.y + sym.height);
    expect(txt.y + txt.height).toBeLessThan(vh);
  });
});

test('senza WebGL si usa la versione statica', async ({ browser }) => {
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
  await expect(page.locator('.logo-slot svg')).toBeVisible();
  await ctx.close();
});

test('versione statica: coming soon e modulo visibili', async ({ page }) => {
  await page.goto('/?mode=static');
  await expect(page.locator('.outro')).toBeVisible();
  await expect(page.locator('.soon')).toHaveText(/Coming soon/i);
  await expect(page.locator('#signup-email')).toBeVisible();
});
