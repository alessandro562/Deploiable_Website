import {
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { COLORS } from '../../config/brand';
import type { SceneState } from '../../core/choreography';
import { BARS, CENTER } from '../symbol/symbolSpec';
import { DEPTH } from '../symbol/barGeometry';
import { particleFragment, particleVertex } from './particles.glsl';

// Generatore deterministico (mulberry32): stessi seed a ogni caricamento.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ParticleField {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  private readonly geometry = new InstancedBufferGeometry();
  private readonly max: number;

  constructor(count: number) {
    this.max = count;
    const g = this.geometry;
    g.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const r = rng(20261016);
    const seeds = new Float32Array(count * 4);
    const seeds2 = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) {
      seeds[i] = r();
      seeds2[i] = r();
    }
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
    g.setAttribute('aSeed2', new InstancedBufferAttribute(seeds2, 4));
    g.instanceCount = count;

    const v3 = (f: (b: (typeof BARS)[number]) => number) => new Vector3(...BARS.map(f));
    this.material = new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uState: { value: 0 },
        uRes: { value: new Vector2(1, 1) },
        uPx: { value: 1 },
        uWidth: { value: 1 },
        uPointer: { value: new Vector3(999, 999, 999) },
        uPointerAmt: { value: 0 },
        uLineIn: { value: new Vector3() },
        uLineLen: { value: 0.1 },
        uDensity: { value: 1 / count },
        uFine: { value: 1 },
        uScan: { value: 0 },
        uFlow: { value: 0 },
        uRig: { value: new Matrix4() },
        uLift: { value: new Vector3() },
        uFront: { value: new Vector3() },
        uExtend: { value: 0 },
        uBarX0: { value: v3((b) => b.x0) },
        uBarX1: { value: v3((b) => b.x1) },
        uBarKx: { value: v3((b) => b.kx) },
        uBarY: { value: v3((b) => b.y) },
        uCenter: { value: new Vector2(CENTER[0], CENTER[1]) },
        uDepthSvg: { value: DEPTH * 10 },
        uLime: { value: new Color(COLORS.lime) },
        uLimeDeep: { value: new Color(COLORS.limeDeep) },
        uSage: { value: new Color(COLORS.sage) },
        uMoss: { value: new Color(COLORS.moss) },
        uPine: { value: new Color(COLORS.pine) },
      },
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.setCount(count);
  }

  setCount(n: number) {
    const c = Math.max(1000, Math.min(this.max, Math.floor(n)));
    this.geometry.instanceCount = c;
    const u = this.material.uniforms;
    u.uDensity.value = 1 / c;
    u.uLineLen.value = Math.max(0.04, (60 / (c / 3)) * 4.5);
    u.uFine.value = Math.min(1, Math.max(0.3, Math.sqrt(9000 / c)));
  }

  get count() {
    return this.geometry.instanceCount;
  }

  update(s: SceneState, time: number, lineIn: number[], rig: Matrix4, pointer: Vector3, res: Vector2, px: number) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uState.value = s.pState;
    u.uScan.value = s.pScan;
    u.uFlow.value = s.pFlow;
    u.uWidth.value = s.pWidth;
    u.uPointerAmt.value = s.pPointer;
    u.uPointer.value.copy(pointer);
    u.uLineIn.value.set(lineIn[0], lineIn[1], lineIn[2]);
    u.uRig.value.copy(rig);
    u.uLift.value.set(...s.lift);
    u.uFront.value.set(...s.front);
    u.uExtend.value = s.extend;
    u.uRes.value.copy(res);
    u.uPx.value = px;
  }
}
