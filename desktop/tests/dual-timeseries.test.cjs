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

test('Data Time Series filter feedback identifies selected case and empty selections',()=>{
  const start=source.indexOf('function tsdRefreshTimeSeriesControls(){');
  const end=source.indexOf('function tsdPatchAssignments(){',start);
  assert(start>=0&&end>start,'Original Data Time Series filter owner missing');
  const controller=source.slice(start,end);
  for(const token of [
    'const selectedCase=caseOptions.find',
    'const caseContext=selectedCase?',
    'No curves match',
    'No hay curvas coincidentes',
    'Try All probes, All matching cases or Show all variables',
    'Prueba Todas las sondas, Todos los casos coincidentes o Mostrar todas las variables',
    "filterHint.setAttribute('role','status')",
    "filterHint.setAttribute('aria-live','polite')"
  ])assert(controller.includes(token),'Missing native case-aware filter feedback: '+token);
  assert(controller.includes('matching.length?tsdUi('),'Non-empty and zero-match states must remain distinct');
  assert(controller.includes('caseOptions.find(c=>'), 'Selected case must resolve from actual case options');
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


test('G Granada: dual-variable refresh cannot leak the Time Series panel into Field or Profiles',()=>{
  const start=source.indexOf('function tsdShouldShowPanel(');
  const end=source.indexOf('function tsdPatchAssignments(',start);
  assert(start>0&&end>start,'production visibility owner and refresher must exist');
  const build=new Function('document','timeSeriesOptionsBase','tsdEsc','tsdUi',
    'tsdUpdateSourceCatalog','tsdUpdateScientificEvidence','currentDataView','activeAppMode',
    source.slice(start,end)+';return {show:tsdShouldShowPanel,refresh:tsdRefreshTimeSeriesControls};');
  function exercise({view='timeseries',mode='data',builder=true,curves=0}={}){
    const hidden=new Set(['hidden']);
    const panel={classList:{toggle:(name,on)=>{
      if(on)hidden.add(name);else hidden.delete(name);
    }}};
    const variable={innerHTML:'',dataset:{}};
    const second={innerHTML:'',disabled:false,dataset:{}};
    const probe={innerHTML:'',dataset:{}},family={innerHTML:'',dataset:{}};
    const badge={textContent:''},hint={textContent:'',attributes:{},setAttribute(name,value){this.attributes[name]=value}};
    const nodes={timeSeriesControls:panel,timeSeriesVariable:variable,
      timeSeriesVariable2:second,timeSeriesProbe:probe,timeSeriesFamily:family,
      timeSeriesFocusBadge:badge,timeSeriesFilterHint:hint};
    if(builder){nodes.gr176HistoryCard={};nodes.fwBuildFieldHistories={}}
    const doc={getElementById:id=>nodes[id]||null};
    let updates=0;
    const api=build(doc,()=>curves? [{field:{canonical:'T'}}]:[],String,(en)=>en,
      ()=>{updates++},()=>{updates++},view,mode);
    // Exercise the original zero-curves branch, not a duplicated implementation.
    if(curves===0)api.refresh();
    return {visible:!hidden.has('hidden'),wanted:api.show(curves>0),
      updates,badge,second,hint};
  }
  const fresh=exercise();
  assert.equal(fresh.visible,true,'Data → Time Series must show real Build even with zero curves');
  assert.equal(fresh.badge.textContent,'0 existing curves');
  assert.equal(fresh.second.disabled,true,'second field must remain disabled with zero histories');
  assert.equal(fresh.updates,2,'real original catalog and evidence refresh must execute');
  assert.equal(exercise({builder:false}).visible,false,'no fake Build panel');
  assert.equal(exercise({view:'profile'}).visible,false,'Data Profiles must not show Time Series');
  assert.equal(exercise({mode:'field'}).visible,false,'Field must not show the Data builder');
  assert.equal(exercise({view:'timeseries',mode:'review'}).visible,false,'Review must not show Data controls');
  assert.equal(exercise({curves:1,builder:false}).wanted,true,'existing curves remain visible in Data');
  assert.equal(exercise({curves:1,builder:false,mode:'field'}).wanted,false,'even existing curves cannot leak into Field');
});

test('Granada multi-case: Time Series defaults to all probes and retains explicit filters',()=>{
  const begin=source.indexOf('function tsdShouldShowPanel(');
  const end=source.indexOf('function tsdPatchAssignments(',begin);
  assert(begin>0&&end>begin,'Original dual-variable refresh source is required');
  const maker=new Function(
    'document','timeSeriesOptionsBase','tsdFields','tsdPrimaryChoice','tsdPopulateSecondary',
    'tsdVariableSet','tsdEsc','tsdUi','localizedFieldName','tr','caseById',
    'tsdMatchesFilters','tsdAxisPlan','tsdUpdateSourceCatalog','tsdUpdateScientificEvidence',
    'currentDataView','activeAppMode',
    source.slice(begin,end)+';return tsdRefreshTimeSeriesControls;'
  );
  const rows=[
    {field:{canonical:'T',unit:'K'},caseId:'B13',caseName:'B13',probe:'1'},
    {field:{canonical:'T',unit:'K'},caseId:'C13',caseName:'C13',probe:'2'}
  ];
  const select=(value='')=>({value,innerHTML:'',dataset:{},disabled:false});
  const primary=select(),secondary=select(),probe=select(),family=select();
  family.options=[];
  let html='';
  Object.defineProperty(family,'innerHTML',{
    get(){return html},
    set(value){html=value;this.options=[...value.matchAll(/<option value="([^"]*)"/g)]
      .map(match=>({value:match[1]}))}
  });
  const badge={textContent:''},hint={textContent:'',attributes:{},setAttribute(name,value){this.attributes[name]=value}},panel={
    classList:{toggle(){}}
  },caseLabel={textContent:''};
  const nodes={timeSeriesControls:panel,timeSeriesVariable:primary,
    timeSeriesVariable2:secondary,timeSeriesProbe:probe,timeSeriesFamily:family,
    timeSeriesFocusBadge:badge,timeSeriesFilterHint:hint,
    gr176HistoryCard:{},fwBuildFieldHistories:{}};
  const document={getElementById:id=>nodes[id]||null,querySelector:()=>caseLabel};
  let catalogRefreshes=0;
  const refresh=maker(document,()=>rows,()=>[{canonical:'T',unit:'K'}],
    (vars,wanted)=>vars.some(v=>v.canonical===wanted)?wanted:vars[0].canonical,
    ()=>'',primary=>primary?[primary]:[],String,en=>en,f=>f.canonical,
    ()=> 'probe',id=>({id,name:id}),
    row=>(!probe.value||String(row.probe)===probe.value)&&
      (!family.value||family.value==='case:'+row.caseId),
    ()=>({separate:false}),()=>{catalogRefreshes++},
    ()=>{catalogRefreshes++},'timeseries','data');
  refresh();
  assert.equal(probe.value,'','A new multi-case import must default to All probes');
  assert.equal(badge.textContent,'2 curves','Both OpenFOAM cases are visible initially');
  assert(family.options.some(o=>o.value==='case:B13'));
  assert(family.options.some(o=>o.value==='case:C13'));
  assert.match(hint.textContent,/2 case\(s\)/);
  probe.value='2';refresh();
  assert.equal(probe.value,'2','An explicitly selected real probe remains selected');
  assert.equal(badge.textContent,'1 curves','Explicit filtering still works');
  assert(family.options.some(o=>o.value==='case:C13'));
  assert(family.options.some(o=>o.value==='case:B13'),
    'Other original cases must remain selectable when their probe IDs differ');
  family.value='case:B13';refresh();
  assert.equal(family.value,'case:B13','A real selected case remains selected');
  assert.equal(probe.value,'','Case B13 must not retain C13-only probe 2');
  assert.match(probe.innerHTML,/value="1"/,'Only B13 real probe becomes selectable');
  assert(!probe.innerHTML.includes('value="2"'),'C13-only probe must not appear as a B13 option');
  assert.equal(badge.textContent,'1 curves');
  family.value='case:C13';refresh();
  assert.equal(family.value,'case:C13','Switching to the other case must stay possible');
  assert.equal(probe.value,'','A new case shows All its probes by default');
  assert.match(probe.innerHTML,/value="2"/);
  assert(!probe.innerHTML.includes('value="1"'),'B13-only probe must not leak into C13');
  assert.equal(badge.textContent,'1 curves');
  family.value='';probe.value='gone';refresh();
  assert.equal(probe.value,'','A disappeared probe returns to All instead of selecting a random one');
  assert.equal(badge.textContent,'2 curves');
  assert.equal(catalogRefreshes,10,'Original source/evidence refresh still runs for all states');
});

test('Granada: real Case change event recomputes dependent probe choices before redraw exactly once',()=>{
  const start=source.indexOf('function tsdWireCaseFilterRefresh(){');
  const end=source.indexOf('function tsdInstall(){',start);
  assert(start>=0&&end>start,'Original Time Series Case change wiring is missing');
  const events=[],cases={dataset:{},addEventListener:(type,fn,capture)=>{
    events.push({type,fn,capture});
  }};
  let refreshes=0;
  const doc={getElementById:id=>id==='timeSeriesFamily'?cases:null};
  const wire=new Function('document','refreshTimeSeriesControls',
    source.slice(start,end)+';return tsdWireCaseFilterRefresh;')(doc,()=>{refreshes++});
  assert.equal(wire(),true);
  assert.equal(wire(),false,'Remount must not duplicate original case listeners');
  assert.equal(events.length,1);
  assert.equal(events[0].type,'change');
  assert.equal(events[0].capture,true,'Case-specific probes must refresh before the core redraw');
  cases.value='case:C13';
  events[0].fn();
  assert.equal(refreshes,1,'Changing case must refresh original dependent probe options');
  cases.value='case:B13';
  events[0].fn();
  assert.equal(refreshes,2);
  assert(/tsdPatchAssignments\(\);\s*tsdWireCaseFilterRefresh\(\);/.test(source),
    'Install must attach Case filter after binding the original Time Series refresh');
});

console.log('FoamLens dual Time-Series Focus regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
