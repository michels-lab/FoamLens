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
  if(auInstalled)return true;
  const button=document.getElementById('flGlobalUpdates');if(!button)return false;
  const localize=()=>{
    const es=document.getElementById('language')?.value==='es',label=button.querySelector('span');
    if(label)label.textContent=es?'Actualizaciones':'Updates';
    button.title=auStoreChannel?(es?'Las actualizaciones se administran desde Microsoft Store':'Updates are managed by Microsoft Store'):(es?'Buscar actualizaciones':'Check for updates')
  };
  localize();
  document.getElementById('language')?.addEventListener('change',localize);
  button.addEventListener('click',()=>{
    if(auStoreChannel){
      const status=document.getElementById('status');
      if(status)status.textContent=document.getElementById('language')?.value==='es'?'Microsoft Store administra las actualizaciones.':'Updates are managed by Microsoft Store.';
      return
    }
    auRequestManualCheck()
  });
  auInstalled=true;
  if(auStoreChannel)window.FoamLensAutoUpdate={check:()=>false,isInstalled:()=>auInstalled,channel:'store'};
  else window.FoamLensAutoUpdate={check:auRequestManualCheck,isInstalled:()=>auInstalled,channel:'github'};
  return true
}
(function retry(){if(auInstall())return;requestAnimationFrame(retry)})();
