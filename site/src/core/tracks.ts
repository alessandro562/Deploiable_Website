import { gsap } from 'gsap';

// Tracce a keyframe: ogni canale numerico della scena è una funzione pura del tempo della
// timeline. Andare avanti o indietro con lo scroll dà sempre lo stesso fotogramma.
type Key = [time: number, value: number, ease?: string];

export class Track {
  private keys: { t: number; v: number; ease: (x: number) => number }[];

  constructor(keys: Key[]) {
    this.keys = keys
      .map(([t, v, e]) => ({ t, v, ease: gsap.parseEase(e ?? 'power2.inOut') as (x: number) => number }))
      .sort((a, b) => a.t - b.t);
  }

  at(t: number): number {
    const k = this.keys;
    if (t <= k[0].t) return k[0].v;
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i];
        const x = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        return a.v + (b.v - a.v) * b.ease(x);
      }
    }
    return k[k.length - 1].v;
  }
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
