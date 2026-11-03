/* FoamLens GRANADA G10 — move the ORIGINAL preview / pin controls out of
 * the scientific canvas only while G8 compact Time Series is active.
 * No clones, hidden controls, new field data, settings writes or drawing hooks. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let app=null,plot=null,viewport=null,tools=null,canvas=null,originalParent=null,anchor=null,rail=null;
let installed=false,docked=false,error='not-installed';
function eligible(){
  const state=window.FoamLensGranadaG8?.audit?.();
  return state?.installed===true&&state.compact===true&&
    window.innerWidth<=1024&&document.body.classList.contains('appMode-data')&&
    $('timeSeriesTab')?.classList.contains('active')===true;
}
function style(){
  if($('g10PreviewStyle'))return;
  const css=document.createElement('style');css.id='g10PreviewStyle';
  css.textContent=[
    'body.appMode-data .app.g8Compact.g10Docked #workspace>.plotcard{grid-template-rows:auto auto auto minmax(0,1fr)!important}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;min-height:39px;min-width:0;padding:5px 10px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--panel2);box-sizing:border-box}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail #previewTools{position:static!important;inset:auto!important;z-index:auto!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:wrap!important;gap:8px!important;width:auto!important;max-width:100%;margin:0!important;transform:none!important}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail #previewBadge{position:static!important;display:inline-block!important;width:auto!important;max-width:100%!important;padding:5px 8px!important;flex:0 1 auto!important;overflow-wrap:anywhere}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail .pinbar{position:static!important;display:flex!important;align-items:center!important;margin:0!important;width:auto!important;max-width:100%}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail #clearPins{width:auto!important;min-height:30px;white-space:normal;cursor:pointer}',
    'body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail #clearPins:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    'body.appMode-data .app.g8Compact.g10Docked #workspace>.plotcard .chartwrap.previewExact{padding:12px!important}',
    '@media(max-width:420px){body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail{justify-content:stretch}body.appMode-data .app.g8Compact.g10Docked #g10PreviewRail #previewTools{justify-content:space-between!important;width:100%!important}}'
  ].join('\n');
  document.head.appendChild(css);
}
function install(){
  if(installed)return true;
  app=$('appShell');plot=$('workspace')?.querySelector('.plotcard');
  viewport=$('chartViewport');tools=$('previewTools');canvas=$('canvas');
  if(!app||!plot||!viewport||!tools||!canvas||!$('clearPins')||!$('previewBadge')||!$('timeSeriesTab')){
    error='missing-native-chart-elements';return false;
  }
  const wrap=canvas.closest('.chartwrap');
  if(!wrap||tools.parentNode!==wrap||viewport.parentNode!==plot){
    error='unexpected-source-ownership';return false;
  }
  originalParent=wrap;style();installed=true;error='none';sync();return true;
}
function move(){
  if(docked)return;
  if(!tools||tools.parentNode!==originalParent||!plot||!viewport){error='unexpected-source-ownership';return}
  const focused=document.activeElement;
  anchor=document.createComment('FoamLens G10: original preview tools position');
  originalParent.insertBefore(anchor,tools);
  rail=document.createElement('div');rail.id='g10PreviewRail';
  rail.setAttribute('role','group');
  rail.setAttribute('aria-label','Chart preview and pinned point controls');
  plot.insertBefore(rail,viewport);rail.appendChild(tools);
  docked=true;app.classList.add('g10Docked');error='none';
  if(tools.contains?.(focused))focused?.focus?.();
}
function restore(){
  if(!docked)return;
  const focused=document.activeElement;
  if(anchor?.parentNode===originalParent)originalParent.insertBefore(tools,anchor);
  else originalParent.appendChild(tools);
  anchor?.remove();anchor=null;rail?.remove();rail=null;
  docked=false;app?.classList.remove('g10Docked');
  if(tools?.contains?.(focused))focused?.focus?.();
}
function sync(){
  if(!installed){install();return}
  if(eligible())move();else restore();
}
function boot(){
  if(!install()&&typeof MutationObserver==='function'){
    const w=new MutationObserver(()=>{if(install())w.disconnect()});
    w.observe(document.documentElement,{subtree:true,childList:true});
  }
  if(typeof MutationObserver==='function'){
    const obs=new MutationObserver(sync);
    for(const el of [document.body,$('appShell'),$('timeSeriesTab')]){
      if(el)obs.observe(el,{attributes:true,attributeFilter:['class']});
    }
  }
  window.addEventListener('resize',sync);
  document.addEventListener('foamlens-language-change',sync);
}
window.FoamLensGranadaG10={
  audit:()=>({schema:'foamlens/granada-g10-preview-toolbar/1',installed,docked,
    originalPreviewToolsRetained:!!tools&&$('previewTools')===tools,
    originalPinButtonRetained:!!tools?.querySelector?.('#clearPins'),
    originalCanvasRetained:!!canvas&&$('canvas')===canvas,
    previewToolsOutsideChart:docked&&tools?.parentNode===rail&&rail?.parentNode===plot,
    humanVisualApproved:false,error}),
  sync
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();