'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-solidification-front-3d.js'),'utf8');
new Function(source);
const from=source.indexOf('/* FOAMLENS_FRONT3D_CORE_START */'),
 to=source.indexOf('/* FOAMLENS_FRONT3D_CORE_END */');
assert(from>=0&&to>from,'Source 3D front core must be isolated for geometric tests');
const {volume,isosurface,meshDigest,fieldDigest}=new Function(source.slice(from,to)+
 ';return{volume:sfVolumes,isosurface:sfIsoSurface,meshDigest:sfOriginalMeshDigest,fieldDigest:sfOriginalDigest}')();
const startObj=source.indexOf('function sfIsoObj('),endObj=source.indexOf('function sfIsoDraw(',startObj);
assert(startObj>=0&&endObj>startObj,'OBJ export contract must be independently testable');
const obj=new Function(source.slice(startObj,endObj)+';return sfIsoObj')();
const near=(a,b,tol=1e-10)=>assert(Math.abs(a-b)<tol,String(a)+' should match '+b);
const points=[
 [0,0,0],[1,0,0],[1,1,0],[0,1,0],
 [0,0,1],[1,0,1],[1,1,1],[0,1,1],
 [2,0,0],[2,1,0],[2,0,1],[2,1,1]
];
const faceIds=[
 [1,2,6,5],
 [0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],
 [8,9,11,10],[1,2,9,8],[5,10,11,6],[1,8,10,5],[2,6,11,9]
];
function mesh(faces=faceIds){
 const faceOffsets=[0],facePoints=[];
 for(const polygon of faces){facePoints.push(...polygon);faceOffsets.push(facePoints.length)}
 return{supported:true,points:points.flat(),owners:[0,0,0,0,0,0,1,1,1,1,1],
  neighbours:[1],internalFaceCount:1,faceOffsets,facePoints,
  cellCount:2,cellCenters:[.5,.5,.5,1.5,.5,.5]}
}
const m=mesh(),g=volume(m);
assert(g.ok,g.reason);near(g.volumes[0],1);near(g.volumes[1],1);
const surf=isosurface(m,g,[0,1],.5);
assert(surf.ok,surf.reason);
assert.strictEqual(surf.exactSolverIsoSurface,false);
assert.strictEqual(surf.reconstructedFromCellValues,true);
assert.match(surf.method,/reconstructed nodal scalar/);
near(surf.areaM2,1);
assert.strictEqual(surf.triangleCount,2);
assert.strictEqual(surf.vertexCount,4);
assert.strictEqual(surf.boundaryEdgeCount,4);
assert.strictEqual(surf.nonManifoldEdgeCount,0);
assert.strictEqual(surf.surfaceClosed,false,'The physical 1x1 alpha plane meets original domain boundary');
assert.deepStrictEqual(surf.centroidXYZm,[1,.5,.5]);
assert(surf.vertices.every(([x,y,z])=>Math.abs(x-1)<1e-12&&y>=0&&y<=1&&z>=0&&z<=1));
for(const [i,j,k] of surf.triangles){
 const a=surf.vertices[i],bb=surf.vertices[j],c=surf.vertices[k];
 const u=bb.map((v,t)=>v-a[t]),v=c.map((q,t)=>q-a[t]);
 const nx=u[1]*v[2]-u[2]*v[1];
 assert(nx>0,'Source alpha-0 to alpha-1 oriented reconstructed triangle must face +X')
}
const document=obj(surf,{caseName:'Case A',region:'metal',timeS:0});
assert(document.startsWith('# FoamLens reconstructed OpenFOAM alpha isosurface'));
assert(document.includes('not an exact solver-native interface'));
assert(document.includes('v 1.0000000000000000 0.0000000000000000 0.0000000000000000'));
assert.strictEqual((document.match(/^v /gm)||[]).length,surf.vertexCount);
assert.strictEqual((document.match(/^f /gm)||[]).length,surf.triangleCount);
assert(document.includes('f 3 1 2')||document.includes('f 4 1 3'),'OBJ uses 1-based face indices');
const identical=isosurface(m,g,[0,1],.5);
assert.deepStrictEqual(identical.triangles,surf.triangles,'Same original source yields deterministic triangle connectivity');
assert.deepStrictEqual(identical.vertices,surf.vertices);
const sloped=isosurface(m,g,[0,1],.25);
assert(sloped.ok,sloped.reason);
assert(sloped.triangleCount>2);
assert(sloped.areaM2>1,
 'Reconstruction changes geometry away from symmetric level; must not claim exact plane for original cell values');
