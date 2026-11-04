'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-experimental-validation.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_EXPERIMENTAL_VALIDATION_CORE_START */';
const end='/* FOAMLENS_EXPERIMENTAL_VALIDATION_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Experimental validation core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {evNorm,evSplitDelimitedLine,evDetectDelimiter,evParseNumber,evParseTable,evAutoColumns,evExtractColumns,evTemperatureToKelvin,evInterpolate,evCompareCurves,evDerivative,evCurveMinimum,evThermalRebound,evCrossingTime,evPhaseMetrics,evPhaseEvidenceAtRebound,evNormalizeLiquidFraction};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-9){assert(Math.abs(a-b)<=e,`${a} != ${b}`)}

test('CSV parser recognizes header and time/temperature columns',()=>{
  const table=api.evParseTable('Time,Temperature\n0,20\n1,21.5\n2,22\n');
  assert.equal(table.delimiter,',');assert.equal(table.hasHeader,true);
  assert.deepEqual(table.headers,['Time','Temperature']);
  assert.deepEqual(api.evAutoColumns(table),{time:0,temperature:1});
  const d=api.evExtractColumns(table,0,1);assert.deepEqual(d.t,[0,1,2]);assert.deepEqual(d.y,[20,21.5,22]);
});

test('semicolon CSV supports decimal comma values',()=>{
  const table=api.evParseTable('tiempo;temperatura\n0;1200,5\n0,5;1198,0\n1;1197,25\n');
  assert.equal(table.delimiter,';');assert.deepEqual(api.evAutoColumns(table),{time:0,temperature:1});
  const d=api.evExtractColumns(table,0,1);near(d.t[1],.5);near(d.y[0],1200.5);near(d.y[2],1197.25);
});

test('TSV and headerless whitespace data are accepted',()=>{
  const tsv=api.evParseTable('time\ttemp\n0\t100\n1\t90');assert.equal(tsv.delimiter,'\t');
  const plain=api.evParseTable('0 100\n1 90\n2 80');assert.equal(plain.delimiter,'whitespace');assert.equal(plain.hasHeader,false);assert.deepEqual(plain.headers,['Column 1','Column 2']);
});

test('Celsius converts to Kelvin and Kelvin remains unchanged',()=>{
  assert.deepEqual(api.evTemperatureToKelvin([0,100],'C'),[273.15,373.15]);
  assert.deepEqual(api.evTemperatureToKelvin([273.15,300],'K'),[273.15,300]);
});

test('simulation-experiment metrics use shared physical time with no extrapolation',()=>{
  const r=api.evCompareCurves([0,1,2,3],[100,90,80,70],[-1,0,1,2,3,4],[999,98,89,82,69,999],0);
  assert.equal(r.valid,true);assert.equal(r.n,4);assert.deepEqual(r.t,[0,1,2,3]);
  near(r.mae,1.5);near(r.rmse,Math.sqrt((4+1+4+1)/4));near(r.bias,.5);near(r.maxAbs,2);
  assert.equal(r.noExtrapolation,true);
});

test('explicit experimental time shift is respected',()=>{
  const r=api.evCompareCurves([0,1,2],[10,20,30],[-1,0,1],[10,20,30],1);
  assert.equal(r.valid,true);assert.deepEqual(r.t,[0,1,2]);near(r.rmse,0);
});

test('thermal rebound detector reports a candidate without naming its mechanism',()=>{
  const t=[0,1,2,3,4,5,6],y=[100,90,80,70,74,78,76];
  const r=api.evThermalRebound(t,y,{slopeThreshold:.1,minDuration:1,minAmplitude:2});
  assert(r);near(r.Tmin,70);near(r.tMin,3);near(r.Tpeak,78);near(r.tPeak,5);near(r.amplitude,8);assert(r.maxSlope>0);
});

test('phase thresholds return physical crossing times and duration',()=>{
  const r=api.evPhaseMetrics([0,1,2,3,4],[1,.8,.5,.2,0],{onsetThreshold:.9,completionThreshold:.1});
  near(r.onset,.5);near(r.completion,3.5);near(r.duration,3);
});

test('phase evidence distinguishes solidifying and remelting during rebound interval',()=>{
  const rebound={tMin:1,tPeak:3};
  const a=api.evPhaseEvidenceAtRebound([0,1,2,3,4],[1,.9,.7,.5,.4],rebound);assert.equal(a.state,'solidifying');near(a.delta,-.4);
  const b=api.evPhaseEvidenceAtRebound([0,1,2,3,4],[.4,.5,.65,.8,.9],rebound);assert.equal(b.state,'remelting');near(b.delta,.3);
});

test('phase role is never inferred from alpha1, and conversion is explicit',()=>{
  const unknown=api.evNormalizeLiquidFraction([0,.2,.5,1],'');
  assert.equal(unknown.ok,false);assert.equal(unknown.reason,'unconfirmed-role');
  const liquid=api.evNormalizeLiquidFraction([1,.8,.5,0],'liquid');
  assert.equal(liquid.ok,true);assert.deepEqual(liquid.alphaL,[1,.8,.5,0]);
  const solid=api.evNormalizeLiquidFraction([0,.2,.5,1],'solid');
  assert.equal(solid.ok,true);assert.deepEqual(solid.alphaL,[1,.8,.5,0]);
  assert.equal(solid.conversion,'alphaL=1-alphaS');
  for(const bad of [[0,.5,1.1],[0,-.1,1],[0,'',1],[0,NaN,1],['NaN',.5,1]]){
    assert.equal(api.evNormalizeLiquidFraction(bad,'solid').ok,false);
  }
});

