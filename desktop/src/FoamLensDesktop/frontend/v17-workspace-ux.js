/* FoamLens Desktop v1.4.10 — persistent Field Workspace layout, splitters, view names and contextual help. */
const uxKey='FoamLens.fieldWorkspace.layout.v2';
const uxState={installed:false,splitRatio:.56,controlsWidth:340,names:{1:'A',2:'B',3:'C',4:'D'},drag:null,lastProject:'',restoring:false};
function uxUi(en,es){try{return flUi(en,es)}catch{return en}}
function uxClamp(v,a,b){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a}
function uxProjectKey(){try{return (cases||[]).map(c=>String(c.name||'')).sort().join('|')}catch{return''}}
function uxRead(){try{const x=JSON.parse(localStorage.getItem(uxKey)||'null');if(x&&typeof x==='object'){uxState.splitRatio=uxClamp(x.splitRatio,.25,.75);uxState.controlsWidth=uxClamp(x.controlsWidth,260,520);uxState.names={...uxState.names,...(x.names||{})};return x}}catch{}return null}
function uxSnapshot(){
  const extras=typeof fcExtraViews!=='undefined'?fcExtraViews:[];
  const view=(id,prefix)=>({id,name:uxState.names[id]||String.fromCharCode(64+id),caseName:(prefix==='fv'?fvCase()?.name:prefix==='fc'?fcCase()?.name:fcExtraCase?.(extras.find(x=>x.id===id))?.name)||'',caseValue:document.getElementById(prefix==='fv'?'fvCase':prefix==='fc'?'fcCase':'fcExtra'+id+'Case')?.value||'',region:document.getElementById(prefix==='fv'?'fvRegion':prefix==='fc'?'fcRegion':'fcExtra'+id+'Region')?.value||'',field:document.getElementById(prefix==='fv'?'fvField':prefix==='fc'?'fcField':'fcExtra'+id+'Field')?.value||'',component:document.getElementById(prefix==='fv'?'fvComponent':prefix==='fc'?'fcComponent':'fcExtra'+id+'Component')?.value||'value'});
  return{version:2,project:uxProjectKey(),layout:fwState?.layout||document.getElementById('fwLayout')?.value||'split',companion:fwState?.companion||document.getElementById('fwCompanion')?.value||'profile',syncTime:!!document.getElementById('fwSyncTime')?.checked,splitRatio:uxState.splitRatio,controlsWidth:uxState.controlsWidth,names:{...uxState.names},compareEnabled:!!document.getElementById('fcEnabled')?.checked,viewCount:1+(document.getElementById('fcEnabled')?.checked?1:0)+extras.length,views:[view(1,'fv'),view(2,'fc'),...extras.map(x=>view(x.id,'extra'))]}
}
function uxSave(silent=false){try{const snap=uxSnapshot();localStorage.setItem(uxKey,JSON.stringify(snap));if(!silent)uxToast(uxUi('Field Workspace layout saved.','Diseño del Workspace de campos guardado.'));return snap}catch(e){if(!silent)uxToast(String(e?.message||e),true);return null}}
function uxReset(){try{localStorage.removeItem(uxKey)}catch{}uxState.splitRatio=.56;uxState.controlsWidth=340;uxState.names={1:'A',2:'B',3:'C',4:'D'};uxApplyNames();uxApplySplit();const l=document.getElementById('fwLayout');if(l){l.value='split';fwSetLayout?.('split')}const c=document.getElementById('fwCompanion');if(c){c.value='profile';fwSetCompanion?.('profile')}uxToast(uxUi('Field Workspace layout reset.','Diseño del Workspace de campos restablecido.'))}
function uxToast(text,error=false){try{fvSetStatus(String(text||''),!!error)}catch{console[error?'error':'log'](text)}}
function uxApplySplit(){
  const grid=document.getElementById('fwGrid');if(!grid)return;
  const desktop=window.innerWidth>1350&&(fwState?.layout||'split')==='split';
  grid.classList.toggle('uxResizable',desktop);const handles=[document.getElementById('uxSplitA'),document.getElementById('uxSplitB')];handles.forEach(h=>h?.classList.toggle('hidden',!desktop));
  if(!desktop){grid.style.gridTemplateColumns='';return}
  const rect=grid.getBoundingClientRect(),gap=12,total=Math.max(720,rect.width),controls=uxClamp(uxState.controlsWidth,260,Math.min(520,total*.36)),main=Math.max(420,total-controls-gap*2),left=Math.max(220,main*uxClamp(uxState.splitRatio,.25,.75)),right=Math.max(220,main-left);
  grid.style.gridTemplateColumns=left+'px '+right+'px '+controls+'px';
  requestAnimationFrame(uxPositionSplitters)
}
function uxPositionSplitters(){
  const grid=document.getElementById('fwGrid'),a=document.querySelector('.fw3DCard'),b=document.querySelector('.fwPlotCard');if(!grid||!a||!b)return;
  const gr=grid.getBoundingClientRect(),ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),h1=document.getElementById('uxSplitA'),h2=document.getElementById('uxSplitB');
  if(h1)h1.style.left=(ar.right-gr.left+5)+'px';if(h2)h2.style.left=(br.right-gr.left+5)+'px'
}
function uxStartDrag(kind,e){if(window.innerWidth<=1350)return;e.preventDefault();const grid=document.getElementById('fwGrid'),a=document.querySelector('.fw3DCard'),b=document.querySelector('.fwPlotCard'),c=document.querySelector('.fwControlsCard');if(!grid||!a||!b||!c)return;uxState.drag={kind,x:e.clientX,aw:a.getBoundingClientRect().width,bw:b.getBoundingClientRect().width,cw:c.getBoundingClientRect().width};document.body.classList.add('uxSplitting');e.currentTarget.setPointerCapture?.(e.pointerId)}
function uxMoveDrag(e){const d=uxState.drag;if(!d)return;const dx=e.clientX-d.x;if(d.kind==='main'){const sum=d.aw+d.bw,aw=uxClamp(d.aw+dx,220,sum-220);uxState.splitRatio=aw/sum}else uxState.controlsWidth=uxClamp(d.cw-dx,260,520);uxApplySplit();uxSave(true)}
function uxEndDrag(){if(!uxState.drag)return;uxState.drag=null;document.body.classList.remove('uxSplitting');uxSave(true)}
function uxName(id){return uxState.names[id]||String.fromCharCode(64+id)}
function uxApplyNames(){
  for(let id=1;id<=4;id++){const badge=document.getElementById('uxName'+id);if(badge)badge.textContent=uxName(id)}
  uxUpdateStatus()
}
function uxRename(id){
  const current=uxName(id),name=prompt(uxUi('Name for view ','Nombre para vista ')+String.fromCharCode(64+id),current);if(name===null)return;const clean=String(name).trim().slice(0,28)||String.fromCharCode(64+id);uxState.names[id]=clean;uxApplyNames();uxSave(true)
}
function uxViewSummary(id){
  let caseName='',field='',time=NaN,sync='';
  if(id===1){caseName=fvCase?.()?.name||'';field=fvState?.fieldName||document.getElementById('fvField')?.value||'';time=Number(fvState?.time)}
  else if(id===2){caseName=fcCase?.()?.name||'';field=fcState?.fieldName||document.getElementById('fcField')?.value||'';time=Number(fcState?.time);sync=fcSyncText?.(fcState?.sync)||''}
  else{const st=typeof fcExtraViews!=='undefined'?fcExtraViews.find(x=>x.id===id):null;caseName=st?fcExtraCase?.(st)?.name||'':'';field=st?.fieldName||'';time=Number(st?.time);sync=st?fcSyncText?.(st.sync)||'':''}
  return{name:uxName(id),caseName,field,time,sync}
}
function uxUpdateStatus(){
  const bar=document.getElementById('uxCompareStatus');if(!bar)return;const enabled=!!document.getElementById('fcEnabled')?.checked,ids=[1,...(enabled?[2]:[]),...(typeof fcExtraViews!=='undefined'?fcExtraViews.map(x=>x.id):[])];
  const parts=ids.map(id=>{const v=uxViewSummary(id),t=Number.isFinite(v.time)?'t='+fvFmt(v.time)+' s':'t=—';return'<button class="uxStatusView" data-ux-rename="'+id+'" title="'+uxUi('Click to rename view','Clic para renombrar vista')+'"><b>'+uxEsc(v.name)+'</b><span>'+uxEsc(v.caseName||'—')+' · '+uxEsc(v.field||'—')+' · '+t+(v.sync?' · '+uxEsc(v.sync):'')+'</span></button>'});
  const mode=document.getElementById('fcSync')?.value||'—',diff=document.getElementById('fcDifferenceMode')?.value||'signed';bar.innerHTML=parts.join('<span class="uxStatusSep">|</span>')+'<span class="uxStatusMeta">'+uxUi('Sync','Sync')+': '+uxEsc(mode)+' · Δ: '+uxEsc(diff)+'</span>'
}
function uxEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uxInstallNames(){
  const viewports=[['fvViewport',1],['fcViewport',2],['fcExtra3Viewport',3],['fcExtra4Viewport',4]];
  for(const [vp,id] of viewports){const host=document.getElementById(vp);if(!host||document.getElementById('uxName'+id))continue;const b=document.createElement('button');b.id='uxName'+id;b.className='uxViewName';b.type='button';b.textContent=uxName(id);b.title=uxUi('Rename this viewport','Renombrar esta vista');b.onclick=()=>uxRename(id);host.appendChild(b)}
}
function uxInstallStatus(){if(document.getElementById('uxCompareStatus'))return;const grid=document.getElementById('fwGrid');if(!grid)return;const bar=document.createElement('div');bar.id='uxCompareStatus';bar.className='uxCompareStatus';grid.insertAdjacentElement('beforebegin',bar);bar.addEventListener('click',e=>{const b=e.target.closest('[data-ux-rename]');if(b)uxRename(Number(b.dataset.uxRename))})}
function uxHelp(){
  uxInstall();let o=document.getElementById('uxHelpOverlay');if(!o)return;o.classList.add('open');o.setAttribute('aria-hidden','false')
}
function uxCloseHelp(){const o=document.getElementById('uxHelpOverlay');o?.classList.remove('open');o?.setAttribute('aria-hidden','true')}
async function uxRestoreAssignments(saved){
  if(!saved||saved.project!==uxProjectKey()||uxState.restoring)return;uxState.restoring=true;
  try{
    const want=Math.max(1,Math.min(4,Number(saved.viewCount)||1)),enabled=document.getElementById('fcEnabled');
    if(want>=2&&enabled&&!enabled.checked){enabled.checked=true;enabled.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,80))}
    while(typeof fcExtraAdd==='function'&&typeof fcExtraViews!=='undefined'&&1+(enabled?.checked?1:0)+fcExtraViews.length<want){fcExtraAdd();await new Promise(r=>setTimeout(r,40))}
    for(const v of saved.views||[]){
      const prefix=v.id===1?'fv':v.id===2?'fc':'fcExtra'+v.id,caseSel=document.getElementById(prefix+'Case');if(!caseSel)continue;
      const opt=[...caseSel.options].find(o=>o.textContent.trim()===v.caseName)||[...caseSel.options].find(o=>o.value===String(v.caseValue));if(opt){caseSel.value=opt.value;if(v.id===1&&typeof fvHandleCaseChange==='function')await fvHandleCaseChange();else{caseSel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,60))}}
      for(const [suffix,value] of [['Region',v.region],['Field',v.field],['Component',v.component]]){const sel=document.getElementById(prefix+suffix);if(sel&&[...sel.options].some(o=>o.value===String(value))){sel.value=String(value);sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,25))}}
    }
  }catch(e){console.warn('FoamLens layout restore:',e)}finally{uxState.restoring=false;uxUpdateStatus()}
}
function uxRestore(){
  const saved=uxRead();if(!saved)return null;uxState.names={...uxState.names,...(saved.names||{})};const l=document.getElementById('fwLayout');if(l&&saved.layout){l.value=saved.layout;fwSetLayout?.(saved.layout)}const c=document.getElementById('fwCompanion');if(c&&saved.companion){c.value=saved.companion;fwSetCompanion?.(saved.companion)}const st=document.getElementById('fwSyncTime');if(st&&typeof saved.syncTime==='boolean')st.checked=saved.syncTime;uxApplyNames();uxApplySplit();setTimeout(()=>uxRestoreAssignments(saved),120);return saved
}
function uxInstall(){
  if(uxState.installed&&document.getElementById('uxCompareStatus')){uxInstallNames();return}uxState.installed=true;
  const style=document.getElementById('uxWorkspaceStyles')||document.createElement('style');style.id='uxWorkspaceStyles';style.textContent='.fwGrid{position:relative}.fwSplitter{position:absolute;top:0;bottom:0;width:8px;margin-left:-4px;z-index:90;cursor:col-resize;background:transparent}.fwSplitter:hover,.uxSplitting .fwSplitter{background:color-mix(in srgb,var(--accent) 24%,transparent)}.uxViewName{position:absolute;right:10px;top:10px;z-index:26;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 90%,transparent);color:var(--text);font-size:8px;font-weight:900;padding:4px 7px;backdrop-filter:blur(8px)}.uxCompareStatus{display:flex;align-items:center;gap:6px;overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:6px 8px}.uxStatusView{display:flex;gap:5px;align-items:center;border:0;background:transparent;color:var(--text);padding:3px 5px;border-radius:7px;white-space:nowrap}.uxStatusView:hover{background:var(--accentSoft)}.uxStatusView b{font-size:8px}.uxStatusView span,.uxStatusMeta{font-size:8px;color:var(--muted);white-space:nowrap}.uxStatusSep{color:var(--line)}.uxHelpOverlay{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;background:rgba(2,8,18,.66);backdrop-filter:blur(9px);padding:18px}.uxHelpOverlay.open{display:flex}.uxHelpCard{width:min(720px,96vw);max-height:88vh;overflow:auto;border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.35)}.uxHelpGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.uxHelpItem{border:1px solid var(--line);border-radius:10px;background:var(--panel2);padding:10px}.uxHelpItem b{display:block;margin-bottom:4px}.uxHelpItem span{font-size:9px;color:var(--muted);line-height:1.45}@media(max-width:700px){.uxHelpGrid{grid-template-columns:1fr}}@media(max-width:1350px){.fwSplitter{display:none!important}}';if(!style.parentElement)document.head.appendChild(style);
  const grid=document.getElementById('fwGrid');if(grid){for(const [id,kind] of [['uxSplitA','main'],['uxSplitB','controls']])if(!document.getElementById(id)){const h=document.createElement('div');h.id=id;h.className='fwSplitter';h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.onpointerdown=e=>uxStartDrag(kind,e);grid.appendChild(h)}}
  uxInstallStatus();uxInstallNames();
  if(!document.getElementById('uxHelpOverlay')){const o=document.createElement('div');o.id='uxHelpOverlay';o.className='uxHelpOverlay';o.setAttribute('aria-hidden','true');o.innerHTML='<section class="uxHelpCard" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;gap:10px"><div><h3 style="margin:0">'+uxUi('Field Workspace help','Ayuda del Workspace de campos')+'</h3><p class="smallnote">'+uxUi('Contextual shortcuts for the current scientific workspace.','Atajos contextuales para el workspace científico actual.')+'</p></div><button class="btn tiny" id="uxHelpClose" type="button">×</button></div><div class="uxHelpGrid"><div class="uxHelpItem"><b>'+uxUi('Rename views','Renombrar vistas')+'</b><span>'+uxUi('Click the A/B/C/D badge or the comparison status bar. Names persist with the layout.','Haz clic en el badge A/B/C/D o en la barra de comparación. Los nombres persisten con el diseño.')+'</span></div><div class="uxHelpItem"><b>'+uxUi('Resize workspace','Redimensionar workspace')+'</b><span>'+uxUi('Drag the separators between 3D, companion plot and controls on wide screens.','Arrastra los separadores entre 3D, gráfica compañera y controles en pantallas anchas.')+'</span></div><div class="uxHelpItem"><b>'+uxUi('Save layout','Guardar diseño')+'</b><span>'+uxUi('Stores layout, companion, splitter positions, view count, compatible case/field assignments and view names.','Guarda diseño, companion, splitters, número de vistas, asignaciones compatibles caso/campo y nombres.')+'</span></div><div class="uxHelpItem"><b>'+uxUi('Comparison status','Estado de comparación')+'</b><span>'+uxUi('The bar shows each visible view, physical time and synchronization mode without opening configuration panels.','La barra muestra cada vista visible, tiempo físico y modo de sincronización sin abrir paneles.')+'</span></div></div></section>';document.body.appendChild(o);o.onclick=e=>{if(e.target===o)uxCloseHelp()};document.getElementById('uxHelpClose').onclick=uxCloseHelp}
  document.addEventListener('pointermove',uxMoveDrag);document.addEventListener('pointerup',uxEndDrag);window.addEventListener('resize',uxApplySplit);
  document.addEventListener('change',e=>{if(/^fw|^fc|^fv/.test(String(e.target?.id||''))){uxSave(true);setTimeout(()=>{uxInstallNames();uxUpdateStatus();uxApplySplit()},60)}},true);
  setInterval(()=>{if(document.body.classList.contains('appMode-field')){uxInstallNames();uxUpdateStatus();uxPositionSplitters()}},700);
  uxRestore();
  window.FoamLensWorkspaceUX={save:uxSave,restore:uxRestore,reset:uxReset,help:uxHelp,rename:uxRename,snapshot:uxSnapshot,applySplit:uxApplySplit}
}
const uxPrevEnter=typeof fwEnter==='function'?fwEnter:null;
if(uxPrevEnter&&!uxPrevEnter.__uxPatched){fwEnter=function(){const r=uxPrevEnter.apply(this,arguments);setTimeout(()=>{uxInstall();uxRestore()},40);return r};fwEnter.__uxPatched=true}
uxRead();setTimeout(()=>{if(document.getElementById('fwGrid'))uxInstall()},0);
