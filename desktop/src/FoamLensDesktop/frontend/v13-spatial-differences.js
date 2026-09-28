/* FoamLens Desktop v1.3.0 — quantitative spatial-profile differences. */

/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_START */
function sdAlmost(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b))}
function sdPairs(s){
  const out=[];for(let i=0;i<Math.min(s?.t?.length||0,s?.y?.length||0);i++){const x=Number(s.t[i]),y=Number(s.y[i]);if(Number.isFinite(x)&&Number.isFinite(y))out.push([x,y])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&sdAlmost(d.at(-1)[0],p[0]))d[d.length-1]=p;else d.push(p)}return d
}
function sdValueAt(p,x){
  if(!p.length||x<p[0][0]&&!sdAlmost(x,p[0][0])||x>p.at(-1)[0]&&!sdAlmost(x,p.at(-1)[0]))return NaN;
  let lo=0,hi=p.length-1;while(lo<hi){const m=(lo+hi)>>1;if(p[m][0]<x)lo=m+1;else hi=m}
  if(sdAlmost(p[lo][0],x))return p[lo][1];if(lo===0)return p[0][1];
  const a=p[lo-1],b=p[lo],dx=b[0]-a[0];return dx>0?a[1]+(x-a[0])*(b[1]-a[1])/dx:NaN
}
function sdGrid(A,B,mode='common',maxPoints=3000){
  const a=sdPairs(A),b=sdPairs(B);if(a.length<2||b.length<2)return{valid:false,reason:'insufficient-points',grid:[]};
  const start=Math.max(a[0][0],b[0][0]),end=Math.min(a.at(-1)[0],b.at(-1)[0]);if(!(end>start)&&!sdAlmost(start,end))return{valid:false,reason:'no-spatial-overlap',grid:[]};
  const inRange=p=>p[0]>=start-1e-12&&p[0]<=end+1e-12;
  let grid;
  if(mode==='referenceA')grid=a.filter(inRange).map(p=>p[0]);
  else if(mode==='referenceB')grid=b.filter(inRange).map(p=>p[0]);
  else grid=[...new Set([...a.filter(inRange).map(p=>p[0]),...b.filter(inRange).map(p=>p[0])])].sort((x,y)=>x-y);
  if(grid.length>maxPoints){const src=grid,down=[];for(let i=0;i<maxPoints;i++){const k=Math.round(i*(src.length-1)/(maxPoints-1));if(!down.length||!sdAlmost(down.at(-1),src[k]))down.push(src[k])}grid=down}
  const va=[],vb=[],x=[];for(const xi of grid){const ya=sdValueAt(a,xi),yb=sdValueAt(b,xi);if(Number.isFinite(ya)&&Number.isFinite(yb)){x.push(xi);va.push(ya);vb.push(yb)}}
  return{valid:x.length>0,start,end,grid:x,A:va,B:vb,mode}
}
function sdPearson(a,b){const p=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))p.push([x,y])}if(p.length<2)return NaN;const mx=p.reduce((s,q)=>s+q[0],0)/p.length,my=p.reduce((s,q)=>s+q[1],0)/p.length;let n=0,dx=0,dy=0;for(const [x,y] of p){const ax=x-mx,ay=y-my;n+=ax*ay;dx+=ax*ax;dy+=ay*ay}return dx>0&&dy>0?n/Math.sqrt(dx*dy):NaN}
function sdMetrics(aligned,epsilon=1e-12){
  if(!aligned?.valid)return{count:0};const d=[],abs=[],rel=[],pct=[],eps=Math.max(0,Number(epsilon)||0);
  for(let i=0;i<aligned.grid.length;i++){const q=aligned.A[i]-aligned.B[i];d.push(q);abs.push(Math.abs(q));if(Math.abs(aligned.B[i])>eps){rel.push(q/aligned.B[i]);pct.push(100*q/aligned.B[i])}}
  if(!d.length)return{count:0};let im=0;for(let i=1;i<abs.length;i++)if(abs[i]>abs[im])im=i;
  return{count:d.length,rmse:Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length),mae:abs.reduce((s,v)=>s+v,0)/abs.length,maxAbs:abs[im],maxAbsX:aligned.grid[im],meanDifference:d.reduce((s,v)=>s+v,0)/d.length,meanRelative:rel.length?rel.reduce((s,v)=>s+v,0)/rel.length:NaN,meanPercent:pct.length?pct.reduce((s,v)=>s+v,0)/pct.length:NaN,correlation:sdPearson(aligned.A,aligned.B),difference:d,absoluteDifference:abs,relativeDifference:aligned.grid.map((_,i)=>Math.abs(aligned.B[i])>eps?(aligned.A[i]-aligned.B[i])/aligned.B[i]:NaN),percentDifference:aligned.grid.map((_,i)=>Math.abs(aligned.B[i])>eps?100*(aligned.A[i]-aligned.B[i])/aligned.B[i]:NaN)}
}
/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_END */

