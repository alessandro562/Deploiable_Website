// Misure di prestazione sul sito locale (serve npm run preview): LCP, CLS, task lunghi, peso trasferito e
// fluidità mentre si scorre un percorso aperto di "Cosa facciamo" fino al contatto. Telefono: CPU rallentata 4× e rete "4G lenta" (CDP).
//   node scripts/perf.mjs [uscita.json]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const runs = [
  { name: 'mobile 390×844 · CPU 4× · 4G lenta', vp: { width: 390, height: 844 }, mobile: true, cpu: 4, net: { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 }, reduced: false },
  { name: 'mobile 390×844 · CPU 4× · 4G lenta · movimento ridotto', vp: { width: 390, height: 844 }, mobile: true, cpu: 4, net: { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 }, reduced: true },
  { name: 'desktop 1440×900', vp: { width: 1440, height: 900 }, mobile: false, cpu: 1, net: null, reduced: false },
];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
for (const r of runs) {
  const ctx = await browser.newContext({ viewport: r.vp, isMobile: r.mobile, hasTouch: r.mobile, reducedMotion: r.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (r.net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: r.net.latency, downloadThroughput: r.net.down, uploadThroughput: r.net.up });
  if (r.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: r.cpu });
  let bytes = 0;
  const failed = [];
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  page.on('requestfailed', (q) => failed.push(q.url()));
  page.on('response', (q) => q.status() >= 400 && failed.push(`${q.status()} ${q.url()}`));
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, lcpEl: '', cls: 0, long: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__perf.lcp = e.startTime;
        window.__perf.lcpEl = e.element ? `${e.element.tagName}.${e.element.className}` : '';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.long.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask', buffered: true });
  });
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true, null, { timeout: 120000 });
  // l'intro intera (≈ 10 s) prima di misurare LCP: l'headline compare alla fine dell'intro
  await page.waitForTimeout(r.reduced ? 3000 : 12000);
  const atRest = await page.evaluate(() => ({ ...window.__perf, long: [...window.__perf.long] }));
  // si apre il percorso 01 (clic sul pulsante della card), poi si scorre con la rotellina fino al contatto,
  // misurando i fotogrammi: gli schemi entrano in prospettiva mentre arrivano sullo schermo
  await page.evaluate(() => scrollTo(0, document.getElementById('cosa-facciamo').offsetTop));
  await page.waitForTimeout(600);
  await page.click('.line-toggle[data-journey="1"]');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const f = (t) => {
      window.__frames.push(t - last);
      last = t;
      if (window.__frames.length < 100000) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    window.__perf.long = [];
  });
  const total = await page.evaluate(() => document.getElementById('contact').getBoundingClientRect().top);
  const steps = 120;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await page.waitForTimeout(60);
  }
  const scroll = await page.evaluate(() => {
    const fr = window.__frames.slice(2);
    const sorted = [...fr].sort((a, b) => a - b);
    const p = (q) => sorted[Math.floor(sorted.length * q)];
    return { frames: fr.length, medianMs: p(0.5), p95Ms: p(0.95), over50: fr.filter((x) => x > 50).length, long: window.__perf.long, cls: window.__perf.cls };
  });
  results.push({
    run: r.name,
    loadEventMs: loadMs,
    transferredKB: Math.round(bytes / 1024),
    lcpMs: Math.round(atRest.lcp),
    lcpElement: atRest.lcpEl,
    clsAfterLoad: Number(atRest.cls.toFixed(4)),
    longTasksDuringLoad: atRest.long.length,
    longestTaskDuringLoadMs: Math.max(0, ...atRest.long.map((x) => x[1])),
    scroll: { ...scroll, long: scroll.long.length, longestMs: Math.max(0, ...scroll.long.map((x) => x[1])), clsTotal: Number(scroll.cls.toFixed(4)) },
    failedRequests: failed,
  });
  console.log(JSON.stringify(results[results.length - 1]));
  await ctx.close();
}
await browser.close();
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
