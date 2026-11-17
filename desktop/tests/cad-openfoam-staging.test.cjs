'use strict';
// Granada F4: execute ORIGINAL CAD source batch, OpenFOAM edition staging,
// STL ZIP byte output, original geometry syntax, metre positions and UI guard.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
  'frontend','v24-cad-surface-inspector.js'),'utf8');
new Function(src);
function part(begin,end){
  const i=src.indexOf(begin),j=src.indexOf(end,i+begin.length);
  assert(i>=0&&j>i,'Original CAD functions not found: '+begin+' to '+end);
  return src.slice(i,j)
}
const api=new Function(part('/* FOAMLENS_CAD_CORE_START */',
  '/* FOAMLENS_CAD_CORE_END */')+
  ';return{prepare:cgOpenFoamPrepare,target:cgOpenFoamTarget,'+
  'batch:cgVisibleRegionBatch,store:cgStoreZip,read:cgReadStoredZip,'+
  'parse:cgParseStl,summary:cgSummary,isolate:cgIsolatePart,'+
  'setPart:cgSetPartVisibility}')();
const tri=(partName,points)=>({part:partName,vertices:points});
const m=(name,triangles,unit,parts)=>{
  return{name,format:'obj-surface',bytes:121,triangles,unit,visible:true,
    summary:api.summary(triangles),partsVisible:new Map(parts.map(x=>[x,true]))}
};
const metal=m('Metal > test, A',[
  tri('wall',[[-1000,0,0],[0,0,0],[-1000,1000,0]]),
  tri('metal',[[-1000,0,0],[-1000,1000,0],[0,1000,0]])
], 'mm',['wall','metal']);
const mold=m('Mold test B',[
  tri('wall',[[0,0,-100],[100,0,-100],[0,100,0]]),
  tri('mold',[[0,0,-100],[0,100,0],[100,100,-100]])
],'cm',['wall','mold']);
const ignored=m('Unknown units / hidden',[
  tri('ignore',[[0,0,0],[1,0,0],[0,1,0]])
],'unknown',['ignore']);ignored.visible=false;
const models=[metal,mold,ignored];
const roles=new Map([['0|metal','metal'],['0|wall','interface'],
  ['1|wall','wall'],['1|mold','mold']]);
const first=api.prepare(models,'foundation13',roles);
const second=api.prepare(models,'openfoamcom',roles);
assert.equal(first.manifest.regionCount,4);
assert.equal(first.manifest.triangleCount,4);
assert.equal(second.manifest.regionCount,4);
assert.equal(first.manifest.topologyWarnings,4,
  'Open triangulated source surfaces must still carry topological warnings');
assert.equal(first.manifest.rolesAssigned,4);
assert.equal(first.manifest.installedOpenFoamVerified,false,
  'Dropdown selection cannot claim that real WSL OpenFOAM was detected');
assert.equal(first.manifest.openFoamCaseMutated,false);
assert.equal(first.manifest.volumeMeshCreated,false);
assert.deepEqual(first.manifest.toolsExecuted,[]);
assert(first.manifest.limitations.some(x=>x.includes('polyMesh')));
assert.equal(first.target.caseGeometryDir,'constant/geometry');
assert.equal(second.target.caseGeometryDir,'constant/'+'tri'+'Surface');
assert.equal(first.target.geometryType,'triSurface');
assert.equal(second.target.geometryType,'triSurfaceMesh');
assert(first.geometryText.includes('type triSurface;'));
assert(!first.geometryText.includes('triSurfaceMesh'));
assert(first.geometryText.includes('file "model001_region001_wall.stl";'));
assert(first.geometryText.includes('geom_model001_region001_wall'));
assert(second.geometryText.includes('type triSurfaceMesh;'));
assert(!second.geometryText.includes('type triSurface;'));
assert(second.geometryText.includes('model001_region001_wall.stl\n'));
assert(!second.geometryText.includes('file "model001_region001_wall.stl"'),
  'OpenFOAM.com geometry keys are file basenames, not Foundation file entries');
assert(!src.includes('constant/triSurface'),'No undocumented hard-coded case path in CAD source');
assert(first.readme.includes('foamVersion')&&first.readme.includes('which snappyHexMesh'));
assert(first.readme.includes('blockMesh')&&first.readme.includes('snappyHexMesh'));
assert(first.readme.includes('surfaceCheck')&&first.readme.includes('checkMesh'));
assert(first.readme.includes('metal-mold interfaces'));
assert(!first.readme.includes('automatic valid multi-region mesh'));
assert.deepEqual(first.domain.boundsMinMeters,[-1,0,-1]);
assert.deepEqual(first.domain.boundsMaxMeters,[1,1,0]);
assert.deepEqual(first.domain.boundsSizeMeters,[2,1,1]);
assert.deepEqual(first.domain.thinAxes,[]);
assert.equal(first.domain.status.includes('NOT a blockMeshDict'),true);
assert.deepEqual(first.manifest.regions.map(r=>r.regionRoleSelectedByUser),
  ['interface','metal','wall','mold']);
assert(first.manifest.regions.every(r=>r.sourceRoleInferred===false));
assert.equal(first.manifest.regions[0].sourceFile,'Metal > test, A');
assert.equal(first.manifest.regions[2].sourceFile,'Mold test B');
assert.equal(first.manifest.regions[0].part,'wall');
assert.equal(first.manifest.regions[2].part,'wall');
assert.notEqual(first.manifest.regions[0].geometryName,first.manifest.regions[2].geometryName,
  'Parts with the same named label from different model origins need separate identities');
