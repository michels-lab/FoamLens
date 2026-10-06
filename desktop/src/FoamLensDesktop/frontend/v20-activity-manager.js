/* FoamLens Desktop v1.6.0 — unified activity presentation policy. */
let flActivityManagerInstalled=false;
function flActivityOverlayOpen(){
  return ['scanOverlay','readyOverlay','findingDetailOverlay','legalOverlay','versionOverlay']
    .some(id=>document.getElementById(id)?.classList.contains('open'))
}
function flActivityApplyPolicy(){
  const toast=document.getElementById('activityToast');if(!toast)return;
  const suppress=flActivityOverlayOpen();
  toast.classList.toggle('flActivitySuppressed',suppress);
  toast.setAttribute('aria-hidden',suppress?'true':(toast.classList.contains('open')?'false':'true'))
}
function flActivityInstall(){
  if(flActivityManagerInstalled)return true;
  const toast=document.getElementById('activityToast');if(!toast)return false;
  flActivityManagerInstalled=true;
  if(!document.getElementById('flActivityManagerStyles')){
    const style=document.createElement('style');style.id='flActivityManagerStyles';
    style.textContent='.activityToast.flActivitySuppressed{display:none!important}';
    document.head.appendChild(style)
  }
  for(const id of ['scanOverlay','readyOverlay','findingDetailOverlay','legalOverlay','versionOverlay']){
    const el=document.getElementById(id);if(el)new MutationObserver(flActivityApplyPolicy).observe(el,{attributes:true,attributeFilter:['class']})
  }
  document.addEventListener('foamlens-activity-change',flActivityApplyPolicy);
  flActivityApplyPolicy();
  window.FoamLensActivityManager={refresh:flActivityApplyPolicy,isOverlayOpen:flActivityOverlayOpen,isInstalled:()=>flActivityManagerInstalled};
  return true
}
(function retry(){if(flActivityInstall())return;requestAnimationFrame(retry)})();