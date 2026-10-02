// Legge gli SVG ufficiali alla radice del repo, toglie i metadati c2pa e produce:
//  - src/generated/brand.json  tracciati del simbolo (3 barre separate) e del logo, per l'HTML e la UI
//  - public/favicon.svg        favicon pulita
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const site = fileURLToPath(new URL('../', import.meta.url));
const read = (f) => readFileSync(root + f, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
const viewBox = (svg) => /viewBox="([^"]+)"/.exec(svg)[1];
const paths = (svg) =>
  [...svg.matchAll(/<path([^>]*)>/g)].map((m) => ({
    d: /\bd="([^"]+)"/.exec(m[1])[1],
    transform: /transform="([^"]+)"/.exec(m[1])?.[1] ?? null,
  }));
const splitBars = (d) => d.split('Z').filter((s) => s.trim()).map((s) => s.trim() + 'Z');

const symbol = read('deploiable-symbol-lime.svg');
const logo = read('deploiable-logo-forest.svg');
const [logoSymbol, logoLettering] = paths(logo);

const brand = {
  symbol: { viewBox: viewBox(symbol), bars: splitBars(paths(symbol)[0].d) },
  logo: {
    viewBox: viewBox(logo),
    bars: splitBars(logoSymbol.d),
    lettering: logoLettering,
  },
};
if (brand.symbol.bars.length !== 3 || brand.logo.bars.length !== 3) throw new Error('Simbolo: attese 3 barre');

mkdirSync(site + 'src/generated', { recursive: true });
writeFileSync(site + 'src/generated/brand.json', JSON.stringify(brand, null, 2));

mkdirSync(site + 'public', { recursive: true });
const favicon = read('favicon.svg')
  .replace(/<\?xml[^>]*>/, '')
  .replace(/\s*xmlns:c2pa="[^"]*"/, '')
  .replace(/\n\s*/g, '');
writeFileSync(site + 'public/favicon.svg', favicon.trim() + '\n');
console.log('brand assets ok');

// Supergrafica tono su tono (Pine su Forest) per la modalità statica.
const superGraphic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brand.symbol.viewBox}"><path fill="#1C3A2A" d="${brand.symbol.bars.join('')}"/></svg>\n`;
writeFileSync(site + 'public/supergraphic.svg', superGraphic);
