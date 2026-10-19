'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-solidification-front-tracker.js'),'utf8');
new vm.Script(js);
const start='/* FOAMLENS_FRONT_TRACKER_CORE_START */',end='/* FOAMLENS_FRONT_TRACKER_CORE_END */';
const a=js.indexOf(start),b=js.indexOf(end,a);assert(a>=0&&b>a);
const api=new Function(js.slice(a,b+end.length)+'\nreturn {sftGeometry,sftFrame,sftEvolution};')();
const near=(a,b)=>Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b));
const passed=[];function test(name,fn){fn();passed.push(name)}
function mesh(points,faces,owners,neighbours,centers){
  const facePoints=[],faceOffsets=[0];for(const f of faces){facePoints.push(...f);faceOffsets.push(facePoints.length)}
  return{supported:true,pointCount:points.length,faceCount:faces.length,cellCount:centers.length,
    points:points.flat(),facePoints,faceOffsets,owners,neighbours,cellCenters:centers.flat()}
}
function cube(){
  const p=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const f=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];
  return mesh(p,f,f.map(()=>0),[],[[.5,.5,.5]])
}
function two(){
  const p=[[0,0,0],[0,1,0],[0,0,1],[0,1,1],[1,0,0],[1,1,0],[1,0,1],[1,1,1],[2,0,0],[2,1,0],[2,0,1],[2,1,1]];
  const f=[[4,5,7,6],[0,2,3,1],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5],[8,9,11,10],[4,5,9,8],[6,10,11,7],[4,8,10,6],[5,7,11,9]];
  return mesh(p,f,[0,0,0,0,0,0,1,1,1,1,1],[1],[[.5,.5,.5],[1.5,.5,.5]])
}
const opt={low:.05,high:.95,iso:.5,role:'liquidFraction'};
test('oriented closed unit cube reports measured volume and no false front',()=>{
  const m=cube(),g=api.sftGeometry(m),f=api.sftFrame(m,g,[.3],{...opt,time:0});
  assert(near(g.totalVolume,1));assert(near(f.volumes.mushy,1));assert.equal(f.front.crossingFaceCount,0);
  assert.equal(f.front.crossingFaceArea,null)
});
test('two cells have 1m³ each and source-backed shared face',()=>{
  const m=two(),g=api.sftGeometry(m),f=api.sftFrame(m,g,[0,1],{...opt,time:1});
  assert(near(g.totalVolume,2));assert(g.cellVolumes.every(v=>near(v,1)));
  assert(near(f.volumes.solid,1));assert(near(f.volumes.liquid,1));
  assert.equal(f.front.crossingFaceCount,1);assert(near(f.front.crossingFaceArea,1));
  assert(f.front.crossingFaceCentroid.every((v,i)=>near(v,[1,.5,.5][i])))
});
test('explicit solid fraction mapping preserves same physics',()=>{
  const m=two(),g=api.sftGeometry(m),a=api.sftFrame(m,g,[.2,.9],{...opt,time:1});
  const b=api.sftFrame(m,g,[.8,.1],{...opt,role:'solidFraction',time:1});
  assert(near(a.volumes.mushy,b.volumes.mushy));
  assert(near(a.front.crossingFaceArea,b.front.crossingFaceArea))
});
test('missing and out-of-range fractions never become zero',()=>{
  const m=two(),g=api.sftGeometry(m);
  for(const x of [null,NaN,1.01,-.01,undefined])assert.throws(()=>api.sftFrame(m,g,[x,.5],{...opt,time:1}),/phase fraction/);
  assert.throws(()=>api.sftFrame(m,g,[.5],{...opt,time:1}),/counts differ/)
});
test('invalid thresholds or undeclared roles fail closed',()=>{
  const m=cube(),g=api.sftGeometry(m);
  assert.throws(()=>api.sftFrame(m,g,[.5],{...opt,low:.95,high:.05,time:1}));
  assert.throws(()=>api.sftFrame(m,g,[.5],{...opt,iso:0,time:1}));
  assert.throws(()=>api.sftFrame(m,g,[.5],{...opt,role:'velocity',time:1}))
});
test('invalid geometry or reversed faces disallow physical volume',()=>{
  const m=cube(),bad=structuredClone(m);bad.points[0]=NaN;assert.throws(()=>api.sftGeometry(bad));
  const rev=structuredClone(m);rev.facePoints.splice(0,4,...rev.facePoints.slice(0,4).reverse());
  assert.throws(()=>api.sftGeometry(rev),/Nonclosed|oriented/);
  const broken=structuredClone(m);broken.facePoints[0]=9;assert.throws(()=>api.sftGeometry(broken))
});
test('rate uses actual physical delta t and is NOT local normal velocity',()=>{
  const m=two(),g=api.sftGeometry(m);
  const f0=api.sftFrame(m,g,[0,1],{...opt,time:0}),f1=api.sftFrame(m,g,[1,0],{...opt,time:.25});
  const e=api.sftEvolution([f0,f1]);assert.equal(e[0].centroidDisplacementRate,null);
  assert(near(e[1].centroidDisplacementRate,0));
  assert(e[1].rateMethod.includes('NOT local interface normal velocity'))
});
test('source-only dimensional, provenance and time-window constraints exist',()=>{
  for(const term of ["fvLoadFrameData(c,group,region,time,'value'","parsedDim!=='[0 0 0 0 0 0 0]'","end-start>120",
    "sftState.result=null","No nucleation, recalescence","originalField:group.name"])
    assert(js.includes(term),'Missing evidence guard: '+term);
  assert(!js.includes('QuickCup'))
});
console.log('Granada #153 source-only front tracker passed '+passed.length+' regression checks');
for(const name of passed)console.log('✓ '+name);
