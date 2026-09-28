'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');

const start=index.indexOf('function compareCaseDataSummary(c){');
const end=index.indexOf('function configComparableEntries',start);
assert(start>=0&&end>start,'Expanded case-comparison block not found.');
const block=index.slice(start,end);

const passed=[];function test(name,fn){fn();passed.push(name)}

test('comparison includes explicit descriptive tags',()=>{
  assert(block.includes("tags:[...(c.tags||[])]"));
  assert(block.includes("(d.tags||[]).join(', ')||'—'"));
});

test('comparison includes physical-time and timestep configuration',()=>{
  assert(block.includes('observedCaseTimeRange(c.id)'));
  assert(block.includes('deltaT:Number(cfg.deltaT)'));
  assert(block.includes("adjustTimeStep:String(cfg.adjustTimeStep||'')"));
  assert(block.includes("'Time range [s]'"));
  assert(block.includes("'deltaT [s]'"));
  assert(block.includes("'adjustTimeStep'"));
});

test('comparison includes numerical performance',()=>{
  for(const token of ['CourantMean','CourantMax','executionTime','clockTime','median R','p95 R','R>1','max Initial']){
    assert(block.includes(token),'Missing numerical comparison metric '+token);
  }
});

test('comparison includes data coverage by case',()=>{
  for(const token of ['Time series','Profiles','Logs','Fields','postProcessing','Regions']){
    assert(block.includes(token),'Missing data coverage column '+token);
  }
});

test('comparison stays neutral and does not infer a best/reference case',()=>{
  assert(index.includes('FoamLens does not rank or select a “best” case.'));
  const lower=block.toLowerCase();
  for(const banned of ['winner','bestcase','baselinecase','referencecase','scorecase'])assert(!lower.includes(banned), 'Ranking logic leaked into comparison: '+banned);
});

test('missing numeric values remain unavailable instead of zero-filled',()=>{
  assert(block.includes("Number.isFinite(d.deltaT)?diagFmt(d.deltaT):'—'"));
  assert(block.includes("Number.isFinite(d.range.min)?"));
  assert(!block.includes('||0</td>'));
});

console.log('Neutral general case-comparison regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
