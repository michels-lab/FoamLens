'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-solidification-front-3d.js'),'utf8');
new Function(source);
const a=source.indexOf('/* FOAMLENS_FRONT3D_CORE_START */'),b=source.indexOf('/* FOAMLENS_FRONT3D_CORE_END */');
assert(a>=0&&b>a,'3D front scientific core must be isolated from app UI');
const {volume,front,trajectory}=new Function(source.slice(a,b)+
 ';return {volume:sfVolumes,front:sfFront,trajectory:sfTrajectory,sourceTimes:sfSourceTimes,digest:sfOriginalDigest}')();
const almost=(x,y,tol=1e-12)=>assert(Math.abs(x-y)<tol,String(x)+' ≈ '+y);
const pts=[
 [0,0,0],[1,0,0],[1,1,0],[0,1,0],
 [0,0,1],[1,0,1],[1,1,1],[0,1,1],
 [2,0,0],[2,1,0],[2,0,1],[2,1,1]
];
const faces=[
 // One true internal face, OpenFOAM normal points from cell 0 to cell 1.
 [1,2,6,5],
 // Exterior faces of cell 0, oriented outwards.
 [0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],
 // Exterior faces of cell 1, oriented outwards.
 [8,9,11,10],[1,2,9,8],[5,10,11,6],[1,8,10,5],[2,6,11,9]
];
const build=(fs=faces,owners=[0,0,0,0,0,0,1,1,1,1,1])=>{
 const faceOffsets=[0],facePoints=[];
 for(const face of fs){facePoints.push(...face);faceOffsets.push(facePoints.length)}
 return{supported:true,cellCount:2,points:pts.flat(),owners,neighbours:[1],
  internalFaceCount:1,faceOffsets,facePoints,
  cellCenters:[.5,.5,.5,1.5,.5,.5]}
};
const m=build(),g=volume(m);
assert(g.ok,g.reason);assert.equal(g.units,'m3');assert.equal(g.cells,2);
almost(g.volumes[0],1);almost(g.volumes[1],1);almost(g.total,2);
const conf={caseId:51,region:'metal',timeS:0,low:.05,high:.95,threshold:.5,axis:'x'};
const origin=front(m,g,[0,1],conf);assert(origin.ok,origin.reason);
almost(origin.totalVolumeM3,2);almost(origin.volumeM3.solid,1);
almost(origin.volumeM3.liquid,1);almost(origin.fractions.solid,.5);
assert.equal(origin.front.crossingFaceCount,1);
almost(origin.front.axisBoundsM.mean,1);
assert.deepEqual(origin.front.centroidXYZm,[1,.5,.5]);
assert(origin.interpretation.includes('NOT an exact geometric iso-surface'));
const middle=front(m,g,[.1,.9],{...conf,timeS:2});assert(middle.ok,middle.reason);
almost(middle.volumeM3.mushy,2);
const track=trajectory([middle,origin]);assert(track.ok,track.reason);
assert.deepStrictEqual(track.rows.map(x=>x.timeS),[0,2]);
almost(track.rows[1].meanFrontDisplacementVelocityMps,0);
assert.equal(track.rows[0].meanFrontDisplacementVelocityMps,null);
assert.equal(track.rows[1].velocityStatus,'centroid-displacement-proxy');
assert.equal(trajectory([origin,origin]).ok,false,'Repeated physical time cannot yield speed');
assert.equal(trajectory([origin,{...middle,caseId:99}]).ok,false,'Different original cases must not mix');
assert.equal(trajectory([origin,{...middle,region:'mold'}]).ok,false,'Different physical regions must not mix');
assert.equal(trajectory([origin,{...middle,front:{...middle.front,axis:'y'}}]).ok,false);
const oneCube=build(faces.slice(1,6),[0,0,0,0,0]);
oneCube.cellCount=1;oneCube.neighbours=[];oneCube.internalFaceCount=0;
oneCube.cellCenters=[.5,.5,.5];
assert(!volume(oneCube).ok,'Missing internal face makes the original cell boundary open');
const reverseFace=faces.map(f=>f.slice());reverseFace[0].reverse();
assert(!volume(build(reverseFace)).ok,'Original owner-to-neighbour face normal cannot be reversed');
const missingFace=faces.filter((_,i)=>i!==4);
const missingOwners=[0,0,0,0,0,1,1,1,1,1];
assert(!volume(build(missingFace,missingOwners)).ok,'Open polyhedron cannot claim a true cell volume');
const swappedOwner=build();swappedOwner.owners[0]=1;
assert(!volume(swappedOwner).ok,'Invalid source face ownership must not be silently corrected');
const invalidPoint=build();invalidPoint.facePoints[2]=999;
assert(!volume(invalidPoint).ok,'Nonexistent original vertex index cannot become a mesh');
const badCoord=build();badCoord.points[0]=NaN;
assert(!volume(badCoord).ok,'Nonfinite original geometry cannot yield a source volume');
const noCenters=build();noCenters.cellCenters=null;
assert(!volume(noCenters).ok,'Missing geometry centers blocks front estimate');
for(const a of [[null,1],[-.01,.6],[.2,1.01],[.2,'NaN'],[.5],[.2,.8,.9]]){
 const f=front(m,g,a,conf);assert(!f.ok,'Invalid original fraction should fail: '+JSON.stringify(a))
}
for(const cfg of [
 {...conf,axis:'time'},{...conf,low:.7,high:.2},
 {...conf,low:0,high:1.3},{...conf,threshold:1.2}
])assert(!front(m,g,[0,1],cfg).ok,'Nonphysical phase configuration must fail');
const noCrossing=front(m,g,[0,0],conf);
assert(noCrossing.ok);assert.equal(noCrossing.front.crossingFaceCount,0);
assert.equal(noCrossing.front.centroidXYZm,null);
assert.equal(noCrossing.front.axisBoundsM,null);
const plateau=front(m,g,[.5,.5],conf);
assert(plateau.ok);assert.equal(plateau.front.crossingFaceCount,0);
assert.equal(plateau.front.ambiguousPlateauFaces,1);
const plateauTrack=trajectory([origin,{...plateau,timeS:3}]);assert(plateauTrack.ok);
assert.equal(plateauTrack.rows[1].meanFrontDisplacementVelocityMps,null);
assert.equal(plateauTrack.rows[1].velocityStatus,'unavailable');

