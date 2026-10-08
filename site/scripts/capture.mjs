// Video di revisione, fotogramma per fotogramma, dal sito vero in un browser vero (Chromium + Playwright).
//
// Perché fotogramma per fotogramma: nel contenitore di sviluppo non c'è GPU (WebGL e SVG sono disegnati dalla
// CPU), e la registrazione in tempo reale esce a ~10 fotogrammi al secondo. Qui il tempo della pagina è
// simulato (page.clock): ogni fotogramma del video è 1/30 s di tempo della pagina, disegnato e catturato con
// calma, poi i fotogrammi diventano un MP4 con ffmpeg. Le animazioni CSS seguono lo stesso ritmo
// (Animation.setPlaybackRate). Il cursore e i tocchi sono disegnati sopra la pagina solo nella registrazione.
//
//   node scripts/capture.mjs desktop|mobile <cartella-fotogrammi> <video.mp4>
//   BASE_URL (predefinito http://localhost:4174/Deploiable_Website/: build con BASE_PATH come su GitHub Pages)
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const kind = process.argv[2] ?? 'desktop';
const dir = process.argv[3] ?? `/tmp/frames-${kind}`;
const outMp4 = process.argv[4] ?? `${kind}.mp4`;
const base = process.env.BASE_URL ?? 'http://localhost:4174/Deploiable_Website/';
const FPS = 30;
const mobile = kind === 'mobile';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// il modulo invia a un indirizzo finto, intercettato qui: nessuna richiesta arriva a sistemi veri
await page.route('https://form.mock/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
await page.addInitScript((mobile) => {
  window.__CAPTURE__ = true;
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = 'cap-pointer';
    c.style.cssText = mobile
      ? 'position:fixed;z-index:2147483647;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(241,243,234,.35);box-shadow:0 0 0 2px rgba(16,38,27,.35);pointer-events:none;opacity:0'
      : 'position:fixed;z-index:2147483647;left:0;top:0;width:20px;height:28px;pointer-events:none;opacity:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))';
    if (!mobile)
      c.innerHTML = '<svg viewBox="0 0 20 28" width="20" height="28"><path d="M2 2v20l5.2-5 3.6 8.2 3.4-1.5-3.5-8H17z" fill="#fff" stroke="#10261b" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    window.__pointer = (x, y, o) => {
      c.style.transform = `translate(${x}px, ${y}px)`;
      c.style.opacity = String(o);
    };
  });
}, mobile);
await page.clock.install();
await page.goto(`${base}?lang=it`);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Animation.enable');
let rate = 0.12;
await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });

// avvio: si fa girare il tempo finché il 3D è pronto (fotogrammi non catturati: solo la preparazione)
for (let i = 0; i < 600; i++) {
  if (await page.evaluate(() => window.__DEPLOIABLE__?.ready === true && !!window.__NARR__)) break;
  await page.clock.runFor(50);
  await page.waitForTimeout(50);
}

