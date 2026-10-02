interface DeploiableHooks {
  ready: boolean;
  mode: 'webgl' | 'static';
  tier: string;
  reason?: string;
  errors: string[];
  seek?: (p: number | string) => void;
  freezeTime?: (t: number | null) => void;
  skipIntro?: () => void;
  state?: () => Record<string, unknown>;
  duration?: number;
}

interface Window {
  __DEPLOIABLE__?: DeploiableHooks;
}
