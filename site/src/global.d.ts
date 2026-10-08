interface DeploiableHooks {
  ready: boolean;
  mode: 'webgl' | 'static';
  tier: string;
  reason?: string;
  errors: string[];
  duration?: number;
  /** Porta l'animazione al secondo indicato e la ferma: ogni chiamata disegna un solo fotogramma. */
  seek?: (seconds: number) => void;
  /** Riprende la riproduzione normale. */
  play?: () => void;
  /** Stato corrente dell'animazione (solo per i test). */
  /** Riquadro (pixel CSS, coordinate della pagina) della supergrafica visibile. */
  backdrop?: () => { x0: number; y0: number; x1: number; y1: number; visible: boolean; soft: boolean };
  state?: () => { tw: number; caret: boolean; t: number; roll: number[]; bgIn: number[]; bgSlide: number[]; sweep: number[]; letters: number[] };
}

interface NarrativeHooks {
  /** avanzamento attuale della scena (0..7) e quello indicato dallo scorrimento */
  p: () => number;
  target: () => number;
  /** tempo fisso per impulsi e indicatori (null: tempo reale) */
  freeze: (t: number | null) => void;
  /** porta subito la scena all'avanzamento dello scorrimento (senza inseguimento) */
  jump: () => void;
  /** posizione di scorrimento del capitolo i all'avanzamento c */
  yFor: (i: number, c: number) => number;
  /** scorre fino al capitolo i, all'avanzamento c (0..1) del capitolo */
  seekChapter: (i: number, c: number) => void;
}

interface Window {
  /** registrazione fotogramma per fotogramma (scripts/capture.mjs): scorrimenti in JavaScript, non nativi */
  __CAPTURE__?: boolean;
  __DEPLOIABLE__?: DeploiableHooks;
  __NARR__?: NarrativeHooks;
}
