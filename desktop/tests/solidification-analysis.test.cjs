'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-solidification-analysis.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_SOLIDIFICATION_ANALYSIS_CORE_START */',end='/* FOAMLENS_SOLIDIFICATION_ANALYSIS_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Solidification analysis core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {saPairs,saDerivative,saTrapezoid,saContiguousIntervals,saAnalyzePhaseSignal};')();

const near=(x,y,t=1e-10)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('liquid fraction decrease is solidification',()=>{
  const a=api.saAnalyzePhaseSignal([0,1,3],[1,.8,.4],'liquidFraction',1e-12);
  assert(a.solidificationRate.every(v=>v>=0));
  assert(a.remeltingRate.every(v=>near(v,0)));
  assert(a.solidificationAmount>0);
  assert(near(a.remeltingAmount,0));
});

test('liquid fraction increase is remelting',()=>{
  const a=api.saAnalyzePhaseSignal([0,1,4],[.2,.3,.8],'liquidFraction',1e-12);
  assert(a.remeltingRate.some(v=>v>0));
  assert(a.remeltingAmount>0);
});

test('solid fraction increase is solidification',()=>{
  const a=api.saAnalyzePhaseSignal([0,2,5],[.1,.5,.9],'solidFraction',1e-12);
  assert(a.solidificationRate.some(v=>v>0));
  assert(near(a.remeltingAmount,0));
});

test('solid fraction decrease is remelting',()=>{
  const a=api.saAnalyzePhaseSignal([0,2,5],[.9,.5,.1],'solidFraction',1e-12);
  assert(a.remeltingRate.some(v=>v>0));
  assert(near(a.solidificationAmount,0));
});

test('adaptive physical time is used in derivative',()=>{
  const d=api.saDerivative([0,.25,1.25],[1,.5,-1.5]);
  assert(near(d.y[0],-2));
  assert(near(d.y[1],-2));
  assert(near(d.y[2],-2));
});

test('contiguous solidification/remelting intervals are reported',()=>{
  const x=[0,1,2,3,4],m=[false,true,true,false,true];
  assert.deepStrictEqual(api.saContiguousIntervals(x,m),[{start:1,end:2},{start:4,end:4}]);
});

test('raw out-of-range phase values are flagged, not clipped',()=>{
  const a=api.saAnalyzePhaseSignal([0,1,2],[1.02,.5,-.03],'liquidFraction');
  assert.strictEqual(a.outOfRangeCount,2);
  assert.strictEqual(a.max,1.02);
  assert.strictEqual(a.min,-.03);
});

test('UI requires explicit liquid or solid fraction interpretation',()=>{
  assert(js.includes('<option value="liquidFraction" selected>Liquid fraction αL</option>'));
  assert(js.includes('<option value="solidFraction">Solid fraction αS</option>'));
});

test('module forbids nucleation/recalescence inference',()=>{
  assert(js.includes('It does not infer nucleation or recalescence from curve shape.'));
  assert(js.includes('noNucleationInference:true'));
  assert(js.includes('noRecalescenceInference:true'));
});

test('derived solidification and remelting rates carry explicit formulas',()=>{
  assert(js.includes("max(−dαL/dt,0)"));
  assert(js.includes("max(dαL/dt,0)"));
  assert(js.includes("max(dαS/dt,0)"));
  assert(js.includes("max(−dαS/dt,0)"));
});

test('active case and region context is respected',()=>{
  assert(js.includes('seriesMatchesGlobalContext'));
});

test('fixture names never enter the product module',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!js.includes(banned),'Fixture leaked into Solidification Analysis: '+banned);
});

console.log('Solidification Analysis regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
