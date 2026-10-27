/* Operacion Granada #176 / G3 — actual Time Series control ownership, not parser changes.
   Existing selectors, generator controls, and listeners are reparented, never cloned. */
(function(){
  'use strict';
  const state={installed:false,busy:false,cancel:null,build:null,observer:null,progress:null};
  const byId=id=>document.getElementById(id);
  function translate(en,es){
    try{return typeof flUi==='function'?flUi(en,es):(byId('language')?.value==='es'?es:en)}catch{return en}
  }
  function setBusy(busy){
    if(busy&&!state.busy)state.progress=null;
    state.busy=!!busy;
    if(state.cancel)state.cancel.disabled=!state.busy;
    if(state.build){state.build.setAttribute('aria-busy',state.busy?'true':'false')}
    const section=byId('gr176HistoryCard');
    if(section)section.dataset.loading=state.busy?'true':'false';
    const pending=byId('gr176Pending');
    if(pending)pending.textContent=state.busy?
      (state.progress?historyProgressLabel(state.progress):
        translate('Reading original source data…','Leyendo datos originales de la fuente…')):'';
  }
  function historyProgressLabel(p){
    const noun=p.source==='profile'?
      translate('real profile rows inspected','filas reales de perfil revisadas'):
      translate('OpenFOAM frames inspected','fotogramas OpenFOAM revisados');
    return translate('Series ','Serie ')+p.slot+': '+p.completed+' / '+p.total+' '+noun
  }
  function onSourceProgress(event){
    const p=event?.detail;
    if(!state.busy||!p||![1,2].includes(p.slot)||!['global','probe','profile'].includes(p.source))return;
    if(typeof fwState==='undefined'||p.seq!==fwState.fieldTsSeq)return;
    if(!Number.isSafeInteger(p.completed)||!Number.isSafeInteger(p.total)||
      p.total<1||p.completed<1||p.completed>p.total)return;
    state.progress={slot:p.slot,completed:p.completed,total:p.total,seq:p.seq,source:p.source};
    const status=byId('gr176Pending');
    if(status)status.textContent=historyProgressLabel(state.progress);
  }
  function cancelHistory(){
    if(!state.busy)return false;
    // All source-read loops and the final atomic series commit check this epoch.
    // This prevents partial chart mutation; an in-flight disk read cannot be interrupted.
    if(typeof fwState==='undefined'||!Number.isSafeInteger(fwState.fieldTsSeq))return false;
    ++fwState.fieldTsSeq;
    setBusy(false);
    if(typeof fwFieldTsSetStatus==='function')fwFieldTsSetStatus(translate(
      'Cancelled. The in-flight read may finish, but no cancelled history will be committed.',
      'Cancelado. La lectura en curso puede terminar, pero no se guardará la historia cancelada.'));
    return true;
  }
  function updateLanguage(){
    const t=byId('gr176ExistingTitle'),h=byId('gr176HistoryTitle'),note=byId('gr176HistoryHelp'),cancel=byId('gr176Cancel');
    if(t)t.textContent=translate('Existing time series','Series temporales existentes');
    if(h)h.textContent=translate('Create history from real OpenFOAM fields','Crear historia desde campos OpenFOAM reales');
    if(note)note.textContent=translate(
      'Two independent source slots. Choose a case, region, field, component and physical-time statistic. No curve exists until Build finishes.',
      'Dos fuentes independientes. Elige caso, región, campo, componente y estadístico en tiempo físico. No hay curva hasta terminar la generación.');
    if(cancel){cancel.textContent=translate('Cancel build','Cancelar generación');cancel.setAttribute('aria-label',cancel.textContent)}
    if(state.busy)setBusy(true);
  }
  function installStyle(){
    if(byId('gr176TimeSeriesStyle'))return;
    const sheet=document.createElement('style');sheet.id='gr176TimeSeriesStyle';
    sheet.textContent=[
      '#timeSeriesControls.gr176TimeSeries{display:grid;gap:12px;min-width:0;margin-top:8px;align-items:start}',
      '#timeSeriesControls.gr176TimeSeries.hidden{display:none!important}',
      '#fwDataFieldHistories.gr176SourceAnchor{display:none!important}',
      '.gr176Card{display:grid;gap:10px;min-width:0;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--panel2)}',
      '.gr176CardHead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px solid var(--line)}',
      '.gr176CardHead h3{font-size:13px;line-height:1.35;font-weight:800;letter-spacing:0;margin:0;color:var(--text)}',
      '.gr176Card .analysisTitle{margin:0;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.gr176Card .analysisTitle strong{font-size:11px}',
      '.gr176Card .row2,.gr176Card .tsdGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px;min-width:0}',
      '.gr176Card .field,.gr176Card .field select,.gr176Card .field input{min-width:0;width:100%;box-sizing:border-box}',
      '.gr176Card .field label,.gr176Card label{font-size:10px;line-height:1.35;white-space:normal;overflow-wrap:anywhere}',
      '.gr176Card select,.gr176Card input:not([type="checkbox"]){min-height:34px;font-size:11px}',
      '.gr176Card button{min-height:34px;white-space:normal;font-size:11px}',
      '.gr176Card .fwFieldTsControls{display:grid;gap:9px;margin:0;padding:0;min-width:0}',
      '.gr176Card .fwTsSeries{display:grid;gap:8px;min-width:0;padding:10px;border-radius:11px;background:var(--panel)}',
      '.gr176Card .fwTsSeriesHead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.gr176HistoryActions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}',
      '.gr176HistoryActions #fwBuildFieldHistories{flex:1 1 180px;min-width:0}',
      '.gr176HistoryActions #gr176Cancel{flex:0 1 auto}',
      '#gr176HistoryCard[data-loading="true"]{border-color:var(--accent)}',
      '.gr176Pending{font-size:10px;line-height:1.5;color:var(--muted)}',
      '.gr176Pending:empty{display:none}',
      '.gr176Card #fwTsStatus{min-height:18px;overflow-wrap:anywhere}',
      '.gr176Card .timeSeriesActions{display:flex;gap:7px;flex-wrap:wrap}',
      '.gr176Card .timeSeriesHint,.gr176Card .smallnote{font-size:10px;line-height:1.5;overflow-wrap:anywhere}',
      '.gr176Card :is(button,select,input):focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
      '.gr176Card [disabled]{opacity:.57;cursor:not-allowed}',
      '@media(max-width:1100px){.gr176Card{padding:10px}.gr176Card .row2,.gr176Card .tsdGrid{grid-template-columns:repeat(auto-fit,minmax(min(100%,132px),1fr))}}'
    ].join('\n');
    document.head.appendChild(sheet);
  }
  function install(){
    if(state.installed)return true;
    const panel=byId('timeSeriesControls'),root=byId('fwFieldTsControls'),
      details=byId('fwDataFieldHistories'),build=byId('fwBuildFieldHistories');
    if(!panel||!root||!build)return false;
    installStyle();
    const existing=document.createElement('section');
    existing.id='gr176ExistingCard';existing.className='gr176Card';existing.setAttribute('aria-labelledby','gr176ExistingTitle');
    const existingHead=document.createElement('div');existingHead.className='gr176CardHead';
    const existingTitle=document.createElement('h3');existingTitle.id='gr176ExistingTitle';existingHead.appendChild(existingTitle);
    existing.appendChild(existingHead);
    const history=document.createElement('section');history.id='gr176HistoryCard';history.className='gr176Card';
    history.setAttribute('aria-labelledby','gr176HistoryTitle');
    const historyHead=document.createElement('div');historyHead.className='gr176CardHead';
    const historyTitle=document.createElement('h3');historyTitle.id='gr176HistoryTitle';historyHead.appendChild(historyTitle);
    history.appendChild(historyHead);
    const help=document.createElement('p');help.id='gr176HistoryHelp';help.className='smallnote';
    history.appendChild(help);
    // Reuse every original data/filter node. No synthetic field options, no duplicate IDs.
    for(const child of Array.from(panel.children)){
      if(child!==details)existing.appendChild(child);
    }
    // The existing generator was hidden in <details>; now its exact bound controls
    // have a dedicated, permanently available source panel, even with zero curves.
    history.appendChild(root);root.classList.remove('hidden');
    if(details){
      details.open=true;
      // The historical generator refresh guard still checks this details.open.
      // Keep a hidden anchor (not its controls) so late case imports refresh source lists.
      details.classList.add('gr176SourceAnchor');
    }
    const actions=document.createElement('div');actions.className='gr176HistoryActions';
    build.parentNode.insertBefore(actions,build);actions.appendChild(build);
    const cancel=document.createElement('button');cancel.id='gr176Cancel';cancel.type='button';
    cancel.className='btn soft';cancel.disabled=true;actions.appendChild(cancel);
    const pending=document.createElement('div');pending.id='gr176Pending';pending.className='gr176Pending';
    pending.setAttribute('role','status');pending.setAttribute('aria-live','polite');
    actions.insertAdjacentElement('afterend',pending);
    panel.appendChild(existing);panel.appendChild(history);
    panel.classList.add('gr176TimeSeries');
    state.installed=true;state.build=build;state.cancel=cancel;
    build.addEventListener('click',()=>{
      const allowed=(typeof activeAppMode==='undefined'||activeAppMode==='data')&&
        (typeof currentDataView==='undefined'||currentDataView==='timeseries');
      if(allowed&&!build.disabled)setBusy(true);
    },true);
    cancel.addEventListener('click',cancelHistory);
    const status=byId('fwTsStatus');
    if(status){
      status.setAttribute('aria-live','polite');
      state.observer=new MutationObserver(()=>{
        if(!state.busy)return;
        const txt=status.textContent||'';
        if(!/Building 3D field histories|Construyendo historias temporales 3D/i.test(txt))setBusy(false);
      });
      state.observer.observe(status,{subtree:true,characterData:true,childList:true});
    }
    document.addEventListener('foamlens-language-change',updateLanguage);
    document.addEventListener('foamlens-field-history-progress',onSourceProgress);
    updateLanguage();
    try{if(typeof fwRefreshFieldTsControls==='function')fwRefreshFieldTsControls()}catch(error){console.warn('Granada G3 field options refresh not ready',error)}
    window.FoamLensGranadaT2={installed:()=>state.installed,isBuilding:()=>state.busy,cancel:cancelHistory,refreshLabels:updateLanguage};
    return true;
  }
  if(!install()){
    const obs=new MutationObserver(()=>{if(install())obs.disconnect()});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('DOMContentLoaded',()=>{if(install())obs.disconnect()},{once:true});
  }
})();
