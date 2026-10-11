'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const probePath=path.join(root,'src','FoamLensDesktop','frontend','v14-probe-picking.js');
const fieldPath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const source=fs.readFileSync(probePath,'utf8');
const fieldSource=fs.readFileSync(fieldPath,'utf8');
const workspaceSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-zz-field-workspace.js'),'utf8');
new Function(source);
new Function(fieldSource);

const begin='/* FOAMLENS_FIELD_PROBE_CORE_START */';
const end='/* FOAMLENS_FIELD_PROBE_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field Probe core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {fpMat4Invert,fpTransform4,fpPerspectiveDivide,fpRayTriangle,fpTriangleValue,fpPickTriangles};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-10){assert(Math.abs(a-b)<=e,String(a)+' != '+String(b))}

test('4x4 identity matrix inversion preserves homogeneous coordinates',()=>{
  const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],inv=api.fpMat4Invert(I);
  assert(inv);for(let i=0;i<16;i++)near(inv[i],I[i]);
  assert.deepEqual(api.fpTransform4(inv,[.2,-.4,.7,1]).map(x=>Number(x.toFixed(12))),[.2,-.4,.7,1]);
});

test('ray cast hits a known triangle with correct barycentric coordinates',()=>{
  const hit=api.fpRayTriangle([.25,.25,1],[0,0,-1],[0,0,0],[1,0,0],[0,1,0]);
  assert(hit);near(hit.t,1);near(hit.point[0],.25);near(hit.point[1],.25);near(hit.point[2],0);
  near(hit.u,.25);near(hit.v,.25);near(hit.w,.5);
});

test('barycentric interpolation returns the field value at the hit point',()=>{
  const hit=api.fpRayTriangle([.25,.25,1],[0,0,-1],[0,0,0],[1,0,0],[0,1,0]);
  near(api.fpTriangleValue(hit,[0,1,2],0),.75);
});

test('nearest rendered triangle wins and preserves its source/cell metadata',()=>{
  const positions=new Float32Array([
    0,0,0, 1,0,0, 0,1,0,
    0,0,-1, 1,0,-1, 0,1,-1
  ]);
  const hit=api.fpPickTriangles([.2,.2,1],[0,0,-1],positions,{values:[10,20,30,100,200,300],kind:'surface',cellIds:[7,9]});
  assert(hit);assert.equal(hit.triangle,0);assert.equal(hit.kind,'surface');assert.equal(hit.cell,7);near(hit.point[2],0);near(hit.value,16);
});


test('face-associated picking preserves the exact internal-face identity',()=>{
  const positions=new Float32Array([0,0,0,1,0,0,0,1,0]);
  const hit=api.fpPickTriangles([.2,.2,1],[0,0,-1],positions,{kind:'internalFace',faceIds:[12]});
  assert(hit);assert.equal(hit.face,12);assert.equal(hit.cell,null);assert.equal(hit.kind,'internalFace');
});

test('constant-value iso picking reports the iso value rather than interpolating colors',()=>{
  const positions=new Float32Array([0,0,0,1,0,0,0,1,0]);
  const hit=api.fpPickTriangles([.2,.2,1],[0,0,-1],positions,{constantValue:.5,kind:'iso'});
  assert(hit);near(hit.value,.5);assert.equal(hit.kind,'iso');
});

test('parallel or outside rays correctly report no hit',()=>{
  assert.equal(api.fpRayTriangle([.2,.2,1],[1,0,0],[0,0,0],[1,0,0],[0,1,0]),null);
  assert.equal(api.fpRayTriangle([2,2,1],[0,0,-1],[0,0,0],[1,0,0],[0,1,0]),null);
});

