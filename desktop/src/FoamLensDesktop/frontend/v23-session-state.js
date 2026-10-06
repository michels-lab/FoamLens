/* FoamLens Desktop v1.6.0 — persistent cross-workspace session state. */

const flSessionKey='foamlens.session.v1';
let flSessionRestoring=false,flSessionFieldRestoring=false,flSessionInstalled=false,flSessionPending=null,flSessionSaveTimer=null,flSessionObserver=null,flSessionLastRestorePromise=Promise.resolve(false);

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
function flSessionFieldSelectionSnapshot(){
  const field=document.getElementById('fvField'),component=document.getElementById('fvComponent');
  const time=Number(fvState?.time);
  return{
    fieldName:String(field?.value||fvState?.fieldName||''),
    component:String(component?.value||fvState?.component||'value'),
    time:Number.isFinite(time)?time:null
  }
}
function flSessionSnapshot(){
  return{
    schema:1,
    savedAt:new Date().toISOString(),
    activeMode:String(activeAppMode||'workspace'),
    context:flSessionContextSnapshot(),
    plots:window.FoamLensPlotSurfaces?.serialize?.()||null,
    field:window.FoamLensWorkspaceUx?.getState?.()||null,
    fieldSelection:flSessionFieldSelectionSnapshot()
  }
}
function flSessionSaveNow(){
  if(flSessionRestoring||flSessionFieldRestoring)return false;
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
function flSessionRestoreFieldSelection(saved){
  if(!saved||typeof saved!=='object'||typeof fvRefreshSelectors!=='function'||typeof fvLoadFrame!=='function')return Promise.resolve(false);
  return(async()=>{
    flSessionFieldRestoring=true;
    try{
      fvRefreshSelectors(false);
      const field=document.getElementById('fvField'),requestedField=String(saved.fieldName||'');
      if(requestedField&&field&&[...field.options].some(o=>o.value===requestedField))field.value=requestedField;
      const group=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
      const component=document.getElementById('fvComponent');
      if(component&&group&&typeof fvFieldComponents==='function'){
        const requestedComponent=String(saved.component||'value');
        component.innerHTML=fvFieldComponents(group).map(o=>'<option value="'+o.v+'">'+fvEsc(o.t)+'</option>').join('');
        if([...component.options].some(o=>o.value===requestedComponent))component.value=requestedComponent
      }
      const times=(group?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
      if(!times.length)return false;
      const requestedTime=Number(saved.time);let index=0;
      if(Number.isFinite(requestedTime)){
        let distance=Infinity;
        for(let i=0;i<times.length;i++){const d=Math.abs(times[i]-requestedTime);if(d<distance){distance=d;index=i}}
      }
      await fvLoadFrame(index);
      return String(fvState?.fieldName||'')===String(field?.value||'')
    }catch(e){
      console.warn('Session Field selection restore failed',e);return false
    }finally{flSessionFieldRestoring=false}
  })()
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
      },{source:'session-restore',apply:false})
    }
    if(payload.field)window.FoamLensWorkspaceUx?.applyState?.(payload.field);
    const target=flSessionSafeMode(payload.activeMode);
    setAppMode(target);
    if(target==='data'||target==='analysis')window.FoamLensPlotSurfaces?.activate?.(target,null,{restore:true});
    flSessionLastRestorePromise=target==='field'&&payload.fieldSelection?flSessionRestoreFieldSelection(payload.fieldSelection):Promise.resolve(false);
    try{renderList();updateMeta();if(currentDataView==='catalog')renderDataCatalog();else draw()}catch(e){console.warn('Session lightweight render refresh failed',e)}
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
    pending:()=>!!flSessionPending,
    whenRestored:()=>flSessionLastRestorePromise
  };
  return true
}
flSessionInstall();
