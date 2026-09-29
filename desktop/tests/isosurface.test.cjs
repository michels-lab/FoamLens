'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const isoPath=path.join(root,'src','FoamLensDesktop','frontend','v14-isosurface.js');
const fieldPath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const isoSource=fs.readFileSync(isoPath,'utf8');
const fieldSource=fs.readFileSync(fieldPath,'utf8');
new Function(isoSource);
new Function(fieldSource);

const begin='/* FOAMLENS_ISOSURFACE_CORE_START */';
const end='/* FOAMLENS_ISOSURFACE_CORE_END */';
const a=isoSource.indexOf(begin),b=isoSource.indexOf(end,a);
assert(a>=0&&b>a,'Iso-surface core markers missing.');
const core=isoSource.slice(a,b+end.length);
const api=new Function(core+';return {fvIsoPointKey,fvIsoTriangleArea,fvIsoTetra};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-10){assert(Math.abs(a-b)<=e,String(a)+' != '+String(b))}

test('linear tetra field produces the exact phi=0.5 triangle',()=>{
  const vertices=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]];
  const values=[0,1,0,0];
  const tris=api.fvIsoTetra(vertices,values,.5,1e-12);
  assert.equal(tris.length,1);
  for(const p of tris[0])near(p[0],.5);
  near(api.fvIsoTriangleArea(...tris[0]),.125);
});

test('four-edge tetra intersection is triangulated into two finite triangles',()=>{
  const vertices=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]];
  const values=[0,1,1,0];
  const tris=api.fvIsoTetra(vertices,values,.5,1e-12);
  assert.equal(tris.length,2);
  for(const tri of tris)for(const p of tri)assert(p.every(Number.isFinite));
  assert(tris.every(tri=>api.fvIsoTriangleArea(...tri)>0));
});

test('iso value outside tetra range produces no geometry',()=>{
  const tris=api.fvIsoTetra([[0,0,0],[1,0,0],[0,1,0],[0,0,1]],[0,1,0,0],2,1e-12);
  assert.equal(tris.length,0);
});

test('iso vertex de-duplication key is tolerance based',()=>{
  assert.equal(api.fvIsoPointKey([.5,.25,0],1e-6),api.fvIsoPointKey([.5000001,.2500001,0],1e-6));
});

test('Field View product wiring renders iso-surfaces as transient interior geometry',()=>{
  for(const token of [
    "id='fvIsoPanel'",
    "id='fvIso'",
    "id='fvIsoValue'",
    "id='fvIsoOpacity'",
    "id='fvIsoMidrange'",
    "marching tetrahedra",
    "fvBuildIsoSurfaceGeometry",
    "fvUpdateIso"
  ])assert(isoSource.includes(token),'Missing iso-surface module token: '+token);
  for(const token of [
    "isoPos:null",
    "isoColor:null",
    "isoCount:0",
    "showIso=!!document.getElementById('fvIso')?.checked",
    "fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,isoOpacity)",
    "if(typeof fvUpdateIso==='function')fvUpdateIso(displayRange)"
  ])assert(fieldSource.includes(token),'Missing Field View iso render hook: '+token);
});

test('iso-surface module stays generic and contains no thesis fixture names',()=>{
  for(const banned of ['QuickCup','B3_reference','B12_','C12_'])assert(!isoSource.includes(banned),'Project-specific token leaked into iso module: '+banned);
});

console.log('FoamLens Field View iso-surface regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
