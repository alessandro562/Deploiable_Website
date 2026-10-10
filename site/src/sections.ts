// Le sezioni dopo l'hero: header sopra le fasce, menu su telefono, scelta della strada nel modulo, ancore,
// entrata dei blocchi. Nessun 3D: le figure sono immagini statiche (public/assets/mockups).
// Con prefers-reduced-motion tutto è fermo e già visibile.

export function initSections(opts: { reduced: boolean }) {
  headerSurface();
  navMenu();
  anchors(opts.reduced);
  decks(opts.reduced);
  reveals(opts.reduced);
}

/** Sotto la sezione scura l'header è chiaro, sotto quella chiara (Mist) è Forest, sotto il contatto torna Forest. */
function headerSurface() {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>('.top');
  // le sezioni a colore pieno: quelle con data-surface (testi della barra), la storia scura, il footer Lime
  const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-surface], .story, .foot, #hero'));
  let spans: { el: HTMLElement; top: number; bottom: number; surface: string; bar: string; hero: boolean; story: boolean; foot: boolean }[] = [];
  const measure = () => {
    const y = scrollY;
    spans = secs.map((s) => {
      const r = s.getBoundingClientRect();
      return {
        el: s,
        top: r.top + y,
        bottom: r.bottom + y,
        surface: s.dataset.surface ?? '',
        bar: getComputedStyle(s).getPropertyValue('--bar').trim(),
        hero: s.id === 'hero',
        story: s.classList.contains('story'),
        foot: s.classList.contains('foot'),
      };
    });
    update();
  };
  let under = '';
  const update = () => {
    const line = scrollY + (header?.offsetHeight ?? 60) / 2;
    const hit = spans.find((s) => line >= s.top && line < s.bottom);
    // sezione con luce: la barra riporta l'alone della sezione sul suo rettangolo, che si sposta con lo scroll
    const lightSurface = !!hit?.surface && !!header;
    if (lightSurface) {
      const r = hit.el.getBoundingClientRect();
      const cs = getComputedStyle(hit.el);
      header.style.setProperty('--sec-x', `${r.left}px`);
      // se la sezione comincia dentro la barra, l'alone parte dal bordo alto della barra: niente striscia della
      // sezione precedente sopra (lo spostamento del centro è di pochi pixel e dura solo il passaggio)
      const top = Math.min(r.top, 0);
      header.style.setProperty('--sec-y', `${top}px`);
      header.style.setProperty('--sec-w', `${r.width}px`);
      header.style.setProperty('--sec-h', `${r.bottom - top}px`);
      for (const k of ['--lit-hi', '--lit-base', '--lit-x', '--lit-y']) {
        const v = cs.getPropertyValue(k).trim();
        if (v) header.style.setProperty(k, v);
        else header.style.removeProperty(k);
      }
    }
    header?.classList.toggle('on-surface', lightSurface);
    // la barra prende il colore esatto della sezione sotto; sulla hero (nessuna sezione a colore pieno) è trasparente.
    // Sulla storia il colore segue l'onda Lime della chiusura: Forest finché l'header è sopra la parte scura
    // (is-dark-under, da app.ts), Lime dopo.
    const bar = hit?.story ? (root.classList.contains('is-dark-under') ? 'var(--forest)' : 'var(--lime)') : (hit?.bar ?? '');
    const key = hit ? `${hit.surface}|${bar}|${hit.hero}` : '';
    if (key === under) return;
    under = key;
    root.classList.toggle('is-light-under', hit?.surface === 'light');
    root.classList.toggle('is-lime-under', hit?.surface === 'lime');
    root.dataset.under = hit?.surface ?? '';
    // sulla hero la barra ha la luce del canvas (CSS: .on-hero); sulle altre sezioni il colore esatto della sezione
    // dove il fondo è il Lime del canvas (hero, chiusura della storia, footer) la barra ne prende la stessa luce
    const lit = !!hit && (hit.hero || hit.foot || (hit.story && bar === 'var(--lime)'));
    root.classList.toggle('has-bar', !!hit && (hit.hero || !!bar));
    header?.classList.toggle('on-hero', !!hit?.hero);
    header?.classList.toggle('on-lime', lit);
    if (bar && !lit && header) header.style.setProperty('--bar', bar);
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
  // l'onda della storia cambia is-dark-under anche senza scroll (la molla si assesta): la barra la segue
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['class'] });
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
  const header = document.querySelector<HTMLElement>('.top');
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute('href')!.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    // il form sta nella hero: "Prenota una call" riporta all'inizio, con la hero intera e il form sotto la barra.
    // Le altre destinazioni si fermano sotto la barra fissa, non dietro.
    const form = target.querySelector<HTMLElement>('form');
    const inHero = !!target.closest('#hero');
    const to = inHero ? 0 : target.getBoundingClientRect().top + scrollY - (header?.offsetHeight ?? 0);
    if (window.__CAPTURE__) jsScroll(to);
    else scrollTo({ top: Math.max(0, to), behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
    // il fuoco segue il link (per tastiera e lettori di schermo), senza un secondo salto: sul form va al primo campo
    // (con il mouse; sul telefono la tastiera si aprirebbe a metà dello scorrimento), altrove sul contenitore
    const field = form?.querySelector<HTMLInputElement>('input:not([tabindex="-1"]):not([type="hidden"])');
    const fine = matchMedia('(pointer: fine)').matches;
    const focusEl = field && fine && target.closest<HTMLElement>('[data-state]')?.dataset.state !== 'done' ? field : target;
    if (focusEl === target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    focusEl.focus({ preventScroll: true });
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

function reveals(reduced: boolean) {
  if (reduced || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const els = Array.from(document.querySelectorAll<HTMLElement>('.sec-head, .line-col, .tappa'));
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

/** La scritta del marchio nelle card: il logo intero ha il simbolo accanto, qui si ritaglia il solo lettering sul suo
 *  contenuto reale (la posizione del percorso è nel sistema di coordinate del logo). */
function cropWordmarks() {
  document.querySelectorAll<SVGSVGElement>('.dcard-brand').forEach((svg) => {
    const path = svg.querySelector<SVGGraphicsElement>('.logo-lettering');
    if (!path) return;
    const bb = path.getBBox();
    const t = path.transform.baseVal.consolidate()?.matrix;
    const m = t ? new DOMMatrix([t.a, t.b, t.c, t.d, t.e, t.f]) : new DOMMatrix();
    const corners = [
      [bb.x, bb.y],
      [bb.x + bb.width, bb.y],
      [bb.x, bb.y + bb.height],
      [bb.x + bb.width, bb.y + bb.height],
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const x0 = Math.min(...corners.map((c) => c.x));
    const y0 = Math.min(...corners.map((c) => c.y));
    const x1 = Math.max(...corners.map((c) => c.x));
    const y1 = Math.max(...corners.map((c) => c.y));
    svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
  });
}

/** "Cosa facciamo": due mazzi di card, uno per modello, che girano in loop. La card in cima si trascina via, si clicca
 *  o si cambia con le frecce da tastiera: torna in fondo al mazzo, che non si svuota mai. Con il mouse la card in
 *  primo piano si inclina seguendo il puntatore. I link dentro le card restano link. Senza JavaScript le card restano
 *  in colonna. */
function decks(reduced: boolean) {
  const root = document.querySelector<HTMLElement>('[data-decks]');
  if (!root) return;
  root.classList.add('is-live');
  cropWordmarks();
  const VISIBLE = 3; // quante card si vedono impilate
  const canTilt = !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches;
  type Deck = { el: HTMLElement; order: HTMLElement[] };
  const decks: Deck[] = Array.from(root.querySelectorAll<HTMLElement>('.deck')).map((el) => ({
    el,
    order: Array.from(el.querySelectorAll<HTMLElement>('.dcard')),
  }));
  // le card dietro sbucano in alto a destra
  const layout = (d: Deck) =>
    d.order.forEach((c, i) => {
      c.style.setProperty('--sx', `${i * 10}px`);
      c.style.setProperty('--sy', `${-i * 14}px`);
      c.style.setProperty('--s', `${Math.max(0.8, 1 - i * 0.035)}`);
      c.style.zIndex = String(20 - i);
      c.classList.toggle('is-back', i > 0);
      c.classList.toggle('is-hidden', i >= VISIBLE);
    });
  decks.forEach(layout);
  // verso l'esterno della pagina: il mazzo a sinistra esce a sinistra, quello a destra a destra (su telefono, in
  // colonna, a destra)
  const outward = (d: Deck) => {
    const r = d.el.getBoundingClientRect();
    return r.left + r.width / 2 < innerWidth / 2 - 1 ? -1 : 1;
  };

  /** la card si sposta di lato, poi rientra dietro il mazzo (come si mescola un mazzo vero): un solo movimento
   *  continuo, mentre le altre avanzano di un posto. Il passaggio aspetta la fine della trasformazione, non di
   *  un'altra transizione della card (ombra, opacità) che finirebbe prima e la fermerebbe a metà. */
  const cycle = (d: Deck, dir: number) => {
    const card = d.order[0];
    if (!card || card.classList.contains('is-leaving')) return;
    card.classList.remove('is-tilt');
    card.classList.add('is-leaving');
    card.style.setProperty('--tx', '0deg');
    card.style.setProperty('--ty', '0deg');
    const back = () => {
      // dietro tutte le altre, poi in fondo al mazzo: il ritorno usa la transizione normale della card
      card.style.zIndex = '0';
      card.style.transition = '';
      d.order.push(d.order.shift()!);
      layout(d);
      card.style.setProperty('--x', '0px');
      card.style.setProperty('--r', '0deg');
      // resta visibile mentre rientra; si nasconde solo quando è già dietro le altre
      card.classList.remove('is-hidden');
      setTimeout(() => {
        card.classList.remove('is-leaving');
        card.classList.toggle('is-hidden', d.order.indexOf(card) >= VISIBLE);
      }, 600);
    };
    if (reduced) {
      card.style.setProperty('--x', '0px');
      back();
      return;
    }
    card.style.transition = 'transform 0.36s cubic-bezier(0.3, 0.7, 0.4, 1)';
    card.style.setProperty('--x', `${dir * Math.round(card.offsetWidth * 0.68)}px`);
    card.style.setProperty('--r', `${dir * 6}deg`);
    let done = false;
    const out = (e?: TransitionEvent) => {
      if (done || (e && (e.target !== card || e.propertyName !== 'transform'))) return;
      done = true;
      card.removeEventListener('transitionend', out);
      back();
    };
    card.addEventListener('transitionend', out);
    setTimeout(out, 450); // rete di sicurezza se la transizione non arriva
  };

  decks.forEach((d) => {
    d.order.forEach((card) => {
      let startX = 0;
      let dragging = false;
      const snapBack = () => {
        card.style.setProperty('--x', '0px');
        card.style.setProperty('--r', '0deg');
      };
      card.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || card !== d.order[0] || card.classList.contains('is-leaving')) return;
        if ((e.target as HTMLElement).closest('a')) return; // un link dentro la card resta un link
        dragging = true;
        startX = e.clientX;
        d.el.dataset.dragging = '1';
        card.classList.add('is-drag');
        card.classList.remove('is-tilt');
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        card.style.setProperty('--x', `${dx}px`);
        card.style.setProperty('--r', `${dx * 0.05}deg`);
      });
      card.addEventListener('pointerup', (e) => {
        if (!dragging) return;
        dragging = false;
        delete d.el.dataset.dragging;
        card.classList.remove('is-drag');
        const dx = e.clientX - startX;
        if (Math.abs(dx) > Math.min(120, d.el.offsetWidth * 0.22)) {
          cycle(d, Math.sign(dx)); // trascinata via
        } else if (Math.abs(dx) < 6) {
          snapBack();
          cycle(d, outward(d)); // un semplice clic sulla card in cima: esce verso l'esterno
        } else {
          snapBack();
        }
      });
      card.addEventListener('pointercancel', () => {
        if (!dragging) return;
        dragging = false;
        delete d.el.dataset.dragging;
        card.classList.remove('is-drag');
        snapBack();
      });
    });

    // tastiera: le frecce (o Invio e Spazio) cambiano la card in cima quando il mazzo ha il fuoco
    d.el.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      cycle(d, e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : outward(d));
    });
  });

  if (canTilt) {
    decks.forEach((d) => {
      d.el.addEventListener('pointermove', (e) => {
        const card = d.order[0];
        if (!card || card.classList.contains('is-leaving') || d.el.dataset.dragging === '1') return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5; // da -0,5 a 0,5
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilt');
        card.style.setProperty('--tx', `${(-y * 8).toFixed(2)}deg`);
        card.style.setProperty('--ty', `${(x * 10).toFixed(2)}deg`);
      });
      d.el.addEventListener('pointerleave', () => {
        const card = d.order[0];
        if (!card) return;
        card.classList.remove('is-tilt');
        card.style.setProperty('--tx', '0deg');
        card.style.setProperty('--ty', '0deg');
      });
    });
  }
}