let frame = 0;
let ptr = { x: mobile ? 195 : 960, y: mobile ? 600 : 700, o: 0 };
const walls = [];
let lastWall = Date.now();
async function shot() {
  await page.clock.runFor(1000 / FPS);
  await page.evaluate(([x, y, o]) => window.__pointer?.(x, y, o), [ptr.x, ptr.y, ptr.o]);
  await page.screenshot({ path: `${dir}/${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  frame++;
  // le animazioni CSS vanno al ritmo del video: 1/30 s per fotogramma, qualunque sia il tempo reale
  const now = Date.now();
  walls.push(now - lastWall);
  lastWall = now;
  if (walls.length > 12) walls.shift();
  if (frame % 6 === 0) {
    const avg = walls.reduce((a, b) => a + b, 0) / walls.length;
    const r = Math.max(0.02, Math.min(1, 1000 / FPS / avg));
    if (Math.abs(r - rate) / rate > 0.1) {
      rate = r;
      await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
    }
  }
  if (frame % 150 === 0) console.log(`${kind}: ${frame} fotogrammi (${(frame / FPS).toFixed(0)} s)`);
}
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const scrollY = () => page.evaluate(() => scrollY);
const scrollTo = (y) => page.evaluate((y) => scrollTo(0, y), y);
const center = (sel, i = 0) =>
  page.evaluate(
    ([sel, i]) => {
      const r = document.querySelectorAll(sel)[i].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    [sel, i],
  );
/** fermo, per s secondi */
async function hold(s) {
  for (let i = 0; i < Math.round(s * FPS); i++) await shot();
}
/** scorrimento da dove si è a y, in s secondi (con il cursore che si muove piano, se c'è) */
async function scroll(y, s, curve = ease, drift = null) {
  const y0 = await scrollY();
  const n = Math.max(1, Math.round(s * FPS));
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    await scrollTo(lerp(y0, y, curve(k)));
    if (drift) {
      const d = drift(k);
      ptr = { ...ptr, ...d };
      if (!mobile) await page.mouse.move(ptr.x, ptr.y);
    }
    await shot();
  }
}
/** il cursore va verso un punto (desktop), in s secondi */
async function move(x, y, s) {
  const p0 = { ...ptr };
  const n = Math.max(1, Math.round(s * FPS));
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    ptr = { x: lerp(p0.x, x, k), y: lerp(p0.y, y, k), o: Math.min(1, p0.o + i / 8) };
    await page.mouse.move(ptr.x, ptr.y);
    await shot();
  }
}
/** clic (desktop) o tocco (telefono) al centro di un elemento */
async function press(sel, i = 0) {
  const c = await center(sel, i);
  if (mobile) {
    ptr = { x: c.x, y: c.y, o: 0.9 };
    await page.touchscreen.tap(c.x, c.y);
    for (let k = 0; k < 8; k++) {
      ptr.o = 0.9 * (1 - k / 8);
      await shot();
    }
    ptr.o = 0;
  } else {
    await move(c.x, c.y, 0.7);
    await page.mouse.down();
    await shot();
    await page.mouse.up();
    await shot();
  }
}
async function type(sel, text) {
  await page.focus(sel);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await shot();
    await shot();
  }
}
const yFor = (i, c) => page.evaluate(([i, c]) => window.__NARR__.yFor(i, c), [i, c]);
const top = (id) => page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id);
const maxY = () => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

/** il racconto: per ogni capitolo, il testo entra e la scena cambia, poi una pausa di lettura */
async function narrative(speed = 1) {
  const two = [false, false, true, true, false, false];
  for (let i = 0; i < 6; i++) {
    const sway = (k) => (mobile ? null : { x: 1180 + Math.sin((i + k) * 2.1) * 260, y: 560 + Math.cos((i + k) * 1.7) * 140, o: 1 });
    if (two[i]) {
      await scroll(await yFor(i, 0.36), 2.4 * speed, ease, sway);
      await scroll(await yFor(i, 0.42), 1.0 * speed, (k) => k, sway);
      await scroll(await yFor(i, 0.86), 2.6 * speed, ease, sway);
      await scroll(await yFor(i, 0.93), 1.4 * speed, (k) => k, sway);
    } else {
      await scroll(await yFor(i, i === 0 ? 0.5 : 0.56), 2.8 * speed, ease, sway);
      await scroll(await yFor(i, i === 0 ? 0.6 : 0.66), 1.8 * speed, (k) => k, sway);
    }
  }
}

if (!mobile) {
  // ---------------------------------------------------------------- desktop, 1920 × 1080
  await hold(8.4); // intro: il logo 3D, il passaggio al Lime, la frase che si scrive, i pulsanti
  await move(960, 700, 0.2);
  const cta = await center('.hero-ctas .btn--solid');
  await move(cta.x, cta.y, 1.2); // passaggio sul pulsante principale
  await hold(1.0);
  await press('.hero-ctas .btn--line'); // "Scopri il nostro approccio": porta al racconto
  await hold(1.6);
  await narrative(1);
  // cosa realizziamo: passaggio su tre forme
  await scroll(await top('build'), 1.6);
  await hold(1.2);
  for (const i of [0, 3, 1]) {
    const c = await center('.cap', i);
    await move(c.x, c.y - 40, 0.8);
    await hold(0.9);
  }
  await scroll((await top('build')) + 520, 1.6);
  await hold(1.0);
  // metodo
  await scroll(await top('method'), 1.6);
  await hold(2.2);
  const s2 = await center('.step', 1);
  await move(s2.x, s2.y - 80, 0.8);
  await hold(0.8);
  // esempi
  await scroll(await top('cases'), 1.6);
  await hold(1.4);
  const c3 = await center('.case', 2);
  await move(c3.x, c3.y - 60, 0.9);
  await hold(1.2);
  // contatto: la strada, il modulo, l'invio (all'indirizzo finto)
  await scroll(Math.min(await top('contact'), await maxY()), 1.6);
  await hold(0.8);
  await press('.path', 1);
  await hold(0.5);
  await page.evaluate(() => (document.querySelector('.signup').dataset.endpoint = 'https://form.mock/exec'));
  await press('#signup-email');
  await type('#signup-email', 'giulia@azienda.it');
  await press('#signup-company');
  await type('#signup-company', 'Azienda Spa');
  await press('.consent-box');
  await hold(0.3);
  await press('.signup button[type=submit]');
  await hold(2.2);
  await scroll(await maxY(), 1.4);
  await move(1700, 980, 0.8);
  await hold(1.6);
} else {
  // ---------------------------------------------------------------- telefono, 390 × 844
  await hold(8.4);
  await press('.nav-toggle'); // menu
  await hold(1.2);
  await press('.nav-list a', 0); // "Approccio": porta al racconto
  await hold(1.8);
  await narrative(0.72);
  // cambio di lingua, poi il resto in inglese
  await scroll(await top('build'), 1.4);
  await hold(0.6);
  await press('[data-lang="en"]');
  await hold(1.4);
  await scroll((await top('build')) + 760, 2.6);
  await scroll((await top('build')) + 1500, 2.4);
  await scroll(await top('method'), 1.4);
  await hold(1.0);
  await scroll((await top('method')) + 700, 2.0);
  await scroll(await top('cases'), 1.4);
  await hold(1.0);
  await scroll((await top('cases')) + 900, 2.6);
  await scroll(await top('contact'), 1.6);
  await hold(0.8);
  await scroll((await top('contact')) + 380, 1.2);
  await press('.path', 1);
  await page.evaluate(() => (document.querySelector('.signup').dataset.endpoint = 'https://form.mock/exec'));
  await press('#signup-email');
  await type('#signup-email', 'giulia@company.com');
  await press('#signup-company');
  await type('#signup-company', 'Company Ltd');
  await page.evaluate(() => document.activeElement.blur());
  await press('.consent-box');
  await press('.signup button[type=submit]');
  await hold(2.0);
  await scroll(await maxY(), 1.2);
  await hold(1.4);
}

console.log(`${kind}: ${frame} fotogrammi, ${(frame / FPS).toFixed(1)} s; errori: ${errors.length ? errors.join(' | ') : 'nessuno'}`);
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%05d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4]);
console.log(`video: ${outMp4}`);
