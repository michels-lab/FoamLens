/* FoamLens Desktop v1.3.0 — numerical performance and raw OpenFOAM run-log analysis. */

/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_START */
function npNum(v){const n=Number(v);return Number.isFinite(n)?n:NaN}
function npMatchNumber(s){const m=String(s||'').match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/);return m?Number(m[0]):NaN}
function npParseResidualLine(line){
  const s=String(line||'');
  const m=s.match(/^\s*([^:]+):\s*Solving for\s+([^,]+),\s*Initial residual\s*=\s*([^,]+),\s*Final residual\s*=\s*([^,]+),\s*No Iterations\s+([^\s,]+)/i);
  if(!m)return null;
  const initial=npMatchNumber(m[3]),final=npMatchNumber(m[4]),iterations=npMatchNumber(m[5]);
  if(!Number.isFinite(initial)||!Number.isFinite(final))return null;
  return{solver:m[1].trim(),equation:m[2].trim(),initialResidual:initial,finalResidual:final,iterations:Number.isFinite(iterations)?iterations:NaN}
}
function npParseCourantLine(line){
  const s=String(line||'');
  let m=s.match(/Courant\s+Number\s+mean\s*:\s*([^\s,]+)\s+max\s*:\s*([^\s,]+)/i);
  if(m)return{mean:npMatchNumber(m[1]),max:npMatchNumber(m[2])};
  m=s.match(/Courant.*?mean\s*=\s*([^\s,]+).*?max\s*=\s*([^\s,]+)/i);
  return m?{mean:npMatchNumber(m[1]),max:npMatchNumber(m[2])}:null
}
function npParseContinuityLine(line){
  const s=String(line||''),m=s.match(/continuity errors\s*:\s*sum local\s*=\s*([^,]+),\s*global\s*=\s*([^,]+),\s*cumulative\s*=\s*([^\s,]+)/i);
  if(!m)return null;return{local:npMatchNumber(m[1]),global:npMatchNumber(m[2]),cumulative:npMatchNumber(m[3])}
}
function npParseTimingLine(line){
  const s=String(line||''),m=s.match(/ExecutionTime\s*=\s*([^\s]+)\s*s(?:ec(?:onds?)?)?\s+ClockTime\s*=\s*([^\s]+)\s*s/i);
  if(!m)return null;return{executionTime:npMatchNumber(m[1]),clockTime:npMatchNumber(m[2])}
}
function npParseDeltaTLine(line){const m=String(line||'').match(/^\s*deltaT\s*=\s*([^\s;]+)/i);return m?npMatchNumber(m[1]):NaN}
function npParseCouplingIteration(line){
  const s=String(line||'');
  let m=s.match(/\b(PIMPLE|SIMPLE|PISO)\s*:\s*(?:iteration|Iteration)\s*(\d+)/i);
  if(m)return{algorithm:m[1].toUpperCase(),iteration:Number(m[2]),converged:false};
  m=s.match(/\b(PIMPLE|SIMPLE|PISO)(?:\s+solution)?\s+converged\s+in\s+(\d+)\s+iterations?/i);
  if(m)return{algorithm:m[1].toUpperCase(),iteration:Number(m[2]),converged:true};
  return null
}
function npParseCorrectorLine(line){
  const s=String(line||'');let m=s.match(/\b(PIMPLE|SIMPLE|PISO)\s*:\s*(?:pressure\s+)?corrector(?:\s+iteration)?\s*[:=]?\s*(\d+)/i);
  if(m)return{algorithm:m[1].toUpperCase(),corrector:Number(m[2])};
  m=s.match(/\bpressure\s+corrector(?:\s+iteration)?\s*[:=]?\s*(\d+)/i);
  return m?{algorithm:'',corrector:Number(m[1])}:null
}
function npParseTerminationLine(line){
  const s=String(line||'').trim();if(/^End\s*$/i.test(s))return{status:'completed',message:s};
  if(/FOAM FATAL ERROR|FOAM FATAL IO ERROR|Floating point exception|segmentation fault/i.test(s))return{status:'failed',message:s};
  return null
}
function npClassifyEvent(line){
  const s=String(line||'').trim();if(!s)return null;
  if(/FOAM FATAL ERROR|FOAM FATAL IO ERROR|Floating point exception|segmentation fault/i.test(s))return{severity:'error',message:s};
  if(/FOAM Warning|\bwarning\b/i.test(s))return{severity:'warning',message:s};
  return null
}
function npParseRunLog(text){
  const lines=String(text||'').split(/\r?\n/),steps=[],equations=[],continuity=[],coupling=[],correctors=[],events=[];
  let current=null,pendingDeltaT=NaN,outerIteration=null,couplingAlgorithm='',application='',termination={status:'incomplete',line:null,message:''};
  const ensureStep=(time=NaN)=>{if(current)return current;current={index:steps.length,time,deltaT:Number.isFinite(pendingDeltaT)?pendingDeltaT:NaN,courantMean:NaN,courantMax:NaN,executionTime:NaN,clockTime:NaN};pendingDeltaT=NaN;steps.push(current);return current};
  for(let li=0;li<lines.length;li++){
    const line=lines[li];
    const app=line.match(/^\s*(?:Application|Exec)\s*[:=]\s*([^\s]+)/i);if(app&&!application)application=app[1];
    const tm=line.match(/^\s*Time\s*=\s*([-+\deE.]+)/);if(tm){const t=npMatchNumber(tm[1]);current={index:steps.length,time:t,deltaT:Number.isFinite(pendingDeltaT)?pendingDeltaT:NaN,courantMean:NaN,courantMax:NaN,executionTime:NaN,clockTime:NaN};pendingDeltaT=NaN;steps.push(current);outerIteration=null;couplingAlgorithm='';continue}
    const dt=npParseDeltaTLine(line);if(Number.isFinite(dt)){pendingDeltaT=dt;continue}
    const co=npParseCourantLine(line);if(co){const st=ensureStep();st.courantMean=co.mean;st.courantMax=co.max;continue}
    const ci=npParseCouplingIteration(line);if(ci){const st=ensureStep();couplingAlgorithm=ci.algorithm;outerIteration=ci.iteration;coupling.push({time:st.time,timestepIndex:st.index,algorithm:ci.algorithm,outerIteration:ci.iteration,converged:ci.converged,line:li+1});continue}
    const cr=npParseCorrectorLine(line);if(cr){const st=ensureStep();correctors.push({time:st.time,timestepIndex:st.index,algorithm:cr.algorithm||couplingAlgorithm,outerIteration,corrector:cr.corrector,line:li+1});continue}
    const eq=npParseResidualLine(line);if(eq){const st=ensureStep();equations.push({...eq,time:st.time,timestepIndex:st.index,couplingAlgorithm,outerIteration,line:li+1});continue}
    const ce=npParseContinuityLine(line);if(ce){const st=ensureStep();continuity.push({...ce,time:st.time,timestepIndex:st.index,couplingAlgorithm,outerIteration,line:li+1});continue}
    const ti=npParseTimingLine(line);if(ti){const st=ensureStep();st.executionTime=ti.executionTime;st.clockTime=ti.clockTime;continue}
    const ev=npClassifyEvent(line);if(ev){const st=current;events.push({...ev,time:st?.time??NaN,timestepIndex:st?.index??-1,line:li+1});if(ev.severity==='error')termination={status:'failed',line:li+1,message:ev.message}}
    const term=npParseTerminationLine(line);if(term&&termination.status!=='failed')termination={...term,line:li+1}
  }
  return{application,steps,equations,continuity,coupling,correctors,events,termination}
}
function npFinite(a){return a.map(Number).filter(Number.isFinite)}
function npBasicStats(a){const v=npFinite(a);if(!v.length)return{count:0,min:NaN,max:NaN,mean:NaN,last:NaN};return{count:v.length,min:Math.min(...v),max:Math.max(...v),mean:v.reduce((s,x)=>s+x,0)/v.length,last:v.at(-1)}}
function npSummarizeRunLog(parsed){
  const p=parsed||{},steps=p.steps||[],eq=p.equations||[],events=p.events||[],times=npFinite(steps.map(s=>s.time)),dt=npBasicStats(steps.map(s=>s.deltaT)),coMean=npBasicStats(steps.map(s=>s.courantMean)),coMax=npBasicStats(steps.map(s=>s.courantMax)),iters=npBasicStats(eq.map(e=>e.iterations)),ri=npBasicStats(eq.map(e=>e.initialResidual)),rf=npBasicStats(eq.map(e=>e.finalResidual));
  return{application:p.application||'',timesteps:steps.length,timeStart:times.length?Math.min(...times):NaN,timeEnd:times.length?Math.max(...times):NaN,deltaT:dt,courantMean:coMean,courantMax:coMax,linearSolves:eq.length,linearIterations:iters,initialResidual:ri,finalResidual:rf,couplingRecords:(p.coupling||[]).length,correctorRecords:(p.correctors||[]).length,continuityRecords:(p.continuity||[]).length,terminationStatus:p.termination?.status||'incomplete',warnings:events.filter(e=>e.severity==='warning').length,errors:events.filter(e=>e.severity==='error').length}
}
function npAxisData(series,mode='physicalTime'){
  const y=Array.isArray(series?.y)?series.y:[],t=Array.isArray(series?.t)?series.t:[],x=[],out=[];
  for(let i=0;i<y.length;i++){const vy=Number(y[i]);if(!Number.isFinite(vy))continue;const xv=mode==='timestepIndex'?i:Number(t[i]);if(Number.isFinite(xv)){x.push(xv);out.push(vy)}}
  return{x,y:out,mode:mode==='timestepIndex'?'timestepIndex':'physicalTime'}
}
/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_END */

