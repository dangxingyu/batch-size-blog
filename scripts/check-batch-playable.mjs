import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../batch-size/', import.meta.url));
const context = vm.createContext({ setTimeout, clearTimeout });
for (const name of ['physics.js', 'phase-compute.js']) {
  vm.runInContext(fs.readFileSync(path.join(assets, name), 'utf8'), context);
}
const { PhaseMap, NQM } = context;

// An independent moment recurrence checks the numerical values crossing the worker boundary.
function recurrence(config, method, eta, steps = NQM.T / config.batch) {
  let loss = 0;
  for (let direction = 0; direction < 2; direction++) {
    const curvature = direction ? config.sharp : 1;
    const noise = direction ? 0 : config.noise;
    const step = method === 'newton' ? eta / curvature : eta;
    const contraction = 1 - step * curvature;
    let mean = config.start[direction], variance = 0;
    for (let update = 0; update < steps; update++) {
      mean *= contraction;
      variance = contraction ** 2 * variance + step ** 2 * noise / config.batch;
    }
    loss += .5 * curvature * (mean ** 2 + variance);
  }
  return loss;
}
function verify(cells, geometry) {
  assert.equal(cells.length, 104);
  cells.forEach((cell, index) => {
    assert.equal(cell.row, Math.floor(index / 13));
    assert.equal(cell.exponent, index % 13);
    const config = { ...geometry, batch: 2 ** cell.exponent, noise: cell.noise };
    for (const method of ['sgd', 'newton']) {
      const tuned = cell[method];
      assert.ok(tuned.eta >= 0 && tuned.eta < 2 / (method === 'sgd' ? geometry.sharp : 1));
      const expected = recurrence(config, method, tuned.eta);
      assert.ok(Math.abs(tuned.total - expected) <= 1e-13 + 1e-10 * expected,
        `${method} / batch ${config.batch} / noise ${config.noise}: ${tuned.total} vs ${expected}`);
      const reference = NQM.tune(config, method);
      assert.equal(tuned.total, reference.total);
      assert.equal(tuned.eta, reference.eta);
    }
    const low = Math.min(cell.sgd.total, cell.newton.total), high = Math.max(cell.sgd.total, cell.newton.total);
    const tied = high < 1e-14 || Math.abs(cell.sgd.total - cell.newton.total) / Math.max(high, 1e-14) < .02;
    assert.equal(cell.tied, tied);
    assert.equal(cell.winner, tied ? 'Close or tied' : cell.sgd.total < cell.newton.total ? 'SGD' : 'Newton');
    assert.ok(Number.isFinite(high / Math.max(low, 1e-300)));
  });
}

for (const geometry of [
  { sharp: 20, start: [1, 1] }, { sharp: 20, start: [1, 0] },
  { sharp: 20, start: [0, 1] }, { sharp: 60, start: [-.7, .6] },
  { sharp: 2, start: [0, 0] }
]) {
  let yields = 0;
  const cells = await PhaseMap.compute(geometry, { yieldTask: async () => { yields++; } });
  assert.equal(yields, 7);
  verify(cells, geometry);
}
// Continuation leaves the paper comparison intact and reaches the noise floor.
for(const sharp of [2,20,60])for(const noise of [0,8,80])for(const batch of [1,256,4096]) {
  const config={sharp,noise,batch,start:[1,1]};
  const tuned={sgd:NQM.tune(config,'sgd'),newton:NQM.tune(config,'newton')};
  const steps=NQM.settlingSteps(config,tuned);
  assert(Number.isInteger(steps)&&steps>=192&&steps>=4*NQM.T/batch&&steps<=32768);
  for(const method of ['sgd','newton']) {
    const eta=tuned[method].eta, result=NQM.moments(config,method,eta,steps);
    const independent=recurrence(config,method,eta,steps);
    assert(Math.abs(result.total-independent)<1e-11);
    const q=(1-eta)**2;
    const stationary=eta===0?0:.5*eta*eta*noise/batch/(1-q);
    const tolerance=Math.max((1+sharp)*.5e-8,stationary*.005,1e-12);
    assert(result.bias<=tolerance*(1+1e-7),'Extended trajectories reach the stationary-noise regime.');
  }
}
for(const batch of [1,256,4096]) {
  const config={batch,sharp:20,noise:8,start:[1,1]};
  const tuned={sgd:NQM.tune(config,'sgd'),newton:NQM.tune(config,'newton')};
  const steps=NQM.settlingSteps(config,tuned);
  for(const method of ['sgd','newton']) {
    const original=NQM.trajectory(config,method,tuned[method].eta,7);
    const continued=NQM.trajectory(config,method,tuned[method].eta,7,steps);
    assert.equal(JSON.stringify(continued.slice(0,original.length)),JSON.stringify(original),'All original-budget updates remain identical.');
    assert.equal(continued.at(-1).samples,steps*batch);
  }
}
console.log('PASS: extended runs approach stationary noise without changing the 4K comparison or original trajectory prefixes.');
let current = true, completed = 0;
const cancelled = await PhaseMap.compute({ sharp: 20, start: [1, 1] }, {
  isCurrent: () => current,
  onProgress: count => { completed = count; current = false; }
});
assert.equal(cancelled, null);
assert.equal(completed, 13, 'A superseded fallback stops after its current row.');

