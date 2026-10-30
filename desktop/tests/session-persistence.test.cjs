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
    'renderDataCatalog','draw','document','CustomEvent','flSessionContextSnapshot','activeAppMode','console','flSessionRestoreGeneration','flSessionLastReplayStatus',
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
    ()=>({}),'field',console,0,'idle');
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
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration','flSessionLastReplayStatus',
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
    ()=>({}),'field',console,delayedFieldLoad,0,'idle');
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


test('G63 stale asynchronous Field restore must not undo newer Data navigation',async()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  const make=new Function('window','flSessionHasWorkspaceData','flSessionRestoring',
    'cases','flSessionFindCase','flSessionSafeMode','setAppMode',
    'flSessionLastRestorePromise','renderList','updateMeta','currentDataView',
    'renderDataCatalog','draw','document','CustomEvent','flSessionContextSnapshot','activeAppMode','console',
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration','flSessionLastReplayStatus',
    session.slice(begin,end)+';return {restore:flSessionRestoreSnapshot,whenRestored:()=>flSessionLastRestorePromise,setMode:mode=>{activeAppMode=mode}}');
  const state={view:'timeseries',hydrations:0};
  let resolveFrame;
  const win={FoamLensPlotSurfaces:{hydrate(payload){
    state.hydrations++;state.view=payload.surfaces.data.view
  }}};
  const load=()=>new Promise(resolve=>{resolveFrame=()=>{state.view='timeseries';resolve(true)}});
  const api=make(win,()=>true,false,[],()=>null,mode=>mode,
    ()=>{state.view='timeseries'},Promise.resolve(false),()=>{},()=>{},'timeseries',
    ()=>{},()=>{},{dispatchEvent(){}},
    class{constructor(type,options){this.type=type;this.detail=options.detail}},
    ()=>({}),'field',console,load,0,'idle');
  assert.strictEqual(api.restore({activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{surfaces:{data:{view:'catalog'}}}},{force:true}),true);
  assert.strictEqual(state.view,'catalog');
  api.setMode('data');state.view='timeseries'; // Real user leaves Field and selects Time Series.
  resolveFrame();await api.whenRestored();
  assert.strictEqual(state.view,'timeseries','late Field callback must not overwrite a newer user choice');
  assert.strictEqual(state.hydrations,1,'no additional hydrate after leaving Field');
});

test('G63 stale asynchronous restore must not override a newer restore request',async()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  const make=new Function('window','flSessionHasWorkspaceData','flSessionRestoring',
    'cases','flSessionFindCase','flSessionSafeMode','setAppMode',
    'flSessionLastRestorePromise','renderList','updateMeta','currentDataView',
    'renderDataCatalog','draw','document','CustomEvent','flSessionContextSnapshot','activeAppMode','console',
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration','flSessionLastReplayStatus',
    session.slice(begin,end)+';return {restore:flSessionRestoreSnapshot,whenRestored:()=>flSessionLastRestorePromise}');
  const state={view:'timeseries',views:[]},finish=[];
  const win={FoamLensPlotSurfaces:{hydrate(payload){
    state.view=payload.surfaces.data.view;state.views.push(state.view)
  }}};
  const load=()=>new Promise(resolve=>finish.push(resolve));
  const api=make(win,()=>true,false,[],()=>null,mode=>mode,
    ()=>{state.view='timeseries'},Promise.resolve(false),()=>{},()=>{},'timeseries',
    ()=>{},()=>{},{dispatchEvent(){}},
    class{constructor(type,options){this.type=type;this.detail=options.detail}},
    ()=>({}),'field',console,load,0,'idle');
  const payload=view=>({activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{surfaces:{data:{view}}}});
  api.restore(payload('catalog'),{force:true});
  api.restore(payload('log'),{force:true});
  const latest=api.whenRestored();
  finish[0](true);await Promise.resolve();await Promise.resolve();
  assert.strictEqual(state.view,'log','older frame continuation cannot replay old Catalog');
  finish[1](true);await latest;
  assert.deepStrictEqual(state.views,['catalog','log','log'],'only latest restore may replay once');
});


