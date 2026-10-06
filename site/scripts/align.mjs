// Misura l'allineamento vero dell'inquadratura finale sui pixel (non sui riquadri del DOM):
// bordi dell'inchiostro del logo, centro del logo e delle righe della frase rispetto al centro pagina, spazi verticali.
//   node scripts/align.mjs   (con `npm run preview` attivo)
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

const SIZES = [[2000, 934], [1920, 1080], [1680, 1050], [1536, 864], [1440, 900], [1280, 720], [768, 1024], [414, 896], [390, 844], [375, 667], [360, 740], [844, 390]];
const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = [];
for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(120000);
  await page.goto(`${base}?__test=1&tier=high`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.evaluate(() => window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration));
  await page.waitForTimeout(150);
  const rects = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    return { slot: r(document.querySelector('.logo-slot')), lines: [...document.querySelectorAll('.claim .line')].map(r), soon: r(document.querySelector('.soon')), sub: r(document.querySelector('.sub')), note: r(document.querySelector('.signup-note')) };
  });
  const png = PNG.sync.read(await page.screenshot());
  const ink = (x0, y0, x1, y1) => {
    let L = 1e9, R = -1, T = 1e9, B = -1;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(png.height, Math.ceil(y1)); y++)
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (Math.abs(png.data[i] - 16) + Math.abs(png.data[i + 1] - 38) + Math.abs(png.data[i + 2] - 27) < 110 /* inchiostro Forest: la supergrafica dietro non conta */) {
          if (x < L) L = x; if (x > R) R = x; if (y < T) T = y; if (y > B) B = y;
        }
      }
    return { L, R: R + 1, T, B: B + 1 };
  };
  const logo = ink(rects.slot.x, rects.slot.y - 4, rects.slot.x + rects.slot.w, rects.slot.y + rects.slot.h + 4);
  const lines = rects.lines.map((l) => ink(l.x, l.y, l.x + l.w, l.y + l.h));
  const soon = ink(rects.soon.x, rects.soon.y, rects.soon.x + rects.soon.w, rects.soon.y + rects.soon.h);
  const sub = ink(rects.sub.x, rects.sub.y, rects.sub.x + rects.sub.w, rects.sub.y + rects.sub.h);
  const note = ink(rects.note.x, rects.note.y, rects.note.x + rects.note.w, rects.note.y + rects.note.h);
  out.push({ w, h, slot: rects.slot, logo, lines, soon, note });
  const f = (v) => v.toFixed(1).padStart(6);
  console.log(`${w}x${h}`.padEnd(10), 'logo L', f(logo.L - rects.slot.x), 'R', f(logo.R - (rects.slot.x + rects.slot.w)),
    '| centro: logo', f((logo.L + logo.R) / 2 - w / 2), 'riga1', f((lines[0].L + lines[0].R) / 2 - w / 2), 'riga2', f((lines[1].L + lines[1].R) / 2 - w / 2),
    '| gap logo→riga1', f(lines[0].T - logo.B), '| gap riga1→2', f(lines[1].T - lines[0].B),
    '| gap riga2→sub', f(sub.T - lines[1].B), '| gap sub→soon', f(soon.T - sub.B),
    '| blocco', f(logo.T), '→', f(rects.note.y + rects.note.h), `(sopra ${f(logo.T).trim()} / sotto ${(h - rects.note.y - rects.note.h).toFixed(1)} · blocco ${(((rects.note.y + rects.note.h - logo.T) / h) * 100).toFixed(0)}% · sopra/libero ${((logo.T / (h - (rects.note.y + rects.note.h - logo.T))) * 100).toFixed(0)}%)`);
  await page.close();
}
await browser.close();
