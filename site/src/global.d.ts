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

interface Window {
  /** registrazione fotogramma per fotogramma (scripts/capture.mjs): scorrimenti in JavaScript, non nativi */
  __CAPTURE__?: boolean;
  __DEPLOIABLE__?: DeploiableHooks;
}
