'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');

const start=index.indexOf('function normalizeCaseTags(value){');
const end=index.indexOf('function renderCaseManager()',start);
assert(start>=0&&end>start,'Case tag functions were not found.');
const src=index.slice(start,end);
const api=new Function('caseById','renderCaseManager','renderDataCatalog','updateMeta',src+'\nreturn {normalizeCaseTags};')(
  ()=>null,()=>{},()=>{},()=>{}
);

const passed=[];function test(name,fn){fn();passed.push(name)}

test('case tags normalize separators and deduplicate case-insensitively',()=>{
  assert.deepStrictEqual(api.normalizeCaseTags('reference, adaptive; Experiment\nREFERENCE'),['reference','adaptive','Experiment']);
});

test('case tags are persisted in workspace',()=>{
  assert(index.includes("tags:[...(c.tags||[])]"));
  assert(index.includes("c.tags=normalizeCaseTags(x.tags||[])"));
});

test('case tags are visible and searchable in Data Catalog',()=>{
  assert(index.includes("caseTags:[...(caseById(r.caseId)?.tags||[])]"));
  assert(index.includes("(r.caseTags||[]).join(' ')"));
  assert(index.includes("Tags: '+esc(r.caseTags.join(', '))"));
});

test('Case Manager explains tags are descriptive only',()=>{
  assert(index.includes('Descriptive metadata only; FoamLens does not infer behavior from these tags.'));
  assert(index.includes('Metadata descriptiva solamente; FoamLens no infiere significado de estos tags.'));
});

test('case tags do not drive style or scientific identity',()=>{
  const styleStart=index.indexOf('function automaticSeriesColor(s){');
  const styleEnd=index.indexOf('function caseById',styleStart);
  const style=index.slice(styleStart,styleEnd);
  assert(!style.includes('.tags'));
  const familyStart=index.indexOf('function caseFamilyInfo(name){');
  const familyEnd=index.indexOf('function familyColor',familyStart);
  assert(!index.slice(familyStart,familyEnd).includes('.tags'));
  const renameStart=index.indexOf('function renameCase(caseId,newName){');
  const renameEnd=index.indexOf('function setCaseDash',renameStart);
  assert(!index.slice(renameStart,renameEnd).includes('.tags'));
});

test('common semantic-looking tags have no hardcoded handling',()=>{
  for(const token of ['reference','adaptive','experiment']){
    const rx=new RegExp("tags[^\\n]{0,120}"+token,'i');
    assert(!rx.test(index),'Tag meaning was hardcoded: '+token);
  }
});

console.log('Explicit descriptive case-tag regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
