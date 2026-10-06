import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '../../config/brand';

// Materiale delle barre nel racconto (?story=1): da vetro smerigliato a Forest metallico (uMetal 0 → 1).
// Nessuna mappa d'ambiente da scaricare: lo studio Lime che le circonda è descritto qui come luce
// (pavimento e parete Lime, due softbox bianchi), così i riflessi del metallo sono coerenti con la scena.

export const STUDIO_GLSL = /* glsl */ `
  uniform vec3 uLime, uLimeDeep, uForest;
  // lo studio visto da un riflesso: pavimento Lime, orizzonte scuro (la parete in ombra), cielo con un
  // grande softbox bianco; due softbox netti danno i lampi che fanno leggere il metallo
  vec3 studio(vec3 R) {
    vec3 ground = uLime * 0.9;
    vec3 sky = mix(uLime * 1.05, vec3(1.7), smoothstep(0.35, 0.95, R.y));
    vec3 c = mix(ground, sky, smoothstep(-0.08, 0.12, R.y));
    c = mix(c, uForest * 2.0, exp(-R.y * R.y / 0.012) * 0.75);
    c += vec3(1.0) * pow(max(dot(R, normalize(vec3(-0.55, 0.75, 0.45))), 0.0), 60.0) * 3.0;
    c += vec3(1.0) * pow(max(dot(R, normalize(vec3(0.85, 0.2, 0.5))), 0.0), 220.0) * 2.4;
    return c;
  }
`;

export function createStudioMaterial() {
  return new ShaderMaterial({
    transparent: true,
    uniforms: {
      uCam: { value: new Vector3() },
      uMetal: { value: 0 },
      uLime: { value: new Color(COLORS.lime) },
      uLimeDeep: { value: new Color(COLORS.limeDeep) },
      uForest: { value: new Color(COLORS.forest) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCam;
      uniform float uMetal;
      varying vec3 vN;
      varying vec3 vWorld;
      ${STUDIO_GLSL}
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(uCam - vWorld);
        vec3 R = reflect(-V, n);
        float ndv = clamp(dot(n, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 5.0);
        vec3 L = normalize(vec3(-0.55, 0.75, 0.45));
        float diff = max(dot(n, L), 0.0);

        // vetro smerigliato: latteo, lascia passare il Lime, bordi e riflessi chiari
        vec3 glass = mix(uLime * 1.04, vec3(1.0), 0.5) * (0.92 + 0.1 * diff) + studio(R) * (0.06 + 0.6 * fres);
        float glassA = 0.38 + 0.55 * fres;

        // Forest metallico: scuro, riflette lo studio Lime (più forte di taglio), con i softbox netti
        // F0 basso e scuro: il colore resta Forest; lo studio si accende di taglio e nei lampi dei softbox
        vec3 F = mix(vec3(0.05, 0.075, 0.06), vec3(0.9), fres);
        float lamps = pow(max(dot(R, normalize(vec3(-0.55, 0.75, 0.45))), 0.0), 60.0) * 1.6
                    + pow(max(dot(R, normalize(vec3(0.85, 0.2, 0.5))), 0.0), 220.0) * 1.4;
        vec3 metal = uForest * (0.75 + 0.5 * diff) + studio(R) * F + vec3(0.85, 1.0, 0.75) * lamps * 0.35;

        vec3 col = mix(glass, metal, uMetal);
        gl_FragColor = vec4(col, mix(glassA, 1.0, uMetal));
        #include <colorspace_fragment>
      }
    `,
  });
}
