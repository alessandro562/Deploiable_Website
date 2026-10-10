// Le sezioni dopo l'hero: header sopra le fasce, menu su telefono, scelta della strada nel modulo, ancore,
// entrata dei blocchi. Nessun 3D: le figure sono immagini statiche (public/assets/mockups).
// Con prefers-reduced-motion tutto è fermo e già visibile.

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  interestLinks();
  journeys(opts.reduced);
  reveals(opts.reduced);
  if (!opts.reduced) cards3d();
}

/** Sotto la sezione scura l'header è chiaro, sotto quella chiara (Mist) è Forest, sotto il contatto torna Forest. */
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
    root.classList.toggle('is-light-under', hit === 'light');
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
    if (window.__CAPTURE__) jsScroll(target.getBoundingClientRect().top + scrollY);
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    // il fuoco segue il link (per tastiera e lettori di schermo), senza un secondo salto
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

/** Scorrimento in JavaScript (solo per la registrazione fotogramma per fotogramma, dove il tempo è simulato e
 *  lo scorrimento morbido nativo andrebbe troppo veloce). */
function jsScroll(to: number) {
  const from = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  to = Math.min(max, Math.max(0, to));
  const dur = Math.min(1400, 500 + Math.abs(to - from) * 0.12);
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    scrollTo(0, from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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

/** "Cosa facciamo": si vede un percorso alla volta, scelto dalla sua card. Dentro il percorso si scorrono le tre
 *  fasi (1·2·3, avanti e indietro). Senza JavaScript restano visibili tutti i percorsi e tutte le fasi. */
function journeys(reduced: boolean) {
  const root = document.documentElement;
  const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.line-toggle[data-journey]'));
  const empty = document.querySelector<HTMLElement>('.stage-empty');
  if (!toggles.length) return;
  root.classList.add('js-steps');
  const panel = (id: string) => document.getElementById(`journey-${id}`);
  const scrollStage = (el: HTMLElement) => {
    const top = el.getBoundingClientRect().top;
    if (top < innerHeight * 0.6) return;
    const y = top + scrollY - 80;
    if (window.__CAPTURE__) jsScroll(y);
    else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  const setPhase = (id: string, n: number) => {
    const p = panel(id);
    if (!p) return;
    const tappe = Array.from(p.querySelectorAll<HTMLElement>('.tappa'));
    const last = tappe.length;
    const k = Math.min(last, Math.max(1, n));
    tappe.forEach((t, i) => t.classList.toggle('is-current', i === k - 1));
    p.querySelectorAll<HTMLButtonElement>('.step-btn').forEach((b) => {
      const on = Number(b.dataset.step) === k;
      if (on) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    const prev = p.querySelector<HTMLButtonElement>('.step-prev');
    const next = p.querySelector<HTMLButtonElement>('.step-next');
    if (prev) prev.disabled = k === 1;
    if (next) next.disabled = k === last;
  };
  const open = (id: string) => {
    for (const b of toggles) {
      const on = b.dataset.journey === id;
      const p = panel(b.dataset.journey!);
      b.setAttribute('aria-expanded', String(on));
      b.closest('.line-col')?.classList.toggle('is-open', on);
      if (p) {
        p.hidden = !on;
        p.classList.toggle('is-entering', on && !reduced);
      }
    }
    if (empty) empty.hidden = true;
    const p = panel(id);
    if (p) scrollStage(p);
  };
  // senza un percorso aperto il vano mostra solo il messaggio, come l'inizio della pagina
  if (empty) empty.hidden = false;
  for (const b of toggles) {
    const id = b.dataset.journey!;
    const p = panel(id);
    if (p) p.hidden = true;
    b.addEventListener('click', () => open(id));
    setPhase(id, 1);
  }
  document.querySelectorAll<HTMLButtonElement>('.journey .step-btn').forEach((b) => {
    b.addEventListener('click', () => setPhase(b.closest<HTMLElement>('.journey')!.id.replace('journey-', ''), Number(b.dataset.step)));
  });
  // tasti freccia tra i passi (sinistra e destra, Home e Fine): come in un controllo a schede
  document.querySelectorAll<HTMLElement>('.journey .steps').forEach((nav) => {
    nav.addEventListener('keydown', (e) => {
      const btns = Array.from(nav.querySelectorAll<HTMLButtonElement>('.step-btn'));
      const cur = btns.findIndex((b) => b.getAttribute('aria-current') === 'step');
      const k = e.key;
      let to = -1;
      if (k === 'ArrowRight') to = Math.min(btns.length - 1, cur + 1);
      else if (k === 'ArrowLeft') to = Math.max(0, cur - 1);
      else if (k === 'Home') to = 0;
      else if (k === 'End') to = btns.length - 1;
      if (to < 0 || to === cur) return;
      e.preventDefault();
      const j = nav.closest<HTMLElement>('.journey')!;
      setPhase(j.id.replace('journey-', ''), to + 1);
      btns[to].focus();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('.journey .step-prev, .journey .step-next').forEach((b) => {
    b.addEventListener('click', () => {
      const j = b.closest<HTMLElement>('.journey')!;
      const cur = j.querySelector<HTMLElement>('.tappa.is-current');
      const n = Number(cur?.dataset.phase ?? 1) + Number(b.dataset.dir);
      setPhase(j.id.replace('journey-', ''), n);
    });
  });
}

/** Titoli e blocchi entrano salendo di poco quando arrivano sullo schermo (una volta sola). */
function reveals(reduced: boolean) {
  if (reduced || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const els = Array.from(document.querySelectorAll<HTMLElement>('.sec-head, .line-col, .tappa, .contact-head, .signup-box'));
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

/** Schemi come card 3D: l'inclinazione segue lo scorrimento (--p: 1 al centro dello schermo) e, su desktop, il
 *  puntatore (--mx, --my fra -1 e 1). Si aggiorna solo la card della fase in vista. */
function cards3d() {
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight;
    document.querySelectorAll<HTMLElement>('.tappa.is-current .tappa-fig').forEach((fig) => {
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const d = Math.abs(r.top + r.height / 2 - vh / 2) / (vh * 0.65);
      fig.style.setProperty('--p', Math.max(0, 1 - d).toFixed(3));
    });
  };
  const queue = () => (raf ||= requestAnimationFrame(update));
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  document.addEventListener('click', () => setTimeout(queue, 50));
  if (matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
      const fig = (e.target as HTMLElement).closest?.<HTMLElement>('.tappa-fig');
      document.querySelectorAll<HTMLElement>('.tappa-fig').forEach((f) => {
        if (f !== fig) f.style.removeProperty('--mx'), f.style.removeProperty('--my');
      });
      if (!fig) return;
      const r = fig.getBoundingClientRect();
      fig.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      fig.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  }
  queue();
}
