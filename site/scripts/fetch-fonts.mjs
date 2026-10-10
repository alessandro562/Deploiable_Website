// Scarica Satoshi (Fontshare, licenza ITF FFL: uso commerciale e self-hosting consentiti)
// in public/fonts/. I file vengono committati: lo script serve solo per aggiornarli.
// Usa curl perché rispetta HTTPS_PROXY senza configurazioni extra.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WEIGHTS = [300, 500, 700, 900];
const CSS_URL = `https://api.fontshare.com/v2/css?f[]=satoshi@${WEIGHTS.join(',')}&display=swap`;
const outDir = fileURLToPath(new URL('../src/assets/fonts/', import.meta.url));
const curl = (...args) => execFileSync('curl', ['-sSfL', '--retry', '4', '--retry-all-errors', ...args], { maxBuffer: 1 << 24 });

mkdirSync(outDir, { recursive: true });
const css = curl(CSS_URL).toString();

for (const block of css.split('@font-face').slice(1)) {
  const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
  const url = /url\('([^']+\.woff2)'\)/.exec(block)?.[1];
  if (!weight || !url) continue;
  const file = `${outDir}satoshi-${weight}.woff2`;
  curl('-o', file, url.startsWith('//') ? `https:${url}` : url);
  console.log(`satoshi-${weight}.woff2  ${(statSync(file).size / 1024).toFixed(1)} KB`);
}
