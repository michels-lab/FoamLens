/* GRANADA G7: responsive scientific workbench for compact Windows WebView2.
 * Original Sidebar, Field camera/source/region, Ribbon, and Analysis chart OWNERS
 * remain intact. No data import, simulation, export or settings mutation. */
(function(){
'use strict';
const MAX_WIDTH=1024,MODES=['field','analysis'];
let installed=false,opened=false,mode=null,topResize=null,lastFocus=null,initError='not-installed';
let app=null,sidebar=null,button=null,closeButton=null,backdrop=null;
const byId=id=>document.getElementById(id);
const valid=el=>!!(el&&el.isConnected!==false);
function locale(){
 const v=byId('language')?.value;
 return v==='es'||(v!=='en'&&document.documentElement.lang?.startsWith('es'))?'es':'en';
}
function label(en,es){return locale()==='es'?es:en;}
function activeMode(){
 return document.body.classList.contains('appMode-field')?'field':
  document.body.classList.contains('appMode-analysis')?'analysis':null;
}
function narrow(){return window.innerWidth<=MAX_WIDTH;}
function originalA11y(){
 const node=sidebar;
 return node?{role:node.getAttribute('role'),label:node.getAttribute('aria-label'),hidden:node.getAttribute('aria-hidden'),tabindex:node.getAttribute('tabindex'),modal:node.getAttribute('aria-modal')}:null;
}
let oldAttrs=null;
function restoreAttr(node,key,value){
 if(!node)return;
 if(value===null||value===undefined)node.removeAttribute(key);
 else node.setAttribute(key,value);
}
function announce(){
 if(button){
  const t=button.querySelector('.gfwLabel');if(t)t.textContent=label('Controls','Controles');
  button.setAttribute('aria-label',label('Show scientific controls','Mostrar controles científicos'));
  button.title=label('Show or hide the original scientific controls','Mostrar u ocultar los controles científicos');
  button.setAttribute('aria-expanded',String(opened));
 }
 if(closeButton){
  closeButton.textContent=label('Close controls','Cerrar controles');
  closeButton.setAttribute('aria-label',label('Close scientific controls','Cerrar controles científicos'));
 }
 if(sidebar&&opened)sidebar.setAttribute('aria-label',label('Original scientific controls','Controles científicos originales'));
}
function chromeBottom(){
 const ribbon=byId('flRibbon');
 const header=ribbon&&document.body.classList.contains('flRibbonReady')?
  ribbon:byId('modeNavBar')||document.querySelector('.main>.top');
 const rect=header?.getBoundingClientRect();
 return Math.min(Math.max(65,Math.ceil((rect?.bottom||160)+6)),Math.max(65,window.innerHeight-180));
}
function position(){
 if(app)app.style.setProperty('--gfwDockTop',chromeBottom()+'px');
}
function focusable(){
 return [...sidebar.querySelectorAll('button,[href],input,select,textarea,[tabindex]')].filter(el=>
  !el.disabled&&el.tabIndex!==-1&&!el.hidden&&!el.closest('[hidden],[inert]')&&
  (typeof el.getClientRects!=='function'||el.getClientRects().length>0));
}
function close(restoreFocus=true){
 if(!opened)return;
 opened=false;
 app.classList.remove('gfwOpen');
 backdrop.hidden=true;
 restoreAttr(sidebar,'role',oldAttrs.role);
 restoreAttr(sidebar,'aria-label',oldAttrs.label);
 restoreAttr(sidebar,'aria-hidden',oldAttrs.hidden);
 restoreAttr(sidebar,'tabindex',oldAttrs.tabindex);
 restoreAttr(sidebar,'aria-modal',oldAttrs.modal);
 oldAttrs=null;
 announce();
 const f=lastFocus;lastFocus=null;
 if(restoreFocus&&(valid(f)&&typeof f.focus==='function'))f.focus();
 else if(restoreFocus&&valid(button))button.focus();
}
function open(){
 if(!installed||!app.classList.contains('gfwCompact')||opened)return false;
 if(!valid(sidebar)||!valid(button))return false;
 lastFocus=document.activeElement;
 oldAttrs=originalA11y();opened=true;
 app.classList.add('gfwOpen');backdrop.hidden=false;
 sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');
 sidebar.setAttribute('tabindex','-1');sidebar.setAttribute('aria-hidden','false');
 announce();position();
 closeButton.focus();
 return true;
}
function sync(){
 if(!installed)return;
 const nextMode=activeMode(),compact=!!nextMode&&narrow();
 if((mode!==nextMode||!compact)&&opened)close(false);
 mode=nextMode;
 app.classList.toggle('gfwCompact',compact);
 if(!compact){
  if(valid(sidebar))sidebar.removeAttribute('aria-modal');
  if(valid(button))button.setAttribute('aria-expanded','false');
 }
 announce();position();
}
function onKey(e){
 if(!opened)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
 if(e.key!=='Tab')return;
 const nodes=[closeButton,...focusable().filter(x=>x!==closeButton)];
 if(!nodes.length)return;
 const at=nodes.indexOf(document.activeElement);
 const target=e.shiftKey?(at<=0?nodes[nodes.length-1]:nodes[at-1]):
   (at<0||at===nodes.length-1?nodes[0]:nodes[at+1]);
 e.preventDefault();target.focus();
}
function style(){
 if(byId('gfwG7Style'))return;
 const tag=document.createElement('style');tag.id='gfwG7Style';
 tag.textContent=[
 '.gfwTrigger{display:none;flex:0 0 auto;align-items:center;gap:5px;border:1px solid var(--line);border-radius:9px;min-height:32px;padding:5px 10px;background:var(--panel2);color:var(--text);font:inherit;font-size:11px;font-weight:740;cursor:pointer}',
 '.gfwTrigger:hover,.gfwClose:hover{background:var(--accentSoft);border-color:var(--accent)}',
 '.gfwTrigger:focus-visible,.gfwClose:focus-visible,.app.gfwOpen .sidebar :focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
 '.gfwBackdrop[hidden]{display:none!important}.gfwBackdrop{position:fixed;inset:0;background:rgba(2,9,20,.56);z-index:1800;cursor:pointer}',
 '.gfwClose{display:none;position:sticky;top:0;width:100%;z-index:1;min-height:39px;margin-bottom:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);font:inherit;font-size:11px;font-weight:800;cursor:pointer}',
 // G22: Compact JS class can briefly outlive viewport resize. Its CSS must NEVER escape the physical compact breakpoint.
 '@media(max-width:1024px){',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact{grid-template-columns:minmax(0,1fr)!important;--chart-min-w:min(760px,calc(100vw - 45px));--chart-min-h:430px}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact>.sidebar{position:fixed!important;inset:var(--gfwDockTop,150px) auto 12px 12px!important;box-sizing:border-box;width:min(415px,calc(100vw - 24px))!important;min-width:0!important;padding:13px!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;transform:translateX(calc(-100% - 30px));visibility:hidden!important;opacity:0!important;pointer-events:none!important;z-index:1900!important;box-shadow:0 18px 60px rgba(0,0,0,.35);border:1px solid var(--line);border-radius:14px;transition:transform .15s ease,opacity .15s ease}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact.gfwOpen>.sidebar{transform:translateX(0);visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact .gfwClose{display:block}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact .sidebarToggle,body:is(.appMode-field,.appMode-analysis) .app.gfwCompact .sidebarResizeHandle{display:none!important}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact>.main{min-width:0;width:100%;overflow:hidden}',
 'body:is(.appMode-field,.appMode-analysis) .app.gfwCompact .gfwTrigger{display:inline-flex}',
 'body.appMode-analysis .app.gfwCompact #workspace{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(375px,1fr) minmax(135px,200px)!important;min-width:0;overflow-y:auto!important;overflow-x:hidden!important;gap:10px;padding:9px}',
 'body.appMode-analysis .app.gfwCompact #workspace>.plotcard{min-width:0;min-height:375px}',
 'body.appMode-analysis .app.gfwCompact #workspace #seriesPanel{min-width:0;min-height:135px;overflow:auto}',
 'body.appMode-analysis .app.gfwCompact #workspace .chartwrap{min-width:0!important;width:100%!important;min-height:430px}',
 'body.appMode-analysis .app.gfwCompact #workspace .chartviewport{scrollbar-gutter:stable;min-width:0;overflow-x:auto}',
 'body.appMode-analysis .app.gfwCompact #workspace .head{gap:5px;min-width:0;padding:4px 9px}',
 'body.appMode-analysis .app.gfwCompact #workspace .head strong{min-width:0;overflow-wrap:anywhere}',
 'body.appMode-analysis .app.gfwCompact #workspace .plotHeadActions{min-width:0;gap:4px;flex-wrap:wrap}',
 'body.appMode-field .app.gfwCompact #fieldSurface{box-sizing:border-box;min-width:0;padding:8px!important}',
 'body.appMode-field .app.gfwCompact .fwGrid,body.appMode-field .app.gfwCompact .fwGrid.layout-split{display:grid;grid-template-columns:minmax(0,1fr)!important;gap:8px}',
 'body.appMode-field .app.gfwCompact .fw3DCard,body.appMode-field .app.gfwCompact .fw3DViewCases,body.appMode-field .app.gfwCompact #fieldViewPanel{min-width:0;width:100%;max-width:100%}',
 'body.appMode-field .app.gfwCompact .fw3DCard .fvViewport,body.appMode-field .app.gfwCompact .fw3DCard #fvCanvas{min-height:420px;max-width:100%}',
 'body.appMode-field .app.gfwCompact .fvViewTools{max-width:100%;flex-wrap:wrap;gap:5px;white-space:normal}',
 'body.appMode-field .app.gfwCompact .fw3DCardHead{flex-wrap:wrap;gap:7px}',
 'body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field.active{flex-wrap:wrap!important;overflow-x:visible!important;overflow-y:visible!important;gap:4px!important;min-height:42px}',
 'body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup{flex:1 1 100%!important;min-width:0!important;max-width:100%!important;width:100%!important}',
 'body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup .fwTimeTransport{min-width:0!important;width:100%!important;max-width:100%!important;flex:1 1 auto!important;grid-template-columns:28px minmax(68px,1fr) 28px minmax(65px,2fr) auto auto!important;gap:3px!important}',
 'body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay{min-width:68px!important;width:auto!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonGroup:not(.flRibbonTimeGroup){flex:0 0 auto}',
 '@media(max-width:550px){body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup .fwTimeTransport{grid-template-columns:28px minmax(85px,1fr) 28px minmax(70px,1fr)!important}body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field #fwTimeSpeed{grid-column:2}body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field #fwTimeReadout{grid-column:4}}',
 '@media(prefers-reduced-motion:reduce){.app.gfwCompact>.sidebar{transition:none!important}}',
 '}'
 ].join('\n');
 document.head.append(tag);
}
function install(){
 if(installed)return true;
 app=byId('appShell');sidebar=document.querySelector('#appShell>.sidebar');
 const utility=document.querySelector('.main>.top .flGlobalUtilities');
 if(!app||!sidebar||!utility){initError='missing-native-shell';return false;}
 if(byId('gfwTrigger')){initError='already-installed';return false;}
 style();const id=sidebar.id||'gfwOriginalSidebar';if(!sidebar.id)sidebar.id=id;
 button=document.createElement('button');button.id='gfwTrigger';button.className='gfwTrigger';
 button.type='button';button.setAttribute('aria-controls',id);
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
 const icon=document.createElement('span');icon.textContent='☰';icon.setAttribute('aria-hidden','true');
 const lbl=document.createElement('span');lbl.className='gfwLabel';
 button.append(icon,lbl);button.addEventListener('click',()=>opened?close():open());
 utility.prepend(button);
 closeButton=document.createElement('button');closeButton.id='gfwClose';closeButton.className='gfwClose';
 closeButton.type='button';closeButton.addEventListener('click',()=>close());
 sidebar.prepend(closeButton);
 backdrop=document.createElement('div');backdrop.id='gfwBackdrop';backdrop.className='gfwBackdrop';backdrop.hidden=true;
 backdrop.setAttribute('aria-hidden','true');
 backdrop.addEventListener('pointerdown',e=>{if(e.target===backdrop)close()});
 document.body.append(backdrop);
 document.addEventListener('keydown',onKey,true);
 document.addEventListener('change',e=>{if(e.target?.id==='language')announce()},true);
 const watch=new MutationObserver(()=>sync());watch.observe(document.body,{attributes:true,attributeFilter:['class']});
 if(typeof ResizeObserver==='function'){
  topResize=new ResizeObserver(position);
  const ribbon=byId('flRibbon'),nav=byId('modeNavBar');
  if(ribbon)topResize.observe(ribbon);
  if(nav)topResize.observe(nav);
 }
 window.addEventListener('resize',sync);
 // Match the same breakpoint as the CSS: native WebView2 can coalesce resize events.
 const compactBreakpoint=window.matchMedia?.('(max-width:1024px)');
 if(compactBreakpoint?.addEventListener)compactBreakpoint.addEventListener('change',sync);
 else if(compactBreakpoint?.addListener)compactBreakpoint.addListener(sync);
 installed=true;initError='none';sync();
 return true;
}
function bootstrap(){
 if(install())return;
 if(typeof MutationObserver==='function'){
  const watch=new MutationObserver(()=>{if(install())watch.disconnect()});
  watch.observe(document.documentElement,{childList:true,subtree:true});
 }
}
function audit(){return{schema:'foamlens/granada-g7-compact-workbench/1',installed,compact:!!app?.classList.contains('gfwCompact'),
 mode,drawerOpen:opened,width:window.innerWidth,originalSidebarRetained:!!sidebar?.querySelector('#fwControlsDrawer')||!!sidebar,
 originalFieldCanvasRetained:!!byId('fvCanvas'),originalAnalysisCanvasRetained:!!byId('canvas'),
 collisionGuard:'only original app/sidebar classes; no scientific source, state or control handlers modified',
 humanVisualAcceptance:false,error:initError};}
window.FoamLensGranadaCompactWorkbench={audit,open,close};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})();
