import type { Page } from '@playwright/test';

export async function openFilm(page: Page, extra = '', tier = 'minimal') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`/?__test=1&tier=${tier}${extra}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true, null, { timeout: 90_000 });
  return errors;
}

/** Porta l'animazione al secondo indicato (la ferma e disegna un solo fotogramma). */
export async function seek(page: Page, seconds: number) {
  await page.evaluate((s) => window.__DEPLOIABLE__!.seek!(s), seconds);
  await page.waitForTimeout(80);
}

/** Colore medio di una zona del canvas WebGL (in modalità test il buffer è conservato). */
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

/** Quanto è "acceso" un punto: distanza dal colore Forest. */
export const brightness = (px: number[]) => px[0] + px[1] + px[2];

/** Luminosità massima lungo una colonna di pixel: serve per le linee sottili. */
export async function peakColumn(page: Page, x: number, y0: number, y1: number) {
  return page.evaluate(
    ({ x, y0, y1 }) => {
      const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, 0, 0);
      const sx = Math.round(x * src.width);
      const from = Math.round(y0 * src.height), to = Math.round(y1 * src.height);
      const d = ctx.getImageData(sx, from, 1, to - from).data;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i] + d[i + 1] + d[i + 2]);
      return max;
    },
    { x, y0, y1 },
  );
}

/** Tutti i pixel molto luminosi dell'area indicata, con il loro colore: servono a verificare il Lime esatto. */
export async function brightPixels(page: Page, x0: number, y0: number, x1: number, y1: number, step = 3, dark = false) {
  return page.evaluate(
    ({ x0, y0, x1, y1, step, dark }) => {
      const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, 0, 0);
      const out: number[][] = [];
      const fx = Math.round(x0 * src.width), tx = Math.round(x1 * src.width);
      const fy = Math.round(y0 * src.height), ty = Math.round(y1 * src.height);
      const d = ctx.getImageData(fx, fy, tx - fx, ty - fy).data;
      const w = tx - fx;
      for (let y = 0; y < ty - fy; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const b = d[i] + d[i + 1] + d[i + 2];
          if (dark ? b < 200 : b > 450) out.push([d[i], d[i + 1], d[i + 2]]);
        }
      }
      return out;
    },
    { x0, y0, x1, y1, step, dark },
  );
}

/** Tutti i pixel scuri dell'area indicata: sul fondo Lime del finale servono a verificare il Forest esatto. */
export const darkPixels = (page: Page, x0: number, y0: number, x1: number, y1: number, step = 3) =>
  brightPixels(page, x0, y0, x1, y1, step, true);

/** Hash del contenuto del canvas: due fotogrammi identici hanno lo stesso hash. */
export async function canvasHash(page: Page) {
  return page.evaluate(() => {
    const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0;
    return h;
  });
}

/** Il pixel più chiaro del canvas, canale per canale (per verificare che nulla superi il Lime del brand). */
export async function maxChannels(page: Page) {
  return page.evaluate(() => {
    const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) if (d[i + k] > m[k]) m[k] = d[i + k];
    return m;
  });
}

/** Colore medio di un insieme di pixel. */
export const meanColor = (px: number[][]) => [0, 1, 2].map((k) => px.reduce((a, p) => a + p[k], 0) / Math.max(1, px.length));

/** Quota di pixel quasi bianchi nel canvas (i lampi delle luci sul metallo). */
export async function whiteShare(page: Page) {
  return page.evaluate(() => {
    const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 225) n++;
    return n / (d.length / 4);
  });
}
