import './styles/fonts.css';
import './styles/main.css';
import './styles/sections.css';
import { detect } from './core/capabilities';
import { initI18n } from './i18n';

initI18n();
const caps = detect();
const root = document.documentElement;
const q = new URLSearchParams(location.search);
// movimento ridotto: racconto e sezioni fermi (immagini statiche dello stesso sistema); ?motion=reduced per la QA
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || q.get('motion') === 'reduced';
// le sezioni (src/sections.ts) non dipendono dal 3D: si caricano sempre
import('./sections').then((m) => m.initSections({ reduced }));

function startStatic(reason?: string) {
  root.classList.remove('is-webgl');
  root.classList.add('is-static');
  root.dataset.mode = 'static';
  root.dataset.palette = 'lime'; // la versione statica è il finale: logo Forest su Lime
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#C8F25A');
  window.__DEPLOIABLE__ = { ready: true, mode: 'static', tier: 'minimal', reason, errors: [] };
}

if (caps.mode === 'webgl') {
  // l'intro parte sempre dall'alto: il browser non deve ripristinare lo scorrimento della visita precedente
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);
  root.dataset.mode = 'webgl';
  root.classList.add('is-webgl'); // subito: il canvas Forest copre la pagina mentre il 3D si prepara
  import('./app')
    .then((m) => m.start(caps))
    .catch((err) => {
      console.error(err);
      startStatic('error');
    });
} else {
  startStatic(caps.reason);
}
