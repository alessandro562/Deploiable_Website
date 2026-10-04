// Render deterministico dell'animazione: per ogni fotogramma si ferma il tempo, si cattura, e ffmpeg
// monta il video. Serve `npm run preview` attivo.
//   node scripts/render-film.mjs [larghezza=1280] [altezza=720] [fps=30] [tier=mobile] [fermo=1.5] [uscita=artifacts/film.mp4]
// Per un video verticale (social):  node scripts/render-film.mjs 720 1280
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const [W = 1280, H = 720, FPS = 30] = process.argv.slice(2, 5).map(Number);
const tier = process.argv[5] ?? 'mobile';
const hold = Number(process.argv[6] ?? 1.5);
const out = process.argv[7] ?? 'artifacts/film.mp4';
const base = process.env.BASE_URL ?? 'http://localhost:4173/';
const limit = Number(process.env.FRAMES ?? Infinity);
const dir = 'artifacts/film-frames';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(300000);
await page.goto(`${base}?__test=1&tier=${tier}`);
await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
const duration = await page.evaluate(() => window.__DEPLOIABLE__.duration);

const total = Math.round((duration + hold) * FPS);
const t0 = Date.now();
for (let f = 0; f < Math.min(total, limit); f++) {
  await page.evaluate((t) => window.__DEPLOIABLE__.seek(t), f / FPS);
  await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.png` });
  if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

if (limit >= total) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%05d.png`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out]);
  console.log(out);
}
