import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/fonts.css';
import './styles/main.css';
import { detect } from './core/capabilities';
import { TOTAL_VH } from './config/scenes';

const caps = detect();
const root = document.documentElement;
root.style.setProperty('--total-vh', String(caps.mobile ? Math.round(TOTAL_VH * 0.8) : TOTAL_VH));

async function startStatic(reason?: string) {
  root.classList.remove('is-webgl');
  root.classList.add('is-static');
  root.dataset.mode = 'static';
  const { startStatic } = await import('./fallback/staticMode');
  startStatic(reason);
}

if (caps.mode === 'webgl') {
  root.dataset.mode = 'webgl';
  import('./app')
    .then((m) => m.start(caps))
    .catch((err) => {
      console.error(err);
      startStatic('error');
    });
} else {
  startStatic(caps.reason);
}
