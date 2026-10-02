import { Vector3, type PerspectiveCamera } from 'three';
import { LABELS } from '../config/scenes';
import { range } from '../core/tracks';

// Parole del rumore: ancorate a punti 3D dentro la nube, proiettate a ogni frame, lampeggiano.
export class Fragments {
  private readonly items: { el: HTMLElement; anchor: Vector3; rate: number; phase: number }[] = [];
  private readonly v = new Vector3();

  constructor(root: HTMLElement | null) {
    if (!root) return;
    const spans = Array.from(root.querySelectorAll<HTMLElement>('span'));
    spans.forEach((el, i) => {
      const a = (i / spans.length) * Math.PI * 2 + 0.7;
      const r = 3.2 + ((i * 37) % 10) / 3.5;
      const anchor = new Vector3(Math.cos(a) * r * 1.35, Math.sin(a * 1.7) * 2.6, Math.sin(a) * r * 0.8);
      if (i % 3 === 0) el.classList.add('is-hot');
      this.items.push({ el, anchor, rate: 2.2 + (i % 4) * 0.9, phase: i * 1.37 });
    });
  }

  update(t: number, time: number, camera: PerspectiveCamera, w: number, h: number) {
    const env = range(t, LABELS.noise + 0.05, LABELS.noise + 0.45) * (1 - range(t, LABELS.split - 0.1, LABELS.split + 0.35));
    for (const it of this.items) {
      if (env <= 0) {
        it.el.style.opacity = '0';
        continue;
      }
      this.v.copy(it.anchor).project(camera);
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      const blink = Math.sin(time * it.rate + it.phase) > -0.15 ? 1 : 0.15;
      const behind = this.v.z > 1 ? 0 : 1;
      it.el.style.opacity = (env * blink * behind * 0.9).toFixed(2);
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }
}
