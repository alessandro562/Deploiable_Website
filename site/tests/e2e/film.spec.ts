import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { brightPixels, brightness, canvasHash, darkPixels, maxChannels, openFilm, peakColumn, sample, seek } from './helpers';

const LIME = [200, 242, 90];
const FOREST = [16, 38, 27];
const LOCK_T = 10.2; // clic dell'ultima barra (LOCK[0] in choreography.ts)
const near = (px: number[], ref: number[], tol: number) => ref.forEach((v, i) => expect(Math.abs(px[i] - v)).toBeLessThanOrEqual(tol));

test('parte in WebGL, senza errori e senza scroll', async ({ page }) => {
  const errors = await openFilm(page);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('webgl');
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  expect(errors).toEqual([]);
});

test('suspense: nessun testo finché le barre non scattano al loro posto', async ({ page }) => {
  await openFilm(page);
  // il browser normalizza lo stile in "translate3d(0px, 110%, 0px)": si legge la percentuale verticale
  const offset = () =>
    page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.line')).map((l) => parseFloat(/,\s*(-?[\d.]+)%/.exec(l.style.transform)?.[1] ?? 'NaN')));
  const hidden = async () => (await offset()).every((v) => v === 110);
  for (const t of [0.8, 3, 6.5, 9.5, 10.5]) {
    await seek(page, t);
    expect(await hidden(), `t=${t}`).toBe(true);
  }
  await seek(page, 12.9);
  expect((await offset()).every((v) => v === 0)).toBe(true);
});

test('ogni atto disegna qualcosa', async ({ page }) => {
  await openFilm(page);
  const dark = FOREST[0] + FOREST[1] + FOREST[2] + 12;
  // t=0: buio. t=0.8: solo la linea al centro, sottile un paio di pixel.
  await seek(page, 0.05);
  expect(await peakColumn(page, 0.5, 0.3, 0.7)).toBeLessThan(dark);
  await seek(page, 0.8);
  expect(await peakColumn(page, 0.5, 0.45, 0.55)).toBeGreaterThan(300);
  // poi le tre carte, la caduta, l'incastro con le scintille
  for (const t of [3.4, 5.5, 8.9, 10.25]) {
    await seek(page, t);
    const px = await Promise.all([[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.5, 0.3]].map(([x, y]) => sample(page, x, y, 90)));
    expect(Math.max(...px.map(brightness)), `t=${t}`).toBeGreaterThan(dark);
  }
});

test('colori del brand esatti: barre Lime su Forest, poi al clic logo Forest su Lime', async ({ page }) => {
  await openFilm(page);
  await seek(page, 9.0); // prima del clic: fondo Forest, barre Lime
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  await seek(page, LOCK_T - 0.05);
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  await seek(page, LOCK_T + 0.05); // il clic dell'ultima barra: lo schermo passa al Lime
  near(await sample(page, 0.03, 0.03, 8), LIME, 2);
  await seek(page, 12.9);
  // finale: fondo Lime al valore, logo tutto Forest esatto (nessuna sfumatura rimasta)
  near(await sample(page, 0.03, 0.5, 8), LIME, 2);
  const ink = await darkPixels(page, 0.02, 0.05, 0.98, 0.75);
  expect(ink.length).toBeGreaterThan(200);
  for (const px of ink) near(px, FOREST, 2);
});

test('il tempo fermo dà sempre lo stesso fotogramma (anche tornando indietro)', async ({ page }) => {
  await openFilm(page);
  const sig = async () => {
    const out: number[] = [];
    for (const [x, y] of [[0.3, 0.4], [0.5, 0.5], [0.6, 0.6], [0.45, 0.35], [0.55, 0.45]]) out.push(...(await sample(page, x, y, 10)));
    return out;
  };
  await seek(page, 6.3);
  const a = await sig();
  await seek(page, 12.9);
  await seek(page, 2.5);
  await seek(page, 6.3);
  const b = await sig();
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(2));
});

test('dopo la rivelazione le tre barre respirano in sequenza', async ({ page }) => {
  await openFilm(page);
  await seek(page, 12.9);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.state!().bump)).toEqual([0, 0, 0]);
  // 1,5 s dopo la fine parte la spinta: prima la barra alta, poi le altre con 120 ms di sfasamento
  await seek(page, 12.9 + 1.5 + 0.35);
  const [a, b, c] = await page.evaluate(() => window.__DEPLOIABLE__!.state!().bump);
  expect(a).toBeGreaterThan(0.05);
  expect(b).toBeGreaterThan(0);
  expect(a).toBeGreaterThan(b);
  expect(b).toBeGreaterThan(c);
});

