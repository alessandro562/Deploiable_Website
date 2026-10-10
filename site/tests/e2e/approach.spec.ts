import { expect, test } from '@playwright/test';

// La pagina snella: "Cosa facciamo" subito sotto la hero, due linee di prodotto raccontate in tre fasi
// (che sono anche il metodo), poi il contatto. Niente racconto 3D, niente esempi.

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

test('i percorsi sono chiusi: si apre solo quello scelto, poi si chiude o si passa all’altro', async ({ page }) => {
  await ready(page);
  const j1 = page.locator('#journey-1'), j2 = page.locator('#journey-2');
  const t1 = page.locator('.line-toggle[data-journey="1"]'), t2 = page.locator('.line-toggle[data-journey="2"]');
  await expect(j1).toBeHidden();
  await expect(j2).toBeHidden();
  await expect(t1).toHaveAttribute('aria-expanded', 'false');
  await expect(t1).toHaveAttribute('aria-controls', 'journey-1');
  // ogni percorso ha tre fasi con uno schema decorativo
  for (const j of [j1, j2]) {
    await expect(j.locator('.tappa')).toHaveCount(3);
    await expect(j.locator('.tappa-k')).toHaveText([/1/, /2/, /3/]);
    for (const f of await j.locator('.mk').all()) await expect(f).toHaveAttribute('aria-hidden', 'true');
  }
  await t1.click();
  await expect(j1).toBeVisible();
  await expect(j2).toBeHidden();
  await expect(t1).toHaveAttribute('aria-expanded', 'true');
  await expect(j1).toBeFocused();
  // in fondo: passa all'altro
  await page.click('#journey-1 [data-journey-switch="2"]');
  await expect(j1).toBeHidden();
  await expect(j2).toBeVisible();
  await expect(t2).toHaveAttribute('aria-expanded', 'true');
  // chiudi: il fuoco torna al pulsante della card
  await page.click('#journey-2 [data-journey-close="2"]');
  await expect(j2).toBeHidden();
  await expect(t2).toBeFocused();
  await expect(t2).toHaveAttribute('aria-expanded', 'false');
  // il pulsante della card apre e chiude
  await t2.click();
  await expect(j2).toBeVisible();
  await t2.click();
  await expect(j2).toBeHidden();
  // "Come lavoriamo" non è più una sezione a sé: l'ancora porta alle due card
  await expect(page.locator('section#metodo, .sec--method')).toHaveCount(0);
  await expect(page.locator('#metodo.lines')).toHaveCount(1);
});

test('senza JavaScript i due percorsi restano aperti', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#journey-1')).toBeVisible();
  await expect(page.locator('#journey-2')).toBeVisible();
  await ctx.close();
});

test('gli schemi si traducono con la pagina', async ({ page }) => {
  await ready(page);
  const first = page.locator('#cosa-facciamo .mk [data-i18n="mk.1"]');
  await expect(first).toHaveText('Mappa del processo · oggi');
  await page.click('[data-lang="en"]');
  await expect(first).toHaveText('Process map · today');
  await expect(page.locator('#cosa-facciamo .tappa-k').first()).toHaveText('Phase 1 · Understand');
});

test('ogni linea porta al contatto con la strada già scelta', async ({ page }) => {
  await ready(page);
  await page.click('.line-toggle[data-journey="2"]');
  await page.click('#cosa-facciamo .line-link[data-interest="build"]');
  await expect(page.locator('input[name="interest"][value="build"]')).toBeChecked();
  await page.goto('/?__test=1');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.click('.line-toggle[data-journey="1"]');
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
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('metodo')!.getBoundingClientRect().top - 72)), { timeout: 5000 }).toBeLessThan(4);
});

test('header: testi Forest sopra la fascia Mist e sul Lime, chiari sopra la hero', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.getElementById('cosa-facciamo')!.scrollIntoView());
  await expect(page.locator('html')).toHaveClass(/is-light-under/);
  await expect(page.locator('html')).not.toHaveClass(/is-dark-under/);
  const ink = await page.locator('.logo-slot').evaluate((el) => getComputedStyle(el).color);
  expect(ink).toBe('rgb(16, 38, 27)'); // Forest
  await page.evaluate(() => document.getElementById('contact')!.scrollIntoView());
  await expect(page.locator('html')).toHaveClass(/is-lime-under/);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('html')).not.toHaveClass(/is-light-under|is-lime-under/);
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
