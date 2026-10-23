'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyIdentity,SOURCES}=require('./granada_g19_main_only_provenance.cjs');
const main='00533f68993fef7a7761026cf9c1ab13a21ab3cd';
test('original main SHA and all required product files are accepted',()=>{
 assert.equal(verifyIdentity(main,main,'',[]),true);
 assert.ok(SOURCES.some(x=>x.endsWith('/Program.cs')));
 assert.ok(SOURCES.some(x=>x.endsWith('/FoamLens.iss')));
});
test('unmerged 16-owner source composite is rejected when head does not match main',()=>{
 assert.throws(()=>verifyIdentity(main,'19348dc71d296c62b653f7769c41db06886b854f','',[]),/non-main/);
});
test('tracked source edits after checkout are rejected',()=>{
 assert.throws(()=>verifyIdentity(main,main,' M desktop/src/FoamLensDesktop/Program.cs',[]),/tracked product/);
});
test('missing original updater/Play provenance is rejected',()=>{
 assert.throws(()=>verifyIdentity(main,main,'',['desktop/src/FoamLensDesktop/UpdateAssetIntegrity.cs']),/missing original/);
});
test('SHA abbreviation, missing expected SHA and malicious source refs are rejected',()=>{
 for(const bad of ['00533f68','',null,'main','x'.repeat(40)]){
  assert.throws(()=>verifyIdentity(bad,main,'',[]),/expected full main/);
 }
});
test('changes in source HEAD during checkout are rejected',()=>{
 assert.throws(()=>verifyIdentity(main,'e'.repeat(40),'',[]),/non-main/);
});
