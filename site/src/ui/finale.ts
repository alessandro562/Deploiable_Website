import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { MOTION } from '../config/brand';
import { LABELS } from '../config/scenes';

// Finale: tre fasce Lime inclinate di 8° allagano lo schermo (guidate dallo scroll), poi il logo
// piatto entra con la motion ufficiale (barre dall'alto, 120 ms, 400 ms ease-out, lettering per ultimo).
export class Finale {
  private readonly bands = Array.from(document.querySelectorAll<HTMLElement>('.flood i'));
  private readonly box = document.querySelector<HTMLElement>('.finale');
  private readonly tl = gsap.timeline({ paused: true });
  private played = false;
  private last = -1;
  readonly trigger = LABELS.finale + 0.85;

  constructor() {
    const bars = document.querySelectorAll('.logo-finale .bar');
    const lettering = document.querySelector('.logo-finale .logo-lettering');
    const title = document.querySelector<HTMLElement>('.title--cta');
    const footer = document.querySelector('.finale__footer');
    let lines: Element[] = [];
    if (title) lines = SplitText.create(title, { type: 'lines', mask: 'lines' }).lines;

    gsap.set(bars, { y: -70, opacity: 0 });
    gsap.set(lettering, { opacity: 0 });
    gsap.set(lines, { yPercent: 110 });
    gsap.set(footer, { opacity: 0 });
    this.tl
      .set(this.box, { visibility: 'visible' })
      .to(bars, { y: 0, opacity: 1, duration: MOTION.dur, ease: MOTION.ease, stagger: MOTION.stagger }, 0)
      .set(lettering, { opacity: 1 }, 0.8)
      .to(lines, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.1 }, 0.9)
      .to(footer, { opacity: 1, duration: 0.6 }, 1.5);
  }

  update(t: number, flood: number) {
    if (flood !== this.last) {
      this.bands.forEach((b, i) => {
        const p = Math.min(1, Math.max(0, (flood - i * 0.12) / 0.76));
        const e = 1 - Math.pow(1 - p, 3);
        b.style.transform = `translateX(${(-102 + 102 * e).toFixed(2)}%) skewY(-8deg)`;
      });
      this.last = flood;
    }
    if (t >= this.trigger && !this.played) {
      this.played = true;
      this.tl.timeScale(1).play();
    } else if (t < this.trigger - 0.05 && this.played) {
      this.played = false;
      this.tl.timeScale(2.5).reverse();
    }
  }

  finish() {
    this.tl.progress(1);
  }
}
