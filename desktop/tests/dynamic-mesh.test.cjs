'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_FIELD_VIEW_CORE_START */';
const end='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field View core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function('const cases=[];const flUi=(en)=>en;'+core+';return {fvMeshDescriptor,fvBuildMeshInventory,fvMeshSnapshotForTime,fvCaseViewAvailable};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function file(rel){return{name:path.basename(rel),webkitRelativePath:rel,size:10}}

function baseFiles(prefix='case/constant/polyMesh'){
  return ['points','faces','owner','neighbour'].map(n=>file(prefix+'/'+n));
}

test('mesh discovery accepts constant and time-directory polyMesh layouts',()=>{
  const c=api.fvMeshDescriptor(file('case/constant/metal/polyMesh/points'),'case');
  assert.equal(c.region,'metal');assert.equal(c.source,'constant');assert.equal(c.time,null);
  const t=api.fvMeshDescriptor(file('case/1.25/metal/polyMesh/points'),'case');
  assert.equal(t.region,'metal');assert.equal(t.source,'time');assert.equal(t.time,1.25);
  assert.equal(api.fvMeshDescriptor(file('case/system/polyMesh/points'),'case'),null);
});

test('points-only moving mesh inherits constant topology but never a future geometry',()=>{
  const files=[
    ...baseFiles(),
    file('case/1/polyMesh/points'),
    file('case/2/polyMesh/points')
  ];
  const g=api.fvBuildMeshInventory(files,'case')[0];
  assert.equal(g.complete,true);
  assert.equal(g.dynamic,true);
  assert.deepEqual(g.dynamicTimes,[1,2]);

  const s0=api.fvMeshSnapshotForTime(g,.5);
  assert.equal(s0.time,null);
  assert.equal(s0.sourcePaths.points,'case/constant/polyMesh/points');

  const s1=api.fvMeshSnapshotForTime(g,1.5);
  assert.equal(s1.time,1);
  assert.equal(s1.sourcePaths.points,'case/1/polyMesh/points');
  assert.equal(s1.sourcePaths.faces,'case/constant/polyMesh/faces');

  const s2=api.fvMeshSnapshotForTime(g,2);
  assert.equal(s2.time,2);
  assert.equal(s2.sourcePaths.points,'case/2/polyMesh/points');
  assert.equal(s2.sourcePaths.owner,'case/constant/polyMesh/owner');
});

test('topology-changing snapshots replace topology from their physical time onward',()=>{
  const files=[
    ...baseFiles(),
    ...['points','faces','owner','neighbour'].map(n=>file('case/3/polyMesh/'+n))
  ];
  const g=api.fvBuildMeshInventory(files,'case')[0];
  const before=api.fvMeshSnapshotForTime(g,2.999);
  assert.equal(before.time,null);
  assert.equal(before.sourcePaths.faces,'case/constant/polyMesh/faces');
  const at=api.fvMeshSnapshotForTime(g,3);
  assert.equal(at.time,3);
  for(const n of ['points','faces','owner','neighbour'])assert.equal(at.sourcePaths[n],'case/3/polyMesh/'+n);
});

test('without constant mesh, a complete same-time snapshot is required as the inheritance basis',()=>{
  const partial=[
    file('case/1/polyMesh/points'),
    file('case/2/polyMesh/faces'),
    file('case/2/polyMesh/owner'),
    file('case/2/polyMesh/neighbour')
  ];
  const bad=api.fvBuildMeshInventory(partial,'case')[0];
  assert.equal(bad.complete,false);
  assert.equal(api.fvMeshSnapshotForTime(bad,3),null);

  const full=['points','faces','owner','neighbour'].map(n=>file('case/4/polyMesh/'+n));
  const good=api.fvBuildMeshInventory(full,'case')[0];
  assert.equal(good.complete,true);
  assert.equal(api.fvMeshSnapshotForTime(good,3),null,'future mesh snapshot must not be used');
  assert.equal(api.fvMeshSnapshotForTime(good,4).time,4);
});

test('Field View readiness requires a mesh state at or before at least one field time',()=>{
  const mesh=api.fvBuildMeshInventory(['points','faces','owner','neighbour'].map(n=>file('case/5/metal/polyMesh/'+n)),'case');
  const tooEarly={meshInventory:mesh,discoveryModel:{fields:[{region:'metal',storage:'volume',kind:'scalar',times:[1,2],name:'T'}]}};
  assert.equal(api.fvCaseViewAvailable(tooEarly),false);
  const valid={meshInventory:mesh,discoveryModel:{fields:[{region:'metal',storage:'volume',kind:'scalar',times:[5,6],name:'T'}]}};
  assert.equal(api.fvCaseViewAvailable(valid),true);
});

test('playback wiring resolves geometry by physical time and preserves camera during mesh updates',()=>{
  for(const token of [
    'fvMeshSnapshotForTime(meshGroup,time)',
    'fvEnsureMeshForTime(c,meshGroup,time,{resetCamera:false})',
    'function fvUpdateMeshBuffers(mesh,resetCamera=true)',
    "if(resetCamera)fvCameraReset();else fvRender()",
    "mesh: constant",
    'meshSnapshot'
  ])assert(source.includes(token),'Missing dynamic-mesh wiring token: '+token);
});

console.log('FoamLens dynamic mesh regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
