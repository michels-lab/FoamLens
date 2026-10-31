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
const api=new Function(core+';return {tsdFieldAxisKey,tsdVariableSet,tsdPrimaryChoice,tsdMatchesVariable,tsdAxisPlan};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('single-variable mode preserves the original focus semantics',()=>{
  assert.deepEqual(api.tsdVariableSet('T',''),['T']);
  assert.equal(api.tsdMatchesVariable('T','T',''),true);
  assert.equal(api.tsdMatchesVariable('alphaL','T',''),false);
  assert.equal(api.tsdMatchesVariable('anything','',''),true);
});

test('primary selector always resolves to a real available variable',()=>{
  const vars=[{canonical:'T'},{canonical:'alphaL'},{canonical:'p'}];
  assert.equal(api.tsdPrimaryChoice(vars,'T'),'T');
  assert.equal(api.tsdPrimaryChoice(vars,''),'T');
  assert.equal(api.tsdPrimaryChoice(vars,'missing'),'T');
  assert.equal(api.tsdPrimaryChoice([],''),'');
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
    'stopAllPlayback()',
    "vSel.innerHTML=vars.map",
    "primary.dataset.showAll='1'",
    "delete primary.dataset.showAll",
    "Showing all variables",
    "Mostrando todas",
    "allButton.classList.toggle('primary',showAll)"
  ])assert(source.includes(token),'Missing dual Time-Series wiring token: '+token);
  assert(!source.includes("vSel.innerHTML='<option value=\"\">'+tsdEsc(tsdUi('All variables'"),'All variables leaked back into the primary selector.');
});


test('G59: authentic 3D catalog refreshes even when existing postProcessing time series exist',()=>{
  const begin=source.indexOf('function tsdUpdateSourceCatalog(){');
  const end=source.indexOf('function tsdPatchScientificLabels(){',begin);
  assert(begin>=0&&end>begin,'source-owned Time Series catalog refresh must be present');
  // Execute the exact real production function. Previously its condition
  // datasets.length===0 incorrectly suppressed T-field selectors with probes.
  const factory=new Function('document','tsdSourceFieldCatalog','timeSeriesOptionsBase',
    'tsdUi','fwRefreshFieldTsControls','console',
    source.slice(begin,end)+';return tsdUpdateSourceCatalog');
  function exercise(existingCount,has3D,open,hasT2){
    let refreshes=0;
    const panel={querySelector:()=>({insertAdjacentElement:()=>{}})};
    const details={open};
    const info={textContent:'',setAttribute:()=>{}};
    const nodes={timeSeriesControls:panel,fwDataFieldHistories:details,tsdSourceFieldCount:info};
    if(hasT2)nodes.gr176HistoryCard={};
    const document={getElementById:id=>nodes[id]||null,createElement:()=>({setAttribute:()=>{}})};
    const catalogs=has3D?[{caseId:'B13',region:'metal',name:'T'}]:[];
    const measured=Array.from({length:existingCount},(_,i)=>({field:{canonical:'probe'+i}}));
    const update=factory(document,()=>catalogs,()=>measured,(en)=>en,
      ()=>{refreshes++},console);
    update();
    return {refreshes,details,info};
  }
  const mixed=exercise(2,true,false,true);
  assert.equal(mixed.refreshes,1,'G59 regression: existing measured curves MUST NOT hide imported 3D T');
  assert.equal(mixed.details.open,true,'source anchor must support original field selector refresh');
  assert.match(mixed.info.textContent,/Existing measured time-series: 2/);
  assert.match(mixed.info.textContent,/OpenFOAM 3D fields available.*: 1/);
  assert.equal(exercise(2,false,true,true).refreshes,0,'do not claim a non-existent 3D source');
  const legacy=exercise(2,true,false,false);
  assert.equal(legacy.refreshes,0,'do not force-open a collapsed legacy generator without T2');
  assert.equal(legacy.details.open,false);
  assert.equal(exercise(0,true,false,false).refreshes,1,'preserve original zero-curves discovery');
});

console.log('FoamLens dual Time-Series Focus regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
