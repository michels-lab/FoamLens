'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-physical-analysis.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_PHYSICAL_ANALYSIS_CORE_START */',end='/* FOAMLENS_PHYSICAL_ANALYSIS_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Physical analysis core markers are missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {paFiniteXY,paDerivative,paTrapezoidIntegral,paWeightedSum,paRanks,paPearson,paSpearman,paCorrelation,paDimensionsShiftTime,paDerivativeUnit,paIntegralUnit,paCompatibleKnownUnits};')();

const near=(x,y,t=1e-10)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('physical-time derivative handles nonuniform time',()=>{
  const t=[0,.2,.7,1.8,3.0],y=t.map(x=>3*x+2);
  const d=api.paDerivative(t,y,1);
  assert(d.y.every(v=>near(v,3)));
});

test('negative derivative supports cooling-rate convention',()=>{
  const t=[0,.5,1.5,3],y=t.map(x=>100-4*x);
  const d=api.paDerivative(t,y,-1);
  assert(d.y.every(v=>near(v,4)));
});

test('trapezoidal cumulative integral uses physical time',()=>{
  const q=api.paTrapezoidIntegral([0,.5,2],[10,10,10],0);
  assert(near(q.y[0],0)&&near(q.y[1],5)&&near(q.y[2],20));
});

test('weighted balance uses explicit user coefficients',()=>{
  const y=api.paWeightedSum([[10,20,30],[1,2,3],[4,5,6]],[1,-2,.5]);
  assert.deepStrictEqual(y,[10,18.5,27]);
});

test('Pearson correlation',()=>{
  assert(near(api.paPearson([1,2,3,4],[2,4,6,8]),1));
});

test('Spearman correlation with monotonic relation',()=>{
  assert(near(api.paSpearman([10,20,30,40],[1,5,9,20]),1));
});

test('rank ties receive average rank',()=>{
  const r=api.paRanks([5,5,10]);
  assert(near(r[0],1.5)&&near(r[1],1.5)&&near(r[2],3));
});

test('correlation reports finite sample count only',()=>{
  const c=api.paCorrelation([1,2,NaN,4],[2,4,6,8]);
  assert.strictEqual(c.count,3);assert(near(c.pearson,1));
});

test('derived dimensions shift physical time exponent',()=>{
  assert.strictEqual(api.paDimensionsShiftTime('[0 0 0 1 0 0 0]',-1),'[0 0 -1 1 0 0 0]');
  assert.strictEqual(api.paDimensionsShiftTime('[1 2 -3 0 0 0 0]',1),'[1 2 -2 0 0 0 0]');
});

test('derived units are explicit',()=>{
  assert.strictEqual(api.paDerivativeUnit('K'),'K/s');
  assert.strictEqual(api.paDerivativeUnit('1'),'1/s');
  assert.strictEqual(api.paIntegralUnit('W'),'W·s');
});

test('energy balance rejects incompatible known units',()=>{
  const q=api.paCompatibleKnownUnits([{field:{unit:'W'}},{field:{unit:'W'}},{field:{unit:'J'}}]);
  assert.strictEqual(q.compatible,false);
  assert.deepStrictEqual(q.known.sort(),['J','W']);
});

test('UI exposes explicit thermal and solidification transforms',()=>{
  for(const token of ['Cooling Rate (−dT/dt)','Solidification Rate (−dαL/dt)','Solidification Rate (dαS/dt)','Energy / power balance','Scatter / correlation','Pearson','Spearman'])assert(js.includes(token),'Missing '+token);
});

test('UI warns against unsupported physical inference',()=>{
  for(const token of ['does not infer nucleation, recalescence, dominance, or causality','will not label a quantity “total energy”'])assert(js.includes(token),'Missing caution '+token);
});

test('energy balance uses common physical-time alignment and no extrapolation metadata',()=>{
  assert(js.includes("taAlignSeries(all.map(x=>x.s),{mode:'common',method:'linear'"));
  assert(js.includes('noExtrapolation:true'));
  assert(js.includes('Cannot build a physical balance from incompatible known units'));
  assert(js.includes('outputDimensions:paDimensionsShiftTime'));
});

test('physical core is fixture agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into physical core: '+banned);
});

console.log('General physical-analysis regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
