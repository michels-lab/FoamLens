'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const fieldPath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const isoPath=path.join(root,'src','FoamLensDesktop','frontend','v14-isosurface.js');
const fieldSource=fs.readFileSync(fieldPath,'utf8');
const isoSource=fs.readFileSync(isoPath,'utf8');
new Function(fieldSource);
new Function(isoSource);

function extract(source,begin,end){
  const a=source.indexOf(begin),b=source.indexOf(end,a);
  assert(a>=0&&b>a,'Missing core markers: '+begin);
  return source.slice(a,b+end.length);
}
const fvCore=extract(fieldSource,'/* FOAMLENS_FIELD_VIEW_CORE_START */','/* FOAMLENS_FIELD_VIEW_CORE_END */');
const isoCore=extract(isoSource,'/* FOAMLENS_ISOSURFACE_CORE_START */','/* FOAMLENS_ISOSURFACE_CORE_END */');
const api=new Function(
  'const cases=[];const flUi=(en)=>en;'+fvCore+'\n'+isoCore+
  ';return {fvPointFieldCellValues,fvBuildPointSliceGeometry,fvBuildPointIsoSurfaceGeometry,fvSolveAffine4,fvAffinePointValue};'
)();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-8){assert(Math.abs(Number(a)-Number(b))<=e,String(a)+' != '+String(b))}
function triArea(p,a){
  const ax=p[a],ay=p[a+1],az=p[a+2],bx=p[a+3],by=p[a+4],bz=p[a+5],cx=p[a+6],cy=p[a+7],cz=p[a+8];
  const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
  return .5*Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)
}

const mesh={
  points:[0,0,0, 1,0,0, 0,1,0, 0,0,1],
  faceOffsets:[0,3,6,9,12],
  facePoints:[
    0,2,1,
    0,1,3,
    1,2,3,
    2,0,3
  ],
  owners:[0,0,0,0],
  neighbours:[],
  cellCenters:[.25,.25,.25],
  pointCount:4,
  faceCount:4,
  internalFaceCount:0,
  boundaryFaceCount:4,
  cellCount:1,
  boundsMin:[0,0,0],
  boundsMax:[1,1,1]
};
const pointValues=[0,1,0,0]; // phi = x exactly on all tetra vertices.

test('affine point reconstruction reproduces a linear pointField at the cell centre',()=>{
  const centres=api.fvPointFieldCellValues(mesh,pointValues);
  assert.equal(centres.length,1);
  near(centres[0],.25,1e-10);
});

test('pointField slice at x=0.5 preserves the exact linear phi=x field',()=>{
  const cut=api.fvBuildPointSliceGeometry(mesh,pointValues,'x',.5);
  assert(cut.triangleCount>0);
  assert.equal(cut.positions.length,cut.triangleCount*9);
  assert.equal(cut.values.length,cut.triangleCount*3);
  for(let i=0;i<cut.positions.length;i+=3)near(cut.positions[i],.5,2e-7);
  for(const v of cut.values)near(v,.5,2e-7);
  let area=0;for(let i=0;i<cut.positions.length;i+=9)area+=triArea(cut.positions,i);
  near(area,.125,2e-6);
  assert(/point-field vertices/.test(cut.interpolation));
});

test('pointField iso phi=0.5 reconstructs the same exact tetra cross-section',()=>{
  const iso=api.fvBuildPointIsoSurfaceGeometry(mesh,pointValues,.5);
  assert(iso.triangleCount>0);
  for(let i=0;i<iso.positions.length;i+=3)near(iso.positions[i],.5,2e-7);
  let area=0;for(let i=0;i<iso.positions.length;i+=9)area+=triArea(iso.positions,i);
  near(area,.125,2e-6);
  assert(/point-field vertices/.test(iso.interpolation));
});

test('point interior wiring is explicit while surface fields remain excluded',()=>{
  for(const token of [
    'fvPointFieldCellValues',
    'fvBuildPointSliceGeometry',
    "pointAssoc=fvState.fieldStorage==='point'",
    "const interior=String(storage||'volume')!=='surface'",
    'point-field reconstruction'
  ])assert(fieldSource.includes(token),'Missing pointField slice token: '+token);
  for(const token of [
    'fvBuildPointIsoSurfaceGeometry',
    "String(fvState.fieldStorage||'volume')==='surface'",
    "pointAssoc=String(fvState.fieldStorage||'volume')==='point'",
    'point-field reconstruction'
  ])assert(isoSource.includes(token),'Missing pointField iso token: '+token);
  assert(/does not silently reconstruct face data into a volume field/.test(fieldSource));
  assert(/does not silently reconstruct face data into a volume field/.test(isoSource));
});

test('point interior implementation stays fixture neutral',()=>{
  for(const source of [fieldSource,isoSource])
    for(const banned of ['QuickCup','B3_reference','B12_','C12_'])
      assert(!source.includes(banned),'Project-specific token leaked into point interior product code: '+banned);
});

console.log('FoamLens pointField interior reconstruction regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
