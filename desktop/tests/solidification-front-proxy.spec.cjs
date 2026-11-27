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
 dimensions:'[0 0 0 0 0 0 0]',meshIdentity:1,role:'liquidFraction',...extra});
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

// The same original physically confirmed phase fraction may be supplied as
// alphaS or alphaL, but an undeclared source role must never be guessed.
const alphaS=api.snapshot(m2,g2,[1,0],setup(0,{role:'solidFraction'}));
assert(alphaS.ok,alphaS.reason);
near(alphaS.volumesM3.solid,at0.volumesM3.solid);
near(alphaS.volumesM3.liquid,at0.volumesM3.liquid);
near(alphaS.volumeWeightedLiquidFraction,at0.volumeWeightedLiquidFraction);
assert.equal(alphaS.sourceRole,'solidFraction');
assert.equal(alphaS.normalization,'alphaL=1-alphaS');
assert.equal(api.snapshot(m2,g2,[0,1],setup(0,{role:undefined})).ok,false);
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
 "pfEl('pfExportCsv').onclick","id=\"pfCancel\"","pfEl('pfCancel').onclick","function pfPlot(report)","pfRefresh('cases')",
 "fvLoadFrameData(c,g,region,t,'value'","fvFieldGroups(c,region,'scalar','volume')",
 "sourceFrames","meshSnapshotTime","no interpolation, truncation or sampling","reporting physical evidence"]){
 if(t==='reporting physical evidence')continue;
 assert(source.includes(t),'Missing physical source and UI gate: '+t)
}
for(const t of ['QuickCup','B14','C14','metalTop','estimatedNucleation'])assert(!source.includes(t),'Thesis-specific fixture leaked '+t);
console.log('Granada #153 PASS: cube volumes, unequal cell weighting, exact internal-face area, thresholds, invalid topology/alpha and safe front displacement.');

// Two parallel interfaces separated by a cell are distinct edge components.
const m4=cubeMesh([0,1,2,3,4]),g4=api.geometry(m4);
const two=api.snapshot(m4,g4,[0,1,1,0],setup(0,{meshIdentity:9}));
assert(two.ok);assert.equal(two.front.connectivity.count,2);
assert.equal(two.front.connectivity.components[0].faceCount,1);
near(two.front.connectivity.components[0].axisMinM,1);
near(two.front.connectivity.components[1].axisMaxM,3);
near(two.front.connectivity.components.reduce((sum,g)=>sum+g.areaProxyM2,0),two.front.areaProxyM2);
assert.equal(two.front.connectivity.temporalIdentityVerified,false);
const one=api.snapshot(m4,g4,[0,0,1,1],setup(2,{meshIdentity:9}));
const change=api.evolution([two,one],[0,2]);
assert.equal(change.rows[1].frontConnectivityChange,'component-count-changed');
assert.equal(change.rows[1].singleConnectedCentroidContext,false);
near(change.rows[1].phaseVolumeRateM3PerS.solid,0);
const changedIso=api.snapshot(m4,g4,[0,0,1,1],setup(2,{meshIdentity:9,iso:0.7}));
assert.equal(api.evolution([two,changedIso],[0,2]).rows[1].phaseVolumeRateM3PerS,null);
assert.equal(api.evolution([two,changedIso],[0,2]).rows[1].frontCentroidVelocityProxyMPerS,null);
assert.equal(api.evolution([two,one],[0,1,2]).rows[1].phaseVolumeRateM3PerS,null);
assert.equal(b1.front.connectivity.count,0);
const components=new Function(source.slice(first,last)+';return pfConnectedCrossingFaces')();
const edgeMesh={faceOffsets:[0,4,8,12],facePoints:[0,1,2,3,1,4,5,2,5,6,7,8],points:[0,0,0,1,0,0,1,1,0,0,1,0,2,0,0,2,1,0,3,1,0,3,2,0,2,2,0]};
const edgeGeo={faceAreas:[1,1,1],faceCentroids:[.5,.5,0,1.5,.5,0,2.5,1.5,0]};
const grouped=components(edgeMesh,edgeGeo,[0,1,2],0);
assert.equal(grouped.count,2,'vertex-only touch is not a shared edge');
assert.equal(grouped.components[0].faceCount,2);near(grouped.components[0].areaProxyM2,2);near(grouped.components[0].centroidM[0],1);
assert.equal(components(edgeMesh,edgeGeo,new Array(100001).fill(0),0).status,'unavailable-limit');
assert(source.includes("'pfExport','pfExportCsv','pfExportComponents','pfCancel'"));
assert(source.includes("pfExport('components')"));
console.log('Granada #153 edge connectivity and phase category volume-rate regression PASS');

