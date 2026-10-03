/* FoamLens Desktop — compact Word-style ribbon navigation. */
const flRibbonState={activeTab:'home',installed:false};

function flRibbonUi(en,es){
  try{return flUi(en,es)}catch{return en}
}
function flRibbonIcon(name){
  const paths={
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    folder:'<path d="M3 6.5h7l2 2h9v10H3z"/><path d="M3 6.5V5h7l2 2"/>',
    file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    save:'<path d="M4 4h14l2 2v14H4z"/><path d="M7 4v6h9V4"/><rect x="8" y="14" width="8" height="6" rx="1"/>',
    case:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5V3h8v2M8 10h8M8 14h5"/>',
    eye:'<path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
    pulse:'<path d="M3 13h4l2-6 4 11 2-6h6"/>',
    database:'<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    chart:'<path d="M4 20V5M4 20h16"/><path d="m7 16 4-5 3 2 5-7"/>',
    profile:'<path d="M4 19h16M5 16c2-6 5-8 8-5s4 1 6-5"/>',
    log:'<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    add:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
    grid:'<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M12 4v16M3.5 12h17"/>',
    sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h8M16 18h4"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    probe:'<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1"/>',
    slice:'<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/><path d="M7 10 17 15"/>',
    vector:'<path d="M4 18 18 4M12 4h6v6"/><path d="M5 8h5M8 5v5"/>',
    stream:'<path d="M3 8c4-5 7 5 11 0s5 0 7 1M3 15c4-5 7 5 11 0s5 0 7 1"/>',
    fit:'<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><path d="M3 8l5-5M21 8l-5-5M3 16l5 5M21 16l-5 5"/>',
    reset:'<path d="M5 7V3M5 3h4"/><path d="M5 3a9 9 0 1 1-2 10"/>',
    flask:'<path d="M9 3h6M10 3v6l-6 10a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 19L14 9V3"/><path d="M7.5 15h9"/>',
    compare:'<path d="M7 5h13M17 2l3 3-3 3M17 19H4M7 16l-3 3 3 3"/>',
    delta:'<path d="M12 3 21 20H3z"/><path d="M8 16h8"/>',
    export:'<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 13v7h14v-7"/>',
    image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    theme:'<path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/>',
    language:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/>'
  };
  return '<svg class="flRibbonIcon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.info)+'</svg>';
}
function flRibbonActionHtml(id,icon,en,es,group,extraClass){
  return '<button class="flRibbonAction '+(extraClass||'')+'" id="'+id+'" type="button" data-ri-en="'+en.replace(/"/g,'&quot;')+'" data-ri-es="'+es.replace(/"/g,'&quot;')+'" title="'+en+'">'+flRibbonIcon(icon)+'<span class="flRibbonLabel">'+en+'</span></button>';
}
function flRibbonGroup(labelEn,labelEs,actions){
  return '<div class="flRibbonGroup"><div class="flRibbonActions">'+actions.join('')+'</div><div class="flRibbonGroupLabel" data-ri-en="'+labelEn+'" data-ri-es="'+labelEs+'">'+labelEn+'</div></div>';
}
function flRibbonTabHtml(key,icon,en,es){
  return '<button class="flRibbonTab'+(key==='home'?' active':'')+'" id="flRibbonTab-'+key+'" type="button" role="tab" data-ribbon-tab="'+key+'" aria-selected="'+(key==='home'?'true':'false')+'" data-ri-en="'+en+'" data-ri-es="'+es+'">'+flRibbonIcon(icon)+'<span>'+en+'</span></button>';
}
function flRibbonPanelHtml(key,groups){
  return '<div class="flRibbonPanel'+(key==='home'?' active':'')+'" id="flRibbonPanel-'+key+'" role="tabpanel" data-ribbon-panel="'+key+'">'+groups.join('')+'</div>';
}
function flRibbonBuild(){
  const tabs=[
    ['home','home','Home','Inicio'],['data','database','Data','Datos'],['field','cube','3D / Field','3D / Campo'],
    ['plots','chart','Plots','Gráficas'],['analysis','flask','Analysis','Análisis'],['compare','compare','Compare','Comparar'],
    ['export','export','Export','Exportar'],['view','eye','View','Vista']
  ].map(x=>flRibbonTabHtml(...x)).join('');

  const home=[
    flRibbonGroup('File','Archivo',[
      flRibbonActionHtml('flRaOpenFiles','file','Open files','Abrir archivos'),
      flRibbonActionHtml('flRaOpenFolder','folder','Open folder','Abrir carpeta'),
      flRibbonActionHtml('flRaSaveWorkspace','save','Save','Guardar'),
      flRibbonActionHtml('flRaOpenWorkspace','folder','Workspace','Workspace')
    ]),
    flRibbonGroup('Project','Proyecto',[
      flRibbonActionHtml('flRaOverview','home','Overview','Resumen'),
      flRibbonActionHtml('flRaCases','case','Cases','Casos'),
      flRibbonActionHtml('flRaReview','eye','Review','Revisar'),
      flRibbonActionHtml('flRaLive','pulse','Live','En vivo')
    ]),
    flRibbonGroup('FoamLens','FoamLens',[flRibbonActionHtml('flRaAbout','info','About','Acerca de')])
  ];
  const data=[
    flRibbonGroup('Explore','Explorar',[
      flRibbonActionHtml('flRaTimeSeries','chart','Time series','Series temporales'),
      flRibbonActionHtml('flRaProfiles','profile','Profiles','Perfiles'),
      flRibbonActionHtml('flRaLogs','log','Solver logs','Logs solver'),
      flRibbonActionHtml('flRaCatalog','database','Catalog','Catálogo')
    ]),
    flRibbonGroup('Series','Series',[
      flRibbonActionHtml('flRaSelectAll','case','Select all','Seleccionar todo'),
      flRibbonActionHtml('flRaShowSeries','eye','Show series','Mostrar series'),
      flRibbonActionHtml('flRaClear','reset','Clear','Limpiar','','danger')
    ])
  ];
  const field=[
    flRibbonGroup('Workspace','Workspace',[
      flRibbonActionHtml('flRaFieldWorkspace','cube','Field view','Vista 3D'),
      flRibbonActionHtml('flRaAdd3D','add','Add 3D','Añadir 3D'),
      flRibbonActionHtml('flRaConfigure3D','sliders','Configure','Configurar')
    ]),
    flRibbonGroup('Layout','Diseño',[
      flRibbonActionHtml('flRaSplit','grid','Split','Dividida'),
      flRibbonActionHtml('flRa3DFocus','cube','3D focus','Foco 3D'),
      flRibbonActionHtml('flRaPlotFocus','chart','Plot focus','Foco gráfica')
    ]),
    flRibbonGroup('Inspect','Inspeccionar',[
      flRibbonActionHtml('flRaProbe','probe','Probe','Sonda'),
      flRibbonActionHtml('flRaSlice','slice','Slice','Corte'),
      flRibbonActionHtml('flRaVectors','vector','Vectors','Vectores'),
      flRibbonActionHtml('flRaStreamlines','stream','Streamlines','Corrientes')
    ]),
    flRibbonGroup('Camera','Cámara',[
      flRibbonActionHtml('flRaFit','fit','Fit','Ajustar'),
      flRibbonActionHtml('flRaResetCamera','reset','Reset','Restablecer')
    ])
  ];
  const plots=[
    flRibbonGroup('Plot type','Tipo de gráfica',[
      flRibbonActionHtml('flRaPlotTimeSeries','chart','Time series','Series temporales'),
      flRibbonActionHtml('flRaPlotProfiles','profile','Spatial profile','Perfil espacial'),
      flRibbonActionHtml('flRaPlotLogs','log','Solver logs','Logs solver')
    ]),
    flRibbonGroup('Display','Visualización',[
      flRibbonActionHtml('flRaPlotShowSeries','eye','Series','Series'),
      flRibbonActionHtml('flRaZoomFit','fit','Fit chart','Ajustar gráfica'),
      flRibbonActionHtml('flRaThesisFigure','image','Thesis figure','Figura tesis')
    ])
  ];
  const analysis=[
    flRibbonGroup('Analysis','Análisis',[
      flRibbonActionHtml('flRaAnalysisGeneral','flask','General','General'),
      flRibbonActionHtml('flRaCoupling','compare','Coupling','Acoplamiento'),
      flRibbonActionHtml('flRaFront','profile','Front track','Frente'),
      flRibbonActionHtml('flRaDifference','delta','Difference','Diferencia')
    ]),
    flRibbonGroup('Fields','Campos',[
      flRibbonActionHtml('flRaMapping','grid','Mapping','Mapeo'),
      flRibbonActionHtml('flRaPhaseMomentum','vector','Phase / Mom.','Fase / Mom.')
    ])
  ];
  const compare=[
    flRibbonGroup('3D compare','Comparación 3D',[
      flRibbonActionHtml('flRaCompare3D','compare','Compare 3D','Comparar 3D'),
      flRibbonActionHtml('flRaCompareAddView','add','Add view','Añadir vista'),
      flRibbonActionHtml('flRaCompareConfig','sliders','Configure','Configurar')
    ]),
    flRibbonGroup('Differences','Diferencias',[
      flRibbonActionHtml('flRaCompareDifference','delta','Difference','Diferencia'),
      flRibbonActionHtml('flRaCreateDifference','chart','Create Δ','Crear Δ')
    ])
  ];
  const exp=[
    flRibbonGroup('Figures','Figuras',[
      flRibbonActionHtml('flRaExportPng','image','PNG','PNG'),
      flRibbonActionHtml('flRaExportSvg','image','SVG','SVG'),
      flRibbonActionHtml('flRaExportCsv','database','CSV','CSV'),
      flRibbonActionHtml('flRaExportThesis','image','Thesis','Tesis')
    ]),
    flRibbonGroup('Animation','Animación',[
      flRibbonActionHtml('flRaExportVideo','video','Video','Video')
    ])
  ];
  const view=[
    flRibbonGroup('Panels','Paneles',[
      flRibbonActionHtml('flRaSidebar','sidebar','Sidebar','Panel lateral'),
      flRibbonActionHtml('flRaViewFit','fit','Fit','Ajustar')
    ]),
    flRibbonGroup('Appearance','Apariencia',[
      flRibbonActionHtml('flRaTheme','theme','Theme','Tema'),
      flRibbonActionHtml('flRaLanguage','language','Language','Idioma')
    ])
  ];

  return '<section class="flRibbon" id="flRibbon" aria-label="FoamLens ribbon">'+
    '<div class="flRibbonTabRow"><div class="flRibbonTabs" role="tablist">'+tabs+'</div><div class="flRibbonTrailHost" id="flRibbonTrailHost"></div></div>'+
    '<div class="flRibbonPanels">'+
      flRibbonPanelHtml('home',home)+flRibbonPanelHtml('data',data)+flRibbonPanelHtml('field',field)+flRibbonPanelHtml('plots',plots)+
      flRibbonPanelHtml('analysis',analysis)+flRibbonPanelHtml('compare',compare)+flRibbonPanelHtml('export',exp)+flRibbonPanelHtml('view',view)+
    '</div>'+
    '<div class="flRibbonContextHost" id="flRibbonContextHost"></div>'+
  '</section>';
}
function flRibbonCss(){
  return [
    'body.flRibbonReady #modeNavBar{display:none!important}',
    'body.flRibbonReady .top{min-height:44px;padding:7px 14px;flex-wrap:nowrap}',
    'body.flRibbonReady .top h2{font-size:14px}',
    'body.flRibbonReady .top .sub{font-size:9px;margin-top:2px}',
    'body.flRibbonReady .top .tools{display:none!important}',
    '.flRibbon{position:relative;z-index:260;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--panel) 96%,transparent);box-shadow:0 4px 18px rgba(18,32,51,.045);min-width:0}',
    'body.dark .flRibbon{box-shadow:0 4px 18px rgba(0,0,0,.18)}',
    '.flRibbonTabRow{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:31px;padding:0 10px;border-bottom:1px solid var(--line);background:var(--panel2)}',
    '.flRibbonTabs{display:flex;align-items:stretch;gap:1px;overflow-x:auto;scrollbar-width:thin;min-width:0}',
    '.flRibbonTab{display:flex;align-items:center;gap:5px;min-width:max-content;padding:5px 9px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font-size:9px;font-weight:780;border-radius:7px 7px 0 0}',
    '.flRibbonTab .flRibbonIcon{width:13px;height:13px}',
    '.flRibbonTab:hover{background:var(--panel);color:var(--text)}',
    '.flRibbonTab.active{color:var(--accent);background:var(--panel);border-bottom-color:var(--accent)}',
    '.flRibbonTrailHost{min-width:0;display:flex;justify-content:flex-end}.flRibbonTrailHost .contextTrail{display:block;max-width:280px;font-size:8px}',
    '.flRibbonPanels{min-height:78px;overflow:hidden}',
    '.flRibbonPanel{display:none;align-items:stretch;gap:0;min-height:78px;padding:5px 8px;overflow-x:auto;overflow-y:hidden}',
    '.flRibbonPanel.active{display:flex}',
    '.flRibbonGroup{position:relative;display:flex;align-items:stretch;padding:0 8px 13px 7px;border-right:1px solid var(--line);flex:0 0 auto}',
    '.flRibbonGroup:last-child{border-right:0}',
    '.flRibbonActions{display:flex;align-items:stretch;gap:3px}',
    '.flRibbonGroupLabel{position:absolute;left:7px;right:8px;bottom:1px;text-align:center;color:var(--muted);font-size:7px;font-weight:760;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.flRibbonAction{min-width:50px;max-width:70px;min-height:58px;padding:4px 5px 3px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;line-height:1.05}',
    '.flRibbonAction:hover{border-color:var(--line);background:var(--accentSoft);color:var(--accent)}',
    '.flRibbonAction.active{border-color:color-mix(in srgb,var(--accent) 52%,var(--line));background:var(--accentSoft);color:var(--accent)}',
    '.flRibbonAction.danger{color:var(--danger)}',
    '.flRibbonIcon{width:21px;height:21px;display:block;flex:none}',
    '.flRibbonLabel{font-size:8px;font-weight:720;text-align:center;white-space:normal;max-width:64px;line-height:1.08}',
    '.flRibbonContextHost{border-top:1px solid var(--line);padding:3px 10px;background:var(--panel2);min-height:27px;display:flex;align-items:center;overflow-x:auto}',
    '.flRibbonContextHost .globalContextBar{width:100%;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;min-height:0!important}',
    '.flRibbonContextHost .contextProject span,.flRibbonContextHost .contextCompact label{font-size:7px!important}',
    '.flRibbonContextHost .contextProject b{font-size:9px!important}',
    '.flRibbonContextHost select{padding:4px 7px!important;font-size:8px!important;min-height:25px!important}',
    '.flRibbonContextHost .contextActions .btn{padding:4px 7px!important;font-size:8px!important;border-radius:7px!important}',
    '@media(max-width:980px){.flRibbonTrailHost{display:none}.flRibbonAction{min-width:46px}.flRibbonLabel{font-size:7.5px}.flRibbonPanel{min-height:74px}.flRibbonPanels{min-height:74px}}',
    '@media(max-width:640px){.flRibbonContextHost{display:none}.flRibbonAction{min-width:43px;padding-inline:3px}.flRibbonIcon{width:19px;height:19px}.flRibbonTab{padding-inline:7px}}'
  ].join('');
}
function flRibbonSelectTab(key){
  if(!document.getElementById('flRibbonTab-'+key))key='home';
  flRibbonState.activeTab=key;
  document.querySelectorAll('.flRibbonTab').forEach(b=>{const on=b.dataset.ribbonTab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});
  document.querySelectorAll('.flRibbonPanel').forEach(p=>p.classList.toggle('active',p.dataset.ribbonPanel===key));
}
function flRibbonClick(id){
  const el=document.getElementById(id);if(!el||el.disabled)return false;el.click();return true
}
function flRibbonMode(mode,tab){
  if(tab)flRibbonSelectTab(tab);
  try{setAppMode(mode)}catch{flRibbonClick('mode'+String(mode).charAt(0).toUpperCase()+String(mode).slice(1))}
}
function flRibbonData(tabId,tabKey){
  flRibbonSelectTab(tabKey||'data');try{setAppMode('data')}catch{};requestAnimationFrame(()=>flRibbonClick(tabId))
}
function flRibbonField(fn,tabKey){
  flRibbonSelectTab(tabKey||'field');try{setAppMode('field')}catch{flRibbonClick('modeField')};requestAnimationFrame(()=>{try{fn&&fn()}catch(e){console.error(e)}})
}
function flRibbonToggleCheck(id){
  const el=document.getElementById(id);if(!el)return false;el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}));return true
}
function flRibbonSetLayout(value){
  flRibbonField(()=>{const s=document.getElementById('fwLayout');if(!s)return;s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}))},'field')
}
function flRibbonAnalysis(name,tabKey){
  flRibbonSelectTab(tabKey||'analysis');try{setAppMode('analysis')}catch{};requestAnimationFrame(()=>document.querySelector('.analysisSubBtn[data-analysis="'+name+'"]')?.click())
}
function flRibbonApplyLanguage(){
  const es=document.getElementById('language')?.value==='es';
  document.querySelectorAll('#flRibbon [data-ri-en]').forEach(el=>{
    const value=es?el.dataset.riEs:el.dataset.riEn;if(!value)return;
    if(el.classList.contains('flRibbonAction')){const label=el.querySelector('.flRibbonLabel');if(label)label.textContent=value;el.title=value}
    else if(el.classList.contains('flRibbonTab')){const label=el.querySelector('span');if(label)label.textContent=value}
    else el.textContent=value;
  })
}
function flRibbonSyncStates(){
  const map=[
    ['flRaProbe',document.getElementById('fvProbeMode')?.getAttribute('aria-pressed')==='true'],
    ['flRaSlice',!!document.getElementById('fvSlice')?.checked],
    ['flRaVectors',!!document.getElementById('fvVectors')?.checked],
    ['flRaStreamlines',!!document.getElementById('fvStreamlines')?.checked],
    ['flRaCompare3D',!!document.getElementById('fcEnabled')?.checked]
  ];
  for(const [id,on] of map)document.getElementById(id)?.classList.toggle('active',!!on)
}
function flRibbonBind(id,fn){
  document.getElementById(id)?.addEventListener('click',e=>{e.preventDefault();fn();setTimeout(flRibbonSyncStates,0)})
}
function flRibbonInstall(){
  if(flRibbonState.installed||document.getElementById('flRibbon'))return true;
  const top=document.querySelector('.main > .top');if(!top)return false;
  top.insertAdjacentHTML('afterend',flRibbonBuild());
  const style=document.createElement('style');style.id='flRibbonStyles';style.textContent=flRibbonCss();document.head.appendChild(style);
  const context=document.getElementById('globalContextBar'),contextHost=document.getElementById('flRibbonContextHost');if(context&&contextHost)contextHost.appendChild(context);
  const trail=document.getElementById('contextTrail'),trailHost=document.getElementById('flRibbonTrailHost');if(trail&&trailHost)trailHost.appendChild(trail);
  document.body.classList.add('flRibbonReady');flRibbonState.installed=true;

  document.querySelectorAll('.flRibbonTab').forEach(b=>b.addEventListener('click',()=>flRibbonSelectTab(b.dataset.ribbonTab||'home')));

  flRibbonBind('flRaOpenFiles',()=>flRibbonClick('addFiles'));
  flRibbonBind('flRaOpenFolder',()=>flRibbonClick('addFolder'));
  flRibbonBind('flRaSaveWorkspace',()=>flRibbonClick('saveWorkspaceTop'));
  flRibbonBind('flRaOpenWorkspace',()=>flRibbonClick('openWorkspaceTop'));
  flRibbonBind('flRaOverview',()=>flRibbonMode('workspace','home'));
  flRibbonBind('flRaCases',()=>flRibbonClick('caseQuickBtn'));
  flRibbonBind('flRaReview',()=>flRibbonMode('review','home'));
  flRibbonBind('flRaLive',()=>flRibbonMode('live','home'));
  flRibbonBind('flRaAbout',()=>flRibbonClick('aboutDeveloperBtn'));

  flRibbonBind('flRaTimeSeries',()=>flRibbonData('timeSeriesTab','data'));
  flRibbonBind('flRaProfiles',()=>flRibbonData('profileTab','data'));
  flRibbonBind('flRaLogs',()=>flRibbonData('logTab','data'));
  flRibbonBind('flRaCatalog',()=>flRibbonData('catalogTab','data'));
  flRibbonBind('flRaSelectAll',()=>flRibbonClick('selectAll'));
  flRibbonBind('flRaShowSeries',()=>flRibbonClick('showSeriesTop'));
  flRibbonBind('flRaClear',()=>flRibbonClick('clear'));

  flRibbonBind('flRaFieldWorkspace',()=>flRibbonField(null,'field'));
  flRibbonBind('flRaAdd3D',()=>flRibbonField(()=>flRibbonClick('fwAdd3DView'),'field'));
  flRibbonBind('flRaConfigure3D',()=>flRibbonField(()=>flRibbonClick('fwConfigureViews'),'field'));
  flRibbonBind('flRaSplit',()=>flRibbonSetLayout('split'));
  flRibbonBind('flRa3DFocus',()=>flRibbonSetLayout('3d'));
  flRibbonBind('flRaPlotFocus',()=>flRibbonSetLayout('plot'));
  flRibbonBind('flRaProbe',()=>flRibbonField(()=>flRibbonClick('fvProbeMode'),'field'));
  flRibbonBind('flRaSlice',()=>flRibbonField(()=>flRibbonToggleCheck('fvSlice'),'field'));
  flRibbonBind('flRaVectors',()=>flRibbonField(()=>flRibbonToggleCheck('fvVectors'),'field'));
  flRibbonBind('flRaStreamlines',()=>flRibbonField(()=>flRibbonToggleCheck('fvStreamlines'),'field'));
  flRibbonBind('flRaFit',()=>flRibbonField(()=>flRibbonClick('fvFitCamera'),'field'));
  flRibbonBind('flRaResetCamera',()=>flRibbonField(()=>flRibbonClick('fvResetCamera'),'field'));

  flRibbonBind('flRaPlotTimeSeries',()=>flRibbonData('timeSeriesTab','plots'));
  flRibbonBind('flRaPlotProfiles',()=>flRibbonData('profileTab','plots'));
  flRibbonBind('flRaPlotLogs',()=>flRibbonData('logTab','plots'));
  flRibbonBind('flRaPlotShowSeries',()=>flRibbonClick('showSeriesTop'));
  flRibbonBind('flRaZoomFit',()=>flRibbonClick('zoomFit'));
  flRibbonBind('flRaThesisFigure',()=>flRibbonClick('thesisFigureBtn'));

  flRibbonBind('flRaAnalysisGeneral',()=>{flRibbonMode('analysis','analysis');requestAnimationFrame(()=>flRibbonClick('generalAnalysisNav'))});
  flRibbonBind('flRaCoupling',()=>flRibbonAnalysis('coupling','analysis'));
  flRibbonBind('flRaFront',()=>flRibbonAnalysis('front','analysis'));
  flRibbonBind('flRaDifference',()=>flRibbonAnalysis('difference','analysis'));
  flRibbonBind('flRaMapping',()=>{flRibbonMode('analysis','analysis');requestAnimationFrame(()=>flRibbonClick('pmMappingNav'))});
  flRibbonBind('flRaPhaseMomentum',()=>{flRibbonMode('analysis','analysis');requestAnimationFrame(()=>flRibbonClick('pmPhaseNav'))});

  flRibbonBind('flRaCompare3D',()=>flRibbonField(()=>flRibbonToggleCheck('fcEnabled'),'compare'));
  flRibbonBind('flRaCompareAddView',()=>flRibbonField(()=>flRibbonClick('fcAddView'),'compare'));
  flRibbonBind('flRaCompareConfig',()=>flRibbonField(()=>flRibbonClick('fwConfigureViews'),'compare'));
  flRibbonBind('flRaCompareDifference',()=>flRibbonAnalysis('difference','compare'));
  flRibbonBind('flRaCreateDifference',()=>{flRibbonAnalysis('difference','compare');requestAnimationFrame(()=>flRibbonClick('createDifference'))});

  flRibbonBind('flRaExportPng',()=>flRibbonClick('exportPng'));
  flRibbonBind('flRaExportSvg',()=>flRibbonClick('exportSvg'));
  flRibbonBind('flRaExportCsv',()=>flRibbonClick('exportCsv'));
  flRibbonBind('flRaExportThesis',()=>flRibbonClick('thesisFigureBtn'));
  flRibbonBind('flRaExportVideo',()=>flRibbonField(()=>{const panel=document.getElementById('fvAnimationPanel');if(panel){panel.open=true;panel.scrollIntoView({block:'nearest'})}else flRibbonClick('fvVideoExport')},'export'));

  flRibbonBind('flRaSidebar',()=>flRibbonClick('sidebarToggle'));
  flRibbonBind('flRaViewFit',()=>{if(document.body.classList.contains('appMode-field'))flRibbonField(()=>flRibbonClick('fvFitCamera'),'view');else flRibbonClick('zoomFit')});
  flRibbonBind('flRaTheme',()=>{const s=document.getElementById('theme');if(!s)return;s.value=s.value==='dark'?'light':'dark';s.dispatchEvent(new Event('change',{bubbles:true}))});
  flRibbonBind('flRaLanguage',()=>{const s=document.getElementById('language');if(!s)return;s.value=s.value==='es'?'en':'es';s.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(flRibbonApplyLanguage,0)});

  document.addEventListener('click',e=>{
    const id=e.target?.closest?.('[id]')?.id||'';
    const modeMap={modeWorkspace:'home',modeData:'data',modeField:'field',modeAnalysis:'analysis',modeReview:'home',modeLive:'home'};
    if(modeMap[id])flRibbonSelectTab(modeMap[id]);
    setTimeout(flRibbonSyncStates,0)
  },true);
  document.addEventListener('change',()=>setTimeout(flRibbonSyncStates,0),true);
  document.addEventListener('foamlens-language-change',flRibbonApplyLanguage);
  document.getElementById('language')?.addEventListener('change',flRibbonApplyLanguage);
  flRibbonApplyLanguage();flRibbonSyncStates();flRibbonSelectTab('home');
  window.FoamLensRibbon={selectTab:flRibbonSelectTab,sync:flRibbonSyncStates,isInstalled:()=>flRibbonState.installed};
  return true
}
flRibbonInstall();
