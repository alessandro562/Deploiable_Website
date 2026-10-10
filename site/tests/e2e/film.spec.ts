import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { DURATION as END, LOCK, LOOP_PERIOD, LOOP_START, SILENZIO_A, TIMES, TW_ERASE, TW_HOLD, TW_START } from '../../src/gl/timeline';
import { brightPixels, brightness, canvasHash, darkPixels, meanColor, openFilm, peakColumn, sample, seek, whiteShare } from './helpers';

const LIME = [200, 242, 90];
const FOREST = [16, 38, 27];
const LOCK_T = LOCK[0]; // clic dell'ultima barra: lo schermo passa al Lime
const near = (px: number[], ref: number[], tol: number) => ref.forEach((v, i) => expect(Math.abs(px[i] - v)).toBeLessThanOrEqual(tol));
// Lime con la luce (src/gl/engine.ts): centro più chiaro, bordi nel Lime profondo. Come nello shader (three.js),
// il Lime si mescola in spazio lineare e torna sRGB. r = distanza dal centro in unità dell'ellisse 55% × 85%;
// oltre l'ellisse resta il Lime profondo.
const toLin = (c: number) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055);
const LIME_HI = LIME.map((c) => toLin(c) + (1 - toLin(c)) * 0.35); // Lime schiarito verso il bianco al 35%
const LIME_EDGE = [176, 221, 60].map(toLin); // COLORS.limeDeep
const limeAt = (r: number) => LIME_HI.map((h, i) => toSrgb(h + (LIME_EDGE[i] - h) * Math.min(1, r)));

test('parte in WebGL, senza errori; l\'hero riempie esattamente la prima schermata', async ({ page }) => {
  const errors = await openFilm(page);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('webgl');
  const hero = (await page.locator('.hero').boundingBox())!;
  expect(Math.abs(hero.y)).toBeLessThanOrEqual(1);
  expect(hero.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  expect(errors).toEqual([]);
});

test('suspense: nessun testo finché le barre non scattano al loro posto', async ({ page }) => {
  await openFilm(page);
  // il browser normalizza lo stile in "translate3d(0px, 150%, 0px)": si legge la percentuale verticale
  const offset = () =>
    page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.line')).map((l) => parseFloat(/,\s*(-?[\d.]+)%/.exec(l.style.transform)?.[1] ?? 'NaN')));
  const subHidden = () => page.locator('.sub').evaluate((el) => getComputedStyle(el).opacity === '0');
  const hidden = async () => (await offset()).every((v) => v === 150) && (await subHidden());
  for (const t of [0.8, TIMES.segreto, TIMES.deploy, TIMES.silenzio, SILENZIO_A + 0.4]) {
    await seek(page, t);
    expect(await hidden(), `t=${t}`).toBe(true);
  }
  await seek(page, END);
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
  for (const t of [TIMES.linea, TIMES.segreto, TIMES.deploy, LOCK_T + 0.05]) {
    await seek(page, t);
    const px = await Promise.all([[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.5, 0.3]].map(([x, y]) => sample(page, x, y, 90)));
    expect(Math.max(...px.map(brightness)), `t=${t}`).toBeGreaterThan(dark);
  }
});

test('colori del brand: barre Lime metallico su Forest, poi al clic logo Forest metallico su Lime', async ({ page }) => {
  await openFilm(page);
  await seek(page, TIMES.deploy); // prima del clic: fondo Forest esatto, barre Lime metallico
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  // il metallo modula il colore ma non lo cambia: in media le barre restano Lime
  const bars = await brightPixels(page, 0.02, 0.05, 0.98, 0.95);
  expect(bars.length).toBeGreaterThan(200);
  near(meanColor(bars), LIME, 30);
  await seek(page, LOCK_T - 0.05);
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  await seek(page, LOCK_T + 0.05); // il clic dell'ultima barra: lo schermo passa al Lime, con la sua luce
  near(await sample(page, 0.03, 0.03, 8), limeAt(1), 3);
  await seek(page, END);
  // finale: fondo Lime con la luce, logo Forest metallico: in media resta Forest
  near(await sample(page, 0.03, 0.5, 8), limeAt(0.855), 4);
  const ink = await darkPixels(page, 0, 0, 0.5, 0.2, 1);
  expect(ink.length).toBeGreaterThan(150);
  near(meanColor(ink), FOREST, 14);
});

test('il tempo fermo dà sempre lo stesso fotogramma (anche tornando indietro)', async ({ page }) => {
  await openFilm(page);
  const sig = async () => {
    const out: number[] = [];
    for (const [x, y] of [[0.3, 0.4], [0.5, 0.5], [0.6, 0.6], [0.45, 0.35], [0.55, 0.45]]) out.push(...(await sample(page, x, y, 10)));
    return out;
  };
  await seek(page, TIMES.deploy);
  const a = await sig();
  await seek(page, END);
  await seek(page, TIMES.linea);
  await seek(page, TIMES.deploy);
  const b = await sig();
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(2));
});

