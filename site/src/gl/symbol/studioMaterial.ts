// Luce dello studio per il metallo delle barre (src/gl/symbol/barMaterial.ts). Nessuna mappa d'ambiente da
// scaricare: lo studio Lime che le circonda è descritto qui come luce (pavimento e parete Lime, due softbox
// bianchi), così i riflessi del metallo sono coerenti con la scena.

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
