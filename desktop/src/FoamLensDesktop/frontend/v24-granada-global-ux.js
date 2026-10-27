/* Granada #177 G0/G1 — global UI inventory and primary action hierarchy.
 * Move original secondary Ribbon buttons. Do not duplicate original IDs/actions.
 * Field F1/F2 remains owned by active PRs #162/#175.
 */
/* GRANADA177_CORE_START */
const gxGroups={
 home:{primary:['flRaOpenFiles','flRaOpenFolder','flRaSaveWorkspace','flRaCases','flRaReview','flRaLive'],more:['flRaOpenWorkspace','flRaOverview']},
 data:{primary:['flRaCatalog','flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'],more:['flRaSelectAll','flRaShowSeries','flRaClear']},
 field:{primary:['flRaFieldWorkspace','flRaInspector','fwTimeTransport'],contextual:['flFieldContextTabs','fvViewport','fcViewport','fcExtra3Viewport','fcExtra4Viewport']},
 analysis:{primary:['flRaAnalysisGeneral','flRaCoupling','flRaFront','flRaDifference','flRaMapping','flRaPhaseMomentum'],more:['flRaAnalysisTimeResult','flRaAnalysisProfileResult']},
 export:{primary:['flRaExportPng','flRaExportSvg','flRaExportCsv','flRaExportVideo'],more:['flRaExportThesis','flRaExportMulti']},
 view:{primary:['flRaSidebar','flRaViewFit','flRaResetLayout','flRaTheme','flRaLanguage','flRaHelp'],more:['flRaPerformance','flRaViewNames']},
 review:{primary:['reviewSurface','reviewTabAuditor','reviewTabFindings'],contextual:['reviewTabInspector','reviewTabConfiguration','reviewTabCompare','reviewTabOutputs','reviewTabRelationships']},
 live:{primary:['liveSurface','liveChooseFolder','liveStatus'],contextual:['liveRefreshNow','liveStop','liveRunState']}
};
function gxRect(v){
  if(!v)return null;const out={};
  for(const k of ['left','right','top','bottom','width','height']){
    if(typeof v[k]!=='number'||!Number.isFinite(v[k]))return null;
    out[k]=Math.round(v[k]*100)/100;
  }
  return out.width>=0&&out.height>=0?out:null
}
function gxContained(outer,inner,tol=2){
  const a=gxRect(outer),b=gxRect(inner);
  return !!(a&&b&&b.left>=a.left-tol&&b.right<=a.right+tol&&b.top>=a.top-tol&&b.bottom<=a.bottom+tol)
}
function gxState(x){
  return !x.mounted?'missing':!x.active?'inactive-not-visual-tested':x.more?'in-more':
    x.conditional?'conditional':x.hidden?'hidden':x.clipped?'clipped':x.disabled?'disabled':'visible'
}
function gxSummarize(rows){
  const states={},critical=[],byMode={};
  for(const row of rows){
    const state=gxState(row);
    states[state]=(states[state]||0)+1;
    if(!byMode[row.mode])byMode[row.mode]=[];
    byMode[row.mode].push({...row,state});
    if(row.priority==='primary'&&row.active&&['missing','hidden','clipped'].includes(state))
      critical.push({mode:row.mode,id:row.id,reason:state})
  }
  return{states,critical,byMode}
}
/* GRANADA177_CORE_END */
let gxStarted=false,gxOpenMode=null,gxFlyout=null;
const gxButtons={};
function gxEl(id){return document.getElementById(id)}
function gxSpanish(){try{return gxEl('language')?.value==='es'||flUi('en','es')==='es'}catch{return gxEl('language')?.value==='es'}}
function gxT(en,es){return gxSpanish()?es:en}
function gxClose(focus=false){
  if(!gxFlyout)return;
  gxFlyout.hidden=true;
  Object.values(gxButtons).forEach(x=>x.setAttribute('aria-expanded','false'));
  if(focus&&gxOpenMode)gxButtons[gxOpenMode]?.focus?.();
  gxOpenMode=null
}
function gxPosition(btn){
  if(!btn||!gxFlyout)return;
  const r=btn.getBoundingClientRect(),w=Math.min(330,window.innerWidth-24);
  gxFlyout.style.width=Math.max(220,w)+'px';
  gxFlyout.style.left=Math.max(12,Math.min(r.left,window.innerWidth-w-12))+'px';
  gxFlyout.style.top=Math.max(12,Math.min(r.bottom+5,window.innerHeight-150))+'px';
  gxFlyout.style.maxHeight=Math.max(120,window.innerHeight-Math.min(r.bottom+5,window.innerHeight-150)-17)+'px'
}
function gxTranslate(){
  Object.values(gxButtons).forEach(x=>x.textContent=gxT('More tools','Más herramientas'));
  if(!gxFlyout)return;
  for(const a of gxFlyout.querySelectorAll('.flRibbonAction')){
    const name=gxSpanish()?a.dataset.riEs:a.dataset.riEn;
    if(name){const label=a.querySelector('.flRibbonLabel');if(label)label.textContent=name;
      a.setAttribute('aria-label',name);a.title=name}
  }
  const audit=gxEl('gxAuditButton');
  if(audit)audit.textContent=gxT('Audit all tab layouts','Auditar diseño de las pestañas')
}
function gxOpen(mode){
  if(!gxFlyout)return;
  if(gxOpenMode===mode&&!gxFlyout.hidden){gxClose();return}
  gxOpenMode=mode;gxFlyout.hidden=false;
  Object.entries(gxButtons).forEach(([k,b])=>b.setAttribute('aria-expanded',k===mode?'true':'false'));
  for(const group of gxFlyout.querySelectorAll('[data-gx-mode]'))group.hidden=group.dataset.gxMode!==mode;
  gxPosition(gxButtons[mode]);gxTranslate();
  gxFlyout.querySelector('[data-gx-mode="'+mode+'"] .flRibbonAction, [data-gx-mode="'+mode+'"] #gxAuditButton')?.focus?.()
}
function gxCSS(){
  if(gxEl('gxCSS'))return;
  const style=document.createElement('style');style.id='gxCSS';
  style.textContent=[
    'body.flRibbonReady .flRibbonPanel.active:not(#flRibbonPanel-field){display:flex!important;flex-wrap:wrap!important;gap:5px 9px!important;align-content:center!important;overflow:visible!important;padding:6px 12px!important}',
    'body.flRibbonReady .flRibbonPanel:not(#flRibbonPanel-field) .flRibbonGroup.gxEmpty{display:none!important}',
    'body.flRibbonReady .flRibbonPanel:not(#flRibbonPanel-field) .flRibbonActions{flex-wrap:wrap;gap:5px}',
    'body.flRibbonReady .flRibbonPanel:not(#flRibbonPanel-field) .flRibbonAction{min-height:36px;padding:7px 10px}',
    '.gxMore{border:1px solid var(--line);border-radius:9px;background:var(--accentSoft);color:var(--accent);font-size:11px;font-weight:750;padding:7px 12px;min-height:36px;white-space:nowrap;cursor:pointer}',
    '.gxMore[aria-expanded=true]{border-color:var(--accent);background:var(--panel)}',
    '.gxFlyout{position:fixed;z-index:1500;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:9px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:13px;box-shadow:0 18px 45px rgba(0,0,0,.24)}',
    '.gxFlyout[hidden],.gxFlyout [hidden]{display:none!important}',
    '.gxFlyoutSection{display:grid;grid-template-columns:minmax(0,1fr);gap:5px}',
    '.gxFlyout .flRibbonAction{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:8px;min-width:0!important;max-width:none!important;width:100%;white-space:normal;min-height:38px;padding:8px 10px;border-radius:9px;text-align:left}',
    '.gxFlyout .flRibbonLabel{display:inline!important;max-width:none!important;font-size:12px;white-space:normal}',
    '.gxAuditButton{width:100%;min-height:38px;text-align:left;padding:8px 10px;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:9px;font-weight:750}',
    '.gxMore:focus-visible,.gxFlyout button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '@media(max-width:900px){body.flRibbonReady .flRibbonPanel:not(#flRibbonPanel-field) .flRibbonAction{padding:6px 8px!important}.gxMore{padding:6px 9px}}'
  ].join('\n');
  document.head.append(style)
}
function gxMeasure(){
  const all=[],current=gxEl('flRibbon')?.querySelector('.flRibbonPanel.active')?.dataset.ribbonPanel;
  const app=typeof activeAppMode==='string'?activeAppMode:null;
  for(const [mode,config] of Object.entries(gxGroups)){
    const active=mode===current||(mode==='review'&&app==='review')||(mode==='live'&&app==='live');
    for(const priority of ['primary','contextual','more']){
      for(const id of config[priority]||[]){
        const el=gxEl(id),inMore=!!el?.closest?.('.gxFlyout');
        let hidden=false,conditional=false,clipped=false;
        if(el&&active&&!inMore){
          const collapsed=el.closest?.('details:not([open])');
          if(collapsed&&!el.closest?.('summary'))conditional=true;
          let parent=el;
          while(parent&&parent!==document.body){
            const style=window.getComputedStyle?.(parent);
            if(parent.hidden||style?.display==='none'||style?.visibility==='hidden'){hidden=true;break}
            parent=parent.parentElement
          }
          const rect=el.getBoundingClientRect?.();
          if(!hidden&&!conditional&&rect&&rect.width>0&&rect.height>0){
            if(rect.left<-2||rect.right>window.innerWidth+2)clipped=true;
            let ancestor=el.parentElement;
            while(ancestor&&ancestor!==document.body){
              const style=window.getComputedStyle?.(ancestor);
              if(['auto','hidden','clip','scroll'].includes(style?.overflowX)||
                 ['auto','hidden','clip','scroll'].includes(style?.overflowY)){
                if(!gxContained(ancestor.getBoundingClientRect(),rect)){clipped=true;break}
              }
              ancestor=ancestor.parentElement
            }
          }else if(!conditional&&!hidden)hidden=true
        }
        all.push({mode,id,priority,mounted:!!el,active,more:inMore,hidden,conditional,clipped,disabled:!!el?.disabled})
      }
    }
  }
  return all
}
function gxAudit(){
  const measured=gxSummarize(gxMeasure());
  return{schema:'foamlens/granada-177-visible-controls/1',atUtc:new Date().toISOString(),
    viewport:{cssWidth:window.innerWidth,cssHeight:window.innerHeight,
      devicePixelRatio:Number(window.devicePixelRatio)||1},
    activeRibbon:gxEl('flRibbon')?.querySelector('.flRibbonPanel.active')?.dataset.ribbonPanel||null,
    activeAppMode:typeof activeAppMode==='string'?activeAppMode:null,
    evidence:measured,
    limitations:[
      'Only CURRENTLY ACTIVE tab layout is visually measured; inactive controls are inventoried only.',
      'Field A–D is inventoried, not redesigned, until F1/F2 branch integration.',
      'A control inside More is available through a deliberate menu, not visually always present.',
      'No case name, scientific values, user text, private path, screenshot or dataset is exported.',
      'Real installed Windows 1024/1280/1920 and 125–200% DPI visual acceptance is outstanding.'
    ]}
}
function gxExport(){
  const report=gxAudit(),body=JSON.stringify(report,null,2);
  if(typeof downloadText==='function')downloadText('FoamLens_Granada_G0_UI.json',body,'application/json');
  else{const u=URL.createObjectURL(new Blob([body],{type:'application/json'})),a=document.createElement('a');
    a.href=u;a.download='FoamLens_Granada_G0_UI.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),1500)}
  return report
}
function gxInstall(){
  if(gxStarted)return true;
  if(!document.body.classList.contains('flRibbonReady')||
     !['home','data','analysis','export','view'].every(k=>gxEl('flRibbonPanel-'+k)))return false;
  gxCSS();
  const flyout=document.createElement('div');flyout.id='gxFlyout';flyout.className='gxFlyout';
  flyout.setAttribute('aria-label','Secondary FoamLens tools');flyout.hidden=true;
  for(const mode of ['home','data','analysis','export','view']){
    const panel=gxEl('flRibbonPanel-'+mode),section=document.createElement('div');
    section.className='gxFlyoutSection';section.dataset.gxMode=mode;section.hidden=true;
    for(const id of gxGroups[mode].more){
      const button=gxEl(id);if(button)section.append(button); // Original listener + original DOM ID.
    }
    if(mode==='view'){
      const action=document.createElement('button');action.type='button';action.id='gxAuditButton';
      action.className='gxAuditButton';action.onclick=()=>{
        const out=gxExport(),issues=out.evidence.critical.length;gxClose();
        const status=gxEl('status');if(status)status.textContent=gxT(
          'Layout evidence saved; '+issues+' primary controls hidden/clipped on active screen.',
          'Evidencia guardada; '+issues+' controles principales ocultos o recortados en la pantalla activa.')
      };section.append(action)
    }
    flyout.append(section);
    for(const group of panel.querySelectorAll('.flRibbonGroup')){
      if(!group.querySelector('.flRibbonAction'))group.classList.add('gxEmpty')
    }
    const btn=document.createElement('button');btn.type='button';btn.id='gxMore-'+mode;
    btn.className='gxMore';btn.setAttribute('aria-controls','gxFlyout');
    btn.setAttribute('aria-expanded','false');
    btn.onclick=()=>gxOpen(mode);panel.append(btn);gxButtons[mode]=btn
  }
  document.body.append(flyout);gxFlyout=flyout;
  document.addEventListener('pointerdown',e=>{
    if(!gxFlyout.hidden&&!gxFlyout.contains(e.target)&&
      !Object.values(gxButtons).some(b=>b.contains(e.target)))gxClose()
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!gxFlyout.hidden){e.preventDefault();gxClose(true)}
  },true);
  document.querySelectorAll('.flRibbonTab').forEach(t=>t.addEventListener('click',()=>gxClose(),true));
  gxFlyout.addEventListener('click',e=>{if(e.target.closest('.flRibbonAction'))gxClose()});
  document.addEventListener('foamlens-language-change',gxTranslate);
  window.addEventListener('resize',()=>{if(!gxFlyout.hidden&&gxOpenMode)gxPosition(gxButtons[gxOpenMode])});
  gxStarted=true;gxTranslate();
  window.FoamLensGranadaUX={audit:gxAudit,download:gxExport,close:gxClose,groups:gxGroups};
  return true
}
(function seek(n=0){if(gxInstall())return;if(n<900)requestAnimationFrame(()=>seek(n+1))})();
