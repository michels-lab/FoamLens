/* FoamLens Desktop v1.4.1 — simulation vs experiment validation. */

/* FOAMLENS_EXPERIMENTAL_VALIDATION_CORE_START */
function evNorm(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'')}
function evSplitDelimitedLine(line,delimiter){
  const s=String(line||'');if(delimiter==='whitespace')return s.trim().split(/\s+/).filter(Boolean);
  const out=[];let cur='',quote=false,qchar='';
  for(let i=0;i<s.length;i++){const ch=s[i];if(quote){if(ch===qchar){if(s[i+1]===qchar){cur+=ch;i++}else quote=false}else cur+=ch}else if(ch==='"'||ch==="'"){quote=true;qchar=ch}else if(ch===delimiter){out.push(cur.trim());cur=''}else cur+=ch}
  out.push(cur.trim());return out
}
function evDetectDelimiter(lines){
  const sample=(lines||[]).filter(x=>String(x).trim()&&!/^\s*#/.test(x)).slice(0,12);if(!sample.length)return'whitespace';
  const score=d=>{
    const counts=sample.map(l=>evSplitDelimitedLine(l,d).length),freq=new Map();for(const n of counts)if(n>=2)freq.set(n,(freq.get(n)||0)+1);
    if(!freq.size)return-1;
    const [mode,count]=[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0],inconsistent=counts.filter(n=>n!==mode).length;
    return count*100+mode*5-inconsistent*20
  };
  const candidates=[',',';','\t'],rank=candidates.map(d=>[d,score(d)]).sort((a,b)=>b[1]-a[1]);return rank[0][1]>=0?rank[0][0]:'whitespace'
}
function evParseNumber(value,delimiter='whitespace'){
  let s=String(value??'').trim().replace(/^["']|["']$/g,'');if(!s)return NaN;
  if(delimiter===';'&&/^[-+]?\d+(?:,\d+)?(?:[eE][-+]?\d+)?$/.test(s))s=s.replace(',','.');
  const v=Number(s);return Number.isFinite(v)?v:NaN
}
function evParseTable(text){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!/^\s*#/.test(x));
  const delimiter=evDetectDelimiter(lines);if(!lines.length)return{delimiter,headers:[],rows:[],hasHeader:false};
  const first=evSplitDelimitedLine(lines[0],delimiter),firstNums=first.map(x=>evParseNumber(x,delimiter)),hasHeader=firstNums.filter(Number.isFinite).length<Math.max(2,Math.ceil(first.length*.6));
  const headers=(hasHeader?first:first.map((_,i)=>'Column '+(i+1))).map((x,i)=>String(x||('Column '+(i+1))).trim());
  const rows=[];
  for(const line of lines.slice(hasHeader?1:0)){const tok=evSplitDelimitedLine(line,delimiter);if(tok.length<2)continue;const row=headers.map((_,i)=>evParseNumber(tok[i],delimiter));if(row.filter(Number.isFinite).length>=2)rows.push(row)}
  return{delimiter,headers,rows,hasHeader}
}
function evAutoColumns(table){
  const h=(table?.headers||[]).map(evNorm),timeAliases=new Set(['time','t','times','seconds','second','sec','s','tiempo','tiempos']),
    tempAliases=new Set(['t','temp','temperature','temperatura','temperaturek','temperaturec','temperaturak','temperaturac','tc','thermocouple']);
  let time=h.findIndex(x=>timeAliases.has(x)||x.startsWith('time')||x.startsWith('tiempo')),temperature=h.findIndex((x,i)=>i!==time&&(tempAliases.has(x)||x.includes('temperature')||x.includes('temperatura')||x.includes('thermocouple')));
  if(time<0)time=0;if(temperature<0)temperature=time===0?1:0;return{time,temperature}
}
function evExtractColumns(table,timeIndex,tempIndex){
  const p=[];for(const row of table?.rows||[]){const t=Number(row?.[timeIndex]),y=Number(row?.[tempIndex]);if(Number.isFinite(t)&&Number.isFinite(y))p.push([t,y])}
  p.sort((a,b)=>a[0]-b[0]);const out=[];for(const q of p){if(out.length&&Math.abs(out.at(-1)[0]-q[0])<=Math.max(1e-12,Math.max(Math.abs(q[0]),1)*1e-10))out[out.length-1]=q;else out.push(q)}
  return{t:out.map(x=>x[0]),y:out.map(x=>x[1])}
}
function evTemperatureToKelvin(values,unit){
  const u=evNorm(unit);return(values||[]).map(Number).map(v=>Number.isFinite(v)?((u==='c'||u==='celsius'||u==='degc'||u==='oc')?v+273.15:v):NaN)
}
function evFinitePairs(t,y){
  const p=[];for(let i=0;i<Math.min(t?.length||0,y?.length||0);i++){const x=Number(t[i]),v=Number(y[i]);if(Number.isFinite(x)&&Number.isFinite(v))p.push([x,v])}
  p.sort((a,b)=>a[0]-b[0]);return p
}
function evInterpolate(t,y,x){
  const p=evFinitePairs(t,y);x=Number(x);if(!p.length||!Number.isFinite(x)||x<p[0][0]||x>p.at(-1)[0])return NaN;
  let lo=0,hi=p.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(p[m][0]<x)lo=m+1;else if(p[m][0]>x)hi=m-1;else return p[m][1]}
  if(lo<=0||lo>=p.length)return NaN;const a=p[lo-1],b=p[lo],f=(x-a[0])/(b[0]-a[0]);return a[1]+f*(b[1]-a[1])
}
function evCompareCurves(simT,simY,expT,expY,expShift=0){
  const st=evFinitePairs(simT,simY),ep=evFinitePairs(expT,expY).map(([t,y])=>[t+Number(expShift||0),y]);if(st.length<2||ep.length<2)return{valid:false,n:0};
  const tt=[],sim=[],exp=[],diff=[];
  for(const [t,e] of ep){const s=evInterpolate(st.map(q=>q[0]),st.map(q=>q[1]),t);if(!Number.isFinite(s))continue;tt.push(t);sim.push(s);exp.push(e);diff.push(s-e)}
  if(!diff.length)return{valid:false,n:0};
  const abs=diff.map(Math.abs),mae=abs.reduce((a,b)=>a+b,0)/abs.length,rmse=Math.sqrt(diff.reduce((a,b)=>a+b*b,0)/diff.length),bias=diff.reduce((a,b)=>a+b,0)/diff.length;
  return{valid:true,n:diff.length,t:tt,sim,exp,diff,mae,rmse,bias,maxAbs:Math.max(...abs),range:{start:tt[0],end:tt.at(-1)},noExtrapolation:true}
}
function evDerivative(t,y){
  const p=evFinitePairs(t,y),tt=p.map(q=>q[0]),out=new Array(p.length).fill(NaN);if(p.length<2)return{t:tt,y:out};
  for(let i=0;i<p.length;i++){let a,b;if(i===0){a=p[0];b=p[1]}else if(i===p.length-1){a=p[i-1];b=p[i]}else{a=p[i-1];b=p[i+1]}const dt=b[0]-a[0];out[i]=dt>0?(b[1]-a[1])/dt:NaN}
  return{t:tt,y:out}
}
function evCurveMinimum(t,y){
  const p=evFinitePairs(t,y);if(!p.length)return null;let best=p[0];for(const q of p)if(q[1]<best[1])best=q;return{time:best[0],temperature:best[1]}
}
function evThermalRebound(t,y,{slopeThreshold=0.05,minDuration=.05,minAmplitude=.1}={}){
  const p=evFinitePairs(t,y);if(p.length<4)return null;const tt=p.map(q=>q[0]),yy=p.map(q=>q[1]),d=evDerivative(tt,yy).y,candidates=[];
  for(let i=1;i<d.length-1;){
    if(!(Number.isFinite(d[i])&&d[i]>slopeThreshold)){i++;continue}
    const start=i;let j=i;while(j+1<d.length&&Number.isFinite(d[j+1])&&d[j+1]>slopeThreshold)j++;
    const duration=tt[j]-tt[start];if(duration>=minDuration){
      let minI=Math.max(0,start-1);for(let k=Math.max(0,start-3);k<=start;k++)if(yy[k]<yy[minI])minI=k;
      let peakI=start;for(let k=start;k<=Math.min(yy.length-1,j+2);k++)if(yy[k]>yy[peakI])peakI=k;
      const amplitude=yy[peakI]-yy[minI],maxSlope=Math.max(...d.slice(start,j+1).filter(Number.isFinite));
      if(amplitude>=minAmplitude)candidates.push({startIndex:start,endIndex:j,tMin:tt[minI],Tmin:yy[minI],tPeak:tt[peakI],Tpeak:yy[peakI],amplitude,maxSlope,duration})
    }
    i=Math.max(i+1,j+1)
  }
  if(!candidates.length)return null;candidates.sort((a,b)=>b.amplitude-a.amplitude||a.tMin-b.tMin);return candidates[0]
}
function evCrossingTime(t,y,threshold,direction='down'){
  const p=evFinitePairs(t,y);for(let i=1;i<p.length;i++){const [ta,ya]=p[i-1],[tb,yb]=p[i],hit=direction==='down'?(ya>threshold&&yb<=threshold):(ya<threshold&&yb>=threshold);if(!hit)continue;const dy=yb-ya;if(dy===0)return tb;const f=(threshold-ya)/dy;return ta+f*(tb-ta)}return NaN
}
function evPhaseMetrics(t,alpha,{onsetThreshold=.99,completionThreshold=.01}={}){
  const onset=evCrossingTime(t,alpha,onsetThreshold,'down'),completion=evCrossingTime(t,alpha,completionThreshold,'down');
  return{onsetThreshold,completionThreshold,onset,completion,duration:Number.isFinite(onset)&&Number.isFinite(completion)&&completion>=onset?completion-onset:NaN}
}
function evPhaseEvidenceAtRebound(phaseT,phaseY,rebound,tolerance=1e-4){
  if(!rebound)return{state:'unavailable',alphaStart:NaN,alphaEnd:NaN,delta:NaN};
  const a=evInterpolate(phaseT,phaseY,rebound.tMin),b=evInterpolate(phaseT,phaseY,rebound.tPeak),delta=b-a;if(!Number.isFinite(a)||!Number.isFinite(b))return{state:'unavailable',alphaStart:a,alphaEnd:b,delta:NaN};
  return{state:delta<-Math.abs(tolerance)?'solidifying':delta>Math.abs(tolerance)?'remelting':'approximately-stationary',alphaStart:a,alphaEnd:b,delta}
}
/* FOAMLENS_EXPERIMENTAL_VALIDATION_CORE_END */

const evState={table:null,fileName:'',experimental:null,last:null};
function evUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(diagEs()?es:en)}catch{return en}}
function evEsc(v){try{return typeof esc==='function'?esc(String(v??'')):String(v??'')}catch{return String(v??'')}}
function evFmt(v,d=6){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:d}):'—'}
function evTemperatureSeries(){
  return (Array.isArray(series)?series:[]).filter(s=>datasetTypeOf(s)==='timeseries'&&(s?.field?.quantity==='temperature'||String(s?.field?.canonical||'').toLowerCase()==='t')&&evFinitePairs(s.t,s.y).length>=2)
}
function evPhaseSeries(caseId){
  return (Array.isArray(series)?series:[]).filter(s=>datasetTypeOf(s)==='timeseries'&&Number(s?.caseId)===Number(caseId)&&(s?.field?.quantity==='liquid_fraction'||/alpha/i.test(String(s?.field?.canonical||'')))&&evFinitePairs(s.t,s.y).length>=2)
}
function evSeriesLabel(s){
  try{return (caseById(s.caseId)?.name||s.caseName||evUi('Case','Caso'))+' · '+localizedFieldName(s.field)+(s.probe!=null?' · '+evUi('Probe','Sonda')+' '+s.probe:'')}catch{return String(s?.name||s?.fileName||'Series')}
}
function evSimUnit(s){const u=String(s?.field?.unit||s?.unit||'K');return /(?:°?c|celsius)/i.test(u)?'C':'K'}
function evExperimentalData(){
  if(!evState.table)return null;const ti=Number(document.getElementById('evTimeColumn')?.value),yi=Number(document.getElementById('evTempColumn')?.value),raw=evExtractColumns(evState.table,ti,yi),unit=document.getElementById('evExpUnit')?.value||'K';
  return{...raw,yK:evTemperatureToKelvin(raw.y,unit),unit,fileName:evState.fileName,timeColumn:evState.table.headers[ti]||'',temperatureColumn:evState.table.headers[yi]||''}
}
function evSelectedSimulation(){
  const id=document.getElementById('evSimulation')?.value;return evTemperatureSeries().find((s,i)=>String(s.id??i)===String(id))||null
}
function evSelectedPhase(sim){
  const id=document.getElementById('evPhase')?.value;if(!id)return null;return evPhaseSeries(sim?.caseId).find((s,i)=>String(s.id??i)===String(id))||null
}
function evRefreshSelectors(){
  const simSel=document.getElementById('evSimulation'),phaseSel=document.getElementById('evPhase');if(!simSel)return;
  const sims=evTemperatureSeries(),old=simSel.value;simSel.innerHTML=sims.length?sims.map((s,i)=>'<option value="'+evEsc(String(s.id??i))+'">'+evEsc(evSeriesLabel(s))+'</option>').join(''):'<option value="">—</option>';if(sims.some((s,i)=>String(s.id??i)===old))simSel.value=old;
  const sim=evSelectedSimulation()||sims[0]||null,ph=evPhaseSeries(sim?.caseId),oldP=phaseSel.value;phaseSel.innerHTML='<option value="">'+evUi('None / unavailable','Ninguna / no disponible')+'</option>'+ph.map((s,i)=>'<option value="'+evEsc(String(s.id??i))+'">'+evEsc(evSeriesLabel(s))+'</option>').join('');if(ph.some((s,i)=>String(s.id??i)===oldP))phaseSel.value=oldP;
  const run=document.getElementById('evRun');if(run)run.disabled=!(sim&&evState.experimental);
  const badge=document.getElementById('evBadge');if(badge)badge.textContent=evState.experimental?evUi('data ready','datos listos'):evUi('no experiment','sin experimento')
}
function evPopulateColumns(){
  const table=evState.table,tc=document.getElementById('evTimeColumn'),yc=document.getElementById('evTempColumn');if(!table||!tc||!yc)return;const auto=evAutoColumns(table),opts=table.headers.map((h,i)=>'<option value="'+i+'">'+evEsc(h)+'</option>').join('');tc.innerHTML=opts;yc.innerHTML=opts;tc.value=String(auto.time);yc.value=String(auto.temperature);evState.experimental=evExperimentalData();evRefreshSelectors();
  const meta=document.getElementById('evFileMeta');if(meta)meta.textContent=evState.fileName+' · '+table.rows.length.toLocaleString()+' '+evUi('rows','filas')+' · '+evUi('delimiter','delimitador')+' '+(table.delimiter==='\t'?'TAB':table.delimiter)
}
async function evImportFile(file){
  if(!file)return;const text=await file.text(),table=evParseTable(text);if(table.headers.length<2||table.rows.length<2){flSetIssue('evStatus','experimental-table-invalid',{analysis:'Experimental Validation',sourcePath:file.name});return}
  evState.table=table;evState.fileName=file.name;evPopulateColumns();document.getElementById('evStatus').textContent=evUi('Experimental table loaded. Confirm time, temperature and unit before running validation.','Tabla experimental cargada. Confirma tiempo, temperatura y unidad antes de ejecutar la validación.')
}
function evRunValidation(){
  const sim=evSelectedSimulation(),exp=evExperimentalData(),status=document.getElementById('evStatus');if(!exp){flSetIssue(status,'experimental-data-missing',{analysis:'Experimental Validation'});return null}if(!sim){flSetIssue(status,'simulation-temperature-missing',{analysis:'Experimental Validation'});return null}flClearIssue(status)
  evState.experimental=exp;const simYK=evTemperatureToKelvin(sim.y,evSimUnit(sim)),shift=Number(document.getElementById('evTimeShift')?.value)||0,cmp=evCompareCurves(sim.t,simYK,exp.t,exp.yK,shift);
  if(!cmp.valid){flSetIssue(status,'no shared physical-time interval',{analysis:'Experimental Validation',field:sim?.field?.canonical||'Temperature'});return null}
  const slope=Math.max(0,Number(document.getElementById('evSlopeThreshold')?.value)||0),duration=Math.max(0,Number(document.getElementById('evMinDuration')?.value)||0),amp=Math.max(0,Number(document.getElementById('evMinAmplitude')?.value)||0);
  const simMin=evCurveMinimum(cmp.t,cmp.sim),expMin=evCurveMinimum(cmp.t,cmp.exp),simRebound=evThermalRebound(cmp.t,cmp.sim,{slopeThreshold:slope,minDuration:duration,minAmplitude:amp}),expRebound=evThermalRebound(cmp.t,cmp.exp,{slopeThreshold:slope,minDuration:duration,minAmplitude:amp});
  const phase=evSelectedPhase(sim),high=Math.max(0,Math.min(1,Number(document.getElementById('evAlphaOnset')?.value)||.99)),low=Math.max(0,Math.min(1,Number(document.getElementById('evAlphaComplete')?.value)||.01));
  const phaseMetrics=phase?evPhaseMetrics(phase.t,phase.y,{onsetThreshold:high,completionThreshold:low}):null,phaseEvidence=phase?evPhaseEvidenceAtRebound(phase.t,phase.y,simRebound):null;
  const result={simulation:sim,experiment:exp,comparison:cmp,simMin,expMin,simRebound,expRebound,phase,phaseMetrics,phaseEvidence,settings:{timeShift:shift,slopeThreshold:slope,minDuration:duration,minAmplitude:amp,alphaOnset:high,alphaComplete:low},noExtrapolation:true,noAutomaticRecalescenceLabel:true};
  evState.last=result;window.FoamLensLastExperimentalValidation=result;evRender(result);if(status)status.textContent=evUi('Validation calculated on the shared physical-time interval only.','Validación calculada únicamente en el intervalo común de tiempo físico.');return result
}
function evReboundStateLabel(s){return s==='solidifying'?evUi('liquid fraction decreasing (solidifying evidence)','fracción líquida decreciente (evidencia de solidificación)'):s==='remelting'?evUi('liquid fraction increasing (remelting evidence)','fracción líquida creciente (evidencia de refusión)'):s==='approximately-stationary'?evUi('liquid fraction approximately stationary','fracción líquida aproximadamente estacionaria'):evUi('phase evidence unavailable','evidencia de fase no disponible')}
function evRender(r){
  const body=document.getElementById('evResult');if(!body)return;if(!r){body.innerHTML='';return}const c=r.comparison;
  const eventRow=(name,x)=>'<tr><td>'+name+'</td><td>'+evFmt(x?.Tmin)+' K</td><td>'+evFmt(x?.tMin)+' s</td><td>'+evFmt(x?.amplitude)+' K</td><td>'+evFmt(x?.tPeak)+' s</td><td>'+evFmt(x?.maxSlope)+' K/s</td></tr>';
  const minEvent=(m)=>m?{Tmin:m.temperature,tMin:m.time,amplitude:NaN,tPeak:NaN,maxSlope:NaN}:null;
  const simEv=r.simRebound||minEvent(r.simMin),expEv=r.expRebound||minEvent(r.expMin);
  const phase=r.phaseMetrics?'<div class="extTableWrap" style="margin-top:8px"><table class="extTable"><thead><tr><th>'+evUi('Phase evidence','Evidencia de fase')+'</th><th>'+evUi('Value','Valor')+'</th></tr></thead><tbody>'+
    '<tr><td>'+evUi('Liquid-fraction onset crossing','Cruce de inicio de fracción líquida')+' α='+evFmt(r.phaseMetrics.onsetThreshold)+'</td><td>'+evFmt(r.phaseMetrics.onset)+' s</td></tr>'+
    '<tr><td>'+evUi('Liquid-fraction completion crossing','Cruce de finalización de fracción líquida')+' α='+evFmt(r.phaseMetrics.completionThreshold)+'</td><td>'+evFmt(r.phaseMetrics.completion)+' s</td></tr>'+
    '<tr><td>'+evUi('Phase-defined solidification duration','Duración de solidificación definida por fase')+'</td><td>'+evFmt(r.phaseMetrics.duration)+' s</td></tr>'+
    '<tr><td>'+evUi('Phase trend during simulated rebound candidate','Tendencia de fase durante el rebote simulado candidato')+'</td><td>'+evEsc(evReboundStateLabel(r.phaseEvidence?.state))+(Number.isFinite(r.phaseEvidence?.delta)?' · ΔαL='+evFmt(r.phaseEvidence.delta):'')+'</td></tr>'+
    '</tbody></table></div>':'';
  body.innerHTML=
    '<div class="extNote">'+evUi(
      'A positive dT/dt interval is reported only as a thermal rebound candidate. FoamLens does not label recalescence automatically; phase evolution is shown separately as evidence.',
      'Un intervalo con dT/dt positivo se reporta únicamente como candidato de rebote térmico. FoamLens no etiqueta automáticamente recalescencia; la evolución de fase se muestra por separado como evidencia.'
    )+'</div>'+
    '<div class="extTableWrap" style="margin-top:8px"><table class="extTable"><thead><tr><th>N</th><th>RMSE [K]</th><th>MAE [K]</th><th>'+evUi('Bias sim−exp [K]','Sesgo sim−exp [K]')+'</th><th>Max |ΔT| [K]</th><th>'+evUi('Common range','Rango común')+'</th></tr></thead><tbody><tr><td>'+c.n+'</td><td>'+evFmt(c.rmse)+'</td><td>'+evFmt(c.mae)+'</td><td>'+evFmt(c.bias)+'</td><td>'+evFmt(c.maxAbs)+'</td><td>'+evFmt(c.range.start)+'–'+evFmt(c.range.end)+' s</td></tr></tbody></table></div>'+
    '<div class="extTableWrap" style="margin-top:8px"><table class="extTable"><thead><tr><th>'+evUi('Curve','Curva')+'</th><th>Tmin</th><th>t(Tmin)</th><th>'+evUi('Rebound amplitude','Amplitud de rebote')+'</th><th>'+evUi('Rebound peak time','Tiempo de pico del rebote')+'</th><th>max dT/dt</th></tr></thead><tbody>'+eventRow(evUi('Simulation','Simulación'),simEv)+eventRow(evUi('Experiment','Experimento'),expEv)+'</tbody></table></div>'+phase
}
function evAddCurves(){
  const r=evState.last||evRunValidation();if(!r)return;const sim=r.simulation,c=r.comparison,key='experimentalValidation|'+String(sim.id)+'|'+evState.fileName;
  series=series.filter(s=>s.experimentalValidationKey!==key);
  const expField={canonical:'T_experimental',display:evUi('Experimental temperature','Temperatura experimental'),unit:'K',quantity:'temperature',original:evState.fileName};
  const expSeries={id:nextId++,datasetType:'timeseries',caseId:null,caseName:evUi('Experimental','Experimental'),fileName:evState.fileName,sourcePath:'experimental:'+evState.fileName,field:expField,probe:null,location:'',t:c.t.slice(),y:c.exp.slice(),visible:true,color:variableColor(expField),width:2.2,dash:'dash',opacity:1,axis:'Auto',customLabel:'',derived:false,derivedKind:'experimentalValidationInput',experimentalValidationKey:key,experimentalValidation:{role:'experiment',timeShift:r.settings.timeShift}};
  const diffField={canonical:'deltaT_sim_exp',display:'ΔT sim − exp',unit:'K',quantity:'temperature_difference',original:'FoamLens experimental validation'};
  const diffSeries={...expSeries,id:nextId++,field:diffField,fileName:'FoamLens validation residual',sourcePath:'FoamLens experimental validation',t:c.t.slice(),y:c.diff.slice(),dash:'solid',derived:true,derivedKind:'experimentalValidationResidual',experimentalValidation:{role:'residual',simulationSeriesId:sim.id,noExtrapolation:true}};
  series.push(expSeries,diffSeries);activeId=expSeries.id;refreshDatasetControls();if(activeAppMode!=='analysis')setDataView('timeseries');renderList();updateMeta();if(activeAppMode!=='analysis')draw();document.getElementById('evStatus').textContent=evUi('Added experimental temperature and ΔT(sim−exp). Open Time Series to view the derived curves.','Se agregaron la temperatura experimental y ΔT(sim−exp). Abre Series temporales para ver las curvas derivadas.')
}
function evBuildUi(){
  if(document.getElementById('evTools'))return true;const host=document.getElementById('generalAnalysisModules');if(!host)return false;
  const box=document.createElement('div');box.id='evTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b data-fl-en="Experimental Validation" data-fl-es="Validación experimental">Experimental Validation</b><span class="badge" id="evBadge">no experiment</span></div>'+
  '<div class="smallnote" data-fl-en="Compare a loaded simulation temperature curve against raw/digitized experimental time-temperature data without temporal extrapolation." data-fl-es="Compara una curva de temperatura simulada contra datos experimentales tiempo-temperatura raw/digitalizados sin extrapolación temporal.">Compare simulation and experimental T(t).</div>'+
  '<input id="evFileInput" type="file" accept=".csv,.txt,.dat,.tsv" class="hidden"><div class="extActions" style="margin-top:8px"><button class="btn primary" id="evImport" type="button" data-fl-en="Import experimental CSV/TXT" data-fl-es="Importar CSV/TXT experimental">Import experimental CSV/TXT</button></div><div class="extStatus" id="evFileMeta"></div>'+
  '<div class="extGrid3"><div class="field"><label data-fl-en="Time column" data-fl-es="Columna de tiempo">Time column</label><select id="evTimeColumn"></select></div><div class="field"><label data-fl-en="Temperature column" data-fl-es="Columna de temperatura">Temperature column</label><select id="evTempColumn"></select></div><div class="field"><label data-fl-en="Experimental temperature unit" data-fl-es="Unidad de temperatura experimental">Experimental temperature unit</label><select id="evExpUnit"><option value="K">K</option><option value="C">°C</option></select></div></div>'+
  '<div class="field"><label data-fl-en="Simulation temperature series" data-fl-es="Serie de temperatura de simulación">Simulation temperature series</label><select id="evSimulation"></select></div>'+
  '<div class="field"><label data-fl-en="Optional liquid-fraction evidence" data-fl-es="Evidencia opcional de fracción líquida">Optional liquid-fraction evidence</label><select id="evPhase"></select></div>'+
  '<div class="extGrid3"><div class="field"><label data-fl-en="Experimental time shift [s]" data-fl-es="Corrimiento temporal experimental [s]">Experimental time shift [s]</label><input id="evTimeShift" type="number" step="any" value="0"></div><div class="field"><label data-fl-en="Positive-slope threshold [K/s]" data-fl-es="Umbral de pendiente positiva [K/s]">Positive-slope threshold [K/s]</label><input id="evSlopeThreshold" type="number" min="0" step="any" value="0.05"></div><div class="field"><label data-fl-en="Minimum rebound amplitude [K]" data-fl-es="Amplitud mínima de rebote [K]">Minimum rebound amplitude [K]</label><input id="evMinAmplitude" type="number" min="0" step="any" value="0.1"></div></div>'+
  '<div class="extGrid3"><div class="field"><label data-fl-en="Minimum positive-slope duration [s]" data-fl-es="Duración mínima de pendiente positiva [s]">Minimum positive-slope duration [s]</label><input id="evMinDuration" type="number" min="0" step="any" value="0.05"></div><div class="field"><label data-fl-en="Liquid onset threshold αL" data-fl-es="Umbral de inicio líquido αL">Liquid onset threshold αL</label><input id="evAlphaOnset" type="number" min="0" max="1" step="0.01" value="0.99"></div><div class="field"><label data-fl-en="Liquid completion threshold αL" data-fl-es="Umbral de finalización líquido αL">Liquid completion threshold αL</label><input id="evAlphaComplete" type="number" min="0" max="1" step="0.01" value="0.01"></div></div>'+
  '<div class="extActions"><button class="btn primary" id="evRun" type="button" data-fl-en="Run validation" data-fl-es="Ejecutar validación">Run validation</button><button class="btn" id="evAddCurves" type="button" data-fl-en="Add experiment + residual to chart" data-fl-es="Agregar experimento + residual a la gráfica">Add experiment + residual to chart</button></div><div class="extStatus" id="evStatus"></div><div id="evResult"></div>';
  host.appendChild(box);try{flApplyBilingualText(box)}catch{}
  document.getElementById('evImport').onclick=()=>document.getElementById('evFileInput').click();document.getElementById('evFileInput').onchange=e=>evImportFile(e.target.files?.[0]);document.getElementById('evRun').onclick=evRunValidation;document.getElementById('evAddCurves').onclick=evAddCurves;
  for(const id of ['evTimeColumn','evTempColumn','evExpUnit'])document.getElementById(id).addEventListener('change',()=>{evState.experimental=evExperimentalData();evState.last=null;evRender(null);evRefreshSelectors()});
  document.getElementById('evSimulation').addEventListener('change',()=>{evRefreshSelectors();evState.last=null;evRender(null)});
  for(const id of ['evPhase','evTimeShift','evSlopeThreshold','evMinAmplitude','evMinDuration','evAlphaOnset','evAlphaComplete'])document.getElementById(id).addEventListener('change',()=>{evState.last=null;evRender(null)});
  evRefreshSelectors();return true
}
function evInstall(){
  evBuildUi();
  try{const prev=refreshDatasetControls;if(typeof prev==='function'&&!prev.__evPatched){refreshDatasetControls=function(...args){const x=prev.apply(this,args);setTimeout(()=>{evBuildUi();evRefreshSelectors()},0);return x};refreshDatasetControls.__evPatched=true}}catch{}
  document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('evTools');if(box)try{flApplyBilingualText(box)}catch{};evRefreshSelectors();if(evState.last)evRender(evState.last)});
  return true
}
evInstall();
window.FoamLensExperimentalValidation={evNorm,evSplitDelimitedLine,evDetectDelimiter,evParseNumber,evParseTable,evAutoColumns,evExtractColumns,evTemperatureToKelvin,evInterpolate,evCompareCurves,evDerivative,evCurveMinimum,evThermalRebound,evCrossingTime,evPhaseMetrics,evPhaseEvidenceAtRebound,evRunValidation};
