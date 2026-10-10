import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const meta = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).getAttribute('content');

test('italiano predefinito, inglese col toggle: testi, lang, title e meta', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('.sub')).toHaveText(/Portiamo l’AI in produzione nei processi/);
  await expect(page.locator('.soon--foot')).toHaveText(/Coming soon/);
  await expect(page.locator('[data-lang="it"]')).toHaveAttribute('aria-pressed', 'true');
  // l'headline resta in inglese, marcata come tale
  await expect(page.locator('h1 .line').first()).toHaveAttribute('lang', 'en');
  expect(await meta(page, 'meta[name="description"]')).toMatch(/Portiamo l’AI in produzione/);

  await page.click('[data-lang="en"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.sub')).toHaveText('We put AI into production in companies’ processes and in the products we build, starting from an agreed number.');
  await expect(page.locator('.soon--foot')).toHaveText(/Coming soon/);
  await expect(page.locator('[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await meta(page, 'meta[name="description"]')).toMatch(/starting from an agreed number\./);
  expect(await meta(page, 'meta[property="og:description"]')).toMatch(/We put AI into production/);
  await expect(page).toHaveTitle('Deploiable · Built to work. Ready to be yours.');

  // la scelta vale per la sessione
  await page.reload();
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('senza sessionStorage la pagina resta in italiano e funziona', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('bloccato'); } });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await page.click('[data-lang="en"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});

