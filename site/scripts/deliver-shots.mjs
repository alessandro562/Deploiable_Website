// Screenshot di consegna: hero desktop e telefono, pagina intera (composta da schermate reali in sequenza, e la
// versione a movimento ridotto in un solo scatto), sezioni chiave in italiano e in inglese.
//   node scripts/deliver-shots.mjs <cartella>   (BASE_URL predefinito: build con il percorso di GitHub Pages)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';

const out = process.argv[2] ?? '../Deploiable_Preview';
const base = process.env.BASE_URL ?? 'http://localhost:4174/Deploiable_Website/';
mkdirSync(`${out}/screens`, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function open(vp, lang, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: opts.dpr ?? 1, isMobile: vp.width < 500, hasTouch: vp.width < 500, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  await page.goto(`${base}?__test=1&tier=high&lang=${lang}`);
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.evaluate(() => document.fonts.ready);
  if (!opts.reduced) {
    await page.waitForFunction(() => !!window.__NARR__);
    await page.evaluate(() => {
      window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration + 2.6);
      window.__NARR__.freeze(1.2);
    });
  }
  await settle(page);
  return { ctx, page };
}
// una schermata dopo aver portato la pagina a y (le sezioni entrano: si aspetta che finiscano)
async function at(page, y, wait = 900) {
  await page.evaluate((y) => scrollTo(0, y), y);
  await settle(page);
  await page.evaluate(() => window.__NARR__?.jump());
  await page.waitForTimeout(wait);
  await settle(page);
}
const chap = (page, i, c) => page.evaluate(([i, c]) => window.__NARR__.yFor(i, c), [i, c]);
const top = (page, id) => page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id);

// --- hero
for (const [vp, name, dpr] of [[{ width: 1440, height: 900 }, 'hero-desktop', 2], [{ width: 390, height: 844 }, 'hero-mobile', 3]]) {
  for (const lang of ['it', 'en']) {
    const { ctx, page } = await open(vp, lang, { dpr });
    await page.screenshot({ path: lang === 'it' ? `${out}/${name}.png` : `${out}/screens/${name}-en.png` });
    await ctx.close();
  }
}

// --- sezioni chiave, IT ed EN, desktop e telefono
// a metà capitolo (su telefono il testo è appena sotto la scena); nei capitoli a due passaggi, a fine passaggio
const keys = [
  ['01-racconto-problema', (p, m) => chap(p, 0, m ? 0.48 : 0.55)],
  ['02-racconto-due-strade', (p, m) => chap(p, 1, m ? 0.5 : 0.6)],
  ['03-racconto-trasformare', (p, m) => chap(p, 2, m ? 0.47 : 0.9)],
  ['04-racconto-costruire', (p, m) => chap(p, 3, m ? 0.47 : 0.9)],
  ['05-racconto-produzione', (p, m) => chap(p, 4, m ? 0.5 : 0.6)],
  ['06-racconto-integrazione', (p, m) => chap(p, 5, m ? 0.5 : 0.6)],
  ['07-cosa-realizziamo', (p) => top(p, 'build')],
  ['08-metodo', (p) => top(p, 'method')],
  ['09-esempi', (p) => top(p, 'cases')],
  ['10-contatto', async (p) => Math.min(await top(p, 'contact'), await p.evaluate(() => document.documentElement.scrollHeight - innerHeight))],
];
for (const [vp, tag] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'mobile']]) {
  for (const lang of ['it', 'en']) {
    const { ctx, page } = await open(vp, lang, { dpr: 2 });
    for (const [name, y] of keys) {
      await at(page, await y(page, tag === 'mobile'), 1300);
      await page.screenshot({ path: `${out}/screens/${tag}-${lang}-${name}.png` });
    }
    await ctx.close();
  }
}

// --- pagina intera: schermate reali in sequenza, impilate (la scena del racconto è ferma a schermo: un unico
// scatto "a tutta pagina" la mostrerebbe una volta sola)
for (const [vp, name] of [[{ width: 1440, height: 900 }, 'fullpage-desktop'], [{ width: 390, height: 844 }, 'fullpage-mobile']]) {
  const { ctx, page } = await open(vp, 'it', { dpr: 1 });
  const ys = [0];
  const m = vp.width < 500;
  for (let i = 0; i < 6; i++) ys.push(await chap(page, i, m ? (i === 2 || i === 3 ? 0.47 : 0.5) : i === 2 || i === 3 ? 0.9 : 0.6));
  const sections = ['build', 'method', 'cases'];
  for (const id of sections) {
    const t = await top(page, id);
    const h = await page.evaluate((id) => document.getElementById(id).offsetHeight, id);
    for (let y = t; y < t + h - 40; y += vp.height) ys.push(y);
  }
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const ct = await top(page, 'contact');
  for (let y = Math.min(ct, max); y < max; y += vp.height) ys.push(y);
  ys.push(max);
  const shots = [];
  for (const y of ys) {
    await at(page, y, 1100);
    shots.push(PNG.sync.read(await page.screenshot()));
  }
  const W = shots[0].width;
  const H = shots.reduce((s, p) => s + p.height, 0);
  const img = new PNG({ width: W, height: H });
  let off = 0;
  for (const p of shots) {
    p.data.copy(img.data, off * W * 4);
    off += p.height;
  }
  writeFileSync(`${out}/${name}.png`, PNG.sync.write(img));
  await ctx.close();
  // la stessa pagina con il movimento ridotto, in un solo scatto (ogni capitolo con la sua immagine ferma)
  const r = await open(vp, 'it', { dpr: 1, reduced: true });
  await r.page.waitForTimeout(800);
  await r.page.screenshot({ path: `${out}/screens/${name}-movimento-ridotto.png`, fullPage: true });
  await r.ctx.close();
}
await browser.close();
console.log(`screenshot in ${out}`);