test('G63b: original navigation wrapper invalidates a Field -> Data -> Field round-trip before late frame completion',async()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  const navBegin=session.indexOf('function flSessionPatchNavigation(){');
  const navEnd=session.indexOf('function flSessionInstall(){',navBegin);
  assert(begin>=0&&end>begin&&navBegin>=0&&navEnd>navBegin,'G63b actual navigation and restore functions are required');
  const factory=new Function('window','flSessionRestoreFieldSelection','document','CustomEvent','console',
    "let flSessionRestoring=false,flSessionRestoreGeneration=0,flSessionLastRestorePromise=Promise.resolve(false),flSessionLastReplayStatus='idle';"+
    "let activeAppMode='data',currentDataView='timeseries',cases=[];"+
    "let setAppMode=mode=>{activeAppMode=mode;currentDataView='timeseries'};"+
    "let setDataView=mode=>{currentDataView=mode};"+
    "const flSessionScheduleSave=()=>{};"+
    "const flSessionHasWorkspaceData=()=>true,flSessionSafeMode=mode=>mode,flSessionFindCase=()=>null;"+
    "const flSessionContextSnapshot=()=>({}),renderList=()=>{},updateMeta=()=>{},renderDataCatalog=()=>{},draw=()=>{};"+
    session.slice(begin,end)+session.slice(navBegin,navEnd)+
    ";flSessionPatchNavigation();return {restore:flSessionRestoreSnapshot,navigate:mode=>setAppMode(mode),"+
    "whenRestored:()=>flSessionLastRestorePromise,mode:()=>activeAppMode,generation:()=>flSessionRestoreGeneration};");
  const state={view:'timeseries',hydrations:[]};let finish;
  const api=factory({FoamLensPlotSurfaces:{hydrate(snapshot){
    state.view=snapshot.surfaces.data.view;
    state.hydrations.push(state.view)
  }}},()=>new Promise(resolve=>{finish=()=>{state.view='timeseries';resolve(true)}}),
  {dispatchEvent(){}},class{constructor(type,options){this.type=type;this.detail=options.detail}},console);
  assert.strictEqual(api.restore({activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{surfaces:{data:{view:'catalog'}}}},{force:true}),true);
  assert.strictEqual(api.mode(),'field');
  assert.strictEqual(api.generation(),1);
  api.navigate('data');
  api.navigate('field');
  assert.strictEqual(api.mode(),'field','returning to Field alone is not permission for stale saved state');
  assert.strictEqual(api.generation(),3,'both real user navigations must invalidate original frame replay');
  finish();
  await api.whenRestored();
  assert.deepStrictEqual(state.hydrations,['catalog'],'a stale original Field load must not restore Catalog after returning to Field');
  assert.strictEqual(state.view,'timeseries');
});


test('G64 privacy-safe native session mismatch diagnostics are bounded booleans, not original case data',()=>{
  assert(session.includes("flSessionLastReplayStatus='pending'"));
  for(const decision of ["'no-plots'","'superseded'","'mode-changed'","'no-field'"])
    assert(session.includes("flSessionLastReplayStatus="+decision),'missing bounded replay decision '+decision);
  assert(session.includes("flSessionLastReplayStatus=restoringField?'applied':'applied-no-field'"),
    'only a genuinely attempted Field frame may report standard applied; skipped frame must be distinct');
  assert(session.includes("replayStatus:()=>flSessionLastReplayStatus"));
  assert(program.includes("sessionReplayStatus:String(ss.replayStatus?.()||'unavailable')"));
  for(const flag of ["; savedCatalog=","; restoredCatalog=","; restoredTimeSeries=",
    "; replayApplied=","; replaySuperseded=","; replayModeChanged=",
    "; replayNoField=","; replayPending=","; replayNoPlots=",
    "; replayUnavailable=","; fieldSelectionPresent=","; restoredModeField="])
    assert(program.includes(flag),'missing original native sanitized failure flag: '+flag);
  const start=program.indexOf('"FoamLens cross-session state round-trip smoke failed; sanitized "');
  const end=program.indexOf('if (!data.TryGetProperty("fieldRibbonVisible"',start);
  assert(start>=0&&end>start,'native failure message not found');
  const failureMessageSource=program.slice(start,end);
  assert(!failureMessageSource.includes('realCaseJson'),'native fail path must not leak private QuickCup blob');
  assert(!failureMessageSource.includes('sessionSmokeErrorNode.GetString()'),'no raw JS exception in public error message');
});


