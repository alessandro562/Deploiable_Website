import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { at } from '../config/scenes';
import { clamp01 } from '../core/tracks';

gsap.registerPlugin(SplitText);

const easeIn = gsap.parseEase('power3.out') as (x: number) => number;
const easeOut = gsap.parseEase('power2.in') as (x: number) => number;
const DUR = 0.24;

interface Unit {
  el: HTMLElement;
  masked: boolean;
}

interface Block {
  el: HTMLElement;
  intro: boolean;
  tin: number;
  tout: number;
  units: Unit[];
  step: HTMLElement | null;
  numeral: HTMLElement | null;
  lastKey: string;
}

// Testi del film: il copy vive nell'HTML (data-in / data-out con etichette della regia).
// Ogni riga entra da una maschera; tutto è funzione del tempo della timeline, quindi reversibile.
export class Overlay {
  private blocks: Block[] = [];
  private readonly lines = new Map<Element, HTMLElement[]>();

  constructor(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('.blk').forEach((el) => {
      const block: Block = {
        el,
        intro: el.hasAttribute('data-intro'),
        tin: el.dataset.in ? at(el.dataset.in) : 0,
        tout: el.dataset.out ? at(el.dataset.out) : Infinity,
        units: [],
        step: el.querySelector('.step-word'),
        numeral: el.querySelector('.numeral'),
        lastKey: '',
      };
      this.blocks.push(block);
      this.collect(block);
      el.querySelectorAll<HTMLElement>('[data-split]').forEach((s) => {
        SplitText.create(s, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => {
            this.lines.set(s, self.lines as HTMLElement[]);
            this.collect(block);
          },
        });
      });
      this.collect(block);
    });
  }

  private collect(b: Block) {
    const units: Unit[] = [];
    for (const child of Array.from(b.el.children) as HTMLElement[]) {
      if (child.classList.contains('numeral')) continue;
      const lines = this.lines.get(child);
      if (lines?.length) {
        lines.forEach((el) => units.push({ el, masked: true }));
        continue;
      }
      units.push({ el: child, masked: false });
    }
    b.units = units;
    b.lastKey = '';
  }

  update(t: number, intro: number) {
    for (const b of this.blocks) {
      const outStart = b.tout - DUR;
      const visible = b.intro ? intro > 0 && t < b.tout + 0.02 : t > b.tin - 0.001 && t < b.tout + 0.02;
      b.el.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;

      const pinBase = (j: number) =>
        b.intro ? clamp01((intro - j * 0.1) / 0.55) : clamp01((t - b.tin - j * 0.045) / DUR);
      const poutBase = (j: number) => clamp01((t - outStart - j * 0.03) / (DUR * 0.9));

      const key = `${pinBase(0).toFixed(3)}|${pinBase(8).toFixed(3)}|${poutBase(0).toFixed(3)}|${poutBase(8).toFixed(3)}`;
      if (key === b.lastKey && !b.step) continue;
      b.lastKey = key;

      b.units.forEach((u, j) => {
        const ei = easeIn(pinBase(j));
        const eo = easeOut(poutBase(j));
        if (u.masked) {
          u.el.style.transform = `translate3d(0, ${((1 - ei) * 108 - eo * 108).toFixed(2)}%, 0)`;
        } else {
          u.el.style.opacity = (ei * (1 - eo)).toFixed(3);
          u.el.style.transform = `translate3d(0, ${((1 - ei) * 22 - eo * 22).toFixed(2)}px, 0)`;
        }
      });
      const blockIn = easeIn(pinBase(0));
      const blockOut = easeOut(poutBase(0));
      b.el.style.setProperty('--scrim', (blockIn * (1 - blockOut)).toFixed(3));
      if (b.numeral) {
        b.numeral.style.opacity = (blockIn * (1 - blockOut)).toFixed(3);
        b.numeral.style.transform = `translate3d(${((1 - blockIn) * -4 + blockOut * 4).toFixed(2)}vw, 0, 0)`;
      }
      if (b.step) {
        const up = easeIn(clamp01((t - b.tin - 0.12) / 0.16));
        b.step.style.transform = `translate3d(0, ${(-0.42 * up).toFixed(3)}em, 0)`;
      }
    }
  }
}
