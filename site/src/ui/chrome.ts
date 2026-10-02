import { DURATION, LABELS as L, SCENES, sceneAt } from '../config/scenes';

// Timecode da pellicola, indicatore di fase (il simbolo come processo), tema e cursore.
export class Chrome {
  private readonly timecode = document.querySelector<HTMLElement>('[data-timecode]');
  private readonly phaseBars = Array.from(document.querySelectorAll<SVGPathElement>('.phase .bar'));
  private readonly scenes = Array.from(document.querySelectorAll<HTMLElement>('.scene'));
  private readonly cursor = document.querySelector<HTMLElement>('.cursor');
  private lastTc = '';
  private lastPhase = '';
  private lastTheme = '';
  private lastScene = -1;

  update(t: number, flood: number) {
    const sc = sceneAt(t);
    const secs = (t / DURATION) * 128;
    const ff = Math.floor((secs % 1) * 24);
    const mm = Math.floor(secs / 60);
    const ss = Math.floor(secs % 60);
    const tc = `SC ${SCENES[sc].code} · 00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    if (tc !== this.lastTc && this.timecode) {
      this.timecode.textContent = tc;
      this.lastTc = tc;
    }

    let current = -1;
    if (t >= L.analisi && t < L.pilota) current = 0;
    else if (t >= L.pilota && t < L.produzione) current = 1;
    else if (t >= L.produzione && t < L.symbol) current = 2;
    const done = t >= L.symbol ? 3 : current;
    const key = `${current}|${done}`;
    if (key !== this.lastPhase) {
      this.phaseBars.forEach((b, i) => {
        b.classList.toggle('is-current', i === current);
        b.classList.toggle('is-done', i < done && i !== current);
      });
      this.lastPhase = key;
    }

    const theme = flood > 0.985 ? 'lime' : 'forest';
    if (theme !== this.lastTheme) {
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'lime' ? '#C8F25A' : '#10261B');
      this.lastTheme = theme;
    }

    if (sc !== this.lastScene) {
      this.scenes.forEach((s, i) => s.classList.toggle('is-active', Math.abs(i - sc) <= 1));
      this.lastScene = sc;
    }
  }

  moveCursor(x: number, y: number) {
    if (!this.cursor) return;
    this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.cursor.classList.add('is-on');
  }
}
