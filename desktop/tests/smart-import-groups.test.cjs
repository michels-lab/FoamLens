'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-smart-import-groups.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_SMART_IMPORT_GROUPS_CORE_START */';
const end='/* FOAMLENS_SMART_IMPORT_GROUPS_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Smart Import groups core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {sivVersionInfo,sivVersionSort,sivGroupCandidates,sivSelectionState};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('case version detection is generic and family-neutral',()=>{
  assert.deepEqual(api.sivVersionInfo('A12_reference'),{version:'12',family:'A',token:'A12',detected:true});
  assert.deepEqual(api.sivVersionInfo('C12_variant'),{version:'12',family:'C',token:'C12',detected:true});
  assert.deepEqual(api.sivVersionInfo('Run-7_test'),{version:'7',family:'Run',token:'Run-7',detected:true});
  assert.deepEqual(api.sivVersionInfo('v3.2_case'),{version:'3.2',family:'',token:'v3.2',detected:true});
  assert.equal(api.sivVersionInfo('reference_case').detected,false);
});

test('cases with different families group under the same detected version',()=>{
  const q=api.sivGroupCandidates([{name:'A12_one'},{name:'C12_two'},{name:'A3_old'},{name:'reference'}]);
  assert.deepEqual(q.groups.map(g=>g.version),['3','12']);
  const v12=q.groups.find(g=>g.version==='12');
  assert.equal(v12.items.length,2);
  assert.deepEqual(v12.families,['A','C']);
  assert.equal(q.other.length,1);
});

test('numeric dotted versions sort numerically rather than lexically',()=>{
  const versions=['10','2','2.10','2.2','1'];
  assert.deepEqual(versions.sort(api.sivVersionSort),['1','2','2.2','2.10','10']);
});

test('bulk selection state supports checked, clear and indeterminate',()=>{
  assert.deepEqual(api.sivSelectionState(4,4),{checked:true,indeterminate:false,selected:4,total:4});
  assert.deepEqual(api.sivSelectionState(4,0),{checked:false,indeterminate:false,selected:0,total:4});
  assert.deepEqual(api.sivSelectionState(4,2),{checked:false,indeterminate:true,selected:2,total:4});
});

test('Smart Import wiring preserves individual checkboxes and adds version bulk controls',()=>{
  for(const token of [
    'smartImportVersionGroups',
    '.smartCaseCheck:not(:disabled)',
    'data-siv-toggle',
    'sivSetVersion',
    'sivSetAll',
    'indeterminate',
    'Select all',
    'Seleccionar todo',
    'Clear all',
    'Quitar todo',
    'Version ',
    'Versión '
  ])assert(source.includes(token),'Missing Smart Import version-group wiring token: '+token);
});

console.log('FoamLens Smart Import version-group regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
