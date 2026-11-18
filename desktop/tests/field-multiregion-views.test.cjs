'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../src/FoamLensDesktop/frontend');
const compare=fs.readFileSync(path.join(root,'v14-z-field-compare.js'),'utf8');
const field=fs.readFileSync(path.join(root,'v14-field-view.js'),'utf8');
new Function(compare);new Function(field);
const start=compare.indexOf('function fcPhysicalFor(state){'),end=compare.indexOf('function fcStatsMarkup(',start);
assert(start>0&&end>start,'View-local physical region implementation must exist');
const metal={boundsMin:[0,0,0],boundsMax:[1,1,1],cellCount:3};
const mold={boundsMin:[-1,-2,-3],boundsMax:[2,3,4],cellCount:3};
const sourceCase={id:'scientific-case-1',meshInventory:[
  {region:'metal',complete:true},{region:'mold',complete:true}
],discoveryModel:{fields:[]}};
const otherCase={id:'scientific-case-2',meshInventory:[{region:'alloy',complete:true}],discoveryModel:{fields:[]}};
let loads=0,geometryLoads=0,released=0,redraws=0;
let exactTimeAvailable=true,physicalHold=null;
const sources={
  fvRegionNames:c=>c.id===sourceCase.id?['metal','mold']:['alloy'],
  fvFieldGroups:(c,region)=>c.id===sourceCase.id?
    (region==='metal'?[{name:'T',kind:'scalar',times:[1]}]:[{name:'alphaL',kind:'scalar',times:[1]}]):
    [{name:'U',kind:'vector',times:[1]}],
  fvRegionReleaseLayer:()=>released++,
  fvRegionExactTime:(times,time)=>exactTimeAvailable?times.find(t=>t===time):undefined,
  fvLoadFrameData:async(c,g,region,t,component)=>{
    loads++;if(physicalHold)await physicalHold;
    return{mesh:region==='mold'?mold:metal,fieldValues:[10,20,30],
      storage:'volume',range:{min:10,max:30,valid:true},parsed:{dimensions:'[0 0 0 1 0 0 0]'}}},
  fvRegionGeometryAtTime:async()=>{geometryLoads++;return mold},
  fvRegionBuildLayer:(region,mesh,data,choice,time,renderer)=>({
    gl:renderer.gl,region,mesh,sourceTime:data.sourceTime,status:data.status||'',
    geometryOnly:!data.fieldValues,fieldValues:data.fieldValues||null
  }),
  fvRegionUnionBounds:meshes=>{
    const list=(meshes||[]).filter(m=>m?.boundsMin?.length===3&&m?.boundsMax?.length===3);
    if(!list.length)return null;
    const min=[0,1,2].map(i=>Math.min(...list.map(m=>m.boundsMin[i])));
    const max=[0,1,2].map(i=>Math.max(...list.map(m=>m.boundsMax[i])));
    return{min,max}
  },
  fcPhysicalNumber:v=>typeof v==='number'&&Number.isFinite(v)?v:NaN,
  fcUi:(a)=>a,fcFmt:v=>String(v),fcEsc:s=>String(s),
  fvMetricScale:()=>({unit:'m'}),fvMetricLabel:n=>String(n),
  fvProjectWorld:(p,mvp,w,h)=>({x:w/2+p[0]*20,y:h/2-p[1]*20}),
  document:{getElementById:()=>null},
  fcExtraDom:()=>null,fvState:{},fcState:{},fcExtraViews:[],
  fvRegionChoice:()=>({visible:true}),
  fvFieldComponents:()=>[{v:'value',t:'Value'}],
  fvRegionRefreshList:()=>{},
  fvRegionApplyVisibility:()=>{},
  fvRegionLoadFrame:async()=>{},
  fcRender:()=>{},fcExtraRender:()=>{},
  console
};
const funcs=Object.keys(sources);
const factory=new Function(...funcs,compare.slice(start,end)+
  ';return{fcPhysicalFor,fcPhysicalRelease,fcPhysicalChoiceList,fcPhysicalLoad,fcPhysicalBoundsFor,fcPhysicalOverlayFor};');
