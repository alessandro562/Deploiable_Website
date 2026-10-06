// Pagina dell'informativa privacy: stesso stile della landing (fondo Lime, testo Forest), nessun 3D.
// Le due lingue sono due <article lang>: si mostra quella di <html lang> (src/styles/doc.css).
import './styles/fonts.css';
import './styles/main.css';
import './styles/doc.css';
import { initI18n } from './i18n';

initI18n();

// header fisso: scorrendo diventa una barra di vetro, come sulla landing
const onScroll = () => document.documentElement.classList.toggle('is-scrolled', window.scrollY > 2);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
