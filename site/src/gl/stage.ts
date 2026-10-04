import { Group, MathUtils, Mesh, PerspectiveCamera, type Scene, type ShaderMaterial, Vector2 } from 'three';
import type { SceneState } from './choreography';
import { BarGeometry, DEPTH } from './symbol/barGeometry';
import { createBarMaterial } from './symbol/barMaterial';
import { PIVOT, SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';
import { Sparks } from './sparks';

// Quanto del viewport occupa il simbolo assemblato: metà altezza, oppure il 62% della larghezza
// (su telefono in verticale). Lo stesso calcolo è replicato in CSS (--sym-w), così testo e 3D combaciano.
export const FIT_HEIGHT = 0.5;
export const FIT_WIDTH = 0.62;

export function fitDistance(fovDeg: number, aspect: number) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const byHeight = SYMBOL_H / (FIT_HEIGHT * 2 * t);
  const byWidth = SYMBOL_W / (FIT_WIDTH * 2 * t * aspect);
  return Math.max(byHeight, byWidth);
}

export class Stage {
  readonly group = new Group();
  private readonly bars: { geo: BarGeometry; mesh: Mesh; mat: ShaderMaterial }[] = [];
  private readonly sparks: Sparks;

  constructor(scene: Scene, sparkCount: number) {
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      const mat = createBarMaterial();
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      this.bars.push({ geo, mesh, mat });
    }
    this.sparks = new Sparks(
      sparkCount,
      PIVOT.map((p) => [p[0], p[1], DEPTH / 2] as [number, number, number]),
    );
    scene.add(this.group, this.sparks.mesh);
  }

  apply(s: SceneState, camera: PerspectiveCamera, res: Vector2, px: number, width: number, height: number) {
    // la camera si aggiorna per prima: le barre usano la sua posizione del fotogramma corrente
    // camera: orbita attorno al centro del simbolo; la distanza segue il campo visivo
    const aspect = width / height;
    // in verticale la scena larga (dispersione delle barre) esce dai lati: l'allontanamento si amplifica
    const k = aspect < 1 ? 1 + (s.dist - 1) * 2.2 : s.dist;
    const d = fitDistance(s.fov, aspect) * k;
    const cosEl = Math.cos(s.el);
    camera.position.set(Math.sin(s.az) * cosEl * d, Math.sin(s.el) * d, Math.cos(s.az) * cosEl * d);
    camera.lookAt(0, 0, 0);
    camera.fov = s.fov;
    camera.aspect = aspect;
    // lo spostamento verticale non cambia la prospettiva: sposta solo l'immagine, lasciando spazio al testo
    camera.setViewOffset(width, height, 0, MathUtils.clamp(s.shiftY, 0, 1) * height, width, height);
    camera.updateMatrixWorld();

    for (let i = 0; i < 3; i++) {
      const p = s.bars[i];
      const { mesh, geo, mat } = this.bars[i];
      mesh.visible = p.sx > 0.002 && p.sy > 0.002;
      mesh.position.set(p.x, p.y + s.bump[i], p.z);
      mesh.rotation.set(p.rx, p.ry, p.rz);
      mesh.scale.set(Math.max(p.sx, 1e-4), Math.max(p.sy, 1e-4), 1);
      geo.update({ lift: p.lift, extend: 0, front: 1 });
      mat.uniforms.uFlash.value = s.flash;
      mat.uniforms.uCam.value.copy(camera.position);
    }
    this.group.scale.z = Math.max(s.flatten, 0.001);
    this.group.updateMatrixWorld();

    this.sparks.update(s.spark, res, px);
  }
}
