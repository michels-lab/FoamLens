'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-coupling-audit.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_COUPLING_AUDIT_CORE_START */';
const end='/* FOAMLENS_COUPLING_AUDIT_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Coupling audit core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {caMedian,caPercentile,caLongestRun,caSummarizeLinearPairs,caSummarizeCouplingRows};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-12){assert(Math.abs(a-b)<=e,`${a} != ${b}`)}

test('C_p is final residual divided by initial residual for the same linear solve',()=>{
  const s=api.caSummarizeLinearPairs([
    {initial:1e-2,final:1e-4},{initial:2e-2,final:1e-3},{initial:1e-3,final:2e-3}
  ]);
  assert.equal(s.n,3);
  near(s.rows[0].Cp,.01);
  near(s.rows[1].Cp,.05);
  near(s.rows[2].Cp,2);
  near(s.fracCpGt1,1/3);
  near(s.maxCp,2);
});

test('R_p_outer summary keeps worsening and little-reduction fractions separate',()=>{
  const rows=[
    {t:1,R:.4},{t:2,R:.95},{t:3,R:.96},{t:4,R:1.1},{t:5,R:1.2},{t:6,R:.2}
  ];
  const s=api.caSummarizeCouplingRows(rows,.9);
  assert.equal(s.n,6);
  near(s.fracRGt1,2/6);
  near(s.fracPlateau,2/6);
  assert.equal(s.plateauRun.length,2);
  assert.equal(s.plateauRun.startTime,2);
  assert.equal(s.plateauRun.endTime,3);
  assert.equal(s.worseningRun.length,2);
  assert.equal(s.worseningRun.startTime,4);
  assert.equal(s.worseningRun.endTime,5);
});

test('longest run is based on consecutive timesteps, not total count',()=>{
  const q=api.caLongestRun([1,1,0,1,1,1,0,1],x=>x===1);
  assert.deepEqual(q,{length:3,startIndex:3,endIndex:5});
});

test('statistics ignore non-finite values without fabricating samples',()=>{
  near(api.caMedian([1,NaN,3]),2);
  near(api.caPercentile([1,2,3,4],.95),3.85);
  const s=api.caSummarizeLinearPairs([{initial:0,final:1},{initial:1,final:NaN}]);
  assert.equal(s.n,0);
  assert(Number.isNaN(s.medianCp));
});

test('product UI explicitly separates linear and PIMPLE convergence evidence',()=>{
  for(const token of [
    'Thesis convergence audit',
    'Auditoría de convergencia para tesis',
    'Cₚ = final residual / initial residual',
    'Rₚ,outer = last initial residual / first initial residual',
    'does not turn linear-solver residuals into a nonlinear convergence verdict',
    'PIMPLE mapping validated against fvSolution',
    'FoamLens_convergence_audit.json'
  ])assert(source.includes(token),'Missing convergence-audit token: '+token);
});

console.log('FoamLens formal convergence audit regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
