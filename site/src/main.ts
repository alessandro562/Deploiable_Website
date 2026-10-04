import './styles/fonts.css';
import './styles/main.css';
import { detect } from './core/capabilities';

const caps = detect();
const root = document.documentElement;

function startStatic(reason?: string) {
  root.classList.remove('is-webgl');
  root.classList.add('is-static');
  root.dataset.mode = 'static';
  window.__DEPLOIABLE__ = { ready: true, mode: 'static', tier: 'minimal', reason, errors: [] };
}

if (caps.mode === 'webgl') {
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
