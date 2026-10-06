import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/);
assert.ok(bootstrap, 'Theme initialization must be present.');
assert.ok(bootstrap.index < html.indexOf('rel="stylesheet"'),
  'Restore the saved theme before loading stylesheets.');

for (const [saved, theme, color] of [
  ['dark', 'dark', '#101d32'],
  ['light', 'light', '#ffffff'],
  [null, 'light', '#ffffff'],
  ['invalid', 'light', '#ffffff'],
  ['blocked', 'light', '#ffffff'],
]) {
  const root = { dataset: {} };
  const meta = { content: '#ffffff' };
  vm.runInNewContext(bootstrap[1], {
    document: {
      documentElement: root,
      querySelector(selector) {
        assert.equal(selector, 'meta[name="theme-color"]');
        return meta;
      },
    },
    localStorage: {
      getItem(key) {
        assert.equal(key, 'batchsize-theme');
        if (saved === 'blocked') throw new Error('Storage unavailable');
        return saved;
      },
    },
  });
  assert.equal(root.dataset.theme, theme);
  assert.equal(meta.content, color, 'Browser chrome must match the restored page theme.');
}
console.log('PASS: light/dark theme and browser color initialize together before styles load; missing, invalid and blocked storage retain the light default.');
