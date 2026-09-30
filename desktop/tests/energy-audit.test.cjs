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
