'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const passed=[];function test(name,fn){fn();passed.push(name)}

test('case names are labels only',()=>{
  assert(index.includes('function caseFamilyInfo(name){'));
  const start=index.indexOf('function caseFamilyInfo(name){');
  const end=index.indexOf('function familyColor',start);
  const body=index.slice(start,end);
  assert(body.includes('return null'));
  assert(!/match\\s*\\(/.test(body));
});

test('case rename does not change dash from name tokens',()=>{
  const start=index.indexOf('function renameCase(caseId,newName){');
  const end=index.indexOf('function setCaseDash',start);
  const body=index.slice(start,end);
  assert(start>=0&&end>start);
  assert(!body.includes('variantDash'));
  assert(!body.includes('caseFamilyInfo'));
  assert(body.includes('s.caseName=c.name'));
});

test('profile colors are based on physical variable',()=>{
  const start=index.indexOf('function automaticSeriesColor(s){');
  const end=index.indexOf('function caseSampleColor',start);
  const body=index.slice(start,end);
  assert(body.includes('variableColor'));
  assert(!body.includes('caseFamilyInfo'));
});

test('family visibility is disabled',()=>{
  assert(index.includes('function seriesFamilyVisible(s){return true}'));
  assert(index.includes('function profileFamilies(){return new Map()}'));
  const start=index.indexOf('function renderQuickFamilyVisibility(){');
  const end=index.indexOf('function renderQuickCaseVisibility',start);
  const body=index.slice(start,end);
  assert(body.includes("wrap.classList.add('hidden')"));
  assert(body.includes("shortcuts.innerHTML=''"));
});

test('time-series filters use explicit case IDs',()=>{
  const start=index.indexOf('function timeSeriesMatchesSelection(s){');
  const end=index.indexOf('function refreshTimeSeriesControls',start);
  const body=index.slice(start,end);
  assert(body.includes("caseFilter.startsWith('case:')"));
  assert(!body.includes('family:'));
  assert(index.includes('<label for="timeSeriesFamily">Cases</label>'));
  assert(index.includes('<option value="case:'+'${'+'c.id'+'}'+'">'));
});

test('legacy semantic fixture examples are absent from product index',()=>{
  for(const banned of ['B3_reference','B4_energy2','C5_outer3','real QuickCup foamLog']){
    assert(!index.includes(banned),'Fixture-specific product text remains: '+banned);
  }
});

test('foamLog numeric parser remains suffix tolerant without fixture coupling',()=>{
  const start=index.indexOf('function foamLogNumber(token){');
  const end=index.indexOf('function foamLogDescriptor',start);
  const body=index.slice(start,end);
  assert(body.includes('numeric prefix'));
  assert(body.includes("s.match(/^[-+]?"));
  assert(!body.includes('QuickCup'));
});

console.log('Generic case-identity regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
