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
let exactTimeAvailable=true;
const sources={
  fvRegionNames:c=>c.id===sourceCase.id?['metal','mold']:['alloy'],
  fvFieldGroups:(c,region)=>c.id===sourceCase.id?
    (region==='metal'?[{name:'T',kind:'scalar',times:[1]}]:[{name:'alphaL',kind:'scalar',times:[1]}]):
    [{name:'U',kind:'vector',times:[1]}],
  fvRegionReleaseLayer:()=>released++,
  fvRegionExactTime:(times,time)=>exactTimeAvailable?times.find(t=>t===time):undefined,
  fvLoadFrameData:async(c,g,region,t,component)=>{
    loads++;return{mesh:region==='mold'?mold:metal,fieldValues:[10,20,30],
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
bMold.visible=true;cMold.visible=false;bMold.opacity=.55;
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
  assert(redraws>=4,'Real layout needs redraw when region state changes');
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
  for(const fragment of ['fcPhysicalMenu(toolbar.dataset.fcToolbar)','data-fc-regions','data-fc-dimensions',
    'fcPhysicalRenderLayers(fcState,visual)','fcPhysicalRenderLayers(state,visual)',
    "fcPhysicalMenu('B')","fcPhysicalMenu(String(state.id))",
    "fvRegionBuildLayer(region,mesh,data,choice,time,state.renderer)"])
    assert(compare.includes(fragment),'Missing live multi-region UI or WebGL code: '+fragment);
  assert(field.includes('renderer=fvState.renderer')&&field.includes('const gl=renderer?.gl'),
    'Region layers must accept B/C/D independent WebGL context');
  console.log('OpenFOAM independent A-D region test PASS: per-case choices, no B/C cross-talk, real mold layer, physical XYZ, and honest geometry-only fallback');
})().catch(error=>{console.error(error);process.exitCode=1});
