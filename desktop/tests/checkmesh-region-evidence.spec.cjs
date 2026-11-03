'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const code=fs.readFileSync(path.join(dir,'v24-checkmesh-region-evidence.js'),'utf8'),
    parser=fs.readFileSync(path.join(dir,'v20-mesh-quality-audit.js'),'utf8');
new Function(code);
const core=code.split('/* FOAMLENS_MESH_EVIDENCE_CORE_START */')[1].split('/* FOAMLENS_MESH_EVIDENCE_CORE_END */')[0];
const oldCore=parser.split('/* FOAMLENS_CHECKMESH_CORE_START */')[1].split('/* FOAMLENS_CHECKMESH_CORE_END */')[0];
const me=new Function(core+';return {audit:cmrEvidence,defects:cmrDefects,label:cmrLabel,manifest:cmrVerifyLocalManifest}')();
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
// Granada fail-closed same-defect regressions: reported region names are NOT proof
// of a finished, recognized and successful checkMesh source summary.
const incompleteSource=metal.replace('Mesh OK.','');
const incompleteAudit=me.audit([run('region-named-no-final-summary',incompleteSource)],['metal']);
assert.equal(incompleteAudit.regions[0].status,'insufficient-evidence');
assert.equal(incompleteAudit.status,'partial-or-unattributed',
  'All source region labels with missing terminal summary must not appear fully reported');
const forgedLabelSource=run('unsafe-label-only',metal);
forgedLabelSource.audit={...forgedLabelSource.audit,recognized:false,status:'unrecognized'};
const forgedLabelResult=me.audit([forgedLabelSource],['metal']);
assert.equal(forgedLabelResult.status,'partial-or-unattributed',
  'A source with an explicit region label but unrecognized checkMesh identity cannot be complete');
assert.equal(forgedLabelResult.regions.length,0,'Unrecognized text must not contribute numeric region evidence');
assert.equal(forgedLabelResult.coverage.rejected,1);
const failedOuterSource=run('multi-with-source-fatal',multi);
failedOuterSource.audit={...failedOuterSource.audit,status:'failed'};
const globalFailureResult=me.audit([failedOuterSource],['metal','mold']);
assert.equal(globalFailureResult.status,'conflicting-or-failed',
  'A source-level failure outside any region must not be ignored by successful region chunks');
assert.equal(globalFailureResult.coverage.sourceLevelFailures,1);
assert.equal(globalFailureResult.overallScientificValidity,'not-certified');
const incompleteMixed=me.audit([run('complete-metal',metal),
  run('incomplete-mold',mold.replace('Mesh OK.',''))],['metal','mold']);
assert.equal(incompleteMixed.status,'partial-or-unattributed',
  'One incomplete region among otherwise complete reports cannot return all expected reported');
// OpenFOAM's genuine checkMesh -region stdout uses both Exec and "Create
// polyMesh <region> for time = ..." even when no "Region:" header exists.
// Test output STRUCTURE here is a fixture, not an actual checked polyMesh.
const nativeMetal=metal.replace('Region: metal','Create polyMesh metal for time = 0');
const nativeMold=mold.replace('Region: mold','Create mesh mold for time = 0');
const nativePaired=me.audit([run('unknown-a.log',nativeMetal),
  run('unrelated-b.log',nativeMold)],['metal','mold']);
assert.equal(nativePaired.status,'all-expected-regions-reported');
assert.deepEqual(nativePaired.regions.map(x=>x.region),['metal','mold']);
assert(nativePaired.regions.every(x=>x.regionAttribution===
  'paired-checkMesh-region-option-and-OpenFOAM-named-mesh-creation'));
assert.equal(nativePaired.regions[0].metrics.cells.value,80);
assert.equal(nativePaired.regions[1].metrics.cells.value,90);
assert.equal(nativePaired.overallScientificValidity,'not-certified');
// The command ALONE and the mesh line ALONE are insufficient evidence.
const missingMeshMarker=me.audit([run('metal-filename.log',
  nativeMetal.replace('Create polyMesh metal for time = 0',''))],['metal']);
const missingExecMarker=me.audit([run('metal-filename.log',
  nativeMetal.replace('Exec : checkMesh -region metal','Exec : checkMesh'))],['metal']);
assert.deepEqual(missingMeshMarker.missingRegions,['metal']);
assert.deepEqual(missingExecMarker.missingRegions,['metal']);
assert.equal(missingMeshMarker.coverage.unattributed,1);
assert.equal(missingExecMarker.coverage.unattributed,1);
const markerConflict=me.audit([run('metal.log',
  nativeMetal.replace('Create polyMesh metal','Create polyMesh mold'))],['metal','mold']);
assert.equal(markerConflict.status,'conflicting-or-failed');
assert.equal(markerConflict.regions.length,0);
assert.equal(markerConflict.coverage.unattributed,1);
assert.equal(markerConflict.conflicts.length,1);
const headerConflict=me.audit([run('mold.log',
  metal.replace('Region: metal','Region: mold'))],['metal','mold']);
