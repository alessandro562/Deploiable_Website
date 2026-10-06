import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('footer: dati societari WDA srl e link Privacy, nelle due lingue', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  const foot = page.locator('.foot');
  await expect(foot).toContainText('Deploiable è un marchio di WDA srl');
  await expect(foot).toContainText('15274611001');
  await expect(foot).toContainText('Via Marsala 29/H, 00185 Roma (RM)');
  await expect(foot).toContainText('wdasrl@legalmail.it');
  await expect(foot.locator('a')).toHaveAttribute('href', 'privacy.html');
  await page.click('[data-lang="en"]');
  await expect(foot).toContainText('Deploiable is a trademark of WDA srl');
  await expect(foot).toContainText('Via Marsala 29/H, 00185 Rome (RM), Italy');
  // ogni dato con la sua etichetta, niente più riga unica
  await expect(foot.locator('dt')).toHaveText(['VAT no. & tax code', 'Certified email', 'Registered office']);
});

test('privacy.html: bozza bilingue nello stile della landing, lingua condivisa con la sessione', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/privacy.html');
  await expect(page.locator('.doc-draft')).toHaveText(/BOZZA — da validare legalmente/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page).toHaveTitle('Informativa privacy · Deploiable');
  await expect(page.locator('.doc-body[lang="it"] h1')).toBeVisible();
  await expect(page.locator('.doc-body[lang="en"]')).toBeHidden();
  for (const s of ['Titolare del trattamento', 'Finalità', 'Base giuridica', 'Dati raccolti', 'conservazione', 'Destinatari', 'diritti', 'Contatti'])
    await expect(page.locator('.doc-body[lang="it"]')).toContainText(s);
  await expect(page.locator('.doc-body[lang="it"]')).toContainText('[EMAIL_PRIVACY]');
  // sfondo Lime, testo Forest come la landing
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(200, 242, 90)');

  await page.click('[data-lang="en"]');
  await expect(page.locator('.doc-body[lang="en"] h1')).toHaveText('Privacy notice');
  await expect(page).toHaveTitle('Privacy notice · Deploiable');
  // tornando alla landing la lingua resta l'inglese
  await page.click('.doc-back a');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});