assert.equal(first.manifest.regions[0].sourceToMeterScale,.001);
assert.equal(first.manifest.regions[2].sourceToMeterScale,.01);
assert.equal(first.manifest.regions[0].outputCoordinates,'meters');
assert.deepEqual(first.manifest.regions[0].boundsMinMeters,[-1,0,0]);
assert.deepEqual(first.manifest.regions[2].boundsMinMeters,[0,0,-1]);
assert(first.files.every(f=>!f.name.includes('ignore')),
  'Invisible unknown-unit geometry is excluded, not rewritten or leaked');
assert.deepEqual(first.files.map(x=>x.name).slice(-4),[
  'staging/system/snappyHexMesh.geometry.foamlens',
  'staging/system/blockMesh.bounds.foamlens.json',
  'preparation.json','README-OPENFOAM-STAGING.txt'
]);
const batch=api.batch(models),zip=api.read(api.store(first.files)),
  archive=new Map(zip.map(x=>[x.name,x.data])),decode=new TextDecoder();
assert.equal(zip.length,8);
assert.equal(zip.filter(x=>x.name.endsWith('.stl')).length,4);
assert.deepEqual(JSON.parse(decode.decode(archive.get('preparation.json'))).regions,
  first.manifest.regions);
assert.deepEqual(JSON.parse(decode.decode(
  archive.get('staging/system/blockMesh.bounds.foamlens.json'))).boundsSizeMeters,[2,1,1]);
assert.equal(decode.decode(
  archive.get('staging/system/snappyHexMesh.geometry.foamlens')),first.geometryText);
assert.equal(decode.decode(archive.get('README-OPENFOAM-STAGING.txt')),first.readme);
for(let i=0;i<first.manifest.regions.length;i++){
  const r=first.manifest.regions[i];
  const original=batch.files[i].data;
  const staged=archive.get(r.outputFile);
  assert(staged&&staged.length===original.length);
  assert.deepEqual([...staged],[...original],
    'Staging preserves the original byte-exact SI binary STL without rescaling');
  const parsed=api.parse(staged,'verification.stl');
  assert.equal(parsed.format,'binary-stl');
  assert.equal(parsed.triangles.length,r.sourceTopology.triangles);
}
const rawBefore=models.map(m=>({unit:m.unit,visible:m.visible,
  triangles:JSON.stringify(m.triangles),parts:[...m.partsVisible]}));
assert.deepEqual(models.map(m=>({unit:m.unit,visible:m.visible,
  triangles:JSON.stringify(m.triangles),parts:[...m.partsVisible]})),rawBefore,
  'Preparation does not mutate the actual original CAD source assembly');
assert.throws(()=>api.prepare(models,'unspecified',roles),/Select and verify/);
assert.throws(()=>api.prepare(models,'openfoam-org'+'-unknown',roles),/Select and verify/);
assert.throws(()=>api.prepare(models,'foundation13',new Map([['0|metal','solver']])),
  /Unknown explicit OpenFOAM region role/);
assert.throws(()=>api.prepare(models,'foundation13',{}),/Invalid explicit/);
const absent=api.prepare(models,'openfoamcom');
assert(absent.manifest.regions.every(r=>r.regionRoleSelectedByUser==='unassigned'));
assert.equal(absent.manifest.rolesAssigned,0,
  'No implicit inference from original part labels metal/mold');
metal.unit='unknown';
assert.throws(()=>api.prepare(models,'foundation13',roles),/Confirm the physical source units/);
metal.unit='mm';
ignored.visible=true;
assert.throws(()=>api.prepare(models,'foundation13',roles),/Confirm the physical source units/);
ignored.visible=false;
api.setPart(models,0,'wall',false);
const partial=api.prepare(models,'foundation13',roles);
assert.equal(partial.manifest.regionCount,3);
assert(!partial.manifest.regions.some(r=>r.originalModelIndex===0&&r.part==='wall'));
assert.deepEqual(api.read(api.store(partial.files)).filter(x=>x.name.endsWith('.stl')).length,3);
api.setPart(models,0,'wall',true);
const isolated=api.isolate(models,1,'mold');
const single=api.prepare(models,'foundation13',roles);
assert.equal(single.manifest.regionCount,1);
assert.equal(single.manifest.regions[0].part,'mold');
assert.equal(single.manifest.regions[0].regionRoleSelectedByUser,'mold');
// Restore exact model-part identity for other original regression suites.
for(let i=0;i<models.length;i++){
 models[i].visible=isolated[i].visible;
 for(const [p,shown] of isolated[i].parts)models[i].partsVisible.set(p,shown)
}
assert.equal(api.prepare(models,'foundation13',roles).manifest.regionCount,4);
assert(src.includes('id="cgOpenFoamTarget"'));
assert(src.includes('id="cgExportOpenFoamPrep"'));
assert(src.includes('data-cg-role='));
assert(src.includes("document.getElementById('cgExportOpenFoamPrep').onclick=cgExportOpenFoamPrep"));
assert(src.includes("document.getElementById('cgOpenFoamTarget').addEventListener('change',cgRefreshOpenFoamPrep)"));
assert(src.includes("cgDownloadZip('FoamLens-OpenFOAM-'+chosen+'-geometry-staging.zip',bytes)"));
assert(src.includes('new WeakMap()'),
  'Explicit role annotations belong to the original CAD model object identity, not just model name');
console.log('PASS CAD F4: OpenFOAM Foundation vs .com staged geometry and path, original SI binary STL bytes, blockMesh bounds, explicit roles, original unit guard, ZIP and zero CFD case mutation');