assert.equal(headerConflict.status,'conflicting-or-failed');
assert.equal(headerConflict.regions.length,0);
// Repeated or inconsistent region command lines are not single-region proof.
const repeatedOption=me.audit([run('unrelated.log',nativeMetal+
  '\nExec : checkMesh -region mold')],['metal','mold']);
assert.equal(repeatedOption.status,'conflicting-or-failed');
assert.equal(repeatedOption.regions.length,0);
// Generic stdout mentioning a region without *both* original checkMesh
// source identities cannot silently be promoted to region evidence.
const genericMention=me.audit([run('metal.log',
  nativeMetal.replace('Create polyMesh metal for time = 0',
    'Creating mesh for region metal'))],['metal']);
assert.equal(genericMention.status,'partial-or-unattributed');
assert.equal(genericMention.regions.length,0);
// Original SHA-256 capture manifest: hashes must match selected report BY CONTENT,
// not by name, order, arbitrary filenames, case label or copied JSON assertions.
const fakeHash=k=>k.repeat(64);
const realEvidence=me.audit([run('anonymous-original-A',metal),
  run('anonymous-original-B',mold)],['metal','mold']);
const mkRow=(name,hash)=>({
  region:name,status:'source-report-ready-not-certified',scientificValidity:'not-certified',
  logSha256:hash,meshFilesUnchanged:true,exitCode:0,stderrPresent:false,
  sourceMarkers:{region:name,matched:true,terminalMeshOk:true},
  meshFilesSha256Before:Object.fromEntries(
    ['points','faces','owner','neighbour','boundary'].map(n=>[n,fakeHash('f')]))
});
const manifest={schema:'foamlens/local-checkmesh-region-capture/1',
  scientificValidity:'not-certified',allSourceReportsReady:true,
  regions:[mkRow('mold',fakeHash('b')),mkRow('metal',fakeHash('a'))]};
const manifestOk=me.manifest(manifest,[fakeHash('a'),fakeHash('b')],realEvidence);
assert.equal(manifestOk.status,'original-report-sha256-matches-local-manifest');
assert.deepEqual(manifestOk.rows.map(r=>r.region),['metal','mold'],
  'Per-report original sha matching must work independently from manifest order');
assert.equal(manifestOk.scientificValidity,'not-certified');
assert.equal(me.manifest(manifest,[fakeHash('b'),fakeHash('a')],realEvidence).status,
  'rejected','swapped report content may not inherit other regional source labels');
assert.equal(me.manifest(manifest,[fakeHash('a'),fakeHash('c')],realEvidence).status,'rejected');
assert.equal(me.manifest({...manifest,allSourceReportsReady:false},
  [fakeHash('a'),fakeHash('b')],realEvidence).status,'rejected');
assert.equal(me.manifest({...manifest,regions:[manifest.regions[0],manifest.regions[0]]},
  [fakeHash('a'),fakeHash('b')],realEvidence).status,'rejected');
assert.equal(me.manifest({...manifest,regions:[{...manifest.regions[0],
  meshFilesUnchanged:false},manifest.regions[1]]},
  [fakeHash('a'),fakeHash('b')],realEvidence).status,'rejected');
assert.equal(me.manifest({...manifest,regions:[{...manifest.regions[0],
  status:'checkMesh-nonzero-exit'},manifest.regions[1]]},
  [fakeHash('a'),fakeHash('b')],realEvidence).status,'rejected');
assert.equal(me.manifest({...manifest,regions:[{...manifest.regions[0],
  sourceMarkers:{region:'metal',matched:true,terminalMeshOk:true}},manifest.regions[1]]},
  [fakeHash('a'),fakeHash('b')],realEvidence).status,'rejected');
assert.equal(me.manifest(manifest,[fakeHash('a'),fakeHash('b')],
  me.audit([run('source-no-summary',metal.replace('Mesh OK.','')),
    run('other-source',mold)],['metal','mold'])).status,'rejected');
for(const needed of ['id="cmrManifest"','crypto.subtle.digest','cmrCompareImportedPolyMesh',
  'manifestFile!==cmrOwner.manifestFile',
  'originalCaseProvenanceSigned:false',
  'source-mesh-not-verified-raw-bytes-unavailable']){
  assert(code.includes(needed),'Missing actual opt-in SHA-256 UI binding: '+needed)
}
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
 "generalAnalysisModules","id=\"cmrCase\"","id=\"cmrFiles\"","id=\"cmrExport\"",
 "cmrReset('Original reports changed: re-audit before exporting.')",
 "caseBinding:'manual-attachment-not-cryptographically-verified'",
 'overallScientificValidity:\'not-certified\'']){
 assert(code.includes(token),'Missing source-backed UI contract '+token)
}
assert(!code.includes('fetch(')&&!code.includes('XMLHttpRequest'),'No network uploads');
assert(!code.includes('cases.push(')&&!code.includes('series.push('),'No simulation modification');
console.log('Granada #150 PASS: per-region source labels, missing/duplicate failures, contextual sanity, explicit error locators and privacy.');
