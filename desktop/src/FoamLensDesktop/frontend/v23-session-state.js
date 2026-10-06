/* FoamLens Desktop v1.6.0 — persistent cross-workspace session state. */

const flSessionKey='foamlens.session.v1';
let flSessionRestoring=false,flSessionInstalled=false,flSessionPending=null,flSessionSaveTimer=null,flSessionObserver=null;

function flSessionLoad(){
  try{
    const raw=localStorage.getItem(flSessionKey);if(!raw)return null;
    const value=JSON.parse(raw);return value&&typeof value==='object'&&Number(value.schema)===1?value:null
  }catch{return null}
}
function flSessionContextSnapshot(){
  const c=typeof caseById==='function'?caseById(activeContextCaseId):null;
  return{
    caseRoot:String(c?.rootPath||''),
    caseName:String(c?.name||''),
    region:String(activeContextRegion||'')
  }
}
function flSessionSnapshot(){
  return{
    schema:1,
    savedAt:new Date().toISOString(),
    activeMode:String(activeAppMode||'workspace'),
    context:flSessionContextSnapshot(),
    plots:window.FoamLensPlotSurfaces?.serialize?.()||null,
    field:window.FoamLensWorkspaceUx?.getState?.()||null
  }
}
function flSessionSaveNow(){
  if(flSessionRestoring)return false;
  try{localStorage.setItem(flSessionKey,JSON.stringify(flSessionSnapshot()));return true}catch{return false}
}
function flSessionScheduleSave(){
  if(flSessionRestoring)return;
  clearTimeout(flSessionSaveTimer);flSessionSaveTimer=setTimeout(flSessionSaveNow,180)
}
function flSessionFindCase(saved){
  if(!saved||!Array.isArray(cases)||!cases.length)return null;
  const root=String(saved.caseRoot||''),name=String(saved.caseName||'');
  return cases.find(c=>root&&String(c?.rootPath||'')===root)||
    cases.find(c=>name&&String(c?.name||'')===name)||null
}
function flSessionHasWorkspaceData(){
  return !!((Array.isArray(cases)&&cases.length)||(Array.isArray(series)&&series.length)||document.body.classList.contains('hasWorkspaceData'))
}
function flSessionSafeMode(mode){
  mode=['workspace','data','field','analysis','review','live'].includes(mode)?mode:'workspace';
  if(!flSessionHasWorkspaceData())return'workspace';
  if(mode==='field'){
    try{if(!cases.some(c=>fvCaseViewAvailable(c)))return'data'}catch{return'data'}
  }
  return mode
}
function flSessionRestoreSnapshot(payload,{force=false}={}){
  if(!payload||typeof payload!=='object')return false;
  if(!force&&!flSessionHasWorkspaceData())return false;
  flSessionRestoring=true;
  try{
    if(payload.plots)window.FoamLensPlotSurfaces?.hydrate?.(payload.plots,{activate:false});
    if(payload.context&&Array.isArray(cases)&&cases.length){
      const match=flSessionFindCase(payload.context);
      const requestedRegion=String(payload.context.region||'');
      window.FoamLensContextStore?.set?.({
        caseId:match?.id??null,
        region:requestedRegion
      },{source:'session-restore'})
    }
    if(payload.field)window.FoamLensWorkspaceUx?.applyState?.(payload.field);
    const target=flSessionSafeMode(payload.activeMode);
    setAppMode(target);
    if(target==='data'||target==='analysis')window.FoamLensPlotSurfaces?.activate?.(target,null,{restore:true})
  }finally{flSessionRestoring=false}
  document.dispatchEvent(new CustomEvent('foamlens-session-restored',{detail:{mode:activeAppMode,context:flSessionContextSnapshot()}}));
  return true
}
function flSessionTryRestore(){
  if(!flSessionPending)return false;
  if(!flSessionHasWorkspaceData())return false;
  const pending=flSessionPending;flSessionPending=null;
  const restored=flSessionRestoreSnapshot(pending);
  if(!restored)flSessionPending=pending;
  else flSessionSaveNow();
  return restored
}
function flSessionClear(){
  clearTimeout(flSessionSaveTimer);flSessionPending=null;
  try{localStorage.removeItem(flSessionKey)}catch{}
}
function flSessionPatchNavigation(){
  const prevSetAppMode=setAppMode;
  setAppMode=function(...args){const result=prevSetAppMode.apply(this,args);flSessionScheduleSave();return result};
  const prevSetDataView=setDataView;
  setDataView=function(...args){const result=prevSetDataView.apply(this,args);flSessionScheduleSave();return result}
}
function flSessionInstall(){
  if(flSessionInstalled)return true;flSessionInstalled=true;
  flSessionPending=flSessionLoad();
  flSessionPatchNavigation();
  for(const event of ['foamlens-context-change','foamlens-plot-state-change','foamlens-plot-surface-change','foamlens-field-view-change'])
    document.addEventListener(event,flSessionScheduleSave);
  document.addEventListener('change',flSessionScheduleSave,true);
  document.addEventListener('click',flSessionScheduleSave,true);
  window.addEventListener('beforeunload',flSessionSaveNow);
  window.addEventListener('pagehide',flSessionSaveNow);
  flSessionObserver=new MutationObserver(()=>{if(flSessionPending)flSessionTryRestore()});
  flSessionObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  if(flSessionPending)flSessionTryRestore();else flSessionSaveNow();
  window.FoamLensSessionState={
    key:flSessionKey,
    load:flSessionLoad,
    snapshot:flSessionSnapshot,
    save:flSessionSaveNow,
    restoreSnapshot:flSessionRestoreSnapshot,
    restoreStored:(options={})=>{const saved=flSessionLoad();return saved?flSessionRestoreSnapshot(saved,options):false},
    tryRestore:flSessionTryRestore,
    clear:flSessionClear,
    pending:()=>!!flSessionPending
  };
  return true
}
flSessionInstall();
