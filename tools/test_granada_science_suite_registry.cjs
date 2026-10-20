'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {check}=require('./granada_science_suite_registry.cjs');
let groups=0;function test(name,fn){fn();groups++;console.log(' ✓ '+name)}
function sandbox(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-science-suite-'));
 try{
  fs.mkdirSync(path.join(root,'desktop','tests'),{recursive:true});
  fs.writeFileSync(path.join(root,'desktop','tests','base.test.cjs'),'');
  fs.writeFileSync(path.join(root,'desktop','tests','science.test.cjs'),'');
  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.writeFileSync(path.join(root,'tools','test_granada_visual_review.cjs'),'');
  return fn(root)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
const manifest={components:[{files:['desktop/tests/science.test.cjs','tools/test_granada_visual_review.cjs']}]};
const workflow='run: |\n node desktop/tests/science.test.cjs\n node tools/test_granada_visual_review.cjs';
const main='run: node desktop/tests/base.test.cjs';
test('candidate owner tests uniquely counted while new main registrations stay DEFERRED',()=>sandbox(root=>{
 const result=check(manifest,workflow,main,root);
 assert.equal(result.ownerTestFiles,2);
 assert.equal(result.uniqueTests,2);
 assert.deepEqual(result.newScientificTestsPendingMainMerge,['desktop/tests/science.test.cjs']);
 assert.equal(result.standardBuildRegistered,false);
 assert.equal(result.nativeHostIntegrated,false)
}));
test('does not silently forgive owner tests absent from candidate CI',()=>sandbox(root=>{
 assert.throws(()=>check(manifest,'run: echo nothing',main,root),/must run exact owner test/)
}));
test('does not forgive double execution in candidate CI',()=>sandbox(root=>{
 assert.throws(()=>check(manifest,workflow+'\n node desktop/tests/science.test.cjs',main,root),/found 2/)
}));
test('canonical original .test.cjs files must remain uniquely registered in original main CI',()=>sandbox(root=>{
 assert.throws(()=>check(manifest,workflow,'',root),/Uncovered or duplicated canonical suite/)
}));
test('owner test missing on disk fails rather than falsely certifying QA',()=>sandbox(root=>{
 fs.unlinkSync(path.join(root,'desktop/tests/science.test.cjs'));
 assert.throws(()=>check(manifest,workflow,main,root),/original pinned owner test unavailable/i)
}));
test('canonical main workflow intact and all new suites accounted for allows preview completion',()=>sandbox(root=>{
 const x=check(manifest,workflow,main+'\n node desktop/tests/science.test.cjs',root);
 assert.equal(x.standardBuildRegistered,true);assert.equal(x.newScientificTestsPendingMainMerge.length,0);
 assert.equal(x.mergedIntoMain,false)
}));
console.log('FoamLens Granada Science suite registration: '+groups+' regression groups PASS');
