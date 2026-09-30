/* FoamLens Desktop v1.3.0 — temporal alignment and quantitative differences.
   Injected into the main FoamLens IIFE by the native host so it can reuse the
   application's existing series/case model without duplicating the frontend. */

/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_START */
function taAlmostEqual(a,b,tol=1e-10){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b))}
function taFinitePairs(s){
  const t=Array.isArray(s?.t)?s.t:[],y=Array.isArray(s?.y)?s.y:[],out=[];
  for(let i=0;i<Math.min(t.length,y.length);i++){const tx=Number(t[i]),vy=Number(y[i]);if(Number.isFinite(tx)&&Number.isFinite(vy))out.push({t:tx,y:vy})}
  out.sort((a,b)=>a.t-b.t);
  const dedup=[];for(const p of out){if(dedup.length&&taAlmostEqual(dedup.at(-1).t,p.t))dedup[dedup.length-1]=p;else dedup.push(p)}
  return dedup
}
function taCommonTimeRange(items){
  const pairs=items.map(taFinitePairs).filter(a=>a.length);
  if(!pairs.length||pairs.length!==items.length)return{valid:false,start:NaN,end:NaN};
  const start=Math.max(...pairs.map(a=>a[0].t)),end=Math.min(...pairs.map(a=>a.at(-1).t));
  return{valid:Number.isFinite(start)&&Number.isFinite(end)&&end>=start,start,end}
}
function taNearestSample(pairs,t){
  if(!pairs.length)return{ok:false,reason:'no-data'};
  if(t<pairs[0].t&&!taAlmostEqual(t,pairs[0].t)||t>pairs.at(-1).t&&!taAlmostEqual(t,pairs.at(-1).t))return{ok:false,reason:'outside-range'};
  let lo=0,hi=pairs.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(pairs[mid].t<t)lo=mid+1;else hi=mid}
  const a=pairs[lo],b=lo>0?pairs[lo-1]:null,best=b&&Math.abs(b.t-t)<=Math.abs(a.t-t)?b:a;
  return{ok:true,value:best.y,status:taAlmostEqual(best.t,t)?'native':'nearest',requestedTime:t,usedTime:best.t,delta:best.t-t}
}
function taLinearSample(pairs,t){
  if(!pairs.length)return{ok:false,reason:'no-data'};
  if(t<pairs[0].t&&!taAlmostEqual(t,pairs[0].t)||t>pairs.at(-1).t&&!taAlmostEqual(t,pairs.at(-1).t))return{ok:false,reason:'outside-range'};
  let lo=0,hi=pairs.length-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(taAlmostEqual(pairs[mid].t,t))return{ok:true,value:pairs[mid].y,status:'native',requestedTime:t,usedTime:pairs[mid].t,delta:pairs[mid].t-t};if(pairs[mid].t<t)lo=mid+1;else hi=mid-1}
  const i2=lo,i1=lo-1;if(i1<0||i2>=pairs.length)return{ok:false,reason:'outside-range'};
  const p1=pairs[i1],p2=pairs[i2],dt=p2.t-p1.t;if(!(dt>0))return{ok:false,reason:'invalid-bracket'};
  const w=(t-p1.t)/dt;
  return{ok:true,value:p1.y+w*(p2.y-p1.y),status:'interpolated',requestedTime:t,from:[p1.t,p2.t],weight:w}
}
function taDownsampleGrid(values,maxPoints=2000){
  const a=[...new Set(values.filter(Number.isFinite))].sort((x,y)=>x-y),n=Math.max(2,Math.floor(Number(maxPoints)||2000));
  if(a.length<=n)return a;
  const out=[];for(let i=0;i<n;i++){const k=Math.round(i*(a.length-1)/(n-1));if(!out.length||!taAlmostEqual(out.at(-1),a[k]))out.push(a[k])}
  return out
}
function taCommonGrid(items,maxPoints=2000){
  const r=taCommonTimeRange(items);if(!r.valid)return{valid:false,range:r,grid:[]};
  const all=[];for(const s of items)for(const p of taFinitePairs(s))if((p.t>r.start||taAlmostEqual(p.t,r.start))&&(p.t<r.end||taAlmostEqual(p.t,r.end)))all.push(p.t);
  if(!all.some(t=>taAlmostEqual(t,r.start)))all.push(r.start);if(!all.some(t=>taAlmostEqual(t,r.end)))all.push(r.end);
  return{valid:true,range:r,grid:taDownsampleGrid(all,maxPoints)}
}
function taReferenceGrid(items,referenceIndex=0,maxPoints=2000){
  const r=taCommonTimeRange(items);if(!r.valid)return{valid:false,range:r,grid:[]};
  const ref=taFinitePairs(items[Math.max(0,Math.min(items.length-1,Number(referenceIndex)||0))]||{});
  const vals=ref.filter(p=>(p.t>r.start||taAlmostEqual(p.t,r.start))&&(p.t<r.end||taAlmostEqual(p.t,r.end))).map(p=>p.t);
  return{valid:!!vals.length,range:r,grid:taDownsampleGrid(vals,maxPoints)}
}
function taAlignOne(s,grid,method='linear'){
  const pairs=taFinitePairs(s),values=[],meta=[],sample=String(method).toLowerCase()==='nearest'?taNearestSample:taLinearSample;
  for(const t of grid){const q=sample(pairs,t);values.push(q.ok?q.value:NaN);meta.push(q)}
  return{source:s,t:grid.slice(),y:values,meta}
}
function taAlignSeries(items,{mode='native',method='linear',referenceIndex=0,maxPoints=2000}={}){
  const m=String(mode||'common').toLowerCase();
  if(m==='native')return{valid:items.every(s=>taFinitePairs(s).length>0),mode:'native',range:taCommonTimeRange(items),series:items.map(s=>({source:s,t:taFinitePairs(s).map(p=>p.t),y:taFinitePairs(s).map(p=>p.y),meta:taFinitePairs(s).map(p=>({ok:true,status:'native',requestedTime:p.t,usedTime:p.t,delta:0}))}))};
  const g=m==='reference'?taReferenceGrid(items,referenceIndex,maxPoints):taCommonGrid(items,maxPoints);
  if(!g.valid||!g.grid.length)return{valid:false,mode:m,range:g.range,grid:[],series:[]};
  return{valid:true,mode:m,method:String(method||'linear').toLowerCase(),range:g.range,grid:g.grid,series:items.map(s=>taAlignOne(s,g.grid,method))}
}
function taPearsonPairs(a,b){
  const pts=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))pts.push([x,y])}
  if(pts.length<2)return NaN;const mx=pts.reduce((s,p)=>s+p[0],0)/pts.length,my=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  let num=0,dx=0,dy=0;for(const [x,y] of pts){const ax=x-mx,ay=y-my;num+=ax*ay;dx+=ax*ax;dy+=ay*ay}return dx>0&&dy>0?num/Math.sqrt(dx*dy):NaN
}
function taDifferenceValues(a,b,kind='signed',epsilon=1e-12){
  const out=[],eps=Math.max(0,Number(epsilon)||0),n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++){const x=Number(a[i]),y=Number(b[i]);if(!Number.isFinite(x)||!Number.isFinite(y)){out.push(NaN);continue}
    const d=x-y,k=String(kind||'signed').toLowerCase();
    if(k==='absolute')out.push(Math.abs(d));
    else if(k==='relative')out.push(Math.abs(y)>eps?d/y:NaN);
    else if(k==='percent')out.push(Math.abs(y)>eps?100*d/y:NaN);
    else out.push(d)
  }
  return out
}
function taPairMetrics(t,a,b,epsilon=1e-12){
  const diffs=[],abs=[],rel=[],pct=[],times=[],eps=Math.max(0,Number(epsilon)||0);
  for(let i=0;i<Math.min(t.length,a.length,b.length);i++){const tx=Number(t[i]),x=Number(a[i]),y=Number(b[i]);if(!Number.isFinite(tx)||!Number.isFinite(x)||!Number.isFinite(y))continue;const d=x-y;times.push(tx);diffs.push(d);abs.push(Math.abs(d));if(Math.abs(y)>eps){rel.push(d/y);pct.push(100*d/y)}}
  if(!diffs.length)return{count:0,rmse:NaN,mae:NaN,maxAbs:NaN,maxAbsTime:NaN,meanDifference:NaN,meanRelative:NaN,meanPercent:NaN,correlation:NaN};
  let im=0;for(let i=1;i<abs.length;i++)if(abs[i]>abs[im])im=i;
  return{count:diffs.length,rmse:Math.sqrt(diffs.reduce((s,v)=>s+v*v,0)/diffs.length),mae:abs.reduce((s,v)=>s+v,0)/abs.length,maxAbs:abs[im],maxAbsTime:times[im],meanDifference:diffs.reduce((s,v)=>s+v,0)/diffs.length,meanRelative:rel.length?rel.reduce((s,v)=>s+v,0)/rel.length:NaN,meanPercent:pct.length?pct.reduce((s,v)=>s+v,0)/pct.length:NaN,correlation:taPearsonPairs(a,b)}
}
/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_END */

