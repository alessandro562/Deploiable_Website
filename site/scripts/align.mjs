// Misura l'allineamento vero dell'inquadratura finale sui pixel (non sui riquadri del DOM):
// bordi dell'inchiostro del logo, centro del logo e delle righe della frase rispetto al centro pagina, spazi verticali.
//   node scripts/align.mjs   (con `npm run preview` attivo)
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

const SIZES = [[1920, 1080], [1440, 900], [1280, 720], [768, 1024], [414, 896], [390, 844], [375, 667], [360, 740], [844, 390]];
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
  await page.evaluate(() => window.__DEPLOIABLE__.seek(12.9));
  await page.waitForTimeout(150);
  const rects = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    return { slot: r(document.querySelector('.logo-slot')), lines: [...document.querySelectorAll('.claim .line')].map(r) };
  });
  const png = PNG.sync.read(await page.screenshot());
  const ink = (x0, y0, x1, y1) => {
    let L = 1e9, R = -1, T = 1e9, B = -1;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(png.height, Math.ceil(y1)); y++)
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (Math.abs(png.data[i] - 16) + Math.abs(png.data[i + 1] - 38) + Math.abs(png.data[i + 2] - 27) > 60) {
          if (x < L) L = x; if (x > R) R = x; if (y < T) T = y; if (y > B) B = y;
        }
      }
    return { L, R: R + 1, T, B: B + 1 };
  };
  const logo = ink(rects.slot.x, rects.slot.y - 4, rects.slot.x + rects.slot.w, rects.slot.y + rects.slot.h + 4);
  const lines = rects.lines.map((l) => ink(l.x, l.y, l.x + l.w, l.y + l.h));
  out.push({ w, h, slot: rects.slot, logo, lines });
  const f = (v) => v.toFixed(1).padStart(6);
  console.log(`${w}x${h}`.padEnd(10), 'logo L', f(logo.L - rects.slot.x), 'R', f(logo.R - (rects.slot.x + rects.slot.w)),
    '| centro: logo', f((logo.L + logo.R) / 2 - w / 2), 'riga1', f((lines[0].L + lines[0].R) / 2 - w / 2), 'riga2', f((lines[1].L + lines[1].R) / 2 - w / 2),
    '| gap logo→riga1', f(lines[0].T - logo.B), '| gap riga1→2', f(lines[1].T - lines[0].B),
    '| blocco', f(logo.T), '→', f(lines[1].B), `(margine sopra ${f(logo.T).trim()} / sotto ${(h - lines[1].B).toFixed(1)})`);
  await page.close();
}
await browser.close();
