import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root=new URL('../batch-size/data/',import.meta.url);
const data=JSON.parse(readFileSync(new URL('scaling-rules.json',root),'utf8'));
const context={window:{}};vm.runInNewContext(readFileSync(new URL('scaling-rules.js',root),'utf8'),context);
assert.deepEqual(JSON.parse(JSON.stringify(context.window.SCALING_RULE_DATA)),data,'JS and download contain identical measured endpoints');
let total=0;
for(const [key,s] of Object.entries(data.settings)){
  const expected=key==='llm'?216:648;
  assert.equal(s.rules.length,expected);assert.equal(s.measurementCount,expected*s.batches.length);
  assert.equal(s.coords.reduce((n,c)=>n*c.choices.length,1),expected);
  const keys=new Set(),ids=new Set();
  for(const r of s.rules){
    assert.equal(r.losses.length,s.batches.length);assert(r.losses.every(Number.isFinite));
    const choices=s.coords.map(c=>{assert(c.choices.includes(r.choices[c.key]));return r.choices[c.key];}).join('/');
    assert(!keys.has(choices));keys.add(choices);assert(!ids.has(r.id));ids.add(r.id);
    const gaps=r.losses.map((loss,i)=>loss-s.gridMinimum[i]);assert(gaps.every(v=>v>=-1e-14));
    assert(Math.abs(gaps.reduce((a,b)=>a+b,0)/gaps.length-r.meanRegret)<1e-12);
    assert(Math.abs(Math.max(...gaps)-r.maxRegret)<1e-12);
    total+=r.losses.length;
  }
  s.batches.forEach((_,i)=>{const min=Math.min(...s.rules.map(r=>r.losses[i]));assert.equal(min,s.gridMinimum[i]);assert.equal(s.rules.find(r=>r.id===s.bestAtBatch[i]).losses[i],min);});
  assert.equal(s.commonRuleId,s.rules[0].id);
  assert.equal(s.retunedBaseline.length,s.batches.length);
  assert.equal(s.retunedBaseline.filter(Boolean).length,4);
  for(const baseline of s.retunedBaseline.filter(Boolean)){
    assert(Number.isFinite(baseline.loss));
    if(baseline.seedLosses){
      const losses=Object.values(baseline.seedLosses).sort((a,b)=>a-b);
      assert.equal(baseline.n,3);assert.equal(baseline.loss,losses[1]);
    }
  }
  assert(s.rules.every(r=>r.meanRegret>=s.rules[0].meanRegret-1e-12));
  assert(s.rules.find(r=>r.id===s.noScalingRuleId).choices && s.coords.every(c=>s.rules.find(r=>r.id===s.noScalingRuleId).choices[c.key]==='fixed'));
  for(const [etaM,mu] of [['sqrt','fixed'],['linear','retention']])assert(s.rules.some(r=>r.choices.etaM===etaM&&r.choices.lambdaM==='fixed'&&r.choices.mu===mu));
}
assert.equal(total,4752);
assert.deepEqual(data.settings.llm.rules[0].losses,[3.26969,3.28192,3.31183,3.37977]);
assert.equal(data.settings.llm.rules[0].meanRegret,.00151);
const llm=data.settings.llm;
const paperRecipes=[
  [{etaM:'fixed',etaA:'fixed',lambdaM:'fixed',mu:'fixed',beta1:'fixed',beta2:'fixed'},12],
  [{etaM:'sqrt',etaA:'sqrt',lambdaM:'fixed',mu:'fixed',beta1:'fixed',beta2:'fixed'},22],
  [{etaM:'linear',etaA:'sqrt',lambdaM:'fixed',mu:'retention',beta1:'retention',beta2:'retention'},160]
];
for(const [choices,rank] of paperRecipes){
  const rule=llm.rules.find(r=>Object.entries(choices).every(([key,value])=>r.choices[key]===value));
  assert.equal(rule.rank,rank,'The no-scaling note uses original-grid counterparts of the paper’s comparison recipes.');
  assert.equal(1+llm.rules.filter(r=>r.meanRegret<rule.meanRegret).length,rank);
}
assert.equal(data.settings.cifar.rules[0].choices.etaM,'sqrt');
assert.equal(data.settings.cifar.seed,42);
assert.deepEqual(data.settings.llm.retunedBaseline.map(p=>p.loss),[3.26553,3.27735,3.310845,3.36592]);
assert.equal(data.settings.llm.retunedBaseline[0].kind,'grid_proxy');
assert.deepEqual(data.settings.cifar.retunedBaseline.slice(0,2),[null,null]);
assert(data.settings.cifar.rules[0].losses[3]-data.settings.cifar.retunedBaseline[3].loss<0,'Measured single-seed losses below the retuned median must remain negative gaps');
assert(Math.abs(data.settings.llm.rules[0].losses.reduce((sum,v,i)=>sum+v-data.settings.llm.retunedBaseline[i].loss,0)/4-.00589125)<1e-12);
console.log('PASS: all 4,752 scaling-rule endpoints, complete 216/648 Cartesian grids, regret selection and identical JS/JSON downloads.');
const cifarBest=data.settings.cifar.batches.map((_,i)=>Math.min(data.settings.cifar.gridMinimum[i],data.settings.cifar.retunedBaseline[i]?.loss??Infinity));
assert.deepEqual(cifarBest,[.224572,.2241355,.2273883,.2277826,.2294722,.2334599]);
for(const s of Object.values(data.settings))for(const r of s.rules)r.losses.forEach((loss,i)=>{
  const best=Math.min(s.gridMinimum[i],s.retunedBaseline[i]?.loss??Infinity);
  assert(loss>=best,'The best recorded reference produces nonnegative gaps without clipping original measurements.');
});
console.log('PASS: original retuning medians, missing CIFAR references, and nonnegative gaps to the best recorded grid or retuning loss.');
const cnr=JSON.parse(readFileSync(new URL('signsgd-cnr.json',root),'utf8'));
const cnrContext={window:{}};vm.runInNewContext(readFileSync(new URL('signsgd-cnr.js',root),'utf8'),cnrContext);
assert.deepEqual(JSON.parse(JSON.stringify(cnrContext.window.SIGNSGD_CNR_DATA)),cnr);
assert.deepEqual(cnr.cnrs,[.001,.03,1]);assert.equal(cnr.mu,.9);assert.equal(cnr.T,4096);
assert.equal(cnr.groups.reduce((n,g)=>n+g.rows.length,0),27);
for(const group of cnr.groups){
  assert.deepEqual(group.rows.map(r=>r.batch),[1,2,4,8,16,32,64,128,256]);
  assert(group.rows.every(r=>r.beta===.9 && r.cnr===group.cnr));
  const x=group.rows.map(r=>Math.log(r.batch)),y=group.rows.map(r=>Math.log(r.eta));
  const mx=x.reduce((a,b)=>a+b)/9,my=y.reduce((a,b)=>a+b)/9;
  const slope=x.reduce((sum,v,i)=>sum+(v-mx)*(y[i]-my),0)/x.reduce((sum,v)=>sum+(v-mx)**2,0);
  assert(Math.abs(slope-group.fittedExponent)<1e-12);
  assert.equal(slope.toFixed(3),String(group.reportedExponent));
  group.relativeEta.forEach((ratio,i)=>assert(Math.abs(ratio-group.rows[i].eta/group.rows[0].eta)<1e-12));
}
console.log('PASS: 27 original 1D SignSGD tuning results and independently recomputed 0.588/0.794/0.904 exponents.');