function taSeriesVariable(s){return String(s?.field?.canonical||s?.field?.name||s?.field?.raw||s?.variable||s?.name||'Series')}
function taSeriesRegion(s){return String(s?.region||s?.regionName||s?.field?.region||'')}
function taSeriesComponent(s){return String(s?.component||s?.field?.component||s?.statistic||'')}
function taCaseName(s){const c=(typeof cases!=='undefined'&&Array.isArray(cases))?cases.find(x=>String(x.id)===String(s?.caseId)):null;return String(c?.name||s?.caseName||('Case '+(s?.caseId??'—')))}
function taSeriesLabel(s){const bits=[taCaseName(s),taSeriesVariable(s)];const r=taSeriesRegion(s),c=taSeriesComponent(s);if(r)bits.push(r);if(c)bits.push(c);return bits.join(' · ')}
function taIsTimeSeries(s){try{return datasetTypeOf(s)==='timeseries'&&taFinitePairs(s).length>=2&&s?.derivedKind!=='temporalAlignmentDifference'}catch{return taFinitePairs(s).length>=2&&!s?.profileTime&&!s?.logFamily}}
function taSources(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>taIsTimeSeries(s)&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s)))}
function taFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
let taLastResult=null;

function taBuildUi(){
  if(document.getElementById('taTools'))return;
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('analysisPanel')||document.querySelector('.analysisTools')||document.body;
  const box=document.createElement('div');box.id='taTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b id="taTitle" data-fl-en="Temporal alignment" data-fl-es="Alineación temporal">Temporal alignment</b><span class="badge">v1.3</span></div>
    <div class="smallnote" id="taIntro" style="margin-top:5px" data-fl-en="Compare physical time, never timestep or array index. No extrapolation." data-fl-es="Compara tiempo físico, nunca timestep ni índice de arreglo. Sin extrapolación.">Compare physical time, never timestep or array index. No extrapolation.</div>
    <div class="field" style="margin-top:8px"><label data-fl-en="Source A" data-fl-es="Fuente A">Source A</label><select id="taSourceA"></select></div>
    <div class="field"><label data-fl-en="Source B" data-fl-es="Fuente B">Source B</label><select id="taSourceB"></select></div>
    <div class="row2">
      <div class="field"><label data-fl-en="Alignment" data-fl-es="Alineación">Alignment</label><select id="taMode"><option value="native" selected data-fl-en="Native" data-fl-es="Nativa">Native</option><option value="common" data-fl-en="Common Time Grid" data-fl-es="Malla temporal común">Common Time Grid</option><option value="reference" data-fl-en="Reference Case Grid" data-fl-es="Malla del caso de referencia">Reference Case Grid</option></select></div>
      <div class="field"><label data-fl-en="Method" data-fl-es="Método">Method</label><select id="taMethod"><option value="linear" selected data-fl-en="Linear" data-fl-es="Lineal">Linear</option><option value="nearest" data-fl-en="Nearest" data-fl-es="Más cercano">Nearest</option></select></div>
    </div>
    <div class="field" id="taReferenceField" style="display:none"><label data-fl-en="Reference source" data-fl-es="Fuente de referencia">Reference source</label><select id="taReference"><option value="0" data-fl-en="Source A" data-fl-es="Fuente A">Source A</option><option value="1" data-fl-en="Source B" data-fl-es="Fuente B">Source B</option></select></div>
    <div class="field"><label data-fl-en="Relative-difference epsilon" data-fl-es="Epsilon de diferencia relativa">Relative-difference epsilon</label><input id="taEpsilon" type="number" value="1e-12" min="0" step="any"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">
      <button class="btn primary" id="taRun" type="button" data-fl-en="Align + compare" data-fl-es="Alinear + comparar">Align + compare</button>
      <button class="btn" id="taAddSigned" type="button" disabled data-fl-en="Add A − B curve" data-fl-es="Agregar curva A − B">Add A − B curve</button>
      <button class="btn" id="taAddPercent" type="button" disabled data-fl-en="Add % difference" data-fl-es="Agregar diferencia %">Add % difference</button>
      <button class="btn" id="taExportJson" type="button" disabled data-fl-en="Export JSON" data-fl-es="Exportar JSON">Export JSON</button>
      <button class="btn" id="taExportCsv" type="button" disabled data-fl-en="Export CSV" data-fl-es="Exportar CSV">Export CSV</button>
    </div>
    <div class="smallnote" id="taStatus" style="margin-top:8px" data-fl-en="Choose two temporal series." data-fl-es="Elige dos series temporales.">Choose two temporal series.</div>
    <div id="taResult" style="margin-top:8px"></div>`;
  host.appendChild(box);flApplyBilingualText(box);
  document.getElementById('taMode').addEventListener('change',()=>{document.getElementById('taReferenceField').style.display=document.getElementById('taMode').value==='reference'?'':'none';taClearResult()});
  for(const id of ['taSourceA','taSourceB','taMethod','taReference','taEpsilon'])document.getElementById(id)?.addEventListener('change',taClearResult);
  document.getElementById('taRun').addEventListener('click',taRunComparison);
  document.getElementById('taAddSigned').addEventListener('click',()=>taAddDerived('signed'));
  document.getElementById('taAddPercent').addEventListener('click',()=>taAddDerived('percent'));
  document.getElementById('taExportJson').addEventListener('click',()=>taExportComparison('json'));
  document.getElementById('taExportCsv').addEventListener('click',()=>taExportComparison('csv'));
  taRefreshSources()
}
function taClearResult(){taLastResult=null;for(const id of ['taAddSigned','taAddPercent','taExportJson','taExportCsv']){const el=document.getElementById(id);if(el)el.disabled=true}}
function taRefreshSources(){
  const src=taSources(),box=document.getElementById('taTools'),a=document.getElementById('taSourceA'),b=document.getElementById('taSourceB');if(box)box.style.display=src.length>=2?'':'none';try{refreshGeneralAnalysisHost()}catch{}if(!a||!b)return;
  const oldA=a.value,oldB=b.value,opts=src.map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${taSeriesLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
  a.innerHTML=opts;b.innerHTML=opts;if([...a.options].some(o=>o.value===oldA))a.value=oldA;if([...b.options].some(o=>o.value===oldB))b.value=oldB;
  if(!oldB&&b.options.length>1)b.selectedIndex=1;
  const st=document.getElementById('taStatus');if(st)st.textContent=src.length>=2?flUi('Ready for physical-time alignment.','Listo para alineación por tiempo físico.'):flUi('Load at least two temporal series.','Carga al menos dos series temporales.');
}
function taSelected(sel){const src=taSources(),v=document.getElementById(sel)?.value;return src.find((s,i)=>String(s.id??i)===String(v))}
function taRunComparison(){
  const A=taSelected('taSourceA'),B=taSelected('taSourceB'),status=document.getElementById('taStatus'),result=document.getElementById('taResult');
  if(!A||!B||A===B){if(status)status.textContent=flUi('Choose two different temporal series.','Elige dos series temporales distintas.');return}
  const mode=document.getElementById('taMode')?.value||'common',method=document.getElementById('taMethod')?.value||'linear',referenceIndex=Number(document.getElementById('taReference')?.value)||0,epsilon=Number(document.getElementById('taEpsilon')?.value)||1e-12;
  const aligned=taAlignSeries([A,B],{mode,method,referenceIndex,maxPoints:2500});
  if(!aligned.valid||!aligned.range?.valid){taLastResult=null;if(status)status.textContent=flUi('No common physical-time interval exists. Nothing was extrapolated.','No existe un intervalo común de tiempo físico. No se extrapoló nada.');if(result)result.innerHTML='';return}
  if(mode==='native'){taLastResult={A,B,aligned,epsilon};if(status)status.textContent=diagEs()?`El modo nativo conserva la malla temporal de cada fuente. Rango compartido: ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s. Elige Malla temporal común o Malla del caso de referencia para diferencias cuantitativas.`:`Native mode preserves each source time grid. Shared range: ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s. Choose Common Time Grid or Reference Case Grid for quantitative differences.`;if(result)result.innerHTML='';return}
  const m=taPairMetrics(aligned.grid,aligned.series[0].y,aligned.series[1].y,epsilon);
  taLastResult={A,B,aligned,metrics:m,epsilon};
  const metaCount=(arr,k)=>arr.reduce((n,x)=>n+(x?.status===k),0),ma=aligned.series[0].meta,mb=aligned.series[1].meta;
  if(status)status.textContent=diagEs()?`Solapamiento ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s · ${m.count} puntos comparables · sin extrapolación.`:`Overlap ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s · ${m.count} comparable points · no extrapolation.`;
  if(result)result.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
    <tr><th>RMSE</th><td>${taFmt(m.rmse)}</td><th>MAE</th><td>${taFmt(m.mae)}</td></tr>
    <tr><th>Max |A−B|</th><td>${taFmt(m.maxAbs)}</td><th>${flUi('at t','en t')}</th><td>${taFmt(m.maxAbsTime)} s</td></tr>
    <tr><th>${flUi('Mean A−B','Media A−B')}</th><td>${taFmt(m.meanDifference)}</td><th>Pearson</th><td>${taFmt(m.correlation)}</td></tr>
    <tr><th>${flUi('A provenance','Procedencia A')}</th><td colspan="3">${flUi('native','nativa')} ${metaCount(ma,'native')} · ${flUi('interpolated','interpolada')} ${metaCount(ma,'interpolated')} · ${flUi('nearest','más cercana')} ${metaCount(ma,'nearest')}</td></tr>
    <tr><th>${flUi('B provenance','Procedencia B')}</th><td colspan="3">${flUi('native','nativa')} ${metaCount(mb,'native')} · ${flUi('interpolated','interpolada')} ${metaCount(mb,'interpolated')} · ${flUi('nearest','más cercana')} ${metaCount(mb,'nearest')}</td></tr>
  </tbody></table></div>`;
  for(const id of ['taAddSigned','taAddPercent','taExportJson','taExportCsv'])document.getElementById(id).disabled=false
}
function taDownload(name,text,type){
  if(typeof downloadText==='function'){downloadText(name,text,type);return}
  const blob=new Blob([text],{type:type||'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
function taExportPayload(){
  const r=taLastResult;if(!r?.aligned?.grid?.length||r.aligned.mode==='native')return null;
  return{generatedBy:flBuildIdentity(),analysis:'temporal-alignment-difference',sourceA:taSeriesLabel(r.A),sourceB:taSeriesLabel(r.B),variableA:taSeriesVariable(r.A),variableB:taSeriesVariable(r.B),regionA:taSeriesRegion(r.A),regionB:taSeriesRegion(r.B),alignment:{mode:r.aligned.mode,method:r.aligned.method,commonRange:r.aligned.range,epsilon:r.epsilon,noExtrapolation:true},metrics:r.metrics,points:r.aligned.grid.map((t,i)=>({time:t,A:r.aligned.series[0].y[i],B:r.aligned.series[1].y[i],difference:r.aligned.series[0].y[i]-r.aligned.series[1].y[i],absoluteDifference:Math.abs(r.aligned.series[0].y[i]-r.aligned.series[1].y[i]),relativeDifference:Math.abs(r.aligned.series[1].y[i])>r.epsilon?(r.aligned.series[0].y[i]-r.aligned.series[1].y[i])/r.aligned.series[1].y[i]:null,percentDifference:Math.abs(r.aligned.series[1].y[i])>r.epsilon?100*(r.aligned.series[0].y[i]-r.aligned.series[1].y[i])/r.aligned.series[1].y[i]:null,provenanceA:r.aligned.series[0].meta[i],provenanceB:r.aligned.series[1].meta[i]}))}
}
function taExportComparison(format){
  const p=taExportPayload();if(!p)return;
  if(format==='json'){taDownload('FoamLens_temporal_comparison.json',JSON.stringify(p,null,2),'application/json');return}
  const escCsv=v=>'"'+String(v??'').replaceAll('"','""')+'"',rows=[['time_s','A','B','A_minus_B','absolute_difference','relative_difference','percent_difference','A_status','B_status']];
  for(const q of p.points)rows.push([q.time,q.A,q.B,q.difference,q.absoluteDifference,q.relativeDifference,q.percentDifference,q.provenanceA?.status||'',q.provenanceB?.status||'']);
  const meta=['# FoamLens temporal comparison','# sourceA='+p.sourceA,'# sourceB='+p.sourceB,'# mode='+p.alignment.mode,'# method='+p.alignment.method,'# commonStart='+p.alignment.commonRange.start,'# commonEnd='+p.alignment.commonRange.end,'# epsilon='+p.alignment.epsilon,'# noExtrapolation=true'];
  taDownload('FoamLens_temporal_comparison.csv',meta.join('\n')+'\n'+rows.map(r=>r.map(escCsv).join(',')).join('\n'),'text/csv')
}
function taAddDerived(kind){
  const r=taLastResult;if(!r?.aligned?.grid?.length||r.aligned.mode==='native')return;
  const y=taDifferenceValues(r.aligned.series[0].y,r.aligned.series[1].y,kind,r.epsilon),A=r.A,B=r.B;
  const base=String(kind)==='percent'?flUi('% difference','% diferencia'):'A − B',name=`${base}: ${taSeriesVariable(A)} · ${taCaseName(A)} vs ${taCaseName(B)}`;
  const diffField={...(A.field||{}),canonical:(kind==='percent'?'percentDifference:':'difference:')+taSeriesVariable(A),raw:name,name,displayName:name};
  if(kind==='percent'){diffField.unit='%';diffField.dimensions='[0 0 0 0 0 0 0]'}else{diffField.unit=A.field?.unit||A.unit||'';diffField.dimensions=A.field?.dimensions||A.dimensions||''}
  const d={...A,id:'ta_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:r.aligned.grid.slice(),y,caseName:taCaseName(A)+' vs '+taCaseName(B),derived:true,derivedKind:'temporalAlignmentDifference',sourceKind:'derived',sourcePath:'FoamLens temporal alignment',visible:true,hidden:false,checked:true,enabled:true,
    field:diffField,unit:diffField.unit,dimensions:diffField.dimensions,
    temporalAlignment:{mode:r.aligned.mode,method:r.aligned.method,range:r.aligned.range,sourceA:taSeriesLabel(A),sourceB:taSeriesLabel(B),epsilon:r.epsilon}};
  series.push(d);activeId=d.id;
  try{refreshDatasetControls();renderList();updateMeta();if(typeof setDataView==='function')setDataView('timeseries');else draw()}catch(e){console.warn('FoamLens temporal derived curve added but refresh failed',e)}
  const st=document.getElementById('taStatus');if(st)st.textContent=diagEs()?`Se agregó la curva derivada: ${name}`:`Added derived curve: ${name}`;
}
function taInit(){
  taBuildUi();
  try{
    const original=refreshDatasetControls;
    refreshDatasetControls=function(...args){const out=original.apply(this,args);setTimeout(taRefreshSources,0);return out}
  }catch{}
  document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('taTools');if(box)flApplyBilingualText(box);if(taLastResult)taRunComparison();else taRefreshSources()});
  window.FoamLensTemporalAlignment={taFinitePairs,taCommonTimeRange,taNearestSample,taLinearSample,taCommonGrid,taReferenceGrid,taAlignSeries,taDifferenceValues,taPairMetrics};
}
taInit();
