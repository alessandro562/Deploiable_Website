// Le sezioni dopo l'hero: header sopra le fasce scure, menu su telefono, scelta della strada nel modulo,
// frammenti animati del sistema (src/system/minis.ts), testi che entrano quando arrivano sullo schermo.
// Funziona con e senza 3D; con prefers-reduced-motion tutto è fermo e già visibile.
import { Scene } from './system/engine';
import { frame, type CamKey } from './system/camera';
import { MINIS } from './system/minis';
import { lang, onLangChange } from './i18n';

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  interestLinks();
  flows();
  reveals(opts.reduced);
  minis(opts.reduced);
}

/** Sopra le sezioni scure l'header passa al vetro scuro, sopra il contatto torna chiaro. */
function headerSurface() {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>('.top');
  const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-surface]'));
  let spans: { top: number; bottom: number; kind: string }[] = [];
  const measure = () => {
    const y = scrollY;
    spans = secs.map((s) => {
      const r = s.getBoundingClientRect();
      return { top: r.top + y, bottom: r.bottom + y, kind: s.dataset.surface ?? '' };
    });
    update();
  };
  let under = '';
  const update = () => {
    const line = scrollY + (header?.offsetHeight ?? 60) / 2;
    const hit = spans.find((s) => line >= s.top && line < s.bottom)?.kind ?? '';
    if (hit === under) return;
    under = hit;
    root.classList.toggle('is-dark-under', hit === 'dark');
    root.classList.toggle('is-lime-under', hit === 'lime');
    root.dataset.under = hit;
  };
  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true },
  );
  new ResizeObserver(measure).observe(document.body);
  measure();
}

/** Su telefono la navigazione è dietro il pulsante Menu: si chiude con Esc, scegliendo una voce o toccando fuori. */
function navMenu() {
  const root = document.documentElement;
  const btn = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const list = document.getElementById('nav-list');
  if (!btn || !list) return;
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('nav-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) set(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) {
      set(false);
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (root.classList.contains('nav-open') && !(e.target as HTMLElement).closest('.nav')) set(false);
  });
}

/** Link interni: scorrimento morbido (istantaneo con il movimento ridotto), il fuoco passa alla sezione. */
function anchors(reduced: boolean) {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute('href')!.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    // il fuoco segue il link (per tastiera e lettori di schermo), senza un secondo salto
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

/** "Parliamo di un tuo processo / prodotto": la strada è già scelta nel modulo. */
function interestLinks() {
  document.querySelectorAll<HTMLAnchorElement>('[data-interest]').forEach((a) => {
    a.addEventListener('click', () => {
      const r = document.querySelector<HTMLInputElement>(`input[name="interest"][value="${a.dataset.interest}"]`);
      if (r) r.checked = true;
    });
  });
}

/** Le catene degli esempi ("A + B → C") diventano passaggi distinti; il testo per i lettori di schermo resta. */
function flows() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-flow]'));
  const build = () => {
    for (const el of els) {
      const text = el.textContent ?? '';
      const frag = document.createDocumentFragment();
      // per i lettori di schermo la catena resta una frase; i passaggi disegnati sono solo per gli occhi
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      frag.append(sr);
      text.split('→').forEach((step, i, all) => {
        step.split('+').forEach((part, j, parts) => {
          const s = document.createElement('span');
          s.className = i === all.length - 1 ? 'flow-step flow-step--out' : 'flow-step';
          s.textContent = part.trim();
          s.setAttribute('aria-hidden', 'true');
          frag.append(s);
          if (j < parts.length - 1) frag.append(sym('+', 'flow-plus'));
        });
        if (i < all.length - 1) frag.append(sym('→', 'flow-arrow'));
      });
      el.replaceChildren(frag);
    }
  };
  const sym = (t: string, cls: string) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = t;
    s.setAttribute('aria-hidden', 'true');
    return s;
  };
  build();
  onLangChange(build);
}

