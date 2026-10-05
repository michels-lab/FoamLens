/* FoamLens Desktop v1.5.0 — persistent Field Workspace layout, view names and comparison status. */
const uxWorkspaceKey='foamlens.fieldWorkspace.ux.v1';
const uxDefaultNames={1:'A',2:'B',3:'C',4:'D'};
let uxRestoring=false,uxInstalled=false;

function uxUi(en,es){try{return flUi(en,es)}catch{return en}}
function uxEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uxLoad(){
  try{const raw=localStorage.getItem(uxWorkspaceKey);if(!raw)return{};const v=JSON.parse(raw);return v&&typeof v==='object'?v:{}}catch{return{}}
}
function uxNames(){
  const state=uxLoad(),names=state.names&&typeof state.names==='object'?state.names:{};
  const out={};for(let i=1;i<=4;i++)out[i]=String(names[i]||uxDefaultNames[i]).trim().slice(0,28)||uxDefaultNames[i];return out
}
function uxSnapshot(){
  const names={};for(let i=1;i<=4;i++){const input=document.getElementById('uxViewName'+i);names[i]=String(input?.value||uxNames()[i]||uxDefaultNames[i]).trim().slice(0,28)||uxDefaultNames[i]}
  return{
    schema:1,
    layout:document.getElementById('fwLayout')?.value||'split',
    companion:document.getElementById('fwCompanion')?.value||'profile',
    syncTime:document.getElementById('fwSyncTime')?.checked!==false,
    compareEnabled:!!document.getElementById('fcEnabled')?.checked,
    viewCount:Math.max(1,2+(typeof fcExtraViews!=='undefined'?fcExtraViews.length:0)),
    differenceEnabled:!!document.getElementById('fcDifference')?.checked,
    syncMode:document.getElementById('fcSync')?.value||'nearest',
    camerasLinked:document.getElementById('fcLinkCameras')?.checked!==false,
    visualsSynced:document.getElementById('fcSyncVisuals')?.checked!==false,
    names
  }
}
function uxSave(){
  if(uxRestoring)return;try{localStorage.setItem(uxWorkspaceKey,JSON.stringify(uxSnapshot()))}catch{}
}
function uxReset(){
  try{localStorage.removeItem(uxWorkspaceKey)}catch{}
  uxRestoring=true;
  try{
    const set=(id,value,event='change')=>{const e=document.getElementById(id);if(!e)return;e.value=String(value);e.dispatchEvent(new Event(event,{bubbles:true}))};
    const check=(id,value)=>{const e=document.getElementById(id);if(!e)return;e.checked=!!value;e.dispatchEvent(new Event('change',{bubbles:true}))};
    set('fwLayout','split');set('fwCompanion','profile');check('fwSyncTime',true);check('fcLinkCameras',true);check('fcSyncVisuals',true);check('fcDifference',false);
    for(let i=1;i<=4;i++){const e=document.getElementById('uxViewName'+i);if(e)e.value=uxDefaultNames[i]}
  }finally{uxRestoring=false}
  uxDecorateLabels();uxUpdateComparisonStatus();uxSave()
}
function uxSetViewName(id,value){
  const i=Math.max(1,Math.min(4,Number(id)||1)),e=document.getElementById('uxViewName'+i),v=String(value||'').trim().slice(0,28)||uxDefaultNames[i];if(e&&e.value!==v)e.value=v;uxSave();uxDecorateLabels();uxUpdateComparisonStatus();return v
}
function uxViewName(id){return uxNames()[Math.max(1,Math.min(4,Number(id)||1))]||uxDefaultNames[id]||String(id)}
function uxBaseLabel(el){
  if(!el)return'';const text=String(el.textContent||'').trim();if(el.dataset.uxDecorated==='1'&&text===String(el.dataset.uxRendered||''))return String(el.dataset.uxBase||'');return text
}
function uxDecorateOne(el,id){
  if(!el)return;const base=uxBaseLabel(el),name=uxViewName(id),rendered=name+(base?' · '+base:'');el.dataset.uxBase=base;el.dataset.uxRendered=rendered;el.dataset.uxDecorated='1';el.textContent=rendered
}
function uxDecorateLabels(){
  uxDecorateOne(document.getElementById('fcPrimaryLabel'),1);uxDecorateOne(document.getElementById('fcCompareLabel'),2);
  for(let i=3;i<=4;i++)uxDecorateOne(document.getElementById('fcExtra'+i+'Label'),i);
  const diff=document.getElementById('fcDifferenceLabel');if(diff){const base=uxBaseLabel(diff);diff.textContent=uxUi('Difference','Diferencia')+(base?' · '+base:'');diff.dataset.uxDecorated='1'}
  uxRefreshNameInputs()
}
function uxRefreshNameInputs(){
  const names=uxNames();for(let i=1;i<=4;i++){const e=document.getElementById('uxViewName'+i);if(e&&document.activeElement!==e)e.value=names[i]}
  const count=2+(typeof fcExtraViews!=='undefined'?fcExtraViews.length:0);for(let i=3;i<=4;i++){const row=document.getElementById('uxViewNameRow'+i);if(row)row.classList.toggle('hidden',i>count)}
}
function uxTimeText(v){return Number.isFinite(Number(v))?Number(v).toPrecision(5).replace(/\.?0+$/,'')+' s':'—'}
function uxStatusPill(label,value,state=''){
  return '<span class="uxStatusPill '+uxEsc(state)+'"><b>'+uxEsc(label)+'</b><span>'+uxEsc(value)+'</span></span>'
}
function uxUpdateComparisonStatus(){
  const bar=document.getElementById('uxComparisonStatus');if(!bar)return;
  const enabled=!!document.getElementById('fcEnabled')?.checked;bar.classList.toggle('hidden',!enabled);if(!enabled)return;
  const names=uxNames(),aCase=typeof fvCase==='function'?fvCase():null,bCase=typeof fcCase==='function'?fcCase():null,sync=typeof fcState!=='undefined'?fcState.sync:null;
  const same=typeof fcSameQuantity==='function'?!!fcSameQuantity():false,linked=typeof fcCamerasLinked==='function'?!!fcCamerasLinked():document.getElementById('fcLinkCameras')?.checked!==false,visual=typeof fcVisualsSynced==='function'?!!fcVisualsSynced():document.getElementById('fcSyncVisuals')?.checked!==false;
  const syncMode=document.getElementById('fcSync')?.value||'nearest',syncText=sync?.interpolated?uxUi('Interpolated','Interpolado')+' '+uxTimeText(sync.lowerTime)+'↔'+uxTimeText(sync.upperTime):sync?.exact?uxUi('Exact','Exacto'):uxUi('Nearest','Más cercano')+(Number.isFinite(sync?.delta)?' · Δt '+(sync.delta>=0?'+':'')+uxTimeText(sync.delta):'');
  const diffEnabled=!!document.getElementById('fcDifference')?.checked,diffMode=document.getElementById('fcDifferenceMode')?.value||'signed';
  bar.innerHTML=
    uxStatusPill(names[1],(aCase?.name||'—')+' · '+uxTimeText(typeof fvState!=='undefined'?fvState.time:NaN),'primary')+
    uxStatusPill(names[2],(bCase?.name||'—')+' · '+syncText,'compare')+
    uxStatusPill(uxUi('Quantity','Magnitud'),same?uxUi('Matched','Coincide'):uxUi('Different','Diferente'),same?'good':'warn')+
    uxStatusPill(uxUi('Cameras','Cámaras'),linked?uxUi('Linked','Enlazadas'):uxUi('Independent','Independientes'))+
    uxStatusPill(uxUi('Visuals','Visuales'),visual?uxUi('Synced','Sincronizados'):uxUi('Independent','Independientes'))+
    uxStatusPill('Δ',diffEnabled?diffMode:uxUi('Off','Apagada'))+
    uxStatusPill(uxUi('Sync','Sync'),syncMode);
}
async function uxRestore(){
  const saved=uxLoad();if(!Object.keys(saved).length){uxDecorateLabels();uxUpdateComparisonStatus();return false}
  uxRestoring=true;
  try{
    const set=(id,value)=>{const e=document.getElementById(id);if(!e||value==null)return;e.value=String(value);e.dispatchEvent(new Event('change',{bubbles:true}))};
    const check=(id,value)=>{const e=document.getElementById(id);if(!e||value==null)return;e.checked=!!value;e.dispatchEvent(new Event('change',{bubbles:true}))};
    set('fwLayout',saved.layout);set('fwCompanion',saved.companion);check('fwSyncTime',saved.syncTime);
    check('fcLinkCameras',saved.camerasLinked);check('fcSyncVisuals',saved.visualsSynced);set('fcSync',saved.syncMode);check('fcDifference',saved.differenceEnabled);
    if(saved.compareEnabled)check('fcEnabled',true);
    const target=Math.max(2,Math.min(4,Number(saved.viewCount)||2));if(saved.compareEnabled&&typeof fcExtraAdd==='function'&&typeof fcExtraViews!=='undefined'){while(2+fcExtraViews.length<target)fcExtraAdd()}
    if(saved.names)for(let i=1;i<=4;i++){const e=document.getElementById('uxViewName'+i);if(e)e.value=String(saved.names[i]||uxDefaultNames[i]).slice(0,28)}
  }finally{uxRestoring=false}
  uxDecorateLabels();uxUpdateComparisonStatus();return true
}
function uxInstallUi(){
  if(document.getElementById('uxViewNamesPanel'))return;
  const fcPanel=document.getElementById('fcPanel');if(fcPanel){
    const names=document.createElement('details');names.id='uxViewNamesPanel';names.className='analysisExt uxViewNamesPanel';names.innerHTML='<summary class="analysisExtHead"><strong>'+uxUi('View names','Nombres de vistas')+'</strong><span class="badge">'+uxUi('Persistent','Persistentes')+'</span></summary><div class="extSectionBody"><div class="uxNameGrid">'+[1,2,3,4].map(i=>'<label id="uxViewNameRow'+i+'"><span>'+uxUi('View','Vista')+' '+i+'</span><input id="uxViewName'+i+'" maxlength="28" value="'+uxDefaultNames[i]+'" aria-label="'+uxUi('Name for view ','Nombre para vista ')+i+'"></label>').join('')+'</div><div class="uxNameActions"><button class="btn tiny" id="uxResetWorkspaceLayout" type="button">'+uxUi('Reset saved layout','Restablecer diseño guardado')+'</button></div><div class="smallnote">'+uxUi('Layout, companion plot, comparison count, camera/visual sync and view names are restored on the next app session.','El diseño, gráfica complementaria, número de vistas, sincronización de cámara/visual y nombres se restauran en la siguiente sesión.')+'</div></div>';
    fcPanel.appendChild(names);for(let i=1;i<=4;i++)document.getElementById('uxViewName'+i)?.addEventListener('input',e=>uxSetViewName(i,e.target.value));document.getElementById('uxResetWorkspaceLayout')?.addEventListener('click',uxReset)
  }
  const grid=document.getElementById('fcViewGrid');if(grid&&!document.getElementById('uxComparisonStatus')){const bar=document.createElement('div');bar.id='uxComparisonStatus';bar.className='uxComparisonStatus hidden';grid.insertAdjacentElement('beforebegin',bar)}
}
function uxInstallStyles(){
  if(document.getElementById('uxWorkspaceStyles'))return;const style=document.createElement('style');style.id='uxWorkspaceStyles';style.textContent='.uxComparisonStatus{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:6px 8px;margin:0 0 7px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.uxComparisonStatus.hidden{display:none!important}.uxStatusPill{display:inline-flex;align-items:center;gap:5px;padding:3px 6px;border:1px solid var(--line);border-radius:999px;background:var(--panel);font-size:8px;max-width:280px}.uxStatusPill b{color:var(--muted);font-weight:800}.uxStatusPill span{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.uxStatusPill.good{border-color:color-mix(in srgb,#3cad78 45%,var(--line))}.uxStatusPill.warn{border-color:color-mix(in srgb,#d59632 52%,var(--line))}.uxNameGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.uxNameGrid label{display:grid;gap:3px;font-size:8px;color:var(--muted)}.uxNameGrid input{min-width:0}.uxNameActions{display:flex;justify-content:flex-end;margin:7px 0}.uxViewNamesPanel{margin-top:7px}@media(max-width:620px){.uxNameGrid{grid-template-columns:1fr}}';document.head.appendChild(style)
}
function uxPatchRuntime(){
  if(typeof fcUpdateLabels==='function'&&!fcUpdateLabels.__uxPatched){const prev=fcUpdateLabels;fcUpdateLabels=function(...args){const r=prev.apply(this,args);uxDecorateLabels();uxUpdateComparisonStatus();return r};fcUpdateLabels.__uxPatched=true}
  if(typeof fcExtraUpdateLabel==='function'&&!fcExtraUpdateLabel.__uxPatched){const prev=fcExtraUpdateLabel;fcExtraUpdateLabel=function(...args){const r=prev.apply(this,args);uxDecorateLabels();uxUpdateComparisonStatus();return r};fcExtraUpdateLabel.__uxPatched=true}
  if(typeof fcRefreshFrame==='function'&&!fcRefreshFrame.__uxPatched){const prev=fcRefreshFrame;fcRefreshFrame=async function(...args){const r=await prev.apply(this,args);uxDecorateLabels();uxUpdateComparisonStatus();uxSave();return r};fcRefreshFrame.__uxPatched=true}
  if(typeof fcExtraAdd==='function'&&!fcExtraAdd.__uxPatched){const prev=fcExtraAdd;fcExtraAdd=function(...args){const r=prev.apply(this,args);setTimeout(()=>{uxDecorateLabels();uxUpdateComparisonStatus();uxSave()},0);return r};fcExtraAdd.__uxPatched=true}
  if(typeof fcExtraRemove==='function'&&!fcExtraRemove.__uxPatched){const prev=fcExtraRemove;fcExtraRemove=function(...args){const r=prev.apply(this,args);setTimeout(()=>{uxDecorateLabels();uxUpdateComparisonStatus();uxSave()},0);return r};fcExtraRemove.__uxPatched=true}
}
function uxInstall(){
  if(uxInstalled)return true;if(!document.getElementById('fwLayout')||!document.getElementById('fcPanel'))return false;uxInstalled=true;uxInstallStyles();uxInstallUi();uxPatchRuntime();
  document.addEventListener('change',e=>{const id=String(e.target?.id||'');if(/^fw(?:Layout|Companion|SyncTime)$/.test(id)||/^fc(?:Enabled|Difference|Sync|LinkCameras|SyncVisuals|DifferenceMode)$/.test(id)){uxUpdateComparisonStatus();uxSave()}});
  document.addEventListener('foamlens-language-change',()=>{uxUpdateComparisonStatus();uxDecorateLabels()});
  uxRestore();window.FoamLensWorkspaceUx={save:uxSave,restore:uxRestore,reset:uxReset,getState:uxSnapshot,setViewName:uxSetViewName,getViewName:uxViewName,refresh:()=>{uxDecorateLabels();uxUpdateComparisonStatus()}};return true
}
(function retry(){if(uxInstall())return;requestAnimationFrame(retry)})();
