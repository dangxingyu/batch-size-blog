import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../batch-size/physics.js', import.meta.url), 'utf8'), context);
context.module = { exports: {} };
vm.runInContext(fs.readFileSync(new URL('../batch-size/cnr-animation.js', import.meta.url), 'utf8'), context);
const model = context.module.exports;
const distance = p => Math.hypot(...p.w);

const endpoints = [];
for (const cnr of model.CNRS) {
  for (const batch of [1, 64]) {
    const path = model.trajectory(cnr, batch);
    assert.equal(path.length, model.STEPS + 1);
    assert.deepEqual(Array.from(path[0].w), Array.from(model.START), 'Every path starts at the same point.');
    assert.deepEqual(path, model.trajectory(cnr, batch), 'Replay pairs the same noise draws.');
    for (let k = 0; k < path.length; k++) {
      assert.ok(Math.abs(path[k].loss - distance(path[k]) ** 2 / 2) < 1e-12, 'Both surfaces are the same quadratic.');
      assert.ok(distance(path[k]) < 2.8, 'The complete illustrative path fits inside the displayed bowl without clipping.');
      if (k) for (let axis = 0; axis < 2; axis++) {
        assert.ok(Math.abs(Math.abs(path[k].w[axis] - path[k - 1].w[axis]) - model.STEP_SIZE) < 1e-12, 'Changing batch cannot change the step size.');
      }
    }
    endpoints.push(distance(path.at(-1)));
  }
}
assert.ok(endpoints[0] < .25);
assert.ok(endpoints[2] > 1.4);
assert.ok(endpoints[3] < .7, 'The larger batch reduces wandering in the paired illustration.');

// Check the qualitative behavior across many seeds, not just the displayed path.
for (const cnr of model.CNRS) {
  let small = 0, large = 0;
  for (let seed = 0; seed < 500; seed++) {
    small += distance(model.trajectory(cnr, 1, { seed }).at(-1));
    large += distance(model.trajectory(cnr, 64, { seed }).at(-1));
  }
  assert.ok(large < .65 * small, 'Averaging independent samples reduces final wandering across seeds.');
}

// With zero noise, signs initially point downhill and the first steps follow the gradient.
const noiseless = model.trajectory(Infinity, 1, { steps: 10 });
assert.ok(Math.abs(noiseless.at(-1).w[0] - .7) < 1e-12);
assert.ok(Math.abs(noiseless.at(-1).w[1] - .1) < 1e-12);
assert.ok(noiseless.slice(1).every((p, i) => p.loss < noiseless[i].loss));
console.log('PASS: moving CNR balls use identical bowls, shared starts, fixed SignSGD steps and reproducible paths; larger batches reduce wandering across 500 seeds.');

// Keep the local expected-movement diagram alongside the sampled trajectories.
const article = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const id of ['movement-quadratic', 'local-movement-quadratic', 'scaling-chart']) {
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
console.log('PASS: separate CNR bowls and local movement arrows coexist; shared controls update arrow ratios while baseline arrows stay fixed.');
