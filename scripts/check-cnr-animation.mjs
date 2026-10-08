import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../batch-size/physics.js', import.meta.url), 'utf8'), context);
context.module = { exports: {} };
vm.runInContext(fs.readFileSync(new URL('../batch-size/cnr-animation.js', import.meta.url), 'utf8'), context);
const model = context.module.exports;

// Integrate the Gaussian independently of the erf used by the illustration.
function gaussianProbability(signal, variance) {
  const end = Math.min(8, signal / Math.sqrt(variance));
  const intervals = 2000, step = end / intervals;
  let integral = 1 + Math.exp(-end * end / 2);
  for (let i = 1; i < intervals; i++) {
    integral += (i % 2 ? 4 : 2) * Math.exp(-((i * step) ** 2) / 2);
  }
  return .5 + integral * step / (3 * Math.sqrt(2 * Math.PI));
}

function stationaryVariance(cnr, batch) {
  let variance = 0;
  for (let i = 0; i < 300; i++) {
    variance = .9 ** 2 * variance + .1 ** 2 / (cnr * batch);
  }
  return variance;
}

assert.equal(model.SAMPLE_BUDGET, 64);
for (const cnr of [1, .001]) {
  const baseline = gaussianProbability(1, stationaryVariance(cnr, 1));
  for (const batch of [1, 2, 4, 8, 16, 32, 64]) {
    const variance = stationaryVariance(cnr, batch);
    const probability = gaussianProbability(1, variance);
    const mean = model.stationaryMomentum(cnr, batch, 0);
    assert.equal(mean, 1, 'Both landscapes keep the same curvature and fixed starting position.');
    assert.ok(Math.abs((model.stationaryMomentum(cnr, batch, 1) - mean) ** 2 - variance) < 1e-10);
    for (const alpha of [0, .5, 1]) {
      const state = model.localState(cnr, batch, alpha);
      assert.equal(state.updates, 64 / batch, 'A shared sample budget changes the number of updates.');
      assert.ok(Math.abs(state.probability - probability) < 1e-6);
      const movement = batch ** (alpha - 1) * (2 * probability - 1) / (2 * baseline - 1);
      assert.ok(Math.abs(state.movement - movement) < 1e-5, 'The ruler must agree with local expected movement.');
    }
  }
}

const low = model.sampledSigns(.001, 1, 50000, 271828);
const repeated = model.sampledSigns(.001, 1, 50000, 271828);
assert.deepEqual(low, repeated, 'The illustration is reproducible.');
assert.ok(low.every(sign => sign === 1 || sign === -1));
const observed = low.filter(sign => sign === 1).length / low.length;
assert.ok(Math.abs(observed - gaussianProbability(1, stationaryVariance(.001, 1))) < .006);
const larger = model.sampledSigns(.001, 16, 50000, 271828);
assert.ok(larger.every((sign, i) => sign >= low[i]), 'Larger batches improve direction reliability for paired noise draws.');
assert.ok(model.localState(1, 16, .5).movement < .251);
assert.ok(model.localState(.001, 16, .5).movement > .94);

console.log('PASS: CNR direction probabilities and movement match independent Gaussian/momentum calculations; paired stationary samples and fixed-budget update counts verified.');
