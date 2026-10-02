/* Original branch-loss measurements, with a shared checkpoint and token-matched continuations. */
'use strict';
(function(){
  const data=window.BRANCH_CURVES;
  const el=id=>document.getElementById(id),chart=el('branch-trajectory-chart');
  if(!chart||!data)return;
  let closeView=false,frame=0;
  const anchors=Object.keys(data.anchors).map(Number).sort((a,b)=>a-b);
  const fmt=n=>n.toLocaleString('en-US');
  const token=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const path=(points,x,y)=>points.map(([step,loss],i)=>`${i?'L':'M'}${x(step).toFixed(2)},${y(loss).toFixed(2)}`).join(' ');
  function niceTicks(min,max,count){
    const raw=(max-min)/count,power=10**Math.floor(Math.log10(raw));
    const step=[1,2,2.5,5,10].map(n=>n*power).find(n=>n>=raw);
    const start=Math.floor(min/step)*step,end=Math.ceil(max/step)*step;
    return {min:start,max:end,ticks:Array.from({length:Math.round((end-start)/step)+1},(_,i)=>start+i*step),step};
  }
  function render(){
    frame=0;
    const anchor=+el('anchor').value*1000,arm=el('held').value,selected=data.anchors[anchor];
    const width=chart.clientWidth||800,height=width<500?310:370;
    const box={left:width<500?49:64,right:width-14,top:35,bottom:height-37};
    const colors={control:token('--ink'),full:token('--coral'),held:token('--teal'),random:token('--muted'),grid:token('--line'),surface:token('--surface')};
    const xmin=closeView?anchor:1000,xmax=closeView?anchor+1024:13000;
    const shownArms=['control (128K)','fully scaled',...(arm!=='fully scaled'?[arm]:[]),...(arm!=='random-768 held'?['random-768 held']:[])];
    const shown=closeView?shownArms.flatMap(a=>selected[a]||[]):data.base.filter(([s])=>s>=xmin);
    if(!shown.length)return;
    const values=shown.map(p=>p[1]);
    if(!closeView)anchors.forEach(a=>shownArms.forEach(k=>(data.anchors[a][k]||[]).forEach(p=>values.push(p[1]))));
    const low=Math.min(...values),high=Math.max(...values),range=high-low;
    const axis=niceTicks(low-range*.03,high+range*.06,5);
    const x=s=>box.left+(s-xmin)/(xmax-xmin)*(box.right-box.left);
    const y=l=>box.bottom-(l-axis.min)/(axis.max-axis.min)*(box.bottom-box.top);
    const precision=Math.max(2,(String(axis.step).split('.')[1]||'').length);
    const xticks=closeView?[anchor,anchor+256,anchor+512,anchor+768,anchor+1024]:width<600?[1000,5000,9000,13000]:[1000,3000,5000,7000,9000,11000,13000];
    const label=(px,py,txt,extra='')=>`<text x="${px}" y="${py}" font-size="${width<500?14:16}" ${extra}>${txt}</text>`;
    let svg=`<title>${closeView?'Continuations from':'Branches along the 128K base run; selected checkpoint'} ${fmt(anchor)}. Same start state and data stream.</title><defs><clipPath id="branch-plot-clip"><rect x="${box.left-2}" y="${box.top-3}" width="${box.right-box.left+4}" height="${box.bottom-box.top+6}"/></clipPath></defs>`;
    axis.ticks.forEach(t=>{svg+=`<line x1="${box.left}" x2="${box.right}" y1="${y(t)}" y2="${y(t)}" stroke="${colors.grid}" stroke-dasharray="2 5"/>${label(box.left-10,y(t)+5,t.toFixed(precision),'text-anchor="end"')}`;});
    xticks.forEach((t,i)=>{const offset=!closeView?`${t/1000}K`:width<500?(i===0?'0':`+${t-anchor}`):fmt(t);svg+=label(x(t),box.bottom+27,offset,`text-anchor="${i===0?'start':i===xticks.length-1?'end':'middle'}"`);});
    svg+=`<path d="M${box.left},${box.top}V${box.bottom}H${box.right}" fill="none" stroke="${token('--grid-strong')}" stroke-width="1.3"/>`;
    function curve(a,k,opacity=1,strokeWidth=2.2){
      const points=data.anchors[a][k];if(!points)return '';
      const color=k==='control (128K)'?colors.control:k==='fully scaled'?colors.full:k==='random-768 held'?colors.random:colors.held;
      const last=points.at(-1),dash=k==='random-768 held'?'stroke-dasharray="4 4"':'';
      return `<g class="branch-measured-curve" data-anchor="${a}" data-arm="${k}" opacity="${opacity}" clip-path="url(#branch-plot-clip)"><path d="${path(points,x,y)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" ${dash}/>${opacity===1?`<circle cx="${x(last[0])}" cy="${y(last[1])}" r="3.3" fill="${color}"/>`:''}</g>`;
    }
    if(!closeView){
      const points=data.base.filter(([s])=>s>=xmin);
      svg+=`<path class="branch-base-curve" d="${path(points,x,y)}" fill="none" stroke="${colors.control}" stroke-width="2.1" clip-path="url(#branch-plot-clip)"/>`;
      anchors.filter(a=>a!==anchor).forEach(a=>shownArms.filter(k=>k!=='control (128K)').forEach(k=>{svg+=curve(a,k,.45,1.6);}));
    }
    svg+=`<line x1="${x(anchor)}" x2="${x(anchor)}" y1="${box.top}" y2="${box.bottom}" stroke="${colors.control}" opacity=".2" stroke-dasharray="3 5"/>`;
    shownArms.forEach(k=>{svg+=curve(anchor,k);});
    if(!closeView){
      anchors.forEach(a=>{
        const loss=data.anchors[a]['control (128K)'][0][1];
        svg+=`<g role="button" tabindex="0" aria-label="Compare branches from checkpoint ${fmt(a)}" data-branch-anchor="${a}"><title>Checkpoint ${fmt(a)}: click to compare continuations</title><circle class="branch-anchor-ring" cx="${x(a)}" cy="${y(loss)}" r="${a===anchor?8:6}" fill="${colors.surface}" stroke="${colors.control}" stroke-width="${a===anchor?2:1.4}"/><circle cx="${x(a)}" cy="${y(loss)}" r="3" fill="${colors.control}"/><circle cx="${x(a)}" cy="${y(loss)}" r="18" fill="transparent"/></g>`;
      });
      svg+=label(x(anchor),box.top-12,`Checkpoint ${fmt(anchor)}`,`text-anchor="${anchor>10000?'end':anchor<3000?'start':'middle'}"`);
    }else{
      const start=selected['control (128K)'][0];
      svg+=`<circle cx="${x(start[0])}" cy="${y(start[1])}" r="5" fill="${colors.control}"/><path d="M${x(start[0])+9},${y(start[1])-8}l20,-10" stroke="${colors.control}" fill="none"/>${label(x(start[0])+34,y(start[1])-20,'Same checkpoint')}`;
    }
    chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.style.height=`${height}px`;chart.innerHTML=svg;
    chart.querySelectorAll('[data-branch-anchor]').forEach(node=>{
      const choose=()=>{closeView=true;el('anchor').value=+node.dataset.branchAnchor/1000;el('anchor').dispatchEvent(new Event('input'));};
      node.addEventListener('click',choose);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
    });
    const armLabel=arm==='fully scaled'?'Fully scaled':arm==='random-768 held'?'Random 768 held':arm.replace('top-','Sharpest ').replace(' held',' held');
    const entry=(name,color,dashed=false)=>`<span><i class="branch-line ${dashed?'dashed':''}" style="color:${color}" aria-hidden="true"></i>${name}</span>`;
    el('branch-curve-legend').innerHTML=entry(closeView?'128K control':'128K base / control',colors.control)+entry('Fully scaled to 2M',colors.full)+(arm!=='fully scaled'?entry(armLabel,arm==='random-768 held'?colors.random:colors.held,arm==='random-768 held'):'')+(arm!=='random-768 held'?entry('Random 768 held',colors.random,true):'');
    el('branch-curve-state').textContent=`Checkpoint ${fmt(anchor)}`;
    el('branch-curve-caption').textContent=!selected[arm]?`${armLabel} was not run at this checkpoint; no curve is inferred.`:closeView?(anchor===12000?'Recorded curves end at step 12,992. Endpoints below use a separate evaluation.':'Each continuation sees the same ~134M additional tokens.'): 'Click a checkpoint to compare its continuations. Faint branches show other checkpoints.';
    el('branch-close').setAttribute('aria-pressed',String(closeView));el('branch-all').setAttribute('aria-pressed',String(!closeView));
    chart.setAttribute('aria-label',`${closeView?'Branch loss curves from':'Base run and branches; selected checkpoint'} ${fmt(anchor)}. ${selected[arm]?armLabel+' compared with fully scaled and small-batch control.':armLabel+' was not run.'}`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  el('branch-all').addEventListener('click',()=>{closeView=false;render();});
  el('branch-close').addEventListener('click',()=>{closeView=true;render();});
  addEventListener('batchsize:intervention',render);
  addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  render();
})();
