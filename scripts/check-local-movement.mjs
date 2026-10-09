import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../batch-size/physics.js', import.meta.url), 'utf8'), context);

// Check the linked local movement views and their fixed baseline arrows.
const article = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const id of ['local-movement-quadratic', 'scaling-chart']) {
  assert.equal(article.split(`id="${id}"`).length - 1, 1, `${id} must have its own rendering target.`);
}
const app = fs.readFileSync(new URL('../batch-size/app.js', import.meta.url), 'utf8');
const localStart = app.indexOf('function drawMovementQuadratic(');
const localEnd = app.indexOf("['scale-alpha','scale-batch']", localStart);
assert.ok(app.slice(app.indexOf('function drawScaling('), localStart).includes('drawMovementQuadratic(alpha,ratio)'), 'Shared controls must redraw the local movement illustration.');
const diagram = { clientWidth: 320, dataset: {}, setAttribute() {} };
const renderer = vm.createContext({
  NQM: context.NQM,
  $: id => { assert.equal(id, 'local-movement-quadratic'); return diagram; },
  colors: { sgd: '#a44530', newton: '#176d63' },
  token: () => '#44546a',
  svgText: (x, y, text, attributes = '') => `<text x="${x}" y="${y}" ${attributes}>${text}</text>`,
  line: (points, x, y) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(p)}`).join(' ')
});
vm.runInContext(app.slice(localStart, localEnd), renderer);
for (const width of [240, 320, 440]) {
  diagram.clientWidth = width;
  let reference;
  for (const alpha of [0, .5, 1]) for (const ratio of [1, 16, 64]) {
    renderer.drawMovementQuadratic(alpha, ratio);
    const arrows = [...diagram.innerHTML.matchAll(/data-movement-arrow="(baseline|scaled)" d="M([\d.-]+) ([\d.-]+)H([\d.-]+)"/g)];
    assert.equal(arrows.length, 4);
    const baseline = arrows.filter(a => a[1] === 'baseline').map(a => a[0]);
    reference ??= baseline;
    assert.deepEqual(baseline, reference, 'Baseline arrows must stay fixed across batch and exponent changes.');
    for (let i = 0; i < 2; i++) {
      const base = arrows[i * 2], scaled = arrows[i * 2 + 1];
      const measuredRatio = (Number(scaled[2]) - Number(scaled[4])) / (Number(base[2]) - Number(base[4]));
      assert.ok(Math.abs(measuredRatio - context.NQM.displacement(i ? .001 : 1, ratio, alpha)) < 1e-10, 'Arrow ratios must match the quantitative movement curve.');
      assert.ok(Number(scaled[4]) >= 0 && Number(scaled[2]) <= width, 'Arrows must fit at narrow widths.');
    }
  }
}
console.log('PASS: local movement arrows match the curve; shared controls update arrow ratios while baseline arrows stay fixed.');
