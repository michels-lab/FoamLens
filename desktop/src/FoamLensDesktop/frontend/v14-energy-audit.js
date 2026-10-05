/* FoamLens Desktop v1.4.1 — automatic OpenFOAM energy audit. */

/* FOAMLENS_ENERGY_AUDIT_CORE_START */
const EA_ROLE_LABELS={
  advective:{en:'Advective energy flux',es:'Flujo advectivo de energía'},
  diffusive:{en:'Diffusive / conducted heat flux',es:'Flujo difusivo / conducido de calor'},
  total:{en:'Total combined energy flux',es:'Flujo total combinado de energía'},
  sensibleInventory:{en:'Sensible-energy inventory',es:'Inventario de energía sensible'},
  latentPower:{en:'Latent-heat power',es:'Potencia de calor latente'}
};
function eaNorm(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'')}
function eaFinitePairs(t,y){
  const out=[];for(let i=0;i<Math.min(t?.length||0,y?.length||0);i++){const x=Number(t[i]),v=Number(y[i]);if(Number.isFinite(x)&&Number.isFinite(v))out.push([x,v])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&Math.abs(d.at(-1)[0]-p[0])<=Math.max(1e-12,Math.max(Math.abs(p[0]),1)*1e-10))d[d.length-1]=p;else d.push(p)}return d
}
function eaMergeSeries(seriesList){
  const all=[];for(const s of seriesList||[])for(const p of eaFinitePairs(s?.t,s?.y))all.push(p);
  all.sort((a,b)=>a[0]-b[0]);const t=[],y=[];
  for(const [x,v] of all){if(t.length&&Math.abs(t.at(-1)-x)<=Math.max(1e-12,Math.max(Math.abs(x),1)*1e-10)){t[t.length-1]=x;y[y.length-1]=v}else{t.push(x);y.push(v)}}
  return{t,y}
}
function eaRoleFromDescriptor(d={}){
  const f=eaNorm(d.fieldName||d.canonical),op=eaNorm(d.operation),kind=eaNorm(d.kind),type=eaNorm(d.functionType),weight=eaNorm(d.weightField);
  const surface=(kind==='surfacereduction'||type==='surfacefieldvalue'),volume=(kind==='volumereduction'||type==='volfieldvalue');
  const sumLike=!op||['sum','orientedsum','summag'].includes(op);
  if(surface&&sumLike&&f==='energyadvectiveflux')return'advective';
  if(surface&&sumLike&&f==='heatflux')return'diffusive';
  if(surface&&sumLike&&f==='energyflux')return'total';
  if(volume&&op==='volintegrate'&&['h','he','e'].includes(f)&&weight==='rho')return'sensibleInventory';
  if(volume&&op==='volintegrate'&&(/latent/.test(f)&&/(rate|power)/.test(f)))return'latentPower';
  if(volume&&op==='volintegrate'&&f==='latentheatratevol')return'latentPower';
  return''
}
function eaTrapezoid(t,y){
  const p=eaFinitePairs(t,y);if(!p.length)return{t:[],y:[],final:NaN};let acc=0;const tt=[p[0][0]],out=[0];
  for(let i=1;i<p.length;i++){const dt=p[i][0]-p[i-1][0];if(dt>0)acc+=.5*(p[i-1][1]+p[i][1])*dt;tt.push(p[i][0]);out.push(acc)}
  return{t:tt,y:out,final:acc}
}
function eaQuantile(values,q){
  const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;if(a.length===1)return a[0];
  const p=(a.length-1)*Math.max(0,Math.min(1,Number(q)||0)),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;return a[lo]+(a[hi]-a[lo])*f
}
function eaClosureMetrics(adv,diff,total,epsilon=1e-12){
  const n=Math.min(adv?.length||0,diff?.length||0,total?.length||0),res=[],rel=[];
  for(let i=0;i<n;i++){
    const a=Number(adv[i]),d=Number(diff[i]),tt=Number(total[i]);if(![a,d,tt].every(Number.isFinite))continue;
    const r=tt-a-d,scale=Math.max(Math.abs(tt),Math.abs(a)+Math.abs(d),Math.abs(Number(epsilon)||0),1e-300);res.push(r);rel.push(Math.abs(r)/scale)
  }
  const abs=res.map(Math.abs),rms=res.length?Math.sqrt(res.reduce((s,v)=>s+v*v,0)/res.length):NaN;
  return{n:res.length,residual:res,relative:rel,meanAbs:abs.length?abs.reduce((s,v)=>s+v,0)/abs.length:NaN,rms,maxAbs:abs.length?Math.max(...abs):NaN,p95Relative:eaQuantile(rel,.95),maxRelative:rel.length?Math.max(...rel):NaN}
}
function eaInventoryDelta(t,y){
  const p=eaFinitePairs(t,y);return p.length>=2?{startTime:p[0][0],endTime:p.at(-1)[0],start:p[0][1],end:p.at(-1)[1],delta:p.at(-1)[1]-p[0][1]}:{startTime:NaN,endTime:NaN,start:NaN,end:NaN,delta:NaN}
}
/* FOAMLENS_ENERGY_AUDIT_CORE_END */

function eaUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(diagEs()?es:en)}catch{return en}}
function eaEsc(v){try{return typeof esc==='function'?esc(String(v??'')):String(v??'')}catch{return String(v??'')}}
function eaFmt(v,d=6){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:d}):'—'}
function eaPct(v){return Number.isFinite(Number(v))?(100*Number(v)).toLocaleString(undefined,{maximumFractionDigits:4})+'%':'—'}
function eaRoleLabel(role){const x=EA_ROLE_LABELS[role];return x?eaUi(x.en,x.es):role}

function eaFunctionObjectForSeries(s){
  const c=caseById(Number(s?.caseId));if(!c)return null;
  const objects=c.config?.functionObjects||[],parts=String(s?.sourcePath||'').replace(/\\/g,'/').split('/').filter(Boolean);
  return objects.find(o=>parts.includes(String(o.name||'')))||null
}
function eaDescriptor(s){
  const fo=eaFunctionObjectForSeries(s),pp=s?.postProcessing||{};
  return{
    series:s,caseId:s?.caseId,fieldName:pp.fieldName||s?.field?.canonical||s?.field?.original||'',
    canonical:s?.field?.canonical||'',operation:pp.operation||pp.reduction||fo?.operation||'',
    kind:pp.kind||'',functionType:fo?.type||'',weightField:fo?.weightField||'',
    functionObject:fo?.name||'',region:fo?.region||seriesRegion(s)||'',
    patch:fo?.patch||'',patches:[...(fo?.patches||[])],cellZone:fo?.cellZone||'',
    sourcePath:String(s?.sourcePath||''),column:pp.column||'',role:''
  }
}
function eaDecorate(s){const d=eaDescriptor(s);d.role=eaRoleFromDescriptor(d);return d}
function eaCaseSeries(caseId){
  return (Array.isArray(series)?series:[]).filter(s=>Number(s?.caseId)===Number(caseId)&&datasetTypeOf(s)==='timeseries'&&s?.postProcessing&&eaFinitePairs(s.t,s.y).length>=2)
}
function eaGroupKey(d){
  const source=d.functionObject||String(d.sourcePath||'').replace(/\\/g,'/').split('/postProcessing/').at(-1)?.split('/')[0]||d.sourcePath;
  return[d.caseId,d.region,source,d.kind].join('|')
}
function eaSurfaceLabel(d){
  if(d.patch)return d.patch;if(d.patches?.length)return d.patches.join(', ');return d.functionObject||d.sourcePath||eaUi('surface reduction','reducción superficial')
}
function eaFindFluxGroups(caseId){
  const groups=new Map();
  for(const s of eaCaseSeries(caseId)){
    const d=eaDecorate(s);if(!['advective','diffusive','total'].includes(d.role))continue;
    const key=eaGroupKey(d);if(!groups.has(key))groups.set(key,{key,descriptors:[],roles:{},region:d.region,label:eaSurfaceLabel(d),functionObject:d.functionObject});
    const g=groups.get(key);g.descriptors.push(d);if(!g.roles[d.role])g.roles[d.role]=[];g.roles[d.role].push(s)
  }
  return[...groups.values()].filter(g=>g.roles.advective?.length&&g.roles.diffusive?.length&&g.roles.total?.length)
}
function eaFindInventory(caseId){
  const out={sensibleInventory:[],latentPower:[]};
  for(const s of eaCaseSeries(caseId)){const d=eaDecorate(s);if(d.role&&out[d.role])out[d.role].push({descriptor:d,series:s})}
  return out
}
function eaMergedRole(g,role){
  const src=g?.roles?.[role]||[],m=eaMergeSeries(src);return{...src[0],t:m.t,y:m.y,_eaSources:src}
}
function eaAnalyzeFluxGroup(g,epsilon=1e-12){
  const A=eaMergedRole(g,'advective'),D=eaMergedRole(g,'diffusive'),T=eaMergedRole(g,'total');
  const aligned=taAlignSeries([A,D,T],{mode:'common',method:'linear',maxPoints:5000});if(!aligned.valid)return{ok:false,group:g,reason:'no shared physical-time interval'};
  const a=aligned.series[0].y,d=aligned.series[1].y,t=aligned.series[2].y,m=eaClosureMetrics(a,d,t,epsilon),res=m.residual;
  return{
    ok:true,group:g,range:aligned.range,grid:aligned.grid,advective:a,diffusive:d,total:t,residual:res,metrics:m,
    integrals:{advective:eaTrapezoid(aligned.grid,a).final,diffusive:eaTrapezoid(aligned.grid,d).final,total:eaTrapezoid(aligned.grid,t).final,residual:eaTrapezoid(aligned.grid,res).final},
    noExtrapolation:true
  }
}
function eaInventoryRows(caseId){
  const inv=eaFindInventory(caseId),rows=[];
  for(const x of inv.sensibleInventory){
    const m=eaMergeSeries([x.series]),d=eaInventoryDelta(m.t,m.y);rows.push({role:'sensibleInventory',descriptor:x.descriptor,metric:d})
  }
  for(const x of inv.latentPower){
    const m=eaMergeSeries([x.series]),integ=eaTrapezoid(m.t,m.y);rows.push({role:'latentPower',descriptor:x.descriptor,metric:{startTime:m.t[0],endTime:m.t.at(-1),integral:integ.final}})
  }
  return rows
}
function eaCaseCandidates(){return cases.filter(c=>eaFindFluxGroups(c.id).length||eaInventoryRows(c.id).length)}
function eaCurrentCase(){
  const id=Number(document.getElementById('eaCase')?.value);return caseById(id)||caseById(activeContextCaseId)||eaCaseCandidates()[0]||cases[0]||null
}
function eaRefreshSelectors(){
  const sel=document.getElementById('eaCase'),badge=document.getElementById('eaBadge');if(!sel)return;
  const cs=eaCaseCandidates(),old=sel.value;sel.innerHTML=cs.length?cs.map(c=>'<option value="'+c.id+'">'+eaEsc(c.name)+'</option>').join(''):'<option value="">—</option>';
  if(cs.some(c=>String(c.id)===old))sel.value=old;else if(activeContextCaseId!=null&&cs.some(c=>Number(c.id)===Number(activeContextCaseId)))sel.value=String(activeContextCaseId);
  const c=eaCurrentCase(),n=c?eaFindFluxGroups(c.id).length:0;if(badge)badge.textContent=n+' '+eaUi(n===1?'set':'sets',n===1?'conjunto':'conjuntos');
  const run=document.getElementById('eaRun'),curves=document.getElementById('eaCurves');if(run)run.disabled=!c;if(curves)curves.disabled=!c
}
function eaRender(result){
  const body=document.getElementById('eaResult');if(!body)return;
  if(!result){body.innerHTML='';return}
  const flux=result.flux.map(r=>{
    if(!r.ok)return'<tr><td>'+eaEsc(r.group.label)+'</td><td colspan="9">'+eaEsc(r.reason||'—')+'</td></tr>';
    const m=r.metrics,q=r.integrals;
    return'<tr><td>'+eaEsc(r.group.label)+'</td><td>'+eaEsc(r.group.region||'—')+'</td><td>'+m.n+'</td><td>'+eaFmt(m.rms)+'</td><td>'+eaPct(m.p95Relative)+'</td><td>'+eaPct(m.maxRelative)+'</td><td>'+eaFmt(q.advective)+'</td><td>'+eaFmt(q.diffusive)+'</td><td>'+eaFmt(q.total)+'</td><td>'+eaFmt(q.residual)+'</td></tr>'
  }).join('');
  const inv=result.inventory.map(r=>{
    const d=r.descriptor,m=r.metric,label=eaRoleLabel(r.role),value=r.role==='sensibleInventory'
      ? eaUi('ΔE = ','ΔE = ')+eaFmt(m.delta)+' J'
      : eaUi('∫P dt = ','∫P dt = ')+eaFmt(m.integral)+' J';
    return'<tr><td>'+eaEsc(label)+'</td><td>'+eaEsc(d.fieldName)+'</td><td>'+eaEsc(d.functionObject||d.sourcePath)+'</td><td>'+eaEsc(d.region||'—')+'</td><td>'+eaEsc(value)+'</td><td>'+eaFmt(m.startTime)+'–'+eaFmt(m.endTime)+' s</td></tr>'
  }).join('');
  body.innerHTML=
    '<div class="extNote">'+eaUi(
      'OpenFOAM 14 defines total energyFlux as the combined advective and diffusive energy flux. FoamLens checks that numerical identity on common physical times only. It does not combine boundary, sensible and latent terms into a conservation sign convention unless that convention is explicitly defined.',
      'OpenFOAM 14 define energyFlux total como la combinación de los flujos de energía advectivo y difusivo. FoamLens comprueba esa identidad numérica únicamente en tiempos físicos comunes. No combina términos de frontera, sensible y latente en una convención de signos de conservación salvo que ésta se defina explícitamente.'
    )+'</div>'+
    (result.flux.length?'<div class="extTableWrap" style="margin-top:8px"><table class="extTable"><thead><tr><th>'+eaUi('Surface / object','Superficie / objeto')+'</th><th>'+eaUi('Region','Región')+'</th><th>N</th><th>'+eaUi('Closure RMS [W]','RMS de cierre [W]')+'</th><th>P95 rel.</th><th>Max rel.</th><th>∫Adv [J]</th><th>∫Diff [J]</th><th>∫Total [J]</th><th>∫Residual [J]</th></tr></thead><tbody>'+flux+'</tbody></table></div>':'')+
    (result.inventory.length?'<div class="extTableWrap" style="margin-top:8px"><table class="extTable"><thead><tr><th>'+eaUi('Energy evidence','Evidencia energética')+'</th><th>'+eaUi('Field','Campo')+'</th><th>'+eaUi('Function object','Function object')+'</th><th>'+eaUi('Region','Región')+'</th><th>'+eaUi('Integrated change','Cambio integrado')+'</th><th>'+eaUi('Range','Rango')+'</th></tr></thead><tbody>'+inv+'</tbody></table></div>':'')+
    (!result.flux.length&&!result.inventory.length?'<div class="extNote">'+eaUi('No compatible energy reductions are loaded for this case.','No hay reducciones de energía compatibles cargadas para este caso.')+'</div>':'')
}
function eaRun(){
  const c=eaCurrentCase(),status=document.getElementById('eaStatus');if(!c){flSetIssue(status,'no compatible case',{analysis:'Energy Audit'});return null}flClearIssue(status)
  const eps=Math.max(0,Number(document.getElementById('eaEpsilon')?.value)||1e-12),groups=eaFindFluxGroups(c.id),flux=groups.map(g=>eaAnalyzeFluxGroup(g,eps)),inventory=eaInventoryRows(c.id);
  const result={caseId:c.id,caseName:c.name,epsilon:eps,flux,inventory,scientificBasis:'OpenFOAM energyFlux = energyAdvectiveFlux + heatFlux',noExtrapolation:true,noSignConventionInference:true};
  window.FoamLensLastEnergyAudit=result;eaRender(result);
  if(!flux.length&&!inventory.length){flSetIssue(status,'energy-evidence-missing',{analysis:'Energy Audit'});return result}
  const failed=flux.filter(x=>!x.ok);
  if(failed.length&&failed.length===flux.length&&!inventory.length){flSetIssue(status,failed[0].reason||'energy-flux-set-incomplete',{analysis:'Energy Audit'});return result}
  flClearIssue(status);
  if(status)status.textContent=eaUi(
    'Energy audit calculated from detected OpenFOAM reductions. No temporal extrapolation or inferred conservation sign convention was used.',
    'Auditoría de energía calculada a partir de reducciones OpenFOAM detectadas. No se usó extrapolación temporal ni se infirió una convención de signos de conservación.'
  );return result
}
function eaAddDerived(base,name,t,y,unit,meta){
  const field={canonical:'energyAudit:'+name,display:name,unit,quantity:'energy_audit',original:'FoamLens automatic energy audit'};
  const d={id:nextId++,datasetType:'timeseries',caseId:base.caseId,caseName:base.caseName,fileName:'FoamLens automatic energy audit',sourcePath:'FoamLens energy audit',field,probe:null,location:'',t:t.slice(),y:y.slice(),visible:true,color:variableColor(field),width:2.2,dash:caseById(base.caseId)?.dash||'solid',opacity:1,axis:'Auto',customLabel:'',derived:true,derivedKind:'energyAudit',energyAudit:{...meta,noExtrapolation:true}};
  series.push(d);return d
}
function eaCreateCurves(){
  const result=eaRun();if(!result)return;let created=0,first=null;
  series=series.filter(s=>!(s.derivedKind==='energyAudit'&&Number(s.caseId)===Number(result.caseId)));
  for(const r of result.flux){
    if(!r.ok)continue;const g=r.group,base=g.roles.total[0],label=g.label||g.functionObject||'surface';
    const residual=eaAddDerived(base,eaUi('Energy-flux closure residual · ','Residual de cierre de flujo de energía · ')+label,r.grid,r.residual,'W',{operation:'energy-flux-decomposition-residual',formula:'energyFlux - energyAdvectiveFlux - heatFlux',group:g.key});
    const cumulative=eaTrapezoid(r.grid,r.total),cum=eaAddDerived(base,eaUi('Cumulative total boundary energy · ','Energía total acumulada de frontera · ')+label,cumulative.t,cumulative.y,'J',{operation:'time-integral-total-energy-flux',source:label,group:g.key});
    first=first||residual||cum;created+=2
  }
  if(created){activeId=first?.id||activeId;refreshDatasetControls();if(activeAppMode!=='analysis')setDataView('timeseries');renderList();updateMeta();if(activeAppMode!=='analysis')draw()}
  const status=document.getElementById('eaStatus');if(created){flClearIssue(status);status.textContent=eaUi('Created '+created+' audit curve(s): closure residuals and cumulative total boundary energy.','Se crearon '+created+' curva(s) de auditoría: residuales de cierre y energía total acumulada de frontera.')}else flSetIssue(status,'energy-flux-set-incomplete',{analysis:'Energy Audit'});
}
function eaInstallUi(){
  const host=document.getElementById('paTools');if(!host)return false;if(document.getElementById('eaPanel')){eaRefreshSelectors();return true}
  const box=document.createElement('details');box.className='extSection';box.id='eaPanel';box.open=true;
  box.innerHTML='<summary><span data-fl-en="Automatic Energy Audit" data-fl-es="Auditoría automática de energía">Automatic Energy Audit</span><span class="badge" id="eaBadge">0 sets</span></summary>'+
    '<div class="extSectionBody"><div class="extNote" data-fl-en="Automatically checks OpenFOAM energy-flux decomposition and integrates detected power terms over physical time." data-fl-es="Comprueba automáticamente la descomposición de flujo de energía de OpenFOAM e integra los términos de potencia detectados respecto al tiempo físico.">Automatically checks OpenFOAM energy-flux decomposition and integrates detected power terms over physical time.</div>'+
    '<div class="extGrid2" style="margin-top:7px"><div class="field"><label data-fl-en="Case" data-fl-es="Caso">Case</label><select id="eaCase"></select></div><div class="field"><label data-fl-en="Relative residual epsilon" data-fl-es="Epsilon del residual relativo">Relative residual epsilon</label><input id="eaEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>'+
    '<div class="extActions"><button class="btn primary" id="eaRun" type="button" data-fl-en="Run automatic energy audit" data-fl-es="Ejecutar auditoría automática de energía">Run automatic energy audit</button><button class="btn" id="eaCurves" type="button" data-fl-en="Create audit curves" data-fl-es="Crear curvas de auditoría">Create audit curves</button></div>'+
    '<div class="extStatus" id="eaStatus"></div><div id="eaResult"></div></div>';
  const energyStatus=document.getElementById('paEnergyStatus');if(energyStatus)energyStatus.insertAdjacentElement('afterend',box);else host.appendChild(box);
  try{flApplyBilingualText(box)}catch{}
  document.getElementById('eaRun').addEventListener('click',eaRun);document.getElementById('eaCurves').addEventListener('click',eaCreateCurves);
  document.getElementById('eaCase').addEventListener('change',()=>{eaRefreshSelectors();eaRender(null)});
  document.getElementById('eaEpsilon').addEventListener('change',()=>eaRender(null));
  eaRefreshSelectors();return true
}
function eaInstall(){
  eaInstallUi();
  try{
    const prev=paRefreshSources;if(typeof prev==='function'&&!prev.__eaPatched){paRefreshSources=function(...args){const x=prev.apply(this,args);setTimeout(()=>{eaInstallUi();eaRefreshSelectors()},0);return x};paRefreshSources.__eaPatched=true}
  }catch{}
  try{
    const prev=refreshDatasetControls;if(typeof prev==='function'&&!prev.__eaPatched){refreshDatasetControls=function(...args){const x=prev.apply(this,args);setTimeout(()=>{eaInstallUi();eaRefreshSelectors()},0);return x};refreshDatasetControls.__eaPatched=true}
  }catch{}
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('eaPanel');if(p)try{flApplyBilingualText(p)}catch{};eaRefreshSelectors();if(window.FoamLensLastEnergyAudit)eaRender(window.FoamLensLastEnergyAudit)});
  return true
}
eaInstall();
window.FoamLensEnergyAudit={eaNorm,eaFinitePairs,eaMergeSeries,eaRoleFromDescriptor,eaTrapezoid,eaClosureMetrics,eaInventoryDelta,eaFindFluxGroups,eaRun,eaCreateCurves};
