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
