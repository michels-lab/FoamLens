'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const code=fs.readFileSync(path.join(dir,'v24-checkmesh-region-evidence.js'),'utf8'),
    parser=fs.readFileSync(path.join(dir,'v20-mesh-quality-audit.js'),'utf8');
new Function(code);
const core=code.split('/* FOAMLENS_MESH_EVIDENCE_CORE_START */')[1].split('/* FOAMLENS_MESH_EVIDENCE_CORE_END */')[0];
const oldCore=parser.split('/* FOAMLENS_CHECKMESH_CORE_START */')[1].split('/* FOAMLENS_CHECKMESH_CORE_END */')[0];
const me=new Function(core+';return {audit:meEvidence,defects:meDefects,label:meLabel}')();
const checkMesh=new Function(oldCore+';return maPureCheckMesh')();
const run=(name,text)=>({rawText:text,audit:checkMesh(text,name)});
const metal=[
  'Exec : checkMesh -region metal','Region: metal','Mesh stats',' points: 120',' faces: 140',
  ' internal faces: 95',' cells: 80',' Checking geometry...',
  ' Min volume = 0.00001. Max volume = 0.0002. Total volume = 0.02.',
  ' Mesh non-orthogonality Max: 58 average: 13.','Mesh OK.'
].join('\n');
const mold=[
  'Exec : checkMesh -region mold','Region: mold','Mesh stats',' points: 150',' faces: 230',
  ' internal faces: 180',' cells: 90',' Checking geometry...',
  ' Min volume = 0.00002. Max volume = 0.0003. Total volume = 0.04.',
  ' Mesh non-orthogonality Max: 67 average: 20.','Mesh OK.'
].join('\n');
const r=me.audit([run('case-private-metal.log',metal),run('private-mold.log',mold)],['metal','mold']);
assert.equal(r.schema,'foamlens/multiregion-mesh-evidence/1');
assert.equal(r.status,'all-expected-regions-reported');
assert.equal(r.overallScientificValidity,'not-certified');
assert.equal(r.coverage.expected,2);assert.equal(r.coverage.evidenced,2);
assert.equal(r.regions.length,2);
assert.equal(r.regions[0].region,'metal');assert.equal(r.regions[1].region,'mold');
assert.equal(r.regions[0].metrics.cells.value,80);
assert.equal(r.regions[1].metrics.totalVolume.value,.04);
assert.equal(r.regions[0].status,'reported-ok-no-warnings');
assert.deepEqual(r.missingRegions,[]);
assert.equal(r.conflicts.length,0);
assert.equal(r.regions[0].metrics.minPyramidVolume.value,null);
assert.equal(r.regions[0].metrics.minPyramidVolume.evidence,'not-reported');
assert(r.limitations.some(x=>x.includes('NOT aggregated')));
assert(!JSON.stringify(r).includes('case-private-metal.log'),'Privacy: original report names must not be exported');
assert(!JSON.stringify(r).includes('private-mold.log'),'Privacy: raw file names must not appear');
const missing=me.audit([run('a',metal)],['metal','mold']);
assert.equal(missing.status,'partial-or-unattributed');
assert.deepEqual(missing.missingRegions,['mold']);
assert.equal(missing.regions.length,1);
const repeated=me.audit([run('a',metal),run('b',metal)],['metal']);
assert.equal(repeated.status,'conflicting-or-failed');
assert.equal(repeated.regions.length,1,'Duplicate report must not be aggregated');
assert.equal(repeated.regions[0].conflicted,true);
assert.equal(repeated.conflicts[0].reason.includes('numeric metrics not merged'),true);
const noName=me.audit([run('a',metal.replace('Region: metal',''))],['metal']);
assert.equal(noName.status,'partial-or-unattributed');
assert.equal(noName.coverage.unattributed,1);
assert.deepEqual(noName.missingRegions,['metal']);
const unassignedFailure=me.audit([run('private-user-report',
 'Exec : checkMesh\nMesh stats\n cells: 5\n2 mesh checks failed.')],['metal']);
assert.equal(unassignedFailure.status,'conflicting-or-failed',
 'An unattributed failing original checkMesh report must never be treated as a mere absent region');