/** Titoli e blocchi entrano salendo di poco quando arrivano sullo schermo (una volta sola). */
function reveals(reduced: boolean) {
  if (reduced || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const els = Array.from(document.querySelectorAll<HTMLElement>('.sec-head, .cap, .step, .case, .contact-head, .signup-box'));
  root.classList.add('rv-on');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  els.forEach((el) => {
    el.classList.add('rv');
    io.observe(el);
  });
}

interface MiniState {
  box: HTMLElement;
  host: HTMLElement;
  svg: SVGSVGElement;
  scene: Scene;
  cam: CamKey;
  v: number;
  goal: number;
  seen: boolean;
  hover: boolean;
  center: boolean;
  visible: boolean;
}

/** I frammenti: entrano quando arrivano sullo schermo, si attivano al passaggio del mouse (o al centro dello
 *  schermo su telefono). Disegnati solo quando sono visibili. */
function minis(reduced: boolean) {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('[data-mini]'));
  const all: MiniState[] = [];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  for (const box of boxes) {
    const make = MINIS[box.dataset.mini ?? ''];
    if (!make) continue;
    const m = make();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.appendChild(svg);
    const scene = new Scene(svg, m.spec);
    scene.setLang(lang());
    const host = box.closest<HTMLElement>('.cap, .step, .case') ?? box;
    const st: MiniState = { box, host, svg, scene, cam: m.cam, v: reduced ? 1 : 0, goal: reduced ? 1 : 0, seen: reduced, hover: false, center: false, visible: false };
    all.push(st);
    if (!reduced && fine) {
      host.addEventListener('pointerenter', () => ((st.hover = true), wake()));
      host.addEventListener('pointerleave', () => ((st.hover = false), wake()));
    }
  }
  const draw = (s: MiniState, time: number) => {
    const w = s.box.clientWidth;
    const h = s.box.clientHeight;
    if (!w || !h) return;
    s.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    s.scene.set(s.v);
    s.scene.draw(frame(s.cam, { x: 6, y: 6, w: w - 12, h: h - 12 }), time);
  };
  onLangChange((l) => {
    for (const s of all) {
      s.scene.setLang(l);
      draw(s, time);
    }
  });
  let time = 0.6;
  for (const s of all) draw(s, time);
  new ResizeObserver(() => all.forEach((s) => draw(s, time))).observe(document.body);
  if (reduced) return;

  // entrata e visibilità
  const vis = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const s = all.find((x) => x.box === e.target);
        if (!s) continue;
        s.visible = e.isIntersecting;
        if (e.isIntersecting && e.intersectionRatio > 0.3) s.seen = true;
      }
      wake();
    },
    { threshold: [0, 0.3, 0.6] },
  );
  // su telefono (niente passaggio del mouse) il frammento al centro dello schermo è attivo
  const mid = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const s = all.find((x) => x.box === e.target);
        if (s) s.center = e.isIntersecting;
      }
      wake();
    },
    { rootMargin: '-38% 0px -38% 0px' },
  );
  for (const s of all) {
    vis.observe(s.box);
    if (!fine) mid.observe(s.box);
  }

  let running = false;
  let last = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    time += dt;
    let any = false;
    for (const s of all) {
      if (!s.visible) continue;
      any = true;
      s.goal = !s.seen ? 0 : s.hover || s.center ? 2 : 1;
      const before = s.v;
      // 0 → 1 in circa 0,8 s, 1 ↔ 2 in circa 0,5 s
      const speed = s.v < 1 ? 1.25 : 2;
      s.v = s.v < s.goal ? Math.min(s.goal, s.v + dt * speed) : Math.max(s.goal, s.v - dt * speed);
      if (s.v !== before) draw(s, time);
      else s.scene.tick(time);
    }
    if (any) requestAnimationFrame(loop);
    else running = false;
  };
  function wake() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }
}
