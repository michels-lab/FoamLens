/* FoamLens Granada Grande #177 G2/G3 — original Data + Analysis control ownership.
   Adds discoverability, keyboard navigation and audit; does not alter physics. */
(function(){
'use strict';
const KEY='foamlens.granada.g23.analysis-focus.v1';
const SPLIT_KEY='foamlens.granada.analysis-results-width.v1';
const TABS=['timeSeriesTab','profileTab','logTab','catalogTab'];
const ANALYSIS_CONTEXT={
 couplingDiagnostics:{case:'diagCase',region:null,variable:'diagRoot',route:'coupling'},
 phaseFrontPanel:{case:null,region:null,variable:null,route:'front'},
 generalAnalysisTools:{case:null,region:null,variable:null,route:'general'},
 fieldMappingTools:{case:'pmMappingCase',region:null,variable:'pmMappingRows',route:'mapping'},
 phaseMomentumTools:{case:'pmCase',region:'pmRegion',variable:'pmStatsField',route:'phaseMomentum'}
};
const MODULES=[
  ['generalAnalysisTools','General analysis','Análisis general'],
  ['couplingDiagnostics','Coupling diagnostics','Diagnóstico de acoplamiento'],
  ['phaseFrontPanel','Front tracking','Seguimiento del frente'],
  ['fieldMappingTools','Field mapping','Mapeo de campos'],
  ['phaseMomentumTools','Phase & momentum','Fase y cantidad de movimiento']
];
const $=id=>document.getElementById(id);
const state={installed:false,selected:null,pending:false,observer:null,query:'',availableOnly:false};
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
'.flG23GuideSearch{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center}',
'.flG23GuideSearch input{min-width:0;width:100%;box-sizing:border-box;min-height:38px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:var(--panel);color:var(--text);font-size:12px}',
'.flG23GuideSearch button{min-height:38px;padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);font-size:11px}',
'.flG23GuideSearch button[aria-pressed="true"]{background:var(--accentSoft);border-color:var(--accent)}',
'.flG23GuideSearch :is(input,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
'.flG23GuideEmpty{font-size:11px;color:var(--muted);line-height:1.5;margin:0}',
'.flG23GuideEmpty[hidden],.flG23Jump[hidden]{display:none!important}',
'.flG23Context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;border-top:1px solid var(--line);padding-top:9px}',
'.flG23ContextBtn{min-height:38px;min-width:0;text-align:left;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);padding:6px 8px;font-size:11px;overflow-wrap:anywhere}',
'.flG23ContextBtn:disabled{opacity:.55;cursor:not-allowed}',
'.flG23ContextBtn:focus-visible,.flG23UseGlobalCase:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
'.flG23ContextValue{font-weight:700;display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}',
'.flG23UseGlobalCase{grid-column:1/-1;min-height:34px;padding:6px 8px;border:1px solid var(--line);border-radius:9px;background:var(--accentSoft);color:var(--text);font-size:11px;font-weight:700}',
'.flG23ContextStatus{grid-column:1/-1;font-size:11px;line-height:1.5;margin:0;color:var(--muted)}',
'@media(max-width:400px){.flG23Context{grid-template-columns:minmax(0,1fr)}}',
'.flG23AnalysisSplitter{display:none;min-width:8px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;cursor:col-resize;touch-action:none;position:relative;align-self:stretch}',
'.flG23AnalysisSplitter::before{content:"";position:absolute;top:calc(50% - 22px);left:calc(50% - 1px);width:2px;height:44px;border-radius:2px;background:var(--muted)}',
'.flG23AnalysisSplitter:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
'@media(min-width:1161px){body.flG23Ready.appMode-analysis #workspace{grid-template-columns:minmax(0,1fr) 8px minmax(260px,var(--flG23AnalysisSeriesWidth,360px));column-gap:7px}body.flG23Ready.appMode-analysis #workspace>.flG23AnalysisSplitter{display:block}}',
'@media(min-width:1025px) and (max-width:1160px){body.flG23Ready.appMode-analysis #workspace{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(390px,1fr) minmax(130px,260px)!important;overflow-y:auto!important;overflow-x:hidden!important}body.flG23Ready.appMode-analysis #workspace>.plotcard{min-height:390px}body.flG23Ready.appMode-analysis #workspace>#seriesPanel{min-height:130px;overflow:auto}}',
'@media(max-width:550px){.flG23GuideSearch{grid-template-columns:minmax(0,1fr) auto}.flG23GuideSearch #flG23AvailableOnly{grid-column:1 / -1}}',
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
 // The ORIGINAL Analysis route selects the right Data plot for diagnostics
 // and front tracking. Previously the navigator focused controls while the
 // old, unrelated plot remained visible. Never duplicate plot controllers.
 const route=ANALYSIS_CONTEXT[id]?.route;
 if(route&&typeof openAnalysisModule==='function'&&options.activatePlot!==false)
   openAnalysisModule(route);
 if(n.tagName==='DETAILS')n.open=true;
 n.scrollIntoView?.({block:'nearest',behavior:'auto'});
 if(options.focus!==false){
   if(!n.hasAttribute('tabindex'))n.setAttribute('tabindex','-1');
   n.focus?.({preventScroll:true});
 }
 refresh();
 return true
}
// Only presentation width is persisted; the ORIGINAL plot, list, case,
// region, source selection and plotting handlers stay untouched.
function g23BoundSeriesWidth(raw,containerWidth){
 const requested=Number(raw),width=Number.isFinite(requested)&&requested>0?requested:360;
 const outer=Number(containerWidth);
 const maximum=Math.max(260,Math.min(560,Number.isFinite(outer)&&outer>0?outer-520:560));
 return Math.max(260,Math.min(maximum,Math.round(width)))
}
function g23InstallResultSplitter(){
 const workspace=$('workspace'),plot=workspace?.querySelector('.plotcard'),series=$('seriesPanel');
 if(!workspace||!plot||!series||series.parentElement!==workspace)return false;
 if($('flG23AnalysisSplitter'))return true;
 const handle=document.createElement('div');handle.id='flG23AnalysisSplitter';
 handle.className='flG23AnalysisSplitter';handle.tabIndex=0;
 handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');
 handle.setAttribute('aria-valuemin','260');handle.setAttribute('aria-valuemax','560');
 handle.setAttribute('aria-label',tr('Resize chart and detected series','Cambiar tamaño de gráfica y series detectadas'));
 handle.title=tr('Drag or use arrow keys to resize the original Analysis plot and series','Arrastra o usa flechas para redimensionar la gráfica y las series originales');
 plot.insertAdjacentElement('afterend',handle);
 let size=360,drag=null;
 try{size=g23BoundSeriesWidth(localStorage.getItem(SPLIT_KEY),workspace.getBoundingClientRect().width)}catch{}
 function width(next,save=false){
   size=g23BoundSeriesWidth(next,workspace.getBoundingClientRect().width);
   workspace.style.setProperty('--flG23AnalysisSeriesWidth',size+'px');
   handle.setAttribute('aria-valuenow',String(size));
   if(save)try{localStorage.setItem(SPLIT_KEY,String(size))}catch{}
   return size
 }
 function refreshPlot(){if(typeof draw==='function')requestAnimationFrame(()=>{if(mode()==='analysis')draw()})}
 width(size);
 handle.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   const next=event.key==='Home'?260:event.key==='End'?560:
     size+(event.key==='ArrowLeft'?24:-24);
   width(next,true);refreshPlot()
 });
 handle.addEventListener('pointerdown',event=>{
   if(event.button!==undefined&&event.button!==0)return;
   drag={x:event.clientX,width:size};
   event.preventDefault?.()
 });
 window.addEventListener('pointermove',event=>{
   if(!drag)return;
   width(drag.width+drag.x-event.clientX)
 });
 const stop=()=>{
   if(!drag)return;
   drag=null;width(size,true);refreshPlot()
 };
 window.addEventListener('pointerup',stop);
 window.addEventListener('pointercancel',stop);
 return true
}
function g23Match(text,query){
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
  return normalize(text).includes(normalize(query))
}
// Case/Region/Variable actions focus ORIGINAL input elements. A module's
// missing source capability stays missing: no synthetic selectors or values.
function g23NativeContextControl(moduleId,kind){
 const module=$(moduleId),rule=ANALYSIS_CONTEXT[moduleId];
 if(!module||!rule||!available(module))return null;
 const targetId=rule[kind];if(!targetId)return null;
 const control=targetId==='pmMappingRows'?
   $('pmMappingRows')?.querySelector('select[data-pm-role]'):$(targetId);
 return control&&module.contains(control)&&!control.disabled?control:null
}
function g23ControlValue(control){
 if(!control)return tr('Not available','No disponible');
 const selected=control.selectedOptions?.[0];
 return String(selected?.textContent||control.value||tr('Not selected','Sin seleccionar')).trim()
}
function g23FocusNativeContext(kind){
 if(!state.selected)return false;
 const control=g23NativeContextControl(state.selected,kind);
 if(!control)return false;
 const module=$(state.selected);
 if(module?.tagName==='DETAILS')module.open=true;
 control.scrollIntoView?.({block:'nearest',behavior:'auto'});
 control.focus?.({preventScroll:true});
 return true
}
function g23GlobalCaseChoice(){
 const global=$('globalCaseSelect');return String(global?.value||'')
}
function g23CanApplyGlobalCase(){
 const target=state.selected&&g23NativeContextControl(state.selected,'case');
 const choice=g23GlobalCaseChoice();
 return !!target&&!!choice&&[...(target.options||[])].some(option=>String(option.value)===choice)
}
function g23ApplyGlobalCase(){
 if(!g23CanApplyGlobalCase())return false;
 const select=g23NativeContextControl(state.selected,'case');
 const value=g23GlobalCaseChoice();
 if(String(select.value)!==value){
   select.value=value;
   // Source-owned change listeners rebuild dependent fields and regions;
   // never write the corresponding scientific model directly.
   select.dispatchEvent(new Event('change',{bubbles:true}))
 }
 const region=g23NativeContextControl(state.selected,'region');
 const selectedRegion=String($('globalRegionSelect')?.value||'');
 if(region&&selectedRegion&&[...(region.options||[])].some(o=>String(o.value)===selectedRegion)&&region.value!==selectedRegion){
   region.value=selectedRegion;
   region.dispatchEvent(new Event('change',{bubbles:true}))
 }
 g23FocusNativeContext('case');
 refresh();
 return true
}
function g23UpdateContext(){
 const context=$('flG23AnalysisContext');if(!context)return;
 const selected=state.selected;
 const active=!!selected&&available($(selected));
 context.hidden=!active;
 for(const [kind,en,es] of [['case','Case','Caso'],['region','Region','Región'],['variable','Variable','Variable']]){
   const button=$('flG23Context-'+kind);if(!button)continue;
   const control=active?g23NativeContextControl(selected,kind):null;
   button.disabled=!control;
   const header=tr(en,es),value=g23ControlValue(control);
   button.textContent=header+': ';
   if(control){
     const span=document.createElement('span');span.className='flG23ContextValue';span.textContent=value;
     button.appendChild(span)
   }else button.textContent=header+': '+value;
   button.title=control?tr('Focus original '+en.toLowerCase()+' selector','Ir al selector original de '+es.toLowerCase()):
     tr('This module does not provide this selector','Este módulo no dispone de este selector')
 }
 const apply=$('flG23UseGlobalCase');if(apply){
   apply.disabled=!g23CanApplyGlobalCase();
   apply.textContent=tr('Use selected project case in this analysis','Usar el caso del proyecto en este análisis')
 }
 const status=$('flG23ContextStatus');if(status){
   status.textContent=g23CanApplyGlobalCase()?
     tr('Apply changes only when you choose Use selected case.','Los cambios se aplican solo cuando eliges Usar el caso.'):
     tr('Select a compatible project case above or use the original module controls.','Selecciona arriba un caso compatible o utiliza los controles originales del módulo.')
 }
}
function updateAnalysis(){
 const host=$('flAnalysisOwnedHost');if(!host)return;
 let count=0,shown=0;
 for(const [id,en,es] of MODULES){
   const button=$('flG23Go-'+id),n=$(id);if(!button)continue;
   const ready=!!n&&host.contains(n)&&available(n);
   button.disabled=!ready;
   button.setAttribute('aria-disabled',String(!ready));
   button.setAttribute('aria-pressed',String(ready&&state.selected===id));
   const status=button.querySelector('small');if(status)status.textContent=ready?tr('Open','Abrir'):tr('Unavailable','No disponible');
   button.title=ready?tr('Focus original controls','Enfocar controles originales'):
     tr('Original module is currently unavailable','El módulo original no está disponible');
   const matches=g23Match(id+' '+en+' '+es,state.query);
   button.hidden=!matches||(state.availableOnly&&!ready);
   if(!button.hidden)shown++;
   if(ready)count++
 }
 const only=$('flG23AvailableOnly');
 if(only)only.setAttribute('aria-pressed',String(state.availableOnly));
 const clear=$('flG23SearchClear');if(clear)clear.disabled=!state.query;
 const empty=$('flG23GuideEmpty');
 if(empty){
   empty.hidden=shown!==0;
   empty.textContent=count?tr('No tools match. Clear search or turn off Available only.','No coinciden herramientas. Borra la búsqueda o desactiva Solo disponibles.'):
     tr('No original analysis modules are available. Import a compatible OpenFOAM case.','No hay módulos de análisis originales disponibles. Importa un caso OpenFOAM compatible.');
 }
 g23UpdateContext();
 const status=$('flG23GuideStatus');
 if(status)status.textContent=count?tr('Available original modules: ','Módulos originales disponibles: ')+count+
   ' · '+shown+' '+tr('shown','visibles'):
  tr('Import a compatible OpenFOAM case. No data or diagnostic is inferred.',
     'Importa un caso OpenFOAM compatible. No se infieren datos ni diagnósticos.');
}
function labels(){
 const title=$('flG23GuideTitle'),help=$('flG23GuideHelp');
 if(title)title.textContent=tr('Scientific analysis','Análisis científico');
 if(help)help.textContent=tr('Find an original analysis tool. Unavailable modules remain disabled.',
   'Busca una herramienta original de análisis. Los módulos no disponibles quedan deshabilitados.');
 const search=$('flG23ModuleSearch');if(search){
   search.placeholder=tr('Find analysis tool…','Buscar herramienta de análisis…');
   search.setAttribute('aria-label',tr('Find analysis tool','Buscar herramienta de análisis'));
 }
 const clear=$('flG23SearchClear');if(clear)clear.textContent=tr('Clear','Borrar');
 const only=$('flG23AvailableOnly');if(only)only.textContent=tr('Available only','Solo disponibles');
 g23UpdateContext();
 const separator=$('flG23AnalysisSplitter');if(separator){
   separator.setAttribute('aria-label',tr('Resize chart and detected series','Cambiar tamaño de gráfica y series detectadas'));
   separator.title=tr('Drag or use arrow keys to resize the original Analysis plot and series','Arrastra o usa flechas para redimensionar la gráfica y las series originales');
 }
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
 g23InstallResultSplitter();
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
  const searchBar=document.createElement('div');searchBar.className='flG23GuideSearch';guide.appendChild(searchBar);
  const search=document.createElement('input');search.id='flG23ModuleSearch';search.type='search';
  search.autocomplete='off';searchBar.appendChild(search);
  const clear=document.createElement('button');clear.id='flG23SearchClear';clear.type='button';searchBar.appendChild(clear);
  const only=document.createElement('button');only.id='flG23AvailableOnly';only.type='button';
  only.setAttribute('aria-pressed','false');searchBar.appendChild(only);
  const nav=document.createElement('div');nav.className='flG23GuideTabs';nav.setAttribute('role','group');guide.appendChild(nav);
  for(const [id] of MODULES){
    const button=document.createElement('button');button.type='button';button.id='flG23Go-'+id;
    button.className='flG23Jump';button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.id='flG23Label-'+id;button.appendChild(label);
    button.appendChild(document.createElement('small'));
    button.addEventListener('click',()=>selectAnalysis(id));nav.appendChild(button)
  }
  const context=document.createElement('div');context.id='flG23AnalysisContext';context.className='flG23Context';context.hidden=true;
  for(const kind of ['case','region','variable']){
    const control=document.createElement('button');control.id='flG23Context-'+kind;control.className='flG23ContextBtn';
    control.type='button';control.disabled=true;control.addEventListener('click',()=>g23FocusNativeContext(kind));context.appendChild(control)
  }
  const apply=document.createElement('button');apply.id='flG23UseGlobalCase';apply.className='flG23UseGlobalCase';
  apply.type='button';apply.disabled=true;apply.addEventListener('click',g23ApplyGlobalCase);context.appendChild(apply);
  const ctxStatus=document.createElement('p');ctxStatus.id='flG23ContextStatus';ctxStatus.className='flG23ContextStatus';
  ctxStatus.setAttribute('role','status');context.appendChild(ctxStatus);guide.appendChild(context);
  const empty=document.createElement('p');empty.id='flG23GuideEmpty';empty.className='flG23GuideEmpty';empty.hidden=true;
  empty.setAttribute('role','status');guide.appendChild(empty);
  const status=document.createElement('p');status.id='flG23GuideStatus';status.className='flG23GuideStatus';
  status.setAttribute('role','status');guide.appendChild(status);
  host.prepend(guide);
  host.addEventListener('change',event=>{
    if(event.target?.closest?.('#flG23AnalysisContext'))return;
    refresh()
  });
  for(const id of ['globalCaseSelect','globalRegionSelect'])
    $(id)?.addEventListener('change',refresh);
  search.addEventListener('input',()=>{state.query=search.value;refresh()});
  search.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.query){event.preventDefault();state.query='';search.value='';refresh()}
    if(event.key==='Enter'){
      const first=MODULES.find(([id])=>{const button=$('flG23Go-'+id);return button&&!button.hidden&&!button.disabled});
      if(first){event.preventDefault();selectAnalysis(first[0])}
    }
  });
  clear.addEventListener('click',()=>{state.query='';search.value='';refresh();search.focus()});
  only.addEventListener('click',()=>{state.availableOnly=!state.availableOnly;refresh()})
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
 window.FoamLensGranadaG23={isInstalled:()=>state.installed,focusModule:selectAnalysis,focusContext:g23FocusNativeContext,applyGlobalCase:g23ApplyGlobalCase,refresh,audit};
 labels();refresh();return true
}
if(!install()){
 const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
 observer.observe(document.documentElement,{childList:true,subtree:true})
}
})();
