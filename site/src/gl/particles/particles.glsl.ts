// Sistema unico di trattini istanziati. Ogni stato è una funzione analitica di (seed, tempo):
// nessun buffer di posizioni, quindi lo scroll all'indietro ricostruisce lo stesso fotogramma.
// 0 filamenti · 1 nube (il rumore) · 2 piano + strumento · 3 griglia Analisi · 4 flussi sulle barre · 5 dissolvenza

export const particleVertex = /* glsl */ `
precision highp float;

attribute vec4 aSeed;
attribute vec4 aSeed2;

uniform float uTime;
uniform float uState;
uniform vec2 uRes;
uniform float uPx;
uniform float uWidth;
uniform vec3 uPointer;
uniform float uPointerAmt;
uniform vec3 uLineIn;
uniform float uLineLen;
uniform float uDensity;
uniform float uFine;
uniform float uScan;
uniform float uFlow;
uniform mat4 uRig;
uniform vec3 uLift;
uniform vec3 uFront;
uniform float uExtend;
uniform vec3 uBarX0;
uniform vec3 uBarX1;
uniform vec3 uBarKx;
uniform vec3 uBarY;
uniform vec2 uCenter;
uniform float uDepthSvg;

uniform vec3 uLime;
uniform vec3 uLimeDeep;
uniform vec3 uSage;
uniform vec3 uMoss;
uniform vec3 uPine;

varying vec3 vColor;
varying vec2 vUv;

const float TAN8 = 0.14054083;
const float PI = 3.14159265;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 0.55 + t * 0.7) + sin(p.z * 0.31 - t * 0.43),
    sin(p.z * 0.47 + t * 0.52) + sin(p.x * 0.29 + t * 0.61),
    sin(p.x * 0.51 - t * 0.6) + sin(p.y * 0.37 + t * 0.33)
  );
}

vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }

struct S { vec3 pos; vec3 tan; float len; float w; vec3 col; };

float pick(vec3 v, float i) { return i < 0.5 ? v.x : (i < 1.5 ? v.y : v.z); }

// 0 · tre filamenti inclinati di 8° che attraversano lo schermo
S sLines() {
  S s;
  float i = floor(aSeed.w * 3.0);
  float u = aSeed.x;
  float x = mix(-30.0, 30.0, u);
  float li = pick(uLineIn, i);
  float drop = 1.0 - smoothstep(0.0, 0.55, li);
  float y = (1.0 - i) * 1.45 + x * TAN8 + drop * 4.0;
  s.pos = vec3(x - i * 0.8, y + (aSeed.y - 0.5) * 0.015, (aSeed.z - 0.5) * 0.04);
  s.tan = normalize(vec3(1.0, TAN8, 0.0));
  s.len = uLineLen;
  s.w = 1.3 * step(u, li * 1.02);
  s.col = uLime * 1.15;
  return s;
}

vec3 cloudAt(float t) {
  float r = 7.2 * pow(aSeed.x, 0.55);
  float th = aSeed.y * 2.0 * PI;
  float cp = aSeed.z * 2.0 - 1.0;
  float sp = sqrt(1.0 - cp * cp);
  vec3 base = r * vec3(sp * cos(th), cp * 0.72, sp * sin(th));
  base.x *= 1.3;
  vec3 p = rotY(base, t * 0.07 * (0.6 + aSeed2.x));
  return p + flow(base * 0.33, t * 0.55) * 1.15 + flow(base * 0.9 + 3.0, t * 0.9) * 0.35;
}

// 1 · il rumore: una nube che vortica senza direzione
S sChaos() {
  S s;
  vec3 a = cloudAt(uTime);
  vec3 b = cloudAt(uTime + 0.06);
  s.pos = a;
  vec3 d = b - a;
  s.tan = length(d) > 1e-5 ? normalize(d) : vec3(1.0, 0.0, 0.0);
  s.len = (0.1 + aSeed2.y * 0.26) * uFine;
  s.w = 1.35 * mix(0.75, 1.0, uFine);
  s.col = aSeed2.z < 0.18 ? uSage : mix(uLime, uLimeDeep, aSeed2.z) * 1.05;
  return s;
}

// 2 · a sinistra il piano (un Gantt congelato), a destra lo strumento (un cubo chiuso)
S sSplit() {
  S s;
  if (aSeed2.x < 0.5) {
    float rows = 22.0;
    float row = floor(aSeed.y * rows);
    float u = aSeed.x;
    float seg = floor(u * 7.0);
    float on = step(0.36, hash(row * 7.13 + seg * 1.71));
    vec3 lp = vec3((u - 0.5) * 5.4, (row / (rows - 1.0) - 0.5) * 5.2 - 0.7, 0.0);
    lp = rotY(lp, 0.42);
    s.pos = lp + vec3(-5.7, 0.0, 0.0);
    s.tan = rotY(vec3(1.0, 0.0, 0.0), 0.42);
    s.len = uDensity * 5.4 * rows * 2.2;
    s.w = 1.6 * on;
    s.col = uSage * 1.25;
  } else {
    vec3 lp;
    vec3 tn;
    if (aSeed2.y < 0.72) {
      float e = floor(aSeed.y * 12.0);
      float ax = floor(e / 4.0);
      float k = mod(e, 4.0);
      float s1 = mod(k, 2.0) * 2.0 - 1.0;
      float s2 = floor(k / 2.0) * 2.0 - 1.0;
      float t = aSeed.x * 2.0 - 1.0;
      lp = ax < 0.5 ? vec3(t, s1, s2) : (ax < 1.5 ? vec3(s1, t, s2) : vec3(s1, s2, t));
      tn = ax < 0.5 ? vec3(1, 0, 0) : (ax < 1.5 ? vec3(0, 1, 0) : vec3(0, 0, 1));
    } else {
      float f = floor(aSeed.y * 6.0);
      float ax = floor(f / 2.0);
      float sg = mod(f, 2.0) * 2.0 - 1.0;
      float q = (floor(aSeed2.w * 5.0) + 0.5) / 5.0 * 2.0 - 1.0;
      float t = aSeed.x * 2.0 - 1.0;
      lp = ax < 0.5 ? vec3(sg, q, t) : (ax < 1.5 ? vec3(t, sg, q) : vec3(q, t, sg));
      tn = ax < 0.5 ? vec3(0, 0, 1) : (ax < 1.5 ? vec3(1, 0, 0) : vec3(0, 1, 0));
    }
    float side = 2.1;
    lp = rotX(rotY(lp * side, -0.55), 0.32);
    tn = rotX(rotY(tn, -0.55), 0.32);
    s.pos = lp + vec3(5.7, -0.4, 0.0);
    s.tan = tn;
    s.len = uDensity * 8.0 * 12.0 * 4.0;
    s.w = 1.6;
    s.col = uSage * 1.15;
  }
  return s;
}

// 3 · Analisi: un campo di punti sparsi che la scansione mette in griglia
S sGrid() {
  S s;
  float scanZ = mix(-11.0, -78.0, uScan);
  vec3 pj = vec3(mix(-15.0, 15.0, aSeed.x), -5.6 + (aSeed2.y - 0.5) * 3.2, mix(-12.0, -78.0, aSeed.y));
  vec3 pg;
  vec3 tg;
  if (aSeed2.z < 0.62) {
    pg = vec3(floor(pj.x / 1.5 + 0.5) * 1.5, -5.6, pj.z);
    tg = vec3(0.0, 0.0, 1.0);
  } else {
    pg = vec3(pj.x, -5.6, floor(pj.z / 3.0 + 0.5) * 3.0);
    tg = vec3(1.0, 0.0, 0.0);
  }
  float k = smoothstep(scanZ - 2.5, scanZ + 2.5, pj.z);
  float jitterT = aSeed2.w * 6.28;
  vec3 tj = normalize(vec3(cos(jitterT), 0.3 * sin(uTime + jitterT), sin(jitterT)));
  s.pos = mix(pj, pg, k);
  s.tan = normalize(mix(tj, tg, k) + 1e-4);
  s.len = mix(0.18 * uFine, 0.5, k);
  s.w = 1.15;
  float band = exp(-pow((pj.z - scanZ) * 0.45, 2.0));
  s.col = mix(uMoss * 0.75, uLimeDeep, k) + uLime * band * 1.4;
  return s;
}

// 4 · Pilota e Produzione: flussi che corrono lungo le barre
S sRails(float push) {
  S s;
  float i = floor(aSeed.w * 3.0);
  float x0 = pick(uBarX0, i), x1 = pick(uBarX1, i) + uExtend, kx = pick(uBarKx, i), by = pick(uBarY, i);
  float lift = pick(uLift, i);
  float front = pick(uFront, i);
  float speed = (0.55 + aSeed2.x * 0.9) * uFlow;
  float u = fract(aSeed.x + uTime * speed * 40.0 / (x1 - x0));
  float x = mix(x0, x1, u);
  float growth = x0 + (x1 - x0) * front;
  float block = step(kx, x);
  float y = by - block * 9.0 * lift;
  float q = aSeed.y * 4.0;
  float hy = 9.0 + 0.8, hz = uDepthSvg * 0.5 + 0.8;
  float aura = 1.0 + pow(aSeed2.y, 5.0) * 3.5;
  vec2 o;
  if (q < 1.0) o = vec2(mix(-hy, hy, q), hz);
  else if (q < 2.0) o = vec2(hy, mix(hz, -hz, q - 1.0));
  else if (q < 3.0) o = vec2(mix(hy, -hy, q - 2.0), -hz);
  else o = vec2(-hy, mix(-hz, hz, q - 3.0));
  o *= aura;
  float sy = y + o.x - (x - 50.0) * TAN8;
  vec3 local = vec3((x - uCenter.x) / 10.0, -(sy - uCenter.y) / 10.0, o.y / 10.0);
  vec3 dir = normalize(vec3(1.0, TAN8, 0.0));
  local += normalize(local - vec3(0.0, 0.0, 0.0) + vec3(aSeed.zw - 0.5, aSeed2.w - 0.5)) * push;
  s.pos = (uRig * vec4(local, 1.0)).xyz;
  s.tan = normalize(mat3(uRig) * dir);
  s.len = (0.16 + uFlow * 0.55 * (0.5 + aSeed2.z)) * mix(0.6, 1.0, uFine);
  s.w = 1.25 * step(x, growth + 0.5);
  s.col = mix(uLimeDeep, uLime, aSeed2.z) * (1.0 + 0.35 * min(uFlow, 1.5));
  return s;
}

S stateAt(float k) {
  if (k < 0.5) return sLines();
  if (k < 1.5) return sChaos();
  if (k < 2.5) return sSplit();
  if (k < 3.5) return sGrid();
  if (k < 4.5) return sRails(0.0);
  S s = sRails(9.0);
  s.w = 0.0;
  return s;
}

void main() {
  float k = floor(uState);
  float f = uState - k;
  float SPREAD = 0.65;
  float sb = clamp(f * (1.0 + SPREAD) - aSeed2.w * SPREAD, 0.0, 1.0);
  float e = sb * sb * (3.0 - 2.0 * sb);

  S A = stateAt(k);
  S st = A;
  if (f > 0.0001) {
    S B = stateAt(k + 1.0);
    st.pos = mix(A.pos, B.pos, e) + flow(A.pos * 0.25 + aSeed.xyz * 4.0, uTime * 0.8) * sin(e * PI) * 1.2;
    st.tan = normalize(mix(A.tan, B.tan, e) + 1e-4);
    st.len = mix(A.len, B.len, e);
    st.w = mix(A.w, B.w, e);
    st.col = mix(A.col, B.col, e);
  }

  vec3 dp = st.pos - uPointer;
  float d2 = dot(dp, dp);
  st.pos += normalize(dp + 1e-4) * exp(-d2 / 3.5) * 1.6 * uPointerAmt;

  vec3 p0 = st.pos - st.tan * st.len * 0.5;
  vec3 p1 = st.pos + st.tan * st.len * 0.5;
  vec4 c0 = projectionMatrix * viewMatrix * vec4(p0, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(p1, 1.0);
  if (c0.w < 0.1 || c1.w < 0.1 || st.w < 0.01) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec2 n0 = c0.xy / c0.w;
  vec2 n1 = c1.xy / c1.w;
  vec2 dir = (n1 - n0) * uRes;
  float L = length(dir);
  dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float atten = clamp(9.0 / c0.w, 0.65, 1.9);
  float wpx = st.w * uWidth * uPx * atten;

  vec4 c = mix(c0, c1, position.x);
  c.xy += nrm * position.y * wpx / uRes * c.w;
  c.xy += dir * (position.x * 2.0 - 1.0) * 0.5 * uPx / uRes * c.w;
  gl_Position = c;
  vColor = st.col;
  vUv = position.xy;
}
`;

export const particleFragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}
`;
