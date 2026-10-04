export type Tier = 'high' | 'mid' | 'mobile' | 'minimal';

export interface Quality {
  tier: Tier;
  sparks: number;
  dprMax: number;
  post: boolean;
  bloomLevels: number;
  msaa: number;
  ca: boolean;
}

export const QUALITY: Record<Tier, Quality> = {
  high: { tier: 'high', sparks: 3600, dprMax: 2, post: true, bloomLevels: 5, msaa: 4, ca: true },
  mid: { tier: 'mid', sparks: 2400, dprMax: 1.5, post: true, bloomLevels: 4, msaa: 4, ca: true },
  mobile: { tier: 'mobile', sparks: 1500, dprMax: 1.5, post: true, bloomLevels: 3, msaa: 0, ca: false },
  minimal: { tier: 'minimal', sparks: 900, dprMax: 1, post: false, bloomLevels: 0, msaa: 0, ca: false },
};