function npExtraRunLogSeries(parsed,file){
  const sourcePath=(file?.webkitRelativePath||file?.name||''),logsPath=sourcePath.replace(/\/[^/]*$/,''),caseName=typeof inferCase==='function'?inferCase(file):'';
  const out=[],add=(family,root,metric,display,unit,points)=>{
    const p=points.filter(q=>Number.isFinite(q.t)&&Number.isFinite(q.y));if(!p.length)return;
    out.push({id:nextId++,datasetType:'log',caseName,fileName:file?.name||'',sourcePath,field:{canonical:'log:'+family,display,unit,quantity:metric,original:family},probe:null,location:'',logFamily:family,logRoot:root,logMetric:metric,logSubIter:0,logPath:logsPath,t:p.map(q=>q.t),y:p.map(q=>q.y),visible:true,color:null,width:1.8,dash:'solid',opacity:1,axis:'Auto',customLabel:'',rawRunLog:true,numericalPerformance:true})
  };
  add('deltaT','deltaT','deltaT','Physical timestep Δt','s',(parsed.steps||[]).map(s=>({t:s.time,y:s.deltaT})));
  const byStep=new Map();
  for(const q of parsed.coupling||[]){
    if(!Number.isFinite(q.time)||!Number.isFinite(q.outerIteration))continue;
    const key=String(q.timestepIndex)+'|'+String(q.algorithm||'coupling'),old=byStep.get(key);
    if(!old||q.outerIteration>old.y)byStep.set(key,{t:q.time,y:q.outerIteration,algorithm:q.algorithm||'coupling'})
  }
  const algorithms=[...new Set([...byStep.values()].map(q=>q.algorithm))];
  for(const algorithm of algorithms)add(algorithm+'OuterIterations',algorithm,'outerIterations',algorithm+' outer iterations','iterations',[...byStep.values()].filter(q=>q.algorithm===algorithm));
  const correctorByStep=new Map();
  for(const q of parsed.correctors||[]){if(!Number.isFinite(q.time)||!Number.isFinite(q.corrector))continue;const algorithm=q.algorithm||'pressure',key=String(q.timestepIndex)+'|'+algorithm,old=correctorByStep.get(key);if(!old||q.corrector>old.y)correctorByStep.set(key,{t:q.time,y:q.corrector,algorithm})}
  for(const algorithm of [...new Set([...correctorByStep.values()].map(q=>q.algorithm))])add(algorithm+'Correctors',algorithm,'correctors',algorithm+' correctors','iterations',[...correctorByStep.values()].filter(q=>q.algorithm===algorithm));
  return out
}
function npInstallRawRunLogExtension(){
  if(typeof parseOpenFOAMRunLogFile!=='function'||parseOpenFOAMRunLogFile.__foamLensNumericalExtended)return;
  const base=parseOpenFOAMRunLogFile;
  const extended=async function(file){
    const original=await base(file),text=await file.text(),parsed=npParseRunLog(text),extra=npExtraRunLogSeries(parsed,file);
    for(const s of original)s.numericalRunSummary=npSummarizeRunLog(parsed);
    return original.concat(extra)
  };
  extended.__foamLensNumericalExtended=true;parseOpenFOAMRunLogFile=extended
}
function npSeriesText(s){return [s?.name,s?.label,s?.logRoot,s?.logMetric,s?.field?.canonical,s?.field?.raw,s?.sourcePath].filter(Boolean).join(' ').toLowerCase()}
function npLogSeries(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{return datasetTypeOf(s)==='log'&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))}catch{return !!s?.logFamily}})}
function npCaseLabel(id){const c=(typeof cases!=='undefined'&&Array.isArray(cases))?cases.find(x=>String(x.id)===String(id)):null;return c?.name||('Case '+id)}
function npSeriesForCase(id){return npLogSeries().filter(s=>String(s.caseId)===String(id))}
function npMetricSeries(items,re){return items.filter(s=>re.test(npSeriesText(s)))}
function npSeriesValues(ss){const out=[];for(const s of ss)for(const v of (Array.isArray(s.y)?s.y:[])){const n=Number(v);if(Number.isFinite(n))out.push(n)}return out}
function npLastValue(ss){let best=null;for(const s of ss){for(let i=0;i<Math.min(s.t?.length||0,s.y?.length||0);i++){const t=Number(s.t[i]),y=Number(s.y[i]);if(Number.isFinite(t)&&Number.isFinite(y)&&(!best||t>best.t))best={t,y}}}return best?.y??NaN}
function npFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function npSummaryFromImportedSeries(caseId){
  const ss=npSeriesForCase(caseId),times=[...new Set(ss.flatMap(s=>(s.t||[]).map(Number).filter(Number.isFinite)))].sort((a,b)=>a-b);
  const dt=npBasicStats(npSeriesValues(npMetricSeries(ss,/\bdeltat\b|delta\s*t/)));
  const coMax=npBasicStats(npSeriesValues(npMetricSeries(ss,/max.*courant|courant.*max|maxco/)));
  const coMean=npBasicStats(npSeriesValues(npMetricSeries(ss,/mean.*courant|courant.*mean/)));
  const init=npBasicStats(npSeriesValues(npMetricSeries(ss,/initial.*residual|initialresidual/)));
  const final=npBasicStats(npSeriesValues(npMetricSeries(ss,/final.*residual|finalresidual/)));
  const iter=npBasicStats(npSeriesValues(npMetricSeries(ss,/iteration.*count|niterations|iterations/)));
  const correctors=npBasicStats(npSeriesValues(npMetricSeries(ss,/corrector/))),exec=npLastValue(npMetricSeries(ss,/execution\s*time|executiontime/)),clock=npLastValue(npMetricSeries(ss,/clock\s*time|clocktime/));
  const runSummary=ss.map(s=>s?.numericalRunSummary).find(Boolean);
  return{series:ss.length,timesteps:times.length,timeStart:times[0]??NaN,timeEnd:times.at(-1)??NaN,deltaT:dt,courantMax:coMax,courantMean:coMean,initialResidual:init,finalResidual:final,iterations:iter,correctors,terminationStatus:runSummary?.terminationStatus||'unavailable',executionTime:exec,clockTime:clock}
}
function npBuildUi(){
  if(document.getElementById('npTools'))return;
  const host=document.getElementById('generalAnalysisModules')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='npTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b data-fl-en="Numerical Performance" data-fl-es="Rendimiento numérico">Numerical Performance</b><span class="badge" data-fl-en="solver logs" data-fl-es="logs del solver">solver logs</span></div>
  <div class="smallnote" style="margin-top:5px" data-fl-en="Physical results and numerical cost are reported separately. Linear-solver residuals are not treated as nonlinear/PIMPLE convergence." data-fl-es="Los resultados físicos y el costo numérico se reportan por separado. Los residuales del solver lineal no se tratan como convergencia no lineal/PIMPLE.">Physical results and numerical cost are reported separately.</div>
  <div class="field" style="margin-top:8px"><label data-fl-en="Case" data-fl-es="Caso">Case</label><select id="npCase"></select></div>
  <button class="btn primary" id="npRefresh" type="button" data-fl-en="Analyze available log metrics" data-fl-es="Analizar métricas disponibles de logs">Analyze available log metrics</button>
  <div class="smallnote" id="npStatus" style="margin-top:7px"></div><div id="npResult" style="margin-top:8px"></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b data-fl-en="Numerical metric plot" data-fl-es="Gráfica de métrica numérica">Numerical metric plot</b>
  <div class="field"><label data-fl-en="Equation / metric" data-fl-es="Ecuación / métrica">Equation / metric</label><select id="npMetric"></select></div>
  <div class="field"><label data-fl-en="X axis" data-fl-es="Eje X">X axis</label><select id="npXAxis"><option value="physicalTime" selected data-fl-en="Physical time [s]" data-fl-es="Tiempo físico [s]">Physical time [s]</option><option value="timestepIndex" data-fl-en="Timestep index" data-fl-es="Índice de timestep">Timestep index</option></select></div>
  <canvas id="npChart" style="width:100%;height:210px;margin-top:6px"></canvas>
  <div class="smallnote" id="npChartStatus"></div>`;
  host.appendChild(box);flApplyBilingualText(box);document.getElementById('npCase').addEventListener('change',()=>{npRefreshMetricOptions();npRender()});document.getElementById('npRefresh').addEventListener('click',()=>{npRender();npDrawMetric()});document.getElementById('npMetric').addEventListener('change',npDrawMetric);document.getElementById('npXAxis').addEventListener('change',npDrawMetric);npRefreshCases()
}
function npRefreshCases(){
  const sel=document.getElementById('npCase');if(!sel)return;const old=sel.value,ids=[...new Set(npLogSeries().map(s=>s.caseId).filter(x=>x!=null))],box=document.getElementById('npTools');if(box)box.style.display='';try{refreshGeneralAnalysisHost()}catch{}
  sel.innerHTML=ids.length?ids.map(id=>`<option value="${String(id).replace(/"/g,'&quot;')}">${String(npCaseLabel(id)).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join(''):'<option value="">—</option>';
  if([...sel.options].some(o=>o.value===old))sel.value=old;
  if(!ids.length){flSetIssue('npStatus','no solver logs',{analysis:'Numerical Performance'});flSetIssue('npChartStatus','no solver logs',{analysis:'Numerical Performance'});const out=document.getElementById('npResult');if(out)out.innerHTML='';return}
  flClearIssue('npStatus');npRefreshMetricOptions();npRender()
}
function npMetricLabel(s){return String(s?.field?.display||s?.field?.canonical||s?.name||s?.logFamily||'Metric')+(Number.isFinite(Number(s?.logSubIter))?' · #'+s.logSubIter:'')}
function npRefreshMetricOptions(){
  const caseId=document.getElementById('npCase')?.value,sel=document.getElementById('npMetric');if(!sel)return;const old=sel.value,ss=npSeriesForCase(caseId);sel.innerHTML=ss.map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${npMetricLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old;npDrawMetric()
}
function npSelectedMetric(){const id=document.getElementById('npMetric')?.value,ss=npSeriesForCase(document.getElementById('npCase')?.value);return ss.find((s,i)=>String(s.id??i)===String(id))}
function npDrawMetric(){
  const s=npSelectedMetric(),cv=document.getElementById('npChart'),st=document.getElementById('npChartStatus');if(!cv||!st)return;
  if(!s){flSetIssue(st,'selection-missing',{analysis:'Numerical Performance',expected:'Choose a detected solver-log metric'});return}
  const mode=document.getElementById('npXAxis')?.value||'physicalTime',d=npAxisData(s,mode);
  if(d.x.length<2){flSetIssue(st,'insufficient-samples',{analysis:'Numerical Performance',field:npMetricLabel(s)});return}
  flClearIssue(st);
  const rect=cv.getBoundingClientRect(),W=Math.max(260,Math.round(rect.width||360)),H=210,dpr=Math.max(1,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  let xmin=Math.min(...d.x),xmax=Math.max(...d.x),ymin=Math.min(...d.y),ymax=Math.max(...d.y);if(xmax===xmin){xmin-=.5;xmax+=.5}if(ymax===ymin){ymin-=.5;ymax+=.5}
  const L=45,R=10,T=12,B=30,pw=W-L-R,ph=H-T-B,dark=document.body.classList.contains('dark'),fg=dark?'#b9c7d4':'#46586a',grid=dark?'#263442':'#dce4eb';ctx.strokeStyle=grid;ctx.strokeRect(L,T,pw,ph);ctx.strokeStyle=fg;ctx.beginPath();
  d.x.forEach((x,i)=>{const px=L+(x-xmin)/(xmax-xmin)*pw,py=T+ph-(d.y[i]-ymin)/(ymax-ymin)*ph;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();ctx.fillStyle=fg;ctx.font='9px Segoe UI,Arial';ctx.fillText(mode==='timestepIndex'?flUi('Timestep index','Índice de timestep'):flUi('Physical time [s]','Tiempo físico [s]'),L,T+ph+18);
  st.textContent=diagEs()?`${npMetricLabel(s)} · ${d.x.length} muestras · X = ${mode==='timestepIndex'?'índice de timestep':'tiempo físico'}.`:`${npMetricLabel(s)} · ${d.x.length} samples · X = ${mode==='timestepIndex'?'timestep index':'physical time'}.`
}
function npRender(){
  const id=document.getElementById('npCase')?.value,status=document.getElementById('npStatus'),out=document.getElementById('npResult');if(!out)return;
  if(id==null||id===''){out.innerHTML='';flSetIssue(status,'no solver logs',{analysis:'Numerical Performance'});return}
  flClearIssue(status);const s=npSummaryFromImportedSeries(id);if(status)status.textContent=diagEs()?`${s.series} series de log · ${s.timesteps} muestras de tiempo físico. Las métricas ausentes permanecen no disponibles; FoamLens no inventa valores.`:`${s.series} log series · ${s.timesteps} physical-time samples. Missing metrics remain unavailable; FoamLens does not invent values.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>${flUi('Physical time','Tiempo físico')}</th><td>${npFmt(s.timeStart)}–${npFmt(s.timeEnd)} s</td><th>${flUi('Samples','Muestras')}</th><td>${s.timesteps}</td></tr>
  <tr><th>${flUi('Δt mean / range','Δt media / rango')}</th><td>${npFmt(s.deltaT.mean)} / ${npFmt(s.deltaT.min)}–${npFmt(s.deltaT.max)}</td><th>${flUi('Max Courant','Courant máximo')}</th><td>${npFmt(s.courantMax.max)}</td></tr>
  <tr><th>${flUi('Mean Courant','Courant medio')}</th><td>${npFmt(s.courantMean.mean)}</td><th>${flUi('Linear iterations mean / max','Iteraciones lineales media / máx.')}</th><td>${npFmt(s.iterations.mean)} / ${npFmt(s.iterations.max)}</td></tr>
  <tr><th>${flUi('Initial residual max','Residual inicial máximo')}</th><td>${npFmt(s.initialResidual.max)}</td><th>${flUi('Final residual max','Residual final máximo')}</th><td>${npFmt(s.finalResidual.max)}</td></tr>
  <tr><th>${flUi('Correctors mean / max','Correctores media / máx.')}</th><td>${npFmt(s.correctors.mean)} / ${npFmt(s.correctors.max)}</td><th>${flUi('Run termination','Terminación de ejecución')}</th><td>${s.terminationStatus==='completed'?flUi('Completed','Completada'):s.terminationStatus==='failed'?flUi('Failed','Fallida'):s.terminationStatus==='incomplete'?flUi('Incomplete','Incompleta'):flUi('Unavailable','No disponible')}</td></tr>
  <tr><th>${flUi('Execution time','Tiempo de ejecución')}</th><td>${npFmt(s.executionTime)} s</td><th>${flUi('Clock time','Tiempo de reloj')}</th><td>${npFmt(s.clockTime)} s</td></tr>
  </tbody></table></div>
  <div class="smallnote" style="margin-top:6px">${flUi('Residual statistics above describe linear equation solves only. PIMPLE/SIMPLE coupling must be interpreted from its own outer-iteration records.','Las estadísticas de residuales anteriores describen únicamente soluciones de ecuaciones lineales. El acoplamiento PIMPLE/SIMPLE debe interpretarse a partir de sus propios registros de iteración externa.')}</div>`
}
function npInit(){
  npInstallRawRunLogExtension();
  npBuildUi();
  try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(npRefreshCases,0);return x}}catch{}
  document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('npTools');if(box)flApplyBilingualText(box);npRender();npDrawMetric()});
  window.FoamLensNumericalPerformance={npParseResidualLine,npParseCourantLine,npParseContinuityLine,npParseTimingLine,npParseDeltaTLine,npParseCouplingIteration,npParseCorrectorLine,npParseTerminationLine,npParseRunLog,npSummarizeRunLog,npAxisData};
}
npInit();
