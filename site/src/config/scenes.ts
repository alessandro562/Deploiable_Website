// Unica fonte per lunghezza delle scene (in vh) e per le etichette della timeline.
// Unità di tempo della timeline: 1 = 100vh di scroll.
export const SCENES = [
  { id: 'prologue', vh: 80, code: '00', title: 'Prologo' },
  { id: 'noise', vh: 160, code: '01', title: 'Il rumore' },
  { id: 'split', vh: 200, code: '02', title: 'Due mezze risposte' },
  { id: 'lines', vh: 420, code: '03', title: 'Tre linee' },
  { id: 'symbol', vh: 160, code: '04', title: 'Il simbolo' },
  { id: 'finale', vh: 140, code: '05', title: 'Sta arrivando' },
] as const;

export type SceneId = (typeof SCENES)[number]['id'];

export const TOTAL_VH = SCENES.reduce((s, x) => s + x.vh, 0);
export const DURATION = TOTAL_VH / 100;

const starts: Record<string, number> = {};
SCENES.reduce((acc, s) => ((starts[s.id] = acc / 100), acc + s.vh), 0);

// Sottoscene della scena 3 (tempi relativi all'inizio di "lines").
const L = starts.lines;
export const LABELS: Record<string, number> = {
  ...starts,
  ignite: L,
  analisi: L + 0.6,
  pilota: L + 1.7,
  produzione: L + 2.8,
  manifesto: L + 3.9,
  end: DURATION,
};

/** "label", "label+0.3", "label-0.2" oppure un numero → tempo assoluto. */
export function at(expr: string | number): number {
  if (typeof expr === 'number') return expr;
  const m = /^([a-z]+)\s*([+-]\s*[\d.]+)?$/.exec(expr.trim());
  if (!m || !(m[1] in LABELS)) throw new Error(`Etichetta sconosciuta: ${expr}`);
  return LABELS[m[1]] + (m[2] ? parseFloat(m[2].replace(/\s/g, '')) : 0);
}

export function sceneAt(t: number): number {
  let acc = 0;
  for (let i = 0; i < SCENES.length; i++) {
    acc += SCENES[i].vh / 100;
    if (t < acc) return i;
  }
  return SCENES.length - 1;
}
