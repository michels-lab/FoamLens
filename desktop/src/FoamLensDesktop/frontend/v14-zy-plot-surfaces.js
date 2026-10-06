/* FoamLens Desktop v1.6.0 — stable 2D plot surfaces for Data / Analysis / Field. */

const flPlotSurfaceRoles=['canvas','previewTools','previewBadge','clearPins','tooltip','canvasSelection','workspaceHint','empty'];
const flPlotSurfaces=new Map();
const flPlotSurfaceState=new Map([
  ['data',{view:currentDataView||'timeseries',pinned:[],activeId:null}],
  ['analysis',{view:'timeseries',pinned:[],activeId:null}],
  ['field',{view:'profile',pinned:[],activeId:null}]
]);
let flPlotSurfaceActive='data';
let flPlotSurfaceTemplate=null;
let flPlotSurfacePrevSetAppMode=null;

function flPlotRole(surface,role){
  return surface?.querySelector?.('[data-fl-plot-role="'+role+'"]')||null
}
function flPlotSurfaceAnnotate(surface,key,canonical=false){
  if(!surface)return null;
  surface.dataset.flPlotSurface=key;
  surface.classList.add('flPlotSurface');
  for(const role of flPlotSurfaceRoles){
    const el=surface.querySelector('[data-fl-plot-role="'+role+'"]')||
      surface.querySelector('#'+role)||
      surface.querySelector('#'+role+'-'+key);
    if(!el)continue;
    el.dataset.flPlotRole=role;
    el.id=canonical?role:role+'-'+key
  }
  return surface
}
function flPlotSurfaceBind(surface,key){
  const canvas=flPlotRole(surface,'canvas');
  if(canvas)bindPlotCanvasInteractions(canvas);
  const clear=flPlotRole(surface,'clearPins');
  if(clear)clear.onclick=()=>{
    if(flPlotSurfaceActive!==key)flPlotSurfaceActivate(key,null,{restore:true});
    pinnedPoints=[];draw()
  }
}
function flPlotSurfaceClone(key,host){
  if(!flPlotSurfaceTemplate||!host)return null;
  const surface=flPlotSurfaceTemplate.cloneNode(true);
  surface.classList.remove('previewExact','dragging','dragMode');
  surface.classList.add('flPlotSurfaceInactive');
  surface.style.minWidth='';
  surface.style.minHeight='';
  flPlotSurfaceAnnotate(surface,key,false);
  host.appendChild(surface);
  flPlotSurfaces.set(key,surface);
  flPlotSurfaceBind(surface,key);
  return surface
}
function flPlotSurfaceEnsure(key,host=null){
  if(flPlotSurfaces.has(key)){
    const surface=flPlotSurfaces.get(key);
    if(host&&surface.parentElement!==host)throw new Error('FoamLens plot surface '+key+' already belongs to another host.');
    return surface
  }
  if(key==='analysis')host=host||document.getElementById('chartViewport');
  if(key==='field')host=host||document.getElementById('fw2DHost');
  return flPlotSurfaceClone(key,host)
}
function flPlotSurfaceCapture(key=flPlotSurfaceActive){
  const state=flPlotSurfaceState.get(key)||{};
  state.view=currentDataView||state.view||'timeseries';
  state.pinned=(pinnedPoints||[]).map(p=>({...p}));
  state.activeId=activeId??null;
  flPlotSurfaceState.set(key,state);
  return state
}
function flPlotSurfaceRestore(key){
  const state=flPlotSurfaceState.get(key)||{};
  currentDataView=state.view||'timeseries';
  pinnedPoints=(state.pinned||[]).map(p=>({...p}));
  activeId=state.activeId??null;
  hoverPoint=null;
  selectedFigureElement=null;
  dragState=null;
  legendResizeState=null;
  forceDragMode=false;
  lastCanvasBlocks=[];
  figureHitRegions=[];
}
function flPlotSurfaceSwapCanonicalIds(fromKey,toKey){
  if(fromKey===toKey)return;
  const from=flPlotSurfaces.get(fromKey),to=flPlotSurfaces.get(toKey);
  if(!from||!to)return;
  for(const role of flPlotSurfaceRoles){
    const prev=flPlotRole(from,role),next=flPlotRole(to,role);
    if(prev)prev.id=role+'-'+fromKey;
    if(next)next.id=role
  }
}
function flPlotSurfaceRefresh(){
  try{hideCanvasSelection()}catch{}
  try{updateDatasetViewUI()}catch(e){console.warn('Plot surface dataset UI refresh failed',e)}
  try{renderList();updateMeta()}catch(e){console.warn('Plot surface metadata refresh failed',e)}
  try{
    if(currentDataView==='catalog')renderDataCatalog();
    else draw()
  }catch(e){console.warn('Plot surface render refresh failed',e)}
}
function flPlotSurfaceActivate(key,host=null,options={}){
  key=['data','analysis','field'].includes(key)?key:'data';
  const target=flPlotSurfaceEnsure(key,host);if(!target)return false;
  if(key===flPlotSurfaceActive){
    target.classList.remove('flPlotSurfaceInactive');
    if(options.restore!==false)flPlotSurfaceRefresh();
    return true
  }
  flPlotSurfaceCapture(flPlotSurfaceActive);
  const previous=flPlotSurfaceActive;
  flPlotSurfaceSwapCanonicalIds(previous,key);
  for(const [name,surface] of flPlotSurfaces)surface.classList.toggle('flPlotSurfaceInactive',name!==key);
  flPlotSurfaceActive=key;
  if(options.restore!==false){
    flPlotSurfaceRestore(key);
    flPlotSurfaceRefresh()
  }
  document.dispatchEvent(new CustomEvent('foamlens-plot-surface-change',{detail:{surface:key,previous}}));
  return true
}
function flPlotSurfaceInstall(){
  const data=document.querySelector('#chartViewport > .chartwrap')||document.querySelector('.chartwrap');
  if(!data)return false;
  flPlotSurfaceAnnotate(data,'data',true);
  flPlotSurfaces.set('data',data);
  flPlotSurfaceBind(data,'data');
  flPlotSurfaceTemplate=data.cloneNode(true);
  flPlotSurfaceEnsure('analysis',document.getElementById('chartViewport'));
  const style=document.createElement('style');style.id='flPlotSurfaceStyles';style.textContent=
    '.flPlotSurfaceInactive{display:none!important}.flPlotSurface[data-fl-plot-surface]{isolation:isolate}';
  document.head.appendChild(style);
  flPlotSurfacePrevSetAppMode=setAppMode;
  setAppMode=function(mode){
    const result=flPlotSurfacePrevSetAppMode.apply(this,arguments);
    if(mode!=='field')flPlotSurfaceActivate(mode==='analysis'?'analysis':'data',null,{restore:true});
    return result
  };
  window.FoamLensPlotSurfaces={
    ensure:flPlotSurfaceEnsure,
    activate:flPlotSurfaceActivate,
    active:()=>flPlotSurfaceActive,
    surface:key=>flPlotSurfaces.get(key)||null,
    state:key=>({...flPlotSurfaceState.get(key),pinned:(flPlotSurfaceState.get(key)?.pinned||[]).map(p=>({...p}))}),
    capture:()=>flPlotSurfaceCapture(flPlotSurfaceActive)
  };
  return true
}
flPlotSurfaceInstall();
