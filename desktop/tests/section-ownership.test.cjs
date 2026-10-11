'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const plotSurfaces=read('v14-zy-plot-surfaces.js');
const field=read('v14-zz-field-workspace.js');
const fieldView=read('v14-field-view.js');
const ribbon=read('v15-ribbon-ui.js');
const activity=read('v20-activity-manager.js');
const analysisScope=read('v21-analysis-scope.js');
const compare=read('v14-z-field-compare.js');
const dataHtml=read('index.html');
const analysisModules=[
  'v13-flow-analysis.js','v13-numerical-performance.js','v13-physical-analysis.js',
  'v13-solidification-analysis.js','v13-spatial-differences.js','v13-temporal-alignment.js',
  'v13-thermal-analysis.js','v13-vector-fields.js','v14-energy-audit.js',
  'v14-experimental-validation.js','v14-momentum-mechanisms.js'
].map(read);

for(const src of [plotSurfaces,field,fieldView,ribbon,activity,analysisScope,compare,...analysisModules])new Function(src);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('3D and 3D comparison remain Field-owned across top-level section switches',()=>{
  assert(field.includes("fwAdoptFieldNode('fieldViewPanel','fw3DHost')"));
  assert(field.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"));
  // 3D Compare settings may initially be outside fieldViewControls, depending
  // on module installation order. Reparent the actual panel on startup AND entry.
  const compareAdoptions=field.split("fwAdoptFieldNode('fcPanel','fw3DControlsHost')").length-1;
  assert.equal(compareAdoptions,2,
    'Compare 3D configuration must enter the Field Inspector on bootstrap and on re-entry');
  const start=field.indexOf('function fwLeave()'),end=field.indexOf('function fwInstall()',start),leave=field.slice(start,end);
  assert(start>=0&&end>start,'fwLeave block missing.');
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewPanel'))"));
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewControls'))"));
  assert(compare.includes("document.getElementById('fieldViewControls')"),'3D Compare no longer mounts through the Field-owned inspector tree.');
});

test('plot controls and render surfaces have stable workspace ownership',()=>{
  assert(field.includes('function fwOwnCompanionControls'));
  assert(field.includes("'playbackGlobal','timeSeriesControls','profileControls','logControls'"));
  assert(field.includes("fwAdoptFieldNode(id,'fw2DControlsHost')"));
  assert(field.includes('function fwEnsureCompanionSurface'));
  assert(field.includes("FoamLensPlotSurfaces?.ensure?.('field',host)"));
  assert(field.includes("FoamLensPlotSurfaces?.activate?.('field',host,{restore:false})"));
  assert(!field.includes('fwRestoreCompanionNodes'),'Legacy shared-chart restore path still exists.');
  assert(!field.includes('appendChild(chart)'),'Field still reparents the 2D chart.');
  assert(!field.includes('function fwRemember('),'Legacy origin bookkeeping still exists.');
  for(const key of ['data','analysis','field'])assert(plotSurfaces.includes("'"+key+"'"),'Missing stable plot surface '+key+'.');
  assert(plotSurfaces.includes('flPlotSurfaceSwapCanonicalIds'),'Plot surfaces do not preserve the legacy renderer through canonical-ID switching.');
  assert(plotSurfaces.includes('bindPlotCanvasInteractions(canvas)'),'Cloned plot surfaces do not receive the shared interaction controller.');
});

test('top-level Ribbon exposes real scopes only',()=>{
  for(const removed of ['plots','compare'])
    assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Fake top-level alias returned: '+removed);
  for(const kept of ['home','data','field','analysis','export','view'])
    assert(new RegExp("\\['"+kept+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Expected top-level scope missing: '+kept);
});

test('legacy Field navigation cannot reappear beside the Ribbon',()=>{
  assert(!field.includes('createdModeButton'),'Field workspace still contains legacy mode-button creation logic.');
  assert(!field.includes("b.id='modeField'"),'Field workspace still creates modeField.');
  assert(!fieldView.includes("tab.id='fieldViewTab'"),'Field View still creates a Data dataset tab.');
  assert(!fieldView.includes("document.getElementById('fieldViewTab')"),'Field View still depends on the retired dataset tab.');
  assert(!fieldView.includes("setDataView=function(mode){if(mode==='field3d'"),'Field View still patches Data navigation for 3D.');
  assert(!field.includes("setDataView=function(mode){if(mode==='field3d'"),'Field workspace still aliases 3D through Data navigation.');
  assert(!fieldView.includes("setDataView('field3d')"),'Field View still enters 3D through Data.');
  assert(ribbon.includes("document.getElementById('modeField')?.remove()"),'Ribbon does not remove the base legacy Field button.');
  assert(!ribbon.includes("flRibbonClick('modeField')"),'Ribbon still uses modeField as a fallback.');
});

test('Difference labels distinguish 2D curve differences from strict 3D field differences',()=>{
  assert(ribbon.includes("'2D Curve Δ','Δ de curvas 2D'"));
  assert(ribbon.includes("['differenceTitle','2D Curve Difference','Diferencia de curvas 2D']"));
  assert(ribbon.includes("['createDifference','Create 2D Δ curve','Crear curva Δ 2D']"));
  assert(ribbon.includes("'Strict 3D Δ','Δ 3D estricta'"));
  assert(compare.includes('Show 3D difference'));
});

test('Analysis result creation is navigation-neutral',()=>{
  for(const src of analysisModules){
    assert(!src.includes("setDataView('timeseries')"),'Analysis module still silently switches to Time Series.');
    assert(!src.includes("setDataView('profile')"),'Analysis module still silently switches to Spatial Profile.');
  }
  assert(ribbon.includes('flRaAnalysisTimeResult'),'Explicit Time Series result action is missing.');
  assert(ribbon.includes('flRaAnalysisProfileResult'),'Explicit Spatial Profile result action is missing.');
});

test('Analysis modules fail closed to owned hosts instead of document.body',()=>{
  for(const src of analysisModules){
    assert(!src.includes('||document.body'),'Analysis module still falls back to document.body.');
    assert(!src.includes('|| document.body'),'Analysis module still falls back to document.body.');
  }
  assert(analysisScope.includes("id='flAnalysisOwnedHost'")||analysisScope.includes('id="flAnalysisOwnedHost"')||analysisScope.includes("id=\"flAnalysisOwnedHost\""));
});

test('activity ownership prevents compact progress from competing with detailed overlays',()=>{
  assert(activity.includes('flActivityOverlayOpen'));
  assert(activity.includes('activityToast.flActivitySuppressed{display:none!important}'));
  assert(activity.includes("'scanOverlay'"));
});

console.log('FoamLens v1.6 section-ownership / anti-leak regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

test('Field mounts directly into a Field-owned staging host, never Data',()=>{
  assert(fieldView.includes("fieldRoot.dataset.foamlensOwner='field'"));
  assert(fieldView.includes("document.body.appendChild(fieldRoot)"));
  assert(fieldView.includes("fieldRoot.insertAdjacentHTML('beforeend',fvUiHtml())"));
  assert(fieldView.includes("fieldRoot.insertAdjacentHTML('beforeend',fvPanelHtml())"));
  assert(!fieldView.includes("controlsAnchor.insertAdjacentHTML('afterend',fvUiHtml())"));
  assert(!fieldView.includes("viewport.insertAdjacentHTML('beforeend',fvPanelHtml())"));
  assert(field.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"));
  assert(compare.includes("const controls=document.getElementById('fieldViewControls')"));
});

test('2D comparison belongs to Data; Analysis cannot reclaim 3D or 2D data controls',()=>{
  assert(analysisScope.includes("dataCompare.dataset.foamlensOwner='data'"));
  assert(analysisScope.includes("dataCompareHost.appendChild(difference)"));
  assert(analysisScope.includes("id='flDataComparisonHost'")||analysisScope.includes('id="flDataComparisonHost"'));
  const advanced=analysisScope.match(/const ordered=\[([^\]]+)\]/)?.[1]||'';
  assert(!advanced.includes('differenceTools'),'2D comparisons must not be owned by Analysis');
  assert(dataHtml.includes("function openAnalysisModule(kind)"));
  assert(/if\(kind==='difference'\)\s*\{\s*setAppMode\('data'\);/.test(dataHtml),
    '2D difference must switch to the canonical Data workspace.');
});

test('Data results preserve time-series, horizontal/vertical profiles, logs and catalog',()=>{
  for(const id of ['timeSeriesTab','profileTab','logTab','catalogTab','profileLine','profileTime','logFamily','timeSeriesVariable','compareHeights'])
    assert(dataHtml.includes('id="'+id+'"'),'Missing Data 2D control '+id);
  for(const action of ['flRaDataTimeSeries','flRaDataProfiles','flRaDataLogs','flRaCatalog','flRaDataCompare'])
    assert(ribbon.includes(action),'Missing Data Ribbon access to '+action);
  assert(ribbon.includes("flRibbonBind('flRaDataCompare',()=>flRibbonOpenData2DCompare())"));
});


test('leaving Field preserves the outgoing plot snapshot until the surface manager captures it',()=>{
  const start=field.indexOf('function fwLeave()'),end=field.indexOf('function fwInstall()',start);
  assert(start>=0&&end>start,'Missing Field leave function');
  const leave=field.slice(start,end);
  const simulate=surface=>{
    const state={active:true,fieldTsSeq:0,dataViewBeforeField:'timeseries'};
    const mockWindow={FoamLensPlotSurfaces:{active:()=>surface}};
    const mocks=[state,mockWindow,{getElementById:()=>null},()=>{},()=>{},()=>{},()=>{},()=>{}];
    return new Function(
      'fwState','window','document','fvStopPlayback','fwTimeStop',
      'fwSetInspector','fwReturnCompanionControlsToData','updateDatasetViewUI',
      "let currentDataView='profile';"+leave+";fwLeave();return {view:currentDataView,active:fwState.active};"
    )(...mocks)
  };
  assert.deepStrictEqual(simulate('field'),{view:'profile',active:false},
    'Field must be captured with its own selected plot, not Data previous view');
  assert.deepStrictEqual(simulate(null),{view:'timeseries',active:false},
    'Legacy fallback must still restore Data when no plot-surface manager exists');
});


test('Data difference selects only mutually available probes and fields and preserves a valid selection',()=>{
  const start=dataHtml.indexOf('function differenceSharedProbeIds(');
  const end=dataHtml.indexOf('function createDifferenceCurves(',start);
  assert(start>=0&&end>start,'Data probe comparison implementation missing');
  const source=dataHtml.slice(start,end);
  const items=[
    {caseId:1,datasetType:'timeseries',field:{canonical:'T'},probe:0},
    {caseId:1,datasetType:'timeseries',field:{canonical:'T'},probe:5},
    {caseId:2,datasetType:'timeseries',field:{canonical:'T'},probe:5},
    {caseId:2,datasetType:'timeseries',field:{canonical:'T'},probe:7},
    {caseId:1,datasetType:'timeseries',field:{canonical:'U'},probe:0},
    {caseId:2,datasetType:'timeseries',field:{canonical:'U'},probe:9},
    {caseId:3,datasetType:'timeseries',field:{canonical:'T'},probe:3},
    {caseId:2,datasetType:'timeseries',field:{canonical:'T'},probe:null,derivedKind:'difference'}
  ];
  const cases=[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}];
  class Select{
    constructor(value=''){this._value=String(value);this.options=[];this.style={};this.dataset={};this.disabled=false}
    get value(){return this._value}
    set value(v){v=String(v);this._value=this.options.some(o=>o.value===v)?v:''}
    set innerHTML(markup){
      this.options=[...String(markup).matchAll(/<option value="([^"]*)">/g)].map(m=>({value:m[1]}));
      this._value=this.options[0]?.value||''
    }
  }
  const fields={differenceCaseA:new Select(),differenceCaseB:new Select(),differenceVariable:new Select(),differenceProbe:new Select(),differenceProbeField:{style:{}},
    differenceLogMemberAField:{classList:{toggle:()=>{}}},differenceLogMemberBField:{classList:{toggle:()=>{}}},
    differenceLogMemberA:new Select(),differenceLogMemberB:new Select(),createDifference:{disabled:false}};
  for(const [id,value] of [['differenceCaseA','1'],['differenceCaseB','2'],['differenceVariable','T'],['differenceProbe','5']]){
    fields[id].innerHTML='<option value="'+value+'"></option>';fields[id].value=value
  }
  const $=id=>fields[id];
  const core=new Function('series','cases','$','datasetTypeOf','profileVariablePriority','localizedFieldName','esc','tr','flUi','currentDataView',
    source+';return {shared:differenceSharedProbeIds,refresh:refreshDifferenceControls,scope:differenceScopeSeries};')(
      items,cases,$,s=>s.datasetType||'timeseries',()=>0,f=>f.canonical,s=>s,s=>s,(en)=>en,'timeseries');
  assert.deepStrictEqual(core.shared(items,1,2,'T'),[5]);
  assert.deepStrictEqual(core.shared(items,1,2,'U'),[]);
  core.refresh();
  assert.equal(fields.differenceVariable.value,'T','Only a mutually comparable variable should be selectable');
  assert.deepStrictEqual(fields.differenceProbe.options.map(x=>x.value),['5']);
  assert.equal(fields.differenceProbe.value,'5');
  assert.equal(fields.createDifference.disabled,false);
  assert.deepStrictEqual(core.scope(1,'T').map(s=>s.probe),[5]);
  fields.differenceProbe.value='';
  assert.deepStrictEqual(core.scope(1,'T'),[],'Blank probe must never coerce to probe 0');
  fields.differenceCaseB.value='3';core.refresh();
  assert.equal(fields.createDifference.disabled,true,'Cases with no common probe must be blocked');
  assert.equal(fields.differenceProbe.value,'');
  fields.differenceCaseB.value='2';core.refresh();
  assert.equal(fields.differenceProbe.value,'5','Restore the shared probe when compatible cases return');
  assert.equal(fields.createDifference.disabled,false);
});


test('Data Time Series can filter two physical variables without inventing or hiding curves',()=>{
  assert(dataHtml.includes('id="timeSeriesVariable2"'),'Data is missing its second-variable selector');
  assert(dataHtml.includes("timeSeriesVariable2').addEventListener('change'"),'Variable 2 must redraw the actual Data plot');
  const start=dataHtml.indexOf('function timeSeriesMatchesSelection(');
  const end=dataHtml.indexOf('function refreshTimeSeriesControls(',start);
  assert(start>=0&&end>start,'Time-series filter function missing');
  const values={timeSeriesVariable:'T',timeSeriesVariable2:'alpha1',timeSeriesProbe:'',timeSeriesFamily:''};
  const matches=new Function('$','datasetTypeOf',dataHtml.slice(start,end)+';return timeSeriesMatchesSelection;')(
    id=>({value:values[id]}),s=>s.datasetType||'timeseries');
  const make=(field,probe=0,caseId=1)=>({datasetType:'timeseries',field:{canonical:field},probe,caseId});
  assert(matches(make('T')),'Primary temperature curve must remain visible');
  assert(matches(make('alpha1')),'Independent second liquid-fraction curve must appear simultaneously');
  assert(!matches(make('U')),'Unselected third variable must stay hidden');
  values.timeSeriesProbe='5';
  assert(!matches(make('alpha1',0)),'A manually selected probe must still filter second-variable curves');
  assert(matches(make('alpha1',5)),'A matching second-variable probe must be visible');
  values.timeSeriesProbe='';
  values.timeSeriesVariable2='';
  assert(!matches(make('alpha1')),'Clearing Variable 2 must restore single-variable focus');
  values.timeSeriesVariable='';
  assert(matches(make('alpha1')),'All variables must still show genuine additional quantities');
  assert(field.includes("probe.dataset.autoinit='1'"),'Field must not auto-filter away a second generated history');
  const controls=dataHtml.slice(dataHtml.indexOf('function refreshTimeSeriesControls('),dataHtml.indexOf('function profileMatchesSelection('));
  assert(controls.includes("const secondVars=vars.filter(f=>f.canonical!==vSel.value)"),'Variable 2 must exclude selected primary');
  assert(controls.includes("sSel.disabled=!vSel.value||secondVars.length===0"),'Variable 2 must be optional');
  assert(controls.includes("s.field.canonical===sSel.value"),'Selected second variable must enter the actual plot set');
});


test('Solver Logs retain real curves when time/subiteration playback has too few samples',()=>{
  const start=dataHtml.indexOf('function startLogPlayback(mode){');
  const end=dataHtml.indexOf('function alphaProfileSeries(){',start);
  assert(start>=0&&end>start,'Solver Logs playback implementation missing');
  const source=dataHtml.slice(start,end);
  const run=new Function('mode','times','members',[
    "let logAnimationPlaying=false,logAnimationMode=null,logEvolutionActive=true,logEvolutionSeries=['stale'],logEvolutionMemberLimit=3,activeId=11,pinnedPoints=['p'];",
    "let issue='',draws=0;",
    "const stopLogAnimation=()=>{logAnimationPlaying=false;logAnimationMode=null},stopProfileAnimation=()=>{},logAvailableTimes=()=>times,logAvailableMembers=()=>members,",
    "flSetIssue=(target,key)=>{issue=key},flClearIssue=()=>{},renderList=()=>{},updateMeta=()=>{},draw=()=>{draws++},renderDiagnosticCurrent=()=>{},",
    "syncLogTimeNavigator=()=>{},rebuildLogEvolutionSeries=()=>{logEvolutionSeries=['valid-frame']},startLogAnimationTimer=()=>{},tr=s=>s,$=()=>({value:'1',textContent:''});",
    source,
    "startLogPlayback(mode);return {active:logEvolutionActive,series:logEvolutionSeries,issue,draws,playing:logAnimationPlaying,mode:logAnimationMode};"
  ].join('\n'));
  for(const [mode,times,members] of [['time',[9.8],[0,1]],['subiter',[0,9.8],[0]]]){
    const result=run(mode,times,members);
    assert.equal(result.active,false,mode+' insufficient-sample playback must not hide raw log curves');
    assert.deepStrictEqual(result.series,[],mode+' cannot retain a stale synthetic log evolution');
    assert.equal(result.issue,'insufficient-samples');
    assert.equal(result.draws,1,'The original log view must redraw when playback is rejected');
    assert.equal(result.playing,false);
    assert.equal(result.mode,null);
  }
  const valid=run('time',[0,9.8],[0,1]);
  assert.equal(valid.active,true,'Valid physical-time log playback must remain available');
  assert.equal(valid.playing,true);
  assert.deepStrictEqual(valid.series,['valid-frame']);
  const memberStart=dataHtml.indexOf('function logAvailableMembers(){');
  const memberEnd=dataHtml.indexOf('function syncLogNavigator(){',memberStart);
  assert(memberStart>=0&&memberEnd>memberStart,'Log member inference missing');
  const members=new Function('logPlaybackSourceSeries',dataHtml.slice(memberStart,memberEnd)+';return logAvailableMembers();')(
    ()=>[{caseId:1,logSubIter:null},{caseId:2,logSubIter:''}]);
  assert.deepStrictEqual(members,[],'Missing subiteration metadata must not become invented member zero');
});

test('Profile histories reject blank XYZ coordinates and missing physical times',()=>{
  const start=field.indexOf('function fwProfileSeriesAll(){'),end=field.indexOf('function fwRefreshProfileTsSlot(',start);
  assert(start>=0&&end>start,'Field profile time-history selectors missing');
  const data=[
    {datasetType:'profile',profileTime:0},{datasetType:'profile',profileTime:9.8},
    {datasetType:'profile',profileTime:null},{datasetType:'profile',profileTime:''},
    {datasetType:'profile',profileTime:NaN},{datasetType:'log',profileTime:1}
  ];
  let position='';
  const controls=new Function('series','datasetTypeOf','document',field.slice(start,end)+
    ';return {getProfiles:fwProfileSeriesAll,selection:fwProfileTsSelection};')(
    data,s=>s.datasetType,
    {getElementById:id=>({value:id==='fwTsProfilePosition1'?position:id==='fwTsProfileCase1'?'1':id==='fwTsProfileSet1'?'set':id==='fwTsProfileField1'?'T':'line'})}
  );
  assert.deepStrictEqual(controls.getProfiles().map(s=>s.profileTime),[0,9.8],
    'Absent physical time must not be mistaken for an OpenFOAM t=0 field');
  assert(Number.isNaN(controls.selection(1).position),'Blank sampled profile position must fail closed');
  position='0';
  assert.equal(controls.selection(1).position,0,'Real physical position zero must remain selectable');
  position='0.25';
  assert.equal(controls.selection(1).position,0.25);
  position='not-a-coordinate';
  assert(Number.isNaN(controls.selection(1).position),'Invalid coordinate must not produce a curve');
  assert(field.includes("if(!Number.isFinite(q.position))throw new Error(fwUi("),
    'Missing spatial coordinate must report an actionable error instead of an empty plot');
  assert(field.includes('if(!Number.isFinite(t))continue;const pairs=playbackSpatialPairs(rows[i])'),
    'Profile history time-axis must reject nonfinite time entries before sampling');
});

test('Data field histories reject false OpenFOAM t=0 in Probe, statistics and spatial-profile curves',()=>{
  const begin=field.indexOf('function fwPhysicalTime('),end=field.indexOf('function fwAdoptFieldNode(',begin);
  assert(begin>=0&&end>begin,'Canonical Data physical-time validator missing');
  const actual=new Function('window',field.slice(begin,end)+';return {one:fwPhysicalTime,times:fwPhysicalTimes};')({});
  assert(Number.isNaN(actual.one(null)));
  assert(Number.isNaN(actual.one('')));
  assert(Number.isNaN(actual.one(false)));
  assert(Number.isNaN(actual.one(undefined)));
  assert(Number.isNaN(actual.one('not-a-time')));
  assert.equal(actual.one('0'),0,'Explicit OpenFOAM t=0 must remain usable');
  assert.equal(actual.one('9.8'),9.8);
  assert.deepStrictEqual(actual.times([null,'',false,undefined,NaN,'bad','0',9.8,'9.8',3,3]),[0,3,9.8],
    'Missing, duplicate and malformed physical timestamps must never add fictitious chart points');
  const runtime=new Function('window',field.slice(begin,end)+';return fwPhysicalTimes;')({
    FoamLensRegionScene:{physicalTime:v=>v==='valid'?4.2:NaN}});
  assert.deepStrictEqual(runtime(['bad','valid',null]),[4.2],
    'Data must consume the same public OpenFOAM physical-time resolver as Field when available');
  const occurrences=field.split('fwPhysicalTimes(group.times)').length-1;
  assert.equal(occurrences,2,'Probe histories and overall 3D field time series must both use strict time validation');
  assert(field.includes('Number.isFinite(fwPhysicalTime(s.profileTime))'),
    'Profile history discovery must filter missing/invalid physical timestamps');
  assert(field.includes('const t=fwPhysicalTime(rows[i].profileTime)'),
    'Profile history sampling must not coerce null or empty time metadata to zero');
  assert(field.includes('if(!times.length)throw new Error(fwUi('),
    'Missing OpenFOAM physical times must produce a meaningful error rather than an empty plotted curve');
});

test('Data two-curve histories commit atomically after successful OpenFOAM reads, never blanking previous plots',()=>{
  const begin=field.indexOf('function fwCommitFieldHistoryDrafts(');
  const end=field.indexOf('function fw3DProfileStatus(',begin);
  assert(begin>0&&end>begin,'Missing real atomic Data history commit implementation');
  const code=field.slice(begin,end);
  const run=async (scenario)=>{
    const old={id:4,datasetType:'timeseries',derivedKind:'field_history_workspace',fieldHistoryKey:'probeA',
      t:[0,9.8],y:[1420,1460],color:'#336699',visible:true,customLabel:'old label'};
    const unrelated={id:5,datasetType:'timeseries',fieldHistoryKey:'other',visible:true,t:[0],y:[12]};
    const state={active:true,companion:'timeseries',fieldTsSeq:1,fieldTsKeys:new Set()};
    const series=[old,unrelated],status=[];
    const controls={
      timeSeriesVariable:{dataset:{},options:[{value:'probeA'},{value:'probeB'}],value:''},
      timeSeriesVariable2:{options:[{value:'probeA'},{value:'probeB'}],value:'',disabled:true},
      timeSeriesProbe:{dataset:{},value:'x'},timeSeriesFamily:{value:'x'},
      fwPlotEmpty:{classList:{add(){}}}
    };
    let nextId=9,refresh=0;
    const env=new Function('env',
      'const fwState=env.state,series=env.series;let nextId=env.nextId;'+
      'const fwFieldTsSetStatus=(s,error)=>env.status.push({s,error});'+
      'const fwUi=x=>x,fwBuildOneFieldHistory=env.build;'+
      'const automaticSeriesColor=env.color;'+
      'const refreshDatasetControls=()=>env.refreshed();'+
      'const refreshTimeSeriesControls=()=>env.refreshed();'+
      'const renderList=()=>{},updateMeta=()=>{},draw=()=>{};'+
      'const document={getElementById:id=>env.controls[id]||null};'+
      'const console={error:()=>{}};'+code+
      ';return {run:fwBuildFieldTimeSeries,commit:fwCommitFieldHistoryDrafts,next:()=>nextId};')({
        state,series,nextId,controls,status,refreshed:()=>{refresh++},color:()=> '#ffcc00',
        build:async slot=>{
          if(slot===1)return {datasetType:'timeseries',derivedKind:'field_history_workspace',
            fieldHistoryKey:'probeA',field:{canonical:'probeA'},t:[0,9.8],y:[1500,1600],visible:true};
          if(scenario==='error')throw new Error('mold field unavailable at t=9.8 s');
          if(scenario==='cancel'){state.fieldTsSeq++;return null}
          if(scenario==='empty')return null;
          return {datasetType:'timeseries',derivedKind:'field_history_workspace',
            fieldHistoryKey:'probeB',field:{canonical:'probeB'},t:[0,9.8],y:[301,303],visible:true}
        }
      });
    let failure=null;
    try{await env.run()}catch(e){failure=e}
    return {old,unrelated,series,state,env,refresh,status,failure}
  };
  // Async assertions are run in a child Node process so a rejected scientific
  // field read exits nonzero and can never be mistaken for a passed sync test.
  const {execFileSync}=require('node:child_process');
  const runner='const assert=require("node:assert/strict");'+
    'const code='+JSON.stringify(code)+';'+
    'const run='+run.toString()+';'+
    '(async()=>{'+
    'const bad=await run("error");'+
    'assert.match(bad.failure?.message||"",/mold field unavailable/);'+
    'assert.deepEqual(bad.old.y,[1420,1460]);assert.equal(bad.old.visible,true);'+
    'assert.equal(bad.series.length,2);assert.equal(bad.refresh,0);assert.equal(bad.env.next(),9);'+
    'const cancelled=await run("cancel");'+
    'assert.equal(cancelled.old.visible,true);assert.deepEqual(cancelled.old.y,[1420,1460]);'+
    'assert.equal(cancelled.series.length,2);assert.equal(cancelled.env.next(),9);'+
    'const success=await run("success");'+
    'assert.equal(success.failure,null);assert.equal(success.series.length,3);'+
    'assert.deepEqual(success.old.y,[1500,1600]);assert.equal(success.old.color,"#336699");'+
    'assert.equal(success.old.customLabel,"old label");assert.equal(success.old.visible,true);'+
    'assert.equal(success.unrelated.visible,true);assert.deepEqual(success.unrelated.y,[12]);'+
    'assert.equal(success.series[2].id,9);assert.equal(success.series[2].color,"#ffcc00");'+
    'assert.equal(success.series[2].visible,true);assert.equal(success.env.next(),10);'+
    'assert.equal(success.state.fieldTsKeys.size,2);'+
    'const noSecond=await run("empty");assert.equal(noSecond.series.length,2);'+
    'assert.equal(noSecond.old.visible,true);assert.deepEqual(noSecond.old.y,[1500,1600]);'+
    '})().catch(e=>{console.error(e);process.exitCode=1});';
  execFileSync(process.execPath,['-e',runner],{encoding:'utf8',timeout:15000});
  assert(field.includes('const drafts=[];')&&field.includes('const built=fwCommitFieldHistoryDrafts(drafts);'),
    'Both OpenFOAM curves must be staged before the single UI commit');
  for(const name of ['fwBuildProbeFieldHistory','fwBuildProfileHistory','fwBuildOneFieldHistory']){
    const start=field.indexOf('async function '+name+'(');
    const end=field.indexOf('\n}',start);
    const producer=field.slice(start,end+2);
    assert(!producer.includes('series.push(')&&!producer.includes('nextId++'),
      'A cancelled scientific history producer must never mutate visible graph data: '+name)
  }
});

test('Field/Data time badge and synchronization use measured OpenFOAM timestamps only',()=>{
  const a=field.indexOf('function fwPhysicalTime('),b=field.indexOf('function fwAdoptFieldNode(',a),
    c=field.indexOf('function fwUpdateTimeBadge()'),d=field.indexOf('function fwUpdateViewCount()',c);
  assert(a>=0&&b>a&&c>=0&&d>c,'Missing actual physical-clock or badge/sync implementation');
  const state={companion:'profile',active:true,syncTime:true};
  const inputs={
    fwPlotTime:{textContent:''},profileTimeInput:{value:''},profileTime:{value:''},
    logCurrentTime:{value:''}
  };
  const pushed=[],logUpdates=[],window={};
  const api=new Function('state','inputs','window','pushed','logUpdates',
    'const fwState=state,document={getElementById:id=>inputs[id]||null};'+
    "const fvFmt=String,fwUi=en=>en,console={warn:()=>{}};"+
    "const profileOptionsBase=()=>[1],logContextOptionsBase=()=>[1];"+
    "const applyProfileTimeValue=t=>pushed.push(t),logAvailableTimes=()=>[null,'',false,0,9.8];"+
    "const nearestValue=(times,at)=>times.reduce((best,t)=>best==null||Math.abs(t-at)<Math.abs(best-at)?t:best,null);"+
    "const syncLogTimeNavigator=t=>logUpdates.push(t);"+
    field.slice(a,b)+field.slice(c,d)+
    ';return {badge:fwUpdateTimeBadge,sync:fwSyncCompanionTime};')(
      state,inputs,window,pushed,logUpdates);
  api.badge();
  assert.equal(inputs.fwPlotTime.textContent,'—','Missing profile time must not appear as t=0 s');
  inputs.profileTimeInput.value=' ';inputs.profileTime.value='';
  api.badge();assert.equal(inputs.fwPlotTime.textContent,'—');
  inputs.profileTimeInput.value='';inputs.profileTime.value='0';
  api.badge();assert.equal(inputs.fwPlotTime.textContent,'t = 0 s','Genuine physical t=0 remains valid');
  inputs.profileTimeInput.value='9.8';
  api.badge();assert.equal(inputs.fwPlotTime.textContent,'t = 9.8 s');
  for(const invalid of [null,undefined,'',false,NaN,'not-a-time'])api.sync(invalid);
  assert.deepStrictEqual(pushed,[],'Absent physical time cannot synchronize Data to an invented zero');
  api.sync('0');api.sync(9.8);
  assert.deepStrictEqual(pushed,[0,9.8]);
  state.companion='log';inputs.logCurrentTime.value='';
  api.badge();assert.equal(inputs.fwPlotTime.textContent,'—','Blank log time is not t=0');
  inputs.logCurrentTime.value='0';
  api.badge();assert.equal(inputs.fwPlotTime.textContent,'t = 0 s');
  api.sync('9.8');assert.deepStrictEqual(logUpdates,[9.8]);
  api.sync(null);assert.deepStrictEqual(logUpdates,[9.8]);
  assert(field.includes('fwPhysicalTimes(logAvailableTimes())'),
    'Log clock must filter invalid physical samples before nearest-time selection');
});

test('A–B OpenFOAM line profile never fabricates a physical timestamp',()=>{
  const start=field.indexOf('function fwBuild3DLineProfile('),
    end=field.indexOf('function fwSet3DProfileLine(',start);
  assert(start>=0&&end>start,'Missing true 3D line profile builder');
  const fnCode=field.slice(start,end);
  const build=env=>new Function('env',
    'const fwLineProfileState=env.lineState,fvState=env.fvState,series=env.series;let nextId=env.nextId;'+
    "const document={getElementById:id=>id==='fw3DProfileSamples'?{value:'20'}:null};"+
    "const fwCurrent3DProfileField=()=>env.info,fwSampleFieldAtPoint=()=>({value:303.063,distance:0});"+
    'const fw3DProfileStatus=(text,error)=>env.status.push({text,error}),fwUi=en=>en,fwPhysicalTime=env.physicalTime;'+
    'const fvFmt=String,automaticSeriesColor=()=>"#0077aa";'+
    'const refreshDatasetControls=()=>{},console={warn:()=>{}};'+
    fnCode+';return {build:fwBuild3DLineProfile,next:()=>nextId};')(env);
  const make=time=>{
    const env={lineState:{a:[0,0,0],b:[1,0,0],seriesId:null},
      fvState:{mesh:{cellCount:1},fieldValues:[303.063],fieldStorage:'volume',time,region:'metal'},
      series:[],nextId:12,status:[],
      info:{caseObj:{id:1,name:'QuickCup',dash:'solid'},name:'T',component:'value',
        field:{canonical:'field3d:T',display:'T',unit:'K',quantity:'temperature'}},
      physicalTime:raw=>(typeof raw==='number'||typeof raw==='string')&&String(raw).trim()!==''&&
        Number.isFinite(Number(raw))?Number(raw):NaN};
    return {env,api:build(env)}
  };
  for(const invalid of [null,undefined,'',false,NaN]){
    const x=make(invalid);
    assert.equal(x.api.build({select:false}),null);
    assert.equal(x.env.series.length,0,'Invalid time cannot create measured line-profile series');
    assert.equal(x.api.next(),12,'Invalid time must not consume a curve ID');
    assert(x.env.status.at(-1)?.error,'Invalid time must report an actionable error');
  }
  for(const valid of ['0',9.8]){
    const x=make(valid),item=x.api.build({select:false});
    assert(item&&item.profileTime===Number(valid));
    assert.equal(x.env.series.length,1);
    assert.equal(x.api.next(),13);
    assert.equal(item.y.length,20);
  }
});

test('Temperature-at-probe sampling uses correct cell values and finite geometric bounds',()=>{
  const start=field.indexOf('function fwNearestFlatIndex('),end=field.indexOf('function fwProfileSeriesAll()',start);
  assert(start>=0&&end>start,'Physical field sampling path missing');
  const sample=new Function('fvInsideBounds','fvMeshFacePoints',field.slice(start,end)+';return fwSampleFieldAtPoint;')(
    (p,min,max)=>p.every((v,i)=>v>=min[i]&&v<=max[i]),()=>[]);
  const mesh={boundsMin:[0,0,0],boundsMax:[1,1,1],cellCount:2,
    cellCenters:[0.2,0.2,0.2,0.8,0.8,0.8],pointCount:2,points:[0,0,0,1,1,1]};
  const data={mesh,storage:'volume',fieldValues:[1417.57,1481.9]};
  assert.equal(sample(data,[0.15,0.15,0.15]).value,1417.57);
  assert.equal(sample(data,[0.9,0.9,0.9]).value,1481.9);
  assert(Number.isNaN(sample(data,[1.5,0.5,0.5]).value),
    'A probe outside the physical region must not fabricate a temperature');
  assert.equal(sample({...data,storage:'point',fieldValues:[1200,1300]},[0.9,0.9,0.9]).value,1300);
});
