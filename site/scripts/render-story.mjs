// Video dell'animazione: intro e poi scorrimento di tutto il racconto.
//   node scripts/render-story.mjs <larghezza> <altezza> <uscita.mp4>   (serve npm run preview attivo)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const [W, H, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const FPS = 30, dir = `artifacts/sf-${W}`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto('http://localhost:4173/?__test=1&tier=high' + (process.env.EXTRA ?? ''));
await p.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
const heroH = await p.evaluate(() => document.querySelector('.hero').offsetHeight);
const end = heroH + 4 * H; // fine della fascia
let f = 0;
const shot = async (t, y) => {
  await p.evaluate(([t, y]) => { scrollTo(0, y); window.__DEPLOIABLE__.seek(t); }, [t, y]);
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: `${dir}/${String(f++).padStart(5, '0')}.png` });
};
for (let i = 0; i < 7.5 * FPS; i++) await shot(i / FPS, 0);
const N = 13 * FPS;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
for (let i = 0; i <= N; i++) await shot(7.5 + i / FPS, ease(i / N) * end);
for (let i = 0; i < FPS; i++) await shot(7.5 + (N + i) / FPS, end);
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%05d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'slow', '-movflags', '+faststart', out]);
rmSync(dir, { recursive: true, force: true });
console.log(out);
