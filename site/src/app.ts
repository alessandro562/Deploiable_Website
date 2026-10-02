import { gsap } from 'gsap';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { QUALITY } from './config/quality';
import { DURATION, LABELS, at } from './config/scenes';
import type { Capabilities } from './core/capabilities';
import { createState, stateAt } from './core/choreography';
import { Engine } from './gl/engine';
import { CameraRig } from './gl/cameraRig';
import { SymbolRig } from './gl/symbol/SymbolRig';
import { ParticleField } from './gl/particles/ParticleField';
import { Overlay } from './ui/overlay';
import { Fragments } from './ui/fragments';
import { Chrome } from './ui/chrome';
import { Finale } from './ui/finale';

export async function start(caps: Capabilities) {
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);
  const testMode = q.has('__test');
  root.classList.add('is-webgl');
  if (caps.finePointer) root.classList.add('has-fine-pointer');

  const hooks: DeploiableHooks = { ready: false, mode: 'webgl', tier: caps.tier, errors: [], duration: DURATION };
  window.__DEPLOIABLE__ = hooks;
  window.addEventListener('error', (e) => hooks.errors.push(String(e.message)));

  const quality = { ...QUALITY[caps.tier] };
  const forcedCount = Number(q.get('particles'));
  if (forcedCount > 0) quality.particles = forcedCount;
  const canvas = document.querySelector<HTMLCanvasElement>('canvas.gl')!;
  const engine = new Engine(canvas, quality, testMode);
  const rig = new SymbolRig();
  const particles = new ParticleField(quality.particles);
  engine.scene.add(rig.group, particles.mesh);
  const camRig = new CameraRig(engine.camera);

  const film = document.getElementById('film')!;
  const chrome = new Chrome();
  const fragments = new Fragments(film.querySelector('.fragments'));
  const finale = new Finale();

  // ---- Loader (conta lavoro reale: font, warm-up shader, primo frame) ----
  const loaderEl = document.querySelector<HTMLElement>('.loader');
  const countEl = document.querySelector<HTMLElement>('[data-loader-count]');
  const loaderLines = Array.from(document.querySelectorAll<HTMLElement>('.loader__lines i'));
  const shown = { v: 0 };
  const setLoader = (target: number) =>
    gsap.to(shown, {
      v: target,
      duration: 0.5,
      ease: 'power1.out',
      onUpdate: () => {
        const v = shown.v;
        if (countEl) countEl.textContent = String(Math.round(v)).padStart(3, '0');
        loaderLines.forEach((l, i) => l.style.setProperty('--p', String(Math.min(1, Math.max(0, (v / 100) * 3 - i)))));
      },
    });
  const t0 = performance.now();
  setLoader(12);
  await document.fonts.ready;
  setLoader(35);
  const overlay = new Overlay(film);

  // ---- Scroll ----
  const lenis = new Lenis({ autoRaf: false, lerp: 0.085, wheelMultiplier: 0.9, syncTouch: false });
  document.querySelector('.skip')?.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(lenis.limit, { duration: 2.4 });
    document.getElementById('finale')?.focus({ preventScroll: true });
  });
  document.querySelector('.topbar__logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { duration: 2 });
  });

  // ---- Puntatore ----
  const pointer = new Vector2();
  const pointerWorld = new Vector3(999, 999, 999);
  const ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  let pointerActive = false;
  window.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerActive = true;
    chrome.moveCursor(e.clientX, e.clientY);
  });

  // ---- Intro (a tempo, separata dallo scroll) ----
  const intro = { l0: 0, l1: 0, l2: 0, copy: 0 };
  const introTl = gsap.timeline({ paused: true });
  introTl
    .to(intro, { l0: 1, duration: 1.3, ease: 'power2.out' }, 0)
    .to(intro, { l1: 1, duration: 1.3, ease: 'power2.out' }, 0.12)
    .to(intro, { l2: 1, duration: 1.3, ease: 'power2.out' }, 0.24)
    .to(intro, { copy: 1, duration: 1.6, ease: 'none' }, 0.9);

  // ---- Frame ----
  const state = createState();
  const lineIn = [0, 0, 0];
  let frozen: number | null = null;
  let clock = 0;
  let paused = false;
  let ema = 16;
  let slowFrames = 0;
  let downgrades = 0;

  const frame = (dtMs = 16.7) => {
    clock += dtMs / 1000;
    const time = frozen ?? clock;
    const limit = Math.max(1, lenis.limit);
    const p = Math.min(1, Math.max(0, lenis.scroll / limit));
    const t = p * DURATION;
    stateAt(t, state);

    camRig.update(state, pointer, time);
    rig.update(state, engine.camera, time);

    if (pointerActive && state.pPointer > 0) {
      ray.setFromCamera(pointer, engine.camera);
      ray.ray.intersectPlane(plane, pointerWorld) ?? pointerWorld.set(999, 999, 999);
    }
    lineIn[0] = intro.l0;
    lineIn[1] = intro.l1;
    lineIn[2] = intro.l2;
    particles.update(state, time, lineIn, rig.group.matrixWorld, pointerWorld, engine.res, engine.dpr);

    overlay.update(t, intro.copy);
    fragments.update(t, time, engine.camera, window.innerWidth, window.innerHeight);
    chrome.update(t, state.flood);
    finale.update(t, state.flood);

    const hideCanvas = state.flood >= 0.999;
    if (hideCanvas !== paused) {
      paused = hideCanvas;
      canvas.style.visibility = paused ? 'hidden' : 'visible';
    }
    if (!paused) engine.render(state.bloom, state.ca, dtMs / 1000);
  };

  const governor = (dtMs: number) => {
    if (testMode || document.hidden) return;
    ema = ema * 0.94 + dtMs * 0.06;
    slowFrames = ema > 24 ? slowFrames + 1 : 0;
    if (slowFrames > 90 && downgrades < 3) {
      slowFrames = 0;
      downgrades++;
      if (engine.dpr > 1) engine.setDpr(Math.max(1, engine.dpr - 0.35));
      else if (particles.count > 9000) particles.setCount(particles.count * 0.65);
      else engine.disableCA();
    }
  };

  // ---- Warm-up ----
  stateAt(0, state);
  await engine.warmup();
  setLoader(80);
  frame(0);
  setLoader(100);
  const wait = Math.max(0, 900 - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, wait + 450));
  loaderEl?.classList.add('is-done');

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    lenis.raf(time * 1000);
    if (frozen === null) governor(deltaMs);
    frame(deltaMs);
  });
  window.addEventListener('resize', () => engine.resize());
  document.addEventListener('visibilitychange', () => (document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake()));

  if (q.has('noIntro') || testMode) introTl.progress(1);
  else introTl.play(0.0);

  // ---- Hook per i test ----
  hooks.seek = (pos) => {
    const t = typeof pos === 'string' ? at(pos) : pos * DURATION;
    const y = (Math.min(DURATION, Math.max(0, t)) / DURATION) * lenis.limit;
    window.scrollTo(0, y);
    lenis.scrollTo(y, { immediate: true, force: true });
    if (t >= finale.trigger) finale.finish();
    frame(0);
  };
  hooks.freezeTime = (tt) => {
    frozen = tt;
  };
  hooks.skipIntro = () => introTl.progress(1);
  hooks.state = () => ({ ...state, labels: LABELS, particles: particles.count, dpr: engine.dpr });
  hooks.ready = true;
}
