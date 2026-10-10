// Le sezioni dopo l'hero: header sopra le fasce, menu su telefono, scelta della strada nel modulo, ancore,
// entrata dei blocchi. Nessun 3D: le figure sono immagini statiche (public/assets/mockups).
// Con prefers-reduced-motion tutto è fermo e già visibile.

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  interestLinks();
  reveals(opts.reduced);
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

/** Titoli e blocchi entrano salendo di poco quando arrivano sullo schermo (una volta sola). */
function reveals(reduced: boolean) {
  if (reduced || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const els = Array.from(document.querySelectorAll<HTMLElement>('.sec-head, .line-col, .step, .contact-head, .signup-box'));
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
