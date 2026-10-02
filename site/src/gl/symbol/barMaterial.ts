import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '../../config/brand';

// Faccia frontale in Lime esatto (nessuna luce, nessun tone mapping): il colore del brand esce identico.
// Pareti da Lime Deep a Pine con una luce chiave e un bordo Lime; nebbia Forest per "l'infinito".
export function createBarMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uLime: { value: new Color(COLORS.lime) },
      uLimeDeep: { value: new Color(COLORS.limeDeep) },
      uPine: { value: new Color(COLORS.pine) },
      uMoss: { value: new Color(COLORS.moss) },
      uForest: { value: new Color(COLORS.forest) },
      uCam: { value: new Vector3() },
      uHeadX: { value: 0 },
      uHead: { value: 0 },
      uFogNear: { value: 18 },
      uFogFar: { value: 70 },
    },
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec3 vN;
      varying vec3 vLocalN;
      varying vec3 vWorld;
      varying vec3 vLocal;
      varying float vKind;
      void main() {
        vKind = aKind;
        vLocal = position;
        vLocalN = normal;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLime, uLimeDeep, uPine, uMoss, uForest, uCam;
      uniform float uHeadX, uHead, uFogNear, uFogFar;
      varying vec3 vN;
      varying vec3 vLocalN;
      varying vec3 vWorld;
      varying vec3 vLocal;
      varying float vKind;
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(uCam - vWorld);
        vec3 col;
        if (vKind < 0.5) {
          col = uLime;
        } else if (vKind < 1.5) {
          col = mix(uPine, uMoss, 0.35);
        } else {
          float up = vLocalN.y;
          vec3 base = up > 0.35 ? uLimeDeep : (up < -0.35 ? uPine : mix(uMoss, uLimeDeep, 0.45));
          vec3 L = normalize(vec3(0.35, 0.85, 0.4));
          col = base * (0.5 + 0.62 * max(dot(n, L), 0.0));
          float rim = pow(1.0 - abs(dot(n, V)), 3.0);
          col += uLime * rim * 0.4;
        }
        float head = exp(-pow((vLocal.x - uHeadX) * 2.2, 2.0)) * uHead;
        col += uLime * head * 1.8;
        float f = smoothstep(uFogNear, uFogFar, length(uCam - vWorld));
        col = mix(col, uForest, f);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
