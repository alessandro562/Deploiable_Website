// Screenshot di QA a pagina intera, a fine animazione: node scripts/qa-shots.mjs <cartella> [lingue] [larghezze]
//   es. node scripts/qa-shots.mjs ../qa/step1 it,en 1440,390   (con `npm run preview` attivo)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? '../qa/shots';
const langs = (process.argv[3] ?? 'it').split(',');
const widths = (process.argv[4] ?? '1440,390').split(',').map(Number);
const HEIGHT = { 1440: 900, 1024: 768, 390: 844 };
const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const pagePath = process.env.PAGE ?? ''; // es. PAGE=privacy.html
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
for (const lang of langs) {
  for (const w of widths) {
    const h = HEIGHT[w] ?? Math.round(w * 0.625);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1 });
    page.on('pageerror', (e) => errors.push(`${lang} ${w}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${lang} ${w}: ${m.text()}`));
    page.setDefaultTimeout(120000);
    await page.goto(`${base}${pagePath}?__test=1&tier=high&lang=${lang}`);
    if (!pagePath) {
      await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
      await page.evaluate(() => window.__DEPLOIABLE__.seek?.(window.__DEPLOIABLE__.duration));
    }
    await page.waitForTimeout(300);
    const name = pagePath ? `${pagePath.replace('.html', '')}-` : '';
    await page.screenshot({ path: `${out}/${name}${lang}-${w}.png`, fullPage: true });
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'nessun errore in console');
