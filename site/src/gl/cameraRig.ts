import { CatmullRomCurve3, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { CAMERA, type SceneState } from '../core/choreography';

// Camera su due curve (posizione e punto di vista) che passano per i keyframe della regia.
// camK è un indice di keyframe continuo; sopra si sommano parallasse del mouse e un leggero respiro.
export class CameraRig {
  private readonly posCurve = new CatmullRomCurve3(CAMERA.map((k) => new Vector3(...k.pos)), false, 'centripetal');
  private readonly lookCurve = new CatmullRomCurve3(CAMERA.map((k) => new Vector3(...k.look)), false, 'centripetal');
  private readonly look = new Vector3();
  private readonly par = new Vector2();
  private readonly tmp = new Vector3();

  constructor(readonly camera: PerspectiveCamera) {}

  update(s: SceneState, pointer: Vector2, time: number) {
    const u = Math.min(1, Math.max(0, s.camK / (CAMERA.length - 1)));
    this.posCurve.getPoint(u, this.camera.position);
    this.lookCurve.getPoint(u, this.look);

    this.par.lerp(pointer, 0.06);
    const breath = Math.sin(time * 0.5) * 0.06;
    this.camera.position.x += this.par.x * 0.35;
    this.camera.position.y += this.par.y * 0.22 + breath;
    this.camera.lookAt(this.look);
    this.camera.rotateZ(s.roll);

    if (Math.abs(this.camera.fov - s.fov) > 1e-3) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    return this.tmp.copy(this.look);
  }
}
