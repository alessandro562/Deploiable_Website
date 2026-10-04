export const COLORS = {
  lime: '#C8F25A',
  forest: '#10261B',
  mist: '#F1F3EA',
  pine: '#1C3A2A',
  limeDeep: '#B0DD3C',
  moss: '#4F6A55',
  sage: '#8FA596',
  next: '#2E4A3B', // fase successiva, su fondo scuro
} as const;

// Motion ufficiale del logo: barre dall'alto, 120 ms di sfasamento, 400 ms ease-out.
export const MOTION = { stagger: 0.12, dur: 0.4, ease: 'power2.out' } as const;

// Le palette dell'animazione. In entrambe le combinazioni ammesse dal brand book: Lime su Forest e Forest su Lime
// (su Lime solo Forest). La faccia frontale delle barre e delle lettere è sempre il colore pieno, senza luce.
export type PaletteName = 'forest' | 'lime';

export interface Palette {
  background: string; // fondo del canvas e della pagina
  front: string; // faccia frontale (esatta)
  top: string; // pareti rivolte in alto
  bottom: string; // pareti rivolte in basso
  side: [string, string, number]; // pareti laterali: miscela di due colori
  back: [string, string, number]; // faccia posteriore
  rim: string; // bordo controluce
  rimAmount: number;
  cap: string; // nessun pixel supera questo colore
}

export const PALETTES: Record<PaletteName, Palette> = {
  // Barre Lime su fondo Forest.
  forest: {
    background: COLORS.forest,
    front: COLORS.lime,
    top: COLORS.limeDeep,
    bottom: COLORS.pine,
    side: [COLORS.moss, COLORS.limeDeep, 0.45],
    back: [COLORS.pine, COLORS.moss, 0.35],
    rim: COLORS.lime,
    rimAmount: 0.4,
    cap: COLORS.lime,
  },
  // Barre Forest su fondo Lime: il Lime è il colore che si fa notare, il Forest porta la forma.
  lime: {
    background: COLORS.lime,
    front: COLORS.forest,
    top: COLORS.moss,
    bottom: COLORS.forest,
    side: [COLORS.pine, COLORS.moss, 0.45],
    back: [COLORS.forest, COLORS.pine, 0.5],
    rim: COLORS.limeDeep,
    rimAmount: 0.18,
    cap: COLORS.lime,
  },
};
