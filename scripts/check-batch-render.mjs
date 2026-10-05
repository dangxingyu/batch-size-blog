import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../batch-size/app.js',import.meta.url),'utf8');
const cameraSource=fs.readFileSync(new URL('../batch-size/simulation-camera.js',import.meta.url),'utf8');
const physics=fs.readFileSync(new URL('../batch-size/physics.js',import.meta.url),'utf8');
let ellipses=0,frames=0;
class VectorPath{constructor(){this.points=[];}moveTo(x,y){this.points.push([x,y]);}lineTo(x,y){this.points.push([x,y]);}}
function canvas(){
  const context={segments:[],path:[],vectorStrokes:[],setTransform(){},save(){},restore(){},rect(){},clip(){},
    clearRect(){this.segments=[];this.vectorStrokes=[];},drawImage(){frames++;},setLineDash(){},ellipse(){ellipses++;},
    translate(){},scale(){},strokeRect(){},arc(){},fill(){},fillText(){},beginPath(){this.path=[];},moveTo(x,y){this.path=[[x,y]];},
    lineTo(x,y){this.path.push([x,y]);},stroke(path){if(path){this.vectorStrokes.push({path,alpha:this.globalAlpha,color:this.strokeStyle});return;}this.segments.push(...this.path.slice(1));}};
  const result={getContext:()=>context,getBoundingClientRect:()=>({width:720,height:320}),dataset:{}};
  for(const prop of ['width','height'])Object.defineProperty(result,prop,{get:()=>result['_'+prop],set:v=>{result['_'+prop]=v;context.segments=[];}});
  return result;
}
const nodes={landscape:canvas(),'landscape-overview':canvas(),'sim-overview':{},'sim-window':{},'sim-zoom':{},'sim-auto-view':{setAttribute(){}},'sim-full-view':{setAttribute(){}},'sim-loss':{clientWidth:480,setAttribute(){},
  set innerHTML(value){this.markup=value;for(const method of ['sgd','newton'])nodes['sim-loss-'+method]={setAttribute(name,value){this[name]=value;}};},
  get innerHTML(){return this.markup;}},'sim-progress':{},'sim-progress-bar':{style:{}},'sim-play-label':{},'sim-play-icon':{}};
for(const id of ['sim-batch','sim-sharp','sim-noise','sim-batch-output','sim-sharp-output','sim-noise-output','sim-updates','sim-seed','preset-small','preset-large','projection-3d','projection-2d'])
  nodes[id]={value:'',attributes:{},listeners:{},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=String(value);},addEventListener(type,handler){this.listeners[type]=handler;}};
nodes['hero-canvas']=canvas();
nodes['geometry-lab']={dataset:{}};
nodes['landscape-panel-3d']={hidden:false};nodes['landscape-panel-2d']={hidden:true};
const compassNodes=Object.fromEntries(['flat','sharp','origin'].map(name=>[name,{attributes:{},setAttribute(key,value){this.attributes[key]=String(value);}}]));
const compass={querySelector(selector){
  if(selector==='circle')return compassNodes.origin;
  const axis=selector.match(/^\[data-compass-axis="(flat|sharp)"\]$/)?.[1];
  assert(axis,'The compass selects a named coordinate arrow.');
  return compassNodes[axis];
}};
const document={documentElement:{dataset:{theme:'light'}},hidden:false,createElement:canvas,
  querySelector(selector){assert.equal(selector,'.coordinate-compass svg');return compass;}};
