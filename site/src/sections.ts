// Le sezioni dopo l'hero: header sopra le fasce, menu su telefono, scelta della strada nel modulo, ancore,
// entrata dei blocchi. Nessun 3D: le figure sono immagini statiche (public/assets/mockups).
// Con prefers-reduced-motion tutto è fermo e già visibile.

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  interestLinks();
  decks(opts.reduced);
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

/** "Cosa facciamo": due mazzi di card, uno per modello. Si trascina via la card in cima (o si preme Avanti): prima il
 *  titolo, poi chi è il modello. Quando i due mazzi sono finiti compaiono i tre passi, con quelli dei due modelli.
 *  Senza JavaScript restano visibili tutte le card, in colonna. */
function decks(reduced: boolean) {
  const root = document.querySelector<HTMLElement>('[data-decks]');
  const done = document.querySelector<HTMLElement>('.steps-cards');
  const again = document.querySelector<HTMLButtonElement>('[data-again]');
  if (!root || !done || !again) return;
  root.classList.add('is-live');
  const decks = Array.from(root.querySelectorAll<HTMLElement>('.deck')).map((el) => ({
    el,
    cards: Array.from(el.querySelectorAll<HTMLElement>('.dcard')),
  }));
  const left = (d: { cards: HTMLElement[] }) => d.cards.filter((c) => !c.classList.contains('is-gone'));
  const layout = (d: { el: HTMLElement; cards: HTMLElement[] }) => {
    d.el.classList.toggle('is-empty', left(d).length === 0);
    left(d).forEach((c, i) => {
      c.style.setProperty('--y', i ? '18px' : '0px');
      c.style.setProperty('--s', i ? '0.94' : '1');
      c.style.zIndex = String(10 - i);
      c.classList.toggle('is-back', i > 0);
    });
  };
  decks.forEach(layout);
  const check = () => {
    if (!decks.every((d) => left(d).length === 0)) return;
    root.hidden = true;
    done.hidden = false;
    again.hidden = false;
  };
  const dismiss = (card: HTMLElement, dir: number) => {
    const d = decks.find((x) => x.cards.includes(card));
    if (!d || card.classList.contains('is-leaving')) return;
    card.classList.add('is-leaving');
    card.style.setProperty('--x', `${dir * (d.el.offsetWidth + 160)}px`);
    card.style.setProperty('--r', `${dir * 12}deg`);
    const finish = () => {
      if (card.classList.contains('is-gone')) return;
      card.classList.add('is-gone');
      layout(d);
      check();
    };
    card.addEventListener('transitionend', finish, { once: true });
    if (reduced) finish();
    else setTimeout(finish, 800); // rete di sicurezza se la transizione non arriva
  };
  const snap = (card: HTMLElement) => {
    card.style.setProperty('--x', '0px');
    card.style.setProperty('--r', '0deg');
  };
  decks.forEach((d) =>
    d.cards.forEach((card) => {
      let startX = 0;
      let dragging = false;
      card.addEventListener('pointerdown', (e) => {
        if (card !== left(d)[0] || card.classList.contains('is-leaving')) return;
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
      const end = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('is-drag');
        const dx = e.clientX - startX;
        const limit = Math.min(120, d.el.offsetWidth * 0.22);
        if (Math.abs(dx) > limit) dismiss(card, Math.sign(dx));
        else snap(card);
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('is-drag');
        snap(card);
      });
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = decks.find((x) => x.el.contains(btn));
      const top = d && left(d)[0];
      if (top) dismiss(top, 1);
    });
  });
  again.addEventListener('click', () => {
    decks.forEach((d) =>
      d.cards.forEach((c) => {
        c.classList.remove('is-gone', 'is-leaving');
        c.style.removeProperty('--x');
        c.style.removeProperty('--r');
      }),
    );
    decks.forEach(layout);
    root.hidden = false;
    done.hidden = true;
    again.hidden = true;
  });
}
