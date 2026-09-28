/* FoamLens Desktop v1.3.0 — native long-operation progress and cancellation UI. */
function pcEnsureUi(){
  if(document.getElementById('nativeOperationHud'))return;
  const el=document.createElement('div');el.id='nativeOperationHud';el.style.cssText='position:fixed;right:16px;bottom:16px;z-index:10050;display:none;max-width:360px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 8px 28px rgba(0,0,0,.28);font-size:10px';
  el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><b id="nativeOperationTitle" data-fl-en="Background operation" data-fl-es="Operación en segundo plano">Background operation</b><div id="nativeOperationText" class="smallnote" style="margin-top:3px"></div></div><button class="btn" id="nativeOperationCancel" type="button" data-fl-en="Cancel" data-fl-es="Cancelar">Cancel</button></div>';
  document.body.appendChild(el);flApplyBilingualText(el)
}
let pcActiveRequest='',pcActiveOperation='';
function pcShow(title,text,requestId,operation){
  pcEnsureUi();pcActiveRequest=requestId||pcActiveRequest;pcActiveOperation=operation||pcActiveOperation;document.getElementById('nativeOperationTitle').textContent=title||flUi('Background operation','Operación en segundo plano');document.getElementById('nativeOperationText').textContent=text||'';document.getElementById('nativeOperationHud').style.display=''
}
function pcHide(requestId){
  if(requestId&&pcActiveRequest&&requestId!==pcActiveRequest)return;pcActiveRequest='';pcActiveOperation='';const el=document.getElementById('nativeOperationHud');if(el)el.style.display='none'
}
function pcCancel(){
  if(!pcActiveRequest||!window.chrome?.webview)return;
  const cancelId='cancel_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  window.chrome.webview.postMessage({type:'cancelOperation',requestId:cancelId,targetRequestId:pcActiveRequest});
  const b=document.getElementById('nativeOperationCancel');if(b){b.disabled=true;b.textContent=flUi('Cancelling…','Cancelando…')}
}
function pcOnNativeMessage(event){
  const m=event?.data||{};if(!m||typeof m!=='object')return;
  if(m.type==='folderStart')pcShow(flUi('Reading selected folder','Leyendo carpeta seleccionada'),String(m.folderName||''),m.requestId,'folder');
  else if(m.type==='folderProgress')pcShow(flUi('Reading selected folder','Leyendo carpeta seleccionada'),`${Number(m.files||0).toLocaleString()} ${flUi('files','archivos')} · ${Number(m.folders||0).toLocaleString()} ${flUi('folders','carpetas')}`,m.requestId,'folder');
  else if(m.type==='operationStart')pcShow(m.operation==='foamLogBatch'?flUi('Parsing solver logs','Parseando logs del solver'):flUi('Background operation','Operación en segundo plano'),m.total!=null?`0 / ${m.total}`:'',m.requestId,m.operation);
  else if(m.type==='operationProgress')pcShow(m.operation==='foamLogBatch'?'Parsing solver logs':'Background operation',m.total!=null?`${m.completed||0} / ${m.total}`:'',m.requestId,m.operation);
  else if(['folderComplete','folderCancelled','folderError','operationComplete','operationCancelled'].includes(m.type)){pcHide(m.requestId);const b=document.getElementById('nativeOperationCancel');if(b){b.disabled=false;b.textContent=flUi('Cancel','Cancelar')}}
}
function pcInit(){
  if(!window.chrome?.webview)return;pcEnsureUi();document.getElementById('nativeOperationCancel').onclick=pcCancel;window.chrome.webview.addEventListener('message',pcOnNativeMessage);document.addEventListener('foamlens-language-change',()=>{const el=document.getElementById('nativeOperationHud');if(el)flApplyBilingualText(el)})
}
pcInit();
