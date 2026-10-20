'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseHunks,hunkOverlap,analyze,NATIVE_PR,NATIVE_FILES}=require('./granada_science_native_host_gate.cjs');
let tested=0;
function test(name,fn){fn();tested++;console.log(' ✓ '+name)}
const U=Buffer.from;
const patch=(a,b)=>'diff --git a/Program.cs b/Program.cs\n@@ -'+a+',2 +'+b+',3 @@\n';
test('parses exact source-line ranges from authentic Git hunk notation',()=>{
 assert.deepEqual(parseHunks('@@ -12,4 +12,6 @@ abc\n@@ -31 +33 @@\n@@ -44,0 +45,2 @@'),[
  {base_start:12,base_end:15,base_length:4,new_start:12,new_length:6},
  {base_start:31,base_end:31,base_length:1,new_start:33,new_length:1},
  {base_start:44,base_end:44,base_length:0,new_start:45,new_length:2}
 ])
});
test('adjacent edits are separate while identical insertion anchors are unsafe',()=>{
 assert.equal(hunkOverlap({base_start:10,base_end:11},{base_start:12,base_end:13}),false);
 assert.equal(hunkOverlap({base_start:10,base_end:15},{base_start:14,base_end:17}),true);
 assert.equal(hunkOverlap({base_start:20,base_end:20},{base_start:20,base_end:20}),true)
});
test('three original native host owners are pinned, all 40-hex SHAs',()=>{
 assert.deepEqual(Object.keys(NATIVE_PR),['162','164','165']);
 assert(Object.values(NATIVE_PR).every(x=>/^[a-f0-9]{40}$/.test(x)));
 assert(NATIVE_FILES.some(x=>x.endsWith('/Program.cs')));
 assert(NATIVE_FILES.some(x=>x.endsWith('build-foamlens-desktop.yml')))
});
test('multiple owners with intersecting original lines are reported as conflicts without applying source',()=>{
 const base={};
 for(const file of NATIVE_FILES)base[file]=U('MAIN SOURCE');
 const variants={};
 for(const id of [162,164,165]){variants[id]={};for(const file of NATIVE_FILES){
  variants[id][file]={bytes:U('PR'+id),diff:patch(id===165?100:10,id===165?100:10)}
 }}
 const report=analyze(base,variants);
 assert.equal(report.hostIntegration,'BLOCKED_REQUIRES_CONFLICT_RESOLUTION_AND_WINDOWS_QA');
 assert.equal(report.originalHostLeftUnchanged,true);
 assert(report.collisions.some(x=>x.left_pr===162&&x.right_pr===164));
 assert(!report.collisions.some(x=>x.left_pr===162&&x.right_pr===165));
 assert.equal(report.realMultiregionVerified,false);
 assert.equal(report.installedWindowsVerified,false);
 assert.equal(report.CAD_stepIgesBrepSupported,false);
 assert.equal(report.ownerApproved,false);
 assert.equal(report.fieldF1NativeRegionSupportIntegrated,false)
});
test('missing native host evidence fails closed, no false certification',()=>{
 const base=Object.fromEntries(NATIVE_FILES.map(x=>[x,U('baseline')]));
 const variants={162:{},164:{},165:{}};
 assert.throws(()=>analyze(base,variants),/Missing original native variant/);
});
test('malformed source diff creates no fabricated overlap metric',()=>{
 assert.deepEqual(parseHunks('random text no Git hunks'),[]);
 const base=Object.fromEntries(NATIVE_FILES.map(x=>[x,U('main')]));
 const variants={162:{},164:{},165:{}};
 for(const id of [162,164,165])for(const file of NATIVE_FILES)variants[id][file]={bytes:U('main'),diff:''};
 const report=analyze(base,variants);
 assert.equal(report.collisions.length,0);
 assert.equal(report.hostIntegration,'BLOCKED_REQUIRES_CONFLICT_RESOLUTION_AND_WINDOWS_QA',
  'even non-overlapping original diffs do not prove a combined Windows host')
});
test('original main host cannot be mutated by pure overlap analysis',()=>{
 const base=Object.fromEntries(NATIVE_FILES.map(x=>[x,U('immutable original')]));
 const before=NATIVE_FILES.map(x=>base[x].toString());
 const variants={162:{},164:{},165:{}};
 for(const id of [162,164,165])for(const file of NATIVE_FILES)
  variants[id][file]={bytes:U('different '+id),diff:patch(id,id)};
 analyze(base,variants);
 assert.deepEqual(NATIVE_FILES.map(x=>base[x].toString()),before)
});
console.log('Granada Science native host: '+tested+' PR conflict gate regression groups PASS');
