'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v20-mesh-quality-audit.js'),'utf8');
new Function(source);
const first=source.indexOf('/* FOAMLENS_CHECKMESH_CORE_START */'),last=source.indexOf('/* FOAMLENS_CHECKMESH_CORE_END */',first);
assert(first>=0&&last>first,'scientific checkMesh parser contract is missing');
const {parse}=new Function(source.slice(first,last)+';return{parse:maPureCheckMesh}')();
const example=[
'Exec   : checkMesh -allTopology -allGeometry',
'Time = 0',
'Mesh stats',
'    points:           1520',
'    faces:            7400',
'    internal faces:   6050',
'    cells:            3200',
'    boundary patches: 5',
'    cell zones:       2',
'    face zones:       1',
'Checking topology...',
'    Number of regions: 1 (OK).',
'Checking geometry...',
'    Overall domain bounding box (0 0 0) (0.2 0.15 0.04)',
'    Max cell openness = 3.5e-16 OK.',
'    Max aspect ratio = 8.4 OK.',
'    Minimum face area = 2.0e-7. Maximum face area = 0.004. Face area magnitudes OK.',
'    Min volume = 1.0e-8. Max volume = 1.5e-4. Total volume = 0.0012.',
'    Mesh non-orthogonality Max: 67 average: 13.5',
'    Max skewness = 3.2 OK.',
'Mesh OK.'
].join('\n');
const good=parse(example,'testCheckMesh.log');
assert.strictEqual(good.status,'reported-ok');
assert.strictEqual(good.metrics.cells.value,3200);
assert.strictEqual(good.metrics.faces.value,7400);
assert.strictEqual(good.metrics.internalFaces.value,6050);
assert.strictEqual(good.metrics.maxNonOrthogonality.value,67);
assert.strictEqual(good.metrics.meanNonOrthogonality.value,13.5);
assert.strictEqual(good.metrics.maxSkewness.value,3.2);
assert.strictEqual(good.metrics.minVolume.value,1e-8);
assert.strictEqual(good.metrics.maxFaceArea.value,0.004);
assert.deepStrictEqual(good.bounds.min,[0,0,0]);
assert.deepStrictEqual(good.bounds.max,[.2,.15,.04]);
assert.strictEqual(good.metrics.points.status,'reported');
assert.strictEqual(good.metrics.minPyramidVolume.value,null,'Unreported metric must never be 0');
assert.strictEqual(good.metrics.minPyramidVolume.status,'not-reported');
assert.strictEqual(good.reported.failedChecks,null,'Do not invent the number of failed checks');
const bad=parse(example.replace('Mesh OK.','***High aspect ratio faces detected.\n  2 mesh checks failed.'),'bad.txt');
assert.strictEqual(bad.status,'failed');
assert.strictEqual(bad.reported.failedChecks,2);
assert(bad.messages.warnings.length||bad.messages.failures.length,'Report checkMesh warnings/failures');
const multi=parse('Exec : checkMesh -region fluid\nRegion: fluid\nMesh stats\n cells: 29\n faces: 50\n points: 31\nRegion: metal\nMesh stats\n cells: 12\n faces: 32\n points: 20\n','multi.log');
assert.deepStrictEqual(multi.regionLabels,['fluid','metal']);
assert.strictEqual(multi.metrics.regions.value,2);
assert.strictEqual(multi.metrics.regions.status,'observed-labels-only');
assert.strictEqual(multi.metrics.cells.value,null,'Last mesh region may not overwrite global metric');
assert.strictEqual(multi.regionAudits.length,2,'Independent region audits must be preserved');
assert.strictEqual(multi.regionAudits[0].metrics.cells.value,29);
assert.strictEqual(multi.regionAudits[1].metrics.cells.value,12);
assert.strictEqual(multi.status,'incomplete','Do not imply success without checkMesh result');
const unknown=parse('alphaL: 0.5\nU: (1 2 3)\nrandom contents');
assert.strictEqual(unknown.status,'unrecognized');
assert.strictEqual(unknown.metrics.maxSkewness.value,null);
assert(!unknown.recognized);
const okWithoutMetrics=parse('Exec : checkMesh\nMesh OK.');
assert.strictEqual(okWithoutMetrics.metrics.cells.value,null);
assert.strictEqual(okWithoutMetrics.status,'reported-ok','When the original report says Mesh OK, preserve that exact assertion');
const noFalseFailure=parse(example.replace('Mesh OK.','***Max skewness exceeds recommended limit.\nMesh OK.'));
assert.strictEqual(noFalseFailure.status,'reported-ok','An actual warning plus Mesh OK is a reported pass, with caution');
assert(noFalseFailure.messages.warnings.length>0);
assert.throws(()=>parse('x'.repeat(16*1024*1024+1)),/too large/);
for(const item of ['document.getElementById(\'datasetModeBlock\')','type="file" id="maFile"','maPureCheckMesh(content,file.name)','maExport','sourceKind','not-reported'])
  assert(source.includes(item),'Required UI/source audit gate missing: '+item);
console.log('checkMesh audit PASS: topology, geometry, explicit missing values, regions, caution, rejection, local source and export.');
