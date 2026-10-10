// Le sezioni dopo l'hero: header sopra le fasce, menu su telefono, scelta della strada nel modulo, ancore,
// entrata dei blocchi. Nessun 3D: le figure sono immagini statiche (public/assets/mockups).
// Con prefers-reduced-motion tutto è fermo e già visibile.

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  interestLinks();
  decks(opts.reduced);
  band();
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

/** "Cosa facciamo": due mazzi di card, uno per modello, che girano in loop. La card in cima si trascina via (o si
 *  preme Avanti) e torna in fondo al mazzo: il mazzo non si svuota mai. Senza JavaScript le card restano in colonna. */
function decks(reduced: boolean) {
  const root = document.querySelector<HTMLElement>('[data-decks]');
  if (!root) return;
  root.classList.add('is-live');
  const VISIBLE = 3; // quante card si vedono impilate
  type Deck = { el: HTMLElement; order: HTMLElement[] };
  const decks: Deck[] = Array.from(root.querySelectorAll<HTMLElement>('.deck')).map((el) => ({
    el,
    order: Array.from(el.querySelectorAll<HTMLElement>('.dcard')),
  }));
  const layout = (d: Deck) =>
    d.order.forEach((c, i) => {
      c.style.setProperty('--y', `${i * 18}px`);
      c.style.setProperty('--s', `${Math.max(0.8, 1 - i * 0.05)}`);
      c.style.zIndex = String(20 - i);
      c.classList.toggle('is-back', i > 0);
      c.classList.toggle('is-hidden', i >= VISIBLE);
    });
  decks.forEach(layout);

  /** la card esce dal lato indicato, poi torna in fondo al mazzo senza sparire */
  const cycle = (d: Deck, dir: number) => {
    const card = d.order[0];
    if (!card || card.classList.contains('is-leaving')) return;
    card.classList.add('is-leaving');
    card.style.setProperty('--x', `${dir * (d.el.offsetWidth + 200)}px`);
    card.style.setProperty('--r', `${dir * 10}deg`);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      // la card torna in fondo ferma, senza transizione: il movimento visibile è quello delle altre card
      card.style.transition = 'none';
      card.classList.remove('is-leaving');
      card.style.setProperty('--x', '0px');
      card.style.setProperty('--r', '0deg');
      d.order.push(d.order.shift()!);
      layout(d);
      void card.offsetWidth; // applica la posizione prima di riattivare la transizione
      card.style.transition = '';
    };
    card.addEventListener('transitionend', finish, { once: true });
    if (reduced) finish();
    else setTimeout(finish, 800); // rete di sicurezza se la transizione non arriva
  };

  decks.forEach((d) =>
    d.order.forEach((card) => {
      let startX = 0;
      let dragging = false;
      card.addEventListener('pointerdown', (e) => {
        if (card !== d.order[0] || card.classList.contains('is-leaving')) return;
        dragging = true;
        startX = e.clientX;
        card.classList.add('is-drag');
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        card.style.setProperty('--x', `${dx}px`);
        card.style.setProperty('--r', `${dx * 0.05}deg`);
      });
      const release = (dx: number) => {
        dragging = false;
        card.classList.remove('is-drag');
        if (Math.abs(dx) > Math.min(120, d.el.offsetWidth * 0.22)) {
          cycle(d, Math.sign(dx));
        } else {
          card.style.setProperty('--x', '0px');
          card.style.setProperty('--r', '0deg');
        }
      };
      card.addEventListener('pointerup', (e) => dragging && release(e.clientX - startX));
      card.addEventListener('pointercancel', () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('is-drag');
        card.style.setProperty('--x', '0px');
        card.style.setProperty('--r', '0deg');
      });
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = decks.find((x) => x.el.contains(btn));
      if (d) cycle(d, 1);
    });
  });
}

/** La fascia verde: un clic fa scattare il logo con un giro veloce. */
function band() {
  const el = document.querySelector<HTMLElement>('[data-band]');
  if (!el) return;
  el.addEventListener('click', () => {
    el.classList.remove('is-spin');
    void el.offsetWidth; // riavvia l'animazione se si clicca di nuovo
    el.classList.add('is-spin');
  });
  el.addEventListener('animationend', (e) => {
    if (e.animationName === 'band-spin') el.classList.remove('is-spin');
  });
}
