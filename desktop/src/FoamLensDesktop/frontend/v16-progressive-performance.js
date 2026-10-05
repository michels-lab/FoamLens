/* FoamLens Desktop v1.4.9 — progressive rendering, viewport-aware work and adaptive prefetch telemetry. */
const ppState={loads:0,totalMs:0,lastMs:0,lastIndex:null,lastDirection:1,prefetchHits:0,prefetchMisses:0,prefetched:new Set(),meshReuses:0,meshBuilds:0,deferredViews:0,lastPrefetch:[],mode:'optimized',benchmarking:false,lastBenchmark:null};
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
  return{mode:ppState.mode,benchmarking:ppState.benchmarking,loads:ppState.loads,lastMs:ppState.lastMs,avgMs:avg,prefetchHits:ppState.prefetchHits,prefetchMisses:ppState.prefetchMisses,hitRate:(ppState.prefetchHits+ppState.prefetchMisses)?ppState.prefetchHits/(ppState.prefetchHits+ppState.prefetchMisses):0,meshReuses:ppState.meshReuses,meshBuilds:ppState.meshBuilds,deferredViews:ppState.deferredViews,lastPrefetch:ppState.lastPrefetch.slice(),cache,lastBenchmark:ppState.lastBenchmark}
}
function ppMode(){return ppState.mode}
function ppSetMode(mode){
  ppState.mode=String(mode)==='baseline'?'baseline':'optimized';if(typeof fvState!=='undefined')fvState.prefetchSeq++;ppState.prefetched.clear();ppState.lastPrefetch=[];ppUpdateUi();return ppState.mode
}
function ppResetPassTelemetry(){
  ppState.loads=0;ppState.totalMs=0;ppState.lastMs=0;ppState.lastIndex=null;ppState.lastDirection=1;ppState.prefetchHits=0;ppState.prefetchMisses=0;ppState.prefetched.clear();ppState.meshReuses=0;ppState.meshBuilds=0;ppState.deferredViews=0;ppState.lastPrefetch=[]
}
function ppClearRuntimeCache(){
  if(typeof pmClearFieldCache==='function')pmClearFieldCache();if(typeof fvState!=='undefined'){fvState.fieldInflight?.clear?.();fvState.prefetchSeq++}ppState.prefetched.clear()
}
function ppSampleStats(values){
  const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return{count:0,mean:NaN,median:NaN,p95:NaN,min:NaN,max:NaN};
  const q=p=>{const i=Math.max(0,Math.min(a.length-1,Math.ceil(p*a.length)-1));return a[i]},mean=a.reduce((x,y)=>x+y,0)/a.length,mid=Math.floor(a.length/2),median=a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
  return{count:a.length,mean,median,p95:q(.95),min:a[0],max:a.at(-1)}
}
function ppBenchmarkSequence(frameCount=4){
  const g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null,times=(g?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),slider=document.getElementById('fvTimeSlider'),current=Math.max(0,Math.min(times.length-1,Math.round(Number(slider?.value)||0))),n=Math.max(2,Math.min(times.length,Math.round(Number(frameCount)||4)));
  if(times.length<n)return{times,indices:[]};const start=Math.max(0,Math.min(current,times.length-n)),indices=Array.from({length:n},(_,i)=>start+i);return{times,indices}
}
async function ppRunBenchmark(options={}){
  if(ppState.benchmarking)throw new Error(ppUi('A performance benchmark is already running.','Ya hay un benchmark de rendimiento en curso.'));
  const frames=Math.max(2,Math.min(8,Math.round(Number(options.frames)||4))),rounds=Math.max(1,Math.min(3,Math.round(Number(options.rounds)||2))),settleMs=Math.max(0,Math.min(1000,Math.round(Number(options.settleMs)||160))),seq=ppBenchmarkSequence(frames);
  if(seq.indices.length<2)throw new Error(ppUi('At least two stored field times are required for the A/B benchmark.','Se requieren al menos dos tiempos almacenados para el benchmark A/B.'));
  const originalMode=ppState.mode,originalIndex=Math.max(0,Math.round(Number(document.getElementById('fvTimeSlider')?.value)||0)),samples={baseline:[],optimized:[]},passes=[];
  ppState.benchmarking=true;const status=document.getElementById('ppBenchmarkStatus');if(status)status.textContent=ppUi('Running controlled A/B benchmark…','Ejecutando benchmark A/B controlado…');
  try{
    for(let round=0;round<rounds;round++){
      const order=round%2===0?['baseline','optimized']:['optimized','baseline'];
      for(const mode of order){
        ppSetMode(mode);ppClearRuntimeCache();ppResetPassTelemetry();const pass=[];
        for(const index of seq.indices){
          const start=performance.now();await fvLoadFrame(index,{resetCamera:false});const ms=performance.now()-start;pass.push(ms);samples[mode].push(ms);if(settleMs)await new Promise(r=>setTimeout(r,settleMs))
        }
        passes.push({round:round+1,mode,indices:seq.indices.slice(),times:seq.indices.map(i=>seq.times[i]),samplesMs:pass,telemetry:{...ppStats(),lastBenchmark:null}})
      }
    }
    const baseline=ppSampleStats(samples.baseline),optimized=ppSampleStats(samples.optimized),speedupFactor=baseline.mean/optimized.mean,percentChange=100*(baseline.mean-optimized.mean)/baseline.mean;
    const report={schema:'foamlens-performance-ab-v1',frames:seq.indices.length,rounds,settleMs,sequenceIndices:seq.indices.slice(),sequenceTimes:seq.indices.map(i=>seq.times[i]),baseline,optimized,speedupFactor,percentChange,passes,finite:[baseline.mean,baseline.median,baseline.p95,optimized.mean,optimized.median,optimized.p95,speedupFactor,percentChange].every(Number.isFinite)};
    ppState.lastBenchmark=report;if(status)status.textContent=ppUi('A/B result: ','Resultado A/B: ')+baseline.mean.toFixed(1)+' ms → '+optimized.mean.toFixed(1)+' ms · '+(Number.isFinite(percentChange)?percentChange.toFixed(1):'—')+'%';return report
  }finally{
    ppClearRuntimeCache();ppSetMode(originalMode);ppState.benchmarking=false;try{await fvLoadFrame(originalIndex,{resetCamera:false})}catch{}ppUpdateUi()
  }
}
function ppUpdateUi(){
  const e=document.getElementById('ppTelemetry');if(!e)return;const s=ppStats(),mb=Number(s.cache.bytes||0)/1048576,lim=Number(s.cache.limit||0)/1048576;
  e.innerHTML='<div><span>'+ppUi('Last frame','Último frame')+'</span><b>'+s.lastMs.toFixed(0)+' ms</b></div><div><span>'+ppUi('Average','Promedio')+'</span><b>'+s.avgMs.toFixed(0)+' ms</b></div><div><span>'+ppUi('Prefetch hit rate','Acierto prefetch')+'</span><b>'+(100*s.hitRate).toFixed(0)+'%</b></div><div><span>'+ppUi('Mesh reuse','Reuso de malla')+'</span><b>'+s.meshReuses+' / '+(s.meshReuses+s.meshBuilds)+'</b></div><div><span>'+ppUi('Field cache','Caché de campos')+'</span><b>'+mb.toFixed(1)+' / '+lim.toFixed(0)+' MB</b></div><div><span>'+ppUi('Deferred views','Vistas diferidas')+'</span><b>'+s.deferredViews+'</b></div>';
  const note=document.getElementById('ppPrefetchNote');if(note)note.textContent=s.lastPrefetch.length?ppUi('Adaptive prefetch: ','Prefetch adaptativo: ')+s.lastPrefetch.join(', '):ppUi('Adaptive prefetch waits for navigation direction.','El prefetch adaptativo espera la dirección de navegación.')
}
function ppInstallUi(){
  if(document.getElementById('ppPanel'))return;const controls=document.getElementById('fieldViewControls'),anchor=document.getElementById('fcPanel')||controls?.lastElementChild;if(!controls)return;
  const box=document.createElement('details');box.className='analysisExt';box.id='ppPanel';box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Performance / cache" data-fl-es="Rendimiento / caché">Performance / cache</strong><span class="badge" data-fl-en="Adaptive" data-fl-es="Adaptativo">Adaptive</span></summary><div class="extSectionBody"><div class="fcStatsCells" id="ppTelemetry"></div><div class="smallnote" id="ppPrefetchNote" style="margin-top:7px"></div><div class="fcExtraActions" style="margin-top:8px"><button class="btn" id="ppRunBenchmark" type="button" data-fl-en="Run A/B benchmark" data-fl-es="Ejecutar benchmark A/B">Run A/B benchmark</button></div><div class="smallnote" id="ppBenchmarkStatus" style="margin-top:7px" data-fl-en="Baseline and optimized modes use the same frames and a cleared FoamLens field cache." data-fl-es="Los modos baseline y optimizado usan los mismos frames y limpian la caché de campos de FoamLens.">Baseline and optimized modes use the same frames and a cleared FoamLens field cache.</div><div class="smallnote" style="margin-top:5px" data-fl-en="Surface + legend are presented first; Slice / Iso / Streamlines continue after the browser can paint. Off-screen comparison views are deferred outside video export." data-fl-es="Superficie + leyenda se muestran primero; Slice / Iso / Streamlines continúan después de que el navegador puede pintar. Las vistas comparativas fuera de pantalla se difieren excepto durante exportación de video.">Surface + legend are presented first; Slice / Iso / Streamlines continue after the browser can paint. Off-screen comparison views are deferred outside video export.</div></div>';
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
    const seq=++fvState.prefetchSeq;if(ppState.mode==='baseline'||!ppFieldVisible()){ppState.lastPrefetch=[];ppUpdateUi();return}
    const avg=ppState.loads?ppState.totalMs/ppState.loads:0,ahead=avg>700?4:avg>250?3:2,behind=1,order=[];
    for(let d=1;d<=ahead;d++)order.push(index+ppState.lastDirection*d);for(let d=1;d<=behind;d++)order.push(index-ppState.lastDirection*d);
    const unique=[...new Set(order)].filter(i=>i>=0&&i<times.length);ppState.lastPrefetch=unique.map(i=>(i+1)+'/'+times.length);ppUpdateUi();
    ppIdle(async()=>{for(const i of unique){if(seq!==fvState.prefetchSeq||!ppFieldVisible())return;const key=fvFieldCacheKey(c.id,g.name,times[i],region);try{await fvLoadFieldSetCached(c.id,g.name,times[i],region);ppState.prefetched.add(key);ppUpdateUi()}catch{}await new Promise(r=>setTimeout(r,0))}},220)
  };fvSchedulePrefetch.__ppPatched=true
}
function ppInstallViewportAwareCompare(){
  if(typeof fcRefreshExtras!=='function'||fcRefreshExtras.__ppPatched)return;const previous=fcRefreshExtras;
  fcRefreshExtras=async function(){
    const video=typeof vaState!=='undefined'&&!!vaState.exporting;if(ppState.mode==='baseline'||video||typeof fcExtraViews==='undefined')return previous.apply(this,arguments);
    const visible=[],deferred=[];for(const state of fcExtraViews){const el=fcExtraDom(state.id,'Viewport');(ppViewportVisible(el)?visible:deferred).push(state)}
    if(visible.length)await Promise.all(visible.map(state=>fcExtraRefreshFrame(state)));ppState.deferredViews=deferred.length;ppUpdateUi();
    if(deferred.length)ppIdle(async()=>{for(const state of deferred){if(!fcState?.enabled)return;await fcExtraRefreshFrame(state);await new Promise(r=>setTimeout(r,0))}ppState.deferredViews=0;ppUpdateUi()},320)
  };fcRefreshExtras.__ppPatched=true
}
function ppInstall(){
  ppInstallUi();ppInstallAdaptivePrefetch();ppInstallViewportAwareCompare();ppInstallFrameTelemetry();
  const run=document.getElementById('ppRunBenchmark');if(run)run.onclick=async()=>{run.disabled=true;try{await ppRunBenchmark({frames:4,rounds:2,settleMs:160})}catch(e){const status=document.getElementById('ppBenchmarkStatus');if(status){status.textContent=String(e?.message||e);status.classList.add('error')}}finally{run.disabled=false}};
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('ppPanel');if(p)try{flApplyBilingualText(p)}catch{};ppUpdateUi()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&typeof fvState!=='undefined')fvState.prefetchSeq++;ppUpdateUi()});
  window.FoamLensPerformance={stats:ppStats,refresh:ppUpdateUi,isViewportVisible:ppViewportVisible,mode:ppMode,setMode:ppSetMode,runBenchmark:ppRunBenchmark,getLastBenchmark:()=>ppState.lastBenchmark}
}
ppInstall();
