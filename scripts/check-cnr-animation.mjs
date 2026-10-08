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
