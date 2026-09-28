/* FoamLens Desktop v1.3.0 — general solidification / remelting signal analysis. */

/* FOAMLENS_SOLIDIFICATION_ANALYSIS_CORE_START */
function saPairs(t,y){
  const out=[];for(let i=0;i<Math.min(t?.length||0,y?.length||0);i++){const tt=Number(t[i]),vv=Number(y[i]);if(Number.isFinite(tt)&&Number.isFinite(vv))out.push([tt,vv])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&Math.abs(d.at(-1)[0]-p[0])<=1e-12*Math.max(1,Math.abs(p[0])))d[d.length-1]=p;else d.push(p)}return d
}
function saDerivative(t,y){
  const p=saPairs(t,y),tt=p.map(q=>q[0]),out=new Array(p.length).fill(NaN);if(p.length<2)return{t:tt,y:out};
  for(let i=0;i<p.length;i++){
    let a,b;if(i===0){a=p[0];b=p[1]}else if(i===p.length-1){a=p[i-1];b=p[i]}else{a=p[i-1];b=p[i+1]}
    const dt=b[0]-a[0];out[i]=dt!==0?(b[1]-a[1])/dt:NaN
  }
  return{t:tt,y:out}
}
function saTrapezoid(t,y){
  const p=saPairs(t,y);let acc=0;for(let i=1;i<p.length;i++){const dt=p[i][0]-p[i-1][0];if(dt>0)acc+=.5*(p[i-1][1]+p[i][1])*dt}return acc
}
function saContiguousIntervals(t,mask){
  const out=[];let start=null,last=null;
  for(let i=0;i<Math.min(t?.length||0,mask?.length||0);i++){
    const tt=Number(t[i]),on=!!mask[i];if(!Number.isFinite(tt))continue;
    if(on&&start==null)start=tt;if(on)last=tt;
    if(!on&&start!=null){out.push({start,end:last??start});start=null;last=null}
  }
  if(start!=null)out.push({start,end:last??start});return out
}
function saAnalyzePhaseSignal(t,y,role='liquidFraction',epsilon=1e-12){
  const p=saPairs(t,y),tt=p.map(q=>q[0]),alpha=p.map(q=>q[1]),d=saDerivative(tt,alpha).y,isLiquid=role==='liquidFraction';
  const solidification=d.map(v=>Number.isFinite(v)?Math.max(isLiquid?-v:v,0):NaN);
  const remelting=d.map(v=>Number.isFinite(v)?Math.max(isLiquid?v:-v,0):NaN);
  const solidMask=solidification.map(v=>Number.isFinite(v)&&v>epsilon),remeltMask=remelting.map(v=>Number.isFinite(v)&&v>epsilon);
  const valid=alpha.filter(Number.isFinite),first=valid[0],last=valid.at(-1);
  return{
    t:tt,alpha,derivative:d,solidificationRate:solidification,remeltingRate:remelting,
    solidificationAmount:saTrapezoid(tt,solidification),remeltingAmount:saTrapezoid(tt,remelting),
    solidificationIntervals:saContiguousIntervals(tt,solidMask),remeltingIntervals:saContiguousIntervals(tt,remeltMask),
    initial:first,final:last,delta:Number.isFinite(first)&&Number.isFinite(last)?last-first:NaN,
    min:valid.length?Math.min(...valid):NaN,max:valid.length?Math.max(...valid):NaN,
    outOfRangeCount:valid.filter(v=>v<0||v>1).length,
    role
  }
}
/* FOAMLENS_SOLIDIFICATION_ANALYSIS_CORE_END */

