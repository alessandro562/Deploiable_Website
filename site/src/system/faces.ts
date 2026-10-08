// Contenuti disegnati sulle facce dei moduli (coordinate locali: origine al centro, x a destra, y verso chi
// guarda). Restano astratti ma credibili: un'interfaccia di prodotto vera, non un cruscotto di fantascienza.
import { INK, clamp, el, type FaceContent } from './engine';

type L = { it: string; en: string };

/** Elemento che compare quando l'avanzamento supera `at` (sale di qualche unità mentre entra). */
class Reveal {
  constructor(
    readonly node: SVGGraphicsElement,
    readonly at: number,
  ) {
    node.setAttribute('opacity', '0');
  }
  update(ui: number) {
    const k = clamp((ui - this.at) / 0.14);
    this.node.setAttribute('opacity', k.toFixed(3));
    this.node.setAttribute('transform', `translate(0 ${((1 - k) * 4).toFixed(2)})`);
  }
}

const text = (parent: Element, x: number, y: number, size: number, weight: number, fill: string, anchor = 'start') =>
  el('text', { x, y, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor, 'dominant-baseline': 'central', class: 'sys-ui-text' }, parent);

/**
 * L'interfaccia del prodotto (BUILD): navigazione, dati operativi, una raccomandazione dell'AI con l'azione di
 * approvazione per la persona, l'indicatore di stato. Disegnata per una faccia di 300 × 196 unità.
 */
export function productUI(): FaceContent {
  const items: Reveal[] = [];
  const texts: [SVGTextElement, L][] = [];
  let dot: SVGCircleElement | null = null;
  return {
    build(g) {
      const W = 300;
      const D = 196;
      const x0 = -W / 2;
      const y0 = -D / 2;
      // barra laterale
      const side = el('g', {}, g);
      el('path', { d: `M${x0 + 7} ${y0}H${x0 + 44}V${-y0}H${x0 + 7}A7 7 0 0 1 ${x0} ${-y0 - 7}V${y0 + 7}A7 7 0 0 1 ${x0 + 7} ${y0}Z`, fill: '#e1e6d8' }, side);
      el('rect', { x: x0 + 13, y: y0 + 12, width: 16, height: 16, rx: 4, fill: INK.forest }, side);
      el('rect', { x: x0 + 17.5, y: y0 + 17, width: 7, height: 2.4, rx: 1, fill: INK.lime, transform: `rotate(-8 ${x0 + 21} ${y0 + 18})` }, side);
      el('rect', { x: x0 + 16.5, y: y0 + 21, width: 7, height: 2.4, rx: 1, fill: INK.lime, transform: `rotate(-8 ${x0 + 20} ${y0 + 22})` }, side);
      [0, 1, 2, 3].forEach((i) => {
        el('rect', { x: x0 + 14, y: y0 + 46 + i * 16, width: 16, height: 4, rx: 2, fill: i === 0 ? INK.forest : '#a9b6a6' }, side);
      });
      el('rect', { x: x0 + 8, y: y0 + 44, width: 2.5, height: 8, rx: 1.2, fill: INK.forest }, side);
      items.push(new Reveal(side, 0.05));

      // intestazione: titolo e stato
      const head = el('g', {}, g);
      texts.push([text(head, x0 + 58, y0 + 20, 12, 700, INK.forest), { it: 'Richieste', en: 'Requests' }]);
      el('rect', { x: x0 + 58, y: y0 + 31, width: 72, height: 3.5, rx: 1.7, fill: '#b9c3b4' }, head);
      items.push(new Reveal(head, 0.15));
      const chip = el('g', {}, g);
      el('rect', { x: W / 2 - 52, y: y0 + 12, width: 40, height: 15, rx: 7.5, fill: '#e1e6d8' }, chip);
      dot = el('circle', { cx: W / 2 - 43, cy: y0 + 19.5, r: 3, fill: '#5d8a1f' }, chip);
      texts.push([text(chip, W / 2 - 36, y0 + 19.8, 7.5, 600, INK.forest), { it: 'Live', en: 'Live' }]);
      items.push(new Reveal(chip, 0.92));

      // righe di dati
      const widths = [86, 64, 98, 72];
      const states = [1, 0, 1, 0];
      widths.forEach((w, i) => {
        const row = el('g', {}, g);
        const y = y0 + 52 + i * 19;
        el('rect', { x: x0 + 58, y: y - 4, width: 8, height: 8, rx: 2, fill: '#b9c3b4' }, row);
        el('rect', { x: x0 + 74, y: y - 2, width: w, height: 4, rx: 2, fill: '#9eab9b' }, row);
        el('rect', { x: x0 + 74 + w + 10, y: y - 2, width: 30, height: 4, rx: 2, fill: '#cfd6c9' }, row);
        el('rect', { x: W / 2 - 46, y: y - 5, width: 34, height: 10, rx: 5, fill: states[i] ? INK.forest : '#dfe4d6' }, row);
        el('rect', { x: W / 2 - 39, y: y - 1, width: 20, height: 2, rx: 1, fill: states[i] ? INK.lime : '#9eab9b' }, row);
        el('rect', { x: x0 + 58, y: y + 9, width: W - 70, height: 0.7, fill: '#dbe0d3' }, row);
        items.push(new Reveal(row, 0.28 + i * 0.07));
      });

      // la raccomandazione dell'AI, con l'approvazione della persona
      const ai = el('g', {}, g);
      el('rect', { x: x0 + 58, y: y0 + 132, width: W - 70, height: 54, rx: 7, fill: INK.lime }, ai);
      el('rect', { x: x0 + 68, y: y0 + 141, width: 12, height: 12, rx: 3, fill: INK.forest }, ai);
      el('path', { d: `M${x0 + 74} ${y0 + 143.5}l1.2 3.3 3.3 1.2 -3.3 1.2 -1.2 3.3 -1.2 -3.3 -3.3 -1.2 3.3 -1.2z`, fill: INK.lime }, ai);
      texts.push([text(ai, x0 + 87, y0 + 147.5, 9, 700, INK.forest), { it: 'Suggerimento AI', en: 'AI recommendation' }]);
      el('rect', { x: x0 + 68, y: y0 + 162, width: 120, height: 3.5, rx: 1.7, fill: 'rgb(16 38 27 / 0.35)' }, ai);
      el('rect', { x: x0 + 68, y: y0 + 171, width: 86, height: 3.5, rx: 1.7, fill: 'rgb(16 38 27 / 0.35)' }, ai);
      items.push(new Reveal(ai, 0.62));
      const btn = el('g', {}, g);
      el('rect', { x: W / 2 - 66, y: y0 + 160, width: 52, height: 18, rx: 4, fill: INK.forest }, btn);
      texts.push([text(btn, W / 2 - 40, y0 + 169.3, 8, 600, INK.mist, 'middle'), { it: 'Approva', en: 'Approve' }]);
      items.push(new Reveal(btn, 0.8));
    },
    update(ui, time) {
      for (const r of items) r.update(ui);
      if (dot) dot.setAttribute('r', (2.4 + 0.9 * (0.5 + 0.5 * Math.sin(time * 3.2))).toFixed(2));
    },
    setLang(lang) {
      for (const [t, l] of texts) t.textContent = l[lang];
    },
  };
}

