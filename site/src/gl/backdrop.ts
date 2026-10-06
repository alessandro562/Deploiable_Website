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

  /** Riquadro (pixel CSS, coordinate della pagina) occupato dalla supergrafica visibile: per i test. */
  box = { x0: 0, y0: 0, x1: 0, y1: 0, visible: false };

  /**
   * La supergrafica sta nell'angolo in basso a destra dell'hero, tagliata dal bordo destro, e non tocca mai un testo:
   * si cerca la dimensione più grande il cui riquadro (con un margine per rotazione e scivolate) non interseca
   * nessuno dei riquadri dei testi. Scorre con la pagina come l'hero.
   */
  layout(texts: Rect[], width: number, height: number) {
    const ratio = SYMBOL_W / SYMBOL_H;
    const margin = 24 + width * 0.03;
    const boxFor = (h: number) => {
      const w = h * ratio;
      // visibile: dal 75 % della larghezza fino al bordo destro (il resto esce dallo schermo)
      return { x0: width - w * BLEED_IN, y0: height - h, x1: width, y1: height };
    };
    // la supergrafica vive nell'hero (la prima schermata): i testi sotto, come il footer, non la riguardano
    const inHero = texts.filter((r) => r.y0 < height);
    const hits = (h: number) => {
      const b = boxFor(h);
      return inHero.some((r) => r.x0 - margin < b.x1 && r.x1 + margin > b.x0 && r.y0 - margin < b.y1 && r.y1 + margin > b.y0);
    };
    let lo = 0;
    let hi = height * 1.1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (hits(mid)) hi = mid;
      else lo = mid;
    }
    this.sizePx = lo >= Math.max(90, height * 0.14) ? lo : 0;
    this.box = { ...boxFor(this.sizePx), visible: this.sizePx > 0 };
  }

  private sizePx = 0;

  apply(s: SceneState, camera: PerspectiveCamera, width: number, height: number, scrollY: number) {
    const aspect = width / height;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const dist = 100;
    const k = (2 * dist * tan) / height; // unità mondo per pixel sul piano z = 0
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const h = this.sizePx;
    const w = h * (SYMBOL_W / SYMBOL_H);
    const g = (h * k) / SYMBOL_H; // scala del simbolo
    const cx = width - w * BLEED_IN + w / 2;
    const cy = height - h / 2 - scrollY;
    this.group.position.set((cx - width / 2) * k, (height / 2 - cy) * k, 0);
    this.group.rotation.set(s.bgRx, s.bgRy, 0);
    // più sottile del logo: in grande lo spessore pieno diventerebbe un muro, qui deve restare una texture
    this.group.scale.set(g || 1e-4, g || 1e-4, 0.42 * (g || 1e-4));

    // Le barre entrano dal bordo destro lungo l'inclinazione di 8°; nel ciclo scivolano in avanti e tornano.
    const away = (width * k * 1.2) / (g || 1) + SYMBOL_W;
    for (let i = 0; i < 3; i++) {
      const { mesh, mat } = this.bars[i];
      const dx = away * (1 - s.bgIn[i]) + SYMBOL_W * 0.18 * s.bgSlide[i];
      mesh.visible = h > 0 && s.bgIn[i] > 0.001;
      mesh.position.set(PIVOT[i][0] + dx, PIVOT[i][1] + dx * TAN8, 0);
      mat.uniforms.uCam.value.copy(camera.position);
    }
    this.group.updateMatrixWorld();
  }
}

/** Quota della larghezza del simbolo che resta dentro lo schermo (il resto è tagliato dal bordo destro). */
const BLEED_IN = 0.78;

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
