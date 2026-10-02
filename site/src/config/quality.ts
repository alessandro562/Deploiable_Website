export type Tier = 'high' | 'mid' | 'mobile' | 'minimal';

export interface Quality {
  tier: Tier;
  particles: number;
  dprMax: number;
  post: boolean;
  bloomLevels: number;
  msaa: number;
  ca: boolean;
}

export const QUALITY: Record<Tier, Quality> = {
  high: { tier: 'high', particles: 72000, dprMax: 2, post: true, bloomLevels: 5, msaa: 4, ca: true },
  mid: { tier: 'mid', particles: 40000, dprMax: 1.5, post: true, bloomLevels: 4, msaa: 4, ca: true },
  mobile: { tier: 'mobile', particles: 18000, dprMax: 1.5, post: true, bloomLevels: 3, msaa: 0, ca: false },
  minimal: { tier: 'minimal', particles: 7000, dprMax: 1, post: false, bloomLevels: 0, msaa: 0, ca: false },
};