// Check interpolated displays against the untouched scientific measurements.
const playableSource=readFileSync(new URL('../cnr-playable.js',root),'utf8');
const interpolationContext={data:cnr};
vm.runInNewContext(playableSource.slice(playableSource.indexOf('  function smoothCurve('),playableSource.indexOf('  function draw(')),interpolationContext);
const {smoothCurve,conditionAt}=interpolationContext;
for(let position=0;position<=400;position++){
  const p=position/200,curve=conditionAt(p),lo=Math.min(Math.floor(p),1),hi=lo+1;
  assert.equal(curve.measuredIndex,Number.isInteger(p)?p:-1);
  assert.equal(curve.ratios[0],1,'Every interpolated curve retains its batch-one normalization.');
  assert(curve.fittedExponent>=cnr.groups[lo].fittedExponent-1e-12&&curve.fittedExponent<=cnr.groups[hi].fittedExponent+1e-12);
  const points=cnr.batches.map((b,i)=>[Math.log2(b),Math.log(curve.ratios[i])]);
  const numbers=smoothCurve(points).match(/-?\d+\.\d+/g).map(Number);
  const bezier=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
  for(let i=0;i<points.length-1;i++){
    const offset=2+6*i,[cx1,cy1,cx2,cy2,ex,ey]=numbers.slice(offset,offset+6);
    assert(Math.abs(ex-points[i+1][0])<.000051&&Math.abs(ey-points[i+1][1])<.000051,'Smoothing passes through the original display endpoints.');
    for(let j=0;j<=40;j++){
      const value=bezier(points[i][1],cy1,cy2,ey,j/40);
      assert(value>=Math.min(points[i][1],points[i+1][1])-.0001&&value<=Math.max(points[i][1],points[i+1][1])+.0001,'No interpolated curve overshoots the measured interval.');
      assert(cx1<cx2&&cx2<ex);
    }
  }
  if(Number.isInteger(p))cnr.groups[p].relativeEta.forEach((v,i)=>assert(Math.abs(curve.ratios[i]-v)<1e-10,'Presets restore the unchanged original ratios.'));
}
console.log('PASS: continuous CNR display preserves measured ratios, normalization, and interval bounds across 401 slider positions.');
