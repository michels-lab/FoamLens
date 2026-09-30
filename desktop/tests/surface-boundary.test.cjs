'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-surface-boundary.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_SURFACE_BOUNDARY_CORE_START */';
const end='/* FOAMLENS_SURFACE_BOUNDARY_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Surface boundary core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function("function fvIsProcessorPatch(p){return /^processor/i.test(String(p?.type||''))||/^processor/i.test(String(p?.name||''))}"+core+';return {fsbParseBoundaryMesh,fsbParseBoundaryField,fsbExpandBoundaryFaces,fsbMergeDecomposedBoundaryValues,fsbComponentValue};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-12){assert(Math.abs(a-b)<=e,String(a)+' != '+String(b))}

const boundaryMesh='FoamFile\n{\n format ascii;\n class polyBoundaryMesh;\n object boundary;\n}\n3\n(\nwalls\n{\n type wall;\n nFaces 2;\n startFace 4;\n}\noutlet\n{\n type patch;\n nFaces 1;\n startFace 6;\n}\nsymmetry\n{\n type symmetryPlane;\n nFaces 1;\n startFace 7;\n}\n)\n';

test('polyMesh boundary patch ranges are parsed exactly',()=>{
  const r=api.fsbParseBoundaryMesh(boundaryMesh);
  assert.equal(r.ok,true);assert.equal(r.declared,3);
  assert.deepEqual(r.patches,[
    {name:'walls',type:'wall',nFaces:2,startFace:4},
    {name:'outlet',type:'patch',nFaces:1,startFace:6},
    {name:'symmetry',type:'symmetryPlane',nFaces:1,startFace:7}
  ]);
});

test('scalar boundaryField preserves uniform and nonuniform explicit values only',()=>{
  const field='boundaryField\n{\n walls\n {\n type fixedValue;\n value uniform 10;\n }\n outlet\n {\n type fixedValue;\n value nonuniform List<scalar>\n 1\n (\n 20\n );\n }\n symmetry\n {\n type symmetryPlane;\n }\n}';
  const p=api.fsbParseBoundaryField(field,'scalar');
  assert.equal(p.ok,true);
  assert.equal(p.patches.walls.explicit,true);
  assert.equal(p.patches.walls.mode,'uniform');
  assert.equal(p.patches.walls.value,10);
  assert.equal(p.patches.outlet.explicit,true);
  assert.deepEqual(p.patches.outlet.values,[20]);
  assert.equal(p.patches.symmetry.explicit,false);
  assert.equal(p.patches.symmetry.reason,'no-explicit-value');

  const mesh=api.fsbParseBoundaryMesh(boundaryMesh);
  const x=api.fsbExpandBoundaryFaces(mesh.patches,p.patches,'scalar','value',8);
  assert.equal(x.values.get(4),10);
  assert.equal(x.values.get(5),10);
  assert.equal(x.values.get(6),20);
  assert.equal(x.values.has(7),false);
  assert.equal(x.explicitFaces,3);
  assert.equal(x.totalFaces,4);
  near(x.fraction,.75);
});

test('vector patch values support components and magnitude without changing association',()=>{
  const field='boundaryField\n{\n walls { type fixedValue; value uniform (1 2 2); }\n outlet\n {\n type fixedValue;\n value nonuniform List<vector> 1\n (\n (3 4 0)\n );\n }\n symmetry { type symmetryPlane; }\n}';
  const p=api.fsbParseBoundaryField(field,'vector'),mesh=api.fsbParseBoundaryMesh(boundaryMesh);
  const mag=api.fsbExpandBoundaryFaces(mesh.patches,p.patches,'vector','magnitude',8);
  near(mag.values.get(4),3);near(mag.values.get(5),3);near(mag.values.get(6),5);
  const x=api.fsbExpandBoundaryFaces(mesh.patches,p.patches,'vector','x',8);
  near(x.values.get(4),1);near(x.values.get(6),3);
});

test('nonuniform patch count mismatch is rejected instead of stretched or repeated',()=>{
  const field='boundaryField\n{\n walls\n {\n type fixedValue;\n value nonuniform List<scalar> 1\n (\n 7\n );\n }\n}';
  const p=api.fsbParseBoundaryField(field,'scalar'),mesh=api.fsbParseBoundaryMesh(boundaryMesh);
  const x=api.fsbExpandBoundaryFaces(mesh.patches,p.patches,'scalar','value',8);
  assert.equal(x.values.has(4),false);assert.equal(x.values.has(5),false);
  assert.equal(x.coverage.find(r=>r.name==='walls').reason,'patch-value-count-mismatch');
});

