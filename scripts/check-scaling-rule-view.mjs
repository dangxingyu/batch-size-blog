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
console.log(`PASS: ${checked} rule/view combinations retain all endpoints in Full range, and fit the selected curve on linear axes.`);

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
