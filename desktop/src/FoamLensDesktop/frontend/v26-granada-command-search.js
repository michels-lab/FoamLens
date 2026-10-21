/* FoamLens · Operación Granada — original-command search / Ctrl+K.
 * Local UI only. Uses original Ribbon click handlers, never recreates file,
 * simulation, export or scientific data actions. Does not touch app state. */
(function(){
'use strict';
const TABS=[
 ['home','Home','Inicio'],['data','Data','Datos'],
 ['field','3D / Field','3D / Campo'],['analysis','Analysis','Análisis'],
 ['export','Export','Exportar'],['view','View','Vista']
];
const DESTINATIONS=[
 ['review','flRaReview','Review','Revisión'],
 ['live','flRaLive','Live','En vivo']
];
// Restricted to NONDESTRUCTIVE in-app navigation/help actions already owned
// by the original Ribbon. Never enumerate arbitrary tool actions for execution.
const SAFE_ACTIONS=[
 ['profiles','flRaDataProfiles','Spatial profiles','Perfiles espaciales'],
 ['timeseries','flRaDataTimeSeries','Time series','Series temporales'],
 ['logs','flRaDataLogs','Solver logs','Registros del solver'],
 ['compare','flRaDataCompare','Compare curves','Comparar curvas'],
 ['cases','flRaCases','Case list','Lista de casos'],
 ['help','flRaHelp','Help','Ayuda']
];
const byId=id=>document.getElementById(id);
let mounted=false,open=false,trigger=null,overlay=null,input=null,list=null,closeButton=null,
 previousFocus=null,commands=[],filtered=[],selected=0,lastError='not-started',executions=0;
function lang(){
 try{if(typeof flUi==='function')return flUi('en','es')==='es'?'es':'en'}catch{}
 const el=byId('language');return (el?.value==='es'||document.documentElement.lang?.startsWith('es'))?'es':'en'
}
function words(en,es){return lang()==='es'?es:en}
function fold(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function available(el){return !!(el&&el.isConnected!==false&&!el.disabled&&
  el.getAttribute('aria-disabled')!=='true'&&!el.closest('[inert]'))}
function collect(){
 const result=[];
 for(const [tab,en,es] of TABS){
  const el=byId('flRibbonTab-'+tab);
  if(available(el))result.push({id:'nav-'+tab,kind:'nav',name:words(en,es),en,es,controlId:el.id,execute:()=>clickOriginal(el)});
 }
 for(const [id,controlId,en,es] of DESTINATIONS){
  const el=byId(controlId);
  if(available(el))result.push({id:'dest-'+id,kind:'nav',name:words(en,es),en,es,controlId,execute:()=>clickOriginal(el)});
 }
 for(const [id,controlId,en,es] of SAFE_ACTIONS){
  const el=byId(controlId);
  if(available(el))result.push({id:'safe-'+id,kind:'action',name:words(en,es),en,es,controlId,execute:()=>clickOriginal(el)});
 }
 return result;
}
function clickOriginal(el){
 if(!available(el))return false;
 try{el.click();executions++;return true}catch{lastError='original-handler-failed';return false}
}
function results(q){
 const query=fold(q);
 if(!query)return [...commands];
 const tokens=query.split(/\s+/).filter(Boolean);
 return commands.filter(c=>tokens.every(t=>fold(c.en+' '+c.es+' '+c.controlId).includes(t)))
  .sort((a,b)=>{
    const aExact=fold(a.name)===query?1:0,bExact=fold(b.name)===query?1:0;
    return bExact-aExact;
  });
}
function paint(){
 if(!list||!input)return;
 filtered=results(input.value);selected=Math.min(selected,Math.max(0,filtered.length-1));
 list.replaceChildren();
 const keys=words('Navigate','Navegar'),actions=words('Tools','Herramientas');
 if(!filtered.length){
  const empty=document.createElement('p');empty.className='fgpEmpty';
  empty.textContent=words('No matching commands.','No hay comandos coincidentes.');
  list.append(empty);input.removeAttribute('aria-activedescendant');return;
 }
 for(const [i,c] of filtered.entries()){
  const button=document.createElement('button');button.type='button';
  button.className='fgpResult'+(i===selected?' is-selected':'');
  button.id='fgpItem-'+i;button.setAttribute('role','option');
  button.setAttribute('aria-selected',String(i===selected));
  button.dataset.command=c.id;
  const title=document.createElement('span');title.className='fgpResultName';title.textContent=c.name;
  const meta=document.createElement('span');meta.className='fgpResultType';meta.textContent=c.kind==='nav'?keys:actions;
  button.append(title,meta);
  button.addEventListener('pointermove',()=>{if(selected!==i){selected=i;highlight()}});
  button.addEventListener('click',()=>activate(i));
  list.append(button);
 }
 highlight();
}
function highlight(){
 const children=[...list.querySelectorAll('[role="option"]')];
 children.forEach((el,i)=>{const yes=i===selected;el.classList.toggle('is-selected',yes);el.setAttribute('aria-selected',String(yes))});
 const el=children[selected];
 if(el)input.setAttribute('aria-activedescendant',el.id);
 else input.removeAttribute('aria-activedescendant');
}
function activate(i){
 const cmd=filtered[i];if(!cmd)return false;
 close();
 const actual=byId(cmd.controlId);
 if(!available(actual)){lastError='control-no-longer-available';return false}
 const ok=clickOriginal(actual);
 if(!ok)lastError='original-handler-failed';
 return ok;
}
function close(){
 if(!open)return;
 open=false;overlay.hidden=true;
 const focus=previousFocus;previousFocus=null;
 if(focus&&focus.isConnected!==false&&typeof focus.focus==='function')focus.focus();
 else trigger?.focus();
}
function show(){
 if(!mounted||!overlay)return false;
 if(open){input.focus();return true}
 commands=collect();if(!commands.length){lastError='native-navigation-unavailable';return false}
 previousFocus=document.activeElement;
 open=true;selected=0;input.value='';overlay.hidden=false;
 paint();input.focus();
 return true;
}
function keydown(e){
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&String(e.key).toLowerCase()==='k'){
  e.preventDefault();e.stopPropagation?.();open?close():show();return;
 }
 if(!open)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation?.();close();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+Math.max(1,filtered.length))%Math.max(1,filtered.length);
  highlight();return;
 }
 if(e.key==='Enter'&&document.activeElement!==closeButton){
  e.preventDefault();activate(selected);return;
 }
 if(e.key==='Tab'){
  const focusables=[input,...list.querySelectorAll('[role="option"]'),closeButton].filter(x=>!x.disabled);
  if(!focusables.length)return;
  const at=focusables.indexOf(document.activeElement);
  const next=e.shiftKey?(at<1?focusables.length-1:at-1):(at<0||at===focusables.length-1?0:at+1);
  e.preventDefault();focusables[next].focus();
 }
}
function addStyles(){
 if(byId('fgpStyles'))return;
 const st=document.createElement('style');st.id='fgpStyles';
 st.textContent=[
  '.fgpTrigger{flex:0 0 auto;display:flex;align-items:center;gap:7px;min-height:30px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit;font-size:11px;font-weight:650;cursor:pointer;white-space:nowrap}',
  '.fgpTrigger:hover,.fgpResult:hover{background:var(--panel2)}.fgpTrigger:focus-visible,.fgpResult:focus-visible,.fgpClose:focus-visible,.fgpSearch:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
  '.fgpKbd{font-size:10px;font-weight:500;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:1px 4px}',
  '.fgpOverlay[hidden]{display:none!important}.fgpOverlay{position:fixed;z-index:12000;inset:0;display:flex;align-items:flex-start;justify-content:center;padding:max(9vh,52px) 16px 24px;background:rgba(5,12,25,.58)}',
  '.fgpDialog{width:min(620px,100%);max-height:min(76vh,680px);display:flex;flex-direction:column;min-width:0;overflow:hidden;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:16px;box-shadow:0 22px 65px rgba(0,0,0,.34)}',
  '.fgpHead{padding:14px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--line)}',
  '.fgpSearch{flex:1;min-width:0;min-height:40px;padding:8px 11px;font:inherit;font-size:14px;border:1px solid var(--line);border-radius:9px;color:var(--text);background:var(--panel2)}',
  '.fgpClose{border:1px solid var(--line);background:var(--panel2);color:var(--text);min-width:40px;min-height:40px;border-radius:9px;cursor:pointer}',
  '.fgpResults{min-height:64px;max-height:min(54vh,505px);overflow:auto;overscroll-behavior:contain;padding:6px}',
  '.fgpResult{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;text-align:left;border:0;background:transparent;color:var(--text);border-radius:8px;min-height:42px;padding:9px 12px;font:inherit;font-size:12px;cursor:pointer}',
  '.fgpResult.is-selected{background:var(--panel2);outline:1px solid var(--accent)}',
  '.fgpResultName{overflow-wrap:anywhere}.fgpResultType{font-size:10px;color:var(--muted);flex:0 0 auto}.fgpEmpty{margin:15px;font-size:12px;color:var(--muted)}',
  '.fgpFoot{padding:9px 14px;font-size:10px;color:var(--muted);border-top:1px solid var(--line)}',
  '@media(max-width:940px){.fgpKbd{display:none}.fgpTrigger{padding-inline:7px}.fgpOverlay{padding-top:6vh}}',
  '@media(max-width:600px){.fgpDialog{max-height:85vh}.fgpResults{max-height:64vh}.fgpTrigger{font-size:10px}}',
  '@media(prefers-reduced-motion:reduce){.fgpOverlay,.fgpDialog{transition:none!important}}'
 ].join('\n');
 document.head.append(st);
}
function install(){
 if(mounted)return true;
 const tabs=byId('flRibbon')?.querySelector('.flRibbonTabRow');
 if(!tabs||!TABS.every(([k])=>byId('flRibbonTab-'+k)))return false;
 addStyles();
 trigger=document.createElement('button');trigger.type='button';trigger.id='fgpTrigger';trigger.className='fgpTrigger';
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','fgpOverlay');
 const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='⌕';
 const label=document.createElement('span');label.className='fgpTriggerLabel';label.textContent=words('Find','Buscar');
 const hint=document.createElement('span');hint.className='fgpKbd';hint.textContent='Ctrl K';
 trigger.append(icon,label,hint);trigger.addEventListener('click',show);
 tabs.append(trigger);
 overlay=document.createElement('div');overlay.id='fgpOverlay';overlay.className='fgpOverlay';overlay.hidden=true;
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});
 const dialog=document.createElement('section');dialog.className='fgpDialog';dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',words('Find FoamLens command','Buscar comando FoamLens'));
 const header=document.createElement('div');header.className='fgpHead';
 input=document.createElement('input');input.id='fgpSearch';input.className='fgpSearch';input.type='search';
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
 input.setAttribute('aria-expanded','true');input.setAttribute('aria-controls','fgpResults');
 input.setAttribute('aria-label',words('Search original commands','Buscar comandos originales'));
 input.placeholder=words('Find a workspace or tool…','Buscar espacio o herramienta…');
 input.addEventListener('input',()=>{selected=0;paint()});
 closeButton=document.createElement('button');closeButton.type='button';closeButton.className='fgpClose';
 closeButton.setAttribute('aria-label',words('Close command search','Cerrar búsqueda'));
 closeButton.textContent='×';closeButton.addEventListener('click',close);
 header.append(input,closeButton);
 list=document.createElement('div');list.id='fgpResults';list.className='fgpResults';list.setAttribute('role','listbox');
 const footer=document.createElement('div');footer.className='fgpFoot';
 footer.textContent=words('↑ ↓ choose · Enter open · Esc close','↑ ↓ elegir · Intro abrir · Esc cerrar');
 dialog.append(header,list,footer);overlay.append(dialog);document.body.append(overlay);
 document.addEventListener('keydown',keydown,true);
 mounted=true;lastError='none';
 return true;
}
function boot(){
 if(install())return;
 if(typeof MutationObserver==='function'){
  const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }else{
  let attempts=0;function retry(){if(install()||++attempts>200)return;requestAnimationFrame(retry)}
  requestAnimationFrame(retry);
 }
}
function audit(){
 return{schema:'foamlens/granada-original-command-search/1',installed:mounted,open,
  controlCount:collect().length,selectedCount:filtered.length,executions,
  originalRoutes:TABS.map(([k])=>({id:k,available:available(byId('flRibbonTab-'+k))})),
  noPrivateCaseData:true,limitations:[
   'Palette invokes only allowlisted original navigation/help controls; it never computes scientific values',
   'Generated control list reflects availability, not scientific validity or installed visual acceptance',
   'Native Windows high DPI appearance and screen-reader behavior require packaged runtime validation'
  ]};
}
window.FoamLensGranadaCommandSearch={open:show,close,audit,search:q=>{commands=collect();return results(q).map(c=>({id:c.id,name:c.name,controlId:c.controlId}))}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
