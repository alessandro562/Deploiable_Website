// Render deterministico del film: per ogni fotogramma si fissa il tempo e si porta lo scroll
// al punto giusto, poi si cattura. ffmpeg monta il video.
// node scripts/render-film.mjs [secondi=36] [fps=24] [w=1280] [h=720] [tier=mobile] [particles]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const [secs = 36, fps = 24, W = 1280, H = 720] = process.argv.slice(2, 6).map(Number);
const tier = process.argv[6] ?? 'mobile';
const particles = process.argv[7] ?? '24000';
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
await page.goto(`${base}?__test=1&tier=${tier}&particles=${particles}`);
await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);

// Ritmo del montaggio: la durata di ogni scena è proporzionale alla sua lunghezza di scroll,
// con una piccola pausa iniziale sul prologo e finale sul Lime.
const total = Math.round(secs * fps);
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const t0 = Date.now();
for (let f = 0; f < Math.min(total, limit); f++) {
  const x = f / (total - 1);
  const p = Math.min(1, Math.max(0, (x - 0.04) / 0.88));
  const pe = p * 0.85 + ease(p) * 0.15;
  await page.evaluate(
    ({ pe, time }) => {
      const d = window.__DEPLOIABLE__;
      d.freezeTime(time);
      d.seek(pe);
    },
    { pe, time: 2 + f / fps },
  );
  await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.png` });
  if (f % 50 === 0 || process.env.VERBOSE) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

if (limit >= total) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/%05d.png`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', 'artifacts/film.mp4']);
  console.log('artifacts/film.mp4');
}