test('dopo la fine il logo gira in ciclo e torna identico, pixel per pixel', async ({ page }) => {
  await openFilm(page);
  const st = () => page.evaluate(() => window.__DEPLOIABLE__!.state!());
  await seek(page, END);
  expect((await st()).roll).toEqual([0, 0, 0]);
  const logo = await page.locator('.logo-slot').boundingBox();
  // solo l'inchiostro del logo (Forest): dietro, la supergrafica continua a muoversi
  const shot = async () => {
    const png = PNG.sync.read(await page.screenshot({ clip: logo! }));
    const ink: boolean[] = [];
    for (let i = 0; i < png.data.length; i += 4) ink.push(png.data[i] + png.data[i + 1] + png.data[i + 2] < 160);
    return ink;
  };
  const same = (a: boolean[], b: boolean[]) => a.filter((v, i) => v !== b[i]).length / a.length < 0.002;
  const rest = await shot();
  // nel ciclo: prima la barra alta, poi le altre con 120 ms di sfasamento
  await seek(page, LOOP_START + 0.3);
  const [a, b, c] = (await st()).roll;
  expect(Math.abs(a)).toBeGreaterThan(Math.abs(b));
  expect(Math.abs(b)).toBeGreaterThan(Math.abs(c));
  expect(same(await shot(), rest)).toBe(false);
  // a fine giro (e un ciclo dopo) il logo è di nuovo fermo e allineato
  for (const t of [LOOP_START + 1.5, LOOP_START + LOOP_PERIOD + 1.5]) {
    await seek(page, t);
    expect((await st()).roll).toEqual([0, 0, 0]);
    expect(same(await shot(), rest), `t=${t}`).toBe(true);
  }
});

test('nessun bagliore: i lampi bianchi del metallo restano piccoli riflessi, in nessun momento', async ({ page }) => {
  await openFilm(page);
  for (const t of [TIMES.linea, TIMES.segreto, TIMES.deploy, LOCK_T + 0.05, TIMES.silenzio, TIMES.linea_finale, TIMES.logo, END]) {
    await seek(page, t);
    expect(await whiteShare(page), `t=${t}`).toBeLessThan(0.005);
  }
});

test('il mondo si ferma: tra il clic e la linea il fotogramma non cambia', async ({ page }) => {
  await openFilm(page);
  await seek(page, LOCK_T + 0.26);
  const a = await canvasHash(page);
  await seek(page, SILENZIO_A - 0.02);
  const b = await canvasHash(page);
  expect(a).toBe(b);
  await seek(page, LOCK_T - 0.2); // un istante prima dell'ultimo incastro: qualcosa si muove
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
  for (const t of [0.8, TIMES.deploy, SILENZIO_A - 0.05]) {
    await seek(page, t);
    expect(await visible(), `t=${t}`).toBeLessThanOrEqual(0.01);
  }
  await seek(page, TIMES.linea_finale);
  expect(await visible()).toBeGreaterThan(10);
  const angle = await page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.sweep')!).transform;
    const [a, b] = t.replace('matrix(', '').split(',').map(Number);
    return (Math.atan2(b, a) * 180) / Math.PI;
  });
  expect(angle).toBeCloseTo(-8, 1);
  await seek(page, END);
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
    for (const t of [TIMES.linea, TIMES.segreto, TIMES.deploy]) {
      await seek(page, t);
      const px = await Promise.all([[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.5, 0.3]].map(([x, y]) => sample(page, x, y, 90)));
      expect(Math.max(...px.map(brightness)), `t=${t}`).toBeGreaterThan(dark);
    }
    await seek(page, TIMES.deploy);
    const lit = await brightPixels(page, 0.02, 0.05, 0.98, 0.95);
    expect(lit.length).toBeGreaterThan(200);
    // Lime metallico: in media il colore resta quello del brand
    near(meanColor(lit), LIME, 30);
    near(await sample(page, 0.03, 0.03, 8), FOREST, 3);
    await seek(page, END);
    // finale: il logo è Forest metallico, in media Forest (piccolo: i bordi sfumati verso il Lime pesano di più)
    const ink = await darkPixels(page, 0, 0, 0.5, 0.2, 1);
    expect(ink.length).toBeGreaterThan(150);
    near(meanColor(ink), FOREST, 20);
    near(await sample(page, 0.03, 0.5, 8), limeAt(0.855), 4);
    expect(errors).toEqual([]);
  });
}

