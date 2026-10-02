import type { Tier } from '../config/quality';

export interface Capabilities {
  mode: 'webgl' | 'static';
  tier: Tier;
  finePointer: boolean;
  mobile: boolean;
  reason?: string;
}

export function detect(): Capabilities {
  const q = new URLSearchParams(location.search);
  const finePointer = matchMedia('(pointer: fine)').matches;
  const mobile = !finePointer && navigator.maxTouchPoints > 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

  const forcedMode = q.get('mode');
  const forcedTier = q.get('tier') as Tier | null;
  const base = { finePointer, mobile };

  if (forcedMode === 'static') return { ...base, mode: 'static', tier: 'minimal', reason: 'forced' };
  if (forcedMode !== 'webgl') {
    if (reduced) return { ...base, mode: 'static', tier: 'minimal', reason: 'reduced-motion' };
    if (saveData) return { ...base, mode: 'static', tier: 'minimal', reason: 'save-data' };
  }

  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch {
    gl = null;
  }
  if (!gl) return { ...base, mode: 'static', tier: 'minimal', reason: 'no-webgl2' };

  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  let tier: Tier;
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) tier = 'minimal';
  else if (mobile) tier = 'mobile';
  else {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    const integrated = /intel|uhd|iris|mali|adreno|powervr/i.test(renderer);
    tier = mem <= 4 || cores <= 4 || integrated ? 'mid' : 'high';
  }
  if (forcedTier && ['high', 'mid', 'mobile', 'minimal'].includes(forcedTier)) tier = forcedTier;
  return { ...base, mode: 'webgl', tier };
}