test('symbolic or missing boundary values are never converted into numeric data',()=>{
  for(const body of [
    'boundaryField { walls { type zeroGradient; } }',
    'boundaryField { walls { type calculated; value uniform $internalField; } }'
  ]){
    const p=api.fsbParseBoundaryField(body,'scalar');
    assert.equal(p.patches.walls.explicit,false);
  }
});


test('decomposed boundary mapping preserves only physical patch faces and global face identity',()=>{
  const mesh={
    decomposed:true,
    facePartition:['processor0','processor0','processor0','processor1','processor1','processor1'],
    faceLocal:[0,1,2,0,1,2],
    partitionMeshes:[
      {partition:'processor0',mesh:{boundaryPatches:[
        {name:'wall0',type:'wall',startFace:1,nFaces:1},
        {name:'processor0to1',type:'processor',startFace:2,nFaces:1}
      ]}},
      {partition:'processor1',mesh:{boundaryPatches:[
        {name:'wall1',type:'wall',startFace:1,nFaces:1},
        {name:'processor1to0',type:'processor',startFace:2,nFaces:1}
      ]}}
    ]
  };
  const merged=api.fsbMergeDecomposedBoundaryValues(mesh,[
    {partition:'processor0',result:{values:new Map([[1,10],[2,999]]),coverage:[
      {name:'wall0',type:'wall',startFace:1,nFaces:1,explicit:true},
      {name:'processor0to1',type:'processor',startFace:2,nFaces:1,explicit:true}
    ]}},
    {partition:'processor1',result:{values:new Map([[1,20],[2,888]]),coverage:[
      {name:'wall1',type:'wall',startFace:1,nFaces:1,explicit:true},
      {name:'processor1to0',type:'processor',startFace:2,nFaces:1,explicit:true}
    ]}}
  ]);
  assert.equal(merged.values.get(1),10);
  assert.equal(merged.values.get(4),20);
  assert.equal(merged.values.has(2),false);
  assert.equal(merged.values.has(5),false);
  assert.equal(merged.explicitFaces,2);
  assert.equal(merged.totalFaces,2);
  assert.equal(merged.fraction,1);
  assert.deepEqual(merged.coverage.map(r=>r.name),['processor0:wall0','processor1:wall1']);
});

test('surface boundary product wiring uses chunked native reads and explicit patch overlays',()=>{
  const fv=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
  const probe=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-probe-picking.js'),'utf8');
  for(const token of [
    'fvLoadMeshBoundaryPatches',
    'mesh.boundaryPatches',
    'sourcePaths?.boundary',
    'fvLoadSurfaceBoundaryValues',
    'fvLoadDecomposedSurfaceBoundaryValues',
    'surfaceBoundary',
    'boundaryFieldPos:null',
    'boundaryFieldColor:null',
    'boundaryFieldCount:0',
    'fvUpdateExplicitBoundaryBuffers'
  ])assert(fv.includes(token),'Missing Field View boundary wiring token: '+token);
  for(const token of [
    'file.slice(offset,end).text()',
    '4*1024*1024',
    'no-explicit-value',
    'mesh-boundary-metadata-unavailable',
    'fsbMergeDecomposedBoundaryValues',
    'decomposed-partition-boundary-patches'
  ])assert(source.includes(token),'Missing boundary parser safety/decomposed token: '+token);
  for(const token of ['boundaryFace','surfaceBoundaryGeometry','explicit patch value'])assert(probe.includes(token),'Missing probe boundary wiring token: '+token);
  for(const banned of ['QuickCup','B3_reference','metalTopEnergyPower'])assert(!source.includes(banned),'Project-specific token leaked into surface boundary module: '+banned);
});


test('Desktop native path preserves mesh and field boundary patch payloads',()=>{
  const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
  const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
  const fv=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
  for(const token of [
    'OpenFoamBoundarySupport.ReadFieldBoundaryPatchesAsync',
    'BoundaryPatches = boundaryPatches',
    'BoundaryPatchStatus',
    'boundaryToken'
  ])assert(program.includes(token),'Missing native boundary payload token: '+token);
  assert(index.includes('boundaryPatches:(data?.boundaryPatches||[])'),'Native field boundary patches are dropped by frontend normalization.');
  for(const token of [
    'boundaryToken:files.boundary?._nativeToken||null',
    'surfaceTriangleFaces:(data?.surfaceTriangleFaces||[])',
    'boundaryPatches:(data?.boundaryPatches||[])',
    'boundaryPatchStatus:String(data?.boundaryPatchStatus'
  ])assert(fv.includes(token),'Native mesh boundary payload is not preserved: '+token);
  assert(source.includes("source=nativeRows?.length?'native-boundary-patches':'text-fallback'"));
  assert(source.includes('fsbNativeFieldPatches'));
});

console.log('FoamLens explicit surface boundary regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
