/* FoamLens Desktop v1.3.0 — general flow-signal analysis. */

/* FOAMLENS_FLOW_ANALYSIS_CORE_START */
function faPairs(x,y){
  const out=[];for(let i=0;i<Math.min(x?.length||0,y?.length||0);i++){const xx=Number(x[i]),yy=Number(y[i]);if(Number.isFinite(xx)&&Number.isFinite(yy))out.push([xx,yy])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&Math.abs(d.at(-1)[0]-p[0])<=1e-12*Math.max(1,Math.abs(p[0])))d[d.length-1]=p;else d.push(p)}return d
}
function faPercentile(values,p){
  const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;
  const q=Math.max(0,Math.min(1,Number(p))),i=(a.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]+(i-lo)*(a[hi]-a[lo])
}
function faWeightedStats(x,y){
  const p=faPairs(x,y);if(!p.length)return{count:0,min:NaN,max:NaN,mean:NaN,rms:NaN,meanAbs:NaN,p5:NaN,median:NaN,p95:NaN,span:NaN};
  const vals=p.map(q=>q[1]),span=p.length>1?p.at(-1)[0]-p[0][0]:0;
  let integral=0,integral2=0,integralAbs=0;
  if(span>0){
    for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0];integral+=.5*(p[i-1][1]+p[i][1])*dx;integral2+=.5*(p[i-1][1]*p[i-1][1]+p[i][1]*p[i][1])*dx;integralAbs+=.5*(Math.abs(p[i-1][1])+Math.abs(p[i][1]))*dx}
  }
  const arithmetic=vals.reduce((s,v)=>s+v,0)/vals.length;
  const rmsArithmetic=Math.sqrt(vals.reduce((s,v)=>s+v*v,0)/vals.length);
  return{
    count:vals.length,min:Math.min(...vals),max:Math.max(...vals),
    mean:span>0?integral/span:arithmetic,
    rms:span>0?Math.sqrt(Math.max(0,integral2/span)):rmsArithmetic,
    meanAbs:span>0?integralAbs/span:vals.reduce((s,v)=>s+Math.abs(v),0)/vals.length,
    p5:faPercentile(vals,.05),median:faPercentile(vals,.5),p95:faPercentile(vals,.95),span
  }
}
function faZeroCrossings(x,y){
  const p=faPairs(x,y),out=[];
  for(let i=1;i<p.length;i++){
    const [x0,y0]=p[i-1],[x1,y1]=p[i];if(y0===0){if(!out.length||out.at(-1)!==x0)out.push(x0);continue}
    if(y1===0){if(!out.length||out.at(-1)!==x1)out.push(x1);continue}
    if(y0*y1<0){const f=-y0/(y1-y0),xc=x0+f*(x1-x0);if(Number.isFinite(xc))out.push(xc)}
  }
  return out
}
/* FOAMLENS_FLOW_ANALYSIS_CORE_END */