test('nessun bagliore: neppure un pixel supera il Lime del brand, in nessun momento', async ({ page }) => {
  await openFilm(page);
  for (const t of [3.4, 8.9, 9.3, 10.25, 10.6, 11.0, 12.9]) {
    await seek(page, t);
    const m = await maxChannels(page);
    LIME.forEach((v, i) => expect(m[i], `t=${t} canale ${i}`).toBeLessThanOrEqual(v));
  }
});

test('il mondo si ferma: tra il clic e la linea il fotogramma non cambia', async ({ page }) => {
  await openFilm(page);
  await seek(page, 10.5);
  const a = await canvasHash(page);
  await seek(page, 10.85);
  const b = await canvasHash(page);
  expect(a).toBe(b);
  await seek(page, 10.0); // un istante prima dell'ultimo incastro: qualcosa si muove
  expect(await canvasHash(page)).not.toBe(a);
});

test('la linea attraversa lo schermo a 8° e sparisce prima della frase', async ({ page }) => {
  await openFilm(page);
  const visible = () =>
    page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.sweep')!;
      const m = /inset\(0(?:px)? ([\d.]+)% 0(?:px)? ([\d.]+)%\)/.exec(el.style.clipPath);
      return m ? 100 - parseFloat(m[1]) - parseFloat(m[2]) : NaN; // percentuale visibile della linea
    });
  for (const t of [0.8, 6, 10.8]) {
    await seek(page, t);
    expect(await visible(), `t=${t}`).toBeLessThanOrEqual(0.01);
  }
  await seek(page, 11.1);
  expect(await visible()).toBeGreaterThan(10);
  const angle = await page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.sweep')!).transform;
    const [a, b] = t.replace('matrix(', '').split(',').map(Number);
    return (Math.atan2(b, a) * 180) / Math.PI;
  });
  expect(angle).toBeCloseTo(-8, 1);
  await seek(page, 12.9);
  expect(await visible()).toBeLessThanOrEqual(0.01);
});

// Regressione: ai livelli con antialiasing il canvas deve restare visibile in ogni atto.
for (const tier of ['high', 'mid', 'mobile']) {
  test(`al livello ${tier} l'animazione è sempre visibile`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await openFilm(page, '', tier);
    const dark = FOREST[0] + FOREST[1] + FOREST[2] + 12;
    await seek(page, 0.8);
    expect(await peakColumn(page, 0.5, 0.45, 0.55), 'linea iniziale').toBeGreaterThan(300);
    for (const t of [3.4, 6.3, 9.0]) {
      await seek(page, t);
      const px = await Promise.all([[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.5, 0.3]].map(([x, y]) => sample(page, x, y, 90)));
      expect(Math.max(...px.map(brightness)), `t=${t}`).toBeGreaterThan(dark);
    }
    await seek(page, 9.0);
    const lit = await brightPixels(page, 0.02, 0.05, 0.98, 0.95);
    expect(lit.length).toBeGreaterThan(200);
    // con l'antialiasing i bordi sono sfumature più scure del Lime: niente è più chiaro
    for (const px of lit) LIME.forEach((v, i) => expect(px[i]).toBeLessThanOrEqual(v + 3));
    near(await sample(page, 0.03, 0.03, 8), FOREST, 3);
    await seek(page, 12.9);
    // finale: il logo è Forest esatto (i bordi sfumano verso il Lime del fondo)
    const ink = await darkPixels(page, 0.02, 0.05, 0.98, 0.75);
    expect(ink.length).toBeGreaterThan(200);
    const exact = ink.filter((px) => px.every((v, i) => Math.abs(v - FOREST[i]) <= 3));
    expect(exact.length / ink.length, 'quota di Forest esatto').toBeGreaterThan(0.9);
    near(await sample(page, 0.03, 0.5, 8), LIME, 3);
    expect(errors).toEqual([]);
  });
}

test('il naming compare alla fine, lettera dopo lettera da sinistra a destra', async ({ page }) => {
  await openFilm(page);
  const letters = () => page.evaluate(() => window.__DEPLOIABLE__!.state!().letters);
  for (const t of [0.8, 6, 10.5, 11.0]) {
    await seek(page, t);
    expect((await letters()).every((v) => v === 0), `t=${t}`).toBe(true);
  }
  await seek(page, 11.5);
  const mid = await letters();
  expect(mid.length).toBe(11);
  expect(mid[0]).toBeGreaterThan(0.9); // la prima è già aperta
  expect(mid[10]).toBeLessThan(0.5); // l'ultima sta ancora iniziando
  // si aprono da sinistra a destra: le lettere già partite formano un blocco iniziale, senza buchi
  const started = mid.map((v) => v > 0);
  const firstIdle = started.indexOf(false);
  expect(firstIdle, 'almeno una lettera non ancora partita').toBeGreaterThan(0);
  expect(started.slice(firstIdle).every((v) => !v), 'nessuna lettera parte prima di quella alla sua sinistra').toBe(true);
  await seek(page, 12.9);
  expect((await letters()).every((v) => v === 1)).toBe(true);
});

