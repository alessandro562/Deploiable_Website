import { expect, test } from '@playwright/test';
import { openFilm, seek } from './helpers';

// Il racconto sotto l'hero: tre step e la chiusura (src/gl/story.ts).

const scrollToStage = (page: import('@playwright/test').Page, stage: number) =>
  page.evaluate((stage) => {
    const el = document.querySelector<HTMLElement>('.story')!;
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + ((el.offsetHeight - innerHeight) * stage) / 3);
  }, stage);

const opacities = (page: import('@playwright/test').Page) =>
  page.$$eval('.story .act', (els) => els.map((e) => +getComputedStyle(e).opacity));

/** Riempimento dei tre segmenti della barra di avanzamento (0 → 1). */
const fills = (page: import('@playwright/test').Page) =>
  page.$$eval('.story-meter i', (els) => els.map((e) => +(e as HTMLElement).style.getPropertyValue('--fill')));

test('racconto: tre step e la chiusura, uno alla volta mentre si scorre', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, 7.3);
  await expect(page.locator('.story .act')).toHaveCount(4);
  await expect(page.locator('.story .act-title')).toHaveText(['Mappiamo i tuoi processi.', 'Costruiamo agenti su misura.', 'Misuriamo l’impatto.']);
  await expect(page.locator('.story .act-kicker')).toHaveText(['Analisi', 'Sviluppo', 'Misura']);
  for (const stage of [0, 1, 2, 3]) {
    await scrollToStage(page, stage + (stage < 3 ? 0.25 : 0));
    await seek(page, 7.3);
    const o = await opacities(page);
    o.forEach((v, i) => expect(v, `step ${stage}, testo ${i}`).toBeCloseTo(i === stage ? 1 : 0, 1));
    // la barra di avanzamento resta sotto i testi dei tre step e se ne va con la chiusura
    const meter = +(await page.locator('.story-meter').evaluate((e) => getComputedStyle(e).opacity));
    expect(meter, `avanzamento allo step ${stage}`).toBeCloseTo(stage < 3 ? 1 : 0, 1);
    if (stage < 3) {
      // gli step fatti sono pieni, quello corrente si sta riempiendo, i successivi sono vuoti
      const f = await fills(page);
      f.forEach((v, i) => {
        if (i < stage) expect(v, `segmento ${i} allo step ${stage}`).toBe(1);
        else if (i > stage) expect(v, `segmento ${i} allo step ${stage}`).toBe(0);
        else expect(v, `segmento ${i} allo step ${stage}`).toBeGreaterThan(0.3);
      });
    }
  }
});

test('racconto: il pulsante della chiusura riporta al modulo, in inglese con il toggle', async ({ page }) => {
  await openFilm(page, '', 'high');
  await page.click('[data-lang="en"]');
  await expect(page.locator('.story .act-title').first()).toHaveText('We map your processes.');
  await expect(page.locator('.story .act-kicker')).toHaveText(['Discovery', 'Build', 'Measure']);
  await expect(page.locator('.story .act-cta')).toHaveText('Book your AI process review');
  await scrollToStage(page, 3);
  await seek(page, 7.3);
  await page.click('.story .act-cta');
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBeLessThan(5);
  await expect(page.locator('#signup-email')).toBeFocused({ timeout: 5000 });
});

test.describe('senza animazioni', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('racconto statico: i tre step e la chiusura uno sotto l’altro, tutti visibili', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    for (const el of await page.locator('.story .act').all()) {
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
    }
    await expect(page.locator('.story .act-sub')).toHaveCount(3);
    // senza scorrimento animato l'avanzamento non ha senso: non c'è
    await expect(page.locator('.story-meter')).toBeHidden();
  });
});
