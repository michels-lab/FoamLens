/* FoamLens Desktop v1.3.0 — reproducible selected-series export. */

/* FOAMLENS_REPRODUCIBLE_EXPORT_CORE_START */
function rxFinitePoints(s){
  const t=Array.isArray(s?.t)?s.t:[],y=Array.isArray(s?.y)?s.y:[],out=[];
  for(let i=0;i<Math.min(t.length,y.length);i++){
    const x=Number(t[i]),v=Number(y[i]);if(Number.isFinite(x)&&Number.isFinite(v))out.push({index:i,x,value:v})
  }
  return out
}
function rxStats(points){
  const p=(points||[]).filter(q=>Number.isFinite(q?.value));if(!p.length)return{count:0,min:NaN,max:NaN,mean:NaN,rms:NaN,minX:NaN,maxX:NaN};
  let imin=0,imax=0,sum=0,sum2=0;
  for(let i=0;i<p.length;i++){const v=p[i].value;if(v<p[imin].value)imin=i;if(v>p[imax].value)imax=i;sum+=v;sum2+=v*v}
  return{count:p.length,min:p[imin].value,max:p[imax].value,mean:sum/p.length,rms:Math.sqrt(sum2/p.length),minX:p[imin].x,maxX:p[imax].x}
}
function rxSafeObject(value){
  if(value==null)return null;
  try{return JSON.parse(JSON.stringify(value,(k,v)=>typeof v==='number'&&!Number.isFinite(v)?null:v))}catch{return String(value)}
}
function rxProvenance(s){
  return{
    sourcePath:s?.sourcePath||'',
    fileName:s?.fileName||'',
    sourceKind:s?.sourceKind||'native',
    derived:!!s?.derived||!!s?.derivedKind||s?.sourceKind==='derived',
    derivedKind:s?.derivedKind||'',
    temporalAlignment:rxSafeObject(s?.temporalAlignment),
    physicalAnalysis:rxSafeObject(s?.physicalAnalysis),
    vectorDerivation:rxSafeObject(s?.vectorDerivation),
    playbackMeta:rxSafeObject(s?.playbackMeta),
    differenceKey:s?.differenceKey||'',
    numericalRunSummary:rxSafeObject(s?.numericalRunSummary),
    postProcessing:rxSafeObject(s?.postProcessing)
  }
}
/* FOAMLENS_REPRODUCIBLE_EXPORT_CORE_END */

