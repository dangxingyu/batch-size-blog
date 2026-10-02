import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../batch-size/rule-axis.js', import.meta.url), 'utf8'), context);
const { domains, lossRank, scaleUpSetting } = context.window.RuleAtlasAxis;
const data = JSON.parse(readFileSync(new URL('../batch-size/data/scaling-rules.json', import.meta.url), 'utf8'));
const original = JSON.stringify(data);
const settings = Object.fromEntries(Object.entries(data.settings).map(([key,value])=>[key,scaleUpSetting(value)]));
assert.deepEqual(Array.from(settings.cifar.batches), [512,1024,2048,4096]);
assert.equal(settings.cifar.referenceBatch,256);
assert.equal(settings.cifar.measurementCount,2592);
assert.equal(settings.cifar.commonRuleId,'mlrq-alrf-mmf-b1s-b2f-mwdf-awdf');
assert.equal(settings.llm.commonRuleId,data.settings.llm.commonRuleId);
assert.deepEqual(Array.from(settings.llm.trainSteps),data.settings.llm.trainSteps);
for (const [key,setting] of Object.entries(settings)) {
  const source = data.settings[key];
  assert(setting.batches.every(batch=>batch>setting.referenceBatch));
  for (const rule of setting.rules) {
    const originalRule = source.rules.find(r=>r.id===rule.id);
    setting.batches.forEach((batch,i)=>assert.equal(rule.losses[i],originalRule.losses[source.batches.indexOf(batch)]));
    const mean = rule.losses.reduce((sum,loss,i)=>sum+loss-setting.gridMinimum[i],0)/4;
    assert(Math.abs(rule.meanRegret-mean)<1e-12);
    assert(rule.meanRegret>=setting.rules[0].meanRegret);
  }
  setting.batches.forEach((_,i)=>assert.equal(setting.rules.find(r=>r.id===setting.bestAtBatch[i]).losses[i],setting.gridMinimum[i]));
}
assert.equal(JSON.stringify(data),original,'Filtering the display must preserve all downloadable measurements and paper ranks.');
console.log('PASS: scale-up cohorts exclude smaller batches, retain measured values, recalculate selection, and preserve original downloads.');
let checked = 0;
for (const [name, setting] of Object.entries(settings)) {
  const best = setting.batches.map((_, i) => Math.min(setting.gridMinimum[i], setting.retunedBaseline[i]?.loss ?? Infinity));
  for (const zero of [true, false]) {
    const references = zero ? [0,...best.map(() => 0)] : [setting.referenceLoss,...best];
    const values = setting.rules.flatMap(rule => rule.losses.map((loss, i) => zero ? loss - best[i] : loss));
    for (const rule of setting.rules) {
      const selected = [zero?0:setting.referenceLoss,...rule.losses.map((loss, i) => zero ? loss - best[i] : loss)];
      const { full, detail } = domains(values, references, selected, zero);
      assert(values.every(v => v >= full.bottom - 1e-12 && v <= full.top + 1e-12), 'Full range retains every original endpoint.');
      assert([...selected, ...references].every(v => v >= detail.bottom - 1e-12 && v <= detail.top + 1e-12), 'The full selected curve and baseline fit inside the detail plot.');
      assert(detail.top <= full.top && detail.bottom >= full.bottom, 'Detail stays inside the unchanged full range.');
      for (const scale of [full, detail]) {
        assert(Number.isFinite(scale.top) && scale.top > scale.bottom && scale.step > 0);
        if (zero) assert.equal(scale.bottom, 0, 'A nonnegative gap starts at the unchanged best-loss reference.');
      }
      checked++;
    }
  }
  const values = setting.rules.flatMap(rule => rule.losses.map((loss, i) => loss - best[i]));
  const selected = setting.rules[0].losses.map((loss, i) => loss - best[i]);
  const common = domains(values, best.map(() => 0), selected, true);
  assert(common.detail.top < common.full.top / 10, 'The best-common-rule view resolves differences compressed by extreme runs.');
}
console.log(`PASS: ${checked} rule/view combinations retain all endpoints in the overview and Full range, and fit the selected curve on linear axes.`);

// Loss ranks use the current batch: the best loss ranks first and ties share a rank.
assert.equal(lossRank([1,2,2,4],1),1);
assert.equal(lossRank([1,2,2,4],2),2);
assert.equal(lossRank([1,2,2,4],4),4);
for (const setting of Object.values(data.settings)) {
  for (let i=0;i<setting.batches.length;i++) {
    const losses=setting.rules.map(r=>r.losses[i]);
    const minimum=Math.min(...losses);
    for (const loss of losses) {
      const expected=1+losses.reduce((n,v)=>n+Number(v<loss),0);
      assert(Math.abs(lossRank(losses,loss)-expected)<1e-12);
      assert(Math.abs(lossRank(losses.map(v=>v-minimum),loss-minimum)-expected)<1e-12,'Loss and loss-gap views report the same loss rank.');
    }
  }
}
console.log('PASS: batch-specific loss ranks start at 1 and preserve ties and do not change plot ranges.');

// Drive the production animation with a deterministic frame clock. Endpoint
// holds must leave the measured batch and readout unchanged while readers compare.
const source = readFileSync(new URL('../batch-size/scaling-rules.js', import.meta.url), 'utf8');
const motion = vm.createContext({document:{hidden:false},requestAnimationFrame:()=>1,cancelAnimationFrame(){},reducedMotion:{matches:false}});
vm.runInContext(`
  const state={running:true,visible:true,frame:0,last:0,elapsed:0,holding:true,from:0,to:1,index:0};
  const element={dataset:{},setAttribute(){}};
  const node=()=>element, indices=()=>[0,1,2,3];
  let position=0;
  const cursor=p=>position=p;
  const updateBatch=i=>{state.index=i;cursor(i);};
  ${source.slice(source.indexOf('  function pause()'), source.indexOf('  function setTask('))}
`, motion);
const frames = [];
for (let ts=1000;ts<=23000;ts+=50) frames.push(vm.runInContext(`step(${ts});({ts:${ts},position,index:state.index,running:state.running})`, motion));
assert(frames.filter(f=>f.ts<=3000).every(f=>f.position===0 && f.index===0), 'Playback holds the starting measurement for two seconds.');
assert(frames.find(f=>f.ts===4600).position < .5, 'After the old 1.6-second transition, the new cursor has not yet passed halfway.');
assert(frames.filter(f=>f.ts>=7500 && f.ts<=9500).every(f=>f.position===1 && f.index===1), 'Each reached measurement holds its exact curve point and loss readout for two seconds.');
assert(frames.filter(f=>f.ts<22500).every(f=>f.running), 'The last endpoint also gets a full reading pause.');
assert.equal(frames.at(-1).position,3);
assert.equal(frames.at(-1).running,false);
for (let i=1;i<frames.length;i++) assert(frames[i].position>=frames[i-1].position, 'The batch cursor never moves backward.');
vm.runInContext('state.running=true;state.index=0;state.from=0;state.to=1;state.holding=false;state.elapsed=1000;state.last=100;step(150);document.hidden=true;step(10000);document.hidden=false;step(50000)', motion);
assert.equal(vm.runInContext('state.elapsed',motion),1050,'Leaving and returning to the page preserves the transition without consuming hidden time.');
console.log('PASS: slower batch transitions, two-second measurement holds, monotonic playback, and preserved progress after a visibility pause.');