// Exercise the production controller's return-to-current-map branch with a pending job.
// It must immediately restore the existing map and invalidate the obsolete reply.
const controllerSource = fs.readFileSync(path.join(assets, 'playable.js'), 'utf8');
const requestSource = controllerSource.slice(controllerSource.indexOf('  function requestPhaseMap()'),
  controllerSource.indexOf('  function updatePhaseSelection()'));
const controller = vm.createContext({ PhaseMap, clearTimeout });
vm.runInContext(`
  let phaseVisible = true, mapKey = '20:1,1', pendingKey = '20:1,0', jobId = 2, jobTimeout = 0;
  const sim = { sharp: 20, start: [1, 1] };
  let busy = true, selectionUpdates = 0;
  function scaffoldPhaseMap() {}
  function setPhaseBusy(value) { busy = value; }
  function updatePhaseSelection() { selectionUpdates++; }
  ${requestSource}
  requestPhaseMap();
  globalThis.restored = { busy, pendingKey, jobId, selectionUpdates };
  requestPhaseMap();
  globalThis.repeatedJobId = jobId;
`, controller);
assert.equal(controller.restored.busy, false, 'Returning to the current map enables its cells.');
assert.equal(controller.restored.pendingKey, '');
assert.equal(controller.restored.jobId, 3, 'The superseded job cannot publish its reply.');
assert.equal(controller.restored.selectionUpdates, 1);
assert.equal(controller.repeatedJobId, 3, 'An unchanged idle map starts no extra jobs.');

// Execute the production worker, with browser primitives supplied by a real Node worker thread.
const bootstrap = `
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const {parentPort,workerData}=require('node:worker_threads');
  const context=vm.createContext({setTimeout,clearTimeout,performance,postMessage:data=>parentPort.postMessage(data)});
  context.self=context;
  context.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(workerData,file),'utf8'),context));
  vm.runInContext(fs.readFileSync(path.join(workerData,'phase-worker.js'),'utf8'),context);
  parentPort.on('message',data=>context.onmessage({data}));
`;
const worker = new Worker(bootstrap, { eval: true, workerData: assets });
const finalGeometry = { sharp: 60, start: [0, 1] }, resultIds = [];
try {
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Phase worker did not finish.')), 10000);
    worker.on('error', error => { clearTimeout(timeout); reject(error); });
    worker.on('message', data => {
      if (data.error) { clearTimeout(timeout); reject(new Error(data.error)); }
      if (data.cells) {
        resultIds.push(data.id);
        if (data.id === 8) { clearTimeout(timeout); resolve(data); }
      }
    });
    for (let id = 1; id <= 8; id++) worker.postMessage({ id,
      config: id === 8 ? finalGeometry : { sharp: 10 + id, start: [1, 1] } });
  });
  assert.deepEqual(resultIds, [8], 'Rapid changes publish only the newest geometry.');
  assert.equal(result.key, '60:0,1');
  verify(result.cells, finalGeometry);
  console.log(`PASS: 624 cells checked against independent moments; worker cancellation and cooperative fallback verified (${result.computeMs.toFixed(1)} ms for the final worker map).`);
} finally { await worker.terminate(); }

await import('./check-batch-render.mjs');

await import("./check-scaling-rule-data.mjs");
