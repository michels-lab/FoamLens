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
function npClassifyEvent(line){
  const s=String(line||'').trim();if(!s)return null;
  if(/FOAM FATAL ERROR|FOAM FATAL IO ERROR|Floating point exception|segmentation fault/i.test(s))return{severity:'error',message:s};
  if(/FOAM Warning|\bwarning\b/i.test(s))return{severity:'warning',message:s};
  return null
}
function npParseRunLog(text){
  const lines=String(text||'').split(/\r?\n/),steps=[],equations=[],continuity=[],coupling=[],events=[];
  let current=null,pendingDeltaT=NaN,outerIteration=null,couplingAlgorithm='',application='';
  const ensureStep=(time=NaN)=>{if(current)return current;current={index:steps.length,time,deltaT:Number.isFinite(pendingDeltaT)?pendingDeltaT:NaN,courantMean:NaN,courantMax:NaN,executionTime:NaN,clockTime:NaN};pendingDeltaT=NaN;steps.push(current);return current};
  for(let li=0;li<lines.length;li++){
    const line=lines[li];
    const app=line.match(/^\s*(?:Application|Exec)\s*[:=]\s*([^\s]+)/i);if(app&&!application)application=app[1];
    const tm=line.match(/^\s*Time\s*=\s*([-+\deE.]+)/);if(tm){const t=npMatchNumber(tm[1]);current={index:steps.length,time:t,deltaT:Number.isFinite(pendingDeltaT)?pendingDeltaT:NaN,courantMean:NaN,courantMax:NaN,executionTime:NaN,clockTime:NaN};pendingDeltaT=NaN;steps.push(current);outerIteration=null;couplingAlgorithm='';continue}
    const dt=npParseDeltaTLine(line);if(Number.isFinite(dt)){pendingDeltaT=dt;continue}
    const co=npParseCourantLine(line);if(co){const st=ensureStep();st.courantMean=co.mean;st.courantMax=co.max;continue}
    const ci=npParseCouplingIteration(line);if(ci){const st=ensureStep();couplingAlgorithm=ci.algorithm;outerIteration=ci.iteration;coupling.push({time:st.time,timestepIndex:st.index,algorithm:ci.algorithm,outerIteration:ci.iteration,converged:ci.converged,line:li+1});continue}
    const eq=npParseResidualLine(line);if(eq){const st=ensureStep();equations.push({...eq,time:st.time,timestepIndex:st.index,couplingAlgorithm,outerIteration,line:li+1});continue}
    const ce=npParseContinuityLine(line);if(ce){const st=ensureStep();continuity.push({...ce,time:st.time,timestepIndex:st.index,couplingAlgorithm,outerIteration,line:li+1});continue}
    const ti=npParseTimingLine(line);if(ti){const st=ensureStep();st.executionTime=ti.executionTime;st.clockTime=ti.clockTime;continue}
    const ev=npClassifyEvent(line);if(ev){const st=current;events.push({...ev,time:st?.time??NaN,timestepIndex:st?.index??-1,line:li+1})}
  }
  return{application,steps,equations,continuity,coupling,events}
}
function npFinite(a){return a.map(Number).filter(Number.isFinite)}
function npBasicStats(a){const v=npFinite(a);if(!v.length)return{count:0,min:NaN,max:NaN,mean:NaN,last:NaN};return{count:v.length,min:Math.min(...v),max:Math.max(...v),mean:v.reduce((s,x)=>s+x,0)/v.length,last:v.at(-1)}}
function npSummarizeRunLog(parsed){
  const p=parsed||{},steps=p.steps||[],eq=p.equations||[],events=p.events||[],times=npFinite(steps.map(s=>s.time)),dt=npBasicStats(steps.map(s=>s.deltaT)),coMean=npBasicStats(steps.map(s=>s.courantMean)),coMax=npBasicStats(steps.map(s=>s.courantMax)),iters=npBasicStats(eq.map(e=>e.iterations)),ri=npBasicStats(eq.map(e=>e.initialResidual)),rf=npBasicStats(eq.map(e=>e.finalResidual));
  return{application:p.application||'',timesteps:steps.length,timeStart:times.length?Math.min(...times):NaN,timeEnd:times.length?Math.max(...times):NaN,deltaT:dt,courantMean:coMean,courantMax:coMax,linearSolves:eq.length,linearIterations:iters,initialResidual:ri,finalResidual:rf,couplingRecords:(p.coupling||[]).length,continuityRecords:(p.continuity||[]).length,warnings:events.filter(e=>e.severity==='warning').length,errors:events.filter(e=>e.severity==='error').length}
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
function npLogSeries(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{return datasetTypeOf(s)==='log'}catch{return !!s?.logFamily}})}
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
  const exec=npLastValue(npMetricSeries(ss,/execution\s*time|executiontime/)),clock=npLastValue(npMetricSeries(ss,/clock\s*time|clocktime/));
  return{series:ss.length,timesteps:times.length,timeStart:times[0]??NaN,timeEnd:times.at(-1)??NaN,deltaT:dt,courantMax:coMax,courantMean:coMean,initialResidual:init,finalResidual:final,iterations:iter,executionTime:exec,clockTime:clock}
}
function npBuildUi(){
  if(document.getElementById('npTools'))return;
  const host=document.getElementById('differenceTools')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='npTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Numerical Performance</b><span class="badge">solver logs</span></div>
  <div class="smallnote" style="margin-top:5px">Physical results and numerical cost are reported separately. Linear-solver residuals are not treated as nonlinear/PIMPLE convergence.</div>
  <div class="field" style="margin-top:8px"><label>Case</label><select id="npCase"></select></div>
  <button class="btn primary" id="npRefresh" type="button">Analyze available log metrics</button>
  <div class="smallnote" id="npStatus" style="margin-top:7px"></div><div id="npResult" style="margin-top:8px"></div>`;
  host.appendChild(box);document.getElementById('npCase').addEventListener('change',npRender);document.getElementById('npRefresh').addEventListener('click',npRender);npRefreshCases()
}
function npRefreshCases(){
  const sel=document.getElementById('npCase');if(!sel)return;const old=sel.value,ids=[...new Set(npLogSeries().map(s=>s.caseId).filter(x=>x!=null))];
  sel.innerHTML=ids.map(id=>`<option value="${String(id).replace(/"/g,'&quot;')}">${String(npCaseLabel(id)).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
  if([...sel.options].some(o=>o.value===old))sel.value=old;npRender()
}
function npRender(){
  const id=document.getElementById('npCase')?.value,status=document.getElementById('npStatus'),out=document.getElementById('npResult');if(!out)return;
  if(id==null||id===''){out.innerHTML='';if(status)status.textContent='Load solver logs to analyze numerical performance.';return}
  const s=npSummaryFromImportedSeries(id);if(status)status.textContent=`${s.series} log series · ${s.timesteps} physical-time samples. Missing metrics remain unavailable; FoamLens does not invent values.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>Physical time</th><td>${npFmt(s.timeStart)}–${npFmt(s.timeEnd)} s</td><th>Samples</th><td>${s.timesteps}</td></tr>
  <tr><th>Δt mean / range</th><td>${npFmt(s.deltaT.mean)} / ${npFmt(s.deltaT.min)}–${npFmt(s.deltaT.max)}</td><th>Max Courant</th><td>${npFmt(s.courantMax.max)}</td></tr>
  <tr><th>Mean Courant</th><td>${npFmt(s.courantMean.mean)}</td><th>Linear iterations mean / max</th><td>${npFmt(s.iterations.mean)} / ${npFmt(s.iterations.max)}</td></tr>
  <tr><th>Initial residual max</th><td>${npFmt(s.initialResidual.max)}</td><th>Final residual max</th><td>${npFmt(s.finalResidual.max)}</td></tr>
  <tr><th>Execution time</th><td>${npFmt(s.executionTime)} s</td><th>Clock time</th><td>${npFmt(s.clockTime)} s</td></tr>
  </tbody></table></div>
  <div class="smallnote" style="margin-top:6px">Residual statistics above describe linear equation solves only. PIMPLE/SIMPLE coupling must be interpreted from its own outer-iteration records.</div>`
}
function npInit(){
  npInstallRawRunLogExtension();
  npBuildUi();
  try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(npRefreshCases,0);return x}}catch{}
  window.FoamLensNumericalPerformance={npParseResidualLine,npParseCourantLine,npParseContinuityLine,npParseTimingLine,npParseDeltaTLine,npParseCouplingIteration,npParseRunLog,npSummarizeRunLog};
}
npInit();
