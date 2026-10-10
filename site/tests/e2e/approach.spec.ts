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

test('un percorso alla volta: si sceglie dalla sua card, si scorrono le tre fasi con 1·2·3', async ({ page }) => {
  await ready(page);
  const j1 = page.locator('#journey-1'), j2 = page.locator('#journey-2');
  const t1 = page.locator('.line-toggle[data-journey="1"]'), t2 = page.locator('.line-toggle[data-journey="2"]');
  await expect(j1).toBeHidden();
  await expect(j2).toBeHidden();
  await expect(page.locator('.stage-empty')).toBeVisible();
  await expect(t1).toHaveAttribute('aria-expanded', 'false');
  await expect(t1).toHaveAttribute('aria-controls', 'journey-1');
  for (const j of [j1, j2]) {
    await expect(j.locator('.tappa')).toHaveCount(3);
    await expect(j.locator('.step-btn')).toHaveCount(3);
    await expect(j.locator('.tappa.is-current')).toHaveCount(1);
    for (const f of await j.locator('.mk').all()) await expect(f).toHaveAttribute('aria-hidden', 'true');
  }
  await t1.click();
  await expect(j1).toBeVisible();
  await expect(j2).toBeHidden();
  await expect(t1).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.stage-empty')).toBeHidden();
  // una fase alla volta: il passo 2 mostra la fase 2, avanti e indietro la muovono
  await expect(j1.locator('.tappa.is-current')).toHaveAttribute('data-phase', '1');
  await j1.locator('.step-btn[data-step="2"]').click();
  await expect(j1.locator('.tappa.is-current')).toHaveAttribute('data-phase', '2');
  await j1.locator('.step-next').click();
  await expect(j1.locator('.tappa.is-current')).toHaveAttribute('data-phase', '3');
  await expect(j1.locator('.step-next')).toBeDisabled();
  await j1.locator('.step-prev').click();
  await expect(j1.locator('.tappa.is-current')).toHaveAttribute('data-phase', '2');
  // l'altra scheda apre l'altro percorso e chiude il primo
  await t2.click();
  await expect(j1).toBeHidden();
  await expect(j2).toBeVisible();
  await expect(t2).toHaveAttribute('aria-expanded', 'true');
  await expect(t1).toHaveAttribute('aria-expanded', 'false');
  await expect(j2.locator('.tappa.is-current')).toHaveAttribute('data-phase', '1');
  // "Come lavoriamo" non è più una sezione a sé: l'ancora porta alle due card
  await expect(page.locator('section#metodo, .sec--method')).toHaveCount(0);
  await expect(page.locator('#metodo.lines')).toHaveCount(1);
});
test('desktop: le due card sono affiancate, il percorso scelto va a tutta larghezza sotto', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'solo desktop');
  await ready(page);
  const col1 = await page.locator('#line-1').boundingBox();
  const col2 = await page.locator('#line-2').boundingBox();
  // affiancate: stessa riga, colonne diverse
  expect(Math.abs(col1!.y - col2!.y)).toBeLessThan(2);
  expect(col2!.x).toBeGreaterThan(col1!.x + col1!.width);
  await page.click('.line-toggle[data-journey="1"]');
  // misure dopo il clic: il clic può far scorrere la pagina
  const card = await page.locator('#line-1').boundingBox();
  const j1 = await page.locator('#journey-1').boundingBox();
  // il percorso sta sotto le card e occupa il contenuto, non solo la colonna
  expect(j1!.y).toBeGreaterThan(card!.y + card!.height - 2);
  expect(j1!.width).toBeGreaterThan(900);
  // una fase alla volta, nessuno scorrimento orizzontale
  await expect(page.locator('#journey-1 .tappa.is-current')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
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
