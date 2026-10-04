/* Every faint curve is an original measured rule, not a simulated training history. */
'use strict';
(function () {
  const data = window.SCALING_RULE_DATA, node = id => document.getElementById(id);
  if (!data || !node('rule-lab')) return;
  const choiceNames = { fixed: 'Fixed', sqrt: 'Square-root', linear: 'Linear', retention: 'EMA' };
  const variables = { etaM: mathVariable('η','M'), etaA: mathVariable('η','A'), lambdaM: mathVariable('λ','M'), lambdaA: mathVariable('λ','A'), mu: mathVariable('μ'), beta1: mathVariable('β',1), beta2: mathVariable('β',2) };
  const state = { task: 'llm', view: 'loss', range: 'detail', index: 0, selected: '', preset: 'common', running: false, visible: false, frame: 0, last: 0, elapsed: 0, holding: true, from: 0, to: 0, geometry: null };
  const settings = Object.fromEntries(Object.entries(data.settings).map(([key,value])=>[key,window.RuleAtlasAxis.scaleUpSetting(value)]));
  const setting = () => settings[state.task];
  const selected = () => setting().rules.find(rule => rule.id === state.selected);
  const batchLabel = batch => state.task === 'llm' ? ({131072:'128K',262144:'256K',524288:'512K',1048576:'1M',2097152:'2M'})[batch] : batch>=1024 ? `${batch/1024}K` : fmt(batch);
  const indices = () => setting().batches.map((_,i)=>i);
  const batchAt = index => index===-1?setting().referenceBatch:setting().batches[index];
  const plotIndices = () => [...indices(),-1].sort((a,b)=>batchAt(a)-batchAt(b));
  const bestLoss = index => index===-1?setting().referenceLoss:Math.min(setting().gridMinimum[index],setting().retunedBaseline[index]?.loss ?? Infinity);
  const gap = (rule, index) => rule.losses[index] - bestLoss(index);
  const meanGap = rule => rule.losses.reduce((sum,_,i)=>sum+gap(rule,i),0)/rule.losses.length;
  const plotValue = (rule,index) => index===-1?(state.view==='gap'?0:setting().referenceLoss):state.view==='gap' ? gap(rule,index) : rule.losses[index];
  const decimal = v => v.toFixed(state.task === 'llm' ? 5 : 7);
  const recipeText = rule => setting().coords.map(c => `${c.label}: ${choiceNames[rule.choices[c.key]]}`).join('; ');
  function retentionExponent() {
    if (state.task !== 'llm') return '<mo>=</mo><mi>κ</mi>';
    const s = setting(), numerator = s.referenceSteps, denominator = s.trainSteps[state.index];
    const ratio = numerator/denominator;
    return Number.isInteger(ratio) ? `<mo>=</mo><mn>${fmt(ratio)}</mn>` : `<mo>≈</mo><mn>${fmt(Math.round(ratio))}</mn>`;
  }
  const presetId = name => {
    const s = setting();
    if (name === 'common') return s.commonRuleId;
    if (name === 'batch') return s.bestAtBatch[state.index];
    if (name === 'none') return s.noScalingRuleId;
    if (name === 'power') return s.rules.find(r => r.choices.etaM === 'fixed' && r.choices.lambdaM === 'linear' && r.choices.mu === 'fixed').id;
    // A matrix prescription leaves auxiliary choices unspecified: select its best grid completion.
    return s.rules.find(r => r.choices.etaM === (name === 'bound' ? 'sqrt' : 'linear') && r.choices.lambdaM === 'fixed' && r.choices.mu === (name === 'bound' ? 'fixed' : 'retention')).id;
  };
  function rebuildPlot() {
    const s = setting(), svg = node('rule-atlas'), w = Math.max(180, Math.min(1100, svg.clientWidth)), h = innerWidth <= 1000 ? 200 : 280;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const f = frame(w,h,{l:w<360?60:72,r:22,t:20,b:43}), shown=plotIndices();
    const values=s.rules.flatMap(r=>shown.map(i=>plotValue(r,i)));
    const references=shown.map(i=>state.view==='gap'?0:bestLoss(i));
    const focus=state.running&&state.preset==='batch'?s.rules.filter(r=>s.bestAtBatch.includes(r.id)):[selected()];
    const domains=window.RuleAtlasAxis.domains(values,references,focus.flatMap(r=>shown.map(i=>plotValue(r,i))),state.view==='gap');
    const domain=domains[state.range], {bottom,top,step:tickStep,precision}=domain;
    const x = b => f.l + Math.log2(b/batchAt(shown[0])) / Math.log2(batchAt(shown.at(-1))/batchAt(shown[0])) * f.iw;
    const y = value => f.t + f.ih * (1 - (value-bottom)/(top-bottom));
    state.geometry = {f,x,y,shown,domain,full:domains.full,points:s.rules.map(r => shown.map(i => [x(batchAt(i)),y(plotValue(r,i))]))};
    const plotted=s.measurementCount;
    node('rule-axis-title').textContent=state.view==='gap'?'Loss gap to best tuned rule':'Validation loss';
    node('rule-axis-quantity').innerHTML=mathMarkup(state.view==='gap'?'<msub><mi>L</mi><mtext>rule</mtext></msub><mo>−</mo><msub><mi>L</mi><mtext>best</mtext></msub>':'<msub><mi>L</mi><mtext>rule</mtext></msub>')+'<span class="figure-axis-unit">nats</span>';
    node('rule-coverage').textContent='';
    node('rule-range-tabs').querySelectorAll('button').forEach(b=>{const active=b.dataset.ruleRange===state.range;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    let markup = `<title>${s.rules.length} scaling-rule curves, ${plotted} transfer runs and one shared reference configuration. ${state.view==='gap'?'Nonnegative gaps to the best recorded grid or retuning loss.':'Validation losses.'} Linear loss axis. ${state.range==='detail'?'Detail of the selected rule; Full range shows every endpoint.':'Full range of every measured rule.'} Click a curve to highlight it. Left and right arrow keys select rules in their overall grid rank order.</title><defs><clipPath id="rule-main-clip"><rect x="${f.l-5}" y="${f.t}" width="${f.iw+10}" height="${f.ih+6}"/></clipPath></defs>`;
    for (let i=0;i<=Math.round((top-bottom)/tickStep);i++) {
      const value=bottom+i*tickStep;
      markup += `<line x1="${f.l}" x2="${w-f.r}" y1="${y(value)}" y2="${y(value)}" stroke="${token('--line')}" ${value?'stroke-dasharray="2 5"':''}/>`;
      markup += svgText(f.l-12,y(value)+5,value.toFixed(precision),`font-size="17" text-anchor="end" fill="${token('--ink')}"`);
    }
    shown.forEach(i => { const b=batchAt(i);
      markup += `<line x1="${x(b)}" x2="${x(b)}" y1="${f.t}" y2="${h-f.b}" stroke="${token('--line')}" stroke-dasharray="2 6"/>`;
      if (w >= 360 || shown.length <= 4 || [shown[0],shown[2],shown.at(-1)].includes(i)) markup += svgText(x(b),h-13,batchLabel(b),`font-size="17" text-anchor="${i===shown.at(-1)?'end':'middle'}"`);
    });
    markup += '<g clip-path="url(#rule-main-clip)"><g class="rule-cloud" aria-hidden="true">';
    s.rules.forEach((r,i) => {
      const points = state.geometry.points[i];
      markup += `<g data-rule="${r.id}"><title>Rule ${r.rank} / ${s.rules.length}: ${recipeText(r)}</title><path class="rule-ghost" d="${line(points,p=>p[0],p=>p[1])}"/>`;
      markup += points.map(([cx,cy],j) => shown[j]===-1?'':`<circle class="rule-run" cx="${cx}" cy="${cy}" r="2"><title>${batchLabel(batchAt(shown[j]))}: ${decimal(r.losses[shown[j]])} nats</title></circle>`).join('')+'</g>';
    });
    const baseline=shown.map((i,position)=>[x(batchAt(i)),y(references[position])]);
    markup += `</g><path class="rule-baseline" d="${line(baseline,p=>p[0],p=>p[1])}" fill="none" stroke="${token('--ink')}" stroke-width="1.4" stroke-dasharray="6 4"/><g id="rule-selection"></g><line id="rule-cursor" stroke="${token('--orange')}" stroke-dasharray="3 5" opacity=".5"/><circle id="rule-current-point" r="7" fill="${token('--orange')}" stroke="${token('--surface')}" stroke-width="2"/></g>`;
    markup+=`<circle class="rule-shared-baseline" cx="${x(s.referenceBatch)}" cy="${y(state.view==='gap'?0:s.referenceLoss)}" r="5" fill="${token('--ink')}" stroke="${token('--surface')}" stroke-width="1.5"><title>Shared baseline at ${batchLabel(s.referenceBatch)}: ${decimal(s.referenceLoss)} nats</title></circle>`;
    svg.innerHTML = markup+researchAxes(f);
    svg.setAttribute('tabindex','0');
    svg.setAttribute('aria-label',`${s.rules.length} complete rules, ${plotted} measured runs. ${state.range==='detail'?'Detail of the selected rule; use Full range to see every endpoint.':'Full range.'} Click a curve; use left and right arrow keys to select rules.`);
    svg.dataset.rules = s.rules.length; svg.dataset.runs = plotted;svg.dataset.view=state.view;svg.dataset.yScale='linear';svg.dataset.range=state.range;svg.dataset.yMin=bottom;svg.dataset.yMax=top;svg.dataset.referenceBatch=s.referenceBatch;svg.dataset.referenceLoss=s.referenceLoss;
    rebuildOverview();
    updateSelection();
  }
  function rebuildOverview() {
    const s=setting(), g=state.geometry, svg=node('rule-overview'), h=62;
    const f=frame(g.f.w,h,{l:g.f.l,r:g.f.r,t:12,b:10}), {bottom,top,precision}=g.full;
    const y=value=>f.t+f.ih*(1-(value-bottom)/(top-bottom));
    g.overview={f,x:g.x,y,points:s.rules.map(r=>g.shown.map(i=>[g.x(batchAt(i)),y(plotValue(r,i))]))};
    svg.setAttribute('viewBox',`0 0 ${f.w} ${h}`);
    let markup=`<title>Full linear range of all ${s.measurementCount} measured runs. The shaded band is the main plot's vertical range. Click a curve to inspect its rule.</title><defs><clipPath id="rule-overview-clip"><rect x="${f.l-4}" y="${f.t}" width="${f.iw+8}" height="${f.ih+3}"/></clipPath></defs>`;
    [bottom,top].forEach(v=>{markup+=svgText(f.l-12,y(v)+5,v.toFixed(precision),'font-size="14" text-anchor="end"');});
    const clamp=value=>Math.max(bottom,Math.min(top,value));
    const bandTop=y(clamp(g.domain.top)),bandBottom=y(clamp(g.domain.bottom));
    markup+=`<rect x="${f.l}" y="${bandTop}" width="${f.iw}" height="${bandBottom-bandTop}" fill="${token('--orange')}" fill-opacity=".08" stroke="${token('--orange')}" stroke-opacity=".35" stroke-width="1"/><g clip-path="url(#rule-overview-clip)"><g class="rule-overview-cloud">`;
    s.rules.forEach((r,i)=>{markup+=`<path data-rule="${r.id}" d="${line(g.overview.points[i],p=>p[0],p=>p[1])}"><title>Rule ${r.rank}: ${recipeText(r)}</title></path>`;});
    const baseline=g.shown.map(i=>[g.x(batchAt(i)),y(state.view==='gap'?0:bestLoss(i))]);
    markup+=`</g><path d="${line(baseline,p=>p[0],p=>p[1])}" fill="none" stroke="${token('--ink')}" stroke-width="1" stroke-dasharray="4 3"/><path id="rule-overview-selection" fill="none" stroke="${token('--orange')}" stroke-width="2" stroke-linejoin="round"/><circle id="rule-overview-current" r="3" fill="${token('--orange')}" stroke="${token('--surface')}" stroke-width="1"/></g><line x1="${f.l}" x2="${f.l}" y1="${f.t}" y2="${h-f.b}" stroke="${token('--muted')}" stroke-width="1"/>`;
    svg.innerHTML=markup;
    svg.setAttribute('tabindex','0');svg.dataset.rules=s.rules.length;svg.dataset.runs=s.measurementCount;svg.dataset.yScale='linear';svg.dataset.yMin=bottom;svg.dataset.yMax=top;svg.dataset.range='full';
  }
  function cursor(position) {
    const g = state.geometry, r = selected(), left = indices()[Math.floor(position)], right = indices()[Math.min(Math.floor(position)+1,indices().length-1)], fraction = position-Math.floor(position);
    const x = g.x(setting().batches[left])*(1-fraction)+g.x(setting().batches[right])*fraction;
    const y = g.y(plotValue(r,left))*(1-fraction)+g.y(plotValue(r,right))*fraction;
    const lineNode = node('rule-cursor');
    lineNode.setAttribute('x1',x); lineNode.setAttribute('x2',x); lineNode.setAttribute('y1',g.f.t);lineNode.setAttribute('y2',g.f.h-g.f.b);
    node('rule-current-point').setAttribute('cx',x);node('rule-current-point').setAttribute('cy',y);
    node('rule-overview-current').setAttribute('cx',x);node('rule-overview-current').setAttribute('cy',g.overview.y(plotValue(r,left))*(1-fraction)+g.overview.y(plotValue(r,right))*fraction);
  }
  function updateSelection() {
    const s = setting(), r = selected(), points = state.geometry.points[s.rules.indexOf(r)];
    node('rule-selection').innerHTML = `<path d="${line(points,p=>p[0],p=>p[1])}" fill="none" stroke="${token('--orange')}" stroke-width="2.8" stroke-linejoin="round"/>`+points.map(([cx,cy],i)=>state.geometry.shown[i]===-1?'':`<circle cx="${cx}" cy="${cy}" r="4.5" fill="${token('--orange')}" stroke="${token('--surface')}" stroke-width="1.5"><title>${batchLabel(batchAt(state.geometry.shown[i]))}: ${decimal(r.losses[state.geometry.shown[i]])} nats</title></circle>`).join('');
    node('rule-atlas').dataset.selectedRule = r.id;
    node('rule-overview-selection').setAttribute('d',line(state.geometry.overview.points[s.rules.indexOf(r)],p=>p[0],p=>p[1]));node('rule-overview').dataset.selectedRule=r.id;
    node('rule-builder').querySelectorAll('select').forEach(select => { select.value = r.choices[select.dataset.coordinate]; });
    node('rule-loss').textContent = decimal(r.losses[state.index]);
    node('rule-baseline-loss').textContent = decimal(bestLoss(state.index));
    node('rule-regret').textContent = decimal(gap(r,state.index));
    node('rule-mean').textContent = decimal(meanGap(r));
    node('rule-loss-rank').textContent = `${window.RuleAtlasAxis.lossRank(s.rules.map(rule=>rule.losses[state.index]),r.losses[state.index])} / ${s.rules.length}`;
    const rank = String(r.rank).replace('.5','½');
    node('rule-verdict').textContent = `Scale-up grid rank ${rank} of ${s.rules.length}. `+(r.id===s.bestAtBatch[state.index]?'This rule attains the lowest grid loss at the selected batch.':r.id===s.commonRuleId?'The best common rule does not win this batch.':`The best grid rule at this batch has loss ${decimal(s.gridMinimum[state.index])} nats.`);
    s.coords.forEach(c => {
      const v = variables[c.key], choice = r.choices[c.key];
      const factor = choice==='sqrt'?'<msqrt><mi>κ</mi></msqrt>':choice==='linear'?'<mi>κ</mi>':'';
      const scaled = choice==='retention'?`<msup>${v}<mi>${state.task==='llm'?'ρ':'κ'}</mi></msup>`:factor+v;
      node(`rule-formula-${c.key}`).innerHTML = mathMarkup(`<msup>${v}<mo>′</mo></msup><mo>=</mo>${scaled}`);
    });
    node('rule-recipe').innerHTML = state.task==='llm'&&s.coords.some(c=>r.choices[c.key]==='retention')?mathMarkup('<mi>ρ</mi>'+retentionExponent()):'';
    document.querySelectorAll('[data-rule-preset]').forEach(button => {const active=button.dataset.rulePreset===state.preset;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
    const description = node('rule-preset-description');
    if (description.dataset.preset !== state.preset) {
      const content = node('rule-preset-descriptions').content.querySelector(`[data-preset-description="${state.preset}"]`);
      description.innerHTML = content ? content.innerHTML : '';
      description.hidden = !content;
      description.dataset.preset = state.preset;
    }
    cursor(indices().indexOf(state.index));
  }
  function choose(id,preset='') { pause();state.selected=id;state.preset=preset;if(state.range==='detail')rebuildPlot();else updateSelection(); }
  function updateBatch(index) {
    state.index=index;
    node('rule-batch').value=indices().indexOf(index);
    const s=setting(), value=`${batchLabel(s.batches[index])} ${s.unit} / update`;
    node('rule-target-batch').textContent=value;node('rule-batch').setAttribute('aria-valuetext',value);
    node('rule-batch-ticks').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.ruleBatch===index));
    if (state.preset==='batch' && state.selected!==s.bestAtBatch[index]) {state.selected=s.bestAtBatch[index];if(state.range==='detail'&&!state.running){rebuildPlot();return;}}
    updateSelection();
  }
  function pause() {
    state.running=false;cancelAnimationFrame(state.frame);state.frame=0;state.last=0;
    node('rule-atlas').dataset.playbackPhase='paused';
    node('rule-play').innerHTML=reducedMotion.matches?'Next batch <span aria-hidden="true">→</span>':'Play batch changes <span aria-hidden="true">▶</span>';node('rule-play').setAttribute('aria-label',reducedMotion.matches?'Next scaling-rule batch':'Play scaling-rule batch changes');
  }
  function step(ts) {
    if (!state.running || !state.visible || document.hidden) {state.frame=0;state.last=0;return;}
    if (state.last) state.elapsed+=Math.min(100,ts-state.last);
    state.last=ts;
    node('rule-atlas').dataset.playbackPhase=state.holding?'hold':'move';
    if (state.holding) {
      cursor(state.from);
      if (state.elapsed>=2000) {
        if (state.index===indices().at(-1)) {pause();return;}
        state.elapsed=0;state.holding=false;
      }
    } else {
      const t=Math.min(1,state.elapsed/4500), eased=t*t*(3-2*t);
      cursor(state.from+(state.to-state.from)*eased);
      if (t===1) {
        updateBatch(indices()[state.to]);
        state.from=state.to;state.to=Math.min(state.from+1,indices().length-1);
        state.elapsed=0;state.holding=true;
      }
    }
    state.frame=requestAnimationFrame(step);
  }
  function setTask(task) {
    pause();state.task=task;state.index=0;state.preset='common';state.selected=setting().commonRuleId;
    const s=setting();
    document.querySelectorAll('[data-task]').forEach(b=>{b.classList.toggle('active',b.dataset.task===task);b.setAttribute('aria-pressed',b.dataset.task===task);});
    node('rule-lab').querySelector('h3').textContent='Scaling-rule search.';
    node('rule-count').innerHTML=`${fmt(s.measurementCount)}<span>measured runs</span>`;
    node('rule-product').innerHTML=`${fmt(s.rules.length)} rules <span>×</span> ${s.batches.length} batches`;
    node('rule-budget').textContent=`Reference: ${task==='llm'?'128K':fmt(s.referenceBatch)} ${s.unit} / update`;
    node('rule-x-unit').textContent=`${s.unit} / update`;
    rebuildBatchControls();
    node('rule-builder').innerHTML=s.coords.map(c=>`<label for="rule-${c.key}"><span>${mathMarkup(variables[c.key])} ${c.label}</span><select id="rule-${c.key}" data-coordinate="${c.key}" aria-label="${c.label}">${c.choices.map(value=>`<option value="${value}">${choiceNames[value]}</option>`).join('')}</select><output class="rule-coordinate-formula" id="rule-formula-${c.key}" for="rule-${c.key}"></output></label>`).join('');
    state.index=indices()[0];rebuildPlot();updateBatch(state.index);
  }
  function rebuildBatchControls() {
    const s=setting(),shown=indices();
    node('rule-batch').max=shown.length-1;
    node('rule-batch-ticks').innerHTML=shown.map(i=>`<button data-rule-batch="${i}" aria-label="Select ${batchLabel(s.batches[i])} ${s.unit} per update">${batchLabel(s.batches[i])}</button>`).join('');
    document.querySelectorAll('[data-rule-view]').forEach(b=>{b.classList.toggle('active',b.dataset.ruleView===state.view);b.setAttribute('aria-pressed',b.dataset.ruleView===state.view);});
  }
  node('rule-view-tabs').addEventListener('click',e=>{
    const button=e.target.closest('[data-rule-view]');if(!button||button.dataset.ruleView===state.view)return;
    pause();state.view=button.dataset.ruleView;
    if(!indices().includes(state.index))state.index=indices()[0];
    rebuildBatchControls();rebuildPlot();updateBatch(state.index);
  });
  node('rule-range-tabs').addEventListener('click',e=>{const button=e.target.closest('[data-rule-range]');if(!button||button.dataset.ruleRange===state.range)return;pause();state.range=button.dataset.ruleRange;rebuildPlot();});
  node('rule-reset').addEventListener('click',()=>{state.range='detail';choose(presetId('common'),'common');});
  node('rule-task-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(b)setTask(b.dataset.task);});
  node('rule-builder').addEventListener('change',()=>{
    const choices=Object.fromEntries([...node('rule-builder').querySelectorAll('select')].map(select=>[select.dataset.coordinate,select.value]));
    const r=setting().rules.find(r=>Object.entries(choices).every(([key,value])=>r.choices[key]===value));choose(r.id);
  });
  node('rule-lab').addEventListener('click',e=>{const b=e.target.closest('[data-rule-preset]');if(b)choose(presetId(b.dataset.rulePreset),b.dataset.rulePreset);});
  node('rule-batch').addEventListener('input',()=>{pause();updateBatch(indices()[+node('rule-batch').value]);});
  node('rule-batch-ticks').addEventListener('click',e=>{const b=e.target.closest('[data-rule-batch]');if(b){pause();updateBatch(+b.dataset.ruleBatch);}});
  function selectFromPlot(e, id, geometry) {
    const svg=node(id),rect=svg.getBoundingClientRect(),g=geometry;
    const px=(e.clientX-rect.left)*g.f.w/rect.width,py=(e.clientY-rect.top)*g.f.h/rect.height;
    if(px<g.f.l-10||px>g.f.w-g.f.r+10||py<g.f.t-10||py>g.f.h-g.f.b+10)return;
    let nearest=0,distance=Infinity;
    g.points.forEach((points,i)=>{for(let j=0;j<points.length-1;j++){
      const [ax,ay]=points[j],[bx,by]=points[j+1],dx=bx-ax,dy=by-ay;
      const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy))),d=(px-ax-t*dx)**2+(py-ay-t*dy)**2;
      if(d<distance){distance=d;nearest=i;}
    }});choose(setting().rules[nearest].id);
  }
  function selectWithKeyboard(e) {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    const s=setting(),i=s.rules.indexOf(selected()),next=e.key==='Home'?0:e.key==='End'?s.rules.length-1:Math.max(0,Math.min(s.rules.length-1,i+(e.key==='ArrowRight'?1:-1)));choose(s.rules[next].id);
  }
  node('rule-atlas').addEventListener('click',e=>selectFromPlot(e,'rule-atlas',state.geometry));
  node('rule-overview').addEventListener('click',e=>selectFromPlot(e,'rule-overview',state.geometry.overview));
  node('rule-atlas').addEventListener('keydown',selectWithKeyboard);
  node('rule-overview').addEventListener('keydown',selectWithKeyboard);
  node('rule-play').addEventListener('click',()=>{
    if(state.running){pause();cursor(indices().indexOf(state.index));return;}
    if(state.index===indices().at(-1))updateBatch(indices()[0]);
    if(reducedMotion.matches){updateBatch(indices()[Math.min(indices().indexOf(state.index)+1,indices().length-1)]);return;}
    state.running=true;state.from=indices().indexOf(state.index);state.to=state.from+1;state.last=0;state.elapsed=0;state.holding=true;
    if(state.preset==='batch'&&state.range==='detail')rebuildPlot();
    node('rule-play').innerHTML='Pause <span aria-hidden="true">Ⅱ</span>';node('rule-play').setAttribute('aria-label','Pause scaling-rule batch changes');
    state.frame=requestAnimationFrame(step);
  });
  new IntersectionObserver(entries=>{
    state.visible=entries[0].isIntersecting;
    if(!state.visible){cancelAnimationFrame(state.frame);state.frame=0;state.last=0;}
    else if(state.running&&!state.frame)state.frame=requestAnimationFrame(step);
  },{threshold:0}).observe(node('rule-lab'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(state.frame);state.frame=0;state.last=0;}else if(state.running&&state.visible&&!state.frame)state.frame=requestAnimationFrame(step);});
  let resizeFrame=0;
  new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{pause();rebuildPlot();});}).observe(node('rule-atlas'));
  new MutationObserver(()=>{pause();rebuildPlot();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  reducedMotion.addEventListener('change',()=>{pause();cursor(indices().indexOf(state.index));});
  setTask('llm');
})();
