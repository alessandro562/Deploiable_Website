import { Color, NoToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';
import { COLORS } from '../config/brand';
import type { Quality } from '../config/quality';

// Renderer semplice: niente bloom, niente vignettatura, niente tone mapping. Il Lime esce identico
// al valore del brand in ogni fotogramma e il fondo è Forest esatto.
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(36, 1, 0.05, 300);
  readonly res = new Vector2(1, 1);
  dpr = 1;
  /** Dimensione (in pixel CSS) con cui è stato impostato il canvas: la camera deve usare la stessa. */
  width = 0;
  height = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    quality: Quality,
    preserve = false,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: preserve,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.scene.background = new Color(COLORS.forest);
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.dprMax);
    this.renderer.setPixelRatio(this.dpr);
    this.resize(true);
  }

  resize(force = false) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Su mobile la barra degli indirizzi cambia l'altezza: si ridimensiona solo per variazioni vere.
    if (!force && w === this.width && Math.abs(h - this.height) < this.height * 0.25) return false;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.res.set(w * this.dpr, h * this.dpr);
    return true;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Attende che la GPU abbia finito di disegnare: serve ai test e al render del video, mai nel ciclo normale. */
  sync() {
    this.renderer.getContext().finish();
  }

  async warmup() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compileAsync non disponibile: si compila al primo frame */
    }
  }
}
