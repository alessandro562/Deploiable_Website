import { Group, MathUtils, Mesh, PerspectiveCamera, type Scene, type ShaderMaterial } from 'three';
import type { SceneState } from './choreography';
import { BarGeometry } from './symbol/barGeometry';
import { createBarMaterial, setPalette } from './symbol/barMaterial';
import { PALETTES, type PaletteName } from '../config/brand';
import { SYMBOL_H, SYMBOL_W } from './symbol/symbolSpec';
import { LOGO_CENTER, LOGO_W, buildWordmark, type Letter } from './wordmark';

// Quanto del viewport occupa il simbolo assemblato: metà altezza, oppure il 62% della larghezza
// (su telefono in verticale).
export const FIT_HEIGHT = 0.5;
export const FIT_WIDTH = 0.62;

export function fitDistance(fovDeg: number, aspect: number) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const byHeight = SYMBOL_H / (FIT_HEIGHT * 2 * t);
  const byWidth = SYMBOL_W / (FIT_WIDTH * 2 * t * aspect);
  return Math.max(byHeight, byWidth);
}

/** Dove sta il logo nella pagina, in pixel CSS: il segnaposto che la pagina riserva sopra la frase. */
export interface LogoSlot {
  cx: number;
  cy: number;
  w: number;
}

export class Stage {
  readonly group = new Group();
  private readonly bars: { geo: BarGeometry; mesh: Mesh; mat: ShaderMaterial }[] = [];
  private readonly letters: Letter[];
  private readonly letterMat: ShaderMaterial;
  private slot: LogoSlot = { cx: 0, cy: 0, w: 1 };
  private palette: PaletteName | null = null;
  private hidden = false;

  constructor(scene: Scene) {
    for (let i = 0; i < 3; i++) {
      const geo = new BarGeometry(i);
      const mat = createBarMaterial();
      const mesh = new Mesh(geo.geometry, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      this.bars.push({ geo, mesh, mat });
    }
    const word = buildWordmark();
    this.letters = word.letters;
    this.letterMat = word.material;
    for (const l of this.letters) this.group.add(l.mesh);
    scene.add(this.group);
  }

  /** Colori di barre e lettere. Il fondo lo imposta l'app (canvas e pagina insieme). */
  setPalette(name: PaletteName) {
    if (name === this.palette) return;
    this.palette = name;
    for (const b of this.bars) setPalette(b.mat, PALETTES[name]);
    setPalette(this.letterMat, PALETTES[name]);
  }

  /** Il segnaposto del logo cambia con le dimensioni della finestra: la camera finale si adatta. */
  setSlot(slot: LogoSlot) {
    this.slot = slot;
  }

  /** A pagina scorsa il logo dell'header lo mostra l'SVG sopra la barra di vetro: il 3D si nasconde. */
  setHidden(hidden: boolean) {
    this.hidden = hidden;
  }

  /** Rende visibili tutti gli oggetti: serve al disegno di riscaldamento, per compilare ogni shader in anticipo. */
  forceVisible() {
    for (const b of this.bars) b.mesh.visible = true;
    for (const l of this.letters) l.mesh.visible = true;
  }

  apply(s: SceneState, camera: PerspectiveCamera, width: number, height: number) {
    // la camera si aggiorna per prima: le barre usano la sua posizione del fotogramma corrente
    const aspect = width / height;
    const tan = Math.tan((s.fov * Math.PI) / 360);
    // in verticale la scena larga (dispersione delle barre) esce dai lati: l'allontanamento si amplifica
    // e quando le barre sono sparse (le più larghe sono ±9,8 unità) la camera si ritira ancora un po'
    const k = aspect < 1 ? (1 + (s.dist - 1) * 2.2) * (1 + 0.65 * s.spread) : s.dist;
    const dSymbol = fitDistance(s.fov, aspect) * k;
    // Distanza che fa occupare al logo completo esattamente il segnaposto della pagina.
    const dLogo = (LOGO_W * height) / (2 * tan * Math.max(this.slot.w, 1));
    const e = s.pull;
    const d = dSymbol + (dLogo - dSymbol) * e;
    const px = LOGO_CENTER[0] * e;
    const py = LOGO_CENTER[1] * e;
    const cosEl = Math.cos(s.el);
    camera.position.set(px + Math.sin(s.az) * cosEl * d, py + Math.sin(s.el) * d, Math.cos(s.az) * cosEl * d);
    camera.lookAt(px, py, 0);
    camera.fov = s.fov;
    camera.aspect = aspect;
    // lo spostamento (orizzontale e verticale) non cambia la prospettiva: porta il centro del logo dove la pagina lo vuole
    const shiftY = (height / 2 - this.slot.cy) * e;
    const shiftX = (width / 2 - this.slot.cx) * e;
    camera.setViewOffset(width, height, MathUtils.clamp(shiftX, -width, width), MathUtils.clamp(shiftY, -height, height), width, height);
    camera.updateMatrixWorld();

    for (let i = 0; i < 3; i++) {
      const p = s.bars[i];
      const { mesh, geo, mat } = this.bars[i];
      mesh.visible = p.sx > 0.002 && p.sy > 0.002;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.set(p.rx + s.roll[i], p.ry, p.rz);
      mesh.scale.set(Math.max(p.sx, 1e-4), Math.max(p.sy, 1e-4), 1);
      geo.update({ lift: p.lift, extend: 0, front: 1 });
      mat.uniforms.uCam.value.copy(camera.position);
    }
    // Le lettere del naming: ognuna si apre da una linea, sul suo asse orizzontale.
    this.letters.forEach((l, i) => {
      const o = s.letters[i];
      l.mesh.visible = o > 0.002;
      l.mesh.scale.set(1, Math.max(o, 1e-4), 1);
      l.mesh.position.set(l.center[0], l.center[1], 0);
    });
    this.letterMat.uniforms.uCam.value.copy(camera.position);
    this.group.visible = !this.hidden;
    this.group.scale.z = Math.max(s.flatten, 0.001);
    this.group.updateMatrixWorld();
  }
}
