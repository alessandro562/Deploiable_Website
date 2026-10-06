// Prova (?term=1): apertura "terminale". Sul Forest dell'inizio un comando di deploy si scrive da solo, i
// passaggi si completano uno dopo l'altro (gli stessi del sottotitolo: trovare, costruire, misurare), poi ogni
// riga si trasforma in una barra Lime inclinata di 8° che vola verso il centro, dove arrivano le barre 3D.
// Tutto dipende solo dal tempo dell'animazione: si può fermare e riavvolgere come il resto (test, video).

const PROMPT = 'deploiable deploy --target production';
const STEPS: [string, string][] = [
  ['processes mapped', '0.42s'],
  ['where AI pays off', '1.18s'],
  ['product built', '2.31s'],
  ['results measured', '0.87s'],
];
const T_PROMPT = 0.25; // inizio della scrittura del comando
const CPS_PROMPT = 52; // caratteri al secondo
const T_STEP = 1.05; // primo passaggio
const STEP_GAP = 0.36;
const SPIN = 0.24; // quanto gira la rotellina prima della spunta
const T_DONE = T_STEP + STEPS.length * STEP_GAP + 0.12;
const T_COLLAPSE = 2.85; // le righe diventano barre
const COLLAPSE = 0.62; // durata per riga
const T_END = T_COLLAPSE + COLLAPSE + 0.25;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function initTerminal() {
  const root = document.createElement('div');
  root.className = 'term';
  root.setAttribute('aria-hidden', 'true');
  const mk = (cls: string, text = '') => {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  };
  type Row = { line: HTMLElement; text: HTMLElement; bar: HTMLElement };
  const row = (...kids: HTMLElement[]): Row => {
    const line = document.createElement('div');
    line.className = 'term-line';
    const text = mk('term-text');
    text.append(...kids);
    const bar = mk('term-bar');
    line.append(text, bar);
    root.append(line);
    return { line, text, bar };
  };

  const cmd = mk('term-cmd');
  const caret = mk('term-caret');
  const rows: Row[] = [row(mk('term-ps', '$ '), cmd, caret)];
  const marks: HTMLElement[] = [];
  const labels: HTMLElement[] = [];
  const times: HTMLElement[] = [];
  for (const [label, time] of STEPS) {
    const m = mk('term-mark');
    const l = mk('term-label', label);
    const tm = mk('term-time', time);
    marks.push(m);
    labels.push(l);
    times.push(tm);
    rows.push(row(m, l, tm));
  }
  const done = mk('term-done', '→ deployed.');
  rows.push(row(done));
  document.querySelector('.sweep')!.after(root);

  // verso dove volano le barre: il centro dello schermo, misurato dal centro del blocco
  let toCenter = { x: 0, y: 0 };
  const measure = () => {
    const prev = root.style.transform;
    root.style.transform = 'none';
    const r = root.getBoundingClientRect();
    toCenter = { x: innerWidth / 2 - (r.left + r.width / 2), y: innerHeight / 2 - (r.top + r.height / 2) };
    root.style.transform = prev;
  };
  addEventListener('resize', measure);
  measure();

  return (t: number) => {
    const on = t < T_END;
    root.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    root.style.opacity = String(smooth(0.05, 0.3, t));

    // il comando si scrive lettera per lettera, con il cursore a blocco
    const typed = Math.max(0, Math.min(PROMPT.length, Math.floor((t - T_PROMPT) * CPS_PROMPT)));
    cmd.textContent = PROMPT.slice(0, typed);
    const blink = Math.floor(t * 2.6) % 2 === 0;
    caret.style.opacity = t < T_STEP && (typed < PROMPT.length || blink) ? '1' : '0';

    // i passaggi: compaiono, la rotellina gira, poi la spunta e il tempo
    STEPS.forEach((_, i) => {
      const t0 = T_STEP + i * STEP_GAP;
      const shown = t >= t0;
      rows[i + 1].line.style.visibility = shown ? 'visible' : 'hidden';
      const ok = t >= t0 + SPIN;
      marks[i].textContent = ok ? '✓' : '/-\\|'[Math.floor((t - t0) * 16) % 4] ?? '/';
      marks[i].classList.toggle('ok', ok);
      times[i].style.opacity = ok ? '1' : '0';
    });
    rows[rows.length - 1].line.style.visibility = t >= T_DONE ? 'visible' : 'hidden';

    // le righe diventano barre Lime a 8° che si stringono e volano verso il centro (dal basso verso l'alto)
    rows.forEach((r, i) => {
      const p = (t - T_COLLAPSE - (rows.length - 1 - i) * 0.035) / COLLAPSE;
      r.text.style.opacity = String(1 - smooth(0, 0.3, p));
      r.bar.style.opacity = String(smooth(0.08, 0.3, p) * (1 - smooth(0.8, 1, p)));
      r.bar.style.transform = `scaleX(${(1 - 0.55 * smooth(0.3, 1, p)).toFixed(3)}) rotate(${(-8 * smooth(0.2, 0.5, p)).toFixed(2)}deg)`;
    });
    const fly = smooth(T_COLLAPSE + COLLAPSE * 0.35, T_COLLAPSE + COLLAPSE + 0.2, t);
    root.style.transform = `translate(${(toCenter.x * fly).toFixed(1)}px, ${(toCenter.y * fly).toFixed(1)}px) scale(${(1 - 0.5 * fly).toFixed(3)})`;
  };
}
