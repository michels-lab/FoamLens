/* FoamLens Desktop v1.6.0 — contextual help and explicit Split-only workspace resizing. */
let uxResizeInstalled=false,uxDrag=null;
const hrWorkspaceKey='foamlens.fieldWorkspace.ux.v2';
function hrUi(en,es){try{return flUi(en,es)}catch{return en}}
function hrClamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||a))}
function hrLoadState(){try{return JSON.parse(localStorage.getItem(hrWorkspaceKey)||'{}')||{}}catch{return{}}}
function hrGrid(){return document.getElementById('fwGrid')}
function hrSizes(){
  const a=document.querySelector('.fw3DCard')?.getBoundingClientRect(),b=document.querySelector('.fwPlotCard')?.getBoundingClientRect();
  return{threeD:Math.round(a?.width||0),plot:Math.round(b?.width||0)}
}
function hrApplySizes(v){
  const g=hrGrid();if(!g||!v)return false;
  if(Number(v.threeD)>0)g.style.setProperty('--ux3d',Math.max(280,Number(v.threeD))+'px');
  if(Number(v.plot)>0)g.style.setProperty('--uxplot',Math.max(280,Number(v.plot))+'px');
  return true
}
function hrResetSizes(){const g=hrGrid();if(!g)return;for(const p of ['--ux3d','--uxplot'])g.style.removeProperty(p)}
function hrPersist(){
  try{const current=hrLoadState();current.panelSizes=hrSizes();localStorage.setItem(hrWorkspaceKey,JSON.stringify(current));window.FoamLensWorkspaceUx?.save?.()}catch{}
}
function hrInstallSplitter(){
  const g=hrGrid();if(!g||document.getElementById('uxSplitterA'))return;
  g.classList.add('uxResizable');
  const h=document.createElement('div');h.id='uxSplitterA';h.className='uxWorkspaceSplitter';h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label',hrUi('Resize 3D / plot','Redimensionar 3D / gráfica'));h.title=hrUi('Resize 3D / plot','Redimensionar 3D / gráfica');
  const plot=document.querySelector('#fwGrid .fwPlotCard');plot?g.insertBefore(h,plot):g.appendChild(h);
  h.addEventListener('pointerdown',e=>{
    if(matchMedia('(max-width:900px)').matches||!g.classList.contains('layout-split'))return;
    e.preventDefault();const a=document.querySelector('.fw3DCard')?.getBoundingClientRect(),b=document.querySelector('.fwPlotCard')?.getBoundingClientRect();
    uxDrag={x:e.clientX,a:a?.width||0,b:b?.width||0};e.currentTarget.setPointerCapture?.(e.pointerId);document.body.classList.add('uxResizing')
  });
  window.addEventListener('pointermove',e=>{
    if(!uxDrag)return;const g=hrGrid();if(!g?.classList.contains('layout-split'))return;const d=e.clientX-uxDrag.x,total=uxDrag.a+uxDrag.b,na=hrClamp(uxDrag.a+d,280,total-280),nb=total-na;
    g.style.setProperty('--ux3d',na+'px');g.style.setProperty('--uxplot',nb+'px');try{fvRender()}catch{};try{draw()}catch{}
  });
  const end=()=>{if(!uxDrag)return;uxDrag=null;document.body.classList.remove('uxResizing');hrPersist()};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  const saved=hrLoadState().panelSizes;if(saved)hrApplySizes(saved)
}
function hrHelpContent(topic){
  const t=topic||document.querySelector('.flRibbonTab.active')?.dataset.ribbonTab||'home';
  const common='<div class="hrHelpTip"><b>'+hrUi('Tip','Consejo')+'</b><span>'+hrUi('The Field workspace now has one main viewport. Split is explicit; the Inspector floats above the content instead of reserving width.','El workspace Field ahora tiene una sola vista principal. Split es explícito; el Inspector flota sobre el contenido sin reservar ancho.')+'</span></div>';
  const map={
    field:{title:hrUi('Field Workspace','Workspace de campos'),body:hrUi('Use the internal tabs for 3D, Spatial Profile, Time Series and Solver Logs. Split is opt-in when two views are needed together. Physical-time playback is shared by the synchronized views.','Usa las pestañas internas para 3D, Perfil espacial, Series temporales y Logs del solver. Split es opcional cuando necesitas dos vistas juntas. La reproducción por tiempo físico es compartida por las vistas sincronizadas.'),steps:[hrUi('Choose one internal view tab for maximum workspace area.','Elige una pestaña interna para usar el máximo espacio del workspace.'),hrUi('Choose Split to show 3D plus the selected second pane; drag the single divider to resize them.','Elige Split para mostrar 3D y el segundo panel seleccionado; arrastra el único divisor para redimensionarlos.'),hrUi('Open Inspector only when detailed controls are needed.','Abre Inspector solo cuando necesites controles detallados.')]},
    compare:{title:hrUi('3D Compare','Comparación 3D'),body:hrUi('Comparison is a Field workflow. Exact, Nearest and Interpolated are time-alignment policies; they do not create a second playback engine.','La comparación es un flujo de Field. Exacta, Más cercana e Interpolada son políticas de alineación temporal; no crean un segundo motor de reproducción.'),steps:[hrUi('Use the shared physical-time player to move the primary timeline.','Usa el reproductor global de tiempo físico para mover la línea temporal principal.'),hrUi('Use the comparison status strip to inspect Δt and compatibility.','Usa la barra de comparación para revisar Δt y compatibilidad.'),hrUi('Strict 3D Difference is available only for compatible meshes and quantities.','Strict 3D Difference solo está disponible para mallas y magnitudes compatibles.')]},
    export:{title:hrUi('Scientific Export','Exportación científica'),body:hrUi('Multi-panel export can combine the views you explicitly selected without changing the scientific data model.','La exportación multipanel combina las vistas que seleccionaste explícitamente sin cambiar el modelo científico.'),steps:[hrUi('Use Thesis / Paper / Presentation presets.','Usa presets Thesis / Paper / Presentation.'),hrUi('Case, field, physical time and ranges remain embedded.','Caso, campo, tiempo físico y rangos permanecen incrustados.'),hrUi('Export individual panels when manual composition is preferable.','Exporta paneles individuales cuando prefieras composición manual.')]},
    view:{title:hrUi('View & Layout','Vista y diseño'),body:hrUi('FoamLens remembers the active Field tab, Split second pane, comparison count and view names. Reset restores the single 3D view.','FoamLens recuerda la pestaña Field activa, el segundo panel de Split, el número de vistas y sus nombres. Reset restaura la vista 3D única.'),steps:[hrUi('3D focus uses the full central workspace.','El foco 3D usa todo el workspace central.'),hrUi('The Inspector is an overlay drawer and never becomes a permanent grid column.','El Inspector es un panel flotante y nunca se convierte en una columna permanente.'),hrUi('The Split divider is disabled on narrow layouts.','El divisor de Split se desactiva en layouts angostos.')]},
    home:{title:hrUi('FoamLens Help','Ayuda de FoamLens'),body:hrUi('Use the Ribbon for top-level navigation and the Field internal tabs for scientific view selection. OpenFOAM data remain read-only.','Usa el Ribbon para navegación principal y las pestañas internas de Field para seleccionar vistas científicas. Los datos OpenFOAM permanecen de solo lectura.'),steps:[hrUi('Data: import, catalog and source selection.','Data: importación, catálogo y selección de fuentes.'),hrUi('Field: 3D, profiles, histories and solver logs.','Field: 3D, perfiles, historiales y logs del solver.'),hrUi('Analysis / Export: derived interpretation and outputs.','Analysis / Export: interpretación derivada y resultados.')]}
  };
  const d=map[t]||map.home;return '<div class="hrHelpCopy"><h3>'+d.title+'</h3><p>'+d.body+'</p><ol>'+d.steps.map(x=>'<li>'+x+'</li>').join('')+'</ol>'+common+'</div>'
}
function hrOpenHelp(topic){
  hrInstallHelp();const overlay=document.getElementById('hrHelpOverlay');if(!overlay)return;document.getElementById('hrHelpBody').innerHTML=hrHelpContent(topic);overlay.classList.add('open');overlay.setAttribute('aria-hidden','false')
}
function hrCloseHelp(){const e=document.getElementById('hrHelpOverlay');if(e){e.classList.remove('open');e.setAttribute('aria-hidden','true')}}
function hrInstallHelp(){
  if(document.getElementById('hrHelpOverlay'))return;const overlay=document.createElement('div');overlay.id='hrHelpOverlay';overlay.className='hrHelpOverlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<section class="hrHelpDialog" role="dialog" aria-modal="true" aria-labelledby="hrHelpTitle"><div class="hrHelpHead"><div><span>'+hrUi('Contextual help','Ayuda contextual')+'</span><h2 id="hrHelpTitle">FoamLens</h2></div><button class="btn tiny" id="hrHelpClose" type="button" aria-label="'+hrUi('Close help','Cerrar ayuda')+'">×</button></div><div id="hrHelpBody"></div></section>';document.body.appendChild(overlay);document.getElementById('hrHelpClose').onclick=hrCloseHelp;overlay.addEventListener('click',e=>{if(e.target===overlay)hrCloseHelp()});document.addEventListener('keydown',e=>{if(e.key==='Escape')hrCloseHelp();if(e.key==='?'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();hrOpenHelp()}})
}
function hrInstallStyles(){
  if(document.getElementById('hrWorkspaceStyles'))return;const style=document.createElement('style');style.id='hrWorkspaceStyles';style.textContent='.fwGrid.uxResizable.layout-split{grid-template-columns:minmax(280px,var(--ux3d,1fr)) 6px minmax(280px,var(--uxplot,1fr));grid-template-areas:"threeD splitA plot";column-gap:6px}.fwGrid.uxResizable>.fw3DCard{grid-area:threeD}.fwGrid.uxResizable>.fwPlotCard{grid-area:plot}.fwGrid.uxResizable>#uxSplitterA{grid-area:splitA}.fwGrid.uxResizable:not(.layout-split)>#uxSplitterA{display:none}.uxWorkspaceSplitter{width:6px;min-height:460px;border-radius:999px;background:color-mix(in srgb,var(--line) 78%,transparent);cursor:col-resize;align-self:stretch;position:relative}.uxWorkspaceSplitter:hover,.uxWorkspaceSplitter:focus{background:color-mix(in srgb,var(--accent) 55%,var(--line));outline:none}.uxWorkspaceSplitter:after{content:"";position:absolute;inset:0 -4px}body.uxResizing{user-select:none;cursor:col-resize!important}.hrHelpOverlay{position:fixed;inset:0;display:none;align-items:flex-start;justify-content:flex-end;padding:94px 18px 18px;background:rgba(4,10,18,.34);backdrop-filter:blur(5px);z-index:12050}.hrHelpOverlay.open{display:flex}.hrHelpDialog{width:min(440px,94vw);max-height:calc(100vh - 120px);overflow:auto;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 24px 80px rgba(0,0,0,.28);padding:15px}.hrHelpHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:10px}.hrHelpHead span{font-size:8px;color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.1em}.hrHelpHead h2{margin:2px 0 0;font-size:18px}.hrHelpCopy h3{margin:14px 0 5px;font-size:15px}.hrHelpCopy p,.hrHelpCopy li{font-size:9px;line-height:1.55;color:var(--muted)}.hrHelpCopy ol{padding-left:20px}.hrHelpTip{display:grid;gap:3px;margin-top:12px;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);font-size:9px}.hrHelpTip b{color:var(--accent)}@media(max-width:900px){.fwGrid.uxResizable,.fwGrid.uxResizable.layout-split{grid-template-columns:1fr!important;grid-template-areas:"threeD" "plot"!important;gap:12px}.uxWorkspaceSplitter{display:none!important}}';document.head.appendChild(style)
}
function hrInstall(){
  if(uxResizeInstalled)return true;if(!hrGrid())return false;uxResizeInstalled=true;hrInstallStyles();hrInstallSplitter();hrInstallHelp();window.FoamLensWorkspaceResize={getSizes:hrSizes,applySizes:hrApplySizes,resetSizes:hrResetSizes};window.FoamLensContextHelp={open:hrOpenHelp,close:hrCloseHelp,content:hrHelpContent};return true
}
(function retry(){if(hrInstall())return;requestAnimationFrame(retry)})();