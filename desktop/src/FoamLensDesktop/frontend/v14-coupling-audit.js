/* FoamLens Desktop v1.4.1 — formal linear/PIMPLE convergence audit. */

/* FOAMLENS_COUPLING_AUDIT_CORE_START */
function caFinite(values){return(values||[]).map(Number).filter(Number.isFinite)}
function caMedian(values){
  const a=caFinite(values).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2
}
function caPercentile(values,p){
  const a=caFinite(values).sort((x,y)=>x-y);if(!a.length)return NaN;p=Math.max(0,Math.min(1,Number(p)||0));const x=(a.length-1)*p,i=Math.floor(x),f=x-i;return i>=a.length-1?a.at(-1):a[i]+f*(a[i+1]-a[i])
}
function caLongestRun(items,predicate){
  let best=0,current=0,start=-1,bestStart=-1,bestEnd=-1;
  (items||[]).forEach((item,index)=>{
    if(predicate(item,index)){if(current===0)start=index;current++;if(current>best){best=current;bestStart=start;bestEnd=index}}
    else current=0
  });
  return{length:best,startIndex:bestStart,endIndex:bestEnd}
}
function caSummarizeLinearPairs(pairs){
  const valid=(pairs||[]).map(row=>{const initial=Number(row.initial),final=Number(row.final);return{...row,initial,final,Cp:Number.isFinite(initial)&&initial!==0&&Number.isFinite(final)?final/initial:NaN}}).filter(r=>Number.isFinite(r.Cp));
  const c=valid.map(r=>r.Cp),worse=valid.filter(r=>r.Cp>1);
  return{n:valid.length,medianCp:caMedian(c),p95Cp:caPercentile(c,.95),maxCp:c.length?Math.max(...c):NaN,fracCpGt1:valid.length?worse.length/valid.length:NaN,rows:valid}
}
function caSummarizeCouplingRows(rows,plateauThreshold=.9){
  plateauThreshold=Math.max(0,Number(plateauThreshold)||0);
  const valid=(rows||[]).filter(r=>Number.isFinite(Number(r.R))).map(r=>({...r,R:Number(r.R),t:Number(r.t)}));
  const ratios=valid.map(r=>r.R),worse=valid.filter(r=>r.R>1),plateau=valid.filter(r=>r.R<=1&&r.R>=plateauThreshold);
  const plateauRun=caLongestRun(valid,r=>r.R<=1&&r.R>=plateauThreshold),worseRun=caLongestRun(valid,r=>r.R>1);
  const withTimes=run=>run.length?{...run,startTime:valid[run.startIndex]?.t,endTime:valid[run.endIndex]?.t}:{...run,startTime:NaN,endTime:NaN};
  return{
    n:valid.length,medianR:caMedian(ratios),p95R:caPercentile(ratios,.95),maxR:ratios.length?Math.max(...ratios):NaN,
    fracRGt1:valid.length?worse.length/valid.length:NaN,fracPlateau:valid.length?plateau.length/valid.length:NaN,
    plateauThreshold,plateauRun:withTimes(plateauRun),worseningRun:withTimes(worseRun),rows:valid
  }
}
/* FOAMLENS_COUPLING_AUDIT_CORE_END */

function caUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(diagEs()?es:en)}catch{return en}}
function caFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:6}):'—'}
function caPct(v){return Number.isFinite(Number(v))?(100*Number(v)).toLocaleString(undefined,{maximumFractionDigits:2})+'%':'—'}
function caLinearPairs(caseId,root,startup=0){
  const initial=caseLogSeries(caseId,root,'initialResidual').slice().sort((a,b)=>Number(a.logSubIter)-Number(b.logSubIter));
  const finals=caseLogSeries(caseId,root,'finalResidual'),out=[];
  for(const ini of initial){
    const member=Number(ini.logSubIter),fin=finals.find(s=>Number(s.logSubIter)===member);if(!fin)continue;
    for(let i=0;i<(ini.t||[]).length;i++){
      const t=Number(ini.t[i]);if(!Number.isFinite(t)||t<startup)continue;
      const iv=Number(ini.y?.[i]),fv=fin.t?.[i]===ini.t[i]?Number(fin.y?.[i]):exactOrInterpolated(fin,t);
      if(Number.isFinite(iv)&&Number.isFinite(fv))out.push({t,member,initial:iv,final:fv})
    }
  }
  return out
}
function caAudit(caseId,root){
  const settings=diagSettings(),startup=Math.max(0,Number(settings.startup)||0),threshold=Math.max(0,Number(settings.ratioThreshold)||.9);
  const linear=caSummarizeLinearPairs(caLinearPairs(caseId,root,startup)),coupling=caSummarizeCouplingRows(couplingRows(caseId,root,false),threshold);
  return{caseId:Number(caseId),root,startup,linear,coupling,mapping:pressureMapping(caseId,root)}
}
function caRunText(run){
  if(!run?.length)return'—';const range=Number.isFinite(run.startTime)&&Number.isFinite(run.endTime)?` · ${caFmt(run.startTime)}–${caFmt(run.endTime)} s`:'';
  return`${run.length} ${caUi('consecutive timesteps','timesteps consecutivos')}${range}`
}
function caRender(){
  const host=document.getElementById('caAuditBody');if(!host)return;
  const id=diagCaseId(),root=diagRoot();if(id==null||!root){host.innerHTML='<div class="extInfo">—</div>';return}
  const a=caAudit(id,root),l=a.linear,c=a.coupling,mapping=a.mapping;
  host.innerHTML=`
    <div class="extNote">${caUi(
      'Cₚ = final residual / initial residual for the same linear solve. Rₚ,outer = last initial residual / first initial residual across the pressure-coupling cycle. These are reported separately.',
      'Cₚ = residual final / residual inicial del mismo solve lineal. Rₚ,outer = último residual inicial / primer residual inicial a través del ciclo de acoplamiento de presión. Se reportan por separado.'
    )}</div>
    <div class="extGrid5" style="margin-top:8px">
      <div class="extMetric"><span>${caUi('Linear solves','Solves lineales')}</span><b>${l.n}</b></div>
      <div class="extMetric"><span>median Cₚ</span><b>${caFmt(l.medianCp)}</b></div>
      <div class="extMetric"><span>P95 Cₚ</span><b>${caFmt(l.p95Cp)}</b></div>
      <div class="extMetric"><span>Cₚ &gt; 1</span><b>${caPct(l.fracCpGt1)}</b></div>
      <div class="extMetric"><span>max Cₚ</span><b>${caFmt(l.maxCp)}</b></div>
    </div>
    <div class="extGrid5" style="margin-top:7px">
      <div class="extMetric"><span>${caUi('Timesteps','Timesteps')}</span><b>${c.n}</b></div>
      <div class="extMetric"><span>median Rₚ,outer</span><b>${caFmt(c.medianR)}</b></div>
      <div class="extMetric"><span>P95 Rₚ,outer</span><b>${caFmt(c.p95R)}</b></div>
      <div class="extMetric"><span>Rₚ,outer &gt; 1</span><b>${caPct(c.fracRGt1)}</b></div>
      <div class="extMetric"><span>Rₚ,outer ≥ ${caFmt(c.plateauThreshold)}</span><b>${caPct(c.fracPlateau)}</b></div>
    </div>
    <div class="extInfo">
      <b>${caUi('Longest little-reduction run','Racha más larga de poca reducción')}:</b> ${caRunText(c.plateauRun)}<br>
      <b>${caUi('Longest worsening run','Racha más larga de empeoramiento')}:</b> ${caRunText(c.worseningRun)}<br>
      <span class="${mapping.known?'extGood':'extWarn'}">${mapping.known?caUi('PIMPLE mapping validated against fvSolution.','Mapeo PIMPLE validado contra fvSolution.'):caUi('PIMPLE mapping uncertain; ratios use raw first/last pressure-solve indices.','Mapeo PIMPLE incierto; las razones usan los índices raw del primer/último solve de presión.')}</span>
    </div>
    <div class="extNote">${caUi(
      'A ratio above 1 means the reported residual increased over that operation. FoamLens reports this evidence descriptively; it does not turn linear-solver residuals into a nonlinear convergence verdict.',
      'Una razón mayor que 1 significa que el residual reportado aumentó durante esa operación. FoamLens reporta esta evidencia de forma descriptiva; no convierte residuales del solver lineal en un veredicto de convergencia no lineal.'
    )}</div>
    <div class="extActions"><button class="btn tiny" type="button" id="caExport">${caUi('Export convergence audit JSON','Exportar auditoría de convergencia JSON')}</button></div>`;
  document.getElementById('caExport')?.addEventListener('click',()=>downloadText('FoamLens_convergence_audit.json',JSON.stringify({generatedBy:flBuildIdentity(),analysis:'linear-and-pimple-convergence-audit',...a},null,2),'application/json'))
}
function caInstallUi(){
  const parent=document.getElementById('couplingDiagnostics');if(!parent)return false;
  if(!document.getElementById('caAuditPanel')){
    const details=document.createElement('details');details.className='extSection';details.id='caAuditPanel';details.open=true;
    details.innerHTML='<summary><span data-fl-en="Thesis convergence audit" data-fl-es="Auditoría de convergencia para tesis">Thesis convergence audit</span><span class="badge">Cₚ / Rₚ,outer</span></summary><div class="extSectionBody" id="caAuditBody"></div>';
    parent.appendChild(details);try{flApplyBilingualText(details)}catch{}
  }
  caRender();return true
}
function caInstall(){
  caInstallUi();
  if(typeof refreshCouplingDiagnostics==='function'&&!refreshCouplingDiagnostics.__caPatched){
    const previous=refreshCouplingDiagnostics;refreshCouplingDiagnostics=function(){const x=previous.apply(this,arguments);caInstallUi();caRender();return x};refreshCouplingDiagnostics.__caPatched=true
  }
  for(const id of ['diagCase','diagRoot','diagStartup','diagRatioThreshold'])document.getElementById(id)?.addEventListener('change',caRender);
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('caAuditPanel');if(p)try{flApplyBilingualText(p)}catch{};caRender()});
  return true
}
caInstall();
window.FoamLensCouplingAudit={caFinite,caMedian,caPercentile,caLongestRun,caSummarizeLinearPairs,caSummarizeCouplingRows,caAudit};