test('allineamento: logo 3D e frase centrati sulla pagina (misura sui pixel)', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, 12.9);
  const rects = await page.evaluate(() => {
    const r = (el: Element) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    return { slot: r(document.querySelector('.logo-slot')!), lines: Array.from(document.querySelectorAll('.claim .line')).map(r) };
  });
  const png = PNG.sync.read(await page.screenshot());
  const inkLeft = (x0: number, y0: number, x1: number, y1: number) => {
    let L = 1e9, R = -1;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(png.height, Math.ceil(y1)); y++)
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const i = (y * png.width + x) * 4;
        if (Math.abs(png.data[i] - LIME[0]) + Math.abs(png.data[i + 1] - LIME[1]) + Math.abs(png.data[i + 2] - LIME[2]) > 60) { L = Math.min(L, x); R = Math.max(R, x + 1); }
      }
    return { L, R };
  };
  const { slot, lines } = rects;
  const logo = inkLeft(slot.x - 4, slot.y - 4, slot.x + slot.w + 4, slot.y + slot.h + 4);
  expect(Math.abs(logo.L - slot.x), 'bordo sinistro del logo 3D contro il segnaposto').toBeLessThanOrEqual(2);
  expect(Math.abs(logo.R - (slot.x + slot.w)), 'bordo destro del logo 3D contro il segnaposto').toBeLessThanOrEqual(2);
  const mid = png.width / 2;
  expect(Math.abs((logo.L + logo.R) / 2 - mid), 'centro del logo contro il centro della pagina').toBeLessThanOrEqual(2);
  for (const [i, l] of lines.entries()) {
    const ink = inkLeft(l.x - 4, l.y, l.x + l.w + 4, l.y + l.h);
    expect(Math.abs((ink.L + ink.R) / 2 - mid), `centro della riga ${i + 1} contro il centro della pagina`).toBeLessThanOrEqual(2);
  }
});

test('sul telefono le barre non escono mai dallo schermo', async ({ page }) => {
  await openFilm(page);
  const vp = page.viewportSize()!;
  test.skip(vp.width > vp.height, 'solo schermi verticali');
  for (const t of [3.4, 5.6, 7.0, 7.6, 8.0, 8.4, 8.9, 9.3, 9.6]) {
    await seek(page, t);
    const edge = await page.evaluate(() => {
      const src = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, 0, 0);
      const bright = (d: Uint8ClampedArray) => { for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) return true; return false; };
      const w = c.width, h = c.height;
      return bright(ctx.getImageData(0, 0, 1, h).data) || bright(ctx.getImageData(w - 1, 0, 1, h).data);
    });
    expect(edge, `t=${t}: una barra tocca il bordo`).toBe(false);
  }
});

test('coming soon e modulo: compaiono per ultimi, dentro lo schermo, sotto la frase', async ({ page }) => {
  await openFilm(page);
  const outro = page.locator('.outro');
  for (const t of [3, 10.5, 12.2]) {
    await seek(page, t);
    await expect(outro, `t=${t}`).toBeHidden();
  }
  await seek(page, 12.9);
  await expect(outro).toBeVisible();
  const vp = page.viewportSize()!;
  const box = (await outro.boundingBox())!;
  const claim = (await page.locator('.claim').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(claim.y + claim.height);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
});

test('iscrizione: email non valida, invio riuscito, errore del servizio', async ({ page }) => {
  await openFilm(page);
  await seek(page, 12.9);
  const note = page.locator('.signup-note');
  await page.fill('#signup-email', 'non-una-email');
  await page.click('.signup button');
  await expect(note).toHaveText(/valid email/);

  let status = 500;
  let body = '';
  await page.route('https://signup.test/**', (route) => {
    body = route.request().postData() ?? '';
    return route.fulfill({ status, contentType: 'application/json', body: '{}' });
  });
  await page.evaluate(() => (document.querySelector<HTMLFormElement>('.signup')!.dataset.endpoint = 'https://signup.test/f'));
  await page.fill('#signup-email', ' ciao@deploiable.com ');
  await page.click('.signup button');
  await expect(note).toHaveText(/went wrong/);
  status = 200;
  await page.click('.signup button');
  await expect(note).toHaveText(/on the list/);
  expect(body).toContain('ciao@deploiable.com');
  await expect(page.locator('.signup')).toBeHidden();
});
