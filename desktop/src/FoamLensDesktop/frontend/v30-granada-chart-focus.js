/* FoamLens GRANADA G11 — viewport-first compact Time Series focus.
 * Preserves source-owned selectors, series and scientific zoom; never writes
 * saved series-list preference or silently calls original Fit/zoom handlers. */
(function(){
'use strict';
const $=id=>document.getElementById(id),COMPACT=1024,NARROW=720,SHORT=920;
let app=null,plot=null,button=null,installed=false,focused=false,manual=null;
let error='not-installed',busy=false;
function g8Ready(){
  const state=window.FoamLensGranadaG8?.audit?.();
  return state?.installed===true&&state.compact===true;
}
function active(){return g8Ready()&&window.innerWidth<=COMPACT&&
  document.body.classList.contains('appMode-data')&&
  $('timeSeriesTab')?.classList.contains('active')===true}
function es(){return $('language')?.value==='es'||document.documentElement.lang?.startsWith('es')}
function label(){
  if(!button)return;
  button.textContent=focused?(es()?'Mostrar series':'Show series'):
    (es()?'Enfocar gráfica':'Focus chart');
  button.title=focused?(es()?'Restaurar la lista original sin cambiar preferencias':
    'Restore the original series list without changing saved preferences'):
    (es()?'Dar más altura a la gráfica; el botón Fit conserva su función original':
    'Give the plot more height; the original Fit button stays available');
  button.setAttribute('aria-pressed',String(focused));
  button.setAttribute('aria-expanded',String(!focused&&!document.body.classList.contains('seriesPanelHidden')));
  button.setAttribute('aria-label',button.textContent);
}
function style(){
  if($('g11FocusStyle'))return;
  const s=document.createElement('style');s.id='g11FocusStyle';
  s.textContent=[
    '#g11FocusToggle{display:none;min-height:30px;min-width:94px;white-space:normal;align-items:center;justify-content:center}',
    'body.appMode-data .app.g8Compact #g11FocusToggle{display:inline-flex}',
    '#g11FocusToggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #workspace{grid-template-rows:minmax(0,1fr)!important;min-height:0!important;height:100%!important;overflow-y:hidden!important}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #workspace>.plotcard{min-height:0!important;height:100%!important;max-height:100%!important;overflow:hidden!important}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #timeSeriesControls{max-height:142px!important;overflow-y:auto!important}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #workspace #seriesPanel{display:none!important}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #workspace .plotcard .chartviewport{min-height:0!important;height:100%!important;overflow:auto!important}',
    'body.appMode-data .app.g8Compact.g11ChartFocus #workspace .plotcard .chartwrap{width:100%!important}',
    '@media(max-width:480px){body.appMode-data .app.g8Compact #g11FocusToggle{min-width:74px;padding:5px;font-size:10px}}'
  ].join('\n');
  document.head.appendChild(s);
}
function setFocus(next){
  const value=!!next;
  if(value===focused)return;
  focused=value;app?.classList.toggle('g11ChartFocus',focused);label();
}
function choose(){
  if(!active())return false;
  manual=!focused;setFocus(manual);return true
}
function sync(){
  if(busy||!installed)return;
  busy=true;
  try{
    const allowed=active();
    if(!allowed){setFocus(false);button.hidden=true;label();return}
    button.hidden=false;
    const savedHidden=document.body.classList.contains('seriesPanelHidden');
    const shouldFocus=manual!==null?manual:(
      window.innerWidth<=NARROW&&window.innerHeight<=SHORT&&!savedHidden
    );
    setFocus(shouldFocus);
    label()
  }finally{busy=false}
}
function install(){
  if(installed)return true;
  app=$('appShell');plot=$('workspace')?.querySelector('.plotcard');
  const head=plot?.querySelector('.plotHeadActions');
  const vp=$('chartViewport');
  if(!app||!plot||!head||!vp||!$('seriesPanel')||!$('timeSeriesControls')||
     !$('zoomFit')||!$('timeSeriesTab')){error='missing-original-chart-layout';return false}
  if($('g11FocusToggle')){error='already-installed';return false}
  style();
  button=document.createElement('button');button.id='g11FocusToggle';
  button.className='btn soft';button.type='button';button.hidden=true;
  button.setAttribute('aria-controls','seriesPanel');
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',choose);
  head.appendChild(button);
  installed=true;error='none';label();sync();return true
}
function boot(){
  if(!install()&&typeof MutationObserver==='function'){
    const pending=new MutationObserver(()=>{if(install())pending.disconnect()});
    pending.observe(document.documentElement,{subtree:true,childList:true});
  }
  if(typeof MutationObserver==='function'){
    const changes=new MutationObserver(sync);
    for(const element of [document.body,$('appShell'),$('timeSeriesTab')]){
      if(element)changes.observe(element,{attributes:true,attributeFilter:['class']});
    }
  }
  window.addEventListener('resize',sync);
  document.addEventListener('change',event=>{if(event.target?.id==='language')label()},true);
}
window.FoamLensGranadaG11={
  audit:()=>({schema:'foamlens/granada-g11-chart-focus/1',installed,active:active(),
    focused,manualOverride:manual,originalSeriesRetained:$('seriesPanel')===null?false:true,
    sourceZoomUnmodified:true,humanVisualApproved:false,error}),
  sync,choose
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();