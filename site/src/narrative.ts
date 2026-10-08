// Il racconto a scorrimento (#approach): la scena del sistema resta ferma mentre i capitoli scorrono con lo
// scorrimento nativo della pagina. Nessun blocco dello scorrimento: la posizione dei capitoli dice a che punto
// è la scena (stati chiave in src/system/journey.ts).
//
// Con prefers-reduced-motion la scena non si muove: ogni capitolo ha accanto la sua immagine ferma, disegnata
// dallo stesso motore nello stato chiave del capitolo.
import { Scene, clamp, smooth } from './system/engine';
import { camAt, frame, type CamKey } from './system/camera';
import { journey } from './system/journey';
import { lang, onLangChange } from './i18n';

/** Stati chiave attraversati da ogni capitolo, e lo stato mostrato nell'immagine ferma. */
const RANGE: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 3],
  [3, 5],
  [5, 6],
  [6, 7],
];
const STILL = [0, 1, 3, 5, 6, 7];

const isTall = (w: number, h: number) => w < 760 || w / h < 0.9;
/** Su telefono la linea di lettura è in basso: a metà capitolo il testo è appena sotto la scena. */
const ANCHOR_TALL = 0.94;

/** Avanzamento di un capitolo che ne attraversa uno o due stati: il passaggio avviene mentre il testo entra, e
 *  lo stato resta fermo mentre lo si legge. */
function chapterP(range: [number, number], c: number, tall: boolean) {
  const [a, b] = range;
  if (b - a === 0) return a;
  if (b - a === 1) return a + smooth(clamp((c - 0.08) / 0.42));
  // due passaggi: il primo entrando, il secondo mentre si legge. Su telefono il testo passa sotto la scena dopo
  // metà capitolo: entrambi i passaggi finiscono prima, mentre il testo è ancora visibile
  if (tall) return a + smooth(clamp(c / 0.2)) + smooth(clamp((c - 0.24) / 0.22));
  return a + smooth(clamp((c - 0.02) / 0.3)) + smooth(clamp((c - 0.46) / 0.34));
}

export function initNarrative(opts: { reduced: boolean; test: boolean }) {
  const section = document.querySelector<HTMLElement>('.narr');
  if (!section) return;
  const root = document.documentElement;
  const chaps = Array.from(section.querySelectorAll<HTMLElement>('.chap'));

  if (opts.reduced) {
    root.classList.add('narr-still');
    stills(chaps);
    return;
  }
  root.classList.add('narr-live');
  const stage = section.querySelector<HTMLElement>('.narr-stage')!;
  const svg = stage.querySelector('svg')!;
  // il suolo a puntini è un livello HTML sotto la scena: disegnato una volta, a ogni fotogramma cambia solo la
  // sua trasformazione (la stessa del piano del mondo), così costa pochissimo
  const ground = stage.querySelector<HTMLElement>('.narr-ground');
  const GROUND = 2000;
  const placeGround = () => {
    if (!ground) return;
    const P = scene.P;
    const c = P.pt(0, 0, 0);
    const k = P.scale(c[2]);
    const U = P.dir(1, 0, 0);
    const V = P.dir(0, 0, 1);
    const a = U[0] * k, b = U[1] * k, cc = V[0] * k, d = V[1] * k;
    const e = c[0] - (a + cc) * (GROUND / 2);
    const f = c[1] - (b + d) * (GROUND / 2);
    ground.style.transform = `matrix(${a.toFixed(4)}, ${b.toFixed(4)}, ${cc.toFixed(4)}, ${d.toFixed(4)}, ${e.toFixed(1)}, ${f.toFixed(1)})`;
  };

  let tall = isTall(innerWidth, innerHeight);
  let J = journey(tall);
  let scene = new Scene(svg, J.spec);
  scene.setLang(lang());
  onLangChange((l) => {
    scene.setLang(l);
    dirty = true;
  });

  // misure (in coordinate della pagina), aggiornate solo quando la pagina cambia forma
  let W = 0;
  let H = 0;
  let chapTops: number[] = [];
  let chapHs: number[] = [];
  let area = { x: 0, y: 0, w: 1, h: 1 };
  const measure = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const y = scrollY;
    chapTops = chaps.map((c) => c.getBoundingClientRect().top + y);
    chapHs = chaps.map((c) => c.offsetHeight);
    const now = isTall(innerWidth, innerHeight);
    if (now !== tall) {
      tall = now;
      svg.replaceChildren();
      J = journey(tall);
      scene = new Scene(svg, J.spec);
      scene.setLang(lang());
    }
    const head = document.querySelector<HTMLElement>('.top')?.offsetHeight ?? 64;
    if (tall) {
      // telefono: la scena occupa la parte alta (sotto l'header), i testi scorrono sotto di lei
      area = { x: 12, y: head + 4, w: W - 24, h: H - head - 14 };
    } else {
      const body = chaps[0].querySelector<HTMLElement>('.chap-body');
      const right = body ? body.getBoundingClientRect().right : W * 0.4;
      const x = Math.max(right + 32, W * 0.4);
      area = { x, y: head, w: W - x - 24, h: H - head - 24 };
    }
    dirty = true;
  };

  // avanzamento: dalla posizione dei capitoli rispetto alla linea di lettura
  const target = () => {
    const anchor = scrollY + innerHeight * (tall ? ANCHOR_TALL : 0.5);
    let p = 0;
    for (let i = 0; i < chaps.length; i++) {
      const c = (anchor - chapTops[i]) / Math.max(1, chapHs[i]);
      if (c < 0) break;
      p = chapterP(RANGE[i], Math.min(c, 1), tall);
    }
    return p;
  };

  let p = 0;
  let drawnP = -1;
  let dirty = true;
  const tilt: [number, number] = [0, 0];
  const tiltTo: [number, number] = [0, 0];
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener(
      'pointermove',
      (e) => {
        tiltTo[0] = (e.clientX / innerWidth - 0.5) * 6;
        tiltTo[1] = (e.clientY / innerHeight - 0.5) * -3;
      },
      { passive: true },
    );
  }

  let running = false;
  let last = 0;
  let time = 0;
  let frozen: number | null = null;
  const loop = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    time += dt;
    const goal = target();
    // inseguimento morbido: assorbe gli scatti della rotellina, mai in ritardo di più di un istante
    p += (goal - p) * (1 - Math.exp(-dt * 9));
    if (Math.abs(goal - p) < 0.0005) p = goal;
    tilt[0] += (tiltTo[0] - tilt[0]) * (1 - Math.exp(-dt * 3));
    tilt[1] += (tiltTo[1] - tilt[1]) * (1 - Math.exp(-dt * 3));
    const t = frozen ?? time;
    const moving = Math.abs(p - drawnP) > 0.0002 || Math.abs(tilt[0] - tiltTo[0]) > 0.01 || Math.abs(tilt[1] - tiltTo[1]) > 0.01;
    if (dirty || moving) {
      dirty = false;
      drawnP = p;
      scene.set(p);
      scene.draw(frame(camAt(J.cams, p), area, tilt), t);
      placeGround();
    } else scene.tick(t);
    requestAnimationFrame(loop);
  };
  // la scena lavora solo quando la sezione è sullo schermo
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        last = 0;
        p = target();
        dirty = true;
        requestAnimationFrame(loop);
      } else if (!e.isIntersecting) running = false;
    },
    { rootMargin: '10% 0px' },
  ).observe(section);

  measure();
  new ResizeObserver(() => measure()).observe(document.body);
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);

  // per i test e le registrazioni: stato chiave e tempo fissi
  window.__NARR__ = {
    p: () => p,
    target,
    freeze: (t: number | null) => {
      frozen = t;
      dirty = true;
    },
    jump: () => {
      p = target();
      dirty = true;
    },
    // posizione di scorrimento del capitolo i all'avanzamento c (0..1)
    yFor: (i: number, c: number) => chapTops[i] + chapHs[i] * c - innerHeight * (tall ? ANCHOR_TALL : 0.5),
    // porta lo scorrimento al capitolo i, all'avanzamento c (0..1) del capitolo
    seekChapter: (i: number, c: number) => {
      const y = chapTops[i] + chapHs[i] * c - innerHeight * (tall ? ANCHOR_TALL : 0.5);
      scrollTo(0, y);
      p = target();
      dirty = true;
    },
  };
}

/** Movimento ridotto: un'immagine ferma per capitolo, stesso motore, stato chiave del capitolo. */
function stills(chaps: HTMLElement[]) {
  const scenes: { scene: Scene; svg: SVGSVGElement; box: HTMLElement; k: number; tall: boolean; cams: CamKey[] }[] = [];
  const draw = () => {
    for (const s of scenes) {
      const w = s.box.clientWidth;
      const h = s.box.clientHeight;
      if (!w || !h) continue;
      const tall = w / h < 0.9;
      if (tall !== s.tall) {
        s.svg.replaceChildren();
        const J = journey(tall);
        s.scene = new Scene(s.svg, J.spec);
        s.cams = J.cams;
        s.tall = tall;
        s.scene.setLang(lang());
      }
      s.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      s.scene.set(s.k);
      s.scene.draw(frame(s.cams[s.k], { x: 8, y: 8, w: w - 16, h: h - 16 }), 0.4);
    }
  };
  chaps.forEach((c, i) => {
    const box = c.querySelector<HTMLElement>('.chap-fig');
    if (!box) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.appendChild(svg);
    const tall = box.clientWidth / Math.max(1, box.clientHeight) < 0.9;
    const J = journey(tall);
    const scene = new Scene(svg, J.spec);
    scene.setLang(lang());
    scenes.push({ scene, svg, box, k: STILL[i], tall, cams: J.cams });
  });
  draw();
  onLangChange((l) => {
    for (const s of scenes) s.scene.setLang(l);
    draw();
  });
  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }).observe(document.body);
}
