// Modalità statica: stesso testo, scroll nativo, dissolvenze leggere e motion ufficiale del logo
// in CSS. Usata con prefers-reduced-motion, senza WebGL2 o con risparmio dati.
export function startStatic(reason?: string) {
  const blocks = document.querySelectorAll<HTMLElement>('.blk, .finale__logo, .finale');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.2 },
  );
  blocks.forEach((b) => io.observe(b));

  window.__DEPLOIABLE__ = {
    ready: true,
    mode: 'static',
    tier: 'minimal',
    reason,
    errors: [],
  } as DeploiableHooks;
}
