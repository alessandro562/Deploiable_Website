import { Color, NoToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';
import { COLORS } from '../config/brand';
import type { Quality } from '../config/quality';

// Renderer semplice: niente bloom, niente vignettatura, niente tone mapping. Il Lime esce identico
// al valore del brand in ogni fotogramma e il fondo è Forest esatto.
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  /** Il fondo: colore pieno e supergrafica, con una camera propria (non segue zoom e pan del logo). */
  readonly bgScene = new Scene();
  readonly bgCamera = new PerspectiveCamera(30, 1, 1, 4000);
  readonly camera = new PerspectiveCamera(36, 1, 1, 2000);
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
    this.bgScene.background = new Color(COLORS.forest);
    this.renderer.autoClear = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.dprMax);
    this.renderer.setPixelRatio(this.dpr);
    this.resize(true);
  }

  // Il canvas è sempre alto quanto lo schermo più grande (100lvh: barre del browser ritirate). Su telefono,
  // quando la barra degli indirizzi entra o esce, l'area visibile cambia ma lo schermo grande no: il canvas
  // copre sempre tutto, non si rialloca e sotto non compare mai la pagina.
  private readonly probe = (() => {
    const d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
    document.body.appendChild(d);
    return d;
  })();

  resize(force = false) {
    const w = window.innerWidth;
    const h = Math.max(this.probe.offsetHeight, window.innerHeight);
    if (!force && w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    // lo stile lo dà il CSS (100vw × 100lvh): qui solo la risoluzione del disegno
    this.renderer.setSize(w, h, false);
    document.documentElement.style.setProperty('--gl-h', `${h}px`);
    this.camera.aspect = w / h;
    this.res.set(w * this.dpr, h * this.dpr);
    return true;
  }

  /** extra: un passaggio disegnato sopra a tutto (il racconto a scorrimento sotto l'hero). */
  render(extra?: () => void) {
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCamera);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
    extra?.();
  }

  /** Attende che la GPU abbia finito di disegnare: serve ai test e al render del video, mai nel ciclo normale. */
  sync() {
    this.renderer.getContext().finish();
  }

  async warmup() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
      await this.renderer.compileAsync(this.bgScene, this.bgCamera);
    } catch {
      /* compileAsync non disponibile: si compila al primo frame */
    }
  }
}