test('G67: a skipped original Field frame is distinguishable from a pending restoration',()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  const make=new Function('window','flSessionHasWorkspaceData','flSessionRestoring','cases',
    'flSessionFindCase','flSessionSafeMode','setAppMode','flSessionLastRestorePromise',
    'renderList','updateMeta','currentDataView','renderDataCatalog','draw',
    'document','CustomEvent','flSessionContextSnapshot','activeAppMode','console',
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration','flSessionLastReplayStatus',
    session.slice(begin,end)+
    ';return {restore:flSessionRestoreSnapshot,status:()=>flSessionLastReplayStatus,awaited:()=>flSessionLastRestorePromise}');
  let preservedView='timeseries';
  const win={FoamLensPlotSurfaces:{hydrate:stored=>{preservedView=stored.surfaces.data.view},
    activate:()=>true}};
  const api=make(win,()=>true,false,[],()=>null,()=> 'data',
    ()=>{},Promise.resolve(false),()=>{},()=>{},'timeseries',()=>{},()=>{},
    {dispatchEvent(){}},class{constructor(type,opt){this.type=type;this.detail=opt.detail}},
    ()=>({}),'data',console,()=>Promise.resolve(true),0,'idle');
  const snapshot={activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{surfaces:{data:{view:'catalog'}}}};
  assert.strictEqual(api.restore(snapshot,{force:true}),true);
  assert.strictEqual(api.status(),'no-field','safe-mode fallback must be explicit in diagnostics');
  assert.strictEqual(preservedView,'catalog','saved Data view stays physically restored');
});


test('G67 same-failure: Data Catalog returns after renderer clobbers a safe-mode Field fallback',async()=>{
  const begin=session.indexOf('function flSessionRestoreSnapshot(payload,{force=false}={}){');
  const end=session.indexOf('function flSessionTryRestore(){',begin);
  const factory=new Function('window','flSessionHasWorkspaceData','flSessionRestoring','cases',
    'flSessionFindCase','flSessionSafeMode','setAppMode','flSessionLastRestorePromise',
    'renderList','updateMeta','currentDataView','renderDataCatalog','draw',
    'document','CustomEvent','flSessionContextSnapshot','activeAppMode','console',
    'flSessionRestoreFieldSelection','flSessionRestoreGeneration','flSessionLastReplayStatus',
    session.slice(begin,end)+';return {restore:flSessionRestoreSnapshot,done:()=>flSessionLastRestorePromise,status:()=>flSessionLastReplayStatus}');
  const runtime={view:'timeseries',hydrates:0,frames:0};
  const win={FoamLensPlotSurfaces:{
    hydrate(stored){runtime.view=stored.surfaces.data.view;runtime.hydrates++},
    activate(){return true}
  }};
  const api=factory(win,()=>true,false,[],()=>null,()=> 'data',()=>{},
    Promise.resolve(false),()=>{runtime.view='timeseries'},()=>{},'timeseries',
    ()=>{},()=>{}, {dispatchEvent(){}},
    class{constructor(type,opt){this.type=type;this.detail=opt.detail}},
    ()=>({}),'data',console,()=>{runtime.frames++;return Promise.resolve(true)},0,'idle');
  assert.strictEqual(api.restore({activeMode:'field',fieldSelection:{fieldName:'T',time:9.8},
    plots:{surfaces:{data:{view:'catalog'}}}},{force:true}),true);
  assert.strictEqual(runtime.view,'timeseries','original UI renderer replays Time Series after immediate hydration');
  assert.strictEqual(api.status(),'no-field');
  await api.done();
  assert.strictEqual(runtime.view,'catalog','post-render replay must restore original Catalog without a fake Field frame');
  assert.strictEqual(runtime.hydrates,2,'exactly one immediate and one protected post-render hydration');
  assert.strictEqual(runtime.frames,0,'must NOT load a frame when Field is incompatible');
  assert.strictEqual(api.status(),'applied-no-field');
});


