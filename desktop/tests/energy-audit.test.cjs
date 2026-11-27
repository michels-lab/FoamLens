'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-energy-audit.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_ENERGY_AUDIT_CORE_START */';
const end='/* FOAMLENS_ENERGY_AUDIT_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Energy audit core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {eaNorm,eaFinitePairs,eaMergeSeries,eaRoleFromDescriptor,eaTrapezoid,eaQuantile,eaClosureMetrics,eaInventoryDelta};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-10){assert(Math.abs(a-b)<=e,`${a} != ${b}`)}


test('missing energy samples, closure inputs and timestamps never become false physical zero',()=>{
  assert.deepStrictEqual(api.eaFinitePairs([0,null,'',2,false,'3'],[10,20,30,null,40,'0']),[[0,10],[3,0]]);
  assert.deepStrictEqual(api.eaFinitePairs(['0','9.8'],['0','5e1']),[[0,0],[9.8,50]]);
  const metrics=api.eaClosureMetrics([null,5,false,0],[1,1,1,0],[1,6,1,0]);
  assert.strictEqual(metrics.n,2);
  assert.deepStrictEqual(metrics.residual,[0,0]);
  const q=api.eaQuantile([null,false,'',2,4],.5);
  near(q,3);
  assert.strictEqual(api.eaTrapezoid([0,1,2],[1,null,3]).final,4);
});

test('OpenFOAM energy-flux roles are classified from field/reduction provenance',()=>{
  assert.equal(api.eaRoleFromDescriptor({fieldName:'energyAdvectiveFlux',kind:'surfaceReduction',operation:'sum'}),'advective');
  assert.equal(api.eaRoleFromDescriptor({fieldName:'heatFlux',functionType:'surfaceFieldValue',operation:'sum'}),'diffusive');
  assert.equal(api.eaRoleFromDescriptor({fieldName:'energyFlux',kind:'surfaceReduction',operation:'orientedSum'}),'total');
  assert.equal(api.eaRoleFromDescriptor({fieldName:'h',functionType:'volFieldValue',operation:'volIntegrate',weightField:'rho'}),'sensibleInventory');
  assert.equal(api.eaRoleFromDescriptor({fieldName:'latentHeatRateVol',kind:'volumeReduction',operation:'volIntegrate'}),'latentPower');
});

test('specific enthalpy is not mislabeled as an energy inventory without rho weighting',()=>{
  assert.equal(api.eaRoleFromDescriptor({fieldName:'h',functionType:'volFieldValue',operation:'volIntegrate',weightField:''}),'');
  assert.equal(api.eaRoleFromDescriptor({fieldName:'h',kind:'tabular',operation:'sum',weightField:'rho'}),'');
});


test('energy residual integrals reject missing aligned physical-time samples rather than shifting timestamps',()=>{
  const begin=source.indexOf('function eaAnalyzeFluxGroup('),end=source.indexOf('function eaInventoryRows(',begin);
  assert(begin>=0&&end>begin,'Real energy closure integration function unavailable');
  const impl=source.slice(begin,end);
  const analyze=aligned=>new Function('eaMergedRole','taAlignSeries','eaClosureMetrics','eaTrapezoid',
    impl+';return eaAnalyzeFluxGroup;')(()=>({}),()=>aligned,api.eaClosureMetrics,api.eaTrapezoid)({roles:{}});
  const incomplete=analyze({valid:true,grid:[0,1,4],range:{start:0,end:4},
    series:[{y:[10,null,30]},{y:[2,2,2]},{y:[13,null,37]}]});
  assert.strictEqual(incomplete.ok,false,'A missing t=1 reading cannot yield a fabricated integrated residual');
  assert.match(incomplete.reason,/incomplete synchronized energy samples/);
  assert.strictEqual(incomplete.integrals,undefined);
  const measured=analyze({valid:true,grid:[0,1,4],range:{start:0,end:4},
    series:[{y:[10,12,30]},{y:[2,2,2]},{y:[13,14,37]}]});
  assert.strictEqual(measured.ok,true);
  assert.strictEqual(measured.metrics.n,3);
  near(measured.integrals.residual,8);
});

