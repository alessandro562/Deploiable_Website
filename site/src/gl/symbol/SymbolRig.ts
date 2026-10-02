import { Group, Mesh, type ShaderMaterial, type Camera } from 'three';
import type { SceneState } from '../../core/choreography';
import { RIG_POSITION } from '../../core/choreography';
import { BARS, CENTER, UNIT } from './symbolSpec';
import { BarGeometry } from './barGeometry';
import { createBarMaterial } from './barMaterial';

// Le tre barre come supergrafica 3D. phase: 0 viste di testa (corrono lungo -z, "l'autostrada"),
// 1 frontali (il simbolo), 2 appiattite (pronte a diventare il logo piatto del finale).
export class SymbolRig {
  readonly group = new Group();
  readonly bars: { geo: BarGeometry; mesh: Mesh; mat: ShaderMaterial }[] = [];

  constructor() {
    this.group.position.set(...RIG_POSITION);
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      const mat = createBarMaterial();
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.bars.push({ geo, mesh, mat });
    }
  }

  update(s: SceneState, camera: Camera, time: number) {
    const phase = s.rigPhase;
    const turn = Math.min(1, phase);
    this.group.rotation.y = (Math.PI / 2) * (1 - turn);
    // deriva lenta quando è frontale (±3°)
    const drift = turn * (1 - Math.max(0, phase - 1));
    this.group.rotation.y += Math.sin(time * 0.35) * 0.05 * drift;
    this.group.rotation.x = Math.sin(time * 0.27) * 0.025 * drift;
    this.group.scale.z = 1 - 0.97 * Math.max(0, phase - 1);
    this.group.updateMatrixWorld();

    this.bars.forEach((b, i) => {
      const front = s.front[i];
      b.mesh.visible = front > 0.002;
      b.geo.update({ lift: s.lift[i], extend: s.extend, front });
      const spec = BARS[i];
      const headX = spec.x0 + (spec.x1 + s.extend - spec.x0) * front;
      b.mat.uniforms.uHeadX.value = (headX - CENTER[0]) / UNIT;
      b.mat.uniforms.uHead.value = s.head * (front < 0.999 ? 1 : 0.4);
      b.mat.uniforms.uCam.value.copy(camera.position);
    });
  }
}