const api=factory(...funcs.map(n=>sources[n]));
const stateB={mesh:metal,region:'metal',fieldName:'T',renderer:{gl:{}}};
const stateC={mesh:metal,region:'metal',fieldName:'T',renderer:{gl:{}}};
assert.deepStrictEqual(api.fcPhysicalChoiceList(stateB,sourceCase,'metal'),['metal','mold']);
api.fcPhysicalChoiceList(stateC,sourceCase,'metal');
assert.notStrictEqual(api.fcPhysicalFor(stateB).choices,api.fcPhysicalFor(stateC).choices,
  'B and C may not share mutable region selections');
const bMold=api.fcPhysicalFor(stateB).choices.get('mold');
const cMold=api.fcPhysicalFor(stateC).choices.get('mold');
bMold.visible=true;bMold.visibilityExplicit=true;cMold.visible=false;cMold.visibilityExplicit=true;bMold.opacity=.55;
assert.strictEqual(cMold.visible,false,'B change must not mutate C');
assert.strictEqual(bMold.visible,true);
api.fcPhysicalChoiceList(stateB,otherCase,'alloy');
api.fcPhysicalChoiceList(stateB,sourceCase,'metal');
assert.strictEqual(api.fcPhysicalFor(stateB).choices.get('mold').opacity,.55,
  'When a user returns to a case, the view-specific settings should return');
