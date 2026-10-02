/* Real finite-budget tuning cells; the slider selects a computed condition. */
'use strict';
(function () {
  const data = window.SIGNSGD_CNR_DENSE_DATA || window.SIGNSGD_CNR_DATA;
  if (!data || !document.getElementById('cnr-paper-chart')) return;

  function conditionAt(position) {
    const measuredIndex=Math.max(0,Math.min(data.groups.length-1,Math.round(position)));
    const group=data.groups[measuredIndex];
    return {
      cnr:group.cnr,
      ratios:group.rows.map(p=>p.eta/group.rows[0].eta),
      fittedExponent:group.fittedExponent,
      measuredIndex
    };
  }
  function draw() {
    const selected=conditionAt(+$('paper-cnr').value);
    const f=researchFrame('cnr-paper-chart',560,340);
    const x=b=>f.l+Math.log2(b)/8*f.iw,y=ratio=>f.t+f.ih*(1-Math.log10(ratio)/Math.log10(400));
    const cnrLabel=Number(selected.cnr.toPrecision(3)).toString();
    let markup=`<title>Independently tuned SignSGD learning-rate ratios, CNR ${cnrLabel}, fixed momentum 0.9 and 4,096 samples</title>`;
    for(const ratio of [1,10,100]){
      markup+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(ratio)}" y2="${y(ratio)}" stroke="${token('--line')}" stroke-dasharray="2 5"/>`+svgText(f.l-12,y(ratio)+5,ratio+'×','font-size="16" text-anchor="end"');
    }
    for(const b of (f.w<330?[1,16,256]:[1,4,16,64,256]))markup+=svgText(x(b),f.h-13,String(b),`font-size="16" text-anchor="${b===256?'end':'middle'}"`);
    const guides=[1,256];
    markup+=`<path d="${line(guides,b=>x(b),b=>y(b))}" stroke="${token('--muted')}" stroke-dasharray="2 4" fill="none" opacity=".65"/>`;
    markup+=`<path d="${line(guides,b=>x(b),b=>y(Math.sqrt(b)))}" stroke="${token('--muted')}" stroke-dasharray="7 3 2 3" fill="none" opacity=".65"/>`;
    const drawCurve=(curve,active)=>{
      const ratios=curve.rows.map(p=>p.eta/curve.rows[0].eta);
      return `<g opacity="${active?1:.16}" data-cnr="${curve.cnr}"><path d="${line(curve.rows,p=>x(p.batch),p=>y(p.eta/curve.rows[0].eta))}" stroke="${active?token('--orange'):token('--ink')}" stroke-width="${active?2.7:1.5}" fill="none"/>`+curve.rows.map((p,i)=>`<circle cx="${x(p.batch)}" cy="${y(ratios[i])}" r="${active?3.2:2}" fill="${active?token('--orange'):token('--ink')}" stroke="${token('--surface')}" stroke-width="${active?1.5:0}"><title>${p.source==='paper'?'Paper measurement':'Supplemental tuning'}: CNR ${Number(curve.cnr.toPrecision(3))}, batch ${p.batch}, ${p.processedSamples??4096} samples: learning rate ${p.eta.toPrecision(5)}, ratio ${ratios[i].toFixed(3)}</title></circle>`).join('')+'</g>';
    };
    data.groups.forEach((curve,i)=>{if(i!==selected.measuredIndex && (curve.paperCondition??true))markup+=drawCurve(curve,false);});
    markup+=drawCurve(data.groups[selected.measuredIndex],true);
    $('cnr-paper-chart').innerHTML=markup+researchAxes(f);
    $('cnr-paper-chart').setAttribute('aria-label',`Tuned learning-rate ratios at CNR ${cnrLabel}`);
    $('cnr-paper-chart').dataset.cnr=selected.cnr;$('cnr-paper-chart').dataset.interpolated='false';
    $('paper-cnr-output').textContent=cnrLabel;
    $('paper-cnr').setAttribute('aria-valuetext',`CNR ${cnrLabel}, independently tuned`);
    $('cnr-series-label').textContent='Tuned';
    $('cnr-fit-exponent').textContent=selected.fittedExponent.toFixed(3);
    $('cnr-paper-insight').textContent=selected.cnr<.005?'Low CNR: tuned learning rates scale approximately with the square root of batch size.':selected.cnr<.1?'At this intermediate CNR, the fitted scaling lies between square-root and linear.':'High CNR: the fitted scaling moves closer to linear, compensating for fewer updates.';
    document.querySelectorAll('[data-cnr-index]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.cnrIndex===selected.measuredIndex));
  }
  const slider=$('paper-cnr');
  slider.max=data.groups.length-1;slider.step=1;
  // The three original paper buttons retain their displayed CNR values.
  document.querySelectorAll('[data-cnr-index]').forEach(button=>{
    button.dataset.cnrIndex=data.groups.findIndex(group=>group.cnr===Number(button.textContent));
  });
  let drawFrame=0;
  const scheduleDraw=()=>{cancelAnimationFrame(drawFrame);drawFrame=requestAnimationFrame(draw);};
  slider.addEventListener('input',()=>{slider.value=Math.round(+slider.value);scheduleDraw();});
  document.querySelector('.cnr-presets').addEventListener('click',event=>{
    const button=event.target.closest('[data-cnr-index]');if(!button)return;
    slider.value=button.dataset.cnrIndex;cancelAnimationFrame(drawFrame);draw();
  });
  new ResizeObserver(scheduleDraw).observe($('cnr-paper-chart'));
  new MutationObserver(scheduleDraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  draw();
})();
