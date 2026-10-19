/* FoamLens Granada #152 — physically mapped thermocouple/source-backed validation.
 * Companion to v14 experimental validation and native OpenFOAM 3D probe history.
 * No synthetic probe temperatures, nearest-cell-as-inside, or automatic recalescence labels.
 */
/* FOAMLENS_TC_MAPPING_CORE_START */
function tcNumber(v){
  if(typeof v==='number')return Number.isFinite(v)?v:NaN;
  if(typeof v!=='string'||!v.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim()))return NaN;
  const n=Number(v);return Number.isFinite(n)?n:NaN
}
function tcLengthScale(u){return {m:1,mm:.001,cm:.01}[String(u||'').trim()]||null}
function tcXYZ(input,unit){
  const k=tcLengthScale(unit),v=Array.isArray(input)?input:[],n=v.map(tcNumber);
  return k&&n.length===3&&n.every(Number.isFinite)?n.map(x=>x*k):null
}
function tcTempUnit(u){
  const v=String(u||'').trim().toLowerCase();
  if(['k','kelvin'].includes(v))return{unit:'K',offset:0};
  if(['c','°c','℃','degc','celsius'].includes(v))return{unit:'K',offset:273.15};
  return null
}
function tcRegion(s){
  if(typeof s?.region==='string'&&s.region.trim())return s.region.trim();
  const parts=String(s?.fieldHistoryKey||'').split('|');
  return parts[0]==='field3d-probe-history'&&parts.length>=7?parts[2]:''
}
function tcFamily(s){
  const parts=String(s?.fieldHistoryKey||'').split('|');
  return parts[0]==='field3d-probe-history'&&parts.length>=7
    ? [parts[3],parts[4]].join('|') : ''
}
function tcProbePoint(s){return Array.isArray(s?.probePoint)&&s.probePoint.length===3&&s.probePoint.every(v=>Number.isFinite(tcNumber(v)))?s.probePoint.map(tcNumber):null}
function tcSeriesPairs(t,y){
  if(!Array.isArray(t)||!Array.isArray(y)||t.length!==y.length||t.length<2)return null;
  const pts=[];
  for(let i=0;i<t.length;i++){
    const a=tcNumber(t[i]),b=tcNumber(y[i]);
    if(!Number.isFinite(a)||!Number.isFinite(b))return null;
    pts.push([a,b]);
  }
  for(let i=1;i<pts.length;i++)if(!(pts[i][0]>pts[i-1][0]))return null;
  return pts
}
function tcLocate(mesh,xyz,contains,nearby){
  const error=(status,reason)=>({status,reason,cellId:null,centerDistanceM:null,pointM:xyz||null,verified:false});
  if(!mesh||!xyz||xyz.length!==3||!xyz.every(Number.isFinite))return error('unavailable','No verified 3D mesh and physical XYZ');
  const lo=mesh.boundsMin,hi=mesh.boundsMax;
  if(!lo||!hi||lo.length<3||hi.length<3||![...lo,...hi].every(Number.isFinite))
    return error('unavailable','Mesh bounds not available');
  if(xyz.some((v,i)=>v<lo[i]||v>hi[i]))return error('outside-bounds','XYZ outside source mesh bounding box');
  if(typeof contains!=='function'||!mesh.owners?.length||!mesh.faceOffsets?.length||!mesh.cellCount)
    return error('unverified','Bounding box is not a cell containment test; face topology not available');
  // Only a proven containing polyhedral cell can be used; nearest center alone is insufficient.
  const n=Math.floor(Number(mesh.cellCount));
  const candidates=typeof nearby==='function'?nearby(xyz):null;
  const list=Array.isArray(candidates)&&candidates.length?candidates:(n<=10000?Array.from({length:n},(_,i)=>i):[]);
  if(!list.length)return error('unverified','Cell search exhausted or incomplete; cannot prove membership');
  const actual=[];
  for(const i of new Set(list)){
    if(!Number.isInteger(i)||i<0||i>=n||!contains(mesh,i,xyz))continue;
    const centers=mesh.cellCenters||[],pos=[0,1,2].map(j=>tcNumber(centers[3*i+j]));
    actual.push({cellId:i,dist:pos.every(Number.isFinite)?Math.hypot(...pos.map((v,k)=>v-xyz[k])):null});
  }
  if(!actual.length)return error('unverified','No containing cell identified; point may lie in a cavity or outside the physical region');
  actual.sort((a,b)=>(a.dist??Infinity)-(b.dist??Infinity)||a.cellId-b.cellId);
  return{status:'contained',reason:'OpenFOAM cell polyhedron face containment passed',
    cellId:actual[0].cellId,centerDistanceM:actual[0].dist,pointM:xyz,verified:true,
    touchingCells:actual.length}
}
function tcInterpolate(p,t){
  if(p.length<2||t<p[0][0]||t>p.at(-1)[0])return null;
  let l=0,r=p.length-1;
  while(l<=r){
    const m=(l+r)>>1;
    if(Math.abs(p[m][0]-t)<=1e-12*Math.max(1,Math.abs(t),Math.abs(p[m][0])))
      return{value:p[m][1],method:'source-time'};
    if(p[m][0]<t)l=m+1;else r=m-1
  }
  if(l<=0||l>=p.length)return null;
  const a=p[l-1],b=p[l],w=(t-a[0])/(b[0]-a[0]);
  return{value:a[1]+w*(b[1]-a[1]),method:'linear-time'}
}
function tcCompare(sim,experimental,settings={}){
  const invalid=reason=>({valid:false,reason,rows:[],metrics:null,noExtrapolation:true});
  if(!sim||!experimental||!Number.isFinite(tcNumber(sim.caseId)))
    return invalid('Simulation case and original experimental record required');
  if(!String(sim.sourcePath||'').startsWith('derived:field3d-probe-history|')||
     !String(sim.fieldHistoryKey||'').startsWith('field3d-probe-history|'))
    return invalid('Simulation must be a real OpenFOAM 3D Probe field-history source');
  const simPoint=tcProbePoint(sim),region=tcRegion(sim),family=tcFamily(sim);
  if(!simPoint||!family||!String(region).trim())return invalid('Simulation lacks verified 3D probe XYZ, original family or source region');
  if(!String(settings.region||'').trim()||settings.region!==region||Number(settings.caseId)!==Number(sim.caseId))
    return invalid('Target region/case does not match the measured source region/case');
  const location=settings.location;
  if(!location?.verified||location.status!=='contained'||!Number.isInteger(location.cellId))
    return invalid('Physical XYZ is not mapped to a confirmed OpenFOAM cell');
  const measuredPoint=tcXYZ(settings.targetXYZ,settings.coordinateUnit);
  if(!measuredPoint)return invalid('Thermocouple position/unit invalid');
  if(!Array.isArray(location.pointM)||location.pointM.length!==3||
     Math.hypot(...location.pointM.map((v,i)=>v-measuredPoint[i]))>1e-9)
    return invalid('Cell containment evidence belongs to a different physical sensor XYZ');
  if(!settings.probeLocation?.verified||settings.probeLocation.status!=='contained'||
     !Array.isArray(settings.probeLocation.pointM)||
     Math.hypot(...settings.probeLocation.pointM.map((v,i)=>v-simPoint[i]))>1e-9)
    return invalid('Original 3D probe point is not independently contained in the selected mesh');
  const discrepancy=Math.hypot(...simPoint.map((v,i)=>v-measuredPoint[i]));
  const maxOffset=tcNumber(settings.maxOffsetM);
  if(!Number.isFinite(maxOffset)||maxOffset<0||discrepancy>maxOffset)
    return invalid('Simulation probe is farther from measured thermocouple than the explicit spatial tolerance');
  const sourceK=tcTempUnit(sim.field?.unit),expK=tcTempUnit(experimental.unit);
  if(!sourceK||!expK)return invalid('Temperature source/experiment unit absent or incompatible');
  const dimensions=String(sim.field?.dimensions||'').trim();
  if(dimensions&&dimensions!=='[0 0 0 1 0 0 0]')
    return invalid('Source dimensional exponents are not thermodynamic temperature');
  const a=tcSeriesPairs(sim.t,sim.y),b=tcSeriesPairs(experimental.t,experimental.y);
  if(!a||!b)return invalid('Time/temperature measurements incomplete, non-finite, unsorted or repeated');
  const shift=tcNumber(settings.timeShiftS);
  if(!Number.isFinite(shift))return invalid('Explicit finite experiment time shift required');
  const expShifted=b.map(([t,y])=>[t+shift,y]);
  const commonStart=Math.max(a[0][0],expShifted[0][0]),commonEnd=Math.min(a.at(-1)[0],expShifted.at(-1)[0]);
  if(!(commonEnd>commonStart))return invalid('No shared real physical-time interval; extrapolation forbidden');
  const rows=[];
  for(const [t,e] of expShifted){
    if(t<commonStart||t>commonEnd)continue;
    const smp=tcInterpolate(a,t);if(!smp)continue;
    const model=smp.value+sourceK.offset,observed=e+expK.offset,delta=model-observed;
    if(![model,observed,delta].every(Number.isFinite))return invalid('Non-finite Kelvin conversion');
    rows.push({timeS:t,simulationK:model,experimentK:observed,simMinusExpK:delta,
      simulationTimeSource:smp.method})
  }
  if(rows.length<2)return invalid('Fewer than two experimental samples inside common physical time');
  const metrics={n:rows.length,mae:rows.reduce((n,r)=>n+Math.abs(r.simMinusExpK),0)/rows.length,
    bias:rows.reduce((n,r)=>n+r.simMinusExpK,0)/rows.length,
    rmse:Math.sqrt(rows.reduce((n,r)=>n+r.simMinusExpK**2,0)/rows.length),
    maxAbs:Math.max(...rows.map(r=>Math.abs(r.simMinusExpK)))};
  return{valid:true,schema:'foamlens/thermocouple-mapping/1',caseId:Number(sim.caseId),region,
    targetXYZm:measuredPoint,simProbeXYZm:simPoint,probeOffsetM:discrepancy,maxOffsetM:maxOffset,
    meshEvidence:{...location},probeCellEvidence:{...settings.probeLocation},sourceEvidence:{path:sim.sourcePath,fieldHistoryKey:sim.fieldHistoryKey,
      originalField:sim.field?.original||'',caseId:sim.caseId,region,probe:sim.probe||null,
      sourceUnit:sim.field?.unit,dimensions:dimensions||null},
    experimentalEvidence:{fileName:experimental.fileName||'',unit:experimental.unit,
      timeColumn:experimental.timeColumn||'',temperatureColumn:experimental.temperatureColumn||'',
      sourceSamples:b.length},settings:{timeShiftS:shift,maxOffsetM:maxOffset},
    commonTime:{start:commonStart,end:commonEnd},metrics,rows,noExtrapolation:true,
    noSpatialInterpolation:true,noAutomaticRecalescenceLabel:true,noCaseMutation:true,
    limitations:[
      'Cell containment confirms only the supplied XYZ in the CURRENT loaded OpenFOAM region mesh, not full physical thermocouple sensor calibration.',
      'Simulation uses an existing field-sampled probe history, not arbitrary new temperatures computed by this comparator.',
      'Source probe versus actual sensor displacement and its user-set tolerance remain explicit; this tool does not claim perfect co-location.',
      'Interpolation is only along observed simulation physical-time data and excludes any experimental samples outside overlap.',
      'Thermal events are observations, not automatically labeled metallurgical recalescence.'
    ]}
}
function tcSensitivity(baseSim,all,experimental,config){
  const root=tcCompare(baseSim,experimental,config);
  if(!root.valid)return{valid:false,reason:root.reason,results:[]};
  const radius=tcNumber(config.sensitivityRadiusM);
  if(!Number.isFinite(radius)||radius<=0)return{valid:true,status:'unavailable',reason:'A positive radius is required',results:[]};
  const mapped=tcXYZ(config.targetXYZ,config.coordinateUnit),family=tcFamily(baseSim),results=[];
  for(const s of all||[]){
    if(s===baseSim||String(s.caseId)!==String(baseSim.caseId)||tcRegion(s)!==config.region||tcFamily(s)!==family)continue;
    const pos=tcProbePoint(s);if(!pos)continue;
    const d=Math.hypot(...pos.map((v,i)=>v-mapped[i]));
    if(!(d>0&&d<=radius))continue;
    // A candidate alternate point needs its OWN verified containing OpenFOAM cell.
    // The primary sensor-cell mapping must never be reused for nearby probes.
    const alternateLocation=typeof config.locateAlternative==='function'?config.locateAlternative(pos):null;
    if(!alternateLocation?.verified||alternateLocation.status!=='contained')continue;
    const next=tcCompare(s,experimental,{...config,probeLocation:alternateLocation,maxOffsetM:radius});
    if(!next.valid)continue;
    results.push({probeSource:s.sourcePath,probeXYZm:pos,distanceFromSensorM:d,
      rmseK:next.metrics.rmse,deltaRMSEK:next.metrics.rmse-root.metrics.rmse,
      n:next.metrics.n,method:'independently sampled existing OpenFOAM probe history, no spatial interpolation'})
    if(results.length>=100)break
  }
  results.sort((a,b)=>a.distanceFromSensorM-b.distanceFromSensorM);
  return{valid:true,status:results.length?'measured-alternatives':'unavailable',
    reason:results.length?'':"No independently measured alternative source histories within radius and same field family",
    radiusM:radius,baseRMSEK:root.metrics.rmse,results,
    noSyntheticDisplacementSamples:true}
}
/* FOAMLENS_TC_MAPPING_CORE_END */

function tcUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function tcEsc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let tcFile=null,tcRows=null,tcSources=[],tcLast=null,tcRuntime=null,tcSequence=0;
function tcEl(id){return document.getElementById(id)}
function tcInvalidate(message=''){
  tcLast=null;tcRuntime=null;for(const id of ['tcExportJson','tcExportCsv']){const el=tcEl(id);if(el)el.disabled=true}
  const out=tcEl('tcReport');if(out)out.textContent='';
  const canvas=tcEl('tcPlot'),ctx=canvas?.getContext?.('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  const s=tcEl('tcStatus');if(s&&message)s.textContent=message
}
function tcSourceCatalog(){
  return (Array.isArray(series)?series:[]).filter(s=>{
    if(datasetTypeOf(s)!=='timeseries'||!tcProbePoint(s)||!tcRegion(s)||
       !String(s.sourcePath||'').startsWith('derived:field3d-probe-history|'))return false;
    if(!tcTempUnit(s.field?.unit))return false;
    if(s.field?.dimensions&&s.field.dimensions!=='[0 0 0 1 0 0 0]')return false;
    return !!tcSeriesPairs(s.t,s.y)
  })
}
function tcRefreshSources(){
  const select=tcEl('tcSim');if(!select)return;
  const old=tcSources[Number(select.value)]||null;
  tcInvalidate();tcSources=tcSourceCatalog();
  select.innerHTML='<option value="">'+tcEsc(tcUi('Choose 3D source probe','Selecciona una sonda 3D real'))+'</option>'+
    tcSources.map((s,i)=>'<option value="'+i+'">'+tcEsc((caseById(Number(s.caseId))?.name||s.caseName||'Case')+
      ' · '+tcRegion(s)+' · '+(s.field?.display||s.field?.canonical||'T')+
      ' · '+tcProbePoint(s).map(x=>x.toPrecision(4)).join(', ')+' m')+'</option>').join('');
  const idx=tcSources.indexOf(old);if(idx>=0)select.value=String(idx);
  tcEl('tcStatus').textContent=tcSources.length+
    tcUi(' real temperature probe histories available. Generate a source history in Data → 3D field history if none exist.',
         ' historiales de temperatura de sondas reales. Genera uno en Datos → Historia de campo 3D si no hay.')
}
function tcExperimentFromTable(raw,filename){
  if(typeof evParseTable!=='function')throw Error('Existing CSV parser not loaded');
  const dataLines=String(raw).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!/^\s*#/.test(x));
  const table=evParseTable(raw),count=dataLines.length-(table.hasHeader?1:0);
  if(table.headers.length<2||table.rows.length!==count||count<2)
    throw Error('CSV has missing/non-numeric samples; none may be silently discarded');
  return{table,fileName:filename,rawRows:count}
}
function tcReadExperiment(){
  if(!tcRows)return null;
  const a=Number(tcEl('tcTimeColumn')?.value),b=Number(tcEl('tcTempColumn')?.value);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0)return null;
  const rows=tcRows.table.rows,ts=rows.map(row=>row[a]),ys=rows.map(row=>row[b]);
  if(!tcSeriesPairs(ts,ys))return null;
  return{t:ts,y:ys,unit:tcEl('tcExperimentalUnit').value,fileName:tcRows.fileName,
    timeColumn:tcRows.table.headers[a],temperatureColumn:tcRows.table.headers[b]}
}
async function tcImport(){
  const file=tcEl('tcFile')?.files?.[0];if(!file)return;
  const seq=++tcSequence;tcInvalidate();
  if(file.size>4*1024*1024){tcEl('tcStatus').textContent='Experimental file exceeds 4 MiB limit';return}
  try{
    const raw=await file.text();if(seq!==tcSequence)return;
    const d=tcExperimentFromTable(raw,file.name);tcRows=d;
    const auto=evAutoColumns(d.table),opts=d.table.headers.map((h,i)=>'<option value="'+i+'">'+tcEsc(h)+'</option>').join('');
    tcEl('tcTimeColumn').innerHTML=opts;tcEl('tcTempColumn').innerHTML=opts;
    tcEl('tcTimeColumn').value=String(auto.time);tcEl('tcTempColumn').value=String(auto.temperature);
    tcEl('tcStatus').textContent=d.fileName+' · '+d.rawRows+' samples · check time/temperature columns and units';
  }catch(e){tcRows=null;tcEl('tcStatus').textContent=String(e?.message||e)}
}
function tcActiveMesh(source){
  const mesh=typeof fvState!=='undefined'?fvState?.mesh:null;
  if(!mesh)return null;
  if(String(fvState.caseId)!==String(source.caseId)||String(fvState.region||'')!==tcRegion(source))return null;
  return mesh
}
function tcLocateLive(mesh,point){
  let nearby=null;
  if(typeof fvBuildSpatialHash==='function'&&typeof fvNearbyCells==='function'&&mesh?.cellCenters?.length){
    const hash=fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount);
    nearby=(xyz)=>fvNearbyCells(hash,xyz,3)
  }
  return tcLocate(mesh,point,typeof fvCellContainsPoint==='function'?fvCellContainsPoint:null,nearby)
}
function tcRun(){
  tcInvalidate();const value=tcEl('tcSim')?.value,source=value!==''?tcSources[Number(value)]:null,exp=tcReadExperiment();
  if(!source||!exp){tcEl('tcStatus').textContent='Select a source 3D probe history and valid experimental time/temperature columns';return}
  const xyz=[tcEl('tcX').value,tcEl('tcY').value,tcEl('tcZ').value],
    unit=tcEl('tcXYZUnit').value,point=tcXYZ(xyz,unit),
    mesh=tcActiveMesh(source),loc=tcLocateLive(mesh,point),probeLoc=tcLocateLive(mesh,tcProbePoint(source)),
    options={caseId:source.caseId,region:tcRegion(source),targetXYZ:xyz,coordinateUnit:unit,location:loc,
      probeLocation:probeLoc,maxOffsetM:tcEl('tcTolerance').value,timeShiftS:tcEl('tcTimeShift').value,
      sensitivityRadiusM:tcEl('tcSensitivityRadius').value,locateAlternative:p=>tcLocateLive(mesh,p)};
  const result=tcCompare(source,exp,options);
  if(!result.valid){tcEl('tcStatus').textContent=result.reason+' · Mapping: '+loc.status+' ('+loc.reason+'). Load the exact 3D case/region in Field to verify the cell.';return}
  const sensitivity=tcSensitivity(source,tcSources,exp,options);
  tcLast={...result,sensitivity};tcRuntime={mesh,source};
  const fmt=x=>Number(x).toLocaleString(undefined,{maximumSignificantDigits:7});
  tcEl('tcStatus').textContent='Cell '+loc.cellId+' verified in source region · '+result.metrics.n+' paired measurements · no extrapolation';
  const m=result.metrics;
  tcEl('tcReport').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr><th>Case/region</th><th>Cell ID</th><th>Probe offset [m]</th><th>N</th><th>RMSE [K]</th><th>MAE [K]</th><th>Bias sim−exp [K]</th><th>Max |Δ| [K]</th></tr></thead><tbody><tr>'+
    [tcRegion(source),loc.cellId,fmt(result.probeOffsetM),m.n,fmt(m.rmse),fmt(m.mae),fmt(m.bias),fmt(m.maxAbs)]
      .map(x=>'<td>'+tcEsc(x)+'</td>').join('')+'</tr></tbody></table></div>'+
    '<p class="smallnote">Position sensitivity: '+tcEsc(sensitivity.status)+' · '+tcEsc(sensitivity.reason||'')+
    ' · '+sensitivity.results.length+' independent alternative probe histories. No spatial values inferred.</p>'+
    '<p class="smallnote">'+tcEsc(result.limitations.join(' '))+'</p>';
  const sensitivities=sensitivity.results.map(row=>'<tr>'+[
    row.probeXYZm.map(x=>x.toPrecision(5)).join(', '),fmt(row.distanceFromSensorM),
    fmt(row.rmseK),fmt(row.deltaRMSEK),row.n
  ].map(v=>'<td>'+tcEsc(v)+'</td>').join('')+'</tr>').join('');
  if(sensitivities)tcEl('tcReport').innerHTML+='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    ['Alternative measured probe XYZ [m]','Sensor distance [m]','RMSE [K]','ΔRMSE [K]','N']
       .map(x=>'<th>'+tcEsc(x)+'</th>').join('')+'</tr></thead><tbody>'+sensitivities+'</tbody></table></div>';
  tcDraw(result);
  tcEl('tcExportJson').disabled=false;tcEl('tcExportCsv').disabled=false
}
function tcDraw(result){
  const canvas=tcEl('tcPlot');if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const width=Math.max(280,canvas.clientWidth||700),height=220,ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  if(!result?.rows?.length)return;
  const rows=result.rows,t0=rows[0].timeS,t1=rows.at(-1).timeS;
  let min=Math.min(...rows.map(r=>Math.min(r.simulationK,r.experimentK))),
      max=Math.max(...rows.map(r=>Math.max(r.simulationK,r.experimentK)));
  if(max===min){min-=.5;max+=.5}
  const left=50,right=15,top=24,bottom=30;
  const x=t=>left+(t-t0)/(t1-t0)*(width-left-right);
  const y=v=>top+(max-v)/(max-min)*(height-top-bottom);
  ctx.strokeStyle='#778899';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,height-bottom);
  ctx.lineTo(width-right,height-bottom);ctx.stroke();
  for(const [key,color,label] of [['simulationK','#41b5e5','Sim'],['experimentK','#e8aa56','Exp']]){
    ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.beginPath();
    rows.forEach((r,i)=>{if(i===0)ctx.moveTo(x(r.timeS),y(r[key]));else ctx.lineTo(x(r.timeS),y(r[key]))});
    ctx.stroke();
    ctx.fillStyle=color;ctx.font='12px sans-serif';ctx.fillText(label,key==='simulationK'?left+9:left+55,15);
  }
  ctx.fillStyle='#a8b2c4';ctx.font='11px sans-serif';ctx.fillText(t0.toPrecision(5)+' s',left,height-8);
  ctx.fillText(t1.toPrecision(5)+' s',Math.max(left,width-right-80),height-8);
  ctx.fillText('K',17,top+5)
}
function tcDownload(name,content,mime){
  if(typeof downloadText==='function'){downloadText(name,content,mime);return}
  const u=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1500)
}
function tcExport(kind){
  if(!tcLast||!tcRuntime)return;
  const source=tcRuntime.source;
  if(!Array.isArray(series)||!series.includes(source)||tcActiveMesh(source)!==tcRuntime.mesh){
    tcInvalidate('OpenFOAM case/region, geometry or probe source changed since verification. Recalculate before exporting.');
    return
  }
  if(kind==='json')return tcDownload('FoamLens_thermocouple_XYZ.json',
    JSON.stringify({...tcLast,exportedAt:new Date().toISOString()},null,2),'application/json');
  const h='time_s,simulation_K,experiment_K,sim_minus_exp_K,simulation_temporal_method';
  tcDownload('FoamLens_thermocouple_XYZ.csv',[h,...tcLast.rows.map(r=>
    [r.timeS,r.simulationK,r.experimentK,r.simMinusExpK,r.simulationTimeSource].join(','))].join('\n')+'\n','text/csv')
}
function tcInstall(){
  const host=document.getElementById('generalAnalysisModules');if(!host||tcEl('tcTools'))return;
  const box=document.createElement('details');box.id='tcTools';box.className='detailBlock';box.style.marginTop='12px';
  box.innerHTML='<summary><b data-fl-en="Granada · Thermocouple XYZ Mapping" data-fl-es="Granada · Mapeo XYZ de termopares">Granada · Thermocouple XYZ Mapping</b></summary>'+
    '<p class="smallnote">Validate physical experimental sensor XYZ against the matching loaded OpenFOAM cell and an actual 3D Probe temperature history. A bounding box or nearest cell alone NEVER certifies that the sensor lies in the material.</p>'+
    '<div class="field"><label>OpenFOAM 3D temperature probe source</label><select id="tcSim"></select></div>'+
    '<div class="extGrid3"><div class="field"><label>Sensor X</label><input id="tcX" type="number" step="any" value=""></div>'+
    '<div class="field"><label>Sensor Y</label><input id="tcY" type="number" step="any" value=""></div>'+
    '<div class="field"><label>Sensor Z</label><input id="tcZ" type="number" step="any" value=""></div></div>'+
    '<div class="extGrid3"><div class="field"><label>XYZ coordinate unit</label><select id="tcXYZUnit"><option value="">Choose</option><option value="m">Meters</option><option value="mm">Millimeters</option><option value="cm">Centimeters</option></select></div>'+
    '<div class="field"><label>Maximum probe-to-sensor distance [m]</label><input id="tcTolerance" type="number" min="0" step="any" value="0"></div>'+
    '<div class="field"><label>Test alternate measured probes within [m]</label><input id="tcSensitivityRadius" type="number" min="0" step="any" value="0"></div></div>'+
    '<div class="extActions"><input id="tcFile" type="file" accept=".csv,.txt,.tsv,.dat">'+
    '<button id="tcImport" type="button" class="btn soft">Import experimental CSV/TXT</button>'+
    '<button id="tcRefresh" type="button" class="btn soft">Refresh 3D Probe histories</button></div>'+
    '<div class="extGrid3"><div class="field"><label>Time column [s]</label><select id="tcTimeColumn"></select></div>'+
    '<div class="field"><label>Temperature column</label><select id="tcTempColumn"></select></div>'+
    '<div class="field"><label>Experiment temperature unit</label><select id="tcExperimentalUnit"><option value="K">K</option><option value="C">°C</option></select></div></div>'+
    '<div class="field"><label>Experimental time shift [s] (explicit, no automatic time fitting)</label><input id="tcTimeShift" type="number" step="any" value="0"></div>'+
    '<div class="extActions"><button id="tcCalculate" type="button" class="btn primary">Verify cell and compare measured curves</button>'+
    '<button id="tcExportJson" type="button" class="btn soft" disabled>Export evidence JSON</button>'+
    '<button id="tcExportCsv" type="button" class="btn soft" disabled>Export paired CSV</button></div>'+
    '<p class="smallnote" id="tcStatus" aria-live="polite"></p><canvas id="tcPlot" style="width:100%;height:220px" aria-label="Simulated and experimental Kelvin curves over common physical time"></canvas><div id="tcReport"></div>'+
    '<p class="smallnote">Mapping uses verified polyhedral containment from the current loaded 3D Field case/region. Absent topology or a missing source history blocks comparison. No automatic recalescence diagnosis.</p>';
  host.appendChild(box);
  tcEl('tcImport').onclick=()=>void tcImport();
  tcEl('tcRefresh').onclick=tcRefreshSources;tcEl('tcCalculate').onclick=tcRun;
  tcEl('tcExportJson').onclick=()=>tcExport('json');tcEl('tcExportCsv').onclick=()=>tcExport('csv');
  for(const id of ['tcSim','tcX','tcY','tcZ','tcXYZUnit','tcTolerance','tcSensitivityRadius',
    'tcTimeColumn','tcTempColumn','tcExperimentalUnit','tcTimeShift']){
    const el=tcEl(id);el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>tcInvalidate('Inputs changed; verify again before exporting.'))
  }
  tcEl('tcFile').addEventListener('change',()=>{tcRows=null;tcInvalidate('New experiment file chosen; import it before comparing.')});
  box.addEventListener('toggle',()=>{if(box.open)tcRefreshSources()});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(box)}catch{}
  tcRefreshSources()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tcInstall,{once:true});else tcInstall();
window.FoamLensThermocoupleXYZ={coordinates:tcXYZ,locate:tcLocate,compare:tcCompare,sensitivity:tcSensitivity};
