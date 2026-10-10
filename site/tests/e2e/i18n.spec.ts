import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const meta = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).getAttribute('content');

test('italiano predefinito, inglese col toggle: testi, lang, title e meta', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('.sub')).toHaveText(/Individuiamo i processi ripetitivi/);
  await expect(page.locator('.soon')).toHaveText(/Coming soon/);
  await expect(page.locator('#signup-email')).toHaveAttribute('placeholder', 'nome@azienda.it');
  await expect(page.locator('[data-lang="it"]')).toHaveAttribute('aria-pressed', 'true');
  // l'headline resta in inglese, marcata come tale
  await expect(page.locator('h1 .line').first()).toHaveAttribute('lang', 'en');
  expect(await meta(page, 'meta[name="description"]')).toMatch(/Coming soon\./);

  await page.click('[data-lang="en"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.sub')).toHaveText('We identify repetitive processes, redesign them around AI and automation and integrate them with the systems you already use. Step by step, from manual to autonomous.');
  await expect(page.locator('.soon')).toHaveText(/Coming soon/);
  await expect(page.locator('[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await meta(page, 'meta[name="description"]')).toMatch(/from manual to autonomous\. Coming soon\./);
  expect(await meta(page, 'meta[property="og:description"]')).toMatch(/We identify repetitive processes/);
  await expect(page).toHaveTitle('Deploiable · Stop doing what AI can do.');

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

test('i messaggi del modulo seguono la lingua', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.fill('#signup-email', 'sbagliata');
  await page.click('.signup button[type="submit"]');
  await expect(page.locator('.signup-note')).toHaveText(/email valido/);
  await page.click('[data-lang="en"]');
  await expect(page.locator('.signup-note')).toHaveText(/valid email/);
});
