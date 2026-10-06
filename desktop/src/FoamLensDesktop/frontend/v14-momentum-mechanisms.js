/* FoamLens Desktop v1.4.1 — automatic momentum mechanism balance audit. */

/* FOAMLENS_MOMENTUM_MECHANISMS_CORE_START */
const MA_ROLE_ORDER=['darcyAcceleration','buoyancyAcceleration','pressureGradientAcceleration'];
const MA_ROLE_LABELS={
  darcyAcceleration:{en:'Darcy acceleration',es:'Aceleración Darcy'},
  buoyancyAcceleration:{en:'Buoyancy acceleration',es:'Aceleración de flotación'},
  pressureGradientAcceleration:{en:'Pressure-gradient acceleration',es:'Aceleración por gradiente de presión'}
};
function maFinite(values){return(values||[]).map(Number).filter(Number.isFinite)}
function maQuantile(values,q){
  const a=maFinite(values).sort((x,y)=>x-y);if(!a.length)return NaN;if(a.length===1)return a[0];
  const p=(a.length-1)*Math.max(0,Math.min(1,Number(q)||0)),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;
  return a[lo]+(a[hi]-a[lo])*f
}
function maMechanismFields(mapping,fieldNames=[]){
  const present=new Set((fieldNames||[]).map(String)),out=[];
  for(const role of MA_ROLE_ORDER){
    const field=String(mapping?.[role]||'');if(field&&(!present.size||present.has(field)))out.push({role,field,label:MA_ROLE_LABELS[role]})
  }
  return out
}
function maMechanismPairs(mechanisms){
  const byRole=new Map((mechanisms||[]).map(x=>[x.role,x])),defs=[
    ['darcyAcceleration','buoyancyAcceleration'],
    ['darcyAcceleration','pressureGradientAcceleration'],
    ['buoyancyAcceleration','pressureGradientAcceleration']
  ],out=[];
  for(const [a,b] of defs)if(byRole.has(a)&&byRole.has(b))out.push({a:byRole.get(a),b:byRole.get(b),key:a+'/'+b});
  return out
}
function maRatioSummary(ratios,total=null,invalid=0){
  const values=maFinite(ratios),n=values.length,denom=Number.isFinite(Number(total))?Math.max(0,Number(total)):n+Math.max(0,Number(invalid)||0);
  return{
    n,total:denom,invalid:Math.max(0,Number(invalid)||0),
    median:maQuantile(values,.5),p95:maQuantile(values,.95),max:n?Math.max(...values):NaN,
    fractionGt1:n?values.filter(v=>v>1).length/n:NaN,
    invalidFraction:denom?Math.max(0,Number(invalid)||0)/denom:NaN
  }
}
function maCloseTime(a,b){
  a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b))return false;
  return Math.abs(a-b)<=Math.max(1e-10,Math.max(Math.abs(a),Math.abs(b),1)*1e-9)
}
function maCommonTimes(timeArrays){
  const arrays=(timeArrays||[]).map(a=>[...new Set((a||[]).map(Number).filter(Number.isFinite))].sort((x,y)=>x-y)).filter(a=>a.length);
  if(!arrays.length)return[];
  return arrays[0].filter(t=>arrays.slice(1).every(a=>a.some(x=>maCloseTime(x,t))));
}
/* FOAMLENS_MOMENTUM_MECHANISMS_CORE_END */

function maUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(diagEs()?es:en)}catch{return en}}
function maEsc(v){try{return typeof esc==='function'?esc(String(v??'')):String(v??'')}catch{return String(v??'')}}
function maFmt(v,d=5){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:d}):'—'}
function maPct(v){return Number.isFinite(Number(v))?(100*Number(v)).toLocaleString(undefined,{maximumFractionDigits:2})+'%':'—'}
function maRoleLabel(role){const x=MA_ROLE_LABELS[role];return x?maUi(x.en,x.es):role}
function maExtendPressureMapping(){
  try{
    const role=PM_ROLE_DEFS.find(x=>x.key==='pressureGradientAcceleration');if(!role)return;
    const additions=[/^prghacceleration$/,/^p_rgh_acceleration$/i,/prgh.*accel/i,/pressure.*gradient.*accel/i];
    for(const re of additions)if(!role.patterns.some(x=>String(x)===String(re)))role.patterns.push(re)
  }catch{}
}
function maMappedMechanisms(c,region=''){
  if(!c)return[];
  const fields=pmFieldNamesForRegion(c,String(region||'')),mapping=pmMappingForCase(c);
  return maMechanismFields(mapping,fields)
}
function maFieldTimes(c,region,field){
  return[...new Set((c?.volumeFieldInventory||[]).filter(r=>String(r.region||'')===String(region||'')&&r.name===field).map(r=>Number(r.time)).filter(Number.isFinite))].sort((a,b)=>a-b)
}
function maCurrentSettings(){
  const x=pmContext(),subset=document.getElementById('maSubset')?.value||'whole',epsilon=Math.max(0,Number(document.getElementById('maEpsilon')?.value)||1e-12);
  return{...x,subset,epsilon}
}
function maMechanismStat(values,total){
  const st=pmStats(values,total);return{count:st.count,mean:st.mean,median:st.median,p95:st.p95,max:st.max,fraction:st.fraction}
}
async function maAnalyzeCurrent(){
  const x=maCurrentSettings(),status=document.getElementById('maStatus'),body=document.getElementById('maResult');
  if(!x.c||!Number.isFinite(x.time)){flSetIssue(status,'selection-missing',{analysis:'Momentum Mechanisms',region:x.region,time:x.time});return null}flClearIssue(status)
  const mechanisms=maMappedMechanisms(x.c,x.region),pairs=maMechanismPairs(mechanisms);
  if(mechanisms.length<2){
    flSetIssue(status,'at least two mapped momentum-acceleration fields are required',{analysis:'Momentum Mechanisms',region:document.getElementById('maRegion')?.value||''});
    if(body)body.innerHTML='';return null
  }
  if(status)status.textContent=maUi('Calculating cell-wise mechanism evidence…','Calculando evidencia de mecanismos por celda…');
  const fieldRows=[];
  for(const m of mechanisms){
    const r=await pmCollectSubsetValues(x.caseId,m.field,x.time,x.region,'magnitude',x.subset,x.low,x.high);
    if(!r.ok){fieldRows.push({mechanism:m,ok:false,reason:r.reason});continue}
    fieldRows.push({mechanism:m,ok:true,summary:maMechanismStat(r.values,r.total),issues:r.issues||[]})
  }
  const ratioRows=[];
  for(const pair of pairs){
    const r=await pmRatioPairs(x.caseId,pair.a.field,'magnitude',pair.b.field,'magnitude',x.time,x.region,x.subset,x.low,x.high,x.epsilon);
    if(!r.ok){ratioRows.push({pair,ok:false,reason:r.reason});continue}
    ratioRows.push({pair,ok:true,summary:maRatioSummary(r.ratios,r.total,r.invalid),issues:r.issues||[]})
  }
  const result={caseId:x.caseId,caseName:x.c.name,region:x.region,time:x.time,subset:x.subset,epsilon:x.epsilon,mechanisms:fieldRows,ratios:ratioRows};
  window.FoamLensLastMomentumMechanismAudit=result;maRenderResult(result);
  if(status)status.textContent=maUi(
    'Mechanism evidence calculated at the selected physical time. Ratios are local cell-wise magnitude ratios.',
    'Evidencia de mecanismos calculada en el tiempo físico seleccionado. Las razones son cocientes locales de magnitudes por celda.'
  );
  return result
}
function maRenderResult(result){
  const body=document.getElementById('maResult');if(!body||!result)return;
  const fieldRows=result.mechanisms.map(r=>{
    const s=r.summary;
    return '<tr><td>'+maEsc(maRoleLabel(r.mechanism.role))+'</td><td>'+maEsc(r.mechanism.field)+'</td>'+
      (r.ok?'<td>'+maFmt(s.mean)+'</td><td>'+maFmt(s.median)+'</td><td>'+maFmt(s.p95)+'</td><td>'+maFmt(s.max)+'</td><td>'+s.count+'</td>':'<td colspan="5">'+maEsc(r.reason||'—')+'</td>')+'</tr>'
  }).join('');
  const ratioRows=result.ratios.map(r=>{
    const s=r.summary,label=maRoleLabel(r.pair.a.role)+' / '+maRoleLabel(r.pair.b.role);
    return '<tr><td>'+maEsc(label)+'</td>'+
      (r.ok?'<td>'+maFmt(s.median)+'</td><td>'+maFmt(s.p95)+'</td><td>'+maPct(s.fractionGt1)+'</td><td>'+maPct(s.invalidFraction)+'</td><td>'+s.n+' / '+s.total+'</td>':'<td colspan="5">'+maEsc(r.reason||'—')+'</td>')+'</tr>'
  }).join('');
  body.innerHTML=
    '<div class="extNote">'+maUi(
      'Magnitude statistics and local mechanism ratios are descriptive evidence. A ratio > 1 means the numerator magnitude exceeded the denominator magnitude in that cell; it is not, by itself, proof of causality or a global mechanism verdict.',
      'Las estadísticas de magnitud y las razones locales entre mecanismos son evidencia descriptiva. Una razón > 1 significa que la magnitud del numerador superó a la del denominador en esa celda; por sí sola no prueba causalidad ni constituye un veredicto global de mecanismo.'
    )+'</div>'+
    '<div class="extTableWrap" style="margin-top:7px"><table class="extTable"><thead><tr><th>'+maUi('Mechanism','Mecanismo')+'</th><th>'+maUi('Field','Campo')+'</th><th>'+maUi('Mean','Media')+'</th><th>'+maUi('Median','Mediana')+'</th><th>P95</th><th>Max</th><th>N</th></tr></thead><tbody>'+fieldRows+'</tbody></table></div>'+
    '<div class="extTableWrap" style="margin-top:9px"><table class="extTable"><thead><tr><th>'+maUi('Local magnitude ratio','Razón local de magnitudes')+'</th><th>'+maUi('Median','Mediana')+'</th><th>P95</th><th>'+maUi('Cells ratio > 1','Celdas razón > 1')+'</th><th>'+maUi('Excluded denominator','Denominador excluido')+'</th><th>N</th></tr></thead><tbody>'+ratioRows+'</tbody></table></div>'
}
function maSeriesKey(caseId,region,pair,subset){return['momentumMechanismRatio',caseId,region,pair.key,subset].join('|')}
function maAddEvolutionSeries(baseCase,region,pair,subset,points){
  const key=maSeriesKey(baseCase.id,region,pair,subset),t=points.map(p=>p.t),y=points.map(p=>p.median);
  series=series.filter(s=>s.momentumMechanismRatioKey!==key);
  const label=maRoleLabel(pair.a.role)+' / '+maRoleLabel(pair.b.role)+' · '+maUi('median','mediana')+' · '+pmSubsetLabels()[subset];
  const field={canonical:'mechanism_ratio:'+pair.key,display:label,unit:'-',quantity:'mechanism_ratio',original:'local cell-wise magnitude ratio'};
  const d={id:nextId++,datasetType:'timeseries',caseId:baseCase.id,caseName:baseCase.name,fileName:'FoamLens mechanism-ratio evolution',sourcePath:'FoamLens momentum mechanism audit',field,probe:null,location:'',t,y,visible:true,color:variableColor(field),width:2.2,dash:baseCase.dash||'solid',opacity:1,axis:'Auto',customLabel:'',derived:true,derivedKind:'momentumMechanismRatioEvolution',momentumMechanismRatioKey:key,physicalAnalysis:{operation:'median-local-mechanism-magnitude-ratio',numerator:pair.a.field,denominator:pair.b.field,subset,noCausalityInference:true}};
  series.push(d);return d
}
async function maCreateEvolution(){
  const x=maCurrentSettings(),status=document.getElementById('maStatus');if(!x.c){flSetIssue(status,'selection-missing',{analysis:'Momentum Mechanisms'});return}flClearIssue(status);
  const mechanisms=maMappedMechanisms(x.c,x.region),pairs=maMechanismPairs(mechanisms);
  if(!pairs.length){flSetIssue(status,'no compatible mechanism pairs',{analysis:'Momentum Mechanisms',region:document.getElementById('maRegion')?.value||''});return}
  if(status)status.textContent=maUi('Calculating mechanism-ratio evolution…','Calculando evolución de razones entre mecanismos…');
  const created=[],skipped=[];
  for(const pair of pairs){
    const times=maCommonTimes([maFieldTimes(x.c,x.region,pair.a.field),maFieldTimes(x.c,x.region,pair.b.field)]),points=[];
    for(let i=0;i<times.length;i++){
      const t=times[i],r=await pmRatioPairs(x.caseId,pair.a.field,'magnitude',pair.b.field,'magnitude',t,x.region,x.subset,x.low,x.high,x.epsilon);
      if(r.ok){const s=maRatioSummary(r.ratios,r.total,r.invalid);if(Number.isFinite(s.median))points.push({t,median:s.median,p95:s.p95,fractionGt1:s.fractionGt1,invalidFraction:s.invalidFraction})}
      if(i%6===0)await scannerYield()
    }
    if(points.length>=2)created.push(maAddEvolutionSeries(x.c,x.region,pair,x.subset,points));else skipped.push(pair.key)
  }
  if(created.length){activeId=created[0].id;refreshDatasetControls();renderList();updateMeta();if(activeAppMode==='field')draw()}
  if(status){if(created.length){flClearIssue(status);status.textContent=maUi('Created '+created.length+' median local-ratio evolution curve(s). No temporal extrapolation was used.','Se crearon '+created.length+' curva(s) de evolución de la mediana de la razón local. No se usó extrapolación temporal.')}else flSetIssue(status,'mechanism-times-insufficient',{analysis:'Momentum Mechanisms',region:x.region})}
  return{created,skipped}
}
function maRefreshAvailability(){
  const x=pmContext(),panel=document.getElementById('maPanel');if(!panel)return;
  const mechanisms=maMappedMechanisms(x.c,x.region),badge=document.getElementById('maBadge'),run=document.getElementById('maRun'),evo=document.getElementById('maEvolution');
  if(badge)badge.textContent=mechanisms.length+' / 3';
  const enabled=mechanisms.length>=2&&Number.isFinite(x.time);if(run)run.disabled=!enabled;if(evo)evo.disabled=mechanisms.length<2;
  const map=document.getElementById('maMapping');if(map){if(mechanisms.length){flClearIssue(map);map.textContent=mechanisms.map(m=>maRoleLabel(m.role)+' → '+m.field).join(' · ')}else flSetIssue(map,'no momentum acceleration mechanisms',{analysis:'Momentum Mechanisms',region:document.getElementById('maRegion')?.value||''})}
}
function maInstallUi(){
  const ratioPane=document.querySelector('[data-pm-pane-panel="ratio"]');if(!ratioPane)return false;
  if(!document.getElementById('maPanel')){
    const box=document.createElement('details');box.className='extSection';box.id='maPanel';box.open=true;
    box.innerHTML='<summary><span data-fl-en="Automatic mechanism balance audit" data-fl-es="Auditoría automática de balance de mecanismos">Automatic mechanism balance audit</span><span class="badge" id="maBadge">0 / 3</span></summary>'+
      '<div class="extSectionBody">'+
      '<div class="extNote" id="maMapping"></div>'+
      '<div class="extGrid2" style="margin-top:7px"><div class="field"><label data-fl-en="Spatial subset" data-fl-es="Subconjunto espacial">Spatial subset</label><select id="maSubset"><option value="whole" data-fl-en="Whole domain" data-fl-es="Todo el dominio">Whole domain</option><option value="liquid" data-fl-en="Liquid" data-fl-es="Líquido">Liquid</option><option value="mushy" data-fl-en="Mushy" data-fl-es="Pastoso">Mushy</option><option value="solid" data-fl-en="Solid" data-fl-es="Sólido">Solid</option></select></div>'+
      '<div class="field"><label data-fl-en="Near-zero denominator epsilon" data-fl-es="Epsilon de denominador casi cero">Near-zero denominator epsilon</label><input id="maEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>'+
      '<div class="extActions"><button class="btn primary" id="maRun" type="button" data-fl-en="Analyze current time" data-fl-es="Analizar tiempo actual">Analyze current time</button><button class="btn" id="maEvolution" type="button" data-fl-en="Create ratio evolution" data-fl-es="Crear evolución de razones">Create ratio evolution</button></div>'+
      '<div class="extStatus" id="maStatus"></div><div id="maResult"></div></div>';
    ratioPane.appendChild(box);try{flApplyBilingualText(box)}catch{}
    document.getElementById('maRun').addEventListener('click',maAnalyzeCurrent);
    document.getElementById('maEvolution').addEventListener('click',maCreateEvolution);
    for(const id of ['maSubset','maEpsilon'])document.getElementById(id)?.addEventListener('change',()=>{document.getElementById('maResult').innerHTML='';maRefreshAvailability()})
  }
  maRefreshAvailability();return true
}
function maInstall(){
  maExtendPressureMapping();maInstallUi();
  if(typeof pmRefreshContext==='function'&&!pmRefreshContext.__maPatched){
    const previous=pmRefreshContext;pmRefreshContext=function(...args){const x=previous.apply(this,args);setTimeout(()=>{maInstallUi();maRefreshAvailability()},0);return x};pmRefreshContext.__maPatched=true
  }
  if(typeof refreshPhaseMomentumUi==='function'&&!refreshPhaseMomentumUi.__maPatched){
    const previous=refreshPhaseMomentumUi;refreshPhaseMomentumUi=function(...args){const x=previous.apply(this,args);setTimeout(()=>{maInstallUi();maRefreshAvailability()},0);return x};refreshPhaseMomentumUi.__maPatched=true
  }
  for(const id of ['pmCase','pmRegion','pmTime','pmAlphaLow','pmAlphaHigh'])document.getElementById(id)?.addEventListener('change',()=>{maRefreshAvailability();const r=document.getElementById('maResult');if(r)r.innerHTML=''});
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('maPanel');if(p)try{flApplyBilingualText(p)}catch{};maRefreshAvailability();if(window.FoamLensLastMomentumMechanismAudit)maRenderResult(window.FoamLensLastMomentumMechanismAudit)});
  return true
}
maInstall();
window.FoamLensMomentumMechanisms={maFinite,maQuantile,maMechanismFields,maMechanismPairs,maRatioSummary,maCommonTimes,maAnalyzeCurrent,maCreateEvolution};
