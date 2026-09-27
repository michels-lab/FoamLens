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
function taAlignSeries(items,{mode='common',method='linear',referenceIndex=0,maxPoints=2000}={}){
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
function taSources(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(taIsTimeSeries)}
function taFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
let taLastResult=null;

function taBuildUi(){
  if(document.getElementById('taTools'))return;
  const host=document.getElementById('differenceTools')||document.getElementById('analysisPanel')||document.querySelector('.analysisTools')||document.body;
  const box=document.createElement('div');box.id='taTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b id="taTitle">Temporal alignment</b><span class="badge">v1.3</span></div>
    <div class="smallnote" id="taIntro" style="margin-top:5px">Compare physical time, never timestep or array index. No extrapolation.</div>
    <div class="field" style="margin-top:8px"><label>Source A</label><select id="taSourceA"></select></div>
    <div class="field"><label>Source B</label><select id="taSourceB"></select></div>
    <div class="row2">
      <div class="field"><label>Alignment</label><select id="taMode"><option value="native">Native</option><option value="common" selected>Common Time Grid</option><option value="reference">Reference Case Grid</option></select></div>
      <div class="field"><label>Method</label><select id="taMethod"><option value="linear" selected>Linear</option><option value="nearest">Nearest</option></select></div>
    </div>
    <div class="field" id="taReferenceField" style="display:none"><label>Reference source</label><select id="taReference"><option value="0">Source A</option><option value="1">Source B</option></select></div>
    <div class="field"><label>Relative-difference epsilon</label><input id="taEpsilon" type="number" value="1e-12" min="0" step="any"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">
      <button class="btn primary" id="taRun" type="button">Align + compare</button>
      <button class="btn" id="taAddSigned" type="button" disabled>Add A − B curve</button>
      <button class="btn" id="taAddPercent" type="button" disabled>Add % difference</button>
    </div>
    <div class="smallnote" id="taStatus" style="margin-top:8px">Choose two temporal series.</div>
    <div id="taResult" style="margin-top:8px"></div>`;
  host.appendChild(box);
  document.getElementById('taMode').addEventListener('change',()=>{document.getElementById('taReferenceField').style.display=document.getElementById('taMode').value==='reference'?'':'none';taClearResult()});
  for(const id of ['taSourceA','taSourceB','taMethod','taReference','taEpsilon'])document.getElementById(id)?.addEventListener('change',taClearResult);
  document.getElementById('taRun').addEventListener('click',taRunComparison);
  document.getElementById('taAddSigned').addEventListener('click',()=>taAddDerived('signed'));
  document.getElementById('taAddPercent').addEventListener('click',()=>taAddDerived('percent'));
  taRefreshSources()
}
function taClearResult(){taLastResult=null;const a=document.getElementById('taAddSigned'),b=document.getElementById('taAddPercent');if(a)a.disabled=true;if(b)b.disabled=true}
function taRefreshSources(){
  const src=taSources(),a=document.getElementById('taSourceA'),b=document.getElementById('taSourceB');if(!a||!b)return;
  const oldA=a.value,oldB=b.value,opts=src.map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${taSeriesLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
  a.innerHTML=opts;b.innerHTML=opts;if([...a.options].some(o=>o.value===oldA))a.value=oldA;if([...b.options].some(o=>o.value===oldB))b.value=oldB;
  if(!oldB&&b.options.length>1)b.selectedIndex=1;
  const st=document.getElementById('taStatus');if(st)st.textContent=src.length>=2?'Ready for physical-time alignment.':'Load at least two temporal series.';
}
function taSelected(sel){const src=taSources(),v=document.getElementById(sel)?.value;return src.find((s,i)=>String(s.id??i)===String(v))}
function taRunComparison(){
  const A=taSelected('taSourceA'),B=taSelected('taSourceB'),status=document.getElementById('taStatus'),result=document.getElementById('taResult');
  if(!A||!B||A===B){if(status)status.textContent='Choose two different temporal series.';return}
  const mode=document.getElementById('taMode')?.value||'common',method=document.getElementById('taMethod')?.value||'linear',referenceIndex=Number(document.getElementById('taReference')?.value)||0,epsilon=Number(document.getElementById('taEpsilon')?.value)||1e-12;
  const aligned=taAlignSeries([A,B],{mode,method,referenceIndex,maxPoints:2500});
  if(!aligned.valid||!aligned.range?.valid){taLastResult=null;if(status)status.textContent='No common physical-time interval exists. Nothing was extrapolated.';if(result)result.innerHTML='';return}
  if(mode==='native'){taLastResult={A,B,aligned,epsilon};if(status)status.textContent=`Native mode preserves each source time grid. Shared range: ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s. Choose Common Time Grid or Reference Case Grid for quantitative differences.`;if(result)result.innerHTML='';return}
  const m=taPairMetrics(aligned.grid,aligned.series[0].y,aligned.series[1].y,epsilon);
  taLastResult={A,B,aligned,metrics:m,epsilon};
  const metaCount=(arr,k)=>arr.reduce((n,x)=>n+(x?.status===k),0),ma=aligned.series[0].meta,mb=aligned.series[1].meta;
  if(status)status.textContent=`Overlap ${taFmt(aligned.range.start)}–${taFmt(aligned.range.end)} s · ${m.count} comparable points · no extrapolation.`;
  if(result)result.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
    <tr><th>RMSE</th><td>${taFmt(m.rmse)}</td><th>MAE</th><td>${taFmt(m.mae)}</td></tr>
    <tr><th>Max |A−B|</th><td>${taFmt(m.maxAbs)}</td><th>at t</th><td>${taFmt(m.maxAbsTime)} s</td></tr>
    <tr><th>Mean A−B</th><td>${taFmt(m.meanDifference)}</td><th>Pearson</th><td>${taFmt(m.correlation)}</td></tr>
    <tr><th>A provenance</th><td colspan="3">native ${metaCount(ma,'native')} · interpolated ${metaCount(ma,'interpolated')} · nearest ${metaCount(ma,'nearest')}</td></tr>
    <tr><th>B provenance</th><td colspan="3">native ${metaCount(mb,'native')} · interpolated ${metaCount(mb,'interpolated')} · nearest ${metaCount(mb,'nearest')}</td></tr>
  </tbody></table></div>`;
  document.getElementById('taAddSigned').disabled=false;document.getElementById('taAddPercent').disabled=false
}
function taAddDerived(kind){
  const r=taLastResult;if(!r?.aligned?.grid?.length||r.aligned.mode==='native')return;
  const y=taDifferenceValues(r.aligned.series[0].y,r.aligned.series[1].y,kind,r.epsilon),A=r.A,B=r.B;
  const base=String(kind)==='percent'?'% difference':'A − B',name=`${base}: ${taSeriesVariable(A)} · ${taCaseName(A)} vs ${taCaseName(B)}`;
  const d={...A,id:'ta_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:r.aligned.grid.slice(),y,caseName:taCaseName(A)+' vs '+taCaseName(B),derived:true,derivedKind:'temporalAlignmentDifference',sourceKind:'derived',sourcePath:'FoamLens temporal alignment',visible:true,hidden:false,checked:true,enabled:true,
    field:{...(A.field||{}),canonical:(kind==='percent'?'percentDifference:':'difference:')+taSeriesVariable(A),raw:name,name,displayName:name},
    temporalAlignment:{mode:r.aligned.mode,method:r.aligned.method,range:r.aligned.range,sourceA:taSeriesLabel(A),sourceB:taSeriesLabel(B),epsilon:r.epsilon}};
  series.push(d);activeId=d.id;
  try{refreshDatasetControls();renderList();updateMeta();if(typeof setDataView==='function')setDataView('timeseries');else draw()}catch(e){console.warn('FoamLens temporal derived curve added but refresh failed',e)}
  const st=document.getElementById('taStatus');if(st)st.textContent=`Added derived curve: ${name}`;
}
function taInit(){
  taBuildUi();
  try{
    const original=refreshDatasetControls;
    refreshDatasetControls=function(...args){const out=original.apply(this,args);setTimeout(taRefreshSources,0);return out}
  }catch{}
  window.FoamLensTemporalAlignment={taFinitePairs,taCommonTimeRange,taNearestSample,taLinearSample,taCommonGrid,taReferenceGrid,taAlignSeries,taDifferenceValues,taPairMetrics};
}
taInit();
