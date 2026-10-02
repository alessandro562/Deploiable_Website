import { CatmullRomCurve3, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { CAMERA, type SceneState } from '../core/choreography';

// Camera su due curve (posizione e punto di vista) che passano per i keyframe della regia.
// camK è un indice di keyframe continuo; sopra si sommano parallasse del mouse e un leggero respiro.
const curve = (pts: [number, number, number][]) =>
  new CatmullRomCurve3(pts.map((p) => new Vector3(...p)), false, 'centripetal');
const DESIGN_ASPECT = 1.45;
const toRad = Math.PI / 180;

export class CameraRig {
  private readonly desktop = { pos: curve(CAMERA.map((k) => k.pos)), look: curve(CAMERA.map((k) => k.look)) };
  private readonly portrait = {
    pos: curve(CAMERA.map((k) => k.mpos ?? k.pos)),
    look: curve(CAMERA.map((k) => k.mlook ?? k.look)),
  };
  private readonly look = new Vector3();
  private readonly par = new Vector2();
  private readonly tmp = new Vector3();

  constructor(readonly camera: PerspectiveCamera) {}

  update(s: SceneState, pointer: Vector2, time: number) {
    const u = Math.min(1, Math.max(0, s.camK / (CAMERA.length - 1)));
    const aspect = this.camera.aspect;
    const set = aspect < 1 ? this.portrait : this.desktop;
    set.pos.getPoint(u, this.camera.position);
    set.look.getPoint(u, this.look);

    this.par.lerp(pointer, 0.06);
    const breath = Math.sin(time * 0.5) * 0.06;
    this.camera.position.x += this.par.x * 0.35;
    this.camera.position.y += this.par.y * 0.22 + breath;
    this.camera.lookAt(this.look);
    this.camera.rotateZ(s.roll);

    // Su schermi più stretti del formato di progetto si conserva il campo orizzontale.
    let fov = s.fov;
    if (aspect < DESIGN_ASPECT) {
      const h = Math.atan((Math.tan((fov / 2) * toRad) * DESIGN_ASPECT) / aspect) * 2;
      fov = Math.min(92, h / toRad);
    }
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    return this.tmp.copy(this.look);
  }
}
