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
  ambient?: number; // luce delle pareti: base * (ambient + diffuse * luce)
  diffuse?: number;
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

// Supergrafica tono su tono (brand book, 05 · Elementi grafici): il simbolo ingrandito dietro ai contenuti.
// Lime Deep su Lime ("texture leggera"), Pine su Forest. Il contrasto del testo non cambia.
export const TONE_PALETTES: Record<PaletteName, Palette> = {
  // Pareti in ombra decisa (Lime Deep verso Moss): il rilievo si legge chiaro e regolare su ogni barra,
  // la faccia frontale resta Lime Deep esatto.
  lime: {
    background: COLORS.lime,
    front: COLORS.limeDeep,
    top: COLORS.limeDeep,
    bottom: '#8EB545', // Lime Deep scurito verso Moss (35 %)
    side: [COLORS.limeDeep, COLORS.moss, 0.38],
    back: [COLORS.limeDeep, COLORS.moss, 0.3],
    rim: COLORS.lime,
    rimAmount: 0,
    cap: COLORS.lime,
    ambient: 0.82,
    diffuse: 0.22,
  },
  forest: {
    background: COLORS.forest,
    front: COLORS.pine,
    top: COLORS.pine,
    bottom: COLORS.forest,
    side: [COLORS.pine, COLORS.forest, 0.35],
    back: [COLORS.pine, COLORS.forest, 0.5],
    rim: COLORS.moss,
    rimAmount: 0.15,
    cap: COLORS.moss,
  },
};

// Supergrafica su telefono, dietro ai testi: tono su tono leggerissimo. Le tinte sono scelte perché anche il testo
// secondario più chiaro (#3F5A46) resti ≥ 4,5:1 sopra le parti più scure del simbolo (faccia 5,4:1, pareti ≥ 4,8:1).
export const TONE_SOFT_LIME: Palette = {
  background: COLORS.lime,
  front: '#BDE94C',
  top: '#BDE94C',
  bottom: '#B4DF4D',
  side: ['#B6E14D', '#B6E14D', 0],
  back: ['#B6E14D', '#B6E14D', 0],
  rim: COLORS.lime,
  rimAmount: 0,
  cap: COLORS.lime,
  ambient: 0.98,
  diffuse: 0.05,
};
