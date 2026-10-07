import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '../../config/brand';

// Materiale delle barre nel racconto: da vetro smerigliato a metallo nel colore del brand (uMetal 0 → 1).
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
  // il colore: lo modula (da lo a lo + hi volte), di taglio lo accende nella stessa tinta, e solo le luci più
  // forti passano come lampi bianchi nella vernice. Così da lontano il colore resta quello ufficiale.
  // face: luce della faccia (1 il fronte; più chiara sopra, in ombra sui fianchi), vedi createStudioMaterial.
  vec3 brandMetalLit(vec3 n, vec3 V, vec3 B, float face, float lo, float hi) {
    vec3 R = reflect(-V, n);
    float cr = cos(uEnvRot), sr = sin(uEnvRot);
    R.xz = mat2(cr, -sr, sr, cr) * R.xz;
    float ndv = clamp(dot(n, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 5.0);
    vec3 env = studio(R);
    float lum = dot(env, vec3(0.2126, 0.7152, 0.0722));
    vec3 col = B * face * (lo + hi * smoothstep(0.0, 1.0, lum));
    col += B * fres * 0.6;
    // riflessi: solo le luci più forti dello studio passano come lampi netti nella vernice (più vivi di
    // taglio); nessuna fascia di colore sulle facce
    // lampi bianchi neutri (dalla luminosità, non dal colore: niente riflessi verdastri dall'orizzonte Lime)
    vec3 lamps = vec3(max(lum - 1.05, 0.0));
    return col + lamps * (0.3 + 0.6 * fres) + vec3(1.0) * fres * 0.05;
  }
  vec3 brandMetal(vec3 n, vec3 V, vec3 B) {
    return brandMetalLit(n, V, B, 1.0, 0.72, 0.43);
  }
  // Un grande softbox in alto a sinistra, davanti al simbolo (sul piano z = 7): su una faccia piana di metallo
  // si riflette come una zona chiara dai bordi morbidi, che scorre quando il simbolo gira o le luci ruotano.
  float softbox(vec3 P, vec3 R) {
    float cr = cos(uEnvRot), sr = sin(uEnvRot);
    R.xz = mat2(cr, -sr, sr, cr) * R.xz;
    if (R.z < 0.1) return 0.0;
    vec2 h = P.xy + R.xy * ((7.0 - P.z) / R.z);
    vec2 q = abs(h - vec2(-5.0, 6.0)) - vec2(4.5, 3.0);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    return 1.0 - smoothstep(-1.5, 5.0, d);
  }
`;

export function createStudioMaterial() {
  return new ShaderMaterial({
    transparent: true,
    // le facce arretrano di un soffio nel buffer di profondità: il filo di luce sugli spigoli resta pulito
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      uCam: { value: new Vector3() },
      uMetal: { value: 0 },
      uEnvRot: { value: 0 },
      // colore del metallo: uBase sopra l'onda Lime della chiusura, uBaseTo dove l'onda è già passata
      // (uEdge: il bordo dell'onda, in pixel dal basso, lo stesso del fondo in src/gl/story.ts)
      uBase: { value: new Color(COLORS.lime) },
      uBaseTo: { value: new Color(COLORS.forest) },
      uEdge: { value: -1 },
      uLime: { value: new Color(COLORS.lime) },
      uLimeDeep: { value: new Color(COLORS.limeDeep) },
      uForest: { value: new Color(COLORS.forest) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vWorld;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCam, uBase, uBaseTo;
      uniform float uMetal, uEdge;
      varying vec3 vN;
      varying vec3 vWorld;
      varying vec3 vLocal;
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
        // dove l'onda Lime è passata la barra è Forest: il cambio è un taglio netto che sale con l'onda, mai un
        // colore di mezzo
        float under = 1.0 - smoothstep(uEdge - 1.5, uEdge + 1.5, gl_FragCoord.y);
        vec3 B = mix(uBase, uBaseTo, under);

        // vetro smerigliato nel colore della barra: latteo, bordi e riflessi chiari
        vec3 glass = mix(B * 1.04, vec3(1.0), 0.4) * (0.92 + 0.1 * diff) + studio(R) * (0.06 + 0.6 * fres);
        float glassA = 0.38 + 0.55 * fres;

        // luce delle facce: il fronte pieno nel colore del brand, la faccia superiore più chiara, fianchi e fondo
        // in ombra (valori in luce lineare: 0,42 a schermo è circa due terzi del colore). Così tre blocchi dello
        // stesso colore si staccano l'uno dall'altro.
        float face = mix(0.42, 1.0, smoothstep(0.3, 0.85, ndv));
        face = mix(face, 1.15, smoothstep(0.45, 0.8, n.y));
        face = mix(face, 0.3, smoothstep(0.45, 0.8, -n.y));
        // in ogni barra la luce scende dall'alto: più chiara in cima, più piena in basso, così il bordo basso di
        // una barra si stacca dalla cima di quella sotto (v: altezza nella barra, tolta l'inclinazione di 8°)
        float v = vLocal.y - 0.14 * vLocal.x;
        face *= mix(0.84, 1.1, smoothstep(-1.4, 1.4, v));
        // metallo nel colore del brand (Lime negli step, Forest nella chiusura): il riflesso del softbox lo
        // schiarisce appena verso il bianco e scorre quando il simbolo gira; il resto dello studio, scuro, lo
        // lascia pieno. Sul Forest niente velo chiaro: restano i fili di luce sugli spigoli.
        float box = softbox(vWorld, R) * (1.0 - 0.9 * under);
        vec3 metal = brandMetalLit(n, V, B, face * (0.95 + 0.1 * box), 1.0, 0.0);
        metal = mix(metal, mix(B, vec3(1.0), 0.45), box * 0.16 * smoothstep(0.2, 0.6, ndv));

        vec3 col = mix(glass, metal, uMetal);
        gl_FragColor = vec4(col, mix(glassA, 1.0, uMetal));
        #include <colorspace_fragment>
      }
    `,
  });
}
