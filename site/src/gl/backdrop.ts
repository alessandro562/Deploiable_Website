import { Group, Mesh, type PerspectiveCamera, type Scene, type ShaderMaterial } from 'three';
import type { SceneState } from './choreography';
import { BarGeometry } from './symbol/barGeometry';
import { createBarMaterial, setPalette } from './symbol/barMaterial';
import { PIVOT, SYMBOL_H, SYMBOL_W, TAN8 } from './symbol/symbolSpec';
import { TONE_PALETTES, type PaletteName } from '../config/brand';

// La supergrafica (brand book, 05 · Elementi grafici): il simbolo ingrandito e tagliato dal bordo, tono su tono,
// a tutto campo e anche dietro al testo. In 3D: faccia frontale nel colore pieno, pareti appena in rilievo.
export class Backdrop {
  private readonly group = new Group();
  private readonly bars: { geo: BarGeometry; mesh: Mesh; mat: ShaderMaterial }[] = [];
  private palette: PaletteName | null = null;

  constructor(scene: Scene) {
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      geo.update({ lift: 1, extend: 0, front: 1 }); // il simbolo assemblato, con il suo gradino
      const mat = createBarMaterial();
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      this.bars.push({ geo, mesh, mat });
    }
    scene.add(this.group);
  }

  setPalette(name: PaletteName) {
    if (name === this.palette) return;
    this.palette = name;
    for (const b of this.bars) setPalette(b.mat, TONE_PALETTES[name]);
  }

  /** Per il disegno di riscaldamento: compila lo shader anche se la supergrafica non è ancora entrata. */
  forceVisible() {
    for (const b of this.bars) b.mesh.visible = true;
  }

  apply(s: SceneState, camera: PerspectiveCamera, width: number, height: number) {
    const aspect = width / height;
    const portrait = aspect < 1;
    // Il simbolo occupa 1,4 volte l'altezza dello schermo (in verticale 0,95: è già molto più largo dello schermo).
    const fill = portrait ? 0.95 : 1.4;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const dist = SYMBOL_H / (fill * 2 * tan);
    const halfH = dist * tan;
    const halfW = halfH * aspect;
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // In basso a destra, tagliato dai bordi.
    const cx = portrait ? halfW * 0.55 : halfW * 0.62;
    const cy = portrait ? -halfH * 0.42 : -halfH * 0.3;
    this.group.position.set(cx, cy, 0);
    this.group.rotation.set(s.bgRx, s.bgRy, 0);
    // più sottile del logo: in grande lo spessore pieno diventerebbe un muro, qui deve restare una texture
    this.group.scale.set(1, 1, 0.3);

    // Le barre entrano dal bordo destro lungo l'inclinazione di 8°; nel ciclo scivolano in avanti e tornano.
    const away = halfW * 2.2 + SYMBOL_W;
    for (let i = 0; i < 3; i++) {
      const { mesh, mat } = this.bars[i];
      const dx = away * (1 - s.bgIn[i]) + SYMBOL_W * 0.18 * s.bgSlide[i];
      mesh.visible = s.bgIn[i] > 0.001;
      mesh.position.set(PIVOT[i][0] + dx, PIVOT[i][1] + dx * TAN8, 0);
      mat.uniforms.uCam.value.copy(camera.position);
    }
    this.group.updateMatrixWorld();
  }
}
