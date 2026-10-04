// Immagine OG (1200×630, l'inquadratura finale) e apple-touch-icon (180×180) dal sito costruito.
// Richiede `npm run preview` attivo: node scripts/make-posters.mjs [baseUrl]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
page.setDefaultTimeout(180000);
await page.goto(`${base}?__test=1&tier=mobile`);
await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
await page.evaluate(() => window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration));
await page.waitForTimeout(400);
await page.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 86 });

const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
const svg = readFileSync('public/favicon.svg', 'utf8').replace(/rx="7"/, 'rx="0"');
await icon.setContent(`<style>html,body{margin:0}svg{width:180px;height:180px;display:block}</style>${svg}`);
await icon.screenshot({ path: 'public/apple-touch-icon.png' });

await browser.close();
console.log('og.jpg e apple-touch-icon.png aggiornati');
