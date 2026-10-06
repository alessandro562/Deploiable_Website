import { Color, ShaderMaterial, Vector3 } from 'three';
import { PALETTES, type Palette } from '../../config/brand';

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
      uniform vec3 uFront, uTop, uBottom, uSide, uBack, uRim, uCap, uCam;
      uniform float uRimAmount, uAmbient, uDiffuse;
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