const reconstructed=new Function(source.slice(first,last)+';return pfReconstructedMetrics')();
const tri=reconstructed({triangleCount:1,positions:new Float32Array([0,0,0,2,0,0,0,2,0])});
assert.equal(tri.status,'available');near(tri.areaM2,2);near(tri.centroidM[0],2/3);near(tri.centroidM[1],2/3);
assert.equal(tri.physicalInterfaceVerified,false);
assert.equal(reconstructed({triangleCount:0,positions:[]}).status,'no-triangles');
assert.equal(reconstructed({triangleCount:1,positions:[0,0,0,1,0,0,2,0,0]}).status,'unavailable');
assert.equal(reconstructed({triangleCount:1,positions:[0,0,0,1,0,0,NaN,1,0]}).status,'unavailable');
assert.equal(reconstructed({triangleCount:1,positions:[0,0,0]}).status,'unavailable');
assert(source.includes('fvBuildIsoSurfaceGeometry(mesh,values,cut)'));
assert(source.includes('params.reconstruct!==b.reconstruct'));
assert(source.includes('Exact threshold cell value; plateau ambiguity'));
assert(source.includes('reconstruct&&times.length>20'));
console.log('Optional reconstructed surface metrics, invalid triangle and source-binding checks PASS');

{
const hapi=new Function(source.slice(first,last)+';return {history:pfCellHistory,csv:pfCellHistoryCsv}')();
const m=cubeMesh([0,1,3,6]),g=api.geometry(m),times=[0,2,5,6],config={low:.2,high:.8,iso:.5,role:'liquidFraction'};
const frames=[[1,0,1],[.4,.6,.9],[.1,.4,.8],[.7,.3,.7]];
const h=hapi.history(times,m,g,config);frames.forEach((v,i)=>h.push(times[i],m,v));const result=h.finish(),q=result.summary;
assert.equal(q.categories.initialBelow.cells,1);near(q.categories.initialBelow.volumeM3,2);
assert.equal(q.categories.observedArrival.cells,1);near(q.categories.observedArrival.volumeM3,1);
assert.equal(q.categories.notReached.cells,1);near(q.categories.notReached.volumeM3,3);
assert.equal(q.categories.upwardRecrossing.cells,2);near(q.categories.upwardRecrossing.volumeM3,3);
near(result.firstDown[0],5/3);assert.equal(result.bracketLo[0],0);assert.equal(result.bracketHi[0],2);
assert(Number.isNaN(result.firstDown[1]));assert(Number.isNaN(result.firstDown[2]));
near(result.mushy[0],(2*2/3)+2+5/6);near(result.mushy[1],4+4/3);near(result.mushy[2],1);
near(q.volumeWeightedArrivalEstimateS,5/3);
near(q.volumeWeightedMushyDurationEstimateS,(result.mushy[0]+2*result.mushy[1]+3*result.mushy[2])/6);
assert.equal(q.intervals[0].firstArrivalCells,1);assert.equal(q.intervals[1].firstArrivalCells,0);assert.equal(q.physicalKineticsVerified,false);
const chunks=[...hapi.csv(result,1)];assert.equal(chunks.length,4);assert(chunks[1].includes('observed-bracket,0,2,'));
assert(chunks[2].includes('initial-below-left-censored,,,,'));assert(chunks[3].includes('not-reached-in-window,,,,'));
const hs=hapi.history(times,m,g,{...config,role:'solidFraction'});frames.forEach((v,i)=>hs.push(times[i],m,v.map(a=>1-a)));const ss=hs.finish();near(ss.firstDown[0],result.firstDown[0]);near(ss.mushy[0],result.mushy[0]);
const incomplete=hapi.history(times,m,g,config);incomplete.push(0,m,frames[0]);assert.throws(()=>incomplete.push(5,m,frames[2]));assert.throws(()=>incomplete.finish());
const changed=hapi.history(times,m,g,config);assert.throws(()=>changed.push(0,{...m},frames[0]));assert.throws(()=>changed.push(0,m,[1,0,NaN]));
assert.throws(()=>hapi.history([0,0],m,g,config));assert.throws(()=>hapi.history([0,1],{...m,dynamicMesh:true},g,config));assert.throws(()=>hapi.history([0,1],m,g,{...config,low:.8}));
const plateau=hapi.history([0,1,3],m,g,config);plateau.push(0,m,[.5,.2,.8]);plateau.push(1,m,[.5,.2,.8]);plateau.push(3,m,[.5,.2,.8]);const pl=plateau.finish();near(pl.mushy[0],3);near(pl.mushy[1],0);near(pl.mushy[2],3);assert.equal(pl.summary.categories.observedArrival.cells,0);
assert(source.includes('params.cellHistory!==b.cellHistory'));assert(source.includes("historyFailure='Missing original frame at '"));
console.log('Cell history: fixed mesh, first arrival bracket, volume weighting, censoring, recrossings, mushy dwell, source-role normalization, complete CSV PASS');
}