function rxSelectedSeries(){return (typeof series!=='undefined'&&Array.isArray(series))?series.find(s=>String(s.id)===String(activeId)):null}
function rxCase(s){return typeof caseById==='function'?caseById(s?.caseId):null}
function rxRegion(s){try{return seriesRegion(s)||''}catch{return String(s?.region||s?.regionName||s?.field?.region||'')}}
function rxDatasetType(s){try{return datasetTypeOf(s)}catch{return s?.profileTime!=null?'profile':s?.logFamily?'log':'timeseries'}}
function rxUnit(s){return String(s?.field?.unit||s?.unit||'')}
function rxDimensions(s){return String(s?.field?.dimensions||s?.dimensions||'')}
function rxField(s){return String(s?.field?.canonical||s?.field?.raw||s?.field?.name||s?.name||'')}
function rxPayload(s){
  if(!s)return null;
  const points=rxFinitePoints(s),dtype=rxDatasetType(s),c=rxCase(s),unit=rxUnit(s),dimensions=rxDimensions(s),profileTime=Number(s?.profileTime);
  const axis=dtype==='profile'?'spatial-coordinate':dtype==='log'?'physical-time / timestep-index':'physical-time';
  const rows=points.map((p,i)=>{
    if(dtype==='profile')return{sampleIndex:p.index,coordinate:p.x,value:p.value,physicalTime:Number.isFinite(profileTime)?profileTime:null};
    if(dtype==='log')return{sampleIndex:p.index,timestepIndex:i,physicalTime:p.x,value:p.value};
    return{sampleIndex:p.index,physicalTime:p.x,value:p.value}
  });
  return{
    format:'FoamLens Series Export',
    schemaVersion:1,
    generatedBy:'FoamLens v51-development / Desktop v1.3.0 development',
    dataset:{
      id:s.id??null,
      datasetType:dtype,
      caseId:s.caseId??null,
      caseName:s.caseName||c?.name||'',
      caseRoot:c?.rootPath||'',
      caseTags:[...(c?.tags||[])],
      region:rxRegion(s),
      field:rxField(s),
      fieldDisplay:s?.field?.displayName||s?.field?.display||s?.label||s?.name||'',
      component:s?.component||s?.field?.component||'',
      quantity:s?.field?.quantity||'',
      dimensions,
      unit,
      xSemantic:axis,
      profile:{time:Number.isFinite(profileTime)?profileTime:null,line:s?.profileLine||'',lineKey:s?.profileLineKey||'',axis:s?.profileAxis||'',coordinateUnit:s?.profileCoordUnit||''},
      log:{family:s?.logFamily||'',root:s?.logRoot||'',metric:s?.logMetric||'',subIteration:Number.isFinite(Number(s?.logSubIter))?Number(s.logSubIter):null},
      provenance:rxProvenance(s)
    },
    statistics:rxStats(points),
    points:rows
  }
}
function rxCsv(payload){
  if(!payload)return'';
  const d=payload.dataset,escCsv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const meta=[
    '# FoamLens reproducible series export',
    '# generatedBy='+payload.generatedBy,
    '# datasetType='+d.datasetType,
    '# case='+d.caseName,
    '# caseRoot='+d.caseRoot,
    '# caseTags='+(d.caseTags||[]).join(','),
    '# region='+d.region,
    '# field='+d.field,
    '# dimensions='+d.dimensions,
    '# unit='+d.unit,
    '# sourcePath='+(d.provenance?.sourcePath||''),
    '# derivedKind='+(d.provenance?.derivedKind||''),
    '# provenance='+JSON.stringify(d.provenance||{}),
    '# statistics='+JSON.stringify(payload.statistics||{})
  ];
  let header;
  if(d.datasetType==='profile')header=['sample_index','coordinate','value','physical_time_s'];
  else if(d.datasetType==='log')header=['sample_index','timestep_index','physical_time_s','value'];
  else header=['sample_index','physical_time_s','value'];
  const rows=[header];
  for(const p of payload.points){
    if(d.datasetType==='profile')rows.push([p.sampleIndex,p.coordinate,p.value,p.physicalTime]);
    else if(d.datasetType==='log')rows.push([p.sampleIndex,p.timestepIndex,p.physicalTime,p.value]);
    else rows.push([p.sampleIndex,p.physicalTime,p.value])
  }
  return meta.join('\n')+'\n'+rows.map(r=>r.map(escCsv).join(',')).join('\n')
}
function rxFileStem(s){
  const raw=[s?.caseName||rxCase(s)?.name||'case',rxField(s),s?.derivedKind||rxDatasetType(s)].filter(Boolean).join('_');
  return raw.replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,120)||'FoamLens_series'
}
function rxDownload(format){
  const s=rxSelectedSeries(),p=rxPayload(s);if(!p)return;
  const stem=rxFileStem(s);
  if(format==='csv')downloadText(stem+'.csv',rxCsv(p),'text/csv');
  else downloadText(stem+'.json',JSON.stringify(p,null,2),'application/json')
}
function rxRefresh(){
  const s=rxSelectedSeries(),wrap=document.getElementById('rxExportWrap');if(!wrap)return;
  wrap.style.display=s&&rxFinitePoints(s).length?'':'none';
  const note=document.getElementById('rxExportNote');
  if(note&&s)note.textContent=(typeof diagEs==='function'&&diagEs())
    ?'Incluye datos, unidades, estadísticas, caso/región y provenance de la transformación.'
    :'Includes data, units, statistics, case/region, and transformation provenance.';
  const j=document.getElementById('rxExportJson'),c=document.getElementById('rxExportCsv');
  if(j)j.textContent=(typeof diagEs==='function'&&diagEs())?'Exportar serie + metadata (JSON)':'Export series + metadata (JSON)';
  if(c)c.textContent=(typeof diagEs==='function'&&diagEs())?'Exportar serie + metadata (CSV)':'Export series + metadata (CSV)'
}
function rxBuildUi(){
  if(document.getElementById('rxExportWrap'))return;
  const anchor=document.getElementById('applyStyle');if(!anchor)return;
  const wrap=document.createElement('div');wrap.id='rxExportWrap';wrap.style.cssText='display:none;margin-top:8px';
  wrap.innerHTML='<div class="row2"><button class="btn" id="rxExportJson" type="button">Export series + metadata (JSON)</button><button class="btn" id="rxExportCsv" type="button">Export series + metadata (CSV)</button></div><div class="smallnote" id="rxExportNote" style="margin-top:5px"></div>';
  anchor.insertAdjacentElement('afterend',wrap);
  document.getElementById('rxExportJson').onclick=()=>rxDownload('json');
  document.getElementById('rxExportCsv').onclick=()=>rxDownload('csv');
  rxRefresh()
}
function rxInit(){
  rxBuildUi();
  try{const previous=updateMeta;updateMeta=function(...args){const x=previous.apply(this,args);setTimeout(rxRefresh,0);return x}}catch{}
  try{const previousLanguage=applyLanguage;applyLanguage=function(...args){const x=previousLanguage.apply(this,args);setTimeout(rxRefresh,0);return x}}catch{}
  window.FoamLensReproducibleExport={rxFinitePoints,rxStats,rxProvenance,rxPayload,rxCsv}
}
rxInit();
