/* FoamLens GRANADA G8 — compact Time Series chart first.
 * Original scientific selectors and handlers are MOVED, never cloned; no data mutation. */
(function(){
'use strict';
const $=id=>document.getElementById(id),MAX=1024;
let app,side,controls,button,back,closeBtn,historyBtn,anchor,opened=false,installed=false,returnFocus,sidebarAttrs=null,error='not-installed';
function es(){return $('language')?.value==='es'||($('language')?.value!=='en'&&document.documentElement.lang?.startsWith('es'))}
function tr(en,sp){return es()?sp:en}
function active(){return window.innerWidth<=MAX&&document.body.classList.contains('appMode-data')&&!!$('timeSeriesTab')?.classList.contains('active')}
function position(){const head=$('flRibbon')||$('modeNavBar'),bottom=head?.getBoundingClientRect()?.bottom||148;app?.style.setProperty('--g8Top',Math.max(70,Math.min(window.innerHeight-160,Math.ceil(bottom+6)))+'px')}
function label(){
 if(!button)return;
 button.textContent=tr('Cases & import','Casos e importar');
 button.title=tr('Open original case/import tools','Abrir los controles originales de casos e importación');
 closeBtn.textContent=tr('Return to chart','Volver a la gráfica');
 historyBtn.textContent=tr('Build field history','Generar historia de campo');
 historyBtn.title=tr('Go to original OpenFOAM field-history builder','Ir al generador original de historiales OpenFOAM');
 historyBtn.disabled=!$('fwDataFieldHistories');
}
function focusables(){return [...side.querySelectorAll('button,[href],input,select,textarea,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex!==-1&&!e.hidden&&!e.closest('[hidden],[inert]')&&(typeof e.getClientRects!=='function'||e.getClientRects().length>0))}
function hide(restore=true){
 if(!opened)return;
 opened=false;app.classList.remove('g8Open');back.hidden=true;button.setAttribute('aria-expanded','false');
 for(const key of ['role','aria-modal','tabindex','aria-label']){
  const value=sidebarAttrs?.[key];if(value==null)side.removeAttribute(key);else side.setAttribute(key,value);
 }sidebarAttrs=null;
 if(restore&&returnFocus?.isConnected!==false&&typeof returnFocus?.focus==='function')returnFocus.focus();returnFocus=null;
}
function show(){
 if(!installed||!app.classList.contains('g8Compact')||opened)return false;
 sidebarAttrs=Object.fromEntries(['role','aria-modal','tabindex','aria-label'].map(k=>[k,side.getAttribute(k)]));
 opened=true;returnFocus=document.activeElement;back.hidden=false;app.classList.add('g8Open');
 side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');side.setAttribute('tabindex','-1');
 side.setAttribute('aria-label',tr('Imported cases and scientific tools','Casos importados y herramientas científicas'));
 button.setAttribute('aria-expanded','true');closeBtn.focus();return true;
}
function key(e){
 if(!opened)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hide();return}
 if(e.key!=='Tab')return;
 const nodes=[closeBtn,...focusables().filter(x=>x!==closeBtn)],i=nodes.indexOf(document.activeElement);
 if(!nodes.length)return;
 e.preventDefault();
 (e.shiftKey?(i<=0?nodes.at(-1):nodes[i-1]):(i<0||i===nodes.length-1?nodes[0]:nodes[i+1])).focus();
}
function sync(){
 if(!installed)return;
 const compact=active(),chart=$('workspace')?.querySelector('.plotcard');
 if(!compact&&opened)hide(false);
 if(compact&&!anchor&&chart&&controls.parentNode){
  anchor=document.createComment('G8: original controls position');
  controls.parentNode.insertBefore(anchor,controls);
  chart.insertBefore(controls,chart.firstChild);
 }
 if(!compact&&anchor){anchor.parentNode.insertBefore(controls,anchor);anchor.remove();anchor=null;}
 app.classList.toggle('g8Compact',compact);
 position();label();
}
function style(){
 if($('g8Style'))return;
 const tag=document.createElement('style');tag.id='g8Style';tag.textContent=[
 '.g8Trigger{display:none;min-height:33px;padding:6px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--text);font:inherit;font-size:11px;font-weight:750;cursor:pointer}',
 '.g8Close{display:none;position:sticky;top:0;width:100%;min-height:38px;margin-bottom:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);font-weight:750;z-index:2}',
 '.g8Backdrop[hidden]{display:none!important}.g8Backdrop{position:fixed;inset:0;background:rgba(2,9,20,.6);z-index:1800}',
 '.g8Trigger:focus-visible,.g8Close:focus-visible,.g8History:focus-visible,.app.g8Open .sidebar :focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
 'body.appMode-data .app.g8Compact{grid-template-columns:minmax(0,1fr)!important;--chart-min-w:min(720px,calc(100vw - 36px));--chart-min-h:430px}',
 'body.appMode-data .app.g8Compact>.sidebar{position:fixed!important;inset:var(--g8Top,150px) auto 12px 12px!important;box-sizing:border-box;width:min(420px,calc(100vw - 24px))!important;min-width:0!important;overflow:auto!important;z-index:1900!important;border:1px solid var(--line);border-radius:12px;transform:translateX(calc(-100% - 30px));visibility:hidden!important;opacity:0!important;pointer-events:none!important;box-shadow:0 20px 52px rgba(0,0,0,.4);transition:transform .15s ease,opacity .15s ease}',
 'body.appMode-data .app.g8Compact.g8Open>.sidebar{transform:translateX(0);visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
 'body.appMode-data .app.g8Compact .g8Close{display:block}',
 'body.appMode-data .app.g8Compact .sidebarToggle,body.appMode-data .app.g8Compact .sidebarResizeHandle{display:none!important}',
 'body.appMode-data .app.g8Compact>.main{min-width:0;width:100%;overflow:hidden}',
 'body.appMode-data .app.g8Compact .g8Trigger{display:inline-flex}',
 'body.appMode-data .app.g8Compact #workspace{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(450px,1fr) minmax(135px,190px)!important;gap:9px;padding:8px;min-width:0;overflow-x:hidden!important;overflow-y:auto!important}',
 'body.appMode-data .app.g8Compact #workspace>.plotcard{display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important;min-height:450px;min-width:0;overflow:hidden}',
 'body.appMode-data .app.g8Compact #timeSeriesControls{margin:0;min-width:0;max-height:225px;overflow-y:auto;padding:8px 9px;border-radius:9px}',
 'body.appMode-data .app.g8Compact #timeSeriesControls .row2,body.appMode-data .app.g8Compact #timeSeriesControls .tsdGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px}',
 'body.appMode-data .app.g8Compact #timeSeriesControls .field{min-width:0;margin:0}',
 'body.appMode-data .app.g8Compact #timeSeriesControls select{width:100%;min-width:0}',
 'body.appMode-data .app.g8Compact #timeSeriesControls .timeSeriesHint{font-size:9px;line-height:1.3}',
 'body.appMode-data .app.g8Compact #workspace .plotcard .head{min-width:0;flex-wrap:wrap;gap:6px}',
 'body.appMode-data .app.g8Compact #workspace .plotcard .chartviewport{min-width:0;width:100%;overflow-x:auto}',
 'body.appMode-data .app.g8Compact #workspace .plotcard .chartwrap{min-width:0!important;width:100%!important;min-height:430px}',
 'body.appMode-data .app.g8Compact #workspace #seriesPanel{display:grid!important;grid-template-rows:auto minmax(0,1fr);min-width:0;min-height:135px;overflow:auto}',
 'body.seriesPanelHidden.appMode-data .app.g8Compact #workspace{grid-template-rows:minmax(450px,1fr)!important}',
 'body.seriesPanelHidden.appMode-data .app.g8Compact #workspace #seriesPanel{display:none!important}',
 '.g8History{display:none;min-height:29px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--text);font-size:9px;padding:4px 8px;cursor:pointer}',
 'body.appMode-data .app.g8Compact .g8History{display:inline-flex;align-items:center}',
 '.g8History:disabled{opacity:.5;cursor:not-allowed}',
 '@media(prefers-reduced-motion:reduce){.app.g8Compact>.sidebar{transition:none!important}}'
 ].join('\n');document.head.append(tag);
}
function install(){
 if(installed)return true;
 app=$('appShell');side=document.querySelector('#appShell>.sidebar');controls=$('timeSeriesControls');
 const utility=document.querySelector('.main>.top .flGlobalUtilities');
 if(!app||!side||!controls||!utility||!$('workspace')?.querySelector('.plotcard')||!$('timeSeriesTab')){error='missing-native-data-shell';return false}
 if($('g8Trigger')){error='already-installed';return false}
 style();if(!side.id)side.id='g8OriginalSidebar';
 button=document.createElement('button');button.id='g8Trigger';button.type='button';button.className='g8Trigger';
 button.setAttribute('aria-controls',side.id);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
 button.addEventListener('click',()=>opened?hide():show());utility.prepend(button);
 closeBtn=document.createElement('button');closeBtn.id='g8Close';closeBtn.type='button';closeBtn.className='g8Close';closeBtn.addEventListener('click',()=>hide());side.prepend(closeBtn);
 back=document.createElement('div');back.id='g8Backdrop';back.className='g8Backdrop';back.hidden=true;back.setAttribute('aria-hidden','true');
 back.addEventListener('pointerdown',e=>{if(e.target===back)hide()});document.body.append(back);
 historyBtn=document.createElement('button');historyBtn.id='g8History';historyBtn.type='button';historyBtn.className='g8History';
 historyBtn.addEventListener('click',()=>{const details=$('fwDataFieldHistories');if(!details)return;show();details.open=true;details.scrollIntoView?.({block:'center',behavior:'auto'});});
 controls.querySelector('.timeSeriesActions')?.append(historyBtn);
 document.addEventListener('keydown',key,true);
 document.addEventListener('change',e=>{if(e.target?.id==='language')label()},true);
 const observer=new MutationObserver(sync);observer.observe(document.body,{attributes:true,attributeFilter:['class']});observer.observe($('timeSeriesTab'),{attributes:true,attributeFilter:['class']});
 if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(position);for(const id of ['flRibbon','modeNavBar']){const node=$(id);if(node)ro.observe(node)}}
 window.addEventListener('resize',sync);installed=true;error='none';sync();return true;
}
function boot(){if(install())return;if(typeof MutationObserver==='function'){const w=new MutationObserver(()=>{if(install())w.disconnect()});w.observe(document.documentElement,{subtree:true,childList:true})}}
window.FoamLensGranadaG8={audit:()=>({schema:'foamlens/granada-g8-data-workbench/1',installed,compact:!!app?.classList.contains('g8Compact'),drawerOpen:opened,originalControlsMoved:!!anchor,originalControlsRetained:!!$('timeSeriesControls'),originalChartRetained:!!$('canvas'),width:window.innerWidth,humanVisualApproved:false,error}),open:show,close:hide};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
