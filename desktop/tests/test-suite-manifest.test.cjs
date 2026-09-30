'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const repoRoot=path.join(__dirname,'..','..');
const testsDir=path.join(repoRoot,'desktop','tests');
const workflowPath=path.join(repoRoot,'.github','workflows','build-foamlens-desktop.yml');
const workflow=fs.readFileSync(workflowPath,'utf8');

const files=fs.readdirSync(testsDir)
  .filter(name=>name.endsWith('.test.cjs'))
  .map(name=>'desktop/tests/'+name)
  .sort();

const commands=[...workflow.matchAll(/node\s+(desktop\/tests\/[^\s"'\u0060]+\.test\.cjs)\b/g)]
  .map(m=>m[1].replace(/\\/g,'/'));

const counts=new Map();
for(const file of commands)counts.set(file,(counts.get(file)||0)+1);

for(const file of files){
  assert.strictEqual(counts.get(file)||0,1,
    file+' must run exactly once in build-foamlens-desktop.yml; found '+(counts.get(file)||0)+'.');
}
for(const file of counts.keys()){
  assert(files.includes(file),'Workflow references an unknown test file: '+file);
}
assert.strictEqual(commands.length,files.length,
  'Workflow test-command count must match the test-file count exactly.');

console.log('FoamLens CI test-suite manifest passed: '+files.length+' test files, each executed exactly once.');