test('product wiring exposes probe controls, rendered-geometry picking and marker buffers',()=>{
  for(const token of [
    "box",
    "fvProbeMode",
    "fvProbeClear",
    "fvProbeReadout",
    "fpCanvasRay",
    "fpRenderedPick",
    "fvState.isoGeometry",
    "fvState.sliceGeometry",
    "surfaceOwners",
    "fpInternalFaceGeometry",
    "fpBoundaryPointValues",
    "internalFace",
    "pointSurface",
    "faceIds",
    "fieldStorage",
    "pointerdown",
    "crosshair"
  ])assert(source.includes(token),'Missing Field Probe product token: '+token);
  for(const token of [
    "probePos:null",
    "probeColor:null",
    "probeCount:0",
    "fvBindDraw(r,r.probePos,r.probeColor,r.probeCount,gl.LINES,1)",
    "if(typeof fpClear==='function')fpClear()"
  ])assert(fieldSource.includes(token),'Missing Field View probe renderer hook: '+token);
});

test('Probe ON/OFF changes the rendered marker and exposes a visible size control',()=>{
  for(const token of [
    "markerSize:'medium'","fvProbeSize","Probe S","Probe M","Probe L",
    "fvProbeStatePill","Probe ON","Probe OFF","fvProbeMarkerOverlay",
    "if(!hit||!fpState.enabled){r.probeCount=0",
    "if(fpState.enabled&&fpState.last)fpUpdateMarker(fpState.last)",
    "o?.classList.add('hidden')","fpOverlaySizePx"
  ])assert(source.includes(token),'Missing visible Probe state token: '+token);
  assert(source.includes("r.probeCount=0"),'Disabling Probe does not clear the rendered WebGL marker.');
});

test('Probe ON shows an armed reticle before a point is pinned',()=>{
  for(const token of [
    'fvProbeAimOverlay','fpEnsureAimOverlay','fpMoveAimOverlay','fpHideAimOverlay',
    "canvas.addEventListener('pointermove'","canvas.addEventListener('pointerenter'",
    "canvas.addEventListener('pointerleave'","Probe ON · move pointer · click to pin",
    'fvProbeMarkerOverlay'
  ])assert(source.includes(token),'Missing armed Probe reticle token: '+token);
  assert(source.includes("if(!fpState.enabled)fpHideAimOverlay()"),
    'Probe OFF does not hide the armed reticle.');
});

test('primary Probe selection refreshes synchronized per-view statistics',()=>{
  assert(source.includes('window.FoamLensFieldCompare?.updateStats?.()'),'Primary Probe does not notify synchronized per-view statistics.');
  assert(source.includes('getLast:()=>fpState.last'),'Synchronized views cannot read the primary Probe selection.');
  assert(source.includes('isEnabled:()=>fpState.enabled'),'Synchronized views cannot share the Probe armed state.');
});

test('probe module stays generic and contains no thesis fixture names',()=>{
  for(const banned of ['QuickCup','B3_reference','B12_','C12_'])assert(!source.includes(banned),'Project-specific token leaked into probe module: '+banned);
});


