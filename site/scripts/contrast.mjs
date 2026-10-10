// Contrasto WCAG di tutti i testi della pagina (colore calcolato contro il fondo reale): node scripts/contrast.mjs
// Il fondo è il colore della palette attiva (la supergrafica non sta mai sotto i testi, c'è un test apposta).
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const pages = (process.argv[2] ?? ',privacy.html').split(',');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}${path}?__test=1&tier=high`);
  if (!path) {
    await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
    await page.evaluate(() => window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration));
  }
  const rows = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
        const x = +v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    // colore con trasparenza (es. Mist all'80%) composto sul suo fondo
    const flat = (fg, bg) => {
      const f = fg.match(/[\d.]+/g).map(Number);
      if (f.length < 4 || f[3] >= 1) return fg;
      const b = bg.match(/[\d.]+/g).map(Number);
      return `rgb(${[0, 1, 2].map((i) => Math.round(f[i] * f[3] + b[i] * (1 - f[3]))).join(', ')})`;
    };
    // fondo reale: il primo fondo non trasparente risalendo; i fondi semitrasparenti (le schede degli esempi) si
    // compongono su quello che c'è sotto
    const bgOf = (el) => {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (!c || c === 'transparent' || c.endsWith(', 0)')) continue;
        layers.push(c);
        const a = c.match(/[\d.]+/g).map(Number);
        if (a.length < 4 || a[3] >= 1) break;
      }
      let bg = layers.pop() ?? 'rgb(255, 255, 255)';
      while (layers.length) bg = flat(layers.pop(), bg);
      return bg;
    };
    const out = [];
    const sel = [
      '.lang button, .nav-list a, .soon, .claim .line, .sub, .hero-ctas .btn span, .proof-line',
      '.kicker, .sec-title, .sec-lead, .sec-note, .line-num, .line-title, .line-text, .line-tags li, .line-link span',
      '.step-num, .step-title, .step-text',
      '.contact-title, .contact-lead, .offer-title, .offer, .paths-legend, .path-num, .path-title, .path-text',
      '.signup-row input, .signup button, .consent-text, .consent a, .signup-note, .foot p, .foot dt, .foot dd, .foot a',
      '.doc-body p, .doc-body h2, .doc-draft, .doc-updated, .doc-back a',
    ].join(', ');
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      const bg = bgOf(el);
      const fg = flat(cs.color, bg);
      const name = el.className || el.tagName.toLowerCase();
      out.push({ el: `${el.tagName.toLowerCase()}.${String(name).split(' ')[0]}`, size: cs.fontSize, weight: cs.fontWeight, fg, bg, ratio: +ratio(fg, bg).toFixed(2) });
      // segnaposto dei campi
      if (el.tagName === 'INPUT') {
        const ph = getComputedStyle(el, '::placeholder').color;
        out.push({ el: `${el.tagName.toLowerCase()}::placeholder`, size: cs.fontSize, weight: cs.fontWeight, fg: ph, bg, ratio: +ratio(ph, bg).toFixed(2) });
      }
    }
    const seen = new Set();
    return out.filter((r) => (seen.has(r.el + r.fg + r.bg) ? false : seen.add(r.el + r.fg + r.bg)));
  });
  console.log(`\n== ${path || 'index.html'}`);
  for (const r of rows) console.log(`${r.ratio >= 4.5 ? '✓' : '✗'} ${String(r.ratio).padStart(5)}:1  ${r.el.padEnd(28)} ${r.size.padEnd(6)} ${r.weight.padEnd(4)} ${r.fg} su ${r.bg}`);
  await page.close();
}
await browser.close();
