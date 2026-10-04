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
  state?: () => { t: number; bump: number[]; sweep: number[] };
}

interface Window {
  __DEPLOIABLE__?: DeploiableHooks;
}
