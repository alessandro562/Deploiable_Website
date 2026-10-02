// Screenshot rapidi per la revisione: node scripts/shots.mjs [baseUrl] [tier] [w] [h]
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/';
const tier = process.argv[3] ?? 'minimal';
const W = +(process.argv[4] ?? 1440), H = +(process.argv[5] ?? 900);
const out = `artifacts/shots-${W}x${H}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(`${base}?__test=1&tier=${tier}${process.env.EXTRA ?? ''}`);
page.setDefaultTimeout(120000);
await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true, null, { timeout: 60000 });
await page.evaluate(() => window.__DEPLOIABLE__.freezeTime(3.0));
await page.waitForTimeout(1200);

const points = (process.env.POINTS ?? 'prologue+0.2,noise+0.6,noise+1.2,split+0.9,split+1.7,ignite+0.4,analisi+0.6,pilota+0.4,pilota+0.8,produzione+0.5,produzione+1.0,manifesto+0.1,symbol+0.9,symbol+1.3,finale+0.4,end').split(',');
for (const [i, p] of points.entries()) {
  await page.evaluate((p) => window.__DEPLOIABLE__.seek(p), p);
  await page.waitForTimeout(250);
  await page.evaluate((p) => window.__DEPLOIABLE__.seek(p), p);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${String(i).padStart(2, '0')}-${p.replace(/[^a-z0-9.]+/gi, '_')}.png` });
}
console.log(logs.slice(0, 20).join('\n') || 'no console errors');
await browser.close();