function saSources(){
  return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{
    try{return datasetTypeOf(s)==='timeseries'&&saPairs(s.t,s.y).length>=2&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))}
    catch{return false}
  })
}
function saId(s,i){return String(s?.id??i)}
function saLabel(s){try{return taSeriesLabel(s)}catch{return String(s?.name||s?.field?.display||s?.field?.canonical||'Series')}}
function saFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function saSelected(){const src=saSources(),id=document.getElementById('saSource')?.value;return src.find((s,i)=>saId(s,i)===String(id))}
function saAddDerived(base,name,t,y,kind,formula){
  const d={...base,id:'sa_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:t.slice(),y:y.slice(),derived:true,derivedKind:kind,sourceKind:'derived',sourcePath:'FoamLens solidification analysis',visible:true,hidden:false,checked:true,enabled:true,
    field:{...(base?.field||{}),canonical:'derived:'+name,raw:name,name,displayName:name,unit:'1/s',dimensions:'[0 0 -1 0 0 0 0]'},
    unit:'1/s',dimensions:'[0 0 -1 0 0 0 0]',
    physicalAnalysis:{operation:kind,formula,source:saLabel(base),explicitUserRole:true,noNucleationInference:true,noRecalescenceInference:true}};
  series.push(d);return d
}
function saRun(){
  const s=saSelected(),status=document.getElementById('saStatus'),out=document.getElementById('saResult');if(!s||!status||!out)return;
  const role=document.getElementById('saRole')?.value||'liquidFraction',eps=Math.max(0,Number(document.getElementById('saEpsilon')?.value)||0),a=saAnalyzePhaseSignal(s.t,s.y,role,eps),roleLabel=role==='liquidFraction'?'liquid fraction αL':'solid fraction αS';
  window.FoamLensLastSolidificationAnalysis={sourceId:s.id??null,source:saLabel(s),caseId:s.caseId??null,caseName:s.caseName||caseById(s.caseId)?.name||'',region:typeof seriesRegion==='function'?seriesRegion(s):'',role,epsilon:eps,analysis:a};
  status.textContent=`${a.t.length} samples · explicit ${roleLabel} interpretation · physical-time derivative. ${a.outOfRangeCount?a.outOfRangeCount+' sample(s) outside [0,1]; raw values were retained.':'No samples outside [0,1].'}`;
  const rows=[
    ['Initial / Final',saFmt(a.initial)+' / '+saFmt(a.final)],
    ['Δ fraction',saFmt(a.delta)],
    ['Min / Max',saFmt(a.min)+' / '+saFmt(a.max)],
    ['Integrated solidification amount',saFmt(a.solidificationAmount)],
    ['Integrated remelting amount',saFmt(a.remeltingAmount)],
    ['Solidification intervals',a.solidificationIntervals.length?a.solidificationIntervals.map(x=>saFmt(x.start)+'–'+saFmt(x.end)+' s').join(', '):'—'],
    ['Remelting intervals',a.remeltingIntervals.length?a.remeltingIntervals.map(x=>saFmt(x.start)+'–'+saFmt(x.end)+' s').join(', '):'—']
  ];
  out.innerHTML='<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>'+rows.map(r=>'<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>').join('')+'</tbody></table></div>';
}
function saCreateRates(){
  const s=saSelected();if(!s)return;const role=document.getElementById('saRole')?.value||'liquidFraction',eps=Math.max(0,Number(document.getElementById('saEpsilon')?.value)||0),a=saAnalyzePhaseSignal(s.t,s.y,role,eps);
  series=series.filter(x=>x.solidificationSourceId!==s.id);
  const solid=saAddDerived(s,'Solidification Rate: '+saLabel(s),a.t,a.solidificationRate,'solidification-rate',role==='liquidFraction'?'max(−dαL/dt,0)':'max(dαS/dt,0)');
  solid.solidificationSourceId=s.id;
  const remelt=saAddDerived(s,'Remelting Rate: '+saLabel(s),a.t,a.remeltingRate,'remelting-rate',role==='liquidFraction'?'max(dαL/dt,0)':'max(−dαS/dt,0)');
  remelt.solidificationSourceId=s.id;activeId=solid.id;
  try{refreshDatasetControls();renderList();updateMeta();setDataView('timeseries')}catch{}
}
function saExport(){
  const p=window.FoamLensLastSolidificationAnalysis;if(!p)return;
  downloadText('FoamLens_solidification_analysis.json',JSON.stringify({generatedBy:'FoamLens v51-development / Desktop v1.3.0 development',analysis:'solidification-phase-signal',...p},null,2),'application/json')
}
function saRefresh(){
  const src=saSources(),box=document.getElementById('saTools'),sel=document.getElementById('saSource');if(box)box.style.display=src.length?'':'none';try{refreshGeneralAnalysisHost()}catch{}if(!sel)return;
  const old=sel.value;sel.innerHTML=src.map((s,i)=>`<option value="${saId(s,i).replace(/"/g,'&quot;')}">${saLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old
}
function saBuildUi(){
  if(document.getElementById('saTools'))return;
  const host=document.getElementById('generalAnalysisModules')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='saTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Solidification Analysis</b><span class="badge">phase signal</span></div>
  <div class="smallnote" style="margin-top:5px">Choose the phase-fraction signal explicitly. FoamLens computes progression, solidification and remelting from physical-time derivatives. It does not infer nucleation or recalescence from curve shape.</div>
  <div class="field" style="margin-top:8px"><label>Phase signal</label><select id="saSource"></select></div>
  <div class="row2"><div class="field"><label>Interpret as</label><select id="saRole"><option value="liquidFraction" selected>Liquid fraction αL</option><option value="solidFraction">Solid fraction αS</option></select></div><div class="field"><label>Rate epsilon [1/s]</label><input id="saEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary" id="saRun" type="button">Analyze phase progression</button><button class="btn" id="saCreateRates" type="button">Create solidification + remelting rates</button><button class="btn" id="saExport" type="button">Export summary JSON</button></div>
  <div class="smallnote" id="saStatus" style="margin-top:7px"></div><div id="saResult" style="margin-top:8px"></div>`;
  host.appendChild(box);document.getElementById('saRun').onclick=saRun;document.getElementById('saCreateRates').onclick=saCreateRates;document.getElementById('saExport').onclick=saExport;saRefresh()
}
function saInit(){
  saBuildUi();try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(saRefresh,0);return x}}catch{}
  window.FoamLensSolidificationAnalysis={saPairs,saDerivative,saTrapezoid,saContiguousIntervals,saAnalyzePhaseSignal}
}
saInit();
