/* FoamLens Desktop — GitHub release updater ribbon entry. */
let auInstalled=false;
const auStoreChannel=new URLSearchParams(location.search).get('store')==='1';
function auRequestManualCheck(){
  if(auStoreChannel)return false;
  try{
    if(typeof window.chrome?.webview?.postMessage!=='function')return false;
    window.chrome.webview.postMessage({type:'checkForUpdates'});
    return true
  }catch(e){console.error('FoamLens update check failed to start',e);return false}
}
function auInstall(){
  if(auStoreChannel){
    auInstalled=true;
    window.FoamLensAutoUpdate={check:()=>false,isInstalled:()=>false,channel:'store'};
    return true
  }
  if(auInstalled||document.getElementById('flRaCheckUpdates'))return true;
  if(typeof flRibbonActionHtml!=='function'||typeof flRibbonBind!=='function')return false;
  const actions=document.querySelector('#flRibbonPanel-home .flRibbonGroup:last-child .flRibbonActions');
  if(!actions)return false;
  actions.insertAdjacentHTML('beforeend',
    flRibbonActionHtml('flRaCheckUpdates','reset','Updates','Actualizaciones','FoamLens'));
  flRibbonBind('flRaCheckUpdates',auRequestManualCheck);
  auInstalled=true;
  window.FoamLensAutoUpdate={check:auRequestManualCheck,isInstalled:()=>auInstalled,channel:'github'};
  return true
}
(function retry(){if(auInstall())return;requestAnimationFrame(retry)})();