assert(surf.limitations.some(x=>/not independently measured/i.test(x)));
for(const level of [null,'',-1,0,1,1.1,NaN]){
 assert(!isosurface(m,g,[0,1],level).ok,'Invalid or boundary threshold must fail: '+String(level))
}
assert(!isosurface(m,g,[-.001,1],.5).ok,'Nonphysical original fraction not interpolated');
assert(!isosurface(m,g,[null,1],.5).ok,'Original null is not liquid zero');
assert(!isosurface(m,g,[0,'NaN'],.5).ok);
assert(!isosurface(m,g,[0],.5).ok,'Field must contain every original source cell');
assert(!isosurface(m,g,[0,1],.5,{maxTriangles:1}).ok,
 'Explicit triangle cap must reject, never produce a partial unreported area');
assert(!isosurface(m,g,[0,1],.5,{maxTriangles:1000001}).ok);
const plateau=isosurface(m,g,[.5,.5],.5);
assert(plateau.ok);
assert.strictEqual(plateau.triangleCount,0);
assert(plateau.ambiguousPlateauTetrahedra>0,
 'A perfectly ambiguous threshold plateau is not an invented isosurface');
const uniform=isosurface(m,g,[0,0],.5);
assert(uniform.ok);assert.strictEqual(uniform.triangleCount,0);assert.strictEqual(uniform.areaM2,0);
const sourceChecksum=meshDigest(m);
assert(sourceChecksum);
const movingMesh=mesh();movingMesh.points[1]+=.01;
assert.notStrictEqual(meshDigest(movingMesh),sourceChecksum,
  'Changing original polyMesh XYZ must invalidate the previous surface export');
const changingTime=mesh();changingTime.cellCenters[0]+=.05;
assert.notStrictEqual(meshDigest(changingTime),sourceChecksum);
assert.notStrictEqual(fieldDigest([0,.4,1]),fieldDigest([.1,.3,1]),
  'Same-mean changed original cell values must invalidate export');
const nonStar=mesh();nonStar.cellCenters[0]=10;
const physicallyClosed=volume(nonStar);assert(physicallyClosed.ok);
assert(!isosurface(nonStar,physicallyClosed,[0,1],.5).ok,
 'Face-fan tetra cannot infer geometry of a source cell with exterior center');
const broken=mesh();broken.facePoints[1]=999;
assert(!volume(broken).ok);
const unsupported=isosurface(broken,{ok:false},[0,1],.5);
assert(!unsupported.ok);
for(const srcToken of [
 'sfIsoSurface(mesh,geometry,values,report.thresholds.front)',
 'sfOriginalMeshDigest(mesh)',
 'sfIsoObj(rebuilt.surface,rebuilt)',
 "downloadText('FoamLens_reconstructed_alpha_'",
 "sfEl('sfIsoObj').disabled=surface.triangleCount<1",
 "id=\"sfIsoCanvas\"","id=\"sfIsoRun\"",
 'canvas.addEventListener(\'pointermove\'',
 'fvResolveFieldMeshLayout(c,region,groups[0],t)',
 'pmLoadStoredFieldSet(c.id,name,t,region)',
 'sfOriginalDigest(values)!==sourceProof.originalCellValueFingerprint',
 'isoSurface:sfIsoSurface'
])assert(source.includes(srcToken),'Missing native original-case reconstructed isosurface flow: '+srcToken);
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'),
 'No original research data may be transmitted to an external service');
console.log('Granada #153 reconstructed 3D iso PASS: sourced 2-cube triangulation area=1 m2, orientation, OBJ, malformed metadata, original case re-read, no false solver-native claims.');