const context=vm.createContext({document,Path2D:VectorPath,window:{devicePixelRatio:2,matchMedia:()=>({matches:false})},
  getComputedStyle:()=>({getPropertyValue:name=>name}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  Event:class Event{constructor(type){this.type=type;}},dispatchEvent(){},
  $:id=>nodes[id],token:name=>name,svgText:(x,y,text)=>`<text>${text}</text>`,colors:{sgd:'#a44530',newton:'#176d63'},fmt:n=>n.toLocaleString('en-US')});
vm.runInContext(physics,context);
vm.runInContext(cameraSource,context);
const size=source.slice(source.indexOf('function canvasSize('),source.indexOf('const reducedMotion='));
const renderer=source.slice(source.indexOf('function renderLandscape()'),source.indexOf("$('sim-play').addEventListener"));
const tuning=source.slice(source.indexOf('const tuningCache='),source.indexOf('const hero='));
const simulationState=source.slice(source.indexOf('const sim='),source.indexOf('let simRAF='));
const configure=source.slice(source.indexOf('function configureSimulation()'),source.indexOf('function renderRisk()'));
const projectionState=source.slice(source.indexOf('const reducedMotion='),source.indexOf('const tuningCache='));
const projectionRenderer=source.slice(source.indexOf('const hero='),source.indexOf('const sim='));
vm.runInContext(`
  const NQM=window.NQM,SimulationCamera=window.SimulationCamera;
  ${size}
  function frame(w,h,m){return {w,h,...m,iw:w-m.l-m.r,ih:h-m.t-m.b};}
  function axes(f,min,max,xticks,x){globalThis.lossAxes={f,xticks,x};return {svg:'<line/>',y:v=>f.t+f.ih*(1-(v-min)/(max-min))};}
  ${projectionState}
  globalThis.defaultProjection=landscapeView;
  landscapeView='2d';
  ${projectionRenderer}
  ${simulationState}
  const simLayer={canvas:document.createElement('canvas'),key:'',paths:null,end:-1,painted:-1,
    trails:{sgd:document.createElement('canvas'),newton:document.createElement('canvas')}};
  const simLoss={key:'',paths:null,end:-1,curves:{}};
  const simCamera={mode:'overview',paths:null,prepared:null,view:null,size:''};
  const simDetail={canvas:document.createElement('canvas'),key:'',painted:''};
  let simRAF=0,simConfigRAF=0,simVisible=true;
  function renderRisk() {}
  ${configure}
  function setup(){
    $('sim-batch').value=Math.log2(sim.batch);$('sim-sharp').value=sim.sharp;$('sim-noise').value=sim.noise;
    configureSimulation();
    sim.runLossBounds={ymin:-5,ymax:2};
    simLoss.key='';
  }
  ${renderer}
  ${tuning}
  setup();
`,context);
function checkEnd(progress){
  vm.runInContext(`sim.progress=${progress};renderSim();`,context);
  const state=vm.runInContext('({sim,simLayer,simLoss,lossAxes})',context),end=Math.floor(progress*(state.sim.paths.sgd.length-1));
  const scale=Math.min(720/4.5,320/3.35);
  for(const method of ['sgd','newton']){
    const expected=state.sim.paths[method].slice(1,end+1).map(p=>[360+p.w[0]*scale,169.6-p.w[1]*scale]);
    const actual=state.simLayer.trails[method].getContext('2d').segments;
    assert.equal(actual.length,end,'Each physical trajectory segment is appended exactly once.');
    assert.equal(state.simLayer.history[method].points.length,end+1,'The vector trace retains all raw updates.');
    for(let i=0;i<=end;i++)for(let coordinate=0;coordinate<2;coordinate++)
      assert.equal(state.simLayer.history[method].points[i][coordinate],state.sim.paths[method][i].w[coordinate]);
    for(let i=0;i<end;i++)for(let coordinate=0;coordinate<2;coordinate++)
      assert.ok(Math.abs(actual[i][coordinate]-expected[i][coordinate])<1e-10);
    const path=nodes['sim-loss-'+method].d;
    assert.ok(path.split(/[ML]/).length<=353,'Loss-chart display work stays bounded.');
    const p=state.sim.paths[method][end];
    const x=(state.lossAxes.f.l+p.samples/state.sim.paths.sgd.at(-1).samples*state.lossAxes.f.iw).toFixed(2);
    const logLoss=Math.max(-5,Math.log10(Math.max(p.loss,1e-15)));
    const y=(20+182*(1-(logLoss+5)/7)).toFixed(2);
    assert.ok(path.endsWith(`${x},${y}`),'The displayed loss path ends at the actual current update.');
  }
}
for(const progress of [0,.05,.25,.5,.75,1])checkEnd(progress);
assert.equal(ellipses,17,'Static contours are drawn once across the entire playback.');
const oldFrames=frames;checkEnd(1);assert.equal(frames,oldFrames,'An unchanged update draws no extra canvas frame.');
checkEnd(0);checkEnd(.2);checkEnd(1); // Replay clears the old trail before appending again.
document.documentElement.dataset.theme='dark';checkEnd(.5);
assert.equal(ellipses,34,'Theme changes invalidate the backdrop.');
nodes.landscape.getBoundingClientRect=()=>({width:720,height:321});
vm.runInContext('renderSim()',context);
assert.equal(ellipses,51,'Resizing invalidates the backdrop.');
nodes.landscape.getBoundingClientRect=()=>({width:720,height:320});
vm.runInContext('sim.seed=8;setup()',context);checkEnd(.3); // Reseeding invalidates trajectories.
assert.equal(vm.runInContext('sim.paths.sgd.length',context),4097);
assert(!nodes['sim-loss'].markup.includes('comparison-budget'),'The 4K endpoint needs no interior budget marker.');
assert(!nodes['sim-loss'].markup.includes('sim-expectation'),'The live loss chart must not include expected-loss curves.');
assert(!nodes['sim-loss'].markup.includes('visibility="hidden"'),'Live loss paths are always visible.');
for(const batch of [1,256,4096]){
  vm.runInContext(`sim.batch=${batch};setup();sim.progress=1;renderSim();`,context);
  const state=vm.runInContext('({sim,lossAxes})',context);
  assert.equal(state.sim.duration,60000,'The adjustable simulation retains its 60-second playback.');
  for(const method of ['sgd','newton']){
    assert.equal(state.sim.paths[method].length,4096/batch+1);
    assert.equal(state.sim.paths[method].at(-1).samples,4096,'Both optimizer paths stop at 4,096 processed samples.');
    assert.equal(state.lossAxes.x(state.sim.paths[method].at(-1).samples),state.lossAxes.f.w-state.lossAxes.f.r,'The live-loss domain ends with the physical paths.');
  }
  assert.equal(state.lossAxes.xticks.at(-1)[0],4096);
  assert.equal(state.lossAxes.xticks.at(-1)[1],'4K samples');
  assert.equal(nodes.landscape.dataset.samples,'4096');
  assert.equal(nodes['sim-progress'].textContent,'4,096 / 4,096 samples');
}
console.log('PASS: adjustable paths and live loss stop at 4K samples with 60-second playback and no extended tail.');
for(const speed of [1,2,4]){
  const progress=vm.runInContext(`sim.speed=${speed};sim.progress=0;sim.playing=true;sim.last=100;tickSim(140);sim.progress`,context);
  assert.ok(Math.abs(progress-40*speed/60000)<1e-12);
}
vm.runInContext('simVisible=false;syncSimPlayback()',context);
assert.equal(nodes.landscape.dataset.animating,'false');
assert.equal(vm.runInContext('sim.last',context),0);
document.hidden=true;
vm.runInContext('simVisible=true;sim.playing=true;syncSimPlayback()',context);
assert.equal(nodes.landscape.dataset.animating,'false','A hidden document pauses playback.');
document.hidden=false;
vm.runInContext('syncSimPlayback()',context);
assert.equal(nodes.landscape.dataset.animating,'true','Returning to the visible document resumes playback.');
const cached=vm.runInContext(`
  tuningCache.clear();
  const first=tunedMethods(sim);
  sim.seed++;
  const same=tunedMethods(sim)===first;
  sim.noise++;
  const different=tunedMethods(sim)!==first;
  for(let i=0;i<30;i++)tunedMethods({...sim,noise:i});
  ({same,different,size:tuningCache.size});
`,context);
assert.equal(cached.same,true,'New random draws reuse the same expected-loss tuning.');
assert.equal(cached.different,true,'Changing the noise cannot reuse stale tuning.');
assert.equal(cached.size,24,'The tuning cache has a fixed memory bound.');
console.log('PASS: complete trajectories, exact displayed endpoints, replay, cache invalidation, playback speeds and offscreen pause.');

// The automatic camera must retain both methods and expose honest coordinates.
for(const width of [252,280,320,390,720,1440])for(const batch of [1,256,4096])for(const noise of [0,8,80]){
  nodes.landscape.getBoundingClientRect=()=>({width,height:320});
  vm.runInContext(`sim.batch=${batch};sim.noise=${noise};sim.start=[1,1];simCamera.mode='auto';setup();`,context);
  for(const progress of [0,.2,.5,.9,1]){
    const state=vm.runInContext(`sim.progress=${progress};({cam:renderLandscape(),paths:sim.paths,view:simCamera.view,prepared:simCamera.prepared})`,context);
    const end=Math.floor(progress*(state.paths.sgd.length-1));
    for(const method of ['sgd','newton']){
      const point=state.paths[method][end].w;
      assert.ok(Math.abs(point[0]*state.cam.scale)<=width/2-37.9,'Both methods stay inside the horizontal frame.');
      assert.ok(Math.abs(point[1]*state.cam.scale)<=116.5,'Both methods stay inside the vertical frame.');
    }
    assert.ok(state.prepared.window<=257,'Detailed drawing stays bounded at every batch.');
    assert.equal(nodes.landscape.dataset.view,'auto');
    const traces=nodes.landscape.getContext('2d').vectorStrokes;
    assert.equal(traces.length,2,'Auto zoom draws the complete vector trace for both methods.');
    for(const trace of traces)assert.equal(trace.path.points.length,end+1,'The visible trace is not truncated to the recent window.');
  }
}
for(const start of [[0,0],[-1.85,-1.3],[1.85,1.3],[1,0],[0,-1]])for(const sharp of [2,60]){
  nodes.landscape.getBoundingClientRect=()=>({width:252,height:265});
  vm.runInContext(`sim.batch=1;sim.noise=80;sim.sharp=${sharp};sim.start=${JSON.stringify(start)};setup();`,context);
  for(const progress of [.1,.5,1]){
    const state=vm.runInContext(`sim.progress=${progress};({cam:renderLandscape(),paths:sim.paths})`,context);
    const end=Math.floor(progress*(state.paths.sgd.length-1));
    for(const method of ['sgd','newton']){
      const p=state.paths[method][end].w;
      assert.ok(Math.abs(p[0]*state.cam.scale)<=88.1);
      assert.ok(Math.abs(p[1]*state.cam.scale)<=94.6);
    }
  }
}
vm.runInContext("sim.batch=1;sim.noise=0;sim.start=[1,1];setup();sim.progress=1;renderLandscape()",context);
assert.ok(+nodes.landscape.dataset.zoom>20,'Late clean trajectories expand instead of clustering at the minimum.');
vm.runInContext("setSimulationView('overview')",context);
assert.equal(nodes.landscape.dataset.zoom,'1.000');
assert.equal(nodes['sim-overview'].hidden,true);
console.log('PASS: automatic camera framing across batches, noise levels and screen sizes, bounded detail work, and full overview.');

// The 3D surface and 2D paths are projections of the same experiment and playback.
assert.equal(context.defaultProjection,'3d','The geometry panel initially shows its 3D surface.');
vm.runInContext("simVisible=true;sim.playing=false;setLandscapeProjection('3d');setSimulationView('auto')",context);
for(const exponent of [0,8,12,8,0]){
  vm.runInContext(`sim.batch=2**${exponent};setup();`,context);
  const state=vm.runInContext('({sim,hero,duration:hero.duration,length:heroBackdrop.prepared.count,paths:hero.paths})',context);
  assert.equal(state.length,4096/(2**exponent)+1,'Changing batch rebuilds the projected paths for the same 4K sample budget.');
  assert.equal(state.hero.paths,state.sim.paths,'The 3D projection uses the same sampled paths as the 2D projection.');
  assert.equal(state.hero.start,state.sim.start);
  assert.equal(state.hero.tuned,state.sim.tuned);
  assert.equal(state.hero.sharp,state.sim.sharp);
  assert.equal(state.hero.noise,state.sim.noise);
  for(const method of ['sgd','newton'])
    assert.equal(state.paths[method].at(-1).samples,4096,'Both 3D paths stop at 4,096 processed samples.');
  for(const progress of [0,.1,.5,.9,1])vm.runInContext(`sim.progress=${progress};renderSim()`,context);
  assert.equal(nodes['hero-canvas'].dataset.progress,'1.000');
  assert.equal(nodes['hero-canvas'].dataset.samples,'4096');
  const paths=vm.runInContext('heroBackdrop.history',context);
  for(const method of ['sgd','newton'])assert.equal(paths[method].points.length,state.length,'The 3D projection retains its full trace.');
  assert.equal(state.duration,60000,'Both projections share a full 60-second playback, including large batches.');
}
vm.runInContext("reducedMotion.matches=true;setSimulationView('overview')",context);
assert.equal(nodes['hero-canvas'].dataset.progress,'1.000');
assert.equal(nodes['hero-canvas'].dataset.zoom,'1.000');
console.log('PASS: the 3D projection shares 4K-sample paths, 60-second playback, tuning and full traces with the 2D projection.');

vm.runInContext("reducedMotion.matches=false;sim.progress=1-20/sim.duration;sim.speed=1;sim.playing=true;sim.last=100;tickSim(140)",context);
assert.equal(nodes['hero-canvas'].dataset.animating,'false');
assert.equal(nodes['sim-play-label'].textContent,'Replay');
assert.equal(vm.runInContext('sim.progress',context),1,'Completion holds the final frame for explicit replay.');

vm.runInContext("sim.batch=256;sim.sharp=20;sim.noise=8;sim.start=[1,1];setup();sim.progress=.375;sim.playing=true;renderSim();syncSimPlayback();globalThis.sharedPaths=sim.paths;",context);
const expectedSamples=1536,lossBeforeSwitch=nodes['sim-loss-sgd'].d;
for(const view of ['2d','3d','2d','3d']){
  nodes['projection-'+view].listeners.click();
  const state=vm.runInContext('({progress:sim.progress,playing:sim.playing,paths:sim.paths,heroPaths:hero.paths})',context);
  assert.equal(state.paths,context.sharedPaths,'Changing projection preserves the same random run.');
  assert.equal(state.heroPaths,context.sharedPaths);
  assert.equal(state.progress,.375,'Changing projection preserves playback progress.');
  assert.equal(state.playing,true,'Changing projection preserves the playback state.');
  assert.equal(nodes['geometry-lab'].dataset.projection,view);
  assert.equal(nodes['landscape-panel-'+view].hidden,false);
  assert.equal(nodes['landscape-panel-'+(view==='3d'?'2d':'3d')].hidden,true);
  assert.equal(nodes['projection-'+view].attributes['aria-pressed'],'true');
  assert.equal(nodes['sim-progress'].textContent,'1,536 / 4,096 samples');
  assert.equal(nodes['sim-loss-sgd'].d,lossBeforeSwitch,'The loss curve remains synchronized when projections change.');
  assert.equal(nodes[view==='3d'?'hero-canvas':'landscape'].dataset.samples,String(expectedSamples));
  assert.equal(nodes[view==='3d'?'hero-canvas':'landscape'].dataset.animating,'true');
}
vm.runInContext('sim.progress=1;renderSim();sim.progress=0;renderSim()',context);
for(const method of ['sgd','newton'])assert.equal(vm.runInContext(`heroBackdrop.history.${method}.points.length`,context),1,'Replay clears the old 3D trace before appending again.');

// Curvature must invalidate the surface even if the sampled path identity stays fixed.
vm.runInContext('sim.sharp=2;configureHero();renderSim();globalThis.oldSurface={key:heroBackdrop.key,meshes:heroBackdrop.meshes,points:heroBackdrop.points,paths:hero.paths};sim.sharp=60;configureHero();renderSim()',context);
const surface=vm.runInContext('({old:oldSurface,key:heroBackdrop.key,meshes:heroBackdrop.meshes,points:heroBackdrop.points,paths:hero.paths})',context);
assert.equal(surface.paths,surface.old.paths,'This probe holds the path identity fixed.');
assert.notEqual(surface.key,surface.old.key,'Changing sharp-direction curvature invalidates the 3D surface key.');
assert.notEqual(surface.meshes,surface.old.meshes,'Changing curvature rebuilds the surface mesh.');
assert.notEqual(surface.points.sgd[0][1],surface.old.points.sgd[0][1],'The displayed surface height responds to the current curvature.');
console.log('PASS: projection switching preserves paths, progress, loss and playback; replay resets traces; curvature rebuilds the 3D surface.');
for(const noise of [0,8,80])for(const batch of [1,256,4096]){
  const zooms=vm.runInContext(`
    sim.noise=${noise};sim.batch=${batch};setup();
    (()=>{const prepared=SimulationCamera.prepare(sim.paths),view=SimulationCamera.layout(prepared,720,320);
    return Array.from({length:1201},(_,i)=>SimulationCamera.sample(prepared,view,i/1200).zoom);})();
  `,context);
  for(let i=1;i<zooms.length;i++){
    assert.ok(zooms[i]>=zooms[i-1]-1e-12,'The camera never zooms out during a run.');
    assert.ok(Math.log(zooms[i]/zooms[i-1])<.011,'Zoom moves gradually between adjacent frames.');
  }
}
console.log('PASS: monotonic smooth zoom and a final frame that waits for explicit replay.');

console.log('PASS: full vector traces persist through auto zoom, replay, resize and reseeding in both figures.');

// Symmetric coordinate probes cancel the surface height, exposing the rendered
// tangent basis without duplicating the production projection coefficients.
vm.runInContext(`hero.paths={sgd:[{w:[-.001,0]},{w:[.001,0]}],newton:[{w:[0,-.001]},{w:[0,.001]}]}`,context);
for(const [width,height] of [[252,285],[340,285],[720,300],[1440,300]]){
  nodes['hero-canvas'].getBoundingClientRect=()=>({width,height});
  vm.runInContext('drawHero(0)',context);
  const points=vm.runInContext('heroBackdrop.points',context);
  for(const [axis,method,sign] of [['flat','sgd',1],['sharp','newton',-1]]){
    const numbers=compassNodes[axis].attributes.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    const arrow=[numbers[2]-numbers[0],numbers[3]-numbers[1]];
    const projected=points[method][1].map((value,i)=>value-points[method][0][i]);
    const cosine=(arrow[0]*projected[0]+arrow[1]*projected[1])/(Math.hypot(...arrow)*Math.hypot(...projected));
    assert.ok(Math.abs(1-cosine)<1e-12,'Each compass arrow agrees with its rendered positive coordinate direction after resizing.');
    assert.ok(sign*arrow[0]>0&&arrow[1]>0,'Flat points down-right; sharp points down-left.');
  }
}
console.log('PASS: hero compass directions match the rendered tangent basis across phone and desktop sizes.');
