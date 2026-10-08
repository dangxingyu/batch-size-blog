import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// One unsupported element stops math-render.js and leaves every later formula untypeset.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const renderer = read('../batch-size/math-render.js');
const supported = new Set([...renderer.matchAll(/case '(m[a-z]*)'/g)].map(match => match[1]));
const mathml = /<(math|maction|menclose|merror|mfrac|mi|mmultiscripts|mn|mo|mover|mpadded|mphantom|mroot|mrow|ms|mspace|msqrt|mstyle|msub|msubsup|msup|mtable|mtd|mtext|mtr|munder|munderover)[\s>/]/g;
const sources = ['../index.html', ...readdirSync(new URL('../batch-size/', import.meta.url))
  .filter(name => name.endsWith('.js')).map(name => '../batch-size/' + name)];

let count = 0;
for (const source of sources) {
  for (const [, element] of read(source).matchAll(mathml)) {
    assert.ok(supported.has(element), `${source.slice(3)} uses <${element}>, which math-render.js cannot typeset.`);
    count++;
  }
}
assert.ok(count > 0, 'Expected MathML in the article sources.');
console.log(`PASS: all ${count} MathML elements in the article and scripts use the ${supported.size} elements math-render.js typesets.`);
