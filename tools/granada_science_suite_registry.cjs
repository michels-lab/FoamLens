#!/usr/bin/env node
'use strict';
/* Audit composite suite registration without editing canonical main build workflow. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const SRC=/^desktop\/tests\/[a-zA-Z0-9_.-]+\.(?:test|spec)\.cjs$|^tools\/test_granada_visual_review\.cjs$/;
function check(manifest,compositeWorkflow,mainWorkflow,root='.'){
 const files=manifest.components.flatMap(c=>c.files.filter(f=>SRC.test(f)));
 const registered=[];
 for(const name of files){
  const count=compositeWorkflow.split(name).length-1;
  if(count!==1)throw Error('Composite CI must run exact owner test ONCE: '+name+' found '+count);
  if(!fs.existsSync(path.join(root,...name.split('/'))))throw Error('Original pinned owner test unavailable: '+name);
  registered.push(name)
 }
 const originalTests=fs.readdirSync(path.join(root,'desktop','tests')).filter(x=>x.endsWith('.test.cjs'));
 const newTests=new Set(registered.filter(x=>x.endsWith('.test.cjs')));
 const deferred=[];
 for(const file of originalTests){
  const relative='desktop/tests/'+file;
  const re=/node\s+(desktop\/tests\/[^\s"'`]+\.test\.cjs)/g;
  const occurrences=[...mainWorkflow.matchAll(re)].filter(x=>x[1]===relative).length;
  if(occurrences===1)continue;
  if(occurrences===0&&newTests.has(relative)){deferred.push(relative);continue}
  throw Error('Uncovered or duplicated canonical suite '+relative+' count '+occurrences)
 }
 return{
  schema:'FoamLens Granada composite scientific suite registration v1',
  ownerTestFiles:registered.length,uniqueTests:new Set(registered).size,
  canonicalTests:originalTests.length,
  newScientificTestsPendingMainMerge:deferred,
  scope:'Preview CI runs owner source suites; original host build workflow NOT rewritten',
  standardBuildRegistered:deferred.length===0,
  mergedIntoMain:false,nativeHostIntegrated:false
 }
}
if(require.main===module){
 try{
  const manifest=JSON.parse(fs.readFileSync('tools/granada_composite_manifest.json','utf8'));
  const y=fs.readFileSync('.github/workflows/granada-177-science-cad-integration.yml','utf8');
  const main=fs.readFileSync('.github/workflows/build-foamlens-desktop.yml','utf8');
  const out=check(manifest,y,main);
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/granada-science-suite-registration.json',JSON.stringify(out,null,2)+'\n');
  console.log('Granada science owner suite registration: '+out.ownerTestFiles+
   ' unique original tests run in candidate; '+out.newScientificTestsPendingMainMerge.length+
   ' main-workflow registrations deferred (NOT silently merged).')
 }catch(e){console.error('GRANADA SCIENCE TEST REGISTRATION BLOCKED: '+e.message);process.exitCode=2}
}
module.exports={check};
