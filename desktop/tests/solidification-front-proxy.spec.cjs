'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-solidification-front-proxy.js');
const source=fs.readFileSync(file,'utf8');new Function(source);
const first=source.indexOf('/* FOAMLENS_FRONT_PROXY_CORE_START */'),last=source.indexOf('/* FOAMLENS_FRONT_PROXY_CORE_END */');
assert(first>=0&&last>first,'Source-backed front geometry must have pure regression core');
const api=new Function(source.slice(first,last)+
 ';return{geometry:pfMeshGeometry,snapshot:pfSnapshot,evolution:pfEvolution,number:pfNumber}')();
const near=(x,y,e=1e-9)=>assert(Math.abs(x-y)<=e*Math.max(1,Math.abs(x),Math.abs(y)),String(x)+' != '+String(y));
function cubeMesh(xPositions=[0,1,2],options={}){
 const points=[],vertices=new Map(),faces=[],owners=[],neighbours=[],centers=[];
 const id=(x,y,z)=>{
  const key=[x,y,z].join(',');if(!vertices.has(key)){vertices.set(key,points.length/3);points.push(x,y,z)}
  return vertices.get(key)
 };
 function face(v,owner,neighbor=null){
  faces.push(v.map(x=>id(...x)));owners.push(owner);if(neighbor!==null)neighbours.push(neighbor)
 }
 const n=xPositions.length-1;
 for(let i=0;i<n-1;i++){
  const x=xPositions[i+1];
  face([[x,0,0],[x,1,0],[x,1,1],[x,0,1]],i,i+1)
 }
 for(let i=0;i<n;i++){
  const a=xPositions[i],b=xPositions[i+1];centers.push((a+b)/2,.5,.5);
  if(i===0)face([[a,0,0],[a,0,1],[a,1,1],[a,1,0]],i);
  if(i===n-1)face([[b,0,0],[b,1,0],[b,1,1],[b,0,1]],i);
  face([[a,0,0],[b,0,0],[b,0,1],[a,0,1]],i);
  if(!options.missingTop)face([[a,1,0],[a,1,1],[b,1,1],[b,1,0]],i);
  face([[a,0,0],[a,1,0],[b,1,0],[b,0,0]],i);
  face([[a,0,1],[b,0,1],[b,1,1],[a,1,1]],i)
 }
 if(options.reverseFace)faces[0].reverse();
 const offsets=[0],facePoints=[];
 for(const f of faces){facePoints.push(...f);offsets.push(facePoints.length)}
 return{points,faceOffsets:offsets,facePoints,owners,neighbours,cellCenters:centers,
  cellCount:n,faceCount:faces.length,pointCount:points.length/3,
  boundsMin:[xPositions[0],0,0],boundsMax:[xPositions.at(-1),1,1]}
}
const setup=(t=0,extra={})=>({time:t,low:.05,high:.95,iso:.5,axis:'x',region:'metal',
 dimensions:'[0 0 0 0 0 0 0]',meshIdentity:1,...extra});
