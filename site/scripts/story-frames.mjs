// Fotogrammi chiave del racconto a risoluzione doppia, più un foglio che li mette uno accanto all'altro:
//   node scripts/story-frames.mjs <cartella> [larghezzaxaltezza,...]   (serve npm run preview attivo)
//   es. node scripts/story-frames.mjs ../qa/step28 1440x900,390x844
// Avanzamenti: 0 step 1 · 0,5 arrivo della seconda barra · 1 step 2 · 1,5 arrivo della terza · 2 step 3 ·
// 2,6 onda Lime · 3 chiusura. LANG=en per i testi in inglese.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const out = process.argv[2] ?? '../qa/frames';
const sizes = (process.argv[3] ?? '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const lang = process.env.LANG_QA ?? 'it';
const STAGES = [
  [0, 'step 1'],
  [0.5, 'arrivo'],
  [1, 'step 2'],
  [1.5, 'arrivo'],
  [2, 'step 3'],
  [2.6, 'onda'],
  [3, 'chiusura'],
];
const T = 14; // tempo fisso (s): stessa fluttuazione e stessi riflessi a ogni giro, fotogrammi confrontabili
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  page.setDefaultTimeout(120000);
  await page.goto(`http://localhost:4173/?__test=1&tier=high&lang=${lang}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  const files = [];
  for (const [s, label] of STAGES) {
    await page.evaluate(
      ([s, t]) => {
        const el = document.querySelector('.story');
        const top = el.getBoundingClientRect().top + scrollY;
        scrollTo(0, top + ((el.offsetHeight - innerHeight) * s) / 3);
        window.__DEPLOIABLE__.seek(t);
      },
      [s, T],
    );
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = `${out}/frame-${w}x${h}-s${String(s).replace('.', '_')}.png`;
    await page.screenshot({ path: file });
    files.push([file, `${s} · ${label}`]);
  }
  await page.close();

  // foglio: i sette fotogrammi in griglia, anche lui a risoluzione doppia
  const cols = w > h ? 2 : 4;
  const sheet = await browser.newPage({ viewport: { width: cols * (w + 16) + 16, height: 400 }, deviceScaleFactor: 2 });
  const cells = files
    .map(([f, l]) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${l}</figcaption></figure>`)
    .join('');
  await sheet.setContent(
    `<style>body{margin:0;padding:16px;background:#0b0f0d;font:500 14px/1 system-ui;color:#cfd6cc;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:16px}
     figure{margin:0}img{display:block;width:${w}px;height:${h}px}figcaption{padding:8px 0 0}</style>${cells}`,
  );
  await sheet.screenshot({ path: `${out}/foglio-${w}x${h}.jpg`, fullPage: true, type: 'jpeg', quality: 88 });
  await sheet.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : `fotogrammi in ${out}`);
