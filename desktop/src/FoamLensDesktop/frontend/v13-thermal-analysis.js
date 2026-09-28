/* FoamLens Desktop v1.3.0 — general thermal analysis. */

/* FOAMLENS_THERMAL_ANALYSIS_CORE_START */
function thPairs(x,y){
  const out=[];for(let i=0;i<Math.min(x?.length||0,y?.length||0);i++){const xx=Number(x[i]),yy=Number(y[i]);if(Number.isFinite(xx)&&Number.isFinite(yy))out.push([xx,yy])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&Math.abs(d.at(-1)[0]-p[0])<=1e-12*Math.max(1,Math.abs(p[0])))d[d.length-1]=p;else d.push(p)}return d
}
function thDerivative(x,y){
  const p=thPairs(x,y),xx=p.map(q=>q[0]),out=new Array(p.length).fill(NaN);if(p.length<2)return{x:xx,y:out};
  for(let i=0;i<p.length;i++){let a,b;if(i===0){a=p[0];b=p[1]}else if(i===p.length-1){a=p[i-1];b=p[i]}else{a=p[i-1];b=p[i+1]}const dx=b[0]-a[0];out[i]=dx!==0?(b[1]-a[1])/dx:NaN}
  return{x:xx,y:out}
}
function thIntegral(x,y){
  const p=thPairs(x,y);let a=0;for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0];if(dx>0)a+=.5*(p[i-1][1]+p[i][1])*dx}return a
}
function thWeightedStats(x,y){
  const p=thPairs(x,y);if(!p.length)return{count:0,min:NaN,max:NaN,mean:NaN,rms:NaN,span:NaN};
  const vals=p.map(q=>q[1]),span=p.length>1?p.at(-1)[0]-p[0][0]:0;let a=0,a2=0;
  if(span>0)for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0];a+=.5*(p[i-1][1]+p[i][1])*dx;a2+=.5*(p[i-1][1]**2+p[i][1]**2)*dx}
  return{count:vals.length,min:Math.min(...vals),max:Math.max(...vals),mean:span>0?a/span:vals.reduce((s,v)=>s+v,0)/vals.length,rms:span>0?Math.sqrt(Math.max(0,a2/span)):Math.sqrt(vals.reduce((s,v)=>s+v*v,0)/vals.length),span}
}
function thIntervals(x,values,epsilon=0){
  const out=[];let start=null,last=null;
  for(let i=0;i<Math.min(x?.length||0,values?.length||0);i++){const xx=Number(x[i]),v=Number(values[i]),on=Number.isFinite(xx)&&Number.isFinite(v)&&v>epsilon;if(on&&start==null)start=xx;if(on)last=xx;if(!on&&start!=null){out.push({start,end:last??start});start=null;last=null}}
  if(start!=null)out.push({start,end:last??start});return out
}
function thAnalyzeTemperature(t,T,epsilon=1e-12){
  const p=thPairs(t,T),tt=p.map(q=>q[0]),temp=p.map(q=>q[1]),d=thDerivative(tt,temp).y,cooling=d.map(v=>Number.isFinite(v)?Math.max(-v,0):NaN),heating=d.map(v=>Number.isFinite(v)?Math.max(v,0):NaN);
  const s=thWeightedStats(tt,temp);
  return{t:tt,temperature:temp,dTdt:d,coolingRate:cooling,heatingRate:heating,statistics:s,coolingIntegral:thIntegral(tt,cooling),heatingIntegral:thIntegral(tt,heating),coolingIntervals:thIntervals(tt,cooling,epsilon),heatingIntervals:thIntervals(tt,heating,epsilon)}
}
function thRoleStatement(role){
  const m={
    temperature:'Temperature signal. Cooling/heating rates are physical-time derivatives.',
    thermalGradient:'Thermal gradient. Direction/sign interpretation depends on the selected coordinate or component.',
    heatFlux:'Heat flux. This is not energy unless integrated over area and time with compatible metadata.',
    energyFlux:'Energy flux. This is not total energy unless the selected data and integration define it.',
    sensibleEnthalpy:'Sensible enthalpy contribution only; do not label it total energy.',
    latentHeat:'Latent-heat contribution only; it is kept separate from sensible energy unless explicitly combined.',
    boundaryPower:'Boundary/interface power. Sign convention must come from the source/output definition.',
    userDefined:'User-defined thermal quantity; FoamLens applies descriptive statistics only.'
  };return m[role]||m.userDefined
}
/* FOAMLENS_THERMAL_ANALYSIS_CORE_END */

