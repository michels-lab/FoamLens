'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const file=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const source=fs.readFileSync(file,'utf8');
new Function(source);

const begin='/* FOAMLENS_FIELD_VIEW_CORE_START */';
const end='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field View core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(
  "const cases=[];const flUi=(en)=>en;"+
  "const pmComponentValues=(parsed,component,expected)=>{let values;if(parsed.uniform)values=Array(expected).fill(Number(parsed.uniformValue));else values=(parsed.values||[]).map(Number);return {ok:values.length===expected,values};};"+
  core+
  ";return {fvCombinePartitionMeshes,fvCombinePartitionFieldValues,fvResolveFieldMeshLayout,fvCompositeSnapshotFromLayout,fvBoundaryPatchCoverage};"
)();

const passed=[];
function test(name,fn){fn();passed.push(name)}

function tet(shift,patches){
  return{
    supported:true,format:'ascii',
    points:[shift,0,0, shift+1,0,0, shift,1,0, shift,0,1],
    faceOffsets:[0,3,6,9,12],
    facePoints:[0,2,1, 0,1,3, 1,2,3, 2,0,3],
    owners:[0,0,0,0],neighbours:[],
    cellCenters:[shift+.25,.25,.25],
    pointCount:4,faceCount:4,internalFaceCount:0,boundaryFaceCount:4,cellCount:1,
    boundsMin:[shift,0,0],boundsMax:[shift+1,1,1],
    boundaryPatches:patches,sourceBytes:100
  };
}
const m0=tet(0,[{name:'wall0',type:'wall',startFace:0,nFaces:3},{name:'processor0to1',type:'processor',startFace:3,nFaces:1}]);
const m1=tet(1,[{name:'processor1to0',type:'processor',startFace:0,nFaces:1},{name:'wall1',type:'wall',startFace:1,nFaces:3}]);

test('processor meshes compose with deterministic cell and point ranges',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  assert.equal(mesh.supported,true);
  assert.equal(mesh.decomposed,true);
  assert.deepEqual(mesh.partitions,['processor0','processor1']);
  assert.deepEqual(mesh.partitionRanges.map(r=>({p:r.partition,cs:r.cellStart,cc:r.cellCount,ps:r.pointStart,pc:r.pointCount})),[
    {p:'processor0',cs:0,cc:1,ps:0,pc:4},
    {p:'processor1',cs:1,cc:1,ps:4,pc:4}
  ]);
  assert.equal(mesh.cellCount,2);
  assert.equal(mesh.pointCount,8);
});

test('processor interface patches remain topological but are not rendered as physical surface',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  const hidden=new Set(mesh.boundaryPatches.filter(p=>p.processor).flatMap(p=>Array.from({length:p.nFaces},(_,i)=>p.startFace+i)));
  assert.equal(hidden.size,2);
  assert.equal(mesh.surfaceOwners.length,6);
  assert(mesh.surfaceTriangleFaces.every(fi=>!hidden.has(fi)));
});

test('cell-associated decomposed values concatenate only by explicit partition ranges',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  const set=[
    {partition:'processor1',uniform:false,values:[20]},
    {partition:'processor0',uniform:false,values:[10]}
  ];
  const r=api.fvCombinePartitionFieldValues(mesh,set,'value','volume');
  assert.equal(r.ok,true);
  assert.deepEqual(r.values,[10,20]);
});

test('point-associated decomposed values preserve each processor point ordering',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  const set=[
    {partition:'processor0',uniform:false,values:[1,2,3,4]},
    {partition:'processor1',uniform:false,values:[5,6,7,8]}
  ];
  const r=api.fvCombinePartitionFieldValues(mesh,set,'value','point');
  assert.equal(r.ok,true);
  assert.deepEqual(r.values,[1,2,3,4,5,6,7,8]);
});

test('missing or extra field partitions are rejected rather than reindexed',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  let r=api.fvCombinePartitionFieldValues(mesh,[{partition:'processor0',values:[1],uniform:false}],'value','volume');
  assert.equal(r.ok,false);assert.equal(r.reason,'field-partition-missing:processor1');
  r=api.fvCombinePartitionFieldValues(mesh,[
    {partition:'processor0',values:[1],uniform:false},
    {partition:'processor1',values:[2],uniform:false},
    {partition:'processor2',values:[3],uniform:false}
  ],'value','volume');
  assert.equal(r.ok,false);assert.equal(r.reason,'field-mesh-partition-set-mismatch');
});

test('decomposed surfaceField remains explicitly unsupported until patch-local face mapping is completed',()=>{
  const mesh=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:m0},{partition:'processor1',mesh:m1}]);
  const r=api.fvCombinePartitionFieldValues(mesh,[],'value','surface');
  assert.equal(r.ok,false);
  assert.equal(r.reason,'decomposed-surface-field-not-supported');
});

test('layout and composite snapshot preserve partition-specific mesh states',()=>{
  const c={meshInventory:[
    {partition:'processor0',region:'metal',complete:true},
    {partition:'processor1',region:'metal',complete:true}
  ]};
  const g={records:[{partition:'processor0',time:2},{partition:'processor1',time:2}]};
  const layout=api.fvResolveFieldMeshLayout(c,'metal',g,2);
  assert.equal(layout.valid,true);assert.equal(layout.mode,'decomposed');
  const snap=api.fvCompositeSnapshotFromLayout(layout,'metal',2);
  assert.equal(snap.decomposed,true);assert.equal(snap.parts.length,2);
  assert.deepEqual(snap.parts.map(x=>x.partition),['processor0','processor1']);
});

test('product wiring uses strict layout before rendering decomposed fields',()=>{
  for(const token of [
    'fvResolveFieldMeshLayout(c,region,g,time)',
    'fvEnsureMeshFromLayout',
    'fvCombinePartitionFieldValues',
    "layout.mode==='decomposed'",
    'fvCombinePartitionVectors',
    'processor meshes',
    'processor partitions'
  ])assert(source.includes(token),'Missing decomposed Field View wiring token: '+token);
  assert(!source.includes('concat processor values by index'));
  for(const banned of ['QuickCup','B3_reference','B12_','C12_'])assert(!source.includes(banned),'Project-specific token leaked into Field View: '+banned);
});

console.log('FoamLens decomposed Field View regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
