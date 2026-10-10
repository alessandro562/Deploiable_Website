import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const meta = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).getAttribute('content');

test('italiano predefinito, inglese col toggle: testi, lang, title e meta', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('h1')).toHaveText(/Built to work\.\s*Ready to be yours\./);
  await expect(page.locator('.sub')).toHaveText(/Costruiti per funzionare, pronti a diventare tuoi\. Deploiable è il deployer/);
  await expect(page.locator('.soon')).toHaveText(/Coming soon/);
  await expect(page.locator('.hero-ctas .btn').first()).toHaveText('Costruiamo ciò che serve');
  await expect(page.locator('#signup-email')).toHaveAttribute('placeholder', 'nome@azienda.it');
  await expect(page.locator('[data-lang="it"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveTitle('Deploiable · Costruiti per funzionare. Pronti a diventare tuoi.');
  // nei meta niente caratteri invisibili
  expect(await meta(page, 'meta[name="description"]')).toMatch(/^Costruiti per funzionare, pronti a diventare tuoi\. Deploiable è il deployer/);

  await page.click('[data-lang="en"]');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText(/Built to work\.\s*Ready to be yours\./);
  await expect(page.locator('.sub')).toHaveText(/Built to work, ready to become yours\. Deploiable is the AI-native innovation deployer/);
  await expect(page.locator('.hero-ctas .btn').first()).toHaveText('Let’s build what’s next');
  await expect(page.locator('.hero-ctas .btn').nth(1)).toHaveText('Explore our approach');
  await expect(page.locator('#contact-title')).toHaveText('What do you want to change?');
  await expect(page.locator('.path-title').nth(1)).toHaveText('Build an AI product');
  await expect(page.locator('.soon')).toHaveText(/Coming soon/);
  await expect(page.locator('[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await meta(page, 'meta[name="description"]')).toMatch(/^Built to work, ready to become yours\. Deploiable is the AI-native/);
  expect(await meta(page, 'meta[property="og:description"]')).toMatch(/Built to work, ready to become yours/);
  await expect(page).toHaveTitle('Deploiable · Built to work. Ready to be yours.');
  // ogni testo con data-i18n ha la sua traduzione (nessuna chiave dimenticata)
  const missing = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'))
      .filter((el) => !el.textContent?.trim())
      .map((el) => el.dataset.i18n),
  );
  expect(missing).toEqual([]);

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
