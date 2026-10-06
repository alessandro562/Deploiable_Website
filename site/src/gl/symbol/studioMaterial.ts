import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '../../config/brand';

// Materiale delle barre nel racconto (?story=1): da vetro smerigliato a Forest metallico (uMetal 0 → 1).
// Nessuna mappa d'ambiente da scaricare: lo studio Lime che le circonda è descritto qui come luce
// (pavimento e parete Lime, due softbox bianchi), così i riflessi del metallo sono coerenti con la scena.

export const STUDIO_GLSL = /* glsl */ `
  uniform vec3 uLime, uLimeDeep, uForest;
  uniform float uEnvRot;
  // Lo studio visto in un riflesso: cielo che sale da verde scuro ad argento, un grande softbox bianco in
  // alto, due strisce di luce verticali, la linea d'orizzonte Lime e il pavimento Lime che rimbalza.
  vec3 studio(vec3 R) {
    vec3 c = mix(uForest * 0.7, vec3(0.62, 0.7, 0.62), smoothstep(-0.02, 0.85, R.y));
    c = mix(c, uLime * 0.85, smoothstep(-0.04, -0.4, R.y)); // pavimento Lime
    c += uLime * 1.3 * exp(-pow(R.y + 0.015, 2.0) / 0.0018); // orizzonte
    c += vec3(1.0) * smoothstep(0.6, 0.97, R.y) * 2.2; // softbox dall'alto
    c += vec3(1.0) * smoothstep(0.07, 0.0, abs(R.x + 0.6)) * smoothstep(-0.25, 0.3, R.y) * 3.0;
    c += vec3(0.92, 1.0, 0.82) * smoothstep(0.04, 0.0, abs(R.x - 0.75)) * smoothstep(-0.15, 0.4, R.y) * 2.4;
    return c;
  }
  // Metallo nel colore del brand (B: Lime #C8F25A o Forest #10261B). Il riflesso dello studio non sostituisce
  // il colore: lo modula (da 0,72 a 1,15 volte), di taglio lo accende nella stessa tinta, e solo le luci più
  // forti passano come lampi bianchi nella vernice. Così da lontano il colore resta quello ufficiale.
  vec3 brandMetal(vec3 n, vec3 V, vec3 B) {
    vec3 R = reflect(-V, n);
    float cr = cos(uEnvRot), sr = sin(uEnvRot);
    R.xz = mat2(cr, -sr, sr, cr) * R.xz;
    float ndv = clamp(dot(n, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 5.0);
    vec3 env = studio(R);
    float lum = dot(env, vec3(0.2126, 0.7152, 0.0722));
    vec3 col = B * (0.72 + 0.43 * smoothstep(0.0, 1.0, lum));
    col += B * fres * 0.6;
    // su un colore scuro la sola modulazione non basta a far leggere il metallo: le parti luminose dello
    // studio (strisce, orizzonte, softbox) passano come fasce di luce nella stessa tinta, più chiare
    float dark = 1.0 - smoothstep(0.02, 0.4, dot(B, vec3(0.2126, 0.7152, 0.0722)));
    float band = smoothstep(0.55, 1.5, lum);
    col += (B * 3.2 + vec3(0.02, 0.05, 0.025)) * band * dark;
    col += uLime * 0.08 * fres * dark;
    vec3 lamps = max(env - vec3(1.0), 0.0);
    return col + lamps * (0.18 + 0.5 * fres);
  }
`;

export function createStudioMaterial() {
  return new ShaderMaterial({
    transparent: true,
    uniforms: {
      uCam: { value: new Vector3() },
      uMetal: { value: 0 },
      uEnvRot: { value: 0 },
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
        vec3 metal = brandMetal(n, V, uForest);

        vec3 col = mix(glass, metal, uMetal);
        gl_FragColor = vec4(col, mix(glassA, 1.0, uMetal));
        #include <colorspace_fragment>
      }
    `,
  });
}