test('exact advective plus diffusive decomposition closes numerically',()=>{
  const adv=[10,8,5,-1],diff=[-2,-3,4,1],total=adv.map((v,i)=>v+diff[i]);
  const m=api.eaClosureMetrics(adv,diff,total,1e-12);
  assert.equal(m.n,4);near(m.rms,0);near(m.maxAbs,0);near(m.p95Relative,0);near(m.maxRelative,0);
});

test('closure metrics expose absolute and relative residuals without hiding error',()=>{
  const m=api.eaClosureMetrics([10,10],[5,5],[15,16],1e-12);
  near(m.rms,Math.sqrt(.5));
  near(m.maxAbs,1);
  assert(m.maxRelative>0);
  assert(m.p95Relative>0);
});

test('physical-time integration handles nonuniform write intervals',()=>{
  const r=api.eaTrapezoid([0,1,3],[2,2,4]);
  assert.deepEqual(r.t,[0,1,3]);
  near(r.final,8);
  assert.deepEqual(r.y,[0,2,8]);
});

test('restart segments merge by physical time and last duplicate wins',()=>{
  const m=api.eaMergeSeries([
    {t:[0,1,2],y:[0,1,2]},
    {t:[2,3,4],y:[20,3,4]}
  ]);
  assert.deepEqual(m.t,[0,1,2,3,4]);
  assert.deepEqual(m.y,[0,1,20,3,4]);
});

test('sensible inventory reports start, end and delta without a sign convention',()=>{
  const d=api.eaInventoryDelta([0,1,2],[100,90,75]);
  near(d.start,100);near(d.end,75);near(d.delta,-25);near(d.startTime,0);near(d.endTime,2);
});

test('product wiring uses common physical time, provenance and explicit no-inference safeguards',()=>{
  for(const token of [
    'Automatic Energy Audit',
    'Auditoría automática de energía',
    'energyFlux - energyAdvectiveFlux - heatFlux',
    "taAlignSeries([A,D,T],{mode:'common',method:'linear'",
    'noExtrapolation:true',
    'noSignConventionInference:true',
    'weightField',
    'functionObject',
    'energyAudit',
    'Cumulative total boundary energy'
  ])assert(source.includes(token),'Missing Energy Audit wiring token: '+token);
  for(const banned of ['QuickCup','B3_reference','B12_','C12_','metalTop','metalMold'])assert(!source.includes(banned),'Project-specific token leaked into Energy Audit: '+banned);
});

console.log('FoamLens automatic energy audit regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

test('energy integration retains close times and exact restart precedence',()=>{
 const r=api.eaMergeSeries([{t:[0,1e-12,2e-12,1],y:[0,100,0,0]}]);
 assert.equal(r.t.length,4);near(api.eaTrapezoid(r.t,r.y).final,1e-10,1e-20);
 const m=api.eaMergeSeries([{t:[0,1e-12],y:[0,10]},{t:[1e-12,2e-12],y:[20,0]}]);
 assert.deepEqual(m.t,[0,1e-12,2e-12]);assert.deepEqual(m.y,[0,20,0]);
});
test('large energy closure avoids spread limits and retains finite scaled RMS',()=>{
 const n=150001,a=new Array(n).fill(0),d=new Array(n).fill(0),t=new Array(n).fill(1e200);
 const m=api.eaClosureMetrics(a,d,t);assert.equal(m.n,n);assert.equal(m.maxAbs,1e200);assert.equal(m.rms,1e200);
 assert(!Number.isFinite(api.eaTrapezoid([0,2],[1e308,1e308]).final));
});
test('actual energy closure path keeps a peak beyond previous 5000 point cap',()=>{
 const taSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v13-temporal-alignment.js'),'utf8');
 const ac=taSource.slice(taSource.indexOf('/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_START */'),taSource.indexOf('/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_END */'));
 const product=source.slice(source.indexOf('function eaMergedRole('),source.indexOf('function eaInventoryRows('));
 const analyze=new Function(core+'\n'+ac+'\n'+product+'\nreturn eaAnalyzeFluxGroup;')();
 const n=10001,t=Array.from({length:n},(_,i)=>i),zero=t.map(()=>0),pulse=t.map(i=>i===5001?100:0);
 const r=analyze({roles:{advective:[{t,y:zero}],diffusive:[{t,y:zero}],total:[{t,y:pulse}]}});
 assert(r.ok,r.reason);assert.equal(r.grid.length,n);near(r.metrics.maxAbs,100);near(r.integrals.residual,100);
});