function faSources(){
  return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{
    try{
      const d=datasetTypeOf(s);return(d==='timeseries'||d==='profile')&&faPairs(s.t,s.y).length>=2&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))
    }catch{return false}
  })
}
function faId(s,i){return String(s?.id??i)}
function faLabel(s){
  let base='';try{base=taSeriesLabel(s)}catch{base=String(s?.name||s?.field?.display||s?.field?.canonical||'Series')}
  if(Number.isFinite(Number(s?.profileTime)))base+=' · t='+Number(s.profileTime).toLocaleString(undefined,{maximumSignificantDigits:7})+' s';
  return base
}
function faSelected(){const src=faSources(),id=document.getElementById('faSource')?.value;return src.find((s,i)=>faId(s,i)===String(id))}
function faFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function faAxisInfo(s){
  const d=datasetTypeOf(s);
  if(d==='profile')return{semantic:'spatial coordinate',unit:s.profileCoordUnit||'',symbol:s.profileAxis||'s'};
  return{semantic:'physical time',unit:'s',symbol:'t'}
}
function faInterpretation(){
  return document.getElementById('faInterpretation')?.value||'user-defined'
}
function faRun(){
  const s=faSelected(),status=document.getElementById('faStatus'),out=document.getElementById('faResult');if(!s||!status||!out)return;
  const stats=faWeightedStats(s.t,s.y),cross=faZeroCrossings(s.t,s.y),axis=faAxisInfo(s),unit=s?.field?.unit||s?.unit||'',interp=faInterpretation();
  const weighted=stats.span>0?(datasetTypeOf(s)==='profile'?'coordinate-weighted':'time-weighted'):'sample-based';
  status.textContent=`${stats.count} samples · ${weighted} statistics · interpretation: ${interp}. No flow role is inferred from the case name.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>Min / Max</th><td>${faFmt(stats.min)} / ${faFmt(stats.max)} ${unit}</td><th>Mean</th><td>${faFmt(stats.mean)} ${unit}</td></tr>
  <tr><th>RMS</th><td>${faFmt(stats.rms)} ${unit}</td><th>Mean |value|</th><td>${faFmt(stats.meanAbs)} ${unit}</td></tr>
  <tr><th>P5 / Median / P95</th><td colspan="3">${faFmt(stats.p5)} / ${faFmt(stats.median)} / ${faFmt(stats.p95)} ${unit}</td></tr>
  <tr><th>Zero crossings</th><td>${cross.length}</td><th>${axis.semantic}</th><td>${cross.slice(0,8).map(v=>faFmt(v)+(axis.unit?' '+axis.unit:'')).join(', ')||'—'}${cross.length>8?' …':''}</td></tr>
  </tbody></table></div>`;
  const caseObj=typeof caseById==='function'?caseById(s.caseId):null,region=typeof seriesRegion==='function'?seriesRegion(s):String(s?.region||s?.regionName||'');
  window.FoamLensLastFlowAnalysis={sourceId:s.id??null,source:faLabel(s),caseId:s.caseId??null,caseName:s.caseName||caseObj?.name||'',caseTags:[...(caseObj?.tags||[])],region,field:s?.field?.canonical||s?.field?.raw||s?.name||'',datasetType:datasetTypeOf(s),sourcePath:s?.sourcePath||'',profileTime:Number.isFinite(Number(s?.profileTime))?Number(s.profileTime):null,interpretation:interp,axis,unit,dimensions:s?.field?.dimensions||s?.dimensions||'',statistics:stats,zeroCrossings:cross,weightedBy:weighted}
  const ex=document.getElementById('faExport');if(ex)ex.disabled=false
}
function faExport(){
  const p=window.FoamLensLastFlowAnalysis;if(!p)return;
  downloadText('FoamLens_flow_analysis.json',JSON.stringify({generatedBy:'FoamLens v51-development / Desktop v1.3.0 development',analysis:'flow-signal-statistics',...p},null,2),'application/json')
}
function faRefresh(){
  const src=faSources(),box=document.getElementById('faTools'),sel=document.getElementById('faSource');if(box)box.style.display=src.length?'':'none';try{refreshGeneralAnalysisHost()}catch{}if(!sel)return;
  window.FoamLensLastFlowAnalysis=null;const ex=document.getElementById('faExport');if(ex)ex.disabled=true;
  const old=sel.value;sel.innerHTML=src.map((s,i)=>`<option value="${faId(s,i).replace(/"/g,'&quot;')}">${faLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old
}
function faBuildUi(){
  if(document.getElementById('faTools'))return;
  const host=document.getElementById('generalAnalysisModules')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='faTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Flow Analysis</b><span class="badge">general signal</span></div>
  <div class="smallnote" style="margin-top:5px">Select the velocity component, speed/magnitude, vorticity, or other flow signal you want to interpret. FoamLens does not infer the role from a case name. Means and RMS values are weighted by physical time or spatial coordinate, so adaptive/nonuniform sampling does not bias them by sample count.</div>
  <div class="field" style="margin-top:8px"><label>Flow signal</label><select id="faSource"></select></div>
  <div class="field"><label>Interpret as</label><select id="faInterpretation"><option value="user-defined" selected>User-defined flow signal</option><option value="velocity-component">Velocity component</option><option value="speed-magnitude">Speed / vector magnitude</option><option value="vorticity">Vorticity</option><option value="other">Other</option></select></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary" id="faRun" type="button">Analyze flow signal</button><button class="btn" id="faExport" type="button" disabled>Export summary JSON</button></div>
  <div class="smallnote" id="faStatus" style="margin-top:7px"></div><div id="faResult" style="margin-top:8px"></div>`;
  host.appendChild(box);document.getElementById('faRun').onclick=faRun;document.getElementById('faExport').onclick=faExport;faRefresh()
}
function faInit(){
  faBuildUi();try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(faRefresh,0);return x}}catch{}
  window.FoamLensFlowAnalysis={faPairs,faPercentile,faWeightedStats,faZeroCrossings}
}
faInit();
