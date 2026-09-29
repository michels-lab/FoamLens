'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-momentum-mechanisms.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_MOMENTUM_MECHANISMS_CORE_START */';
const end='/* FOAMLENS_MOMENTUM_MECHANISMS_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Momentum mechanism audit core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {MA_ROLE_ORDER,maQuantile,maMechanismFields,maMechanismPairs,maRatioSummary,maCloseTime,maCommonTimes};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-12){assert(Math.abs(a-b)<=e,`${a} != ${b}`)}

test('mapped Darcy, buoyancy and pressure-gradient accelerations are collected generically',()=>{
  const mapping={
    darcyAcceleration:'phaseChangeDarcyAcceleration',
    buoyancyAcceleration:'phaseChangeBuoyancyAcceleration',
    pressureGradientAcceleration:'pRghAcceleration'
  };
  const fields=['T','phaseChangeDarcyAcceleration','phaseChangeBuoyancyAcceleration','pRghAcceleration'];
  const m=api.maMechanismFields(mapping,fields);
  assert.deepEqual(m.map(x=>x.role),['darcyAcceleration','buoyancyAcceleration','pressureGradientAcceleration']);
  assert.deepEqual(m.map(x=>x.field),['phaseChangeDarcyAcceleration','phaseChangeBuoyancyAcceleration','pRghAcceleration']);
});

test('missing mechanisms only produce physically available pairs',()=>{
  const mechanisms=api.maMechanismFields(
    {darcyAcceleration:'darcy',buoyancyAcceleration:'buoyancy',pressureGradientAcceleration:''},
    ['darcy','buoyancy']
  );
  const pairs=api.maMechanismPairs(mechanisms);
  assert.equal(pairs.length,1);
  assert.equal(pairs[0].key,'darcyAcceleration/buoyancyAcceleration');
});

test('three mechanisms create the three expected local balance pairs',()=>{
  const mechanisms=api.maMechanismFields(
    {darcyAcceleration:'d',buoyancyAcceleration:'b',pressureGradientAcceleration:'p'},
    ['d','b','p']
  );
  assert.deepEqual(api.maMechanismPairs(mechanisms).map(x=>x.key),[
    'darcyAcceleration/buoyancyAcceleration',
    'darcyAcceleration/pressureGradientAcceleration',
    'buoyancyAcceleration/pressureGradientAcceleration'
  ]);
});

test('ratio summary reports median, p95, ratio>1 and excluded denominators',()=>{
  const s=api.maRatioSummary([.5,1,2,4],6,2);
  near(s.median,1.5);
  near(s.p95,3.7);
  near(s.fractionGt1,.5);
  near(s.invalidFraction,2/6);
  assert.equal(s.n,4);
  assert.equal(s.total,6);
});

test('common physical times tolerate tiny floating representation differences only',()=>{
  const t=api.maCommonTimes([[0,.1,.2,.3],[0,.10000000001,.2,.4],[0,.1,.20000000002]]);
  assert.equal(t.length,3);
  near(t[0],0);near(t[1],.1);near(t[2],.2);
  assert.equal(api.maCommonTimes([[0,1],[.5,1.1]]).length,0);
});

test('product wiring extends p_rgh acceleration mapping and avoids causal verdicts',()=>{
  for(const token of [
    "/^prghacceleration$/",
    "Automatic mechanism balance audit",
    "Auditoría automática de balance de mecanismos",
    "pmRatioPairs(",
    "pmCollectSubsetValues(",
    "component,'magnitude'",
    "fractionGt1",
    "noCausalityInference:true",
    "not, by itself, proof of causality",
    "No temporal extrapolation was used",
    "momentumMechanismRatioEvolution"
  ])assert(source.includes(token),'Missing momentum mechanism audit token: '+token);
  for(const banned of ['QuickCup','B12_','C12_'])assert(!source.includes(banned),'Project-specific token leaked into product module: '+banned);
});

console.log('FoamLens automatic momentum mechanism audit regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
