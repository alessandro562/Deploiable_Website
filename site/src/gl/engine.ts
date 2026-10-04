import { HalfFloatType, NoToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, Color, Vector2, WebGLRenderer } from 'three';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  type Effect,
  EffectComposer,
  EffectPass,
  RenderPass,
  VignetteEffect,
} from 'postprocessing';
import { COLORS } from '../config/brand';
import type { Quality } from '../config/quality';

export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 1, 0.05, 300);
  readonly res = new Vector2(1, 1);
  dpr = 1;
  private composer: EffectComposer | null = null;
  private bloom: BloomEffect | null = null;
  private vignette: VignetteEffect | null = null;
  private ca: ChromaticAberrationEffect | null = null;
  private width = 0;
  private height = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private quality: Quality,
    preserve = false,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: !quality.post && quality.tier !== 'minimal',
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
    if (quality.post) this.setupPost();
    this.resize(true);
  }

  private setupPost() {
    const q = this.quality;
    const composer = new EffectComposer(this.renderer, {
      frameBufferType: HalfFloatType,
      multisampling: q.msaa,
    });
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.78,
      luminanceSmoothing: 0.12,
      intensity: 1,
      radius: 0.72,
      levels: q.bloomLevels,
    });
    const vignette = new VignetteEffect({ offset: 0.38, darkness: 0.55 });
    this.vignette = vignette;
    // Un solo passaggio per bloom, vignettatura e aberrazione cromatica. L'aberrazione non si disattiva mai:
    // in questa libreria solo l'ultimo passaggio scrive sullo schermo, e uno spento lascerebbe il canvas vuoto.
    // Si regola solo l'intensità (a zero non cambia nulla).
    const effects: Effect[] = [this.bloom, vignette];
    if (q.ca) {
      this.ca = new ChromaticAberrationEffect({ offset: new Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 });
      effects.push(this.ca);
    }
    composer.addPass(new EffectPass(this.camera, ...effects));
    this.composer = composer;
  }

  setDpr(dpr: number) {
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
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
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.res.set(w * this.dpr, h * this.dpr);
    return true;
  }

  render(bloom: number, ca: number, vignette: number, dt: number) {
    if (this.composer) {
      if (this.bloom) this.bloom.intensity = bloom;
      if (this.vignette) this.vignette.darkness = 0.55 * vignette;
      if (this.ca) {
        const o = 0.0022 * ca;
        this.ca.offset.set(o, o * 0.6);
      }
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
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
