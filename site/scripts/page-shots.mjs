// Screenshot di revisione a risoluzione doppia, solo le zone che contano: hero a fine animazione, fondo
// pagina con il footer, pagina privacy (inizio e fine), e gli stati del modulo (focus, errore, inviato).
//   node scripts/page-shots.mjs <cartella> [larghezzaxaltezza,...]   (serve npm run preview attivo)
//   LANG_QA=en per l'inglese
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? '../qa/pages';
const sizes = (process.argv[3] ?? '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const lang = process.env.LANG_QA ?? 'it';
const base = 'http://localhost:4173/';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
for (const [w, h] of sizes) {
  const name = (part) => `${out}/${part}-${lang}-${w}.png`;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  page.setDefaultTimeout(120000);
  await page.goto(`${base}?__test=1&tier=high&lang=${lang}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  const end = () => page.evaluate(() => window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration));
  await end();
  await settle(page);
  await page.screenshot({ path: name('hero') });
  // stati del modulo: focus sul primo campo, poi errore (invio a vuoto)
  await page.focus('#signup-email');
  await end();
  await page.screenshot({ path: name('focus') });
  await page.click('.signup button[type=submit]');
  await page.waitForTimeout(400);
  await end();
  await page.screenshot({ path: name('errore') });
  // fondo pagina: footer
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await end();
  await settle(page);
  await page.screenshot({ path: name('fondo') });
  await page.close();

  const doc = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await doc.goto(`${base}privacy.html?lang=${lang}`);
  await doc.waitForTimeout(300);
  await doc.screenshot({ path: name('privacy') });
  await doc.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await doc.waitForTimeout(300);
  await doc.screenshot({ path: name('privacy-fondo') });
  await doc.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : `screenshot in ${out}`);
