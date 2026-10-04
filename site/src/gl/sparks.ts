import {
  Color,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { COLORS } from '../config/brand';

// Scintille dell'incastro: tre esplosioni (una per barra) di trattini Lime che partono dalla faccia
// della barra. Ogni posizione è una funzione pura dell'età di ogni esplosione, quindi con il tempo
// fermo (o all'indietro) il fotogramma è sempre lo stesso.
const vertex = /* glsl */ `
precision highp float;
attribute vec4 aSeed;
uniform vec3 uAge;       // età 0..1 di ciascuna esplosione (<0: non ancora scattata)
uniform vec3 uScale;     // forza di ciascuna esplosione
uniform vec3 uOrigin0;
uniform vec3 uOrigin1;
uniform vec3 uOrigin2;
uniform vec2 uRes;
uniform float uPx;
uniform vec3 uLime;
uniform vec3 uLimeDeep;
varying vec3 vColor;

float pick3(vec3 v, float i) { return i < 0.5 ? v.x : (i < 1.5 ? v.y : v.z); }

void main() {
  float id = floor(aSeed.w * 3.0);
  float age = pick3(uAge, id);
  float scale = pick3(uScale, id);
  if (age < 0.0 || age >= 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 origin = id < 0.5 ? uOrigin0 : (id < 1.5 ? uOrigin1 : uOrigin2);
  float th = aSeed.x * 6.2831853;
  vec3 dir = normalize(vec3(cos(th), sin(th), (aSeed.z - 0.5) * 0.8));
  float speed = (2.2 + aSeed.y * 7.0) * scale;
  float travel = speed * (1.0 - pow(1.0 - age, 2.4)) * 0.95;
  vec3 pos = origin + dir * (0.9 + travel);
  float len = (0.12 + aSeed.y * 0.55) * scale * (0.35 + (1.0 - age) * 0.9);
  float w = 1.8 * (1.0 - age * age);

  vec3 p0 = pos - dir * len * 0.5;
  vec3 p1 = pos + dir * len * 0.5;
  vec4 c0 = projectionMatrix * viewMatrix * vec4(p0, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(p1, 1.0);
  vec2 n0 = c0.xy / c0.w;
  vec2 n1 = c1.xy / c1.w;
  vec2 d = (n1 - n0) * uRes;
  float L = length(d);
  d = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-d.y, d.x);
  vec4 c = mix(c0, c1, position.x);
  c.xy += nrm * position.y * max(w * uPx, 1.0) / uRes * c.w;
  c.xy += d * (position.x * 2.0 - 1.0) * 0.5 * uPx / uRes * c.w;
  gl_Position = c;
  vColor = mix(uLimeDeep, uLime, aSeed.z) * (1.0 + (1.0 - age) * 0.6);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}
`;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sparks {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly geometry = new InstancedBufferGeometry();

  constructor(count: number, origins: [number, number, number][]) {
    const g = this.geometry;
    g.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const r = rng(20261016);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = r();
      seeds[i * 4 + 1] = r();
      seeds[i * 4 + 2] = r();
      seeds[i * 4 + 3] = (i % 3) / 3 + 0.01; // esplosione di appartenenza: 0, 1, 2
    }
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
    g.instanceCount = count;
    this.material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uAge: { value: new Vector3(-1, -1, -1) },
        uScale: { value: new Vector3(0.7, 0.8, 1.6) },
        uOrigin0: { value: new Vector3(...origins[0]) },
        uOrigin1: { value: new Vector3(...origins[1]) },
        uOrigin2: { value: new Vector3(...origins[2]) },
        uRes: { value: new Vector2(1, 1) },
        uPx: { value: 1 },
        uLime: { value: new Color(COLORS.lime) },
        uLimeDeep: { value: new Color(COLORS.limeDeep) },
      },
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }

  update(ages: [number, number, number], res: Vector2, px: number) {
    const u = this.material.uniforms;
    u.uAge.value.set(ages[0], ages[1], ages[2]);
    u.uRes.value.copy(res);
    u.uPx.value = px;
    this.mesh.visible = ages.some((a) => a >= 0 && a < 1);
  }
}
