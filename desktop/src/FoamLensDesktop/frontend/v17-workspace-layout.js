/* FoamLens Desktop v1.5.0 — persistent Field Workspace layout, splitters and contextual help. */
const wlState={installed:false,drag:null,restoring:false,key:'foamlens.fieldWorkspace.layout.v2'};
function wlUi(en,es){try{return flUi(en,es)}catch{return en}}
function wlClamp(v,a,b){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a}
function wlRead(){try{const raw=localStorage.getItem(wlState.key);if(!raw)return null;const x=JSON.parse(raw);return x&&typeof x==='object'?x:null}catch{return null}}
function wlSnapshot(){
  const grid=document.getElementById('fwGrid'),names=window.FoamLensFieldCompare?.getViewNames?.()||{},groups={};
  document.querySelectorAll('#fwGrid .fwControlGroup').forEach((d,i)=>groups[d.id||('group'+i)]=!!d.open);
  return{schema:2,savedAt:new Date().toISOString(),layout:document.getElementById('fwLayout')?.value||'split',companion:document.getElementById('fwCompanion')?.value||'profile',syncTime:document.getElementById('fwSyncTime')?.checked!==false,leftPx:Number.parseFloat(grid?.style.getPropertyValue('--wl-left-px'))||null,controlsPx:Number.parseFloat(grid?.style.getPropertyValue('--wl-controls-px'))||null,groups,viewNames:names}
}
function wlSave(){if(wlState.restoring)return;try{localStorage.setItem(wlState.key,JSON.stringify(wlSnapshot()))}catch{}}
function wlApplyWidths(leftPx,controlsPx){
  const grid=document.getElementById('fwGrid');if(!grid)return;const r=grid.getBoundingClientRect(),width=Math.max(0,r.width||0);let controls=Number(controlsPx),left=Number(leftPx);
  if(Number.isFinite(controls)&&width>700){controls=wlClamp(controls,280,Math.min(520,width-620));grid.style.setProperty('--wl-controls-px',controls+'px')}
  if(Number.isFinite(left)&&width>700){const currentControls=Number.parseFloat(grid.style.getPropertyValue('--wl-controls-px'))||340;left=wlClamp(left,320,Math.max(320,width-currentControls-320));grid.style.setProperty('--wl-left-px',left+'px')}
}
function wlApply(saved){
  if(!saved)return;wlState.restoring=true;
  try{
    const layout=['split','3d','plot'].includes(saved.layout)?saved.layout:'split',companion=['profile','timeseries','log','none'].includes(saved.companion)?saved.companion:'profile';
    const ls=document.getElementById('fwLayout');if(ls)ls.value=layout;window.FoamLensFieldWorkspace?.setLayout?.(layout);
    const cs=document.getElementById('fwCompanion');if(cs)cs.value=companion;window.FoamLensFieldWorkspace?.setCompanion?.(companion);
    const st=document.getElementById('fwSyncTime');if(st)st.checked=saved.syncTime!==false;try{if(typeof fwState!=='undefined')fwState.syncTime=saved.syncTime!==false}catch{}
    requestAnimationFrame(()=>wlApplyWidths(saved.leftPx,saved.controlsPx));
    const groups=saved.groups||{};document.querySelectorAll('#fwGrid .fwControlGroup').forEach((d,i)=>{const key=d.id||('group'+i);if(Object.prototype.hasOwnProperty.call(groups,key))d.open=!!groups[key]});
    for(const [id,name] of Object.entries(saved.viewNames||{}))window.FoamLensFieldCompare?.setViewName?.(Number(id),name)
  }finally{wlState.restoring=false}
}
function wlReset(){
  try{localStorage.removeItem(wlState.key)}catch{};const grid=document.getElementById('fwGrid');grid?.style.removeProperty('--wl-left-px');grid?.style.removeProperty('--wl-controls-px');
  const layout=document.getElementById('fwLayout');if(layout)layout.value='split';window.FoamLensFieldWorkspace?.setLayout?.('split');
  const companion=document.getElementById('fwCompanion');if(companion)companion.value='profile';window.FoamLensFieldWorkspace?.setCompanion?.('profile');
  const sync=document.getElementById('fwSyncTime');if(sync)sync.checked=true;try{if(typeof fwState!=='undefined')fwState.syncTime=true}catch{}
  document.querySelectorAll('#fwGrid .fwControlGroup').forEach(d=>d.open=true);for(let i=1;i<=4;i++)window.FoamLensFieldCompare?.setViewName?.(i,'');wlSave();wlRenderSoon()
}
function wlRenderSoon(){requestAnimationFrame(()=>{try{fvRender()}catch{};try{fcRender()}catch{};try{fcRenderDifference()}catch{};try{fcRenderExtras()}catch{};try{draw()}catch{}})}
function wlInstallSplitters(){
  const grid=document.getElementById('fwGrid');if(!grid||grid.dataset.wlSplitters)return;grid.dataset.wlSplitters='1';grid.classList.add('wlResizable');
  for(const [kind,label] of [['primary',wlUi('Resize 3D / plot','Redimensionar 3D / gráfica')],['controls',wlUi('Resize controls','Redimensionar controles')]]){const h=document.createElement('div');h.className='wlSplitter wlSplitter-'+kind;h.dataset.wlSplitter=kind;h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label',label);grid.appendChild(h)}
  const start=(e,kind)=>{if(window.matchMedia?.('(max-width: 1350px)').matches)return;e.preventDefault();wlState.drag={kind,pointerId:e.pointerId};e.currentTarget.setPointerCapture?.(e.pointerId);document.body.classList.add('wlDragging')};
  grid.querySelectorAll('[data-wl-splitter]').forEach(h=>{
    h.addEventListener('pointerdown',e=>start(e,h.dataset.wlSplitter));
    h.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=(e.shiftKey?40:16)*(e.key==='ArrowRight'?1:-1),r=grid.getBoundingClientRect();if(h.dataset.wlSplitter==='primary'){const cur=Number.parseFloat(grid.style.getPropertyValue('--wl-left-px'))||r.width*.48;wlApplyWidths(cur+step,Number.parseFloat(grid.style.getPropertyValue('--wl-controls-px'))||340)}else{const cur=Number.parseFloat(grid.style.getPropertyValue('--wl-controls-px'))||340;wlApplyWidths(null,cur-step)}wlSave();wlRenderSoon()})
  });
  document.addEventListener('pointermove',e=>{if(!wlState.drag)return;const r=grid.getBoundingClientRect(),controls=Number.parseFloat(grid.style.getPropertyValue('--wl-controls-px'))||340;if(wlState.drag.kind==='primary')wlApplyWidths(e.clientX-r.left,controls);else wlApplyWidths(Number.parseFloat(grid.style.getPropertyValue('--wl-left-px'))||r.width*.48,r.right-e.clientX);wlRenderSoon()},true);
  const end=()=>{if(!wlState.drag)return;wlState.drag=null;document.body.classList.remove('wlDragging');wlSave();wlRenderSoon()};document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true)
}
function wlCurrentContext(){
  if(document.getElementById('fvStreamlines')?.checked)return wlUi('Streamlines are active: seed mode/density define origins; direction, integration step, maximum steps and maximum physical length control path integration.','Streamlines activas: modo/densidad definen semillas; dirección, paso, pasos máximos y longitud física máxima controlan la integración.');
  if(document.getElementById('fvVectors')?.checked)return wlUi('Vectors are active: resolution changes sampling density and glyph scale changes arrow size without changing field values.','Vectores activos: resolución cambia el muestreo y glyph scale cambia el tamaño sin alterar los valores del campo.');
  if(document.getElementById('fcEnabled')?.checked)return wlUi('Comparison is active: use the status chips for time synchronization, physical-quantity compatibility, mesh compatibility and linked/independent state.','Comparación activa: usa los chips de estado para sincronización temporal, compatibilidad de cantidad física, malla y estado enlazado/independiente.');
  try{if(fwLineProfileState?.enabled)return wlUi('3D profile picking is active: click point A, then point B on visible rendered geometry.','La selección de perfil 3D está activa: haz clic en A y luego B sobre la geometría visible.')}catch{}
  return wlUi('Field Workspace keeps 3D, a companion plot and controls together. Drag the vertical splitters to give space to the part you are working on.','Field Workspace mantiene 3D, gráfica complementaria y controles juntos. Arrastra los divisores verticales para dar espacio a la parte en la que trabajas.')
}
function wlRefreshHelp(){const e=document.getElementById('wlHelpContext');if(e)e.textContent=wlCurrentContext()}
function wlOpenHelp(){wlInstallHelp();const o=document.getElementById('wlHelpOverlay');o?.classList.add('open');o?.setAttribute('aria-hidden','false');wlRefreshHelp()}
function wlCloseHelp(){const o=document.getElementById('wlHelpOverlay');o?.classList.remove('open');o?.setAttribute('aria-hidden','true')}
function wlInstallHelp(){
  if(document.getElementById('wlHelpOverlay'))return;const o=document.createElement('div');o.id='wlHelpOverlay';o.className='wlHelpOverlay';o.setAttribute('aria-hidden','true');
  o.innerHTML='<section class="wlHelpDialog" role="dialog" aria-modal="true" aria-labelledby="wlHelpTitle"><div class="wlHelpHead"><div><div class="wlHelpEyebrow">FoamLens Field Workspace</div><h3 id="wlHelpTitle">'+wlUi('Contextual help','Ayuda contextual')+'</h3></div><button class="btn tiny" id="wlHelpClose" type="button">×</button></div><div class="wlHelpContext" id="wlHelpContext"></div><div class="wlHelpGrid">'+
    '<article><b>'+wlUi('Workspace layout','Layout del workspace')+'</b><span>'+wlUi('Split keeps 3D + plot + controls. 3D focus hides the companion plot. Plot focus gives more width to it. Layout, widths and control groups are saved automatically.','Split mantiene 3D + gráfica + controles. 3D focus oculta la gráfica. Plot focus le da más ancho. Layout, anchos y grupos se guardan automáticamente.')+'</span></article>'+
    '<article><b>'+wlUi('3D navigation','Navegación 3D')+'</b><span>'+wlUi('Orbit rotates, Pan translates, wheel zooms and Fit frames current geometry. Camera linking can be disabled per comparison workflow.','Orbit rota, Pan desplaza, la rueda hace zoom y Fit encuadra la geometría. El enlace de cámaras puede desactivarse en comparación.')+'</span></article>'+
    '<article><b>'+wlUi('Scientific comparison','Comparación científica')+'</b><span>'+wlUi('Exact requires the same physical time. Nearest shows Δt. Interpolated uses bracketing frames only when mesh, association, dimensions and array size are compatible.','Exact exige el mismo tiempo físico. Nearest muestra Δt. Interpolated usa frames vecinos solo si malla, asociación, dimensiones y tamaño son compatibles.')+'</span></article>'+
    '<article><b>Difference</b><span>'+wlUi('Signed keeps direction, Absolute shows magnitude, Percent normalizes by |A| with ε protection. Difference requires compatible quantities and meshes.','Signed conserva el signo, Absolute muestra magnitud y Percent normaliza por |A| con protección ε. Difference exige cantidades y mallas compatibles.')+'</span></article>'+
    '<article><b>Streamlines</b><span>'+wlUi('Plane / Line / Box / Patch define seed geometry. Seed density is independent of vector-glyph density. Forward / Backward / Both and integration limits control the path.','Plane / Line / Box / Patch definen semillas. La densidad es independiente de los glyphs vectoriales. Forward / Backward / Both y los límites controlan la trayectoria.')+'</span></article>'+
    '<article><b>'+wlUi('3D Spatial Profile','Perfil espacial 3D')+'</b><span>'+wlUi('Draw profile picks two rendered surface points A→B and samples the selected field along that physical line.','Draw profile selecciona dos puntos visibles A→B y muestrea el campo sobre esa línea física.')+'</span></article></div>'+
    '<div class="wlHelpActions"><button class="btn" id="wlResetLayout" type="button">'+wlUi('Reset saved layout','Restablecer layout guardado')+'</button><button class="btn primary" id="wlHelpDone" type="button">'+wlUi('Done','Listo')+'</button></div></section>';
  document.body.appendChild(o);document.getElementById('wlHelpClose').onclick=wlCloseHelp;document.getElementById('wlHelpDone').onclick=wlCloseHelp;document.getElementById('wlResetLayout').onclick=()=>{wlReset();wlRefreshHelp()};o.addEventListener('click',e=>{if(e.target===o)wlCloseHelp()})
}
function wlInstallHeaderButton(){
  if(document.getElementById('fwHelp'))return;const actions=document.querySelector('#fieldSurface .fwHeaderActions');if(!actions)return;const b=document.createElement('button');b.id='fwHelp';b.type='button';b.className='btn tiny';b.textContent='?';b.title=wlUi('Field Workspace help','Ayuda de Field Workspace');b.setAttribute('aria-label',b.title);b.onclick=wlOpenHelp;actions.appendChild(b)
}
function wlInstallStyle(){
  if(document.getElementById('wlStyles'))return;const st=document.createElement('style');st.id='wlStyles';
  st.textContent=[
    '.fwGrid.wlResizable{position:relative;grid-template-columns:minmax(320px,var(--wl-left-px,calc((100% - var(--wl-controls-px,340px) - 24px)*.575))) minmax(280px,1fr) var(--wl-controls-px,340px)!important}',
    '.fwGrid.wlResizable.layout-3d{grid-template-columns:minmax(0,1fr) var(--wl-controls-px,340px)!important}',
    '.wlSplitter{position:absolute;top:0;bottom:0;width:12px;z-index:35;cursor:col-resize;touch-action:none;outline:none}',
    '.wlSplitter:before{content:"";position:absolute;top:12px;bottom:12px;left:5px;width:2px;border-radius:2px;background:transparent;transition:background .15s}',
    '.wlSplitter:hover:before,.wlSplitter:focus:before,body.wlDragging .wlSplitter:before{background:color-mix(in srgb,var(--accent) 70%,transparent)}',
    '.wlSplitter-primary{left:var(--wl-left-px,calc((100% - var(--wl-controls-px,340px) - 24px)*.575))}',
    '.wlSplitter-controls{right:var(--wl-controls-px,340px);transform:translateX(6px)}',
    '.fwGrid.layout-3d .wlSplitter-primary,.fwGrid.layout-plot .wlSplitter-primary{display:none}',
    'body.wlDragging{cursor:col-resize!important;user-select:none!important}',
    '.wlHelpOverlay{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(2,8,18,.68);backdrop-filter:blur(10px)}.wlHelpOverlay.open{display:flex}',
    '.wlHelpDialog{width:min(880px,96vw);max-height:90vh;overflow:auto;padding:18px;border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 28px 80px rgba(0,0,0,.38)}',
    '.wlHelpHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.wlHelpHead h3{margin:2px 0 0}.wlHelpEyebrow{font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}',
    '.wlHelpContext{margin:12px 0;padding:10px 12px;border-left:3px solid var(--accent);border-radius:0 10px 10px 0;background:var(--accentSoft);font-size:10px;line-height:1.5}',
    '.wlHelpGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.wlHelpGrid article{padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}.wlHelpGrid b,.wlHelpGrid span{display:block}.wlHelpGrid b{font-size:10px}.wlHelpGrid span{margin-top:4px;color:var(--muted);font-size:9px;line-height:1.45}',
    '.wlHelpActions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap}',
    '@media(max-width:1350px){.fwGrid.wlResizable,.fwGrid.wlResizable.layout-3d{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}.fwGrid.wlResizable.layout-3d{grid-template-columns:1fr!important}.wlSplitter{display:none!important}}',
    '@media(max-width:760px){.wlHelpGrid{grid-template-columns:1fr}}'
  ].join('');
  document.head.appendChild(st)
}
function wlInstallAutosave(){
  if(document.body.dataset.wlAutosave)return;document.body.dataset.wlAutosave='1';
  document.addEventListener('change',e=>{const id=String(e.target?.id||'');if(['fwLayout','fwCompanion','fwSyncTime','fcPrimaryName','fcCompareName','fcLinkCameras','fcSyncVisuals'].includes(id)||/^fcExtra\d+Name$/.test(id)||e.target?.closest?.('.fwControlGroup'))setTimeout(wlSave,0)},true);
  document.addEventListener('input',e=>{const id=String(e.target?.id||'');if(id==='fcPrimaryName'||id==='fcCompareName'||/^fcExtra\d+Name$/.test(id))setTimeout(wlSave,0)},true);
  window.addEventListener('beforeunload',wlSave);window.addEventListener('resize',()=>{const x=wlRead();if(x)wlApplyWidths(x.leftPx,x.controlsPx)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('wlHelpOverlay')?.classList.contains('open'))wlCloseHelp()})
}
function wlInstall(){
  if(wlState.installed)return true;const grid=document.getElementById('fwGrid');if(!grid)return false;wlState.installed=true;wlInstallStyle();wlInstallSplitters();wlInstallHeaderButton();wlInstallHelp();wlInstallAutosave();wlApply(wlRead());
  window.FoamLensWorkspaceUX={save:wlSave,restore:()=>wlApply(wlRead()),reset:wlReset,openHelp:wlOpenHelp,closeHelp:wlCloseHelp,snapshot:wlSnapshot,apply:wlApply};return true
}
if(!wlInstall()){const retry=()=>{if(wlInstall())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