test('il naming compare alla fine, lettera dopo lettera da sinistra a destra', async ({ page }) => {
  await openFilm(page);
  const letters = () => page.evaluate(() => window.__DEPLOIABLE__!.state!().letters);
  for (const t of [0.8, TIMES.deploy, TIMES.silenzio, SILENZIO_A + 0.25]) {
    await seek(page, t);
    expect((await letters()).every((v) => v === 0), `t=${t}`).toBe(true);
  }
  await seek(page, TIMES.logo);
  const mid = await letters();
  expect(mid.length).toBe(11);
  expect(mid[0]).toBeGreaterThan(0.9); // la prima è già aperta
  expect(mid[10]).toBeLessThan(0.5); // l'ultima sta ancora iniziando
  // si aprono da sinistra a destra: le lettere già partite formano un blocco iniziale, senza buchi
  const started = mid.map((v) => v > 0);
  const firstIdle = started.indexOf(false);
  expect(firstIdle, 'almeno una lettera non ancora partita').toBeGreaterThan(0);
  expect(started.slice(firstIdle).every((v) => !v), 'nessuna lettera parte prima di quella alla sua sinistra').toBe(true);
  await seek(page, END);
  expect((await letters()).every((v) => v === 1)).toBe(true);
});

test('allineamento: logo 3D nel segnaposto dell\'header, frase centrata sulla pagina (misura sui pixel)', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, END);
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
        if (Math.abs(png.data[i] - 16) + Math.abs(png.data[i + 1] - 38) + Math.abs(png.data[i + 2] - 27) < 110 /* inchiostro Forest: la supergrafica dietro non conta */) { L = Math.min(L, x); R = Math.max(R, x + 1); }
      }
    return { L, R };
  };
  const { slot, lines } = rects;
  const logo = inkLeft(slot.x - 4, slot.y - 4, slot.x + slot.w + 4, slot.y + slot.h + 4);
  expect(Math.abs(logo.L - slot.x), 'bordo sinistro del logo 3D contro il segnaposto').toBeLessThanOrEqual(2);
  expect(Math.abs(logo.R - (slot.x + slot.w)), 'bordo destro del logo 3D contro il segnaposto').toBeLessThanOrEqual(2);
  const mid = png.width / 2;
  for (const [i, l] of lines.entries()) {
    const ink = inkLeft(l.x - 4, l.y, l.x + l.w + 4, l.y + l.h);
    expect(Math.abs((ink.L + ink.R) / 2 - mid), `centro della riga ${i + 1} contro il centro della pagina`).toBeLessThanOrEqual(2);
  }
});

