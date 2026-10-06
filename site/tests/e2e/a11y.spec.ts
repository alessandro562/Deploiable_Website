import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('nessuna violazione di accessibilità grave', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForTimeout(2500); // le animazioni statiche finiscono entro ~2 s (senza riduzione del movimento)
  const res = await new AxeBuilder({ page }).analyze();
  const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('nessuna violazione grave anche in inglese e nella pagina privacy', async ({ page }) => {
  for (const url of ['/?lang=en', '/privacy.html', '/privacy.html?lang=en']) {
    await page.goto(url);
    await page.waitForTimeout(2500);
    const res = await new AxeBuilder({ page }).analyze();
    const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${url} ${v.id}: ${v.nodes.length}`)).toEqual([]);
  }
});

test('tastiera: ordine di tabulazione logico e focus sempre visibile', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForTimeout(2500);
  const seen: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250); // il contorno del modulo compare con una transizione di 0,16 s
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const id = el.dataset.lang ? `lang-${el.dataset.lang}` : el.id || (el.closest('.foot') ? 'foot-link' : el.tagName.toLowerCase() + (el.closest('.consent') ? '-consent' : ''));
      // focus visibile: un contorno sull'elemento, sulla capsula del modulo o sulla casella del consenso
      const ring = (e: Element | null) => !!e && getComputedStyle(e).outlineStyle !== 'none' && parseFloat(getComputedStyle(e).outlineWidth) >= 2 && getComputedStyle(e).outlineColor !== 'rgba(0, 0, 0, 0)';
      const visible = ring(el) || ring(el.closest('.signup-row')) || ring(el.parentElement?.querySelector('.consent-box') ?? null);
      return { id, visible };
    });
    seen.push(info.id);
    expect(info.visible, `focus non visibile su ${info.id}`).toBe(true);
  }
  expect(seen).toEqual(['a', 'lang-it', 'lang-en', 'signup-email', 'signup-company', 'button', 'signup-consent', 'a-consent', 'foot-link']);
});

test('movimento ridotto: niente 3D, niente animazioni in loop', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('static');
  expect(await page.locator('.soon-dot').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('movimento ridotto: i loghi dei clienti restano fermi, in una sola fila', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.locator('.clients-track').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('.clients-track[aria-hidden="true"]')).toBeHidden();
});
