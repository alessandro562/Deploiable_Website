import { Box3, Color, Group, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type ShaderMaterial } from 'three';
import { PALETTES, type Palette } from './config/brand';
import { BarGeometry } from './gl/symbol/barGeometry';
import { createBarMaterial, setPalette } from './gl/symbol/barMaterial';
import { createState, stateAt } from './gl/choreography';
import { SILENZIO_A } from './gl/timeline';

// Il simbolo della hero: le stesse tre barre dell'intro, nella posa assemblata. Si accendono una alla volta,
// restano accese insieme, poi si spengono e il ciclo riparte. Su Lime il simbolo è Forest: acceso = Forest pieno,
// spento = Forest diluito nel Lime.

const PERIOD = 4.6; // secondi per ciclo
const RAMP = 0.5; // durata dell'accensione (e dello spegnimento)
const START = [0.5, 1.1, 1.7]; // quando si accende ciascuna barra
const HOLD_UNTIL = 3.0; // fino a quando restano tutte accese

const OFF_MIX = 0.82; // quanto il Forest sbiadisce verso il Lime quando la barra è spenta

const mixHex = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();

/** Miscela due palette: spenta (a) e accesa (b). */
function blend(a: Palette, b: Palette, t: number): Palette {
  return {
    background: b.background,
    front: mixHex(a.front, b.front, t),
    top: mixHex(a.top, b.top, t),
    bottom: mixHex(a.bottom, b.bottom, t),
    side: [mixHex(a.side[0], b.side[0], t), mixHex(a.side[1], b.side[1], t), a.side[2] + (b.side[2] - a.side[2]) * t],
    back: [mixHex(a.back[0], b.back[0], t), mixHex(a.back[1], b.back[1], t), a.back[2] + (b.back[2] - a.back[2]) * t],
    rim: mixHex(a.rim, b.rim, t),
    rimAmount: a.rimAmount + (b.rimAmount - a.rimAmount) * t,
    cap: b.cap,
    ambient: b.ambient,
    diffuse: b.diffuse,
  };
}

/** Quanto è accesa la barra i al tempo t (0 spenta, 1 accesa). */
export function litAt(t: number, i: number): number {
  const local = ((t % PERIOD) + PERIOD) % PERIOD;
  const on = Math.min(1, Math.max(0, (local - START[i]) / RAMP));
  const off = Math.min(1, Math.max(0, (local - HOLD_UNTIL) / RAMP));
  return on * (1 - off);
}

const ON = PALETTES.lime; // barre Forest su Lime
const OFF: Palette = blend(ON, { ...ON, front: PALETTES.lime.background, top: PALETTES.lime.background, bottom: PALETTES.lime.background, side: [PALETTES.lime.background, PALETTES.lime.background, 0], back: [PALETTES.lime.background, PALETTES.lime.background, 0], rim: PALETTES.lime.background, rimAmount: 0 }, OFF_MIX);

/**
 * Avvia il simbolo nella colonna della hero. Restituisce una funzione che lo ferma.
 * Con il movimento ridotto le tre barre restano accese e non c'è nessun ciclo.
 */
export function startHeroSymbol(host: HTMLElement, canvas: HTMLCanvasElement, reduced: boolean): () => void {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 500);
  const group = new Group();
  scene.add(group);

  // la posa assemblata del simbolo, come la lascia l'intro
  const pose = stateAt(SILENZIO_A, createState());
  const bars: { mesh: Mesh; mat: ShaderMaterial }[] = [];
  for (let i = 0; i < 3; i++) {
    const geo = new BarGeometry(i);
    const p = pose.bars[i];
    geo.update({ lift: p.lift, extend: 0, front: 1 });
    const mat = createBarMaterial();
    const mesh = new Mesh(geo.geometry, mat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.set(p.rx, p.ry, p.rz);
    mesh.scale.set(p.sx, p.sy, 1);
    mesh.frustumCulled = false;
    group.add(mesh);
    bars.push({ mesh, mat });
  }
  // inquadratura: il simbolo centrato e della dimensione giusta per la colonna
  group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(group);
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  group.position.sub(center);
  const fit = Math.max(size.x, size.y) * 0.62;
  camera.position.set(0, 0, fit / Math.tan((camera.fov * Math.PI) / 360));

  let width = 0;
  let height = 0;
  const resize = () => {
    const r = host.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const paint = (t: number) => {
    for (let i = 0; i < 3; i++) {
      const lit = reduced ? 1 : litAt(t, i);
      setPalette(bars[i].mat, blend(OFF, ON, lit));
      bars[i].mat.uniforms.uCam.value.copy(camera.position);
    }
    renderer.render(scene, camera);
  };

  if (reduced) {
    paint(0);
    return () => {
      ro.disconnect();
      renderer.dispose();
    };
  }

  // il ciclo gira solo quando il simbolo è in vista
  let visible = true;
  const io = new IntersectionObserver((es) => (visible = es[0].isIntersecting));
  io.observe(host);
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    paint((now - t0) / 1000);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    renderer.dispose();
  };
}