assert.strictEqual(api.fcPhysicalFor(stateB).choices.get('mold').visible,true);
assert.strictEqual(api.fcPhysicalFor(stateC).choices.get('mold').visible,false);
(async()=>{
  await api.fcPhysicalLoad(stateB,sourceCase,'metal',1,()=>redraws++);
  const layer=api.fcPhysicalFor(stateB).layers.get('mold');
  assert(layer&&layer.mesh===mold,'B must render real mold mesh, not only metal');
  assert.deepStrictEqual(layer.fieldValues,[10,20,30],'Use actual source field arrays');
  assert.strictEqual(layer.sourceTime,1,'Physical time must remain source-backed');
  assert.deepStrictEqual(api.fcPhysicalBoundsFor(stateB),{min:[-1,-2,-3],max:[2,3,4]},
    'XYZ dimensions must include all visible physical regions');
  assert.strictEqual(api.fcPhysicalFor(stateC).layers.size,0,'Loading B must not change C');
  const before=loads;exactTimeAvailable=false;
  await api.fcPhysicalLoad(stateB,sourceCase,'metal',2,()=>redraws++);
  assert.strictEqual(loads,before,'No invented field frame when source time is missing');
  assert.strictEqual(geometryLoads,1,'Only source-backed geometry should be used');
  const geometry=api.fcPhysicalFor(stateB).layers.get('mold');
  assert(geometry?.geometryOnly&&geometry.sourceTime===null,
    'Missing field at time must remain geometry-only and have null source timestamp');
  assert(geometry.status.includes('Geometry only'));
  assert(released>0,'Stale GPU region layers must be released');
  assert.strictEqual(redraws,2,
    'The original B 3D renderer must paint exactly one complete frame per timestep, never an intermediate empty scene');
  // Before this fix, a previous mold layer was immediately destroyed and
  // the canvas redrawn while its replacement source read was still pending.
  exactTimeAvailable=true;
  let releaseNext;
  physicalHold=new Promise(resolve=>{releaseNext=resolve});
  const lastComplete=api.fcPhysicalFor(stateB).layers.get('mold'),beforeAtomic=redraws;
  const inFlight=api.fcPhysicalLoad(stateB,sourceCase,'metal',1,()=>redraws++);
  await Promise.resolve();
  assert.strictEqual(api.fcPhysicalFor(stateB).layers.get('mold'),lastComplete,
    'Waiting on a new measured OpenFOAM time must retain the last complete GPU scene');
  assert.equal(redraws,beforeAtomic,
    'No intermediate blank or half-painted B/C/D scene is allowed during an asynchronous time load');
  releaseNext();
  await inFlight;
  physicalHold=null;
  assert.notStrictEqual(api.fcPhysicalFor(stateB).layers.get('mold'),lastComplete,
    'The new measured time must replace the previous complete scene');
  assert.equal(redraws,beforeAtomic+1,
    'All secondary B/C/D physical layers commit in one final redraw');
  const x={attributes:{},innerHTML:'',setAttribute(key,value){this.attributes[key]=value}};
  const dimensions={textContent:'',hidden:false};
  const input={checked:true};
  const viewport={querySelector:key=>key==='.fcMetricAxes'?x:key==='.fcMetricBounds'?dimensions:key==='[data-fc-dimensions]'?input:null};
  sources.document.getElementById=id=>id==='fcViewport'?viewport:null;
  api.fcPhysicalOverlayFor('B',stateB,{width:800,height:480},[],{projection:'orthographic'});
  assert(dimensions.textContent.includes('X: -1')&&dimensions.textContent.includes('Y: -2')&&dimensions.textContent.includes('Z: -3'),
    'B must display measured XYZ bounds and axes instead of reusing A');
  assert(x.innerHTML.includes('<line')&&x.innerHTML.includes('<text'),
    'B should display projected axes with numeric metric labels');
  input.checked=false;api.fcPhysicalOverlayFor('B',stateB,{width:800,height:480},[],{projection:'orthographic'});
  assert.strictEqual(x.innerHTML,'','Dimensions disabled in B should not alter A');
  for(const fragment of ['fcPhysicalMenu(bar.dataset.fcToolbar)','data-fc-regions','data-fc-dimensions',
    'fcPhysicalRenderLayers(fcState,visual)','fcPhysicalRenderLayers(state,visual)',
    "fcPhysicalMenu('B')","fcPhysicalMenu(String(state.id))",
    "fvRegionBuildLayer(region,mesh,data,choice,time,state.renderer)"])
    assert(compare.includes(fragment),'Missing live multi-region UI or WebGL code: '+fragment);
  assert(field.includes('renderer=fvState.renderer')&&field.includes('const gl=renderer?.gl'),
    'Region layers must accept B/C/D independent WebGL context');
  // Execute the ORIGINAL A physical-region loader against a deferred
  // source read. The old implementation cleared WebGL and rendered a blank
  // frame before each time's metal/mold data finished loading.
  const aStart=field.indexOf('async function fvRegionLoadFrame(c,time,{preserveLoaded=false}={}){'),
    aEnd=field.indexOf('window.FoamLensRegionScene=',aStart);
  assert(aStart>=0&&aEnd>aStart,'Original Field A physical-region loader required');
  const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
  const sourceDelay=deferred(),cameraBounds=[],repaints=[],releasedA=[];
  const originalGL={},priorA={gl:originalGL,time:9.8,region:'mold'},
    ACase={id:'original-case-A'};
  const aScene={caseId:String(ACase.id),sequence:0,fitPending:false,
    choices:new Map([['mold',{visible:true,field:'T',component:'value'}]]),
    layers:new Map([['mold',priorA]])};
  const aDeps={
    fvRegionPhysicalTime:t=>Number(t),fvState:{renderer:{gl:originalGL}},
    fvRegionEnsureCase:()=>{},fvRegionScene:aScene,
    fvRegionChoice:(c,region)=>aScene.choices.get(region)||{visible:true},
    fvTimeEqual:(x,y)=>Number(x)===Number(y),
    fvRegionNames:()=>['metal','mold'],
    fvRegionStatus:()=>{},fvRegionUpdateLegend:()=>{},
    fvFieldGroups:()=>[{name:'T',kind:'scalar',times:[10]}],
    fvRegionExactTime:(times,time)=>times.find(t=>t===time),
    fvLoadFrameData:async()=>{await sourceDelay.promise;
      return{mesh:mold,fieldValues:[10],storage:'volume',parsed:{},
        range:{valid:true,min:10,max:10}}},
    pmUnitFromDimensions:()=>'',fvFmt:String,fvAssociationLabel:()=> 'volume',
    fvFmtRange:String,fvRegionGeometryAtTime:async()=>mold,
    flUi:en=>en,fvRegionObserveRange:()=>{},
    fvRegionBuildLayer:(region,mesh,values,choice,time)=>
      ({gl:originalGL,region,mesh,time,sourceTime:values.sourceTime}),
    fvRegionReleaseLayer:layer=>releasedA.push(layer),
    fvRegionRefreshList:()=>{},
    fvRegionFitCamera:()=>{cameraBounds.push([...aScene.layers.keys()]);return true},
    fvRender:()=>repaints.push([...aScene.layers.keys()]),
    window:{FoamLensAnimationExport:{isExporting:()=>false}}
  };
  const loadOriginalA=new Function('deps',
    'const {'+Object.keys(aDeps).join(',')+'}=deps;'+
    field.slice(aStart,aEnd)+';return fvRegionLoadFrame;')(aDeps);
  const pendingA=loadOriginalA(ACase,10);
  await Promise.resolve();
  assert.strictEqual(aScene.layers.get('mold'),priorA,
    'A must preserve previous measured region during the new source I/O');
  assert.equal(repaints.length,0,
    'A must not flash an empty or partial canvas during an awaited time change');
  sourceDelay.resolve();
  await pendingA;
  assert.notStrictEqual(aScene.layers.get('mold'),priorA,
    'A atomic commit must replace the old source layer after all reads settle');
  assert.equal(aScene.layers.get('mold').sourceTime,10,
    'A committed layer must retain its actual measured physical time');
  assert.deepStrictEqual(releasedA,[priorA],
    'Only the superseded original A GPU layer may be released');
  assert.equal(repaints.length,1,
    'Field A must redraw one completed frame, not several incomplete times');
  assert.equal(cameraBounds.length,0,'No transient camera fit occurs while staging');

  // Execute the installed ORIGINAL A→B/C/D playback adapter. In linked
  // playback, fast A/B responses must NOT draw while the slower C/D
  // source frame is still waiting for its real OpenFOAM data.
  const linkedStart=compare.indexOf('let fcLinkedPlaybackSeq=0;'),
    adapterStart=compare.indexOf("if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fcPatched)",linkedStart),
    adapterEnd=compare.indexOf("  if(typeof fvRender==='function'&&!fvRender.__fcPatched)",adapterStart);
  assert(linkedStart>=0&&adapterStart>linkedStart&&adapterEnd>adapterStart,
    'Original coordinated Field playback adapter required');
  const allowA=deferred(),allowExtras=deferred(),visual=[];
  const linkedA={frameSeq:0},linkedB={enabled:true},linkedC={id:3},linkedD={id:4};
  const playbackDeps={
    fvState:linkedA,fcState:linkedB,fcExtraViews:[linkedC,linkedD],
    fvLoadFrame:async()=>{linkedA.frameSeq++;await allowA.promise},
    fcTimesLinked:()=>true,
    fcRefreshFrame:async()=>{visual.push('load B')},
    fcRefreshExtras:async()=>{visual.push('load C/D');await allowExtras.promise},
    fcUpdateDifference:()=>{},fcUpdateLabels:()=>{},fcScheduleToolbarSync:()=>{},
    fvRender:()=>visual.push('paint A'),fcRender:()=>visual.push('paint B'),
    fcRenderDifference:()=>visual.push('paint Δ'),
    fcRenderExtras:()=>visual.push('paint C/D')
  };
  const linkPlayback=new Function('deps',
    'const {'+Object.keys(playbackDeps).join(',')+'}=deps;let fcLinkedPlaybackSeq=0;'+
    compare.slice(adapterStart,adapterEnd)+';return fvLoadFrame;')(playbackDeps);
  const playback=linkPlayback();
  assert(linkedA._fvGroupHold&&linkedB._fcGroupHold&&linkedC._fcGroupHold&&linkedD._fcGroupHold,
    'All four independent GPUs must be held together during synchronized playback');
  allowA.resolve();
  await Promise.resolve();await Promise.resolve();
  assert(!visual.some(x=>x.startsWith('paint')),
    'A/B must not flash their new colors before the slower C/D frame resolves');
  allowExtras.resolve();await playback;
  assert.deepStrictEqual(visual.filter(x=>x.startsWith('paint')),
    ['paint A','paint B','paint Δ','paint C/D'],
    'Synchronized playback must present exactly one coherent A/B/C/D frame');
  assert.equal(linkedA._fvGroupHold,0);assert.equal(linkedB._fcGroupHold,0);
  assert.equal(linkedC._fcGroupHold,0);assert.equal(linkedD._fcGroupHold,0);

  console.log('OpenFOAM independent A-D region test PASS: per-case choices, no B/C cross-talk, real mold layer, physical XYZ, and honest geometry-only fallback');
})().catch(error=>{console.error(error);process.exitCode=1});
