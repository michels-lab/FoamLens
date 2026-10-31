/* FoamLens Granada Grande #177 G2/G3 — original Data + Analysis control ownership.
   Adds discoverability, keyboard navigation and audit; does not alter physics. */
(function(){
'use strict';
const KEY='foamlens.granada.g23.analysis-focus.v1';
const TABS=['timeSeriesTab','profileTab','logTab','catalogTab'];
const MODULES=[
  ['generalAnalysisTools','General analysis','Análisis general'],
  ['couplingDiagnostics','Coupling diagnostics','Diagnóstico de acoplamiento'],
  ['phaseFrontPanel','Front tracking','Seguimiento del frente'],
  ['fieldMappingTools','Field mapping','Mapeo de campos'],
  ['phaseMomentumTools','Phase & momentum','Fase y cantidad de movimiento']
];
const $=id=>document.getElementById(id);
const state={installed:false,selected:null,pending:false,observer:null};
function tr(en,es){try{return typeof flUi==='function'?flUi(en,es):($('language')?.value==='es'?es:en)}catch{return en}}
function mode(){return document.body.classList.contains('appMode-data')?'data':
  document.body.classList.contains('appMode-analysis')?'analysis':'other'}
function available(node){return !!node&&node.isConnected!==false&&node.style.display!=='none'&&
  !node.classList.contains('hidden')&&!node.classList.contains('pmHidden')}
function validTab(tab){return !!tab&&!tab.disabled&&!tab.classList.contains('hidden')}
function applyStyle(){
 if($('flG23Css'))return;
 const style=document.createElement('style');style.id='flG23Css';
 style.textContent=[
'body.flG23Ready.appMode-data .sidebar>.card[data-sidebar-section-key="load-data"].flSidebarSectionCollapsed > #datasetModeBlock{display:block!important}',
'body.flG23Ready.appMode-data .sidebar>.card[data-sidebar-section-key="load-data"].flSidebarSectionCollapsed > #dataImportMore{display:block!important}',
'body.flG23Ready.appMode-data .sidebar>.card[data-sidebar-section-key="load-data"] .flSidebarSectionToggle{display:none!important}',
'body.flG23Ready.appMode-analysis #flAnalysisInspectorCard > #flAnalysisOwnedHost{display:block!important}',
'body.flG23Ready.appMode-analysis #flAnalysisInspectorCard .flSidebarSectionToggle{display:none!important}',
'body.flG23Ready.appMode-data .sidebar #datasetModeBlock>.datasetTabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;overflow:visible;margin:8px 0}',
'body.flG23Ready.appMode-data .sidebar #datasetModeBlock .datasetTab{display:flex!important;min-height:38px;justify-content:space-between;align-items:center;min-width:0;gap:6px;text-align:left;border:1px solid var(--line);border-radius:10px;background:var(--panel2);padding:8px 10px;font-size:11px;color:var(--text);font-weight:750}',
'body.flG23Ready.appMode-data .sidebar #datasetModeBlock .datasetTab.active{border-color:var(--accent);background:var(--accentSoft);box-shadow:inset 3px 0 var(--accent)}',
'body.flG23Ready.appMode-data .sidebar #datasetModeBlock .datasetTab:disabled{opacity:.56;cursor:not-allowed}',
'body.flG23Ready.appMode-data #datasetModeBlock .datasetTabCount{margin-left:auto}',
'body.flG23Ready.appMode-data #datasetModeBlock .datasetModeHead{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px;border-bottom:1px solid var(--line);padding-bottom:7px}',
'body.flG23Ready.appMode-data #dataViewTitle{display:block!important;font-size:12px}',
'.flG23Status{margin:4px 0 10px;color:var(--muted);font-size:10px;line-height:1.5;overflow-wrap:anywhere}',
'.flG23Guide{display:grid;gap:8px;padding:11px;margin-bottom:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}',
'.flG23GuideTitle{font-size:12px;color:var(--text);font-weight:820;margin:0}',
'.flG23GuideHelp,.flG23GuideStatus{font-size:10px;color:var(--muted);line-height:1.5;margin:0}',
'.flG23GuideTabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
'.flG23Jump{display:flex;min-width:0;min-height:36px;align-items:center;justify-content:space-between;gap:6px;text-align:left;padding:7px 9px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:9px;font-size:10px;font-weight:730;overflow-wrap:anywhere}',
'.flG23Jump small{flex:0 0 auto;font-size:9px;color:var(--muted)}',
'.flG23Jump:disabled{opacity:.55;cursor:not-allowed}',
'.flG23Jump:hover:not(:disabled),.flG23Jump[aria-pressed="true"]{border-color:var(--accent);background:var(--accentSoft)}',
'.flG23Jump:focus-visible,body.flG23Ready.appMode-data .datasetTab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
'body.flG23Ready .sidebar :is(select,input,button){max-width:100%}',
'#flAnalysisOwnedHost>.analysisExt,#flAnalysisOwnedHost>.analysisTools{scroll-margin-top:64px}',
'@media(max-width:850px){.flG23GuideTabs{grid-template-columns:1fr}}',
'@media(max-width:460px){body.flG23Ready.appMode-data #datasetModeBlock>.datasetTabs{grid-template-columns:1fr!important}}'
].join('\n');
 document.head.appendChild(style)
}
function getDataElements(){
 const block=$('datasetModeBlock'),tabs=block?.querySelector('.datasetTabs');
 return{block,tabs,card:$('countBadge')?.closest('.card')}
}
function updateData(){
 const{tabs}=getDataElements(),note=$('flG23DataStatus');if(!tabs||!note)return;
 const active=[...tabs.querySelectorAll('.datasetTab')].find(x=>x.classList.contains('active'));
 const label=active?.querySelector('span')?.textContent?.trim()||active?.textContent?.trim()||tr('None','Ninguna');
 note.textContent=tr('Current: ','Actual: ')+label+' · '+[...tabs.querySelectorAll('.datasetTab')].filter(validTab).length+
   '/'+TABS.length+' '+tr('available source views','vistas originales disponibles');
}
function persist(id){try{localStorage.setItem(KEY,id)}catch{}}
function restore(){try{const x=localStorage.getItem(KEY);return MODULES.some(m=>m[0]===x)?x:null}catch{return null}}
function selectAnalysis(id,options={}){
 const n=$(id);if(!MODULES.some(m=>m[0]===id)||!available(n))return false;
 state.selected=id;persist(id);
 if(n.tagName==='DETAILS')n.open=true;
 n.scrollIntoView?.({block:'nearest',behavior:'auto'});
 if(options.focus!==false){
   if(!n.hasAttribute('tabindex'))n.setAttribute('tabindex','-1');
   n.focus?.({preventScroll:true});
 }
 refresh();
 return true
}
function updateAnalysis(){
 const host=$('flAnalysisOwnedHost');if(!host)return;
 let count=0;
 for(const [id] of MODULES){
   const button=$('flG23Go-'+id),n=$(id);if(!button)continue;
   const ready=!!n&&host.contains(n)&&available(n);button.disabled=!ready;
   button.setAttribute('aria-disabled',String(!ready));
   button.setAttribute('aria-pressed',String(ready&&state.selected===id));
   const status=button.querySelector('small');if(status)status.textContent=ready?tr('Open','Abrir'):tr('No data','Sin datos');
   button.title=ready?tr('Focus original controls','Enfocar controles originales'):
     tr('No supported inputs available','No hay insumos compatibles');
   if(ready)count++
 }
 const status=$('flG23GuideStatus');
 if(status)status.textContent=count?tr('Available original modules: ','Módulos originales disponibles: ')+count:
  tr('Import a compatible OpenFOAM case. No data or diagnostic is inferred.',
     'Importa un caso OpenFOAM compatible. No se infieren datos ni diagnósticos.')
}
function labels(){
 const title=$('flG23GuideTitle'),help=$('flG23GuideHelp');
 if(title)title.textContent=tr('Scientific analysis','Análisis científico');
 if(help)help.textContent=tr('Navigate to the original analysis tools. Unavailable modules remain disabled.',
   'Navega a las herramientas originales. Los módulos no disponibles quedan deshabilitados.');
 for(const [id,en,es] of MODULES){const label=$('flG23Label-'+id);if(label)label.textContent=tr(en,es)}
 updateData();updateAnalysis()
}
function refresh(){
 if(state.pending)return;state.pending=true;
 requestAnimationFrame(()=>{state.pending=false;updateData();updateAnalysis()})
}
function audit(){
 const {tabs}=getDataElements(),host=$('flAnalysisOwnedHost'),activeMode=mode();
 const nativeTabs=TABS.map(id=>{
  const n=$(id),rect=n?.getBoundingClientRect?.(),style=n?getComputedStyle(n):null;
  return{id,exists:!!n,native:!!tabs?.contains(n),disabled:!!n?.disabled,
    display:style?.display||null,
    zeroWidthInData:!!(activeMode==='data'&&n&&!n.disabled&&rect&&rect.width===0)}
 });
 const analyses=MODULES.map(([id])=>{const n=$(id);return{
  id,exists:!!n,native:!!host?.contains(n),available:available(n),guide:!!$('flG23Go-'+id)}
 });
 const seen=new Set(),duplicates=[];
 for(const e of document.querySelectorAll('[id]')){if(seen.has(e.id))duplicates.push(e.id);seen.add(e.id)}
 return{schema:'FoamLens Granada G2G3 Source Control Audit',mode:activeMode,
  installed:state.installed,data:nativeTabs,analysis:analyses,
  duplicates,scientificVerification:'NOT PERFORMED',installedVisualApproval:'NOT PERFORMED'};
}
function install(){
 if(state.installed)return true;
 const {tabs,card}=getDataElements(),host=$('flAnalysisOwnedHost');
 if(!tabs||!card||!host||!$('flAnalysisInspectorCard'))return false;
 applyStyle();
 if(!$('flG23DataStatus')){
  const note=document.createElement('p');note.id='flG23DataStatus';
  note.className='flG23Status';note.setAttribute('role','status');
  tabs.insertAdjacentElement('afterend',note)
 }
 if(!$('flG23AnalysisGuide')){
  const guide=document.createElement('section');guide.id='flG23AnalysisGuide';guide.className='flG23Guide';
  guide.setAttribute('aria-label','Scientific analysis navigation');
  const title=document.createElement('h3');title.id='flG23GuideTitle';title.className='flG23GuideTitle';guide.appendChild(title);
  const help=document.createElement('p');help.id='flG23GuideHelp';help.className='flG23GuideHelp';guide.appendChild(help);
  const nav=document.createElement('div');nav.className='flG23GuideTabs';nav.setAttribute('role','group');guide.appendChild(nav);
  for(const [id] of MODULES){
    const button=document.createElement('button');button.type='button';button.id='flG23Go-'+id;
    button.className='flG23Jump';button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.id='flG23Label-'+id;button.appendChild(label);
    button.appendChild(document.createElement('small'));
    button.addEventListener('click',()=>selectAnalysis(id));nav.appendChild(button)
  }
  const status=document.createElement('p');status.id='flG23GuideStatus';status.className='flG23GuideStatus';
  status.setAttribute('role','status');guide.appendChild(status);
  host.prepend(guide)
 }
 // Keyboard focus moves between original data buttons. The existing click
 // handlers still own actual selection and do not fire during focus navigation.
 tabs.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const options=[...tabs.querySelectorAll('.datasetTab')].filter(validTab);if(!options.length)return;
  let i=options.indexOf(document.activeElement);if(i<0)i=0;
  const target=event.key==='Home'?0:event.key==='End'?options.length-1:
    (i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+options.length)%options.length;
  event.preventDefault();options[target].focus()
 });
 tabs.addEventListener('click',refresh);
 for(const name of ['foamlens-context-change','foamlens-field-view-change','foamlens-session-restored','foamlens-plot-surface-change'])
   document.addEventListener(name,refresh);
 document.addEventListener('foamlens-language-change',labels);
 // Ignore our own navigation labels/status to prevent a MutationObserver/rAF loop.
 state.observer=new MutationObserver(records=>{
  if(records.some(record=>!record.target?.closest?.('#flG23AnalysisGuide')))refresh()
 });
 state.observer.observe(host,{attributes:true,subtree:true,childList:true,attributeFilter:['style','class']});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});
 state.selected=restore();
 state.installed=true;document.body.classList.add('flG23Ready');
 // Open import tools once for discoverability; subsequent user collapse is respected.
 if(mode()==='data'){const importer=$('dataImportMore');if(importer)importer.open=true;}
 window.FoamLensGranadaG23={isInstalled:()=>state.installed,focusModule:selectAnalysis,refresh,audit};
 labels();refresh();return true
}
if(!install()){
 const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
 observer.observe(document.documentElement,{childList:true,subtree:true})
}
})();