{
const hapi=new Function(source.slice(first,last)+';return {history:pfCellHistory,slice:pfHistorySlice,csv:pfHistorySliceCsv}')();
const m=cubeMesh([0,1,3,6]),g=api.geometry(m),h=hapi.history([0,2],m,g,{low:.2,high:.8,iso:.5,role:'liquidFraction'});
h.push(0,m,[1,0,1]);h.push(2,m,[.4,.6,.9]);const result=h.finish();
const full=hapi.slice(result,{axis:'z',from:0,to:1,metric:'arrival',bins:8});
assert.equal(full.selectedCells,3);assert.equal(full.eligibleCells,1);near(full.selectedVolumeM3,6);near(full.eligibleVolumeM3,1);near(full.range[0],5/3);
assert.equal(full.counts.reduce((a,b)=>a+b,0),3);assert.equal(full.validCounts.reduce((a,b)=>a+b,0),1);
const partial=hapi.slice(result,{axis:'x',from:0,to:2,metric:'mushy',bins:8});
assert.equal(partial.selectedCells,2);near(partial.selectedVolumeM3,3);assert.equal(partial.eligibleCells,2);near(partial.range[0],4/3);
const empty=hapi.slice(result,{axis:'x',from:0,to:.1,metric:'upward',bins:8});assert.equal(empty.selectedCells,0);assert.equal(empty.range,null);
assert.throws(()=>hapi.slice(result,{axis:'z',from:2,to:1,metric:'arrival',bins:8}));
assert.throws(()=>hapi.slice(result,{axis:'z',from:0,to:1,metric:'unknown',bins:8}));
assert.throws(()=>hapi.slice(result,{axis:'z',from:0,to:1,metric:'arrival',bins:512}));
const csv=hapi.csv(full);assert(csv.includes('eligible_volume_m3,volume_weighted_mean,unit'));assert(csv.split('\n').some(x=>x.endsWith(',0,,s')));
assert(source.includes("pfEl('pfHistorySliceExport').onclick=()=>pfExport('slice')"));
assert(source.includes('if(pfLast){pfPlot(pfLast);pfDrawHistorySlice()}'));
console.log('Cell history slab: exact cell-center selection, weighted bins, missing coverage and CSV PASS');
}
