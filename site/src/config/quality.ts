export type Tier = 'high' | 'mid' | 'mobile' | 'minimal';

export interface Quality {
  tier: Tier;
  dprMax: number;
  antialias: boolean;
}

// Nessun effetto di post-produzione: l'immagine è quella che esce dalle barre, nei colori esatti del brand.
// Il livello cambia solo la nitidezza (densità di pixel e antialiasing).
export const QUALITY: Record<Tier, Quality> = {
  high: { tier: 'high', dprMax: 2, antialias: true },
  mid: { tier: 'mid', dprMax: 1.5, antialias: true },
  mobile: { tier: 'mobile', dprMax: 2, antialias: true }, // 2: il logo 3D nitido quanto il testo accanto
  minimal: { tier: 'minimal', dprMax: 1, antialias: false },
};
