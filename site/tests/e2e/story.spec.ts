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
  await expect(page.locator('.story .act-title')).toHaveText(['Misuriamo prima di costruire.', 'Partiamo dal processo, non dal modello.', 'Autonomia per gradi, sempre reversibile.']);
  await expect(page.locator('.story .act-kicker')).toHaveText(['Come lavoriamo · 01 Misura', 'Come lavoriamo · 02 Processo', 'Come lavoriamo · 03 Autonomia']);
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

test('racconto: il pulsante della chiusura porta al contatto, in inglese con il toggle', async ({ page }) => {
  await openFilm(page, '', 'high');
  await page.click('[data-lang="en"]');
  await expect(page.locator('.story .act-title').first()).toHaveText('We measure before we build.');
  await expect(page.locator('.story .act-kicker')).toHaveText(['How we work · 01 Measure', 'How we work · 02 Process', 'How we work · 03 Autonomy']);
  await expect(page.locator('.story .act-cta')).toHaveText('Let’s talk');
  await scrollToStage(page, 3);
  await seek(page, 7.3);
  await expect(page.locator('.story .act-cta')).toHaveAttribute('href', '#contatti');
  await page.click('.story .act-cta');
  await expect(page.locator('#contatti')).toBeInViewport({ timeout: 5000 });
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

/** Colore medio delle ultime righe dello schermo, come lo vede chi guarda (pagina e canvas composti). */
async function bottomColor(page: import('@playwright/test').Page) {
  const { PNG } = await import('pngjs');
  const vp = page.viewportSize()!;
  const png = PNG.sync.read(await page.screenshot({ clip: { x: 0, y: vp.height - 6, width: vp.width, height: 6 } }));
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2];
  }
  const n = png.data.length / 4;
  return [r / n, g / n, b / n];
}

test('telefono: quando la barra del browser si ritira, sotto il racconto non compare mai il Lime', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'solo telefono');
  // si apre con la barra visibile (schermo più basso), poi la barra si ritira e torna
  await page.setViewportSize({ width: 390, height: 760 });
  await openFilm(page, '', 'high');
  await seek(page, 7.3);
  for (const h of [760, 844, 760]) {
    await page.setViewportSize({ width: 390, height: h });
    await scrollToStage(page, 0.5);
    await seek(page, 7.3);
    const [r, g, b] = await bottomColor(page);
    // Forest (16, 38, 27), non Lime (200, 242, 90)
    expect(g, `verde in basso a ${h} px: ${[r, g, b].map(Math.round)}`).toBeLessThan(90);
  }
});
