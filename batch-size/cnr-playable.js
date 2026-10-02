/* Original finite-budget endpoints, with explicitly labeled interpolation. */
'use strict';
(function () {
  const data = window.SIGNSGD_CNR_DATA;
  if (!data || !document.getElementById('cnr-paper-chart')) return;

  // Monotone cubic Hermite interpolation in the chart's log-log coordinates.
  // It passes through every measured point without overshooting each interval.
  function smoothCurve(points) {
    const h=points.slice(1).map((p,i)=>p[0]-points[i][0]);
    const d=points.slice(1).map((p,i)=>(p[1]-points[i][1])/h[i]);
    const endSlope=(h0,h1,d0,d1)=>{
      let m=((2*h0+h1)*d0-h0*d1)/(h0+h1);
      if(Math.sign(m)!==Math.sign(d0))m=0;
      else if(Math.sign(d0)!==Math.sign(d1)&&Math.abs(m)>3*Math.abs(d0))m=3*d0;
      return m;
    };
    const slopes=[endSlope(h[0],h[1],d[0],d[1])];
    for(let i=1;i<points.length-1;i++){
      const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
      slopes.push(d[i-1]*d[i]<=0?0:(w1+w2)/(w1/d[i-1]+w2/d[i]));
    }
    slopes.push(endSlope(h.at(-1),h.at(-2),d.at(-1),d.at(-2)));
    const coord=p=>p.map(v=>v.toFixed(4)).join(',');
    return `M${coord(points[0])}`+points.slice(1).map((p,i)=>` C${coord([points[i][0]+h[i]/3,points[i][1]+slopes[i]*h[i]/3])} ${coord([p[0]-h[i]/3,p[1]-slopes[i+1]*h[i]/3])} ${coord(p)}`).join('');
  }
  function conditionAt(position) {
    const lo=Math.min(Math.floor(position),data.groups.length-2),hi=lo+1,t=position-lo;
    const a=data.groups[lo],b=data.groups[hi],exact=Math.abs(position-Math.round(position))<1e-8;
    const blend=(x,y)=>Math.exp((1-t)*Math.log(x)+t*Math.log(y));
    return {
      cnr:blend(a.cnr,b.cnr),
      ratios:a.rows.map((p,i)=>blend(p.eta/a.rows[0].eta,b.rows[i].eta/b.rows[0].eta)),
      fittedExponent:(1-t)*a.fittedExponent+t*b.fittedExponent,
      measuredIndex:exact?Math.round(position):-1
    };
  }
  function draw() {
    const position=+$('paper-cnr').value, selected=conditionAt(position), measured=selected.measuredIndex>=0;
    const f=researchFrame('cnr-paper-chart',560,340);
    const x=b=>f.l+Math.log2(b)/8*f.iw,y=ratio=>f.t+f.ih*(1-Math.log10(ratio)/Math.log10(400));
    const cnrLabel=measured?String(data.groups[selected.measuredIndex].cnr):Number(selected.cnr.toPrecision(3)).toString();
    let markup=`<title>${measured?'Independently tuned':'Interpolated'} SignSGD learning-rate ratios, CNR ${cnrLabel}, fixed momentum 0.9 and 4,096 samples</title>`;
    for(const ratio of [1,10,100]){
      markup+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(ratio)}" y2="${y(ratio)}" stroke="${token('--line')}" stroke-dasharray="2 5"/>`+svgText(f.l-12,y(ratio)+5,ratio+'×','font-size="16" text-anchor="end"');
    }
    for(const b of (f.w<330?[1,16,256]:[1,4,16,64,256]))markup+=svgText(x(b),f.h-13,String(b),`font-size="16" text-anchor="${b===256?'end':'middle'}"`);
    const guides=[1,256];
    markup+=`<path d="${line(guides,b=>x(b),b=>y(b))}" stroke="${token('--muted')}" stroke-dasharray="2 4" fill="none" opacity=".65"/>`;
    markup+=`<path d="${line(guides,b=>x(b),b=>y(Math.sqrt(b)))}" stroke="${token('--muted')}" stroke-dasharray="7 3 2 3" fill="none" opacity=".65"/>`;
    const drawCurve=(curve,active)=>{
      const ratios=curve.rows.map(p=>p.eta/curve.rows[0].eta);
      return `<g opacity="${active?1:.16}" data-cnr="${curve.cnr}"><path d="${smoothCurve(curve.rows.map((p,i)=>[x(p.batch),y(ratios[i])]))}" stroke="${active?token('--orange'):token('--ink')}" stroke-width="${active?2.7:1.5}" fill="none"/>`+curve.rows.map((p,i)=>`<circle cx="${x(p.batch)}" cy="${y(ratios[i])}" r="${active?4:2.5}" fill="${active?token('--orange'):token('--ink')}" stroke="${token('--surface')}" stroke-width="${active?1.5:0}"><title>CNR ${curve.cnr}, batch ${p.batch}: learning rate ${p.eta.toPrecision(5)}, ratio ${ratios[i].toFixed(3)}</title></circle>`).join('')+'</g>';
    };
    data.groups.forEach((curve,i)=>{if(i!==selected.measuredIndex)markup+=drawCurve(curve,false);});
    if(measured)markup+=drawCurve(data.groups[selected.measuredIndex],true);
    else markup+=`<path class="cnr-interpolated-curve" d="${smoothCurve(data.batches.map((b,i)=>[x(b),y(selected.ratios[i])]))}" stroke="${token('--orange')}" stroke-width="2.7" fill="none"/>`;
    $('cnr-paper-chart').innerHTML=markup+researchAxes(f);
    $('cnr-paper-chart').setAttribute('aria-label',`${measured?'Tuned':'Interpolated'} learning-rate ratios at CNR ${cnrLabel}`);
    $('cnr-paper-chart').dataset.cnr=selected.cnr;$('cnr-paper-chart').dataset.interpolated=String(!measured);
    $('paper-cnr-output').textContent=cnrLabel;
    $('paper-cnr').setAttribute('aria-valuetext',`CNR ${cnrLabel}, ${measured?'measured':'interpolated between measured conditions'}`);
    $('cnr-series-label').textContent=measured?'Tuned':'Interpolated';
    $('cnr-fit-exponent').textContent=selected.fittedExponent.toFixed(3);
    $('cnr-paper-insight').textContent=position<.5?'Low CNR: tuned learning rates scale approximately with the square root of batch size.':position<1.5?'At this intermediate CNR, the fitted scaling lies between square-root and linear.':'High CNR: the fitted scaling moves closer to linear, compensating for fewer updates.';
    document.querySelectorAll('[data-cnr-index]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.cnrIndex===selected.measuredIndex));
  }
  let drawFrame=0,presetFrame=0;
  const scheduleDraw=()=>{cancelAnimationFrame(drawFrame);drawFrame=requestAnimationFrame(draw);};
  $('paper-cnr').addEventListener('input',()=>{cancelAnimationFrame(presetFrame);scheduleDraw();});
  document.querySelector('.cnr-presets').addEventListener('click',e=>{
    const b=e.target.closest('[data-cnr-index]');if(!b)return;
    cancelAnimationFrame(presetFrame);cancelAnimationFrame(drawFrame);
    const from=+$('paper-cnr').value,to=+b.dataset.cnrIndex;
    if(reducedMotion.matches){$('paper-cnr').value=to;draw();return;}
    let started;
    const step=ts=>{
      started??=ts;const t=Math.min(1,(ts-started)/400),eased=t*t*(3-2*t);
      $('paper-cnr').value=t===1?to:from+(to-from)*eased;draw();
      if(t<1)presetFrame=requestAnimationFrame(step);
    };
    presetFrame=requestAnimationFrame(step);
  });
  new ResizeObserver(scheduleDraw).observe($('cnr-paper-chart'));
  new MutationObserver(scheduleDraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  draw();
})();
