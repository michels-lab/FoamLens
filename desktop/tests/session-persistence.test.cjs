'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const session=fs.readFileSync(path.join(base,'v23-session-state.js'),'utf8');
const plots=fs.readFileSync(path.join(base,'v14-zy-plot-surfaces.js'),'utf8');
const fieldUx=fs.readFileSync(path.join(base,'v17-workspace-ux.js'),'utf8');
const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');

new Function(session);new Function(plots);new Function(fieldUx);

const passed=[],pending=[];
function test(name,fn){
  const result=fn();
  if(result&&typeof result.then==='function')pending.push(result.then(()=>passed.push(name)));
  else passed.push(name)
}

test('session state persists top-level mode context plots and Field state',()=>{
  for(const token of [
    "const flSessionKey='foamlens.session.v1'",
    'activeMode:String(activeAppMode',
    'context:flSessionContextSnapshot()',
    'plots:window.FoamLensPlotSurfaces?.serialize?.()',
    'field:window.FoamLensWorkspaceUx?.getState?.()',
    'fieldSelection:flSessionFieldSelectionSnapshot()',
    'localStorage.setItem(flSessionKey'
  ])assert(session.includes(token),'Missing session persistence token: '+token);
});

test('saved context is keyed by stable case identity instead of numeric runtime id',()=>{
  for(const token of [
    "caseRoot:String(c?.rootPath||'')",
    "caseName:String(c?.name||'')",
    "String(c?.rootPath||'')===root",
    "String(c?.name||'')===name"
  ])assert(session.includes(token),'Missing stable case identity token: '+token);
  assert(!session.includes('caseId:activeContextCaseId'),'Session persistence stores transient case ids.');
});

test('session waits for workspace data before restoring navigation',()=>{
  for(const token of [
    'function flSessionHasWorkspaceData()',
    "if(!force&&!flSessionHasWorkspaceData())return false",
    "if(!flSessionHasWorkspaceData())return false",
    "MutationObserver(()=>{if(flSessionPending)flSessionTryRestore()})"
  ])assert(session.includes(token),'Missing deferred restore token: '+token);
});

test('session context restore is lightweight and cannot recursively refresh Review',()=>{
  assert(session.includes("{source:'session-restore',apply:false}"),
    'Session restore still triggers the full context-refresh pipeline.');
  assert(session.includes("if(currentDataView==='catalog')renderDataCatalog();else draw()"),
    'Session restore has no lightweight final render refresh.');
  assert(program.includes("{source:'session-smoke',apply:false}"),
    'Packaged session smoke still triggers full context effects.');
  assert(program.includes("{source:'session-smoke-mutate',apply:false}"),
    'Packaged session mutation still triggers full context effects.');
});

test('Field mode restore fails safely to Data when no compatible 3D case exists',()=>{
  assert(session.includes("if(mode==='field')"));
  assert(session.includes("if(!cases.some(c=>fvCaseViewAvailable(c)))return'data'"));
});

test('plot surface persistence uses stable series workspace keys',()=>{
  for(const token of [
    'function flPlotSurfaceSerialize()',
    'function flPlotSurfaceHydrate(payload',
    'seriesWorkspaceKey(item)',
    'seriesKey:flPlotSurfaceSeriesKey(p.seriesId)',
    'activeSeriesKey:flPlotSurfaceSeriesKey(state.activeId)',
    'flPlotSurfaceSeriesId(p.seriesKey)'
  ])assert(plots.includes(token),'Missing stable plot persistence token: '+token);
});

test('Field Inspector and full Field layout join the persisted session',()=>{
  assert(fieldUx.includes("inspector:typeof fwState!=='undefined'?!!fwState.inspector:false"));
  assert(fieldUx.includes('async function uxApplyState(saved)'));
  assert(fieldUx.includes("setInspector?.(!!saved.inspector)"));
  assert(fieldUx.includes("setInspector?.(false)"));
  assert(fieldUx.includes('applyState:uxApplyState'));
  assert(session.includes("FoamLensWorkspaceUx?.applyState?.(payload.field)"));
});

test('3D Field selection and physical time are persisted and restored asynchronously',()=>{
  for(const token of [
    'function flSessionFieldSelectionSnapshot()',
    "fieldName:String(field?.value||fvState?.fieldName||'')",
    "component:String(component?.value||fvState?.component||'value')",
    'time:Number.isFinite(time)?time:null',
    'function flSessionRestoreFieldSelection(saved)',
    'fvRefreshSelectors(false)',
    'await fvLoadFrame(index)',
    'whenRestored:()=>flSessionLastRestorePromise'
  ])assert(session.includes(token),'Missing persisted 3D Field selection token: '+token);
  assert(program.includes("if(typeof ss.whenRestored==='function')await ss.whenRestored()"),
    'Packaged smoke validates Field state before asynchronous session restore finishes.');
});

test('packaged runtime smoke round-trips persisted session state',()=>{
  for(const token of [
    'sessionRestored',
    'sessionStoredSchema',
    'sessionStoredMode',
    'sessionRestoredMode',
    'sessionRestoredCaseId',
    'sessionRestoredRegion',
    'sessionStoredDataView',
    'sessionRestoredDataView',
    'sessionInspectorRestored',
    'sessionFieldViewRestored',
    'sessionFieldCompanionRestored',
    'cross-session state round-trip smoke failed'
  ])assert(program.includes(token),'Missing packaged persistence smoke token: '+token);
});

