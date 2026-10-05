/* FoamLens Desktop v1.6.0 — stable Analysis-owned inspector surface. */
let flAnalysisScopeInstalled=false;
function flAnalysisScopeUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(document.getElementById('language')?.value==='es'?es:en)}catch{return en}}
function flAnalysisScopeInstall(){
  if(flAnalysisScopeInstalled)return true;
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return false;
  let card=document.getElementById('flAnalysisInspectorCard');
  if(!card){
    card=document.createElement('div');card.id='flAnalysisInspectorCard';card.className='card';
    card.innerHTML='<div class="cardhead"><strong data-fl-en="Analysis tools" data-fl-es="Herramientas de análisis">Analysis tools</strong><span class="badge" data-fl-en="contextual" data-fl-es="contextual">contextual</span></div><div id="flAnalysisOwnedHost"></div>';
    const dataCard=document.getElementById('countBadge')?.closest('.card');
    dataCard?.insertAdjacentElement('afterend',card)??sidebar.prepend(card)
  }
  const host=document.getElementById('flAnalysisOwnedHost');if(!host)return false;
  const ordered=['generalAnalysisTools','couplingDiagnostics','phaseFrontPanel','differenceTools','fieldMappingTools','phaseMomentumTools'];
  for(const id of ordered){const node=document.getElementById(id);if(node&&node.parentElement!==host)host.appendChild(node)}
  try{flApplyBilingualText(card)}catch{}
  flAnalysisScopeInstalled=true;
  window.FoamLensSidebarSections?.sbInstall?.();
  window.FoamLensSidebarSections?.sbApplyContext?.();
  window.FoamLensAnalysisScope={isInstalled:()=>flAnalysisScopeInstalled,host:()=>host};
  return true
}
(function retry(){if(flAnalysisScopeInstall())return;requestAnimationFrame(retry)})();
document.addEventListener('foamlens-language-change',()=>{const c=document.getElementById('flAnalysisInspectorCard');if(c)try{flApplyBilingualText(c)}catch{}});