test('G68: packaged native session smoke exports truthful fresh-save and replay flags to C#',()=>{
 const start=program.indexOf("  let sessionSmoke=null,sessionSmokeError='';");
 const end=program.indexOf("  // The persistence smoke intentionally",start);
 assert(start>=0&&end>start,'require original native source session smoke');
 const smoke=program.slice(start,end);
 for(const token of [
   "sessionReplayApiPresent=typeof ss.replayStatus==='function'",
   "sessionSavedFresh=ss.save()===true",
   "sessionSavedFieldSelectionPresent=!!(stored&&Object.prototype.hasOwnProperty.call(stored,'fieldSelection'))",
   "if(!sessionSavedFresh)throw new Error(",
   "if(!stored||!sessionSavedFieldSelectionPresent)"
 ])assert(smoke.includes(token),'fresh native snapshot condition missing: '+token);
 const resultBlock=program.slice(program.indexOf("    sessionStoredDataView:String(sessionSmoke?.storedDataView"),
                                   program.indexOf("  // The persistence smoke intentionally"));
 for(const token of [
   "sessionReplayStatus:String(sessionSmoke?.sessionReplayStatus||'unavailable')",
   "sessionSavedFresh,",
   "sessionReplayApiPresent,",
   "sessionStoredFieldSelectionPresent:sessionSavedFieldSelectionPresent,"
 ])assert(resultBlock.includes(token),'diagnostic must actually cross native JSON boundary: '+token);
 for(const token of [
   '!sessionSavedFreshNode.GetBoolean()',
   '!sessionReplayApiNode.GetBoolean()',
   '!sessionSelectionNode.GetBoolean()',
   '"savedFresh=" +',
   '"; replayApiPresent=" +'
 ])assert(program.includes(token),'C# must fail closed if fresh fields are missing: '+token);
});
test('G68: actual native smoke save loop rejects old snapshots and waits for a real accepted save',async()=>{
 const start=program.indexOf("    if(typeof ss.whenRestored==='function')await ss.whenRestored();");
 const end=program.indexOf("    const storedDataView=String(stored?.plots",start);
 assert(start>=0&&end>start,'native current snapshot flow missing');
 const AsyncFunction=(async()=>{}).constructor;
 const code=program.slice(start,end);
 const make=new AsyncFunction('ss','wait',
   "let sessionSavedFresh=false,sessionSavedFieldSelectionPresent=false;" +
   "const setTimeout=(fn,ms)=>wait(fn,ms);" +
   code+
   "return {sessionSavedFresh,sessionSavedFieldSelectionPresent,stored};");
 const fresh={schema:1,fieldSelection:{fieldName:'T',time:9.8},
   plots:{surfaces:{data:{view:'catalog'}}}};
 let tries=0,reads=0,settled=false;
 const ss={
   whenRestored:async()=>{settled=true},
   save:()=>{assert(settled,'must first await previous restoration');return ++tries>=3},
   load:()=>{reads++;return fresh}
 };
 const good=await make(ss,fn=>fn());
 assert.strictEqual(tries,3,'must retry guarded save rather than silently read an old session');
 assert.strictEqual(reads,1,'read only after a successful native save');
 assert.strictEqual(good.stored,fresh);
 assert.strictEqual(good.sessionSavedFresh,true);
 assert.strictEqual(good.sessionSavedFieldSelectionPresent,true);
 let staleReads=0;
 await assert.rejects(make({save:()=>false,load:()=>{staleReads++;return fresh}},fn=>fn()),
   /Guarded session save could not settle/);
 assert.strictEqual(staleReads,0,'an old WebView2 snapshot must never masquerade as freshly persisted');
 await assert.rejects(make({save:()=>true,load:()=>({schema:1,plots:{}})},fn=>fn()),
   /Fresh session snapshot is missing the original Field selection/);
});

Promise.all(pending).then(()=>{
  console.log('FoamLens v1.6 session persistence regression suite passed: '+passed.length+' checks.');
  for(const name of passed)console.log('  ✓ '+name);
}).catch(error=>{console.error(error);process.exitCode=1});
