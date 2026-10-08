import { expect, test } from '@playwright/test';

// Il racconto (#approach) e le sezioni dopo l'hero: src/narrative.ts, src/sections.ts, src/system/*.

const ready = async (page: import('@playwright/test').Page, q = '?__test=1') => {
  await page.goto(`/${q}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForFunction(() => !!window.__NARR__ || document.documentElement.classList.contains('narr-still'));
};
const at = async (page: import('@playwright/test').Page, i: number, c: number) => {
  await page.evaluate(([i, c]) => window.__NARR__!.seekChapter(i, c), [i, c]);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.evaluate(() => window.__NARR__!.p());
};
// testi visibili nella scena (opacità del gruppo e dell'etichetta)
const shown = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<SVGTextElement>('.narr-svg text'))
      .filter((t) => {
        const g = t.closest<SVGGElement>('.obj');
        if (!g || g.style.display === 'none' || Number(g.getAttribute('opacity') ?? 1) < 0.5) return false;
        return Number(t.getAttribute('opacity') ?? 1) > 0.5 && getComputedStyle(t).display !== 'none';
      })
      .map((t) => t.textContent),
  );

test('il racconto segue lo scorrimento: un sistema che si divide, si trasforma, si assembla, converge e si collega', async ({ page }) => {
  await ready(page);
  await expect(page.locator('html')).toHaveClass(/narr-live/);
  // la scena è un solo SVG fermo mentre i capitoli scorrono
  await expect(page.locator('.narr-stage')).toHaveCSS('position', 'sticky');
  const ps: number[] = [];
  for (let i = 0; i < 6; i++) for (const c of [0.1, 0.5, 0.9]) ps.push(await at(page, i, c));
  // avanza sempre, dal problema (0) all'integrazione (7)
  for (let k = 1; k < ps.length; k++) expect(ps[k], `passo ${k}`).toBeGreaterThanOrEqual(ps[k - 1] - 1e-6);
  expect(ps[0]).toBe(0);
  expect(ps[ps.length - 1]).toBe(7);

  // a metà di ogni capitolo la scena è ferma nel suo stato chiave
  expect(await at(page, 1, 0.55)).toBe(1);
  expect(await shown(page)).toEqual(expect.arrayContaining(['TRASFORMARE', 'COSTRUIRE']));
  expect(await at(page, 2, 0.9)).toBe(3);
  const t = await shown(page);
  expect(t).toEqual(expect.arrayContaining(['EMAIL', 'AI', 'APPROVAZIONE', 'ERP']));
  expect(t).not.toContain('EXCEL'); // il lavoro manuale si è compresso nell'AI, la persona approva
  expect(await at(page, 3, 0.9)).toBe(5);
  expect(await shown(page)).toEqual(expect.arrayContaining(['Richieste', 'Suggerimento AI', 'Approva']));
  expect(await at(page, 4, 0.6)).toBe(6);
  expect(await shown(page)).toEqual(expect.arrayContaining(['SISTEMA AI', 'DATI REALI', 'UTENTI REALI', 'MONITORAGGIO']));
  expect(await at(page, 5, 0.6)).toBe(7);
  expect(await shown(page)).toEqual(expect.arrayContaining(['ERP', 'CRM', 'DOCUMENTI', 'POWERPOINT', 'TEAMS', 'SOFTWARE ESISTENTI', 'WEB APP SU MISURA']));
});

test('su desktop la scena non passa sotto i testi; su telefono i testi non coprono la scena', async ({ page }, info) => {
  await ready(page);
  await at(page, 3, 0.9);
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const body = document.querySelectorAll('.chap')[3].querySelector('.chap-body')!.getBoundingClientRect();
    const stage = document.querySelector('.narr-stage')!.getBoundingClientRect();
    // riquadro dei moduli visibili della scena
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const g of document.querySelectorAll<SVGGElement>('.narr-svg .obj')) {
      if (g.style.display === 'none' || Number(g.getAttribute('opacity') ?? 1) < 0.5) continue;
      const b = g.getBoundingClientRect();
      if (b.right < 0 || b.left > innerWidth) continue;
      x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
    }
    return { body: { l: body.left, r: body.right, t: body.top, b: body.bottom }, stage: { b: stage.bottom }, scene: { x0, y0, x1, y1 }, w: innerWidth };
  });
  if (info.project.name === 'mobile') {
    // schermo diviso: la scena in alto, il testo comincia sotto di lei
    expect(r.scene.y1).toBeLessThanOrEqual(r.stage.b + 1);
    expect(r.scene.x0).toBeGreaterThanOrEqual(0);
    expect(r.scene.x1).toBeLessThanOrEqual(r.w);
  } else {
    expect(r.scene.x0, 'la scena comincia dopo la colonna di testo').toBeGreaterThan(r.body.r);
    expect(r.scene.x1).toBeLessThanOrEqual(r.w);
  }
});

test('movimento ridotto: niente scena ferma a schermo, ogni capitolo ha la sua immagine', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.classList.contains('narr-still'));
  await expect(page.locator('.narr-stage')).toBeHidden();
  const figs = page.locator('.chap-fig svg');
  await expect(figs).toHaveCount(6);
  for (const f of await figs.all()) expect(await f.locator('.obj').count()).toBeGreaterThan(5);
  // le sezioni sono subito visibili (nessuna entrata animata)
  await expect(page.locator('.cap').first()).toHaveCSS('opacity', '1');
  await ctx.close();
});

test('header: vetro scuro sopra le sezioni Forest, chiaro sopra il contatto; i link portano alle sezioni', async ({ page }, info) => {
  await ready(page);
  await page.evaluate(() => window.__DEPLOIABLE__!.seek!(window.__DEPLOIABLE__!.duration!));
  if (info.project.name === 'mobile') {
    await page.click('.nav-toggle');
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-list')).toBeVisible();
    // il pannello è largo quanto lo schermo (nessun antenato trasformato lo stringe)
    const box = (await page.locator('#nav-list').boundingBox())!;
    expect(box.width).toBeGreaterThan(page.viewportSize()!.width - 40);
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-list')).toBeHidden();
    await page.click('.nav-toggle');
  }
  await page.click('.nav-list a[href="#build"]');
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('build')!.getBoundingClientRect().top)), { timeout: 5000 }).toBeLessThan(4);
  await expect(page.locator('html')).toHaveClass(/is-dark-under/);
  if (info.project.name === 'mobile') await expect(page.locator('#nav-list')).toBeHidden();
  // il pulsante principale dell'hero porta al contatto
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('.hero-ctas .btn--solid');
  // il contatto è l'ultima sezione: o arriva in cima, o la pagina è scorsa fino in fondo
  await expect
    .poll(() => page.evaluate(() => Math.abs(document.getElementById('contact')!.getBoundingClientRect().top) < 4 || scrollY + innerHeight >= document.documentElement.scrollHeight - 2), { timeout: 5000 })
    .toBe(true);
  await expect(page.locator('html')).toHaveClass(/is-lime-under/);
  await expect(page.locator('html')).not.toHaveClass(/is-dark-under/);
});

test('cosa realizziamo, metodo, esempi: sei forme, tre passi, tre esempi dichiarati come tali', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.cap')).toHaveCount(6);
  await expect(page.locator('.step')).toHaveCount(3);
  await expect(page.locator('.case')).toHaveCount(3);
  await expect(page.locator('.case-tag').nth(2)).toHaveText(/Esempio 03 · Product Studio/);
  await expect(page.locator('#cases .sec-note')).toHaveText('Scenari di esempio, non casi cliente.');
  // ogni frammento è disegnato dallo stesso motore
  for (const f of await page.locator('[data-mini] svg').all()) expect(await f.locator('.obj').count()).toBeGreaterThan(0);
  await expect(page.locator('[data-mini] svg')).toHaveCount(12);
});

test('nessuno scorrimento orizzontale e nessun errore alle larghezze di riferimento', async ({ browser }) => {
  for (const [w, h] of [[390, 844], [375, 812], [768, 1024], [1440, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?__test=1');
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    await page.evaluate(() => window.__DEPLOIABLE__!.seek!(window.__DEPLOIABLE__!.duration!));
    for (const id of ['approach', 'build', 'method', 'cases', 'contact']) {
      await page.evaluate((id) => document.getElementById(id)!.scrollIntoView(), id);
      await page.waitForTimeout(120);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${w}×${h} #${id}`).toBeLessThanOrEqual(w);
    }
    expect(errors, `${w}×${h}`).toEqual([]);
    await page.close();
  }
});
