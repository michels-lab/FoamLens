/* FoamLens Desktop v1.4.3 — synchronized scientific 3D animation/video export. */

const vaState={exporting:false,ranges:null};
function vaUi(en,es){try{return flUi(en,es)}catch{return en}}
function vaEsc(v){try{return fvEsc(v)}catch{return String(v??'')}}
function vaFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function vaSetStatus(text,error=false){
  const e=document.getElementById('fvVideoStatus');if(!e)return;e.textContent=String(text||'');e.classList.toggle('error',!!error)
}
function vaPrimaryGroup(){
  try{return typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null}catch{return null}
}
function vaTimes(){
  const g=vaPrimaryGroup();return (g?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b)
}
function vaRefreshTimeSelectors(){
  const times=vaTimes(),start=document.getElementById('fvVideoStart'),end=document.getElementById('fvVideoEnd');if(!start||!end)return;
  const oldStart=start.value,oldEnd=end.value,opts=times.map((t,i)=>'<option value="'+i+'">'+vaFmt(t)+' s</option>').join('');start.innerHTML=opts;end.innerHTML=opts;
  if(oldStart&&Number(oldStart)<times.length)start.value=oldStart;else start.value='0';
  if(oldEnd&&Number(oldEnd)<times.length)end.value=oldEnd;else end.value=String(Math.max(0,times.length-1))
}
function vaDescriptorList(){
  const list=[];try{const p=window.FoamLensFieldView?.getVideoDescriptor?.();if(p)list.push(p)}catch{}
  try{list.push(...(window.FoamLensFieldCompare?.getVideoDescriptors?.()||[]))}catch{}
  return list.filter(d=>{const canvas=document.getElementById(d.canvasId),vp=canvas?.closest('.fvViewport');return !!canvas&&(!vp||!vp.classList.contains('hidden'))})
}
function vaAccumulateRanges(target,descriptors){
  for(const d of descriptors||[]){const r=d?.range;if(!r?.valid||!Number.isFinite(Number(r.min))||!Number.isFinite(Number(r.max)))continue;const key=String(d.key||d.canvasId||'view'),prev=target[key];target[key]=prev?{valid:true,min:Math.min(prev.min,Number(r.min)),max:Math.max(prev.max,Number(r.max))}:{valid:true,min:Number(r.min),max:Number(r.max)}}
  return target
}
function vaApplyRanges(ranges){
  vaState.ranges=ranges||null;try{window.FoamLensFieldView?.setVideoRangeOverride?.(ranges?.primary||null)}catch{}try{window.FoamLensFieldCompare?.setVideoRanges?.(ranges||null)}catch{}try{window.FoamLensRegionScene?.setVideoRanges?.(ranges?.regions||null)}catch{}
}
function vaPaletteCssStops(){
  try{const name=document.getElementById('fvPalette')?.value||'viridis';return fvPaletteStops(name)}catch{return[[0,[.267,.005,.329]],[1,[.993,.906,.144]]]}
}
function vaDrawGradient(ctx,x,y,w,h){
  const g=ctx.createLinearGradient(x,y,x+w,y);for(const [at,rgb] of vaPaletteCssStops())g.addColorStop(at,'rgb('+rgb.map(v=>Math.round(v*255)).join(',')+')');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)
}
function vaDrawComposite(out,width,height,descriptors){
  out.width=width;out.height=height;const ctx=out.getContext('2d');ctx.fillStyle='#08111c';ctx.fillRect(0,0,width,height);
  const n=Math.max(1,descriptors.length),cols=n===1?1:2,rows=Math.ceil(n/cols),gap=Math.max(8,Math.round(width*.008)),header=Math.max(42,Math.round(height*.055)),cellW=(width-gap*(cols+1))/cols,cellH=(height-header-gap*(rows+1))/rows;
  ctx.fillStyle='#f5f7fa';ctx.font='600 '+Math.max(16,Math.round(height*.022))+'px system-ui, sans-serif';ctx.textBaseline='middle';const primaryTime=descriptors[0]?.time;ctx.fillText('FoamLens · '+(Number.isFinite(Number(primaryTime))?'t = '+vaFmt(primaryTime)+' s':'3D animation'),gap,header*.52);
  descriptors.forEach((d,i)=>{
    const canvas=document.getElementById(d.canvasId);if(!canvas)return;const col=i%cols,row=Math.floor(i/cols),x=gap+col*(cellW+gap),y=header+gap+row*(cellH+gap),pad=Math.max(6,Math.round(cellW*.012)),labelH=Math.max(48,Math.round(cellH*.12));
    ctx.fillStyle='#0d1825';ctx.fillRect(x,y,cellW,cellH);const srcW=Math.max(1,canvas.width),srcH=Math.max(1,canvas.height),availH=cellH-labelH,scale=Math.min(cellW/srcW,availH/srcH),dw=srcW*scale,dh=srcH*scale,dx=x+(cellW-dw)/2,dy=y+(availH-dh)/2;ctx.drawImage(canvas,dx,dy,dw,dh);
    ctx.fillStyle='rgba(4,10,17,.88)';ctx.fillRect(x,y+cellH-labelH,cellW,labelH);ctx.fillStyle='#f5f7fa';ctx.font='600 '+Math.max(12,Math.round(height*.014))+'px system-ui, sans-serif';ctx.textBaseline='top';const title=(d.caseName||vaUi('View','Vista'))+' · '+(d.fieldName||'—')+(d.component&&d.component!=='value'?' · '+d.component:'')+(Number.isFinite(Number(d.time))?' · t='+vaFmt(d.time)+' s':'');ctx.fillText(title,x+pad,y+cellH-labelH+pad);
    const r=vaState.ranges?.[d.key]||d.range;if(r?.valid){const lineY=y+cellH-labelH+pad+Math.max(17,Math.round(height*.018)),gw=Math.min(130,cellW*.28),gh=Math.max(6,Math.round(height*.007));vaDrawGradient(ctx,x+pad,lineY+3,gw,gh);ctx.fillStyle='#cbd5df';ctx.font='500 '+Math.max(10,Math.round(height*.011))+'px system-ui, sans-serif';ctx.fillText(vaFmt(r.min)+' → '+vaFmt(r.max),x+pad+gw+8,lineY)}
  })
}
function vaMime(format){
  if(typeof MediaRecorder==='undefined')return null;const candidates=format==='mp4'?['video/mp4;codecs=avc1','video/mp4']:format==='webm'?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']:['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  return candidates.find(x=>{try{return MediaRecorder.isTypeSupported(x)}catch{return false}})||''
}
function vaDelay(ms){return new Promise(r=>setTimeout(r,ms))}
async function vaPreload(start,end,step){
  const ranges={};let count=0,total=Math.floor((end-start)/step)+1;
  vaApplyRanges(null);window.FoamLensRegionScene?.beginVideoRangeScan?.();let finished=false;
  try{
    for(let i=start;i<=end;i+=step){await fvLoadFrame(i);vaAccumulateRanges(ranges,vaDescriptorList());count++;vaSetStatus(vaUi('Preparing frames','Preparando frames')+' · '+count+'/'+total+' · '+vaUi('global ranges','rangos globales'));await vaDelay(0)}
    ranges.regions=window.FoamLensRegionScene?.endVideoRangeScan?.()||{};finished=true;return ranges
  }finally{if(!finished)window.FoamLensRegionScene?.endVideoRangeScan?.()}
}
async function vaExport(){
  if(vaState.exporting)return;const times=vaTimes();if(!times.length){vaSetStatus(vaUi('No Field View timeline is available.','No hay una línea temporal disponible en Vista 3D.'),true);return}
  const start=Math.max(0,Math.min(times.length-1,Number(document.getElementById('fvVideoStart')?.value)||0)),end=Math.max(start,Math.min(times.length-1,Number(document.getElementById('fvVideoEnd')?.value)||times.length-1)),step=Math.max(1,Math.round(Number(document.getElementById('fvVideoStep')?.value)||1)),fps=Math.max(1,Math.min(60,Number(document.getElementById('fvVideoFps')?.value)||30)),res=String(document.getElementById('fvVideoResolution')?.value||'1920x1080').split('x').map(Number),width=res[0]||1920,height=res[1]||1080,format=document.getElementById('fvVideoFormat')?.value||'auto',mime=vaMime(format);
  if(typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream||typeof MediaRecorder==='undefined'||mime===null){vaSetStatus(vaUi('Video encoding is unavailable in this WebView runtime.','La codificación de video no está disponible en este runtime de WebView.'),true);return}
  const button=document.getElementById('fvVideoExport'),originalIndex=Number(document.getElementById('fvTimeSlider')?.value)||0;vaState.exporting=true;if(button)button.disabled=true;try{
    if(typeof fvStopPlayback==='function')fvStopPlayback();const ranges=await vaPreload(start,end,step);vaApplyRanges(ranges);await fvLoadFrame(start);
    const composite=document.createElement('canvas'),initial=vaDescriptorList();if(!initial.length)throw new Error(vaUi('No visible 3D viewport is available to record.','No hay un viewport 3D visible para grabar.'));vaDrawComposite(composite,width,height,initial);
    const stream=composite.captureStream(fps),chunks=[],recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:Math.max(4000000,Math.round(width*height*fps*.08))}:{videoBitsPerSecond:Math.max(4000000,Math.round(width*height*fps*.08))});
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('MediaRecorder error'))});recorder.start(500);await vaDelay(100);
    let frame=0,total=Math.floor((end-start)/step)+1;for(let i=start;i<=end;i+=step){const begun=performance.now();await fvLoadFrame(i);const descriptors=vaDescriptorList();vaDrawComposite(composite,width,height,descriptors);frame++;vaSetStatus(vaUi('Rendering video','Renderizando video')+' · '+frame+'/'+total+' · '+fps+' fps · '+width+'×'+height);const spent=performance.now()-begun;await vaDelay(Math.max(1,1000/fps-spent))}
    await vaDelay(Math.max(80,1000/fps));recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const type=recorder.mimeType||mime||'video/webm',ext=/mp4/i.test(type)?'mp4':'webm',blob=new Blob(chunks,{type}),url=URL.createObjectURL(blob),a=document.createElement('a'),caseName=(typeof fvCase==='function'?fvCase()?.name:'FoamLens')||'FoamLens',field=(typeof fvState!=='undefined'?fvState.fieldName:'field')||'field';a.href=url;a.download=(caseName+'_'+field+'_'+vaFmt(times[start])+'-'+vaFmt(times[end])+'s.'+ext).replace(/[^a-z0-9._-]+/gi,'_');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);vaSetStatus(vaUi('Video exported','Video exportado')+' · '+ext.toUpperCase()+' · '+frame+' '+vaUi('frames','frames'))
  }catch(e){console.error(e);vaSetStatus(String(e?.message||e),true)}finally{vaApplyRanges(null);try{await fvLoadFrame(originalIndex)}catch{}vaState.exporting=false;if(button)button.disabled=false}
}
function vaInstallUi(){
  if(document.getElementById('fvAnimationPanel'))return true;const controls=document.getElementById('fieldViewControls'),status=document.getElementById('fvStatus');if(!controls||!status)return false;const box=document.createElement('details');box.id='fvAnimationPanel';box.className='analysisExt';box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Animation / Video" data-fl-es="Animación / Video">Animation / Video</strong><span class="badge">3D</span></summary><div class="extSectionBody">'+
  '<div class="row2"><div class="field"><label data-fl-en="Start time" data-fl-es="Tiempo inicial">Start time</label><select id="fvVideoStart"></select></div><div class="field"><label data-fl-en="End time" data-fl-es="Tiempo final">End time</label><select id="fvVideoEnd"></select></div></div>'+
  '<div class="row2"><div class="field"><label data-fl-en="Frame step" data-fl-es="Paso de frames">Frame step</label><input id="fvVideoStep" type="number" min="1" max="100" step="1" value="1"></div><div class="field"><label>FPS</label><select id="fvVideoFps"><option>24</option><option selected>30</option><option>60</option></select></div></div>'+
  '<div class="row2"><div class="field"><label data-fl-en="Resolution" data-fl-es="Resolución">Resolution</label><select id="fvVideoResolution"><option value="1280x720">720p</option><option value="1920x1080" selected>1080p</option><option value="2560x1440">1440p</option><option value="3840x2160">4K</option></select></div><div class="field"><label data-fl-en="Format" data-fl-es="Formato">Format</label><select id="fvVideoFormat"><option value="auto" data-fl-en="Auto · MP4 if supported" data-fl-es="Auto · MP4 si está disponible">Auto · MP4 if supported</option><option value="mp4">MP4</option><option value="webm">WebM</option></select></div></div>'+
  '<div class="smallnote" data-fl-en="FoamLens first preloads the selected times and fixes an independent global color range for every visible viewport. All synchronized 3D views are composited into the same video." data-fl-es="FoamLens primero precarga los tiempos seleccionados y fija un rango de color global independiente para cada viewport visible. Todas las vistas 3D sincronizadas se componen en el mismo video.">FoamLens first preloads the selected times and fixes an independent global color range for every visible viewport. All synchronized 3D views are composited into the same video.</div>'+
  '<div class="fvTimelineActions"><button class="btn soft" id="fvVideoExport" type="button" data-fl-en="Export video" data-fl-es="Exportar video">Export video</button></div><div class="extStatus" id="fvVideoStatus"></div></div>';status.insertAdjacentElement('beforebegin',box);try{flApplyBilingualText(box)}catch{}document.getElementById('fvVideoExport').addEventListener('click',vaExport);box.addEventListener('toggle',()=>{if(box.open)vaRefreshTimeSelectors()});for(const id of ['fvCase','fvRegion','fvField','fvComponent'])document.getElementById(id)?.addEventListener('change',()=>setTimeout(vaRefreshTimeSelectors,0));vaRefreshTimeSelectors();return true
}
function vaInstall(){if(vaInstallUi())return;const retry=()=>{if(vaInstallUi())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
vaInstall();
window.FoamLensAnimationExport={exportVideo:vaExport,refresh:vaRefreshTimeSelectors,descriptorList:vaDescriptorList,isExporting:()=>vaState.exporting};
