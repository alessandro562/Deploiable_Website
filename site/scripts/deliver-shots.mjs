// Screenshot di consegna: hero desktop e telefono, punti chiave in italiano e in inglese (card chiuse, i due
// percorsi aperti, contatto), pagina intera con le card chiuse e con un percorso aperto, e la versione a
// movimento ridotto.
//   node scripts/deliver-shots.mjs <cartella>   (BASE_URL predefinito: build con il percorso di GitHub Pages)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

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
  if (!opts.reduced) await page.evaluate(() => window.__DEPLOIABLE__.seek(window.__DEPLOIABLE__.duration + 2.6));
  await settle(page);
  return { ctx, page };
}
/** tutti i blocchi già entrati (le entrate allo scorrimento non sono lo scopo di uno screenshot) */
const revealAll = (page) => page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')));
/** una schermata dopo aver portato la pagina a y */
async function at(page, y, wait = 900) {
  await page.evaluate((y) => scrollTo(0, y), y);
  await settle(page);
  await revealAll(page);
  await page.waitForTimeout(wait);
  await settle(page);
}
const top = (page, sel) => page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY, sel);
const openJourney = async (page, id) => {
  await page.evaluate((id) => document.querySelector(`.line-toggle[data-journey="${id}"]`).click(), id);
  await page.waitForTimeout(900);
};

// --- hero
for (const [vp, name, dpr] of [[{ width: 1440, height: 900 }, 'hero-desktop', 2], [{ width: 390, height: 844 }, 'hero-mobile', 3]]) {
  for (const lang of ['it', 'en']) {
    const { ctx, page } = await open(vp, lang, { dpr });
    await page.screenshot({ path: lang === 'it' ? `${out}/${name}.png` : `${out}/screens/${name}-en.png` });
    await ctx.close();
  }
}

// --- punti chiave, IT ed EN, desktop e telefono (sotto l'header fisso: 72 px)
const keys = [
  ['01-card-chiuse', (p) => top(p, '#cosa-facciamo .sec-head')],
  ['02-percorso-processi-fase-1', async (p) => (await openJourney(p, 1), top(p, '#journey-1 .tappa'))],
  ['03-percorso-processi-fase-2', (p) => p.evaluate(() => document.querySelectorAll('#journey-1 .tappa')[1].getBoundingClientRect().top + scrollY - 72)],
  ['04-percorso-studio-fase-1', async (p) => (await openJourney(p, 2), top(p, '#journey-2 .tappa'))],
  ['05-percorso-studio-fase-3', (p) => p.evaluate(() => document.querySelectorAll('#journey-2 .tappa')[2].getBoundingClientRect().top + scrollY - 72)],
  ['06-contatto', async (p) => Math.min(await top(p, '#contact'), await p.evaluate(() => document.documentElement.scrollHeight - innerHeight))],
];
for (const [vp, tag] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'mobile']]) {
  for (const lang of ['it', 'en']) {
    const { ctx, page } = await open(vp, lang, { dpr: 2 });
    for (const [name, y] of keys) {
      await at(page, await y(page), 1300);
      await page.screenshot({ path: `${out}/screens/${tag}-${lang}-${name}.png` });
    }
    await ctx.close();
  }
}

// --- pagina intera: card chiuse, poi con il percorso 01 aperto; e la versione a movimento ridotto
for (const [vp, name] of [[{ width: 1440, height: 900 }, 'fullpage-desktop'], [{ width: 390, height: 844 }, 'fullpage-mobile']]) {
  const { ctx, page } = await open(vp, 'it', { dpr: 1 });
  await revealAll(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await openJourney(page, 1);
  await revealAll(page);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/screens/${name}-percorso-aperto.png`, fullPage: true });
  await ctx.close();
  const r = await open(vp, 'it', { dpr: 1, reduced: true });
  await r.page.waitForTimeout(800);
  await r.page.screenshot({ path: `${out}/screens/${name}-movimento-ridotto.png`, fullPage: true });
  await r.ctx.close();
}
await browser.close();
console.log(`screenshot in ${out}`);