const m1=cubeMesh([0,1]),g1=api.geometry(m1);
assert(g1.ok,g1.reason);near(g1.totalVolumeM3,1);near(g1.cellVolumes[0],1);
assert(g1.geometryGuarantee.includes('closed'));
const b1=api.snapshot(m1,g1,[.5],setup());
assert(b1.ok,b1.reason);near(b1.volumesM3.mushy,1);near(b1.fractions.mushy,1);
near(b1.volumeWeightedLiquidFraction,.5);
assert.equal(b1.front.crossedInternalFaces,0);assert.equal(b1.front.coordinateProxyM,null);
const m2=cubeMesh([0,1,3]),g2=api.geometry(m2);
assert(g2.ok,g2.reason);near(g2.totalVolumeM3,3);
near(g2.cellVolumes[0],1);near(g2.cellVolumes[1],2);
const at0=api.snapshot(m2,g2,[0,1],setup());
assert(at0.ok,at0.reason);
near(at0.volumesM3.solid,1);near(at0.volumesM3.liquid,2);
near(at0.fractions.liquid,2/3);
near(at0.volumeWeightedLiquidFraction,2/3);
near(at0.front.areaProxyM2,1);
near(at0.front.coordinateProxyM,1);
assert.equal(at0.front.crossedInternalFaces,1);
near(at0.front.areaWeightedFaceCentroidM[1],.5);
const at1=api.snapshot(m2,g2,[.2,.8],setup(1));
near(at1.volumesM3.mushy,3);near(at1.front.coordinateProxyM,1);
const axisY=api.snapshot(m2,g2,[0,1],setup(1,{axis:'y'}));
near(axisY.front.coordinateProxyM,.5);
assert.equal(api.snapshot(m2,g2,[1],setup()).ok,false,'wrong cell count cannot pass');
assert.equal(api.snapshot(m2,g2,[0,null],setup()).ok,false,'missing alpha cannot become zero');
assert.equal(api.snapshot(m2,g2,[0,1.5],setup()).ok,false,'alpha cannot be clipped');
assert.equal(api.snapshot(m2,g2,[0,1],setup(0,{dimensions:'[0 0 0 1 0 0 0]'})).ok,false);
assert.equal(api.snapshot(m2,g2,[0,1],setup(0,{low:.9,high:.1})).ok,false);
assert.equal(api.snapshot(m2,g2,[0,1],setup(0,{iso:0})).ok,false);
assert.equal(api.snapshot(m2,g2,[0,1],setup(0,{axis:'length'})).ok,false);
const amb=api.snapshot(m2,g2,[.5,1],setup());
assert.equal(amb.front.crossedInternalFaces,0,'on-threshold faces are ambiguous, not falsely interpolated');
assert(amb.front.ambiguousThresholdFaces>0);
assert.equal(api.geometry(cubeMesh([0,1,2],{missingTop:true})).ok,false,'open shells fail');
assert.equal(api.geometry(cubeMesh([0,1,2],{reverseFace:true})).ok,false,'reversed source face fails');
assert.equal(api.geometry({...m2,cellCenters:[0,0,0]}).ok,false);
assert.equal(api.geometry({...m2,facePoints:[-3,...m2.facePoints.slice(1)]}).ok,false);
assert.equal(api.geometry(m2,{maxCells:1}).ok,false);
const m3=cubeMesh([0,1,2,3]),g3=api.geometry(m3);
assert(g3.ok,g3.reason);
const old=api.snapshot(m3,g3,[0,1,1],setup(0,{meshIdentity:7}));
const later=api.snapshot(m3,g3,[0,0,1],setup(2,{meshIdentity:7}));
const evo=api.evolution([later,old],[0,2]);
assert(evo.ok);assert.equal(evo.rows[0].frontCentroidVelocityProxyMPerS,null);
near(evo.rows[1].frontCentroidVelocityProxyMPerS,.5);
assert.equal(evo.rows[1].velocityStatus,'apparent-centroid-displacement');
const gone=api.evolution([old,later],[0,1,2]);
assert(gone.ok);assert.equal(gone.rows[1].frontCentroidVelocityProxyMPerS,null);
assert.equal(gone.rows[1].velocityStatus,'missing-original-snapshot-between');
const reshaped=api.evolution([old,{...later,meshIdentity:10}],[0,2]);
assert(reshaped.ok);assert.equal(reshaped.rows[1].frontCentroidVelocityProxyMPerS,null);
assert.equal(reshaped.rows[1].velocityStatus,'not-comparable-geometry-or-region');
const noFront=api.evolution([old,api.snapshot(m3,g3,[0,0,0],setup(2,{meshIdentity:7}))],[0,2]);
assert.equal(noFront.rows[1].frontCentroidVelocityProxyMPerS,null);
assert.equal(noFront.rows[1].velocityStatus,'no-front-in-one-or-both-times');
assert.equal(api.evolution([old,old]).ok,false,'same physical timestamp is not two time points');
assert.equal(api.evolution([old,{ok:false,reason:'missing frame'}]).ok,false);
assert(Number.isNaN(api.number(null)));
assert(Number.isNaN(api.number('')));
for(const t of ["pfGeomCache=new WeakMap()","pfRuntimeMeshIdentity(mesh)","pfEl('pfExportCsv').disabled=false",
 "pfEl('pfExportCsv').onclick","function pfPlot(report)","pfRefresh('cases')",
 "fvLoadFrameData(c,g,region,t,'value'","fvFieldGroups(c,region,'scalar','volume')",
 "sourceFrames","meshSnapshotTime","no silent truncation","reporting physical evidence"]){
 if(t==='reporting physical evidence')continue;
 assert(source.includes(t),'Missing physical source and UI gate: '+t)
}
for(const t of ['QuickCup','B14','C14','metalTop','estimatedNucleation'])assert(!source.includes(t),'Thesis-specific fixture leaked '+t);
console.log('Granada #153 PASS: cube volumes, unequal cell weighting, exact internal-face area, thresholds, invalid topology/alpha and safe front displacement.');
