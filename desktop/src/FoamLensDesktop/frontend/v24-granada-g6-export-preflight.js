/* FoamLens Granada Grande #177 G6: real-source export dock and fail-closed empty-export actions. */
(function(){
'use strict';
const ACTIONS=[
 ['flRaExportPng','plot','PNG'],
 ['flRaExportSvg','plot','SVG'],
 ['flRaExportCsv','plot','CSV'],
 ['flRaExportThesis','plot','Thesis'],
 ['flRaExportMulti','multi','Multi-panel'],
 ['flRaExportVideo','video','3D video']
];
const s={installed:false,scheduled:false,owned:new Set(),lastRequested:null};
const $=id=>document.getElementById(id);
const ui=(a,b)=>{try{return typeof flUi==='function'?flUi(a,b):($('language')?.value==='es'?b:a)}catch{return a}};
function active(){return !!$('flRibbonPanel-export')?.classList.contains('active')}
function mode(){return document.body.classList.contains('appMode-field')?'field':document.body.classList.contains('appMode-analysis')?'analysis':
 document.body.classList.contains('appMode-data')?'data':'other'}
function finiteSeries(data){
 const t=Array.isArray(data?.t)?data.t:[],y=Array.isArray(data?.y)?data.y:[];
 for(let i=0;i<Math.min(t.length,y.length);i++){
   if(t[i]!=null&&y[i]!=null&&String(t[i]).trim()!==''&&String(y[i]).trim()!==''&&Number.isFinite(Number(t[i]))&&Number.isFinite(Number(y[i])))return true
 }
 return false
}
function plots(){
 if(!['data','analysis'].includes(mode()))return[];
 if(!['timeseries','profile','log'].includes(typeof currentDataView==='string'?currentDataView:''))return[];
 try{const a=typeof visibleCurrentSeries==='function'?visibleCurrentSeries():[];
 return(Array.isArray(a)?a:[]).filter(finiteSeries)}catch{return[]}
}
function fieldSource(d){
 if(!d||!d.canvasId||d.type==='plot'||!String(d.caseName||'').trim()||!String(d.fieldName||'').trim())return false;
 if(!d.range?.valid||!Number.isFinite(Number(d.range.min))||!Number.isFinite(Number(d.range.max)))return false;
 if(d.time==null||String(d.time).trim()===''||!Number.isFinite(Number(d.time)))return false;
 const canvas=$(d.canvasId),vp=canvas?.closest?.('.fvViewport');
 return !!canvas&&Number(canvas.width)>0&&Number(canvas.height)>0&&!canvas.classList?.contains('hidden')&&
   !vp?.classList?.contains('hidden')
}
function fields(){
 if(mode()!=='field')return[];
 try{const a=window.FoamLensMultiPanelExport?.getSources?.()||[];
 return (Array.isArray(a)?a:[]).filter(fieldSource)}catch{return[]}
}
function times(){
 if(mode()!=='field')return[];
 try{const g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 const fn=window.FoamLensRegionScene?.physicalTime;
 return[...new Set((g?.times||[]).map(x=>typeof fn==='function'?fn(x):x)
   .map(x=>typeof x==='string'&&!x.trim()?NaN:Number(x)).filter(Number.isFinite))]}catch{return[]}
}
function encoder(){
 try{return typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&
  typeof HTMLCanvasElement.prototype.captureStream==='function'}catch{return false}
}
function inspect(){
 const sourcePlots=plots(),sourceFields=fields(),physicalTimes=times();
 const p=sourcePlots.length>0,f=sourceFields.length>0,m=p||f;
 let busy=false;try{busy=!!window.FoamLensAnimationExport?.isExporting?.()}catch{}
 const video=f&&physicalTimes.length>0&&encoder()&&!busy;
 return{
  schema:'foamlens-granada-native-export-preflight-v1',
  mode:mode(),view:typeof currentDataView==='string'?currentDataView:'',
  plotSeries:sourcePlots.length,fieldViews:sourceFields.length,physicalTimes:physicalTimes.length,
  dimensions:[...new Set(sourcePlots.map(x=>String(x.field?.dimensions||x.dimensions||'').trim()).filter(Boolean))],
  cases:[...new Set(sourcePlots.map(x=>String(x.caseName||'').trim()).concat(sourceFields.map(x=>String(x.caseName||'').trim())).filter(Boolean))].length,
  hasEncoder:encoder(),busy,readiness:{
   plot:{ready:p,reason:p?'real-visible-series':'no-finite-visible-series'},
   multi:{ready:m,reason:m?'real-source':'no-visible-series-or-3d-source'},
   video:{ready:video,reason:!f?'no-3d-source':!physicalTimes.length?'no-physical-timeline':!encoder()?'no-video-encoder':busy?'encoding-in-progress':'real-3d-timeline'}
  },generatedData:false
 }
}
function unlock(){
 for(const id of s.owned){const b=$(id);if(b)b.disabled=false}
 s.owned.clear()
}
function guard(button,ready){
 if(!button)return;
 if(!ready){
  if(!button.disabled){button.disabled=true;s.owned.add(button.id)}
 }else if(s.owned.has(button.id)){
  button.disabled=false;s.owned.delete(button.id)
 }
}
function update(){
 if(!s.installed)return;
 if(!active()){unlock();return}
 const r=inspect(),title=$('flG6Heading'),summary=$('flG6Sources'),note=$('flG6Note'),dimensions=$('flG6Dimensions'),last=$('flG6Last');
 if(title)title.textContent=ui('Scientific export · real sources','Exportación científica · fuentes reales');
 if(summary)summary.textContent=ui('Workspace: ','Espacio: ')+r.mode+
  ' · '+ui('finite plot series: ','series con puntos finitos: ')+r.plotSeries+
  ' · '+ui('3D sources: ','fuentes 3D: ')+r.fieldViews+
  ' · '+ui('cases: ','casos: ')+r.cases+' · '+ui('physical times: ','tiempos físicos: ')+r.physicalTimes;
 if(note)note.textContent=ui('These are the original FoamLens export commands. Opening this tab NEVER generates or downloads a file.',
   'Estos son los comandos originales de FoamLens. Abrir esta pestaña NUNCA genera ni descarga archivos.');
 if(dimensions)dimensions.textContent=r.dimensions.length?
  ui('Original dimensions: ','Dimensiones originales: ')+r.dimensions.join(' | '):
  ui('No original plot dimensions available.','Sin dimensiones originales de la gráfica.');
 if(last)last.textContent=s.lastRequested?
  ui('Original command requested: ','Se solicitó comando original: ')+s.lastRequested+
  ui(' · Download not verified',' · Descarga no verificada'):
  ui('No exports requested in this session.','No se han solicitado exportaciones en esta sesión.');
 for(const [id,type,label] of ACTIONS){
  const button=$(id),p=r.readiness[type],status=$('flG6-'+id);
  guard(button,p.ready);
  if(button){button.title=p.ready?ui('Original native exporter','Exportador original'):
    ui('Unavailable: ','No disponible: ')+p.reason;
   button.setAttribute('aria-describedby','flG6-'+id)}
  if(status)status.textContent=label+' · '+(p.ready?ui('Ready','Listo'):ui('Unavailable','No disponible'))+
    (p.ready?'':' · '+p.reason)
 }
}
function schedule(){if(s.scheduled)return;s.scheduled=true;requestAnimationFrame(()=>{s.scheduled=false;update()})}
function audit(){const p=inspect();return{...p,actions:ACTIONS.map(([id,type])=>({
 id,sourceReady:p.readiness[type].ready,nativeButton:!!$(id),disabled:!!$(id)?.disabled,
 disabledByG6:s.owned.has(id)})),lastRequested:s.lastRequested,downloadConfirmed:false,
 physicalWindowsValidation:'NOT VERIFIED',scientificValidity:'NOT CERTIFIED'}}
function install(){
 const ribbon=$('flRibbonPanel-export');if(s.installed)return true;
 if(!ribbon||!$('flRaExportPng')||!$('flRaExportVideo'))return false;
 const style=document.createElement('style');style.id='flG6Style';
 style.textContent=[
 'body.flRibbonReady #flRibbonPanel-export.active{display:flex;flex-wrap:wrap;align-items:stretch;row-gap:5px;overflow:visible;padding-bottom:8px}',
 'body.flRibbonReady #flRibbonPanel-export.active>.flRibbonGroup{flex:1 1 auto;min-width:0}',
 'body.flRibbonReady #flRibbonPanel-export.active .flRibbonActions{flex-wrap:wrap;row-gap:4px}',
 '#flG6Dock{width:100%;flex:1 1 100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.65fr);gap:12px;box-sizing:border-box;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px;color:var(--text)}',
 '#flG6Heading{font-size:12px;font-weight:840;margin:0 0 5px}',
 '#flG6Sources,#flG6Note,#flG6Dimensions,#flG6Last{font-size:10px;line-height:1.5;color:var(--muted);margin:4px 0;overflow-wrap:anywhere}',
 '#flG6States{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}',
 '.flG6State{padding:5px 7px;min-width:0;font-size:10px;color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow-wrap:anywhere}',
 '#flRibbonPanel-export .flRibbonAction:disabled{opacity:.46;cursor:not-allowed}',
 '#flRibbonPanel-export .flRibbonAction:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
 '@media(max-width:1050px){#flG6Dock{grid-template-columns:1fr}}',
 '@media(max-width:470px){#flG6Dock{padding:7px}#flG6States{grid-template-columns:1fr}}'
 ].join('\n');
 document.head.appendChild(style);
 const dock=document.createElement('section');dock.id='flG6Dock';dock.setAttribute('aria-label','Real source export readiness');
 const left=document.createElement('div'),right=document.createElement('div');right.id='flG6States';
 for(const id of ['flG6Heading','flG6Sources','flG6Note','flG6Dimensions','flG6Last']){
  const element=document.createElement(id==='flG6Heading'?'h3':'p');element.id=id;
  if(id==='flG6Sources'||id==='flG6Last')element.setAttribute('role','status');left.appendChild(element)
 }
 for(const [id] of ACTIONS){const n=document.createElement('p');n.id='flG6-'+id;
  n.className='flG6State';right.appendChild(n)}
 dock.appendChild(left);dock.appendChild(right);ribbon.appendChild(dock);
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('.flRibbonAction');
  if(target&&ACTIONS.some(a=>a[0]===target.id)&&!target.disabled)s.lastRequested=target.id;
  schedule()
 });
 for(const name of ['change','foamlens-language-change','foamlens-plot-state-change',
  'foamlens-field-view-change','foamlens-case-imported','foamlens-session-restored']){
   document.addEventListener(name,schedule)
 }
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 const list=$('seriesList');if(list)new MutationObserver(schedule).observe(list,{childList:true});
 s.installed=true;
 window.FoamLensGranadaExport={inspect,refresh:schedule,audit};
 update();return true
}
if(!install()){
 const obs=new MutationObserver(()=>{if(install())obs.disconnect()});
 obs.observe(document.documentElement,{childList:true,subtree:true})
}
})();
