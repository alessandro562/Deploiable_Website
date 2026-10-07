import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS, PALETTES, type Palette } from '../../config/brand';
import { STUDIO_GLSL } from './studioMaterial';

// Faccia frontale nel colore pieno della palette (nessuna luce, nessun tone mapping): esce identico al brand.
// Pareti con una luce chiave e un bordo controluce; nessun pixel supera il colore "cap" della palette.
export function createBarMaterial() {
  const m = new ShaderMaterial({
    uniforms: {
      uFront: { value: new Color() },
      uTop: { value: new Color() },
      uBottom: { value: new Color() },
      uSide: { value: new Color() },
      uBack: { value: new Color() },
      uRim: { value: new Color() },
      uRimAmount: { value: 0 },
      uAmbient: { value: 0.5 },
      uDiffuse: { value: 0.62 },
      uCap: { value: new Color() },
      uCam: { value: new Vector3() },
      uLit: { value: 0 },
      uShade: { value: new Color('#071811') },
      uChrome: { value: 0 },
      uEnvRot: { value: 0 },
      uLime: { value: new Color(COLORS.lime) },
      uLimeDeep: { value: new Color(COLORS.limeDeep) },
      uForest: { value: new Color(COLORS.forest) },
    },
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec3 vN;
      varying vec3 vLocalN;
      varying vec3 vWorld;
      varying float vKind;
      void main() {
        vKind = aKind;
        vLocalN = normal;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFront, uTop, uBottom, uSide, uBack, uRim, uCap, uCam, uShade;
      uniform float uChrome;
      ${STUDIO_GLSL}
      uniform float uRimAmount, uAmbient, uDiffuse, uLit;
      varying vec3 vN;
      varying vec3 vLocalN;
      varying vec3 vWorld;
      varying float vKind;
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(uCam - vWorld);
        vec3 col;
        if (vKind < 0.5) {
          col = uFront;
        } else if (vKind < 1.5) {
          col = uBack;
        } else {
          float up = vLocalN.y;
          vec3 base = up > 0.35 ? uTop : (up < -0.35 ? uBottom : uSide);
          vec3 L = normalize(vec3(0.35, 0.85, 0.4));
          col = base * (uAmbient + uDiffuse * max(dot(n, L), 0.0));
          float rim = pow(1.0 - abs(dot(n, V)), 3.0);
          col += uRim * rim * uRimAmount;
          col = min(col, uCap);
        }
        // Luce da studio (solo con uLit > 0): luce chiave dall'alto a sinistra,
        // riempimento da destra, un riflesso morbido e un bordo di Fresnel. Con uLit = 0 il colore resta esatto.
        if (uLit > 0.0) {
          // le ombre vanno verso il verde scuro (uShade), non verso l'oliva: il Lime resta pulito
          vec3 L1 = normalize(vec3(-0.45, 0.75, 0.75));
          vec3 L2 = normalize(vec3(0.9, -0.25, 0.35));
          float d1 = max(dot(n, L1), 0.0);
          float d2 = max(dot(n, L2), 0.0);
          float spec = pow(max(dot(n, normalize(L1 + V)), 0.0), 40.0);
          float fres = pow(1.0 - max(dot(n, V), 0.0), 2.5);
          float grad = mix(0.86, 1.06, smoothstep(-5.0, 5.0, dot(vWorld.xy, vec2(-0.45, 0.9))));
          float k = clamp((0.18 + 0.9 * d1 + 0.22 * d2) * grad, 0.0, 1.08);
          vec3 base = vKind < 0.5 ? uFront : uFront * 0.96;
          vec3 lit = mix(uShade, base, min(k, 1.0)) * max(k, 1.0)
            + vec3(1.0, 1.0, 0.92) * spec * 0.35 + uFront * fres * 0.35;
          // riflessi da studio (gli stessi softbox del racconto): il volume diventa materiale
          vec3 R = reflect(-V, n);
          lit += vec3(1.0) * pow(max(dot(R, normalize(vec3(-0.55, 0.75, 0.45))), 0.0), 70.0) * 1.2;
          lit += vec3(1.0) * pow(max(dot(R, normalize(vec3(0.85, 0.25, 0.45))), 0.0), 140.0) * 0.8;
          col = mix(col, lit, uLit);
        }
        // Metallo nel colore del brand: Lime sul Forest dell'apertura, Forest dopo il passaggio al Lime
        if (uChrome > 0.0) col = mix(col, brandMetal(n, V, uFront), uChrome);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  setPalette(m, PALETTES.forest);
  return m;
}

const mix = (a: string, b: string, t: number, out: Color) => out.set(a).lerp(new Color(b), t);

export function setPalette(m: ShaderMaterial, p: Palette) {
  const u = m.uniforms;
  u.uFront.value.set(p.front);
  u.uTop.value.set(p.top);
  u.uBottom.value.set(p.bottom);
  mix(p.side[0], p.side[1], p.side[2], u.uSide.value);
  mix(p.back[0], p.back[1], p.back[2], u.uBack.value);
  u.uRim.value.set(p.rim);
  u.uRimAmount.value = p.rimAmount;
  u.uCap.value.set(p.cap);
  u.uAmbient.value = p.ambient ?? 0.5;
  u.uDiffuse.value = p.diffuse ?? 0.62;
}
