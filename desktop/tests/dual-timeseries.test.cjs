'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-dual-timeseries.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_DUAL_TIMESERIES_CORE_START */';
const end='/* FOAMLENS_DUAL_TIMESERIES_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Dual Time-Series core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {tsdFieldAxisKey,tsdVariableSet,tsdMatchesVariable,tsdAxisPlan};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('single-variable mode preserves the original focus semantics',()=>{
  assert.deepEqual(api.tsdVariableSet('T',''),['T']);
  assert.equal(api.tsdMatchesVariable('T','T',''),true);
  assert.equal(api.tsdMatchesVariable('alphaL','T',''),false);
  assert.equal(api.tsdMatchesVariable('anything','',''),true);
});

test('two selected variables are both accepted without selecting unrelated fields',()=>{
  assert.deepEqual(api.tsdVariableSet('T','alphaL'),['T','alphaL']);
  assert.equal(api.tsdMatchesVariable('T','T','alphaL'),true);
  assert.equal(api.tsdMatchesVariable('alphaL','T','alphaL'),true);
  assert.equal(api.tsdMatchesVariable('p','T','alphaL'),false);
});

test('temperature and liquid fraction receive independent Y axes',()=>{
  const T={canonical:'T',quantity:'temperature',unit:'K',dimensions:'[0 0 0 1 0 0 0]'};
  const alpha={canonical:'alphaL',quantity:'liquid_fraction',unit:'-',dimensions:'[0 0 0 0 0 0 0]'};
  assert.deepEqual(api.tsdAxisPlan(T,alpha),{primary:'left',secondary:'right',separate:true});
});

test('compatible velocity components can share one Y axis',()=>{
  const ux={canonical:'U_x',quantity:'velocity_component',unit:'m/s',dimensions:'[0 1 -1 0 0 0 0]'};
  const uy={canonical:'U_y',quantity:'velocity_component',unit:'m/s',dimensions:'[0 1 -1 0 0 0 0]'};
  assert.deepEqual(api.tsdAxisPlan(ux,uy),{primary:'left',secondary:'left',separate:false});
});

test('different semantics stay separate even if both are dimensionless',()=>{
  const a={canonical:'alphaL',quantity:'liquid_fraction',unit:'-',dimensions:'[0 0 0 0 0 0 0]'};
  const flow={canonical:'flowType',quantity:'flow_type',unit:'-',dimensions:'[0 0 0 0 0 0 0]'};
  assert.equal(api.tsdAxisPlan(a,flow).separate,true);
});

test('dual Time-Series UI is wired into existing filters and axes',()=>{
  for(const token of [
    'timeSeriesVariable2',
    'Variable 2 (optional)',
    'Variable 2 (opcional)',
    'timeSeriesProbe',
    'timeSeriesFamily',
    'timeSeriesMatchesSelection=tsdMatchesFilters',
    'refreshTimeSeriesControls=tsdRefreshTimeSeriesControls',
    'assignments=function(vis)',
    "currentDataView!=='timeseries'",
    "item.axis==='Left'||item.axis==='Right'",
    'stopAllPlayback()'
  ])assert(source.includes(token),'Missing dual Time-Series wiring token: '+token);
});

console.log('FoamLens dual Time-Series Focus regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
