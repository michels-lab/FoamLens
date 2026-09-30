'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const probePath=path.join(root,'src','FoamLensDesktop','frontend','v14-probe-picking.js');
const fieldPath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const source=fs.readFileSync(probePath,'utf8');
const fieldSource=fs.readFileSync(fieldPath,'utf8');
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

console.log('FoamLens 3D Field Probe regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
