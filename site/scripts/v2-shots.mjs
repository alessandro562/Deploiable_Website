// Revisione visiva della V2: hero, racconto (capitolo per capitolo, in più punti), sezioni e pagina intera.
//   node scripts/v2-shots.mjs <cartella> [larghezzaxaltezza,...] [dpr]   (serve npm run preview attivo)
//   LANG_QA=en per l'inglese, MOTION=reduced per il movimento ridotto
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? '../qa/v2';
const sizes = (process.argv[3] ?? '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const dpr = Number(process.argv[4] ?? 1);
const lang = process.env.LANG_QA ?? 'it';
const reduced = process.env.MOTION === 'reduced';
const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const only = process.env.ONLY; // es. "narr" per i soli capitoli
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
for (const [w, h] of sizes) {
  const tag = `${lang}-${w}`;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w} console: ${m.text()}`));
  page.setDefaultTimeout(120000);
  await page.goto(`${base}?__test=1&tier=high&lang=${lang}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.evaluate(() => document.fonts.ready);
  const end = () => page.evaluate(() => window.__DEPLOIABLE__.seek?.(window.__DEPLOIABLE__.duration));
  await end();
  await settle(page);
  if (!only) await page.screenshot({ path: `${out}/hero-${tag}.jpg`, quality: 85 });
  // racconto: per ogni capitolo, entrata / lettura / uscita
  if (!reduced && (!only || only === 'narr')) {
    await page.evaluate(() => window.__NARR__?.freeze(1.3));
    const n = await page.evaluate(() => document.querySelectorAll('.chap').length);
    for (let i = 0; i < n; i++) {
      for (const c of [0.2, 0.5, 0.8]) {
        await page.evaluate(([i, c]) => window.__NARR__.seekChapter(i, c), [i, c]);
        await settle(page);
        await page.evaluate(() => window.__NARR__?.jump());
        await settle(page);
        await settle(page);
        const p = await page.evaluate(() => window.__NARR__?.p().toFixed(2));
        await page.screenshot({ path: `${out}/narr-${tag}-${i}-${String(c).replace('.', '')}-p${p}.jpg`, quality: 85 });
      }
    }
  }
  if (!only || only === 'secs') {
    for (const id of ['approach', 'build', 'method', 'cases', 'contact']) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start' }), id);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/sec-${tag}-${id}.jpg`, quality: 85 });
    }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/sec-${tag}-footer.jpg`, quality: 85 });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : `ok: ${out}`);