test('Field discovery refreshes visible Probe region choices without stale case options',()=>{
  const helperStart=fieldSource.indexOf('function fvRegionPalette(');
  const helperEnd=fieldSource.indexOf('function fvRegionStatus(',helperStart);
  const fieldStart=fieldSource.indexOf('function fvRegionRefreshList(){');
  const fieldEnd=fieldSource.indexOf('function fvRegionApplyVisibility(',fieldStart);
  const probeStart=source.indexOf('function fpRefreshRegions(){');
  const probeEnd=source.indexOf('function fpSecondaryRegionPick(',probeStart);
  assert(helperStart>=0&&helperEnd>helperStart&&fieldStart>=0&&fieldEnd>fieldStart&&probeStart>=0&&probeEnd>probeStart,
    'Real Field/Probe selector refresh implementation must be available');
  const select={options:[],_value:'auto',
    get value(){return this._value},
    set value(v){this._value=this.options.some(x=>x.value===v)?v:''},
    replaceChildren(){this.options=[];this._value=''},
    appendChild(option){this.options.push(option);if(this.options.length===1)this._value=option.value}
  };
  const rows={replaceChildren(){},innerHTML:''},panel={hidden:false},primary={value:'metal'};
  const dom={getElementById:id=>({fvProbeRegion:select,fvRegion:primary,
    fvMultiRegionRows:rows,fvMultiRegionPanel:panel}[id]||null),
    createElement:()=>({value:'',textContent:''})};
  let regions=['metal','mold'],refreshCount=0;
  const probeWindow={FoamLensRegionScene:{regionNames:()=>regions}};
  const refreshProbe=new Function('document','window','fvCase','fpUi',
    source.slice(probeStart,probeEnd)+';return fpRefreshRegions;')(
    dom,probeWindow,()=>({id:17}),x=>x);
  const fieldWindow={FoamLensFieldProbe:{fpRefreshRegions:()=>{refreshCount++;refreshProbe()}}};
  const refreshField=new Function('document','window','fvCase','fvRegionEnsureCase',
    'fvRegionNames','fvRegionChoice','fvFieldGroups','fvRegionScene','fvEsc',
    'fvAssociationLabel','flUi',
    fieldSource.slice(helperStart,helperEnd)+fieldSource.slice(fieldStart,fieldEnd)+';return fvRegionRefreshList;')(
    dom,fieldWindow,()=>({id:17}),()=>{},()=>regions,
    ()=>({visible:true,field:'T',opacity:.5}),()=>[],{layers:new Map()},
    x=>String(x),()=>'',x=>x);
  refreshField();
  assert(select.options.some(x=>x.value==='region:metal'));
  assert(select.options.some(x=>x.value==='region:mold'),
    'Imported physical mold must be selectable; never leave only initial Auto/metal options');
  select.value='region:mold';
  refreshField();
  assert.equal(select.value,'region:mold','Refreshing Field must preserve a valid explicit Probe region');
  regions=['metal'];
  refreshField();
  assert.equal(select.options.some(x=>x.value==='region:mold'),false,
    'Switching OpenFOAM cases must discard a region no longer present');
  assert.equal(select.value,'auto','Invalid old region selection must fall back to Auto');
  assert.equal(refreshCount,3,'Every Field inventory refresh must invoke the actual Probe API');
  assert(rows.innerHTML.includes('data-fv-region-palette'),
    'Region inspector must retain real palette controls without breaking Probe region discovery');
});

