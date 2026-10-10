import { expect, test } from '@playwright/test';

// La pagina snella (step 1 del piano V2): "Cosa facciamo" subito sotto la hero, due linee di prodotto,
// "Come lavoriamo", contatto. Niente racconto 3D, niente esempi.

const ready = async (page: import('@playwright/test').Page) => {
  await page.goto('/?__test=1');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.evaluate(() => window.__DEPLOIABLE__!.seek!(window.__DEPLOIABLE__!.duration!));
};

test('subito sotto la hero: "Cosa facciamo" con le due linee di prodotto', async ({ page }) => {
  await ready(page);
  const sec = page.locator('#cosa-facciamo');
  await expect(sec).toBeVisible();
  await expect(page.locator('#cosa-facciamo .line-col')).toHaveCount(2);
  await expect(page.locator('#cosa-facciamo .line-num').nth(0)).toHaveText(/01 · Per i processi delle aziende/);
  await expect(page.locator('#cosa-facciamo .line-num').nth(1)).toHaveText(/02 · Product Studio/);
  // la sezione comincia dove finisce la hero (nessun blocco in mezzo)
  const gap = await page.evaluate(() => {
    const hero = document.querySelector('.hero')!.getBoundingClientRect();
    const sec = document.getElementById('cosa-facciamo')!.getBoundingClientRect();
    return sec.top - hero.bottom;
  });
  expect(gap).toBeLessThan(2);
});

test('le figure sono decorative: immagini con alt vuoto e dimensioni fisse', async ({ page }) => {
  await ready(page);
  const figs = page.locator('#cosa-facciamo .line-fig');
  await expect(figs).toHaveCount(2);
  for (const f of await figs.all()) {
    await expect(f).toHaveAttribute('alt', '');
    await expect(f).toHaveAttribute('aria-hidden', 'true');
    await expect(f).toHaveAttribute('width', '560');
    await expect(f).toHaveAttribute('height', '360');
  }
  // le immagini si caricano davvero dal sottopercorso di pagina
  for (const f of await figs.all()) {
    expect(await f.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
});

test('ogni linea porta al contatto con la strada già scelta', async ({ page }) => {
  await ready(page);
  await page.click('#cosa-facciamo .line-link[data-interest="build"]');
  await expect(page.locator('input[name="interest"][value="build"]')).toBeChecked();
  await page.goto('/?__test=1');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.click('#cosa-facciamo .line-link[data-interest="transform"]');
  await expect(page.locator('input[name="interest"][value="transform"]')).toBeChecked();
});

test('navigazione: Approccio, Come lavoriamo, Contatti; niente esempi né "Cosa realizziamo"', async ({ page }, info) => {
  await ready(page);
  const links = page.locator('.nav-list a');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute('href', '#cosa-facciamo');
  await expect(links.nth(1)).toHaveAttribute('href', '#metodo');
  await expect(links.nth(2)).toHaveAttribute('href', '#contact');
  await expect(page.locator('#cases, #build, .sec--build, .narr')).toHaveCount(0);
  if (info.project.name === 'mobile') await page.click('.nav-toggle');
  await links.nth(1).click();
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('metodo')!.getBoundingClientRect().top)), { timeout: 5000 }).toBeLessThan(4);
});

test('header: testi Forest sopra la fascia Mist, chiari sopra le fasce scure', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.getElementById('cosa-facciamo')!.scrollIntoView());
  await expect(page.locator('html')).toHaveClass(/is-light-under/);
  await expect(page.locator('html')).not.toHaveClass(/is-dark-under/);
  const ink = await page.locator('.logo-slot').evaluate((el) => getComputedStyle(el).color);
  expect(ink).toBe('rgb(16, 38, 27)'); // Forest
  await page.evaluate(() => document.getElementById('metodo')!.scrollIntoView());
  await expect(page.locator('html')).toHaveClass(/is-dark-under/);
});

test('nessuno scorrimento orizzontale da 360 a 1920 px, nemmeno con le linee', async ({ browser }) => {
  for (const w of [360, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('/?__test=1');
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    await page.evaluate(() => document.getElementById('cosa-facciamo')!.scrollIntoView());
    await page.waitForTimeout(200);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${w} px`).toBeLessThanOrEqual(w);
    await page.close();
  }
});

test('movimento ridotto: la pagina è pronta subito, senza 3D', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('static');
  await expect(page.locator('#cosa-facciamo .line-col').first()).toBeVisible();
  await ctx.close();
});
