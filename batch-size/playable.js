/* Each interaction answers a question in the essay; measurements stay separate from toys. */
'use strict';
(function () {
  const el = id => document.getElementById(id);
  const gridStroke = () => token('--line');
  const text = (x, y, label, extra = '') => svgText(x, y, label, `font-size="12" ${extra}`);

  function closeChapters(restoreFocus = false) {
    el('mobile-chapters').hidden = true;
    el('chapter-menu').setAttribute('aria-expanded', 'false');
    el('chapter-menu').setAttribute('aria-label', 'Open article sections');
    if (restoreFocus) el('chapter-menu').focus({ preventScroll: true });
  }
  el('chapter-menu').addEventListener('click', () => {
    const opening = el('mobile-chapters').hidden;
    el('mobile-chapters').hidden = !opening;
    el('chapter-menu').setAttribute('aria-expanded', String(opening));
    el('chapter-menu').setAttribute('aria-label', `${opening ? 'Close' : 'Open'} article sections`);
    const current = document.querySelector('.site-header nav a[aria-current]');
    el('mobile-chapters').querySelectorAll('a').forEach(link => {
      if (current && link.hash === current.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
  el('mobile-chapters').addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    closeChapters();
    const heading = document.querySelector(`${link.hash} h2`);
    requestAnimationFrame(() => { heading.tabIndex = -1; heading.focus({ preventScroll: true }); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !el('mobile-chapters').hidden) closeChapters(true);
  });
  document.addEventListener('pointerdown', event => {
    if (!el('mobile-chapters').hidden && !event.target.closest('#mobile-chapters, #chapter-menu')) closeChapters();
  });
  matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches) closeChapters(); });

  function drawMatchup() {
    const first = el('pair-a').value, second = el('pair-b').value;
    const measurements = DATA.rankings.filter(r => r.family === rankState.family);
    const points = rankBatches.map(batch => ({ batch,
      value: measurements.find(r => r.batch === batch && r.optimizer === second).loss
        - measurements.find(r => r.batch === batch && r.optimizer === first).loss }));
    const width = Math.max(360, Math.min(940, el('pair-chart').clientWidth));
    el('pair-chart').setAttribute('viewBox', `0 0 ${width} 230`);
    const f = frame(width, 230, { l: 60, r: 24, t: 24, b: 35 });
    const limit = Math.max(.004, ...points.map(p => Math.abs(p.value))) * 1.25;
    const x = b => f.l + Math.log2(b / rankBatches[0]) / 4 * f.iw;
    const y = v => f.t + f.ih * (.5 - v / (2 * limit));
    let markup = `<rect x="${f.l}" y="${y(.002)}" width="${f.iw}" height="${y(-.002)-y(.002)}" fill="${token('--sunken')}"/>`;
    [-limit, 0, limit].forEach(v => {
      markup += `<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(v)}" y2="${y(v)}" stroke="${gridStroke()}" ${v===0?'stroke-width="1.5"':'stroke-dasharray="2 5"'}/>`;
      markup += text(f.l-9, y(v)+4, (v*1000).toFixed(1), 'text-anchor="end"');
    });
    markup += text(f.l, 12, `Loss of ${second} − loss of ${first} (10<tspan baseline-shift="super" font-size="9">−3</tspan> nats)`);
    markup += `<path d="${line(points, p=>x(p.batch), p=>y(p.value))}" fill="none" stroke="${token('--ink')}" stroke-width="2.3" stroke-linejoin="round"/>`;
    points.forEach(p => {
      const sign = p.value > 0 ? first : p.value < 0 ? second : 'Tie';
      markup += `<circle cx="${x(p.batch)}" cy="${y(p.value)}" r="6" fill="${sign==='Tie'?token('--muted'):colors[sign]}" stroke="${token('--surface')}" stroke-width="2"><title>${batchName(p.batch)}: ${sign}${sign==='Tie'?'':` leads by ${Math.abs(p.value).toFixed(4)} nats`}</title></circle>`;
      markup += text(x(p.batch), f.h-10, batchName(p.batch), 'text-anchor="middle"');
    });
    el('pair-chart').innerHTML = `<title>${first} versus ${second}: positive values favor ${first}, negative values favor ${second}</title>${markup}`;
    const start = points[0].value, end = points[3].value;
    const signedWinner = v => v > 0 ? first : second;
    el('pair-verdict').textContent = first === second ? 'The same optimizer has zero difference at every batch.'
      : start*end < 0 ? `${signedWinner(start)} leads at 128K by ${Math.abs(start).toFixed(4)} nats. At 2M, ${signedWinner(end)} leads by ${Math.abs(end).toFixed(4)} nats. The ordering reverses.`
      : `${signedWinner(end)} leads at 2M by ${Math.abs(end).toFixed(4)} nats. Explore another pair to see how the ordering changes.`;
  }
  ['pair-a', 'pair-b'].forEach(id => el(id).addEventListener('change', drawMatchup));
  addEventListener('batchsize:rankings', drawMatchup);

  const { noiseLevels, columns, winner: winnerResult } = PhaseMap;
  const phaseCache = new Map();
  let mapKey = '', pendingKey = '', phaseFrame = 0, phaseVisible = false;
  let phaseWorker = null, workerUnavailable = false, jobId = 0, jobTimeout = 0;

  function scaffoldPhaseMap() {
    if (el('phase-map').childElementCount) return;
    let html = `<div class="phase-axis phase-axis-x"><span>Batch size ${mathMarkup(mathVariable('B'))}</span><i aria-hidden="true"></i></div>`
      + `<div class="phase-axis phase-axis-y"><span>Noise variance ${mathMarkup(mathVariable('c',1))}</span><i aria-hidden="true"></i></div>`;
    for (let exponent = 0; exponent < columns; exponent++) {
      const batch = 2 ** exponent;
      html += `<span class="phase-column" style="grid-column:${exponent + 3};grid-row:2">${batch >= 1024 ? batch / 1024 + 'K' : batch}</span>`;
    }
    noiseLevels.forEach((noise, row) => {
      html += `<span class="phase-row" style="grid-column:2;grid-row:${row + 3}">${noise}</span>`;
      for (let exponent = 0; exponent < columns; exponent++) {
        html += `<button class="phase-cell" style="grid-column:${exponent + 3};grid-row:${row + 3}" data-exponent="${exponent}" data-noise="${noise}" data-row="${row}" tabindex="-1" disabled aria-label="Batch ${2 ** exponent}, noise variance ${noise}: calculating"><span aria-hidden="true"></span></button>`;
      }
    });
    el('phase-map').innerHTML = html;
  }
  function setPhaseBusy(busy) {
    el('phase-map').setAttribute('aria-busy', String(busy));
    el('phase-map').classList.toggle('is-updating', busy);
    el('phase-progress').hidden = !busy;
    el('phase-status').hidden = !busy;
    el('phase-map').querySelectorAll('button').forEach(cell => { cell.disabled = busy; });
    el('phase-status').textContent = busy ? 'Comparing 104 experiments…' : '';
    if (busy) el('phase-progress').value = 0;
  }
  function showPhaseMap(key, cells, execution, computeMs = 0) {
    mapKey = key;
    const buttons = [...el('phase-map').querySelectorAll('button')];
    cells.forEach((result, index) => {
      const button = buttons[index];
      button.className = `phase-cell ${result.tied ? 'tied' : result.winner.toLowerCase()}`;
      button.style.setProperty('--strength', .2 + .8 * (result.tied ? 0 : Math.min(1, Math.log2(result.factor) / 4)));
      button.setAttribute('aria-label', `Batch ${2 ** result.exponent}, noise variance ${result.noise}: ${result.winner}`);
      button.firstElementChild.textContent = result.tied ? '≈' : result.winner === 'SGD' ? 'S' : 'N';
    });
    el('phase-map').dataset.geometry = key;
    el('phase-map').dataset.execution = execution;
    el('phase-map').dataset.computeMs = computeMs.toFixed(1);
    setPhaseBusy(false);
    updatePhaseSelection();
  }
  function completePhaseJob(job, cells, execution, computeMs) {
    if (job.id !== jobId || !cells) return;
    clearTimeout(jobTimeout);
    pendingKey = '';
    phaseCache.delete(job.key);
    phaseCache.set(job.key, cells);
    if (phaseCache.size > 6) phaseCache.delete(phaseCache.keys().next().value);
    if (job.key === PhaseMap.key(sim)) showPhaseMap(job.key, cells, execution, computeMs);
    else requestPhaseMap();
  }
  async function phaseFallback(job) {
    if (job.id !== jobId || job.fallback) return;
    job.fallback = true;
    clearTimeout(jobTimeout);
    workerUnavailable = true;
    if (phaseWorker) phaseWorker.terminate();
    phaseWorker = null;
    const started = performance.now();
    try {
      const cells = await PhaseMap.compute(job.config, {
        isCurrent: () => job.id === jobId,
        onProgress: completed => { if (job.id === jobId) el('phase-progress').value = completed; }
      });
      completePhaseJob(job, cells, 'cooperative', performance.now() - started);
    } catch (error) {
      if (job.id !== jobId) return;
      pendingKey = '';
      setPhaseBusy(false);
      el('phase-map').querySelectorAll('button').forEach(cell => { cell.disabled = true; });
      el('phase-status').hidden = false;
      el('phase-status').textContent = 'The map could not be calculated. Change the starting point to try again; the experiment above still works.';
    }
  }
  function requestPhaseMap() {
    if (!phaseVisible) return;
    scaffoldPhaseMap();
    const key = PhaseMap.key(sim);
    if (key === pendingKey) return;
    if (key === mapKey) {
      // Returning to the visible geometry supersedes an unfinished different map.
      if (pendingKey) {
        ++jobId;
        clearTimeout(jobTimeout);
        pendingKey = '';
        setPhaseBusy(false);
        updatePhaseSelection();
      }
      return;
    }
    const job = { id: ++jobId, key, config: { sharp: sim.sharp, start: [...sim.start] } };
    clearTimeout(jobTimeout);
    if (phaseCache.has(key)) {
      const cells = phaseCache.get(key);
      phaseCache.delete(key); phaseCache.set(key, cells);
      pendingKey = '';
      showPhaseMap(key, cells, 'cache');
      return;
    }
    pendingKey = key;
    setPhaseBusy(true);
    if (workerUnavailable || typeof Worker === 'undefined') { phaseFallback(job); return; }
    try {
      if (!phaseWorker) phaseWorker = new Worker(new URL('batch-size/phase-worker.js', document.baseURI));
      phaseWorker.onmessage = ({ data }) => {
        if (data.id !== job.id || job.id !== jobId) return;
        if (data.error) { phaseFallback(job); return; }
        if (data.completed !== undefined) el('phase-progress').value = data.completed;
        if (data.cells) completePhaseJob(job, data.cells, 'worker', data.computeMs);
      };
      phaseWorker.onerror = event => { event.preventDefault(); phaseFallback(job); };
      phaseWorker.postMessage({ id: job.id, config: job.config });
      jobTimeout = setTimeout(() => phaseFallback(job), 5000);
    } catch (error) { phaseFallback(job); }
  }
  function updatePhaseSelection() {
    const closest = noiseLevels.reduce((a, b) => Math.abs(a - sim.noise) < Math.abs(b - sim.noise) ? a : b);
    el('phase-map').querySelectorAll('button').forEach(cell => {
      const batchMatch = 2 ** Number(cell.dataset.exponent) === sim.batch;
      const selected = batchMatch && Number(cell.dataset.noise) === sim.noise;
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
      cell.tabIndex = !cell.disabled && batchMatch && Number(cell.dataset.noise) === closest ? 0 : -1;
    });
    const result = winnerResult(sim.tuned.sgd.total, sim.tuned.newton.total);
    el('phase-winner').textContent = result.winner;
    el('phase-winner').style.color = result.tied ? token('--ink') : colors[result.winner === 'SGD' ? 'sgd' : 'newton'];
    el('phase-detail').innerHTML = `Batch ${fmt(sim.batch)}, noise variance ${sim.noise}. ${fmt(NQM.T / sim.batch)} updates. ${result.tied ? 'Expected losses are within 2% or both below 10<sup>−14</sup>.' : `The other method’s expected loss is ${result.factor >= 1000 ? scientificHTML(result.factor) : result.factor.toFixed(2)}× larger.`}`;
    ['sgd', 'newton'].forEach(method => { el(`phase-${method}-loss`).textContent = sim.tuned[method].total.toPrecision(3); });
    const starts = { both: [1, 1], flat: [1, 0], sharp: [0, 1] };
    document.querySelectorAll('.phase-starts button').forEach(button => {
      const selected = starts[button.dataset.start].every((v, i) => Math.abs(sim.start[i] - v) < 1e-10);
      button.setAttribute('aria-pressed', String(selected));
    });
    el('phase-context').innerHTML = `${mathMarkup(mathVariable('h',2)+`<mo>=</mo><mn>${sim.sharp}</mn>`)} · start ${mathMarkup('<mo>(</mo>'+mathVariable('w',1)+'<mo>,</mo>'+mathVariable('w',2)+'<mo>)</mo><mo>=</mo><mo>(</mo>'+sim.start.map(v=>`<mn>${Number(v.toFixed(2))}</mn>`).join('<mo>,</mo>')+'<mo>)</mo>')}. Noise acts in the flat direction.`;
  }
  function drawPhaseMap() { updatePhaseSelection(); requestPhaseMap(); }
  function selectPhase(cell) {
    if (cell.disabled) return;
    el('sim-batch').value = cell.dataset.exponent;
    el('sim-noise').value = cell.dataset.noise;
    configureSimulation();
  }
  new IntersectionObserver(entries => {
    phaseVisible = entries[0].isIntersecting;
    if (phaseVisible) drawPhaseMap();
  }, { rootMargin: '200px' }).observe(el('phase-map'));
  el('phase-map').addEventListener('click', event => {
    const cell = event.target.closest('button[data-exponent]');
    if (cell) selectPhase(cell);
  });
  el('phase-map').addEventListener('keydown', event => {
    const cell = event.target.closest('button[data-exponent]');
    if (!cell || cell.disabled) return;
    let column = Number(cell.dataset.exponent), row = Number(cell.dataset.row);
    if (event.key === 'ArrowLeft') column = Math.max(0, column - 1);
    else if (event.key === 'ArrowRight') column = Math.min(columns - 1, column + 1);
    else if (event.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') row = Math.min(noiseLevels.length - 1, row + 1);
    else if (event.key === 'Home') { column = 0; if (event.ctrlKey) row = 0; }
    else if (event.key === 'End') { column = columns - 1; if (event.ctrlKey) row = noiseLevels.length - 1; }
    else return;
    event.preventDefault();
    const next = el('phase-map').querySelector(`[data-row="${row}"][data-exponent="${column}"]`);
    selectPhase(next); next.focus();
  });
  document.querySelectorAll('.phase-starts button').forEach(button => button.addEventListener('click', () => {
    sim.start = { both: [1, 1], flat: [1, 0], sharp: [0, 1] }[button.dataset.start];
    configureSimulation();
  }));
  el('phase-labels').addEventListener('change', event => el('phase-map').classList.toggle('show-labels', event.target.checked));
  addEventListener('batchsize:simulation', () => {
    cancelAnimationFrame(phaseFrame);
    phaseFrame = requestAnimationFrame(drawPhaseMap);
  });
  el('phase-run').addEventListener('click', () => {
    el('landscape').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    if (!sim.playing) el('sim-play').click();
  });

  function preservingExponent(cnr, ratio) {
    return ratio===1 ? null : 1-Math.log(NQM.response(cnr,ratio)/NQM.response(cnr,1))/Math.log(ratio);
  }
  function drawChallenge() {
    const ratio = 2**Number(el('scale-batch').value), alpha = Number(el('scale-alpha').value);
    const high = preservingExponent(1,ratio), low = preservingExponent(.001,ratio);
    const rail = el('exponent-rail');
    rail.setAttribute('aria-label', ratio===1?'No batch change; every exponent preserves both directions':`Current exponent ${alpha.toFixed(2)}. High CNR requires ${high.toFixed(2)}; low CNR requires ${low.toFixed(2)}.`);
    rail.innerHTML = `<div class="rail-track"></div><span class="rail-end start">0</span><span class="rail-end end">1</span><span class="rail-current" style="left:${alpha*100}%"><b>Your exponent</b></span>` + (ratio===1?'':
      `<span class="rail-target high" style="left:${high*100}%"><b>High CNR ${high.toFixed(2)}</b></span><span class="rail-target low" style="left:${low*100}%"><b>Low CNR ${low.toFixed(2)}</b></span>`);
    const movements=[NQM.displacement(1,ratio,alpha),NQM.displacement(.001,ratio,alpha)];
    const error=Math.max(...movements.map(v=>Math.abs(Math.log(v))));
    el('challenge-result').innerHTML=ratio===1?'With no batch change, both are preserved for every exponent. Increase the batch to create the challenge.'
      : error<.05?'Both movements are within about 5% of the reference at this batch ratio.'
      : `The larger multiplicative deviation is ${Math.exp(error).toFixed(2)}×. High CNR needs ${mathMarkup(mathVariable("α")+`<mo>≈</mo><mn>${high.toFixed(2)}</mn>`)}; low CNR needs ${mathMarkup(mathVariable("α")+`<mo>≈</mo><mn>${low.toFixed(2)}</mn>`)}.`;
    el('scale-compromise').disabled = ratio===1;
  }
  el('scale-compromise').addEventListener('click', () => {
    const ratio=2**Number(el('scale-batch').value);
    if(ratio===1) return;
    el('scale-alpha').value=((preservingExponent(1,ratio)+preservingExponent(.001,ratio))/2).toFixed(2);
    drawScaling();
  });
  addEventListener('batchsize:scaling', drawChallenge);

  function drawRankLens() {
    const focused = document.activeElement.closest('#rank-recovery-chart [data-arm]')?.dataset.arm;
    const anchor=Number(el('anchor').value)*1000;
    const rows=DATA.recovery.filter(r=>r.anchor===anchor && r.arm.startsWith('top-')).map(r=>({...r, rank:Number(r.arm.match(/top-(\d+)/)[1])})).sort((a,b)=>a.rank-b.rank);
    const random=DATA.recovery.find(r=>r.anchor===anchor && r.arm==='random-768 held');
    const width=Math.max(360,Math.min(640,el('rank-recovery-chart').clientWidth));
    el('rank-recovery-chart').setAttribute('viewBox',`0 0 ${width} 250`);
    const f=frame(width,250,{l:46,r:26,t:34,b:34}),x=rank=>f.l+Math.log2(rank)/Math.log2(768)*f.iw;
    const floor=Math.min(-5, ...rows.map(r=>r.percent),random?.percent??0);
    const y=value=>f.t+f.ih*(1-(value-floor)/(65-floor));
    let s='';
    [0,20,40,60].forEach(value=>{s+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(value)}" y2="${y(value)}" stroke="${gridStroke()}"/>`+text(f.l-10,y(value)+4,value+'%','text-anchor="end"');});
    s+=text(f.l,15,'Local penalty removed');
    [1,16,64,256,768].forEach(rank=>s+=text(x(rank),f.h-9,rank===1?'0 (baseline)':fmt(rank),'text-anchor="middle"'));
    s+=`<circle cx="${x(1)}" cy="${y(0)}" r="4" fill="${token('--muted')}"/>`;
    rows.forEach((r,index)=>{
      const selected=el('held').value===r.arm;
      const tabstop=selected||(!rows.some(row=>row.arm===el('held').value)&&index===0);
      s+=`<g role="button" tabindex="${tabstop?0:-1}" data-arm="${r.arm}" aria-label="Preserve sharpest ${r.rank} directions: ${r.percent.toFixed(1)} percent recovery" aria-pressed="${selected}"><circle cx="${x(r.rank)}" cy="${y(r.percent)}" r="16" fill="transparent"/><circle cx="${x(r.rank)}" cy="${y(r.percent)}" r="${selected?7:5}" fill="${token('--teal')}" stroke="${token('--surface')}" stroke-width="2"/>${selected?`<circle cx="${x(r.rank)}" cy="${y(r.percent)}" r="11" fill="none" stroke="${token('--teal')}"/>`:''}<title>Sharpest ${r.rank}: ${r.percent.toFixed(1)}% recovery</title></g>`;
    });
    if(random) s+=`<path d="M${x(768)-5},${y(random.percent)-5}l10,10m-10,0l10,-10" stroke="${token('--orange')}" stroke-width="2"/><title>Random 768: ${random.percent.toFixed(1)}% recovery</title>`;
    el('rank-recovery-chart').innerHTML=`<title>Measured recovery at training step ${fmt(anchor)}; green circles are sharp directions, rust cross is random 768</title>${s}`;
    if(focused)el('rank-recovery-chart').querySelector(`[data-arm="${focused}"]`)?.focus({preventScroll:true});
    el('rank-lens-note').textContent='Green circles: sharp; rust cross: random 768. Log rank axis; measured points only.';
  }
  el('rank-recovery-chart').addEventListener('click', event=>{
    const point=event.target.closest('[data-arm]');
    if(point){el('held').value=point.dataset.arm;drawIntervention();}
  });
  el('rank-recovery-chart').addEventListener('keydown', event=>{
    const point=event.target.closest('[data-arm]');
    if(!point)return;
    const points=[...el('rank-recovery-chart').querySelectorAll('[data-arm]')];
    let target=point;
    if(event.key==='ArrowLeft')target=points[Math.max(0,points.indexOf(point)-1)];
    else if(event.key==='ArrowRight')target=points[Math.min(points.length-1,points.indexOf(point)+1)];
    else if(event.key==='Home')target=points[0];
    else if(event.key==='End')target=points.at(-1);
    else if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();const arm=target.dataset.arm;el('held').value=arm;drawIntervention();
    el('rank-recovery-chart').querySelector(`[data-arm="${arm}"]`).focus({preventScroll:true});
  });
  addEventListener('batchsize:intervention', drawRankLens);
  addEventListener('batchsize:theme', ()=>{drawPhaseMap();drawMatchup();drawChallenge();drawRankLens();});
  let chartResize;
  addEventListener('resize',()=>{clearTimeout(chartResize);chartResize=setTimeout(()=>{drawMatchup();drawRankLens();},100);});
  drawMatchup();drawPhaseMap();drawChallenge();drawRankLens();
})();
