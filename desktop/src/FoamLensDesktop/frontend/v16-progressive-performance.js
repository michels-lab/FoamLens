/* FoamLens Desktop v1.4.9 — progressive rendering, viewport-aware work and adaptive prefetch telemetry. */
const ppState={loads:0,totalMs:0,lastMs:0,lastIndex:null,lastDirection:1,prefetchHits:0,prefetchMisses:0,prefetched:new Set(),meshReuses:0,meshBuilds:0,deferredViews:0,lastPrefetch:[],benchmarking:false,suppressPrefetch:false,lastBenchmark:null};
function ppUi(en,es){try{return flUi(en,es)}catch{return en}}
function ppIdle(fn,timeout=180){if(typeof requestIdleCallback==='function')return requestIdleCallback(fn,{timeout});return setTimeout(fn,0)}
function ppFieldVisible(){
  const panel=document.getElementById('fieldViewPanel');if(!panel||!panel.classList.contains('active'))return false;
  const r=panel.getBoundingClientRect();return r.bottom>=-100&&r.top<=(window.innerHeight||document.documentElement.clientHeight)+100&&document.visibilityState!=='hidden'
}
function ppViewportVisible(el){
  if(!el||el.classList.contains('hidden')||getComputedStyle(el).display==='none')return false;const r=el.getBoundingClientRect(),vh=window.innerHeight||document.documentElement.clientHeight,vw=window.innerWidth||document.documentElement.clientWidth;return r.bottom>=-120&&r.top<=vh+120&&r.right>=-120&&r.left<=vw+120
}
function ppStats(){
  const cache=typeof pmFieldCacheStats==='function'?pmFieldCacheStats():{entries:0,bytes:0,limit:0},avg=ppState.loads?ppState.totalMs/ppState.loads:0;
  return{loads:ppState.loads,lastMs:ppState.lastMs,avgMs:avg,prefetchHits:ppState.prefetchHits,prefetchMisses:ppState.prefetchMisses,hitRate:(ppState.prefetchHits+ppState.prefetchMisses)?ppState.prefetchHits/(ppState.prefetchHits+ppState.prefetchMisses):0,meshReuses:ppState.meshReuses,meshBuilds:ppState.meshBuilds,deferredViews:ppState.deferredViews,lastPrefetch:ppState.lastPrefetch.slice(),cache}
}
function ppUpdateUi(){
  const e=document.getElementById('ppTelemetry');if(!e)return;const s=ppStats(),mb=Number(s.cache.bytes||0)/1048576,lim=Number(s.cache.limit||0)/1048576;
  e.innerHTML='<div><span>'+ppUi('Last frame','Último frame')+'</span><b>'+s.lastMs.toFixed(0)+' ms</b></div><div><span>'+ppUi('Average','Promedio')+'</span><b>'+s.avgMs.toFixed(0)+' ms</b></div><div><span>'+ppUi('Prefetch hit rate','Acierto prefetch')+'</span><b>'+(100*s.hitRate).toFixed(0)+'%</b></div><div><span>'+ppUi('Mesh reuse','Reuso de malla')+'</span><b>'+s.meshReuses+' / '+(s.meshReuses+s.meshBuilds)+'</b></div><div><span>'+ppUi('Field cache','Caché de campos')+'</span><b>'+mb.toFixed(1)+' / '+lim.toFixed(0)+' MB</b></div><div><span>'+ppUi('Deferred views','Vistas diferidas')+'</span><b>'+s.deferredViews+'</b></div>';
  const note=document.getElementById('ppPrefetchNote');if(note)note.textContent=s.lastPrefetch.length?ppUi('Adaptive prefetch: ','Prefetch adaptativo: ')+s.lastPrefetch.join(', '):ppUi('Adaptive prefetch waits for navigation direction.','El prefetch adaptativo espera la dirección de navegación.')
}
function ppInstallUi(){
  if(document.getElementById('ppPanel'))return;const controls=document.getElementById('fieldViewControls'),anchor=document.getElementById('fcPanel')||controls?.lastElementChild;if(!controls)return;
  const box=document.createElement('details');box.className='analysisExt';box.id='ppPanel';box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Performance / cache" data-fl-es="Rendimiento / caché">Performance / cache</strong><span class="badge" data-fl-en="Adaptive" data-fl-es="Adaptativo">Adaptive</span></summary><div class="extSectionBody"><div class="fcStatsCells" id="ppTelemetry"></div><div class="smallnote" id="ppPrefetchNote" style="margin-top:7px"></div><div class="fcExtraActions" style="margin-top:7px"><button class="btn tiny" id="ppRunBenchmark" type="button" data-fl-en="Run controlled benchmark" data-fl-es="Ejecutar benchmark controlado">Run controlled benchmark</button></div><div class="smallnote" id="ppBenchmarkNote" style="margin-top:6px"></div><div class="smallnote" style="margin-top:5px" data-fl-en="Surface + legend are presented first; Slice / Iso / Streamlines continue after the browser can paint. Off-screen comparison views are deferred outside video export." data-fl-es="Superficie + leyenda se muestran primero; Slice / Iso / Streamlines continúan después de que el navegador puede pintar. Las vistas comparativas fuera de pantalla se difieren excepto durante exportación de video.">Surface + legend are presented first; Slice / Iso / Streamlines continue after the browser can paint. Off-screen comparison views are deferred outside video export.</div></div>';
  if(anchor?.parentElement===controls)anchor.insertAdjacentElement('afterend',box);else controls.appendChild(box);try{flApplyBilingualText(box)}catch{};ppUpdateUi()
}
function ppCurrentRequestKey(index){
  try{const c=fvCase(),g=fvCurrentFieldGroup(),region=document.getElementById('fvRegion')?.value||'',times=(g?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),i=index==null?Number(document.getElementById('fvTimeSlider')?.value)||0:Number(index);if(!c||!g||!times.length)return'';const j=Math.max(0,Math.min(times.length-1,Math.round(i)));return fvFieldCacheKey(c.id,g.name,times[j],region)}catch{return''}
}
function ppInstallFrameTelemetry(){
  if(typeof fvLoadFrame!=='function'||fvLoadFrame.__ppPatched)return;const previous=fvLoadFrame;
  fvLoadFrame=async function(index=null,...rest){
    const key=ppCurrentRequestKey(index),wasPrefetched=key&&ppState.prefetched.has(key),meshKey=typeof fvState!=='undefined'?fvState.meshCacheKey:'',start=performance.now();
    if(key){if(wasPrefetched){ppState.prefetchHits++;ppState.prefetched.delete(key)}else ppState.prefetchMisses++}
    const out=await previous.call(this,index,...rest);const ms=performance.now()-start;ppState.loads++;ppState.lastMs=ms;ppState.totalMs+=ms;
    if(typeof fvState!=='undefined'&&meshKey&&fvState.meshCacheKey===meshKey)ppState.meshReuses++;else ppState.meshBuilds++;ppUpdateUi();return out
  };fvLoadFrame.__ppPatched=true
}
function ppInstallAdaptivePrefetch(){
  if(typeof fvSchedulePrefetch!=='function'||fvSchedulePrefetch.__ppPatched)return;
  fvSchedulePrefetch=function(c,g,region,times,index){
    const prev=ppState.lastIndex;if(Number.isFinite(prev)&&index!==prev)ppState.lastDirection=index>prev?1:-1;ppState.lastIndex=index;
    const seq=++fvState.prefetchSeq;if(ppState.suppressPrefetch||!ppFieldVisible()){ppState.lastPrefetch=[];ppUpdateUi();return}
    const avg=ppState.loads?ppState.totalMs/ppState.loads:0,ahead=avg>700?4:avg>250?3:2,behind=1,order=[];
    for(let d=1;d<=ahead;d++)order.push(index+ppState.lastDirection*d);for(let d=1;d<=behind;d++)order.push(index-ppState.lastDirection*d);
    const unique=[...new Set(order)].filter(i=>i>=0&&i<times.length);ppState.lastPrefetch=unique.map(i=>(i+1)+'/'+times.length);ppUpdateUi();
    ppIdle(async()=>{for(const i of unique){if(seq!==fvState.prefetchSeq||!ppFieldVisible())return;const key=fvFieldCacheKey(c.id,g.name,times[i],region);try{await fvLoadFieldSetCached(c.id,g.name,times[i],region);ppState.prefetched.add(key);ppUpdateUi()}catch{}await new Promise(r=>setTimeout(r,0))}},220)
  };fvSchedulePrefetch.__ppPatched=true
}
function ppInstallViewportAwareCompare(){
  if(typeof fcRefreshExtras!=='function'||fcRefreshExtras.__ppPatched)return;const previous=fcRefreshExtras;
  fcRefreshExtras=async function(){
    const video=typeof vaState!=='undefined'&&!!vaState.exporting;if(video||typeof fcExtraViews==='undefined')return previous.apply(this,arguments);
    const visible=[],deferred=[];for(const state of fcExtraViews){const el=fcExtraDom(state.id,'Viewport');(ppViewportVisible(el)?visible:deferred).push(state)}
    if(visible.length)await Promise.all(visible.map(state=>fcExtraRefreshFrame(state)));ppState.deferredViews=deferred.length;ppUpdateUi();
    if(deferred.length)ppIdle(async()=>{for(const state of deferred){if(!fcState?.enabled)return;await fcExtraRefreshFrame(state);await new Promise(r=>setTimeout(r,0))}ppState.deferredViews=0;ppUpdateUi()},320)
  };fcRefreshExtras.__ppPatched=true
}
function ppMedian(values){const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
async function ppControlledBenchmark(options={}){
  if(ppState.benchmarking)throw new Error(ppUi('A performance benchmark is already running.','Ya hay un benchmark de rendimiento en ejecución.'));
  const c=fvCase(),g=fvCurrentFieldGroup(),region=document.getElementById('fvRegion')?.value||'',times=(g?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!c||!g||times.length<2)throw new Error(ppUi('Load a transient 3D field with at least two physical times first.','Carga primero un campo 3D transitorio con al menos dos tiempos físicos.'));
  const repeats=Math.max(1,Math.min(4,Math.round(Number(options.repeats)||2))),current=Math.max(0,Math.min(times.length-1,Number(document.getElementById('fvTimeSlider')?.value)||0)),candidates=[0,Math.floor((times.length-1)/2),times.length-1,current],indices=[...new Set((options.indices||candidates).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<times.length))].slice(0,4);
  if(indices.length<2)throw new Error(ppUi('Not enough distinct frames are available for a controlled benchmark.','No hay suficientes frames distintos para un benchmark controlado.'));
  const original=current,cold=[],warm=[];ppState.benchmarking=true;ppState.suppressPrefetch=true;fvState.prefetchSeq++;
  try{
    for(let r=0;r<repeats;r++)for(const i of indices){if(typeof pmClearFieldCache==='function')pmClearFieldCache();const t0=performance.now();await fvLoadFrame(i,{resetCamera:false});cold.push(performance.now()-t0)}
    if(typeof pmClearFieldCache==='function')pmClearFieldCache();
    for(const i of indices)await fvLoadFieldSetCached(c.id,g.name,times[i],region);
    for(let r=0;r<repeats;r++)for(const i of indices){const t0=performance.now();await fvLoadFrame(i,{resetCamera:false});warm.push(performance.now()-t0)}
  }finally{try{await fvLoadFrame(original,{resetCamera:false})}catch{}ppState.suppressPrefetch=false;ppState.benchmarking=false}
  const coldMedianMs=ppMedian(cold),warmMedianMs=ppMedian(warm),ratio=Number.isFinite(coldMedianMs)&&coldMedianMs>0?warmMedianMs/coldMedianMs:NaN,deltaPct=Number.isFinite(ratio)?(ratio-1)*100:NaN;
  const result={scope:'same frame sequence; cold field-cache load vs pre-warmed field-cache load; prefetch suppressed in both phases',caseName:c.name||'',field:g.name||'',region,times:indices.map(i=>times[i]),samplesPerPhase:cold.length,coldMedianMs,warmMedianMs,ratio,deltaPct,coldSamples:cold,warmSamples:warm,measuredAt:new Date().toISOString()};ppState.lastBenchmark=result;ppUpdateBenchmarkUi();return result
}
function ppUpdateBenchmarkUi(){
  const e=document.getElementById('ppBenchmarkNote');if(!e)return;const b=ppState.lastBenchmark;if(!b){e.textContent=ppUi('Benchmark: not run yet. Compares the same time sequence with a cold vs pre-warmed field cache; prefetch is disabled in both phases.','Benchmark: aún no ejecutado. Compara la misma secuencia temporal con caché de campo fría vs precargada; el prefetch se desactiva en ambas fases.');return}
  const change=Number.isFinite(b.deltaPct)?(b.deltaPct<=0?(-b.deltaPct).toFixed(1)+'% '+ppUi('lower median latency','menor latencia mediana'):b.deltaPct.toFixed(1)+'% '+ppUi('higher median latency','mayor latencia mediana')):'—';
  e.textContent=ppUi('Controlled cache benchmark','Benchmark controlado de caché')+': '+b.coldMedianMs.toFixed(1)+' ms cold → '+b.warmMedianMs.toFixed(1)+' ms warm · '+change+' · n='+b.samplesPerPhase
}
function ppInstall(){
  ppInstallUi();ppInstallAdaptivePrefetch();ppInstallViewportAwareCompare();ppInstallFrameTelemetry();ppUpdateBenchmarkUi();const benchmarkBtn=document.getElementById('ppRunBenchmark');if(benchmarkBtn)benchmarkBtn.onclick=async()=>{benchmarkBtn.disabled=true;try{await ppControlledBenchmark()}catch(e){const n=document.getElementById('ppBenchmarkNote');if(n)n.textContent=String(e?.message||e)}finally{benchmarkBtn.disabled=false}};
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('ppPanel');if(p)try{flApplyBilingualText(p)}catch{};ppUpdateUi()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&typeof fvState!=='undefined')fvState.prefetchSeq++;ppUpdateUi()});
  window.FoamLensPerformance={stats:ppStats,refresh:ppUpdateUi,isViewportVisible:ppViewportVisible,runControlledBenchmark:ppControlledBenchmark,getLastBenchmark:()=>ppState.lastBenchmark}
}
ppInstall();