test('packaged persistence smoke cleans its temporary Inspector state before final 3D focus validation',()=>{
  const cleanup=/persistence smoke intentionally opens\/restores the Inspector[\s\S]{0,700}setView\?\.\('3d'\);[\s\S]{0,350}setInspector\?\.\(false\)/;
  assert(cleanup.test(program),
    'Packaged persistence smoke leaks its temporary Inspector/view state into the final 3D focus assertion.');
});

test('session saves on navigation context plot interaction and application close',()=>{
  for(const token of [
    'flSessionPatchNavigation()',
    "'foamlens-context-change'",
    "'foamlens-plot-state-change'",
    "'foamlens-plot-surface-change'",
    "'foamlens-field-view-change'",
    "window.addEventListener('beforeunload',flSessionSaveNow)",
    "window.addEventListener('pagehide',flSessionSaveNow)"
  ])assert(session.includes(token),'Missing save trigger: '+token);
});


test('G59c native installed persistence: original saved Catalog survives field-mode restore navigation',()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  assert(begin>=0&&end>begin,'original session restore function missing');
  const make=new Function('window','flSessionHasWorkspaceData','flSessionRestoring',
    'cases','flSessionFindCase','flSessionSafeMode','setAppMode',
    'flSessionLastRestorePromise','renderList','updateMeta','currentDataView',
    'renderDataCatalog','draw','document','CustomEvent','flSessionContextSnapshot','activeAppMode','console','flSessionRestoreGeneration',
    session.slice(begin,end)+';return flSessionRestoreSnapshot');
  const state={dataView:'timeseries',mode:'analysis',hydrations:0,navs:0};
  const win={FoamLensPlotSurfaces:{
    hydrate(payload,options){
      assert.equal(options.activate,false);
      state.hydrations++;
      state.dataView=payload.surfaces.data.view;
      return true
    },
    activate(){throw new Error('Field mode must not switch to Data or Analysis')}
  }};
  const navigate=mode=>{
    state.navs++;
    state.mode=mode;
    // Reproduce the native installed G59c old failure: setAppMode('field')
    // changes/captures the live current surface, replacing Catalog with Time Series.
    state.dataView='timeseries'
  };
  const restore=make(win,()=>true,false,[],()=>null,mode=>mode,navigate,
    Promise.resolve(false),()=>{},()=>{},'timeseries',()=>{},()=>{},
    {dispatchEvent:()=>{}},class{constructor(type,options){this.type=type;this.detail=options.detail}},
    ()=>({}),'field',console,0);
  const payload={activeMode:'field',plots:{schema:1,surfaces:{
    data:{view:'catalog'},analysis:{view:'timeseries'},field:{view:'profile'}}}};
  assert.equal(restore(payload,{force:true}),true);
  assert.equal(state.navs,1);
  assert.equal(state.hydrations,1,'avoid duplicated state hydration');
  assert.equal(state.dataView,'catalog',
    'previous native failure: stored Catalog must NOT become Time Series during Field restore');
  assert(program.includes('savedDataViewEqualsRestored='),
    'native session failure must report a bounded equality flag');
  assert(!program.includes('cross-session state round-trip smoke failed: {realCaseJson}'),
    'private OpenFOAM values and paths must never appear in public CI session-failure logs');
});

test('G60 native regression: asynchronous Field load must not overwrite saved inactive Data Catalog',async()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  assert(begin>=0&&end>begin,'original session restore implementation missing');
  const make=new Function('window','flSessionHasWorkspaceData','flSessionRestoring',
    'cases','flSessionFindCase','flSessionSafeMode','setAppMode',
    'flSessionLastRestorePromise','renderList','updateMeta','currentDataView',
    'renderDataCatalog','draw','document','CustomEvent','flSessionContextSnapshot','activeAppMode','console',
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration',
    session.slice(begin,end)+';return {restore:flSessionRestoreSnapshot,whenRestored:()=>flSessionLastRestorePromise}');
  const state={dataView:'timeseries',hydrations:0};
  let completeFrame;
  const win={FoamLensPlotSurfaces:{
    hydrate(plots,{activate}){
      assert.strictEqual(activate,false,'restoration must not activate an unrelated plot');
      state.dataView=plots.surfaces.data.view;state.hydrations++;
    }
  }};
  const delayedFieldLoad=()=>new Promise(resolve=>{
    completeFrame=()=>{state.dataView='timeseries';resolve(true)}
  });
  const api=make(win,()=>true,false,[],()=>null,mode=>mode,
    ()=>{state.dataView='timeseries'},Promise.resolve(false),()=>{},()=>{},
    'timeseries',()=>{},()=>{},{dispatchEvent(){}},
    class{constructor(type,options){this.type=type;this.detail=options.detail}},
    ()=>({}),'field',console,delayedFieldLoad,0);
  const saved={activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{schema:1,surfaces:{data:{view:'catalog'},field:{view:'profile'}}}};
  assert.strictEqual(api.restore(saved,{force:true}),true);
  assert.strictEqual(state.dataView,'catalog','synchronous navigation/hydration must restore the Data plot');
  assert.strictEqual(state.hydrations,1);
  completeFrame(); // Reproduces a late original Field frame event clobbering the inactive Data plot.
  await api.whenRestored();
  assert.strictEqual(state.dataView,'catalog','G60: Data Catalog must remain restored after Field frame settles');
  assert.strictEqual(state.hydrations,2,'only one post-frame replay; do not repeatedly rehydrate');
});

Promise.all(pending).then(()=>{
  console.log('FoamLens v1.6 session persistence regression suite passed: '+passed.length+' checks.');
  for(const name of passed)console.log('  ✓ '+name);
}).catch(error=>{console.error(error);process.exitCode=1});