assert.equal(unassignedFailure.coverage.unattributedFailures,1);
assert.equal(unassignedFailure.regions.length,0,'Failure cannot be guessed into a specific material region');
const unknown=me.audit([run('a','some random number 12')],['metal']);
assert.equal(unknown.status,'partial-or-unattributed');
assert.equal(unknown.regions.length,0);
const badVolume=me.audit([run('a',metal.replace('Min volume = 0.00001','Min volume = -0.00001'))],['metal']);
assert.equal(badVolume.status,'conflicting-or-failed');
assert(badVolume.regions[0].topologyIssues.some(x=>x.includes('nonpositive')));
const badCounts=me.audit([run('a',metal.replace('internal faces: 95','internal faces: 950'))],['metal']);
assert.equal(badCounts.status,'conflicting-or-failed');
assert(badCounts.regions[0].topologyIssues.some(x=>x.includes('internalFaces')));
const failing=me.audit([run('a',metal.replace('Mesh OK.','3 mesh checks failed.'))],['metal']);
assert.equal(failing.status,'conflicting-or-failed');
assert.equal(failing.regions[0].status,'error');
const caution=me.audit([run('a',metal.replace('Mesh OK.','***Max skewness above recommended limit.\nMesh OK.'))],['metal']);
assert.equal(caution.regions[0].status,'reported-ok-with-warnings');
assert.equal(caution.overallScientificValidity,'not-certified');
const numericWarnings=me.audit([run('a',metal.replace('Mesh OK.','Warnings: 2\nMesh OK.'))],['metal']);
assert.equal(numericWarnings.regions[0].status,'reported-ok-with-warnings',
 'Reported warning count must not be discarded when warning lines are absent');
assert.equal(numericWarnings.regions[0].warnings,2);
const extra=me.audit([run('a',metal)],['mold']);
assert.equal(extra.status,'conflicting-or-failed');
assert.deepEqual(extra.missingRegions,['mold']);
const multi=metal+'\n'+mold;
const sameFile=me.audit([run('two-regions.log',multi)],['metal','mold']);
assert.equal(sameFile.coverage.evidenced,2);
assert.equal(sameFile.regions.length,2);
assert(!sameFile.regions.some(x=>x.status==='error'));
assert.equal(me.audit([],[]).status,'partial-or-unattributed');
assert.equal(me.audit(Array(25).fill({}),['metal']).status,'not-assessed');
assert.equal(me.audit([run('a',metal)],['metal','metal']).status,'not-assessed');
assert.equal(me.label('../privateCase'),null);
const textLocators=[
 'Checking topology...',
 '*** Error: cell 123 has negative volume at (0.02 0.03 0.04)',
 'Severely non-orthogonal face #45',
 'face 77 illegal at (-2e-3 0 3)',
 'unrelated time 0.04'
].join('\n');
const clues=me.defects(textLocators);
assert.equal(clues.items.length,3);
assert.equal(clues.items[0].cellId,123);
assert.deepEqual(clues.items[0].reportedCoordinateM,[.02,.03,.04]);
assert.equal(clues.items[0].verifiedAgainstPolyMesh,false);
assert.equal(clues.items[1].faceId,45);
assert.equal(clues.items[1].reportedCoordinateM,null);
assert.equal(clues.items[2].faceId,77);
assert.deepEqual(clues.items[2].reportedCoordinateM,[-.002,0,3]);
assert.equal(me.defects('X'.repeat(12*1024*1024+1)).unsupported,true);
for(const token of ["maPureCheckMesh(contents,'local report '","window.FoamLensMultiRegionMeshEvidence",
 "generalAnalysisModules","id=\"meCase\"","id=\"meFiles\"","id=\"meExport\"",
 "meReset('Original reports changed: re-audit before exporting.')",
 "caseBinding:'manual-attachment-not-cryptographically-verified'",
 'overallScientificValidity:\'not-certified\'']){
 assert(code.includes(token),'Missing source-backed UI contract '+token)
}
assert(!code.includes('fetch(')&&!code.includes('XMLHttpRequest'),'No network uploads');
assert(!code.includes('cases.push(')&&!code.includes('series.push('),'No simulation modification');
console.log('Granada #150 PASS: per-region source labels, missing/duplicate failures, contextual sanity, explicit error locators and privacy.');
