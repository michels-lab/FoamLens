'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-numerical-performance.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_START */',end='/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Numerical performance core markers are missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {npParseResidualLine,npParseCourantLine,npParseContinuityLine,npParseTimingLine,npParseDeltaTLine,npParseCouplingIteration,npClassifyEvent,npParseRunLog,npBasicStats,npSummarizeRunLog,npAxisData};')();

const near=(x,y,t=1e-12)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('generic linear solver residual line',()=>{
  const r=api.npParseResidualLine('smoothSolver:  Solving for Ux, Initial residual = 0.01, Final residual = 2e-07, No Iterations 3');
  assert(r&&r.solver==='smoothSolver'&&r.equation==='Ux'&&near(r.initialResidual,.01)&&near(r.finalResidual,2e-7)&&r.iterations===3);
});

test('Courant mean and max',()=>{
  const r=api.npParseCourantLine('Courant Number mean: 0.031 max: 0.72');
  assert(r&&near(r.mean,.031)&&near(r.max,.72));
});

test('deltaT is physical timestep size',()=>{
  assert(near(api.npParseDeltaTLine('deltaT = 0.00475'),.00475));
});

test('continuity errors remain separate metric',()=>{
  const r=api.npParseContinuityLine('time step continuity errors : sum local = 1e-08, global = -2e-10, cumulative = 3e-09');
  assert(r&&near(r.local,1e-8)&&near(r.global,-2e-10)&&near(r.cumulative,3e-9));
});

test('execution and clock time',()=>{
  const r=api.npParseTimingLine('ExecutionTime = 12.5 s  ClockTime = 14 s');
  assert(r&&near(r.executionTime,12.5)&&near(r.clockTime,14));
});

test('PIMPLE outer iteration is not linear iteration',()=>{
  const r=api.npParseCouplingIteration('PIMPLE: iteration 3');
  assert(r&&r.algorithm==='PIMPLE'&&r.iteration===3&&!r.converged);
});

test('SIMPLE convergence record',()=>{
  const r=api.npParseCouplingIteration('SIMPLE solution converged in 287 iterations');
  assert(r&&r.algorithm==='SIMPLE'&&r.iteration===287&&r.converged);
});

const log=`Application : foamMultiRun
deltaT = 0.1
Time = 0.1
Courant Number mean: 0.02 max: 0.30
PIMPLE: iteration 1
smoothSolver: Solving for Ux, Initial residual = 0.01, Final residual = 1e-06, No Iterations 2
GAMG: Solving for p_rgh, Initial residual = 0.1, Final residual = 0.001, No Iterations 4
time step continuity errors : sum local = 1e-08, global = -1e-10, cumulative = 2e-09
PIMPLE: iteration 2
smoothSolver: Solving for Ux, Initial residual = 0.005, Final residual = 2e-07, No Iterations 1
ExecutionTime = 1.5 s  ClockTime = 2 s
deltaT = 0.08
Time = 0.18
Courant Number mean: 0.018 max: 0.25
--> FOAM Warning : synthetic warning
GAMG: Solving for p_rgh, Initial residual = 0.08, Final residual = 0.0005, No Iterations 3
ExecutionTime = 2.5 s  ClockTime = 3 s
`;

test('raw run log separates physical and numerical records',()=>{
  const p=api.npParseRunLog(log);
  assert.strictEqual(p.application,'foamMultiRun');
  assert.strictEqual(p.steps.length,2);
  assert.strictEqual(p.equations.length,4);
  assert.strictEqual(p.coupling.length,2);
  assert.strictEqual(p.continuity.length,1);
  assert.strictEqual(p.events.filter(e=>e.severity==='warning').length,1);
  assert(near(p.steps[0].time,.1)&&near(p.steps[0].deltaT,.1)&&near(p.steps[0].courantMax,.3));
  assert(near(p.steps[1].time,.18)&&near(p.steps[1].deltaT,.08)&&near(p.steps[1].clockTime,3));
  assert.strictEqual(p.equations[0].outerIteration,1);
  assert.strictEqual(p.equations[2].outerIteration,2);
});

test('summary keeps linear solves distinct from coupling records',()=>{
  const s=api.npSummarizeRunLog(api.npParseRunLog(log));
  assert.strictEqual(s.timesteps,2);
  assert.strictEqual(s.linearSolves,4);
  assert.strictEqual(s.couplingRecords,2);
  assert(near(s.deltaT.mean,.09));
  assert(near(s.courantMax.max,.3));
  assert.strictEqual(s.warnings,1);
});

test('fatal and floating-point events are errors, not inferred solver states',()=>{
  assert.strictEqual(api.npClassifyEvent('FOAM FATAL ERROR: bad field').severity,'error');
  assert.strictEqual(api.npClassifyEvent('Floating point exception').severity,'error');
  assert.strictEqual(api.npClassifyEvent('ordinary solver line'),null);
});

test('numerical metric X axis separates physical time from timestep index',()=>{
  const s={t:[0.1,0.18,0.31],y:[10,20,30]};
  assert.deepStrictEqual(api.npAxisData(s,'physicalTime').x,[0.1,0.18,0.31]);
  assert.deepStrictEqual(api.npAxisData(s,'timestepIndex').x,[0,1,2]);
  assert(js.includes('value="physicalTime" selected')); assert(js.includes('data-fl-es="Tiempo físico [s]"'));
  assert(js.includes('value="timestepIndex"')); assert(js.includes('data-fl-es="Índice de timestep"'));
});

test('UI explicitly separates physical results and numerical cost',()=>{
  assert(js.includes('Physical results and numerical cost are reported separately.'));
  assert(js.includes('Linear-solver residuals are not treated as nonlinear/PIMPLE convergence.'));
  assert(js.includes('Missing metrics remain unavailable; FoamLens does not invent values.'));
});

test('raw solver-log import is extended without replacing legacy metrics',()=>{
  for(const token of [
    'npInstallRawRunLogExtension',
    "const original=await base(file)",
    "'deltaT','deltaT','deltaT','Physical timestep Δt'",
    "'outerIterations',algorithm+' outer iterations'",
    'return original.concat(extra)'
  ]) assert(js.includes(token),'Missing raw-log extension token '+token);
});

test('parser remains project agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into numerical core: '+banned);
});

console.log('Numerical performance / solver-log regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
