import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
} from 'three';
import { COLORS } from '../config/brand';

// Lo spazio dietro a tutta la pagina: un campo di punti Lime a profondità diverse, nitidi (niente nebbia,
// niente sfocature). Scorrendo la camera scende e i punti vicini corrono più dei lontani: parallasse.
// Il puntatore inclina appena la camera. È la profondità della pagina, sotto l'hero e sotto il racconto.

const COUNT = 900;
const PX_TO_WORLD = 0.018; // unità mondo per pixel di scorrimento

export class Space {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(42, 1, 0.5, 260);
  private readonly mat: ShaderMaterial;
  private px = 0;
  private py = 0;
  private tx = 0;
  private ty = 0;

  constructor(depthRange: number) {
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    let r = 7;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 140;
      pos[i * 3 + 1] = 30 - rnd() * (depthRange * PX_TO_WORLD + 80);
      pos[i * 3 + 2] = -10 - rnd() * 120;
      seed[i] = rnd();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
    this.mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color(COLORS.lime) }, uTime: { value: 0 }, uDpr: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uDpr;
        varying float vA;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.15 + aSeed * 40.0) * 0.6;
          p.y += cos(uTime * 0.12 + aSeed * 30.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          // i lontani sono più piccoli e più spenti, i vicini più grandi: la profondità si legge subito
          vA = clamp(1.4 - d / 95.0, 0.05, 1.0) * (0.35 + 0.65 * aSeed);
          gl_PointSize = clamp(90.0 / d, 1.0, 4.5) * uDpr;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          if (dot(c, c) > 0.25) discard;
          gl_FragColor = vec4(uColor * vA * 0.55, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const points = new Points(geo, this.mat);
    points.frustumCulled = false;
    this.scene.add(points);
    addEventListener('pointermove', (e) => {
      this.tx = (e.clientX / innerWidth - 0.5) * 2;
      this.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  apply(time: number, scrollY: number, width: number, height: number, dpr: number, fade: number) {
    // il puntatore si segue con un ritardo morbido
    this.px += (this.tx - this.px) * 0.06;
    this.py += (this.ty - this.py) * 0.06;
    this.camera.aspect = width / height;
    this.camera.position.set(this.px * 3, -scrollY * PX_TO_WORLD - this.py * 2, 30);
    this.camera.lookAt(this.px * 1.2, -scrollY * PX_TO_WORLD, -40);
    this.camera.updateProjectionMatrix();
    this.mat.uniforms.uTime.value = time;
    this.mat.uniforms.uDpr.value = dpr;
    this.mat.uniforms.uColor.value.set(COLORS.lime).multiplyScalar(fade);
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }
}