function thSources(){
  return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{const d=datasetTypeOf(s);return(d==='timeseries'||d==='profile')&&thPairs(s.t,s.y).length>=2&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))}catch{return false}})
}
function thId(s,i){return String(s?.id??i)}
function thLabel(s){try{return taSeriesLabel(s)}catch{return String(s?.name||s?.field?.display||s?.field?.canonical||'Series')}}
function thFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function thSelected(){const src=thSources(),id=document.getElementById('thSource')?.value;return src.find((s,i)=>thId(s,i)===String(id))}
function thRole(){return document.getElementById('thRole')?.value||'userDefined'}
function thAddRate(base,name,t,y,kind,formula){
  const baseUnit=String(base?.field?.unit||base?.unit||''),unit=baseUnit&&baseUnit!=='-'?baseUnit+'/s':'1/s',baseDim=String(base?.field?.dimensions||base?.dimensions||''),dimensions=typeof paDimensionsShiftTime==='function'?paDimensionsShiftTime(baseDim,-1):baseDim;
  const d={...base,id:'th_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:t.slice(),y:y.slice(),derived:true,derivedKind:kind,sourceKind:'derived',sourcePath:'FoamLens thermal analysis',visible:true,hidden:false,checked:true,enabled:true,field:{...(base?.field||{}),canonical:'derived:'+name,raw:name,name,displayName:name,unit,dimensions},unit,dimensions,physicalAnalysis:{operation:kind,formula,source:thLabel(base),noRecalescenceInference:true,noTotalEnergyInference:true}};
  series.push(d);return d
}
function thRun(){
  const s=thSelected(),role=thRole(),status=document.getElementById('thStatus'),out=document.getElementById('thResult');if(!s||!status||!out)return;
  const dtype=datasetTypeOf(s),unit=String(s?.field?.unit||s?.unit||''),stats=thWeightedStats(s.t,s.y),statement=thRoleStatement(role),rows=[['Role',role],['Min / Max',thFmt(stats.min)+' / '+thFmt(stats.max)+' '+unit],['Weighted mean',thFmt(stats.mean)+' '+unit],['Weighted RMS',thFmt(stats.rms)+' '+unit]];
  let temperature=null;
  if(role==='temperature'&&dtype==='timeseries'){
    temperature=thAnalyzeTemperature(s.t,s.y,Math.max(0,Number(document.getElementById('thEpsilon')?.value)||0));
    rows.push(['Cooling intervals',temperature.coolingIntervals.length?temperature.coolingIntervals.map(x=>thFmt(x.start)+'–'+thFmt(x.end)+' s').join(', '):'—']);
    rows.push(['Heating intervals',temperature.heatingIntervals.length?temperature.heatingIntervals.map(x=>thFmt(x.start)+'–'+thFmt(x.end)+' s').join(', '):'—']);
  }
  window.FoamLensLastThermalAnalysis={sourceId:s.id??null,source:thLabel(s),caseId:s.caseId??null,caseName:s.caseName||caseById(s.caseId)?.name||'',region:typeof seriesRegion==='function'?seriesRegion(s):'',datasetType:dtype,role,unit,dimensions:s?.field?.dimensions||s?.dimensions||'',statement,statistics:stats,temperature};
  status.textContent=statement+(role==='temperature'&&dtype!=='timeseries'?' Cooling/heating rates require a temporal temperature signal.':'');
  out.innerHTML='<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>'+rows.map(r=>'<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>').join('')+'</tbody></table></div>'
}
function thCreateRates(){
  const s=thSelected();if(!s||thRole()!=='temperature'||datasetTypeOf(s)!=='timeseries')return;
  const a=thAnalyzeTemperature(s.t,s.y,Math.max(0,Number(document.getElementById('thEpsilon')?.value)||0));series=series.filter(x=>x.thermalSourceId!==s.id);
  const c=thAddRate(s,'Cooling Rate: '+thLabel(s),a.t,a.coolingRate,'thermal-cooling-rate','max(−dT/dt,0)');c.thermalSourceId=s.id;
  const h=thAddRate(s,'Heating Rate: '+thLabel(s),a.t,a.heatingRate,'thermal-heating-rate','max(dT/dt,0)');h.thermalSourceId=s.id;activeId=c.id;
  try{refreshDatasetControls();renderList();updateMeta();setDataView('timeseries')}catch{}
}
function thExport(){
  const p=window.FoamLensLastThermalAnalysis;if(!p)return;downloadText('FoamLens_thermal_analysis.json',JSON.stringify({generatedBy:'FoamLens v51-development / Desktop v1.3.0 development',analysis:'thermal-signal-analysis',...p},null,2),'application/json')
}
function thRefresh(){
  const src=thSources(),box=document.getElementById('thTools'),sel=document.getElementById('thSource');if(box)box.style.display=src.length?'':'none';try{refreshGeneralAnalysisHost()}catch{}if(!sel)return;const old=sel.value;
  sel.innerHTML=src.map((s,i)=>`<option value="${thId(s,i).replace(/"/g,'&quot;')}">${thLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old
}
function thBuildUi(){
  if(document.getElementById('thTools'))return;const host=document.getElementById('generalAnalysisModules')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='thTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Thermal Analysis</b><span class="badge">explicit role</span></div>
  <div class="smallnote" style="margin-top:5px">Select the thermal quantity and its role explicitly. FoamLens keeps temperature, gradients, fluxes, sensible enthalpy, latent heat, and boundary/interface power conceptually separate.</div>
  <div class="field" style="margin-top:8px"><label>Thermal signal</label><select id="thSource"></select></div>
  <div class="row2"><div class="field"><label>Interpret as</label><select id="thRole"><option value="temperature">Temperature</option><option value="thermalGradient">Thermal gradient</option><option value="heatFlux">Heat flux</option><option value="energyFlux">Energy flux</option><option value="sensibleEnthalpy">Sensible enthalpy</option><option value="latentHeat">Latent heat</option><option value="boundaryPower">Boundary / interface power</option><option value="userDefined" selected>User defined</option></select></div><div class="field"><label>Rate epsilon</label><input id="thEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary" id="thRun" type="button">Analyze thermal signal</button><button class="btn" id="thCreateRates" type="button">Create cooling + heating rates</button><button class="btn" id="thExport" type="button">Export summary JSON</button></div>
  <div class="smallnote" id="thStatus" style="margin-top:7px"></div><div id="thResult" style="margin-top:8px"></div>`;
  host.appendChild(box);document.getElementById('thRun').onclick=thRun;document.getElementById('thCreateRates').onclick=thCreateRates;document.getElementById('thExport').onclick=thExport;document.getElementById('thRole').onchange=()=>{document.getElementById('thCreateRates').disabled=thRole()!=='temperature'};thRefresh()
}
function thInit(){
  thBuildUi();try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(thRefresh,0);return x}}catch{}
  window.FoamLensThermalAnalysis={thPairs,thDerivative,thIntegral,thWeightedStats,thIntervals,thAnalyzeTemperature,thRoleStatement}
}
thInit();