// Strict physical-time and original-cell evidence regressions.
const sourceTimes=[2,0,1];
const sortedSource=sourceTimes.slice();
const testedTimes=sourceTimes.map(Number);
const coreTimes=new Function(source.slice(a,b)+';return sfSourceTimes')();
assert.deepStrictEqual(coreTimes(testedTimes).times,[0,1,2]);
assert.equal(coreTimes([0,0,1]).ok,false,'Duplicate times cannot be deduplicated into fake coverage');
assert.equal(coreTimes([0,null,2]).ok,false,'Missing original physical time is not t=0');
assert.equal(coreTimes([0,'',2]).ok,false,'Blank physical timestamp is not zero');
assert.equal(coreTimes([0,'NaN',2]).ok,false);
assert.equal(coreTimes([0]).ok,false,'A single instant cannot yield front velocity');
const digest=new Function(source.slice(a,b)+';return sfOriginalDigest')();
const d1=digest([0,.5,1]),d2=digest([.1,.4,1]);
assert(d1&&d2&&d1!==d2,'Distinct original cell fractions must produce distinct re-read fingerprints');
assert.equal(digest([0,NaN,1]),null);
assert.equal(digest([0,null,1]),null);
assert.equal(digest([0,.5,1]),d1,'Same real source cell values must remain stable');
assert(source.includes('await sfAnalyze();')&&source.includes('originalCellValueFingerprint:fieldFingerprint'),
  'Native export must re-read original meshes and every cell fraction before saving');
assert(source.includes('Original source mesh/field evidence changed.'),
  'Scientific export must reject changed source after complete reread');

// Source/GUI integration: never make a displayed front from invented values,
// fake cell counts, or a fallback "mesh-volume = 1" per cell.
for(const key of ['fvResolveFieldMeshLayout(c,region,group[0],time)',
  'fvLoadMeshForLayout(c,layout,region,time)','pmLoadStoredFieldSet(c.id,name,time,region)',
  'fvCombinePartitionFieldValues(mesh,parts','pmComponentValues(parts[0]',
  'sourcePaths','cellCount','sfVolumes(mesh)','sfFront(mesh,geo,values',
  'sfTrajectory(snapshots)',"window.FoamLensSolidificationFront3D",
  'generalAnalysisModules',"id='sfPanel'","id=\"sfExport\""])
 assert(source.includes(key),'Missing real original source/3D field wiring: '+key);
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'),'No remote case transmission');
for(const fixture of ['QuickCup','B14','C14','thermalAlphaMetal'])
 assert(!source.includes(fixture),'Thesis-specific assumptions leaked into generic 3D front UI: '+fixture);
console.log('Granada #153 3D Front PASS: 2 closed cubes, real m3 by phase, owner/neighbour geometry, exact source time, crossing proxy and fail-closed invalid mesh/alpha.');
