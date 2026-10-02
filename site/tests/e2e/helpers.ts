import type { Page } from '@playwright/test';

export async function openFilm(page: Page, extra = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`/?__test=1&tier=minimal${extra}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true, null, { timeout: 90_000 });
  await page.evaluate(() => window.__DEPLOIABLE__!.freezeTime!(3));
  return errors;
}

export async function seek(page: Page, p: number | string) {
  await page.evaluate((p) => window.__DEPLOIABLE__!.seek!(p), p);
  await page.waitForTimeout(120);
  await page.evaluate((p) => window.__DEPLOIABLE__!.seek!(p), p);
}

/** Colore medio di una zona del canvas WebGL (preserveDrawingBuffer è attivo in modalità test). */
export async function sample(page: Page, x: number, y: number, size = 6) {
  return page.evaluate(
    ({ x, y, size }) => {
      const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, 0, 0);
      const sx = Math.round(x * src.width), sy = Math.round(y * src.height);
      const d = ctx.getImageData(sx, sy, size, size).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]; g += d[i + 1]; b += d[i + 2];
      }
      const n = d.length / 4;
      return [r / n, g / n, b / n];
    },
    { x, y, size },
  );
}
