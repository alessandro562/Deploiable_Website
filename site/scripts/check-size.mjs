// Limiti di peso (gzip) del bundle: fallisce la build se vengono superati.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(dir);
const gz = (f) => gzipSync(readFileSync(new URL(f, dir))).length / 1024;
const sum = (re) => files.filter((f) => re.test(f)).reduce((s, f) => s + gz(f), 0);

const checks = [
  ['JS di ingresso', sum(/^index-.*\.js$/), 60],
  ['JS animazione (three + gsap)', sum(/^app-.*\.js$/), 190],
  ['CSS', sum(/\.css$/), 20],
];
let ok = true;
for (const [name, kb, max] of checks) {
  const pass = kb <= max;
  ok &&= pass;
  console.log(`${pass ? '✓' : '✗'} ${name.padEnd(30)} ${kb.toFixed(1).padStart(7)} KB gzip (max ${max})`);
}
if (!ok) process.exit(1);