test('sul telefono le barre non escono mai dallo schermo', async ({ page }) => {
  await openFilm(page);
  const vp = page.viewportSize()!;
  test.skip(vp.width > vp.height, 'solo schermi verticali');
  for (const t of [TIMES.linea, 1.6, 2.0, TIMES.segreto, 2.9, TIMES.deploy, 3.5, 3.7, LOCK_T - 0.02]) {
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

test('dettagli: testo secondario in Moss scurito pieno, Satoshi per i titoli e Geist per i testi piccoli', async ({ page }) => {
  await openFilm(page);
  await seek(page, END);
  const css = (sel: string, prop: string, pseudo?: string) =>
    page.locator(sel).evaluate((el, [p, ps]) => getComputedStyle(el, ps || null).getPropertyValue(p), [prop, pseudo ?? ''] as const);
  // Satoshi per titoli e frase principale, Geist per i testi piccoli
  for (const sel of ['.line--black'])
    expect(await css(sel, 'font-family'), sel).toMatch(/^"?Satoshi/);
  for (const sel of ['.soon--top', '.sub', '.hero .act-cta'])
    expect(await css(sel, 'font-family'), sel).toMatch(/^"?Geist/);
  expect(await css('.soon--top', 'text-transform')).toBe('uppercase');
  // etichetta del sistema (--t-label): Geist 500, maiuscolo spaziato
  expect(await css('.soon--top', 'font-weight')).toBe('500');
});

test('hero: il blocco dei testi è centrato in altezza (centro ottico appena sopra la metà)', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, END);
  const top = (await page.locator('.claim').boundingBox())!.y;
  const proof = (await page.locator('.proof').boundingBox())!;
  const bottom = proof.y + proof.height;
  const h = page.viewportSize()!.height;
  // su telefono i testi sono più alti dello schermo: conta l'aria fra l'header e la frase, non il centro
  if (page.viewportSize()!.width <= 640) {
    const logo = (await page.locator('.logo-slot').boundingBox())!;
    expect(top - (logo.y + logo.height), 'aria fra header e frase').toBeGreaterThan(56);
    return;
  }
  const ratio = top / (top + (h - bottom));
  expect(ratio, `aria sopra / aria totale = ${ratio.toFixed(2)}`).toBeGreaterThan(0.36);
  expect(ratio).toBeLessThan(0.52);
});

test('la frase non è mai tagliata: discendenti e ascendenti interi dentro la maschera', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, END);
  for (const sel of ['.line--light', '.line--black']) {
    // l'inchiostro della riga, misurato senza maschera, deve coincidere con quello visibile
    const shot = async () => {
      const b = (await page.locator(sel).boundingBox())!;
      const png = PNG.sync.read(await page.screenshot({ clip: { x: b.x - 20, y: b.y - 40, width: b.width + 40, height: b.height + 80 } }));
      let n = 0;
      for (let i = 0; i < png.data.length; i += 4) if (png.data[i] + png.data[i + 1] + png.data[i + 2] < 160) n++;
      return n;
    };
    const masked = await shot();
    await page.addStyleTag({ content: '.mask { overflow: visible !important; }' });
    const free = await shot();
    expect(Math.abs(free - masked), `${sel}: pixel tagliati dalla maschera`).toBeLessThanOrEqual(2);
  }
});

test('apertura: si parte dall\'alto e il vetro dell\'header non compare durante l\'intro', async ({ page }) => {
  await openFilm(page, '', 'high');
  await page.evaluate(() => scrollTo(0, 400));
  await page.reload();
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // anche scorrendo durante l'intro il vetro resta spento
  await seek(page, 2);
  await page.evaluate(() => scrollTo(0, 400));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.top')!, '::before').opacity)).toBe('0');
  await seek(page, END);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.top')!, '::before').opacity)).toBe('1');
});

test('header fisso: in cima trasparente col logo 3D, scorrendo barra di vetro col logo SVG', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, END);
  const root = page.locator('html');
  const svgOpacity = () => page.evaluate(() => getComputedStyle(document.querySelector('.logo-slot svg')!).opacity);
  const glass = () => page.evaluate(() => getComputedStyle(document.querySelector('.top')!, '::before').opacity);
  await expect(root).not.toHaveClass(/is-scrolled/);
  expect(await svgOpacity()).toBe('0');
  await page.evaluate(() => scrollTo(0, 400));
  await expect(root).toHaveClass(/is-scrolled/);
  await expect(root).toHaveClass(/is-docked/);
  expect((await page.locator('.top').boundingBox())!.y).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.top')!, '::before').backdropFilter)).toContain('blur');
  expect(await svgOpacity()).toBe('1');
  await expect.poll(glass).toBe('1');
  // IT / EN sta dentro la barra
  const bar = (await page.locator('.top').boundingBox())!;
  const lang = (await page.locator('.lang').boundingBox())!;
  expect(lang.y + lang.height).toBeLessThanOrEqual(bar.y + bar.height);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(root).not.toHaveClass(/is-docked/);
  expect(await svgOpacity()).toBe('0');
});

test('macchina da scrivere: "Ready to be yours." si cancella e si riscrive in ciclo, senza spostare la riga', async ({ page }) => {
  await openFilm(page, '', 'high');
  const st = () => page.evaluate(() => window.__DEPLOIABLE__!.state!());
  const visible = () => page.locator('.tw .ch:not(.off)').count();
  // il titolo resta "Built to work. Ready to be yours." per i lettori di schermo, qualunque cosa mostri la macchina da scrivere
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/Built to work\.\s*Ready to be yours\./);
  await seek(page, END);
  expect(await visible()).toBe(18);
  const full = (await page.locator('.tw').boundingBox())!;
  await seek(page, TW_START + TW_HOLD + TW_ERASE * 2.5);
  expect((await st()).tw).toBe(15);
  expect((await st()).caret).toBe(true);
  expect(await visible()).toBe(15);
  await expect(page.locator('.tw-caret')).toHaveClass(/on/);
  // la parola non si ricentra mentre si cancella
  const mid = (await page.locator('.tw').boundingBox())!;
  expect(Math.abs(mid.x - full.x)).toBeLessThanOrEqual(0.5);
  await seek(page, TW_START + TW_HOLD + TW_ERASE * 18 + 0.2);
  expect((await st()).tw).toBe(0);
  // e torna intera
  await seek(page, TW_START + 20 * 3);
  const back = await st();
  expect(back.tw).toBeGreaterThanOrEqual(0);
});

test('il simbolo nell\'header gira quando ci si passa sopra col mouse', async ({ page }) => {
  await openFilm(page, '', 'high');
  await seek(page, LOOP_START + 2); // a metà ciclo: nessun giro automatico in corso
  expect((await page.evaluate(() => window.__DEPLOIABLE__!.state!().roll)).every((v) => v === 0)).toBe(true);
  await page.evaluate(() => window.__DEPLOIABLE__!.play!());
  await page.hover('.logo-slot');
  await expect.poll(async () => (await page.evaluate(() => window.__DEPLOIABLE__!.state!().roll)).some((v) => v !== 0), { timeout: 3000 }).toBe(true);
});
