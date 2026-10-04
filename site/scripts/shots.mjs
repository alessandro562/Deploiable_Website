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

const points = (process.env.POINTS ?? '0.4,1.0,1.6,2.1,2.6,2.9,3.2,3.5,3.8,4.15,4.8,5.1,5.4,6.6').split(',');
for (const [i, p] of points.entries()) {
  await page.evaluate((p) => window.__DEPLOIABLE__.seek(+p), p);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/${String(i).padStart(2, '0')}-${p}.png` });
}
console.log(logs.slice(0, 20).join('\n') || 'no console errors');
await browser.close();