test('opposite physical fractions give identical phase evidence after verified conversion',()=>{
  const t=[0,1,2,3,4,5],solid=api.evNormalizeLiquidFraction([0,.1,.4,.7,.9,1],'solid');
  const liquid=api.evNormalizeLiquidFraction([1,.9,.6,.3,.1,0],'liquid');
  const rebound={tMin:1,tPeak:4};
  solid.alphaL.forEach((value,i)=>near(value,liquid.alphaL[i]));
  const x=api.evPhaseEvidenceAtRebound(t,solid.alphaL,rebound);
  const y=api.evPhaseEvidenceAtRebound(t,liquid.alphaL,rebound);
  assert.equal(x.state,'solidifying');assert.equal(y.state,'solidifying');
  near(x.delta,-.8);near(y.delta,-.8);
  const a=api.evPhaseMetrics(t,solid.alphaL,{onsetThreshold:.95,completionThreshold:.05});
  const b=api.evPhaseMetrics(t,liquid.alphaL,{onsetThreshold:.95,completionThreshold:.05});
  near(a.onset,b.onset);near(a.completion,b.completion);near(a.duration,b.duration);
});

test('phase classification is blocked in actual run path until source role and dimensions are valid',()=>{
  const start=source.indexOf('function evRunValidation(){'),end=source.indexOf('function evReboundStateLabel(',start);
  assert(start>=0&&end>start,'Original run-validation function must be present');
  const runSource=source.slice(start,end);
  const selectors={evPhaseRole:'',evAlphaOnset:'0.99',evAlphaComplete:'0.01',evTimeShift:'0',
    evSlopeThreshold:'0.05',evMinDuration:'0.05',evMinAmplitude:'0.1'};
  const document={getElementById(id){return {value:selectors[id]??'0',textContent:''}}};
  const simulation={caseId:7,t:[0,1,2,3,4,5],y:[100,90,80,85,90,88],field:{canonical:'T',unit:'K'}};
  const exp={t:[0,1,2,3,4,5],yK:[99,89,79,84,89,87]};
  const phase={caseId:7,t:[0,1,2,3,4,5],y:[0,.1,.4,.7,.9,1],field:{canonical:'alpha1',dimensions:'[0 0 0 0 0 0 0]'}};
  const state={last:null},win={},issues=[];
  const run=new Function('document','window','evSelectedSimulation','evExperimentalData','flClearIssue','flSetIssue',
    'evSimUnit','evSelectedPhase','evRender','evState','evUi',
    core+'\n'+runSource+'\nreturn evRunValidation;')(
    document,win,()=>simulation,()=>exp,()=>{},(...args)=>issues.push(args),
    ()=>'K',()=>phase,()=>{},state,(en)=>en);
  const unchecked=run();
  assert(unchecked.comparison.valid);assert.equal(unchecked.phaseMetrics,null);
  assert.equal(unchecked.phaseEvidence,null);assert.equal(unchecked.phaseProvenance.reason,'unconfirmed-role');
  selectors.evPhaseRole='solid';
  const validated=run();
  assert(validated.comparison.valid);assert.equal(validated.phaseProvenance.valid,true);
  assert.equal(validated.phaseProvenance.conversion,'alphaL=1-alphaS');
  assert.equal(validated.phaseProvenance.spatialColocationVerified,false);
  assert.equal(validated.phaseEvidence.state,'solidifying');
  selectors.evAlphaOnset='0.01';selectors.evAlphaComplete='0.99';
  assert.equal(run().phaseProvenance.reason,'invalid-phase-thresholds');
  selectors.evAlphaOnset='0.99';selectors.evAlphaComplete='0.01';
  phase.field.dimensions='[0 1 -2 0 0 0 0]';
  assert.equal(run().phaseProvenance.reason,'phase-not-dimensionless');
  phase.field.dimensions='[0 0 0 0 0 0 0]';phase.field.unit='K';
  assert.equal(run().phaseProvenance.reason,'phase-incompatible-unit');
  phase.field.unit='1';phase.y[2]=1.5;
  assert.equal(run().phaseProvenance.reason,'invalid-phase-range');
  assert.equal(issues.length,0,'Valid thermal comparison should not be rejected by optional phase failure');
});

test('product wiring keeps thermal rebound and phase evidence separate',()=>{
  for(const token of [
    'Experimental Validation',
    'Validación experimental',
    'Import experimental CSV/TXT',
    'RMSE [K]',
    'MAE [K]',
    'noExtrapolation:true',
    'noAutomaticRecalescenceLabel:true',
    'thermal rebound candidate',
    'candidato de rebote térmico',
    'liquid fraction decreasing (solidifying evidence)',
    'liquid fraction increasing (remelting evidence)',
    'ΔT sim − exp',
    "accept=\".csv,.txt,.dat,.tsv\""
  ])assert(source.includes(token),'Missing experimental-validation token: '+token);
  for(const banned of ['QuickCup','B12_','C12_','metalTop'])assert(!source.includes(banned),'Project-specific token leaked into product module: '+banned);
});

console.log('FoamLens experimental validation regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