/** La persona che approva: resta nel processo trasformato (accanto all'etichetta, a sinistra). */
export function person(x: number, color = INK.mist): FaceContent {
  let g0: SVGGElement;
  return {
    build(g) {
      g0 = el('g', { opacity: 0 }, g);
      el('circle', { cx: x, cy: -4.2, r: 3.4, fill: 'none', stroke: color, 'stroke-width': 1.4 }, g0);
      el('path', { d: `M${x - 6} 7.5c0.8-4.2 3.2-6.3 6-6.3s5.2 2.1 6 6.3`, fill: 'none', stroke: color, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g0);
    },
    update(ui) {
      g0.setAttribute('opacity', clamp(ui).toFixed(3));
    },
  };
}

/** Stato "in produzione": un punto che pulsa accanto all'etichetta. */
export function liveDot(x: number, color = INK.forest, y = 0): FaceContent {
  let c: SVGCircleElement;
  let ring: SVGCircleElement;
  return {
    build(g) {
      ring = el('circle', { cx: x, cy: y, r: 4, fill: 'none', stroke: color, 'stroke-width': 1 }, g);
      c = el('circle', { cx: x, cy: y, r: 2.6, fill: color }, g);
    },
    update(ui, time) {
      const k = (time * 0.8) % 1;
      ring.setAttribute('r', (3 + k * 5).toFixed(2));
      ring.setAttribute('opacity', ((1 - k) * clamp(ui)).toFixed(3));
      c.setAttribute('opacity', clamp(ui).toFixed(3));
    },
  };
}

/** Scheletro di un'interfaccia esistente (per le uscite e le interfacce AI): barra in alto e righe.
 *  top: dove comincia (unità dal bordo alto), per lasciare spazio a un'etichetta. */
export function appSkeleton(w: number, d: number, accent = false, top = 8): FaceContent {
  let g0: SVGGElement;
  return {
    build(g) {
      g0 = el('g', {}, g);
      const x0 = -w / 2;
      const y0 = -d / 2;
      el('rect', { x: x0 + 8, y: y0 + top, width: w * 0.32, height: 4, rx: 2, fill: accent ? INK.forest : '#8fa596' }, g0);
      for (let i = 0; i < 3; i++) el('rect', { x: x0 + 8, y: y0 + top + 12 + i * 9, width: w * (0.66 - i * 0.12), height: 3, rx: 1.5, fill: accent ? 'rgb(16 38 27 / 0.35)' : 'rgb(143 165 150 / 0.55)' }, g0);
    },
    update(ui) {
      g0.setAttribute('opacity', clamp(ui).toFixed(3));
    },
  };
}