function sdProfileSources(){
  if(typeof currentDataView==='undefined'||currentDataView!=='profile')return[];
  let src=[];try{src=currentViewSeries().filter(s=>datasetTypeOf(s)==='profile'&&s?.derivedKind!=='difference'&&s?.derivedKind!=='spatialQuantitativeDifference')}catch{}
  return src
}
function sdProfileLabel(s){
  const c=(typeof cases!=='undefined'&&Array.isArray(cases))?cases.find(x=>String(x.id)===String(s?.caseId)):null;
  return [c?.name||s?.caseName||'Case',s?.profileLine||s?.profileLineKey||'profile',s?.field?.display||s?.field?.canonical||s?.field?.raw||'field'].filter(Boolean).join(' · ')
}
function sdId(s,i){return String(s?.id??('sd'+i))}
function sdFind(id){const src=sdProfileSources();return src.find((s,i)=>sdId(s,i)===String(id))}
function sdFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
let sdLast=null;
function sdSamePhysicalKind(A,B){
  if(!A||!B)return{ok:false,reason:'missing profile'};
  if(String(A.profileAxis||'')!==String(B.profileAxis||''))return{ok:false,reason:'profile axes differ'};
  if(String(A.profileCoordUnit||'')!==String(B.profileCoordUnit||''))return{ok:false,reason:'coordinate units differ'};
  const ca=String(A.field?.canonical||A.field?.raw||''),cb=String(B.field?.canonical||B.field?.raw||'');
  if(ca!==cb)return{ok:false,reason:'variables differ'};return{ok:true}
}
function sdBuildUi(){
  if(document.getElementById('sdTools'))return;const host=document.getElementById('differenceTools')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='sdTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Spatial quantitative comparison</b><span class="badge">physical X</span></div>
  <div class="smallnote" style="margin-top:5px">Uses the profiles currently rendered at the same physical playback time. Spatial samples are aligned by coordinate, never by array index, and are clipped to their shared spatial range.</div>
  <div class="field" style="margin-top:8px"><label>Profile A</label><select id="sdA"></select></div>
  <div class="field"><label>Profile B</label><select id="sdB"></select></div>
  <div class="row2"><div class="field"><label>Spatial grid</label><select id="sdMode"><option value="common" selected>Common spatial grid</option><option value="referenceA">Reference A grid</option><option value="referenceB">Reference B grid</option></select></div><div class="field"><label>Relative epsilon</label><input id="sdEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>
  <button class="btn primary" id="sdRun" type="button">Compare profiles</button>
  <button class="btn" id="sdExport" type="button" disabled>Export JSON</button>
  <div class="smallnote" id="sdStatus" style="margin-top:7px"></div><div id="sdResult" style="margin-top:8px"></div>`;
  host.appendChild(box);document.getElementById('sdRun').onclick=sdRun;document.getElementById('sdExport').onclick=sdExport;sdRefresh()
}
function sdRefresh(){
  const src=sdProfileSources(),box=document.getElementById('sdTools'),a=document.getElementById('sdA'),b=document.getElementById('sdB');if(box)box.style.display=src.length>=2?'':'none';if(!a||!b)return;
  const oa=a.value,ob=b.value,opts=src.map((s,i)=>`<option value="${sdId(s,i).replace(/"/g,'&quot;')}">${sdProfileLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');a.innerHTML=opts;b.innerHTML=opts;if([...a.options].some(o=>o.value===oa))a.value=oa;if([...b.options].some(o=>o.value===ob))b.value=ob;if((!ob||b.value===a.value)&&b.options.length>1)b.selectedIndex=1;sdLast=null;const ex=document.getElementById('sdExport');if(ex)ex.disabled=true
}
function sdRun(){
  const A=sdFind(document.getElementById('sdA')?.value),B=sdFind(document.getElementById('sdB')?.value),st=document.getElementById('sdStatus'),out=document.getElementById('sdResult');if(!A||!B||A===B){st.textContent='Choose two different compatible profiles.';return}
  const compatible=sdSamePhysicalKind(A,B);if(!compatible.ok){st.textContent='Cannot compare: '+compatible.reason+'.';out.innerHTML='';return}
  const mode=document.getElementById('sdMode')?.value||'common',epsilon=Number(document.getElementById('sdEpsilon')?.value)||1e-12,aligned=sdGrid(A,B,mode,3000);if(!aligned.valid){st.textContent='No safe common spatial range is available; no extrapolation was performed.';out.innerHTML='';return}
  const m=sdMetrics(aligned,epsilon);sdLast={A,B,aligned,metrics:m,epsilon};
  const unit=A.profileCoordUnit||'',time=Number(A.profileTime),metaA=A.playbackMeta||null,metaB=B.playbackMeta||null;
  st.textContent=`Shared spatial range ${sdFmt(aligned.start)}–${sdFmt(aligned.end)} ${unit} · ${m.count} aligned samples · tPlay ${Number.isFinite(time)?sdFmt(time)+' s':'—'}.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>RMSE</th><td>${sdFmt(m.rmse)}</td><th>MAE</th><td>${sdFmt(m.mae)}</td></tr>
  <tr><th>Max |A−B|</th><td>${sdFmt(m.maxAbs)}</td><th>at X</th><td>${sdFmt(m.maxAbsX)} ${unit}</td></tr>
  <tr><th>Mean A−B</th><td>${sdFmt(m.meanDifference)}</td><th>Correlation</th><td>${sdFmt(m.correlation)}</td></tr>
  <tr><th>Mean % difference</th><td>${sdFmt(m.meanPercent)}%</td><th>Grid</th><td>${mode==='common'?'Common spatial grid':mode==='referenceA'?'Reference A':'Reference B'}</td></tr>
  </tbody></table></div>`;
  document.getElementById('sdExport').disabled=false
}
function sdDownload(name,text){if(typeof downloadText==='function'){downloadText(name,text,'application/json');return}const blob=new Blob([text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function sdExport(){
  const r=sdLast;if(!r)return;const p={generatedBy:'FoamLens Desktop v1.3.0 development',analysis:'spatial-profile-difference',sourceA:sdProfileLabel(r.A),sourceB:sdProfileLabel(r.B),variable:r.A.field?.canonical||r.A.field?.raw||'',profileAxis:r.A.profileAxis||'',coordinateUnit:r.A.profileCoordUnit||'',physicalTime:Number.isFinite(Number(r.A.profileTime))?Number(r.A.profileTime):null,spatialAlignment:{mode:r.aligned.mode,sharedRange:{start:r.aligned.start,end:r.aligned.end},epsilon:r.epsilon,noIndexAlignment:true,noExtrapolation:true},temporalProvenance:{A:r.A.playbackMeta||null,B:r.B.playbackMeta||null},metrics:r.metrics,points:r.aligned.grid.map((x,i)=>({x,A:r.aligned.A[i],B:r.aligned.B[i],difference:r.metrics.difference[i],absoluteDifference:r.metrics.absoluteDifference[i],relativeDifference:Number.isFinite(r.metrics.relativeDifference[i])?r.metrics.relativeDifference[i]:null,percentDifference:Number.isFinite(r.metrics.percentDifference[i])?r.metrics.percentDifference[i]:null}))};sdDownload('FoamLens_spatial_comparison.json',JSON.stringify(p,null,2))
}
function sdInit(){
  sdBuildUi();try{const prev=refreshDatasetControls;refreshDatasetControls=function(...args){const x=prev.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  try{const prevView=updateDatasetViewUI;updateDatasetViewUI=function(...args){const x=prevView.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  window.FoamLensSpatialDifference={sdPairs,sdValueAt,sdGrid,sdMetrics}
}
sdInit();