console.log('FoamLens 3D Field Probe regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);


test('same-WebGL metal/mold probes use region-specific physical values and never borrow primary units',()=>{
  const begin=source.indexOf('function fpSecondaryRegionPick(');
  const end=source.indexOf('function fpMarkerScale()',begin);
  assert(begin>0&&end>begin,'Independent region picking module missing');
  const regionCode=source.slice(begin,end);
  const triangles=new Float32Array([0,0,0,1,0,0,0,1,0]);
  const mesh={surfaceOwners:[0],pointCount:3,cellCount:1,internalFaceCount:2,trianglePositions:triangles,
    surfaceTriangles:[0,1,2],facePositions:triangles,points:[0,0,0,1,0,0,0,1,0]};
  const layer={region:'mold',mesh,probePositions:triangles,storage:'volume',field:'T',time:9.8,
    parsed:{dimensions:[0,0,0,1,0,0,0]},fieldValues:[1542.8]};
  const scene={caseId:'17',choices:new Map([['metal',{visible:true}],['mold',{visible:true}]]),
    layers:new Map([['mold',layer]])};
  let target='auto',surface=true;
  const picker=new Function('scene','mesh','targetFn','surfaceFn','core',[
    'const window={FoamLensRegionScene:{state:()=>scene}};',
    "const document={getElementById:id=>id==='fvProbeRegion'?{get value(){return targetFn()}}:id==='fvRegion'?{value:'metal'}:id==='fvSurface'?{get checked(){return surfaceFn()}}:null};",
    'const fvState={caseId:17,fieldName:"T",fieldStorage:"volume",fieldParsed:{dimensions:[0,0,0,1,0,0,0]},time:9.8};',
    'const fpPickTriangles=core.fpPickTriangles;',
    'const fpSurfacePositions=mesh=>{throw Error("Region picking must reuse pre-triangulated geometry")};',
    'const fpInternalFaceGeometry=mesh=>({positions:mesh.facePositions,triangleFaces:[1]});',
    'const fpBoundaryPointValues=(mesh,values)=>mesh.surfaceTriangles.map(i=>Number(values[i]));',
    'const fpPickPrimaryRendered=ray=>({t:2,point:[.2,.2,-1],triangle:0,cell:0,face:null,value:1300,kind:"surface"});',
    regionCode,
    'return {rendered:fpRenderedPick,secondary:fpSecondaryRegionPick};'
  ].join('\n'))(scene,mesh,()=>target,()=>surface,api);
  const ray={origin:[.25,.25,1],dir:[0,0,-1]};
  let hit=picker.rendered(ray);
  assert(hit,'Mold should be selectable on the same canvas');
  assert.equal(hit.region,'mold');
  assert.equal(hit.caseId,'17');
  assert.equal(hit.fieldName,'T');
  assert.equal(hit.time,9.8);
  assert.equal(hit.value,1542.8,'Mold must use its own OpenFOAM cell, not primary metal');
  target='region:metal';hit=picker.rendered(ray);
  assert.equal(hit.region,'metal');
  assert.equal(hit.value,1300,'Explicit primary selection must still work behind the enclosing mold');
  target='region:mold';
  layer.fieldValues=[1200,1500,1800];layer.storage='point';
  hit=picker.rendered(ray);
  near(hit.value,1425,1e-9);
  assert.equal(hit.storage,'point');
  layer.fieldValues=[999,1234];layer.storage='surface';
  hit=picker.rendered(ray);
  assert.equal(hit.kind,'internalFace');
  assert.equal(hit.face,1);
  assert.equal(hit.value,1234,'Face association must use exact OpenFOAM internal-face index');
  layer.fieldValues=null;layer.storage='';
  hit=picker.rendered(ray);
  assert.equal(hit.region,'mold');
  assert.equal(hit.geometryOnly,true);
  assert(Number.isNaN(hit.value),'Geometry-only region must not fabricate scientific value');
  scene.choices.get('mold').visible=false;
  assert.equal(picker.rendered(ray),null,'Hidden region must not be picked');
  target='auto';
  hit=picker.rendered(ray);
  assert.equal(hit.region,'metal','Auto mode must skip hidden mold geometry');
  assert.equal(hit.value,1300);
  assert(source.includes("id='fvProbeRegion'"),'User must have an explicit same-scene region selector');
  assert(source.includes("fpRefreshRegions();"),'Physical-region list must be refreshed after discovery');
  assert(source.includes("'Region','Región'"),'Readout must identify the physical region');
  assert(fieldSource.includes('fieldValues:values||null'),'Region layers must retain the actual independent field array');
  assert(fieldSource.includes('probePositions:shape.surfacePositions'),'Region Probe must share exact CPU triangles with GPU upload');
});

test('probe time histories cannot silently mix OpenFOAM cases or metal/mold regions',()=>{
  const start=workspaceSource.indexOf('function fwProbeMatchesFieldSource(');
  const end=workspaceSource.indexOf('async function fwBuildProbeFieldHistory(',start);
  assert(start>=0&&end>start,'Exact physical-probe ownership guard missing');
  const verify=new Function(workspaceSource.slice(start,end)+';return fwProbeMatchesFieldSource;')();
  const c={id:17};
  assert.equal(verify({caseId:17,region:'metal'},c,'metal'),true);
  assert.equal(verify({caseId:'17',region:'mold'},c,'mold'),true);
  assert.equal(verify({caseId:17,region:'mold'},c,'metal'),false,'Must not borrow mold measurements for metal');
  assert.equal(verify({caseId:18,region:'metal'},c,'metal'),false,'Must not borrow another simulation');
  assert.equal(verify(null,c,'metal'),false,'Missing probe cannot be accepted');
  assert(workspaceSource.includes('if(!fwProbeMatchesFieldSource(probe,c,region))'),
    'Physical source match must be enforced before loading OpenFOAM frames');
  assert(workspaceSource.includes('region:primary.region??fvState.region'),
    'Field histories must use the pinned measured region, not the selected primary');
});
