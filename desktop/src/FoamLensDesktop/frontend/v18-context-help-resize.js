/* FoamLens Desktop v1.5.0 — contextual help overlay and draggable Field Workspace splitters. */
let uxResizeInstalled=false,uxDrag=null;
function hrUi(en,es){try{return flUi(en,es)}catch{return en}}
function hrClamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||a))}
function hrLoadState(){try{return JSON.parse(localStorage.getItem('foamlens.fieldWorkspace.ux.v1')||'{}')||{}}catch{return{}}}
function hrGrid(){return document.getElementById('fwGrid')}
function hrSizes(){
  const g=hrGrid();if(!g)return null;
  const a=document.querySelector('.fw3DCard')?.getBoundingClientRect(),b=document.querySelector('.fwPlotCard')?.getBoundingClientRect(),c=document.querySelector('.fwControlsCard')?.getBoundingClientRect();
  return{threeD:Math.round(a?.width||0),plot:Math.round(b?.width||0),controls:Math.round(c?.width||0)}
}
function hrApplySizes(v){
  const g=hrGrid();if(!g||!v)return false;
  if(Number(v.threeD)>0)g.style.setProperty('--ux3d',Math.max(280,Number(v.threeD))+'px');
  if(Number(v.plot)>0)g.style.setProperty('--uxplot',Math.max(280,Number(v.plot))+'px');
  if(Number(v.controls)>0)g.style.setProperty('--uxcontrols',Math.max(260,Number(v.controls))+'px');
  return true
}
function hrResetSizes(){
  const g=hrGrid();if(!g)return;for(const p of ['--ux3d','--uxplot','--uxcontrols'])g.style.removeProperty(p)
}
function hrPersist(){
  try{const current=hrLoadState();current.panelSizes=hrSizes();localStorage.setItem('foamlens.fieldWorkspace.ux.v1',JSON.stringify(current));window.FoamLensWorkspaceUx?.save?.()}catch{}
}
function hrInstallSplitters(){
  const g=hrGrid();if(!g||document.getElementById('uxSplitterA'))return;
  g.classList.add('uxResizable');
  for(const [id,label] of [['uxSplitterA',hrUi('Resize 3D / plot','Redimensionar 3D / gráfica')],['uxSplitterB',hrUi('Resize plot / controls','Redimensionar gráfica / controles')]]){
    const h=document.createElement('div');h.id=id;h.className='uxWorkspaceSplitter';h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label',label);h.title=label;g.appendChild(h)
  }
  const start=(kind,e)=>{
    if(matchMedia('(max-width:1100px)').matches)return;e.preventDefault();const a=document.querySelector('.fw3DCard')?.getBoundingClientRect(),b=document.querySelector('.fwPlotCard')?.getBoundingClientRect(),c=document.querySelector('.fwControlsCard')?.getBoundingClientRect();uxDrag={kind,x:e.clientX,a:a?.width||0,b:b?.width||0,c:c?.width||0};e.currentTarget.setPointerCapture?.(e.pointerId);document.body.classList.add('uxResizing')
  };
  document.getElementById('uxSplitterA').addEventListener('pointerdown',e=>start('a',e));
  document.getElementById('uxSplitterB').addEventListener('pointerdown',e=>start('b',e));
  window.addEventListener('pointermove',e=>{
    if(!uxDrag)return;const g=hrGrid();if(!g)return;const d=e.clientX-uxDrag.x,is3d=g.classList.contains('layout-3d');
    if(uxDrag.kind==='a'&&!is3d){
      const total=uxDrag.a+uxDrag.b,na=hrClamp(uxDrag.a+d,280,total-280),nb=total-na;g.style.setProperty('--ux3d',na+'px');g.style.setProperty('--uxplot',nb+'px')
    }else if(uxDrag.kind==='b'){
      if(is3d){
        const total=uxDrag.a+uxDrag.c,nc=hrClamp(uxDrag.c-d,260,total-320),na=total-nc;g.style.setProperty('--ux3d',na+'px');g.style.setProperty('--uxcontrols',nc+'px')
      }else{
        const total=uxDrag.b+uxDrag.c,nc=hrClamp(uxDrag.c-d,260,total-280),nb=total-nc;g.style.setProperty('--uxplot',nb+'px');g.style.setProperty('--uxcontrols',nc+'px')
      }
    }
    try{fvRender()}catch{};try{draw()}catch{}
  });
  const end=()=>{if(!uxDrag)return;uxDrag=null;document.body.classList.remove('uxResizing');hrPersist()};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  const saved=hrLoadState().panelSizes;if(saved)hrApplySizes(saved)
}
function hrHelpContent(topic){
  const t=topic||document.querySelector('.flRibbonTab.active')?.dataset.ribbonTab||'home';
  const common='<div class="hrHelpTip"><b>'+hrUi('Tip','Consejo')+'</b><span>'+hrUi('Hover Ribbon icons for names; scientific state stays visible in the status badges.','Pasa el cursor sobre los iconos del Ribbon para ver nombres; el estado científico queda visible en los badges.')+'</span></div>';
  const map={
    field:{title:hrUi('Field Workspace','Workspace de campos'),body:hrUi('Use Split / 3D focus / Plot focus for the main arrangement. Add up to four synchronized 3D views. Probe, Slice, Iso, Vectors and Streamlines remain contextual to the active Field workflow.','Usa Dividida / Foco 3D / Foco gráfica para el diseño principal. Añade hasta cuatro vistas 3D sincronizadas. Probe, Slice, Iso, Vectores y Streamlines permanecen contextuales al flujo Field.'),steps:[hrUi('Drag the vertical splitters to resize 3D, companion plot and controls.','Arrastra los separadores verticales para redimensionar 3D, gráfica y controles.'),hrUi('View names A–D can be changed in View → View names.','Los nombres A–D se cambian en Vista → Nombres vistas.'),hrUi('The arrangement is saved automatically for the next session.','El diseño se guarda automáticamente para la siguiente sesión.')]},
    compare:{title:hrUi('3D Compare','Comparación 3D'),body:hrUi('Choose Exact, Nearest or Interpolated physical-time synchronization. Difference is only enabled for scientifically compatible fields and meshes.','Elige sincronización temporal Exacta, Más cercana o Interpolada. Difference solo se habilita para campos y mallas científicamente compatibles.'),steps:[hrUi('Use the comparison status strip to inspect Δt, quantity compatibility and sync state.','Usa la barra de estado para revisar Δt, compatibilidad de magnitud y sincronización.'),hrUi('Swap A/B changes comparison direction; Copy A→B copies compatible view settings.','Intercambiar A/B cambia la dirección; Copiar A→B copia ajustes compatibles.'),hrUi('Signed, Absolute and Percent differences use different scientific ranges.','Signed, Absolute y Percent usan rangos científicos diferentes.')]},
    export:{title:hrUi('Scientific Export','Exportación científica'),body:hrUi('Multi-panel export can combine 3D views, Difference and the companion plot. 3D panels are rerendered at requested export resolution.','La exportación multipanel combina vistas 3D, Difference y la gráfica complementaria. Los paneles 3D se rerenderizan a la resolución solicitada.'),steps:[hrUi('Use Thesis / Paper / Presentation presets.','Usa presets Thesis / Paper / Presentation.'),hrUi('Panel labels, case, field, time and ranges are embedded automatically.','Las etiquetas, caso, campo, tiempo y rangos se incrustan automáticamente.'),hrUi('Export individual panels when the thesis layout needs manual composition.','Exporta paneles individuales si la tesis requiere composición manual.')]},
    view:{title:hrUi('View & Layout','Vista y diseño'),body:hrUi('FoamLens remembers the Field Workspace arrangement locally. Reset layout removes the saved arrangement and restores the default split view.','FoamLens recuerda localmente el diseño de Field Workspace. Restablecer diseño borra el diseño guardado y vuelve a la vista dividida.'),steps:[hrUi('View names are presentation labels; they never replace scientific case/field/time provenance.','Los nombres de vistas son etiquetas de presentación; nunca reemplazan la procedencia científica caso/campo/tiempo.'),hrUi('Performance opens live cache and frame telemetry.','Rendimiento abre telemetría de caché y frames.'),hrUi('Resizable splitters are disabled on narrow responsive layouts.','Los separadores se desactivan en layouts responsivos angostos.')]},
    home:{title:hrUi('FoamLens Help','Ayuda de FoamLens'),body:hrUi('Use the Ribbon as the main navigation surface. OpenFOAM data stay read-only; analysis and export tools activate when compatible data are available.','Usa el Ribbon como navegación principal. Los datos OpenFOAM permanecen de solo lectura; análisis y exportación se activan cuando hay datos compatibles.'),steps:[hrUi('Home: open/save workspaces and navigate.','Home: abre/guarda workspaces y navega.'),hrUi('Field / Compare: inspect 3D scientific fields.','Field / Compare: inspecciona campos científicos 3D.'),hrUi('Export: create figures, CSV and video.','Export: crea figuras, CSV y video.')]}
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
  if(document.getElementById('hrWorkspaceStyles'))return;const style=document.createElement('style');style.id='hrWorkspaceStyles';style.textContent='.fwGrid.uxResizable{grid-template-columns:minmax(280px,var(--ux3d,1.15fr)) 6px minmax(280px,var(--uxplot,.85fr)) 6px minmax(260px,var(--uxcontrols,340px));grid-template-areas:"threeD splitA plot splitB controls";column-gap:6px}.fwGrid.uxResizable>.fw3DCard{grid-area:threeD}.fwGrid.uxResizable>.fwPlotCard{grid-area:plot}.fwGrid.uxResizable>.fwControlsCard{grid-area:controls}.uxWorkspaceSplitter{width:6px;min-height:460px;border-radius:999px;background:color-mix(in srgb,var(--line) 78%,transparent);cursor:col-resize;align-self:stretch;position:relative}.uxWorkspaceSplitter:hover,.uxWorkspaceSplitter:focus{background:color-mix(in srgb,var(--accent) 55%,var(--line));outline:none}.uxWorkspaceSplitter:after{content:"";position:absolute;inset:0 -4px}.fwGrid.uxResizable>#uxSplitterA{grid-area:splitA}.fwGrid.uxResizable>#uxSplitterB{grid-area:splitB}.fwGrid.uxResizable.layout-3d{grid-template-columns:minmax(320px,var(--ux3d,1fr)) 6px minmax(260px,var(--uxcontrols,340px));grid-template-areas:"threeD splitB controls"}.fwGrid.uxResizable.layout-3d>#uxSplitterA{display:none}.fwGrid.uxResizable.layout-plot{grid-template-columns:minmax(280px,var(--ux3d,.8fr)) 6px minmax(320px,var(--uxplot,1.2fr)) 6px minmax(260px,var(--uxcontrols,340px));grid-template-areas:"threeD splitA plot splitB controls"}body.uxResizing{user-select:none;cursor:col-resize!important}.hrHelpOverlay{position:fixed;inset:0;display:none;align-items:flex-start;justify-content:flex-end;padding:94px 18px 18px;background:rgba(4,10,18,.34);backdrop-filter:blur(5px);z-index:12050}.hrHelpOverlay.open{display:flex}.hrHelpDialog{width:min(440px,94vw);max-height:calc(100vh - 120px);overflow:auto;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 24px 80px rgba(0,0,0,.28);padding:15px}.hrHelpHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:10px}.hrHelpHead span{font-size:8px;color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.1em}.hrHelpHead h2{margin:2px 0 0;font-size:18px}.hrHelpCopy h3{margin:14px 0 5px;font-size:15px}.hrHelpCopy p,.hrHelpCopy li{font-size:9px;line-height:1.55;color:var(--muted)}.hrHelpCopy ol{padding-left:20px}.hrHelpTip{display:grid;gap:3px;margin-top:12px;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);font-size:9px}.hrHelpTip b{color:var(--accent)}@media(max-width:1100px){.fwGrid.uxResizable,.fwGrid.uxResizable.layout-plot,.fwGrid.uxResizable.layout-3d{grid-template-columns:1fr!important;grid-template-areas:"threeD" "plot" "controls"!important;gap:12px}.uxWorkspaceSplitter{display:none!important}.fwGrid.uxResizable.layout-3d{grid-template-areas:"threeD" "controls"!important}.fwGrid.uxResizable.layout-3d>.fwPlotCard{display:none!important}}';document.head.appendChild(style)
}
function hrInstall(){
  if(uxResizeInstalled)return true;if(!hrGrid())return false;uxResizeInstalled=true;hrInstallStyles();hrInstallSplitters();hrInstallHelp();window.FoamLensWorkspaceResize={getSizes:hrSizes,applySizes:hrApplySizes,resetSizes:hrResetSizes};window.FoamLensContextHelp={open:hrOpenHelp,close:hrCloseHelp,content:hrHelpContent};return true
}
(function retry(){if(hrInstall())return;requestAnimationFrame(retry)})();
