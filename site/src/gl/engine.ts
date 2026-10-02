import { HalfFloatType, NoToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, Color, Vector2, WebGLRenderer } from 'three';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
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
  private ca: ChromaticAberrationEffect | null = null;
  private caPass: EffectPass | null = null;
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
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    noise.blendMode.opacity.value = 0.18;
    composer.addPass(new EffectPass(this.camera, this.bloom, vignette, noise));
    if (q.ca) {
      this.ca = new ChromaticAberrationEffect({ offset: new Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 });
      this.caPass = new EffectPass(this.camera, this.ca);
      composer.addPass(this.caPass);
    }
    this.composer = composer;
  }

  setDpr(dpr: number) {
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.resize(true);
  }

  disableCA() {
    if (this.caPass) this.caPass.enabled = false;
    this.ca = null;
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
    this.camera.updateProjectionMatrix();
    this.res.set(w * this.dpr, h * this.dpr);
    return true;
  }

  render(bloom: number, ca: number, dt: number) {
    if (this.composer) {
      if (this.bloom) this.bloom.intensity = bloom;
      if (this.ca) {
        const o = 0.0022 * ca;
        this.ca.offset.set(o, o * 0.6);
        if (this.caPass) this.caPass.enabled = ca > 0.01;
      }
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  async warmup() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compileAsync non disponibile: si compila al primo frame */
    }
  }
}
