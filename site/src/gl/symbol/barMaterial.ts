import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '../../config/brand';

// Faccia frontale in Lime esatto (nessuna luce, nessun tone mapping): il colore del brand esce identico.
// Pareti da Lime Deep a Pine con una luce chiave e un bordo Lime; nessun pixel supera mai il Lime del brand.
export function createBarMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uLime: { value: new Color(COLORS.lime) },
      uLimeDeep: { value: new Color(COLORS.limeDeep) },
      uPine: { value: new Color(COLORS.pine) },
      uMoss: { value: new Color(COLORS.moss) },
      uCam: { value: new Vector3() },
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
      uniform vec3 uLime, uLimeDeep, uPine, uMoss, uCam;
      varying vec3 vN;
      varying vec3 vLocalN;
      varying vec3 vWorld;
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
        col = min(col, uLime);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
