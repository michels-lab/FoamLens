'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const start=index.indexOf('function flIssueDescriptor(');
const end=index.indexOf('function flApplyBilingualText',start);
assert(start>=0&&end>start,'Global actionable-diagnostics helpers are missing.');
const core=index.slice(start,end);
const api=new Function(
  "let ES=false;function diagEs(){return ES}function flUi(en,es){return ES?es:en}function $(id){return null;}"+
  core+
  ";return {issue:flIssueDescriptor,message:flIssueMessage,setEs:v=>{ES=!!v}};"
)();

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('English diagnostics always explain problem, cause and next action',()=>{
  api.setEs(false);
  const x=api.issue('no-compatible-values',{field:'alphat',region:'metal',time:0,component:'value'});
  assert(x.text.includes('Problem:'));
  assert(x.text.includes('Cause:'));
  assert(x.text.includes('Try:'));
  assert(x.text.includes('field=alphat'));
  assert(x.text.includes('region=metal'));
  assert(x.text.includes('t=0 s'));
});

test('Spanish diagnostics always explain problema, causa y qué cambiar',()=>{
  api.setEs(true);
  const x=api.issue('no-compatible-values',{field:'alphat',region:'metal',time:0});
  assert(x.text.includes('Problema:'));
  assert(x.text.includes('Causa:'));
  assert(x.text.includes('Qué cambiar:'));
  assert(x.text.includes('campo=alphat'));
  assert(x.text.includes('región=metal'));
});

test('missing file points to reloading the complete case',()=>{
  api.setEs(false);
  const x=api.issue('missing-file',{sourcePath:'B13/0/metal/T'});
  assert(/source file/i.test(x.problem));
  assert(/reload the complete case folder/i.test(x.action));
  assert(x.text.includes('path=B13/0/metal/T'));
});

test('binary parsing points to the Desktop native reader',()=>{
  api.setEs(false);
  const x=api.issue('binary-format',{field:'T'});
  assert(/binary/i.test(x.problem));
  assert(/Desktop/i.test(x.action));
  assert(/native/i.test(x.action));
});

test('phase thresholds state the valid numeric ordering',()=>{
  api.setEs(false);
  const x=api.issue('invalid-phase-thresholds');
  assert(/threshold/i.test(x.problem));
  assert(x.action.includes('0 ≤'));
  assert(x.action.includes('≤ 1'));
});

test('unit/dimension mismatch gives a physical compatibility remedy',()=>{
  api.setEs(false);
  const x=api.issue('incompatible OpenFOAM dimensions: [0 0 0 1 0 0 0] vs [0 1 -1 0 0 0 0]');
  assert(/units\/dimensions/i.test(x.problem));
  assert(/matching OpenFOAM dimensions\/units/i.test(x.action));
});

test('time-domain mismatch refuses extrapolation and tells user what to change',()=>{
  api.setEs(false);
  const x=api.issue('no shared physical-time interval',{field:'T'});
  assert(/overlap/i.test(x.problem));
  assert(/will not extrapolate/i.test(x.cause));
  assert(/overlapping range/i.test(x.action));
});

test('Phase Momentum no longer renders raw generic reason strings',()=>{
  assert(!index.includes("if(!r.ok){$('pmStatsStatus').textContent=r.reason"));
  assert(!index.includes("if(!r.ok){$('pmRatioStatus').textContent=r.reason"));
  assert(!index.includes("if(!r.ok){$('pmScatterStatus').textContent=r.reason"));
  assert(index.includes("flSetIssue('pmStatsStatus'"));
  assert(index.includes("flSetIssue('pmRatioStatus'"));
  assert(index.includes("flSetIssue('pmScatterStatus'"));
  assert(index.includes("flSetIssue('pmEvolutionStatus'"));
  assert(index.includes("flSetIssue('pmVerifyStatus'"));
});

test('major analysis modules use global actionable diagnostics',()=>{
  const modules=[
    'v13-flow-analysis.js',
    'v13-solidification-analysis.js',
    'v13-thermal-analysis.js',
    'v13-physical-analysis.js',
    'v13-spatial-differences.js',
    'v14-energy-audit.js',
    'v14-momentum-mechanisms.js',
    'v14-experimental-validation.js',
    'v14-field-view.js',
    'v14-z-field-compare.js'
  ];
  for(const name of modules){
    const source=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend',name),'utf8');
    assert(source.includes('flSetIssue'),name+' is not wired to the global actionable-diagnostics system.');
  }
});

test('Field View unavailable state exposes the actual issue instead of only a generic legend',()=>{
  const source=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
  assert(source.includes("flIssueDescriptor(availability.reason"));
  assert(source.includes("issue.problem"));
  assert(source.includes("issue.action"));
});

console.log('FoamLens actionable diagnostics regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
