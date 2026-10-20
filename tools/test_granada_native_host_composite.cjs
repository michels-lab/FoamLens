'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {BASE,PRS,HOST,FIELD,FTEST,extract,composeHost,hash}=require('./granada_native_host_composite.cjs');
let n=0;function test(label,fn){fn();n++;console.log(' ✓ '+label)}
const originalMesh='            // The Mesh & Geometry Auditor is a public scientific report\n'+
 '            var meshAuditSurfaceJson = await _web.CoreWebView2.ExecuteScriptAsync("Mesh report inspector is not mounted");\n'+
 '            Log("FoamLens checkMesh scientific report inspector WebView2 smoke passed: " + meshAuditSurfaceJson);\n\n';
const bridge='            var hasBridge = await _web.CoreWebView2.ExecuteScriptAsync(';
const fieldAnchor='                if (expectedPhysicalRegions.Length > 1)\n                {\n                    var evidence = Environment.GetEnvironmentVariable(';
const main='// host main\n'+originalMesh+bridge+' "bridge");\n'+fieldAnchor+' "FOAMLENS_BRAND_EVIDENCE_DIR");\n                }\n';
function source(from,body){
 return from+'\n'+body.repeat(16)+'\n            var hasBridge = await _web.CoreWebView2.ExecuteScriptAsync('
}
const cad=source('            // Confirm the CAD surface inspector is usable inside the real packaged WebView2.',
 '            Log("FoamLens CAD STL/OBJ WebView2 smoke passed");\n');
const eq=source('            // Granada #154: the actual packaged WebView2 must expose scientific',
 '            Log("FoamLens Granada equivalent-observables native WebView2 smoke failed");\n');
const fieldStart='                    // Regression for the owner-reported View B defect:';
const fieldEnd='                    Log("FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed: " + viewBSmoke);';
const field=fieldStart+'\n'+'                    // ORIGINAL measured field / canvas check\n'.repeat(20)+fieldEnd;
test('pinned owner SHAs for Field F1, CAD and scientifically equivalent 2D/3D',()=>{
 assert.deepEqual(Object.keys(PRS),['162','164','165']);
 for(const sha of Object.values(PRS))assert.match(sha,/^[a-f0-9]{40}$/);
 assert.match(BASE,/^[a-f0-9]{40}$/);
 assert.deepEqual(FIELD.length,2);assert.equal(FTEST.length,1);
 assert(HOST.endsWith('/Program.cs'));
});
test('exact owner blocks are grafted while original checkMesh WebView2 smoke stays in place',()=>{
 const out=composeHost(main,field,cad,eq);
 assert(out.content.includes('Mesh report inspector is not mounted'));
 assert(out.content.includes('meshAuditSurfaceJson'));
 assert(out.content.indexOf('CAD STL/OBJ')<out.content.indexOf('var hasBridge'));
 assert(out.content.indexOf('equivalent-observables')<out.content.indexOf('var hasBridge'));
 assert(out.content.indexOf('Regression for the owner-reported View B')<out.content.indexOf('var evidence'));
 assert.deepEqual(Object.keys(out.smokes),['cad','equivalent','field']);
 assert(out.smokes.field.bytes>400);
});
test('cannot silently remove original Mesh Auditor smoke regression',()=>{
 assert.throws(()=>composeHost(main.replace('meshAuditSurfaceJson','removed'),field,cad,eq),/Preserve original native Mesh Auditor/);
});
test('Field F1 real-case guard must be unique, never injected into every smoke path',()=>{
 assert.throws(()=>composeHost(main.replace(fieldAnchor,''),field,cad,eq),/multiregion evidence guard changed/);
 assert.throws(()=>composeHost(main+fieldAnchor,field,cad,eq),/multiregion evidence guard changed/);
});
test('never accept stale owner CAD or 2D/3D anchors',()=>{
 assert.throws(()=>composeHost(main,field,cad.replace('Confirm the CAD surface inspector','Something else'),eq),/CAD native smoke/);
 assert.throws(()=>composeHost(main,field,cad,eq.replace('Granada #154','Other source')),/2D\/3D native smoke/);
});
test('owner Field F1 block requires exact original terminal logging',()=>{
 assert.throws(()=>composeHost(main,field.replace(fieldEnd,'BROKEN'),cad,eq),/Field F1 exact source block/);
});
test('duplicate source blocks or host bridge anchor are rejected instead of guessed',()=>{
 assert.throws(()=>composeHost(main,field,cad+'\n'+cad,eq),/CAD native smoke owner block not unique/);
 assert.throws(()=>composeHost(main+'\n'+bridge,field,cad,eq),/host anchor changed/);
});
test('scientific owner source data remains untouched by grafting and provenance matches bytes',()=>{
 const before=[main,cad,field,eq];
 const x=composeHost(main,field,cad,eq);
 assert.deepEqual([main,cad,field,eq],before);
 assert.equal(x.smokes.field.sha256,hash(Buffer.from(field)));
 assert.equal(x.smokes.cad.sha256,hash(Buffer.from(cad.slice(0,cad.indexOf('\n            var hasBridge')).trimEnd())));
});
console.log('Granada native host reconciliation: '+n+' protective source-merge regression groups PASS');
