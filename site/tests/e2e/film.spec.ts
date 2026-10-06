import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { DURATION as END, LOCK, LOOP_PERIOD, LOOP_START, SILENZIO_A, TIMES, TW_ERASE, TW_HOLD, TW_START } from '../../src/gl/timeline';
import { brightPixels, brightness, canvasHash, darkPixels, maxChannels, openFilm, peakColumn, sample, seek } from './helpers';

const LIME = [200, 242, 90];
const FOREST = [16, 38, 27];
const LIME_DEEP = [176, 221, 60];
const LOCK_T = LOCK[0]; // clic dell'ultima barra: lo schermo passa al Lime
const near = (px: number[], ref: number[], tol: number) => ref.forEach((v, i) => expect(Math.abs(px[i] - v)).toBeLessThanOrEqual(tol));

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

test('colori del brand esatti: barre Lime su Forest, poi al clic logo Forest su Lime', async ({ page }) => {
  await openFilm(page);
  await seek(page, TIMES.deploy); // prima del clic: fondo Forest, barre Lime
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  await seek(page, LOCK_T - 0.05);
  near(await sample(page, 0.03, 0.03, 8), FOREST, 2);
  await seek(page, LOCK_T + 0.05); // il clic dell'ultima barra: lo schermo passa al Lime
  near(await sample(page, 0.03, 0.03, 8), LIME, 2);
  await seek(page, END);
  // finale: fondo Lime al valore, logo tutto Forest esatto (nessuna sfumatura rimasta)
  near(await sample(page, 0.03, 0.5, 8), LIME, 2);
  // il logo ora è piccolo, nell'header: si conta pixel per pixel
  const ink = await darkPixels(page, 0, 0, 0.5, 0.2, 1);
  expect(ink.length).toBeGreaterThan(150);
  for (const px of ink) near(px, FOREST, 2);
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

test('supergrafica: entra con la linea del finale e continua a muoversi, Lime Deep su Lime', async ({ page }) => {
  await openFilm(page);
  const st = () => page.evaluate(() => window.__DEPLOIABLE__!.state!());
  await seek(page, TIMES.deploy);
  expect((await st()).bgIn).toEqual([0, 0, 0]);
  await seek(page, END);
  expect((await st()).bgIn.every((v) => v === 1)).toBe(true);
  // su telefono in verticale non c'è spazio libero dai testi: la supergrafica va dietro, in tinta leggerissima
  const bd = await page.evaluate(() => window.__DEPLOIABLE__!.backdrop!());
  expect(bd.visible).toBe(true);
  if (bd.soft) {
    expect(page.viewportSize()!.width).toBeLessThanOrEqual(820);
    return;
  }
  // il fondo contiene Lime Deep esatto (la faccia frontale della supergrafica) e Lime esatto
  const vp = page.viewportSize()!;
  const png = PNG.sync.read(await page.screenshot());
  let deep = 0;
  for (let i = 0; i < png.data.length; i += 4 * 7) {
    const px = [png.data[i], png.data[i + 1], png.data[i + 2]];
    if (px.every((v, k) => Math.abs(v - LIME_DEEP[k]) <= 2)) deep++;
  }
  expect(deep / (vp.width * vp.height / 7), 'quota di Lime Deep').toBeGreaterThan(0.01);
  // si muove: due istanti del ciclo danno fotogrammi diversi
  await seek(page, LOOP_START + LOOP_PERIOD / 2 + 0.6);
  expect((await st()).bgSlide[0]).toBeGreaterThan(0.1);
  const h1 = await canvasHash(page);
  await seek(page, LOOP_START + LOOP_PERIOD * 2 + 0.2);
  expect(await canvasHash(page)).not.toBe(h1);
});

test('nessun bagliore: neppure un pixel supera il Lime del brand, in nessun momento', async ({ page }) => {
  await openFilm(page);
  for (const t of [TIMES.linea, TIMES.segreto, TIMES.deploy, LOCK_T + 0.05, TIMES.silenzio, TIMES.linea_finale, TIMES.logo, END]) {
    await seek(page, t);
    const m = await maxChannels(page);
    LIME.forEach((v, i) => expect(m[i], `t=${t} canale ${i}`).toBeLessThanOrEqual(v));
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
    // con l'antialiasing i bordi sono sfumature più scure del Lime: niente è più chiaro
    for (const px of lit) LIME.forEach((v, i) => expect(px[i]).toBeLessThanOrEqual(v + 3));
    near(await sample(page, 0.03, 0.03, 8), FOREST, 3);
    await seek(page, END);
    // finale: il logo è Forest esatto (i bordi sfumano verso il Lime del fondo)
    const ink = await darkPixels(page, 0, 0, 0.5, 0.2, 1);
    expect(ink.length).toBeGreaterThan(150);
    const exact = ink.filter((px) => px.every((v, i) => Math.abs(v - FOREST[i]) <= 3));
    // il logo è piccolo: i bordi sfumati pesano di più, ma il Forest esatto resta la maggioranza
    expect(exact.length / ink.length, 'quota di Forest esatto').toBeGreaterThan(0.6);
    near(await sample(page, 0.03, 0.5, 8), LIME, 3);
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

test('coming soon e modulo: compaiono per ultimi, dentro lo schermo, sotto la frase', async ({ page }) => {
  await openFilm(page);
  const outro = page.locator('.outro');
  for (const t of [TIMES.deploy, TIMES.silenzio, END - 0.5]) {
    await seek(page, t);
    await expect(outro, `t=${t}`).toBeHidden();
  }
  await seek(page, END);
  await expect(outro).toBeVisible();
  const vp = page.viewportSize()!;
  const box = (await outro.boundingBox())!;
  const claim = (await page.locator('.claim').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(claim.y + claim.height);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
});

test('richiesta review: validazione, avviso email personale, invio ad Apps Script, conferma', async ({ page }) => {
  await openFilm(page);
  await seek(page, END);
  const note = page.locator('.signup-note');
  const submit = () => page.click('.signup button[type="submit"]');

  // email non valida → errore sul campo email, con focus
  await page.fill('#signup-email', 'non-una-email');
  await submit();
  await expect(note).toHaveText(/email valido/);
  await expect(page.locator('.outro')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#signup-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#signup-email')).toBeFocused();
  // il bordo spesso è sulla capsula (desktop) o sul campo stesso (telefono, campi in colonna)
  const errSel = page.viewportSize()!.width <= 640 ? '#signup-email' : '.signup-row';
  await expect.poll(() => page.locator(errSel).evaluate((el) => getComputedStyle(el).boxShadow)).toContain('2.5px');
  expect(await note.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(16, 38, 27)');

  // email personale → avviso morbido, non bloccante
  await page.fill('#signup-email', 'mario.rossi@gmail.com');
  await page.locator('#signup-email').blur();
  await expect(note).toHaveText(/email aziendale/);
  await expect(page.locator('.outro')).toHaveAttribute('data-state', 'warn');

  // azienda mancante, poi consenso mancante
  await submit();
  await expect(note).toHaveText(/nome della tua azienda/);
  await expect(page.locator('#signup-company')).toBeFocused();
  await page.fill('#signup-company', 'Acme Srl');
  await submit();
  await expect(note).toHaveText(/informativa privacy/);
  await expect(page.locator('#signup-consent')).toHaveAttribute('aria-invalid', 'true');
  // la casella non è pre-spuntata e si spunta cliccando il testo
  await page.click('.consent-text span >> nth=0');
  await expect(page.locator('#signup-consent')).toBeChecked();

  // invio: prima la rete fallisce, poi va
  let body = '';
  let fail = true;
  await page.route('https://script.test/**', (route) => {
    if (fail) return route.abort();
    body = route.request().postData() ?? '';
    return route.fulfill({ status: 200, body: 'ok' });
  });
  await page.evaluate(() => (document.querySelector<HTMLFormElement>('.signup')!.dataset.endpoint = 'https://script.test/exec'));
  await page.fill('#signup-email', 'mario.rossi@acme.it');
  await submit();
  await expect(note).toHaveText(/Invio non riuscito/);
  fail = false;
  await submit();
  await expect(page.locator('.signup-done')).toBeVisible();
  await expect(page.locator('.signup-done')).toHaveText(/Richiesta ricevuta/);
  await expect(note).toHaveText('Ti contattiamo entro 3 giorni lavorativi per fissare la review.');
  await expect(page.locator('.signup')).toBeHidden();
  const sent = new URLSearchParams(body);
  expect(sent.get('email')).toBe('mario.rossi@acme.it');
  expect(sent.get('company')).toBe('Acme Srl');
  expect(sent.get('consent')).toBe('si');
  expect(sent.get('lang')).toBe('it');
});

test('modulo: link all\'informativa, casella non spuntata, su telefono in colonna con bersagli ≥ 44 px', async ({ page }) => {
  await openFilm(page);
  await seek(page, END);
  await expect(page.locator('.consent a')).toHaveAttribute('href', 'privacy.html');
  await expect(page.locator('#signup-consent')).not.toBeChecked();
  await expect(page.locator('label[for="signup-email"]')).toHaveText('Email aziendale');
  await expect(page.locator('label[for="signup-company"]')).toHaveText('Azienda');
  const vp = page.viewportSize()!;
  if (vp.width <= 640) {
    const e = (await page.locator('#signup-email').boundingBox())!;
    const c = (await page.locator('#signup-company').boundingBox())!;
    const b = (await page.locator('.signup button[type="submit"]').boundingBox())!;
    expect(c.y).toBeGreaterThan(e.y + e.height - 1); // in colonna
    expect(b.y).toBeGreaterThan(c.y + c.height - 1);
    for (const r of [e, c, b]) expect(r.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThan(vp.width - 2 * 48); // a tutta larghezza
  }
  await page.click('[data-lang="en"]');
  await expect(page.locator('.signup button[type="submit"]')).toHaveText(/Book your AI process review/);
  await expect(page.locator('#signup-email')).toHaveAttribute('placeholder', 'name@company.com');
});

test('dettagli: testo secondario in Moss scurito pieno, un solo carattere (Satoshi)', async ({ page }) => {
  await openFilm(page);
  await seek(page, END);
  const css = (sel: string, prop: string, pseudo?: string) =>
    page.locator(sel).evaluate((el, [p, ps]) => getComputedStyle(el, ps || null).getPropertyValue(p), [prop, pseudo ?? ''] as const);
  const MOSS = 'rgb(63, 90, 70)'; // Moss scurito per il testo piccolo (#3F5A46, 5,9:1 su Lime)
  expect(await css('.signup-note', 'color')).toBe(MOSS);
  expect(await css('#signup-email', 'color', '::placeholder')).toBe(MOSS);
  expect(await css('.signup-note', 'opacity')).toBe('1');
  for (const sel of ['.soon', '.signup-note', '.sub', '.signup button', '#signup-email'])
    expect(await css(sel, 'font-family'), sel).toMatch(/^"?Satoshi/);
  expect(await css('.soon', 'text-transform')).toBe('uppercase');
  expect(await css('.soon', 'font-weight')).toBe('300');
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

test('la supergrafica non tocca mai un testo, a nessuna larghezza', async ({ page }) => {
  test.setTimeout(180_000);
  await openFilm(page, '', 'high');
  for (const [w, h] of [[2000, 934], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [390, 844], [360, 740], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    for (const t of [END, LOOP_START + LOOP_PERIOD / 2 + 0.7]) {
      await seek(page, t);
      const sg = await page.evaluate(() => window.__DEPLOIABLE__!.backdrop!());
      // su schermi stretti va dietro ai testi in modalità soft (verificata dal test sul contrasto qui sotto)
      if (sg.soft) {
        expect(w <= 820 || h > w, `${w}x${h}: soft solo su schermi stretti`).toBe(true);
        expect(sg.visible).toBe(true);
        continue;
      }
      if (w >= 1024) expect(sg.visible, `${w}x${h}: visibile su desktop`).toBe(true);
      if (!sg.visible) continue;
      const texts = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.lang, .claim .line, .sub, .soon, .offer, .signup, .signup-note, .proof-line, .clients'))
          .map((el) => el.getBoundingClientRect())
          .map((r) => ({ x0: r.left, y0: r.top + scrollY, x1: r.right, y1: r.bottom + scrollY })),
      );
      for (const r of texts) {
        const overlap = r.x0 < sg.x1 && r.x1 > sg.x0 && r.y0 < sg.y1 && r.y1 > sg.y0;
        expect(overlap, `${w}x${h} t=${t}: supergrafica sopra un testo`).toBe(false);
      }
      // e sui pixel: dentro i riquadri dei testi non c'è la faccia Lime Deep della supergrafica
      const png = PNG.sync.read(await page.screenshot());
      let deep = 0;
      for (const r of texts)
        for (let y = Math.max(0, Math.floor(r.y0)); y < Math.min(png.height, Math.ceil(r.y1)); y++)
          for (let x = Math.max(0, Math.floor(r.x0)); x < Math.min(png.width, Math.ceil(r.x1)); x++) {
            const i = (y * png.width + x) * 4;
            if (Math.abs(png.data[i] - LIME_DEEP[0]) <= 3 && Math.abs(png.data[i + 1] - LIME_DEEP[1]) <= 3 && Math.abs(png.data[i + 2] - LIME_DEEP[2]) <= 3) deep++;
          }
      expect(deep, `${w}x${h} t=${t}: pixel Lime Deep sotto i testi`).toBe(0);
    }
  }
});

test('su telefono la supergrafica dietro ai testi non toglie contrasto (≥ 4,5:1 sui pixel)', async ({ page }) => {
  test.setTimeout(120_000);
  await openFilm(page, '', 'high');
  const lum = (c: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a: number[], b: number[]) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  for (const [w, h] of [[390, 844], [360, 740]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    for (const t of [END, LOOP_START + LOOP_PERIOD / 2 + 0.7]) {
      await seek(page, t);
      expect((await page.evaluate(() => window.__DEPLOIABLE__!.backdrop!())).soft, `${w}x${h}`).toBe(true);
      // colore di ogni testo e suo riquadro, poi si nascondono i testi per leggere il fondo sotto
      const texts = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.claim .line, .sub, .soon, .offer, .consent-text, .proof-line')).map((el) => {
          const r = el.getBoundingClientRect();
          const c = getComputedStyle(el).color.match(/\d+/g)!.slice(0, 3).map(Number);
          return { sel: el.className, c, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
        }),
      );
      await page.addStyleTag({ content: '.page, .page *, .top, .lang { visibility: hidden !important; }' });
      const png = PNG.sync.read(await page.screenshot());
      await page.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent?.includes('visibility: hidden !important') && s.remove()));
      for (const r of texts) {
        let worst = 21;
        for (let y = Math.max(0, Math.floor(r.y0)); y < Math.min(png.height, Math.ceil(r.y1)); y += 2)
          for (let x = Math.max(0, Math.floor(r.x0)); x < Math.min(png.width, Math.ceil(r.x1)); x += 2) {
            const i = (y * png.width + x) * 4;
            worst = Math.min(worst, ratio(r.c, [png.data[i], png.data[i + 1], png.data[i + 2]]));
          }
        expect(worst, `${w}x${h} t=${t} ${r.sel}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
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

test('prova sociale: riga di credibilità e loghi dei clienti in loop sotto il modulo', async ({ page }) => {
  const logoResponses: number[] = [];
  page.on('response', (r) => r.url().includes('/assets/clients/') && logoResponses.push(r.status()));
  await openFilm(page, '', 'high');
  await seek(page, END);
  await expect(page.locator('.proof-line')).toHaveText('70+ clienti dal 2021');
  // quattro loghi con il loro nome (la seconda copia della traccia è nascosta ai lettori di schermo)
  const named = page.getByRole('img', { name: /Comtel|Braga Moro|Marchiani|Junker/ });
  await expect(named).toHaveCount(4);
  await expect(page.locator('.clients')).not.toContainText('[CLIENTE_');
  await expect(page.locator('.clients')).not.toContainText(/green ?stone/i);
  const form = (await page.locator('.signup').boundingBox())!;
  const proof = (await page.locator('.proof').boundingBox())!;
  expect(proof.y).toBeGreaterThan(form.y + form.height);
  // la traccia scorre
  const x = () => page.locator('.clients-track').first().evaluate((el) => el.getBoundingClientRect().x);
  const x0 = await x();
  await page.waitForTimeout(600);
  expect(Math.abs((await x()) - x0)).toBeGreaterThan(5);
  expect(logoResponses.length).toBeGreaterThan(0);
  expect(logoResponses.every((s) => s === 200)).toBe(true);
  await page.click('[data-lang="en"]');
  await expect(page.locator('.proof-line')).toHaveText('70+ clients since 2021');
});

test('macchina da scrivere: "deployable." si cancella e si riscrive in ciclo, senza spostare la riga', async ({ page }) => {
  await openFilm(page, '', 'high');
  const st = () => page.evaluate(() => window.__DEPLOIABLE__!.state!());
  const visible = () => page.locator('.tw .ch:not(.off)').count();
  // il titolo resta "We make AI deployable." per i lettori di schermo, qualunque cosa mostri la macchina da scrivere
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/We make AI\s*deployable\./);
  await seek(page, END);
  expect(await visible()).toBe(11);
  const full = (await page.locator('.tw').boundingBox())!;
  await seek(page, TW_START + TW_HOLD + TW_ERASE * 4.5);
  expect((await st()).tw).toBe(6);
  expect((await st()).caret).toBe(true);
  expect(await visible()).toBe(6);
  await expect(page.locator('.tw-caret')).toHaveClass(/on/);
  // la parola non si ricentra mentre si cancella
  const mid = (await page.locator('.tw').boundingBox())!;
  expect(Math.abs(mid.x - full.x)).toBeLessThanOrEqual(0.5);
  await seek(page, TW_START + TW_HOLD + TW_ERASE * 11 + 0.2);
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
