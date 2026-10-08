// Inquadratura: dagli stati chiave della camera (cosa guardare, quanto mondo far stare) ai parametri a schermo.
import { clamp, lerp, smooth, type Cam, type V3 } from './engine';

export interface CamKey {
  t: V3;
  /** unità del mondo da far stare nella larghezza dell'inquadratura */
  span: number;
  /** e nell'altezza (a schermo; se manca, 0,62 × span) */
  vspan?: number;
  yaw: number;
  pitch: number;
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Camera fra due stati chiave (p reale), con lo stesso addolcimento degli oggetti. */
export function camAt(cams: CamKey[], p: number): CamKey {
  if (cams.length === 1) return cams[0];
  const i = Math.max(0, Math.min(Math.floor(p), cams.length - 2));
  const t = smooth(clamp(p - i));
  const A = cams[i];
  const B = cams[i + 1];
  return {
    t: [lerp(A.t[0], B.t[0], t), lerp(A.t[1], B.t[1], t), lerp(A.t[2], B.t[2], t)],
    span: Math.exp(lerp(Math.log(A.span), Math.log(B.span), t)),
    vspan: Math.exp(lerp(Math.log(A.vspan ?? A.span * 0.62), Math.log(B.vspan ?? B.span * 0.62), t)),
    yaw: lerp(A.yaw, B.yaw, t),
    pitch: lerp(A.pitch, B.pitch, t),
  };
}

/** Lo stato chiave della camera dentro un'area dello schermo; tilt: piccola rotazione col puntatore (gradi). */
export function frame(k: CamKey, area: Area, tilt: [number, number] = [0, 0]): Cam {
  const zoom = Math.min(area.w / k.span, area.h / (k.vspan ?? k.span * 0.62));
  return { t: k.t, yaw: k.yaw + tilt[0], pitch: k.pitch + tilt[1], zoom, cx: area.x + area.w / 2, cy: area.y + area.h / 2, dist: 2400 };
}
