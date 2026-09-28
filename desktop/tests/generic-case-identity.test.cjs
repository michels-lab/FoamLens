'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const js=fs.readFileSync(path.join(base,'v13-generic-case-identity.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');

const begin='/* FOAMLENS_GENERIC_CASE_IDENTITY_CORE_START */',end='/* FOAMLENS_GENERIC_CASE_IDENTITY_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Generic case identity core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {gcStableIndex,gcCaseFilterValue,gcCaseFilterMatch};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('case filters use explicit case IDs only',()=>{
  assert.strictEqual(api.gcCaseFilterValue(42),'case:42');
  assert(api.gcCaseFilterMatch({caseId:42},'case:42'));
  assert(!api.gcCaseFilterMatch({caseId:7},'case:42'));
});

test('arbitrary case names have no semantic parser in v1.3',()=>{
  assert(js.includes('caseFamilyInfo=function(){return null}'));
  assert(js.includes('profileFamilies=function(){return new Map()}'));
  assert(js.includes('seriesFamilyVisible=function(){return true}'));
});

test('renaming cannot trigger automatic variant style in v1.3',()=>{
  assert(js.includes('caseFamilyInfo=function(){return null}'));
  assert(index.includes('if(info)c.dash=variantDash(info.variant)'));
  // The legacy call remains harmless because the v1.3 override always returns null.
});

test('time-series selector contains only explicit cases',()=>{
  assert(js.includes("gcCaseFilterValue(c.id)"));
  assert(!js.includes("value="family:"));
  assert(js.includes("label.textContent=diagEs()?'Casos':'Cases'"));
});

test('quick inferred family UI is disabled',()=>{
  assert(js.includes("wrap.classList.add('hidden')"));
  assert(js.includes("shortcuts.innerHTML=''"));
  assert(js.includes("familyQuickCount')).textContent='0'"));
});

test('profile color is based on physical variable, not case-name tokens',()=>{
  assert(js.includes('automaticSeriesColor=function(s){return variableColor'));
});

test('core has no development-fixture case convention',()=>{
  for(const banned of ['QuickCup','B3_reference','B4_energy2','C5_outer3','adaptiveDt'])assert(!core.includes(banned),'Fixture convention leaked into generic case core: '+banned);
});

console.log('Generic case-identity regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
