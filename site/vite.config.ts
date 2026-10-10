import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Inietta nell'HTML il logo e il simbolo ufficiali (generati da scripts/prepare-brand-assets.mjs),
// così il logo è presente anche senza JavaScript.
function brandHtml(): Plugin {
  return {
    name: 'deploiable-brand-html',
    transformIndexHtml(html) {
      const brand = JSON.parse(readFileSync(new URL('./src/generated/brand.json', import.meta.url), 'utf8'));
      const bars = (list: string[]) => list.map((d, i) => `<path class="bar bar-${i + 1}" d="${d}"/>`).join('');
      const logo = (cls: string, title: string) =>
        `<svg class="${cls}" viewBox="${brand.logo.viewBox}" role="img" aria-label="${title}" fill="currentColor">` +
        `<g class="logo-symbol">${bars(brand.logo.bars)}</g>` +
        `<path class="logo-lettering" transform="${brand.logo.lettering.transform}" d="${brand.logo.lettering.d}"/></svg>`;
      const wordmark = (cls: string) =>
        `<svg class="${cls}" viewBox="${brand.logo.viewBox}" aria-hidden="true" fill="currentColor">` +
        `<path class="logo-lettering" transform="${brand.logo.lettering.transform}" d="${brand.logo.lettering.d}"/></svg>`;
      const symbol = (cls: string) =>
        `<svg class="${cls}" viewBox="${brand.symbol.viewBox}" aria-hidden="true" fill="currentColor">${bars(brand.symbol.bars)}</svg>`;
      return html
        .replace(/<!--\s*logo:(\w[\w-]*)\s*-->/g, (_, cls) => logo(cls, 'Deploiable'))
        .replace(/<!--\s*wordmark:(\w[\w-]*)\s*-->/g, (_, cls) => wordmark(cls))
        .replace(/<!--\s*symbol:(\w[\w-]*)\s*-->/g, (_, cls) => symbol(cls));
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [brandHtml()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    // due pagine: la landing e l'informativa privacy
    rollupOptions: { input: { main: 'index.html', privacy: 'privacy.html' } },
  },
  server: { host: true },
});
