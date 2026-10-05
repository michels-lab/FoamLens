/* FoamLens Desktop v1.4.9 — thesis/paper multi-panel scientific figure export. */
const meState={open:false,lastSources:[]};
function meUi(en,es){try{return flUi(en,es)}catch{return en}}
function meFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function meSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mePreset(){
  const key=document.getElementById('mePreset')?.value||'thesis';
  return key==='paper'?{key,w:2400,h:1800,label:'Paper'}:key==='presentation'?{key,w:1920,h:1080,label:'Presentation'}:key==='thesis-hires'?{key,w:3200,h:2000,label:'Thesis Hi-Res'}:{key:'thesis',w:2400,h:1600,label:'Thesis'}
}
function mePlotAvailable(){
  const c=document.getElementById('canvas'),wrap=c?.closest('.chartwrap');if(!c||!wrap)return false;
  const style=getComputedStyle(wrap);return style.display!=='none'&&!wrap.classList.contains('hidden')&&c.width>0&&c.height>0
}
function meSources(){
  const out=[];
  try{
    const p=window.FoamLensFieldView?.getVideoDescriptor?.();
    if(p&&document.getElementById(p.canvasId))out.push({...p,type:'3d',title:(p.caseName||meUi('Primary','Principal'))+' · '+(p.fieldName||'—'),defaultSelected:true})
  }catch{}
  try{
    for(const d of window.FoamLensFieldCompare?.getVideoDescriptors?.()||[]){
      if(!document.getElementById(d.canvasId))continue;
      out.push({...d,type:d.key==='difference'?'difference':'3d',title:d.key==='difference'?meUi('3D Difference','Diferencia 3D'):(d.caseName||d.key)+' · '+(d.fieldName||'—'),defaultSelected:true})
    }
  }catch{}
  if(mePlotAvailable()){
    const mode=typeof currentDataView!=='undefined'?currentDataView:'plot',title=document.getElementById('plotTitle')?.textContent?.trim()||meUi('Companion plot','Gráfica compañera');
    out.push({key:'plot',canvasId:'canvas',type:'plot',title,caseName:'',fieldName:mode,time:Number.NaN,range:null,defaultSelected:true})
  }
  return out
}
function meSelectedSources(){
  const all=meSources(),checks=[...document.querySelectorAll('#meSourceList input[data-me-source]:checked')].map(x=>x.value);
  if(!checks.length)return all.slice(0,4);return all.filter(x=>checks.includes(String(x.key)))
}
function meLayout(count){
  const mode=document.getElementById('meLayout')?.value||'auto';
  if(mode==='one')return{cols:1,rows:1};
  if(mode==='two')return{cols:2,rows:1};
  if(mode==='grid')return{cols:2,rows:2};
  if(mode==='3d-profile')return{cols:2,rows:1};
  return count<=1?{cols:1,rows:1}:count===2?{cols:2,rows:1}:{cols:2,rows:Math.ceil(Math.min(4,count)/2)}
}
function mePaletteStops(name){
  try{return fvPaletteStops(name||document.getElementById('fvPalette')?.value||'viridis')}catch{return[[0,[.267,.005,.329]],[.5,[.128,.567,.551]],[1,[.993,.906,.144]]]}
}
function meDrawRange(ctx,x,y,w,range,palette='viridis',suffix=''){
  if(!range?.valid)return;const grad=ctx.createLinearGradient(x,y,x+w,y);for(const [at,rgb] of mePaletteStops(palette))grad.addColorStop(at,'rgb('+rgb.map(v=>Math.round(v*255)).join(',')+')');
  ctx.fillStyle=grad;ctx.fillRect(x,y,w,8);ctx.fillStyle='#536273';ctx.font='500 18px Arial';ctx.textBaseline='top';ctx.fillText(meFmt(range.min)+(suffix||''),x,y+12);const max=meFmt(range.max)+(suffix||''),tw=ctx.measureText(max).width;ctx.fillText(max,x+w-tw,y+12)
}
function meRenderPlotCanvas(w,h){
  const c=document.createElement('canvas');c.width=Math.max(200,Math.round(w));c.height=Math.max(150,Math.round(h));
  const ctx=c.getContext('2d');try{
    if(typeof renderExportComposition==='function'&&typeof visibleCurrentSeries==='function'&&visibleCurrentSeries().length){renderExportComposition(ctx,c.width,c.height,false);return c}
  }catch(e){console.warn('FoamLens multipanel high-resolution plot render fallback:',e)}
  const src=document.getElementById('canvas');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);if(src)ctx.drawImage(src,0,0,c.width,c.height);return c
}
async function meRender3DCanvas(source,w,h){
  const src=document.getElementById(source?.canvasId||'');if(!src)return null;
  const width=Math.max(320,Math.round(Number(w)||src.width||640)),height=Math.max(240,Math.round(Number(h)||src.height||480)),oldW=src.width,oldH=src.height;
  let rendered=null;
  try{
    if(source.key==='primary'&&typeof window.FoamLensFieldView?.renderAtSize==='function')rendered=window.FoamLensFieldView.renderAtSize(width,height);
    else if(typeof window.FoamLensFieldCompare?.renderAtSize==='function')rendered=window.FoamLensFieldCompare.renderAtSize(source.key,width,height);
    if(!rendered)rendered=src;
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    const out=document.createElement('canvas');out.width=width;out.height=height;out.getContext('2d').drawImage(rendered,0,0,width,height);
    meState.lastHiRes={key:source.key,width,height,sourceBefore:[oldW,oldH],sourceDuring:[rendered.width,rendered.height],rerendered:rendered===src&&rendered.width===width&&rendered.height===height};
    return out
  }finally{
    try{
      if(source.key==='primary'&&typeof window.FoamLensFieldView?.renderAtSize==='function')window.FoamLensFieldView.renderAtSize(oldW,oldH);
      else if(typeof window.FoamLensFieldCompare?.renderAtSize==='function')window.FoamLensFieldCompare.renderAtSize(source.key,oldW,oldH)
    }catch(e){console.warn('FoamLens high-resolution 3D restore failed:',e)}
  }
}
async function meRenderSourceCanvas(source,w,h){
  return source?.type==='plot'?meRenderPlotCanvas(w,h):await meRender3DCanvas(source,w,h)
}
async function meDrawPanel(ctx,source,x,y,w,h,index,total){
  const pad=Math.max(18,Math.round(w*.025)),header=Math.max(58,Math.round(h*.095)),footer=Math.max(68,Math.round(h*.12));
  ctx.fillStyle='#ffffff';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#d8dde4';ctx.lineWidth=2;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  ctx.fillStyle='#13202d';ctx.font='700 '+Math.max(20,Math.round(h*.032))+'px Arial';ctx.textBaseline='middle';ctx.fillText(String.fromCharCode(65+index)+'. '+String(source.title||source.key||meUi('Panel','Panel')),x+pad,y+header*.48);
  const bodyY=y+header,bodyH=h-header-footer,src=await meRenderSourceCanvas(source,w-2*pad,bodyH);
  if(src){
    const sw=Math.max(1,src.width||src.clientWidth||1),sh=Math.max(1,src.height||src.clientHeight||1),scale=Math.min((w-2*pad)/sw,bodyH/sh),dw=sw*scale,dh=sh*scale,dx=x+(w-dw)/2,dy=bodyY+(bodyH-dh)/2;
    ctx.drawImage(src,dx,dy,dw,dh)
  }
  ctx.fillStyle='#405164';ctx.font='500 '+Math.max(15,Math.round(h*.022))+'px Arial';ctx.textBaseline='top';
  if(source.type!=='plot'){
    const time=Number.isFinite(Number(source.time))?'t = '+meFmt(source.time)+' s':'',component=source.component&&source.component!=='value'?' · '+source.component:'',meta=[source.caseName,source.fieldName+component,time].filter(Boolean).join(' · ');
    ctx.fillText(meta,x+pad,y+h-footer+10);const suffix=String(source.component||'').includes('percent')?' %':'';meDrawRange(ctx,x+pad,y+h-30,Math.min(w*.34,300),source.range,source.key==='difference'?'coolwarm':(document.getElementById('fvPalette')?.value||'viridis'),suffix)
  }else{
    ctx.fillText(meUi('FoamLens plot / Spatial Profile rendered with current thesis figure settings','Gráfica FoamLens / Perfil espacial renderizado con los ajustes actuales de figura'),x+pad,y+h-footer+10)
  }
}
async function meCompose(sources=meSelectedSources(),options={}){
  sources=(sources||[]).slice(0,4);if(!sources.length)throw new Error(meUi('No visible panels are available to export.','No hay paneles visibles disponibles para exportar.'));
  const preset=options.preset||mePreset(),layout=options.layout||meLayout(sources.length),canvas=document.createElement('canvas');canvas.width=preset.w;canvas.height=preset.h;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const margin=Math.max(24,Math.round(canvas.width*.018)),gap=Math.max(22,Math.round(canvas.width*.014)),titleH=Math.max(62,Math.round(canvas.height*.07)),cols=Math.max(1,layout.cols),rows=Math.max(1,layout.rows),cellW=(canvas.width-2*margin-gap*(cols-1))/cols,cellH=(canvas.height-titleH-2*margin-gap*(rows-1))/rows;
  ctx.fillStyle='#0d1a27';ctx.font='700 '+Math.max(26,Math.round(canvas.height*.027))+'px Arial';ctx.textBaseline='middle';const custom=document.getElementById('meTitle')?.value?.trim(),title=custom||meUi('FoamLens scientific comparison','Comparación científica FoamLens');ctx.fillText(title,margin,margin+titleH*.42);
  for(let i=0;i<sources.length;i++){const source=sources[i],col=i%cols,row=Math.floor(i/cols);if(row>=rows)continue;await meDrawPanel(ctx,source,margin+col*(cellW+gap),margin+titleH+row*(cellH+gap),cellW,cellH,i,sources.length)}
  ctx.fillStyle='#7a8794';ctx.font='500 '+Math.max(12,Math.round(canvas.height*.013))+'px Arial';ctx.textAlign='right';ctx.fillText('FoamLens · '+new Date().toISOString().slice(0,10),canvas.width-margin,canvas.height-8);ctx.textAlign='left';
  return{canvas,sources,preset,layout,title,hiRes:meState.lastHiRes||null}
}
function meDownloadCanvas(canvas,name){
  if(canvas.toBlob)canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200)},'image/png');
  else{const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=name;a.click()}
}
async function meExport(){
  try{const result=await meCompose();meDownloadCanvas(result.canvas,'FoamLens_'+result.preset.key+'_multipanel.png');meStatus(meUi('Multi-panel figure exported with high-resolution 3D rerendering: ','Figura multipanel exportada con rerender 3D de alta resolución: ')+result.preset.w+'×'+result.preset.h)}catch(e){meStatus(String(e?.message||e),true)}
}
async function meExportPanels(){
  const sources=meSelectedSources();if(!sources.length){meStatus(meUi('No panels selected.','No hay paneles seleccionados.'),true);return}
  const base=mePreset(),panelPreset={...base,w:Math.max(1800,Math.round(base.w*.75)),h:Math.max(1200,Math.round(base.h*.75)),key:base.key+'-panel'};
  for(let i=0;i<sources.length;i++){const source=sources[i],result=await meCompose([source],{preset:panelPreset,layout:{cols:1,rows:1}});meDownloadCanvas(result.canvas,'FoamLens_panel_'+String(i+1)+'_'+String(source.key).replace(/\W+/g,'_')+'.png')}
  meStatus(meUi('Selected panels exported separately with high-resolution 3D rerendering, scientific labels and ranges.','Paneles seleccionados exportados por separado con rerender 3D de alta resolución, etiquetas y rangos científicos.'))
}
function meStatus(text,error=false){const e=document.getElementById('meStatus');if(!e)return;e.textContent=String(text||'');e.classList.toggle('error',!!error)}
function meRefreshSources(){
  const list=document.getElementById('meSourceList');if(!list)return;const old=new Set([...list.querySelectorAll('input:checked')].map(x=>x.value)),sources=meSources();meState.lastSources=sources;
  list.innerHTML=sources.length?sources.map((s,i)=>'<label class="meSource"><input type="checkbox" data-me-source value="'+meSafe(s.key)+'" '+((old.size?old.has(String(s.key)):i<4)?'checked':'')+'> <span><b>'+meSafe(s.title)+'</b><small>'+meSafe(s.type==='plot'?meUi('Plot / Spatial Profile','Gráfica / Perfil espacial'):(Number.isFinite(Number(s.time))?'t='+meFmt(s.time)+' s':'3D'))+'</small></span></label>').join(''):'<div class="smallnote">'+meUi('Open Field Workspace or a plot first.','Abre primero Field Workspace o una gráfica.')+'</div>'
}
function meOpen(){meInstall();const panel=document.getElementById('meDialog');panel?.classList.add('open');meState.open=true;meRefreshSources();meStatus('')}
function meClose(){document.getElementById('meDialog')?.classList.remove('open');meState.open=false}
function meInstall(){
  if(document.getElementById('meDialog'))return;
  const style=document.createElement('style');style.id='meStyles';style.textContent='.meOverlay{position:fixed;inset:0;z-index:11000;display:none;align-items:center;justify-content:center;background:rgba(2,8,18,.68);backdrop-filter:blur(10px);padding:20px}.meOverlay.open{display:flex}.meDialog{width:min(760px,96vw);max-height:90vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 28px 80px rgba(0,0,0,.38)}.meHead{display:flex;justify-content:space-between;gap:12px;align-items:center}.meHead h3{margin:0}.meSourceList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}.meSource{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--panel2)}.meSource span{min-width:0}.meSource b,.meSource small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meSource small{margin-top:2px;color:var(--muted);font-size:8px}.meActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.meActions .btn{flex:1}.meGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}@media(max-width:650px){.meSourceList,.meGrid{grid-template-columns:1fr}}';document.head.appendChild(style);
  const overlay=document.createElement('div');overlay.id='meDialog';overlay.className='meOverlay';overlay.innerHTML='<div class="meDialog"><div class="meHead"><div><h3>'+meUi('Multi-panel scientific figure','Figura científica multipanel')+'</h3><div class="smallnote">'+meUi('Compose 3D views, Difference and the current plot / Spatial Profile.','Combina vistas 3D, Difference y la gráfica / Perfil espacial actual.')+'</div></div><button class="btn tiny" id="meClose" type="button">×</button></div><div class="meGrid" style="margin-top:12px"><div class="field"><label>'+meUi('Preset','Preset')+'</label><select id="mePreset"><option value="thesis">Thesis 2400×1600</option><option value="thesis-hires">Thesis Hi-Res 3200×2000</option><option value="paper">Paper 2400×1800</option><option value="presentation">Presentation 1920×1080</option></select></div><div class="field"><label>'+meUi('Layout','Diseño')+'</label><select id="meLayout"><option value="auto">Auto</option><option value="one">1-up</option><option value="two">2-up</option><option value="grid">2×2</option><option value="3d-profile">3D + Profile</option></select></div></div><div class="field"><label>'+meUi('Figure title','Título de figura')+'</label><input id="meTitle" type="text" placeholder="'+meUi('Automatic FoamLens scientific comparison','Comparación científica FoamLens automática')+'"></div><div id="meSourceList" class="meSourceList"></div><div class="meActions"><button class="btn primary" id="meExport" type="button">'+meUi('Export multi-panel PNG','Exportar PNG multipanel')+'</button><button class="btn" id="meExportPanels" type="button">'+meUi('Export panels separately','Exportar paneles separados')+'</button><button class="btn" id="meRefresh" type="button">'+meUi('Refresh panels','Actualizar paneles')+'</button></div><div class="smallnote" id="meStatus" style="margin-top:8px"></div></div>';document.body.appendChild(overlay);
  document.getElementById('meClose').onclick=meClose;overlay.addEventListener('click',e=>{if(e.target===overlay)meClose()});document.getElementById('meExport').onclick=meExport;document.getElementById('meExportPanels').onclick=meExportPanels;document.getElementById('meRefresh').onclick=meRefreshSources;
  window.FoamLensMultiPanelExport={open:meOpen,close:meClose,getSources:meSources,compose:meCompose,renderSource:meRenderSourceCanvas,getLastHiRes:()=>meState.lastHiRes||null,exportPng:meExport,exportPanels:meExportPanels}
}
meInstall();
