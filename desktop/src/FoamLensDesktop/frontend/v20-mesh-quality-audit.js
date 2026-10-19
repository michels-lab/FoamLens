/* FoamLENS — source-backed OpenFOAM checkMesh report audit. Scientific only.
   Never modifies an OpenFOAM case, runs a solver, or invents missing values. */
/* FOAMLENS_CHECKMESH_CORE_START */
const MA_KEYS={
  points:{label:'Points',unit:'count'},
  faces:{label:'Faces',unit:'count'},
  internalFaces:{label:'Internal faces',unit:'count'},
  cells:{label:'Cells',unit:'count'},
  boundaryPatches:{label:'Boundary patches',unit:'count'},
  cellZones:{label:'Cell zones',unit:'count'},
  faceZones:{label:'Face zones',unit:'count'},
  regions:{label:'Topology regions',unit:'count'},
  maxNonOrthogonality:{label:'Maximum non-orthogonality',unit:'deg'},
  meanNonOrthogonality:{label:'Mean non-orthogonality',unit:'deg'},
  maxSkewness:{label:'Maximum skewness',unit:'dimensionless'},
  maxAspectRatio:{label:'Maximum aspect ratio',unit:'dimensionless'},
  maxOpenness:{label:'Maximum cell openness',unit:'dimensionless'},
  minFaceArea:{label:'Minimum face area',unit:'m²'},
  maxFaceArea:{label:'Maximum face area',unit:'m²'},
  minVolume:{label:'Minimum cell volume',unit:'m³'},
  maxVolume:{label:'Maximum cell volume',unit:'m³'},
  totalVolume:{label:'Total mesh volume',unit:'m³'},
  minPyramidVolume:{label:'Minimum face pyramid volume',unit:'m³'}
};
const MA_NUM='([+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?)';
function maPureCheckMesh(text,sourceName=''){
  const raw=String(text||'');
  if(raw.length>16*1024*1024)throw Error('checkMesh report is too large (16 MiB maximum).');
  const lines=raw.replace(/\r\n?/g,'\n').split('\n');
  const cleanSource=String(sourceName||'').slice(0,240).replace(/[\u0000-\u001f]/g,' ');
  const records={},warnings=[],failures=[];
  for(const key of Object.keys(MA_KEYS))records[key]={value:null,status:'not-reported',unit:MA_KEYS[key].unit,label:MA_KEYS[key].label,line:null};
  let recognized=false,meshOk=false,failedChecks=null,errorsCount=null,warningCount=null;
  let bounds=null,regionsSeen=new Set(),lastRegion=null;
  const number=(line,p)=>{const m=new RegExp(p,'i').exec(line);if(!m)return null;const n=Number(m[1]);return Number.isFinite(n)?n:null};
  const assign=(key,line,value,lineNo)=>{
    if(value===null||!Number.isFinite(value))return;
    records[key]={...records[key],value,status:'reported',line:lineNo};
  };
  const addUnique=(list,message,lineNumber)=>{
    if(list.some(x=>x.line===lineNumber&&x.message===message))return;
    if(list.length<100)list.push({line:lineNumber,message:String(message).trim().slice(0,450)})
  };
  for(let i=0;i<lines.length;i++){
    const line=lines[i],trim=line.trim(),at=i+1;
    if(/\bcheckMesh\b/i.test(line)||/\bChecking (topology|geometry)\b/i.test(line)||/^\s*Mesh stats\s*$/i.test(line))recognized=true;
    if(/^Mesh\s+OK\.\s*$/i.test(trim))meshOk=true;
    if(/^Region\s*:\s*([^\s]+)/i.test(trim)){
      const region=/^Region\s*:\s*([^\s]+)/i.exec(trim)[1];lastRegion=region;regionsSeen.add(region)
    }
    const countPatterns={
      points:'^\\s*points\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      faces:'^\\s*faces\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      internalFaces:'^\\s*internal\\s+faces\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      cells:'^\\s*cells\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      boundaryPatches:'^\\s*boundary\\s+patches\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      cellZones:'^\\s*cell\\s+zones\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      faceZones:'^\\s*face\\s+zones\\s*:\\s*'+MA_NUM+'(?:\\s|$)',
      regions:'(?:number\\s+of\\s+regions|regions)\\s*[:=]\\s*'+MA_NUM
    };
    for(const [key,pattern] of Object.entries(countPatterns))assign(key,line,number(line,pattern),at);
    const nonOrth=/Mesh\s+non-orthogonality\s+Max\s*:\s*([+\deE.\-]+)\s+average\s*:\s*([+\deE.\-]+)/i.exec(line);
    if(nonOrth){assign('maxNonOrthogonality',line,Number(nonOrth[1]),at);assign('meanNonOrthogonality',line,Number(nonOrth[2]),at)}
    const scalarPatterns={
      maxSkewness:'Max\\s+skewness\\s*=\\s*'+MA_NUM,
      maxAspectRatio:'Max\\s+aspect\\s+ratio\\s*=\\s*'+MA_NUM,
      maxOpenness:'Max\\s+(?:cell\\s+)?openness\\s*=\\s*'+MA_NUM,
      minFaceArea:'Min(?:imum)?\\s+face\\s+area\\s*=\\s*'+MA_NUM,
      maxFaceArea:'Max(?:imum)?\\s+face\\s+area\\s*=\\s*'+MA_NUM,
      minVolume:'Min(?:imum)?\\s+volume\\s*=\\s*'+MA_NUM,
      maxVolume:'Max(?:imum)?\\s+volume\\s*=\\s*'+MA_NUM,
      totalVolume:'Total\\s+volume\\s*=\\s*'+MA_NUM,
      minPyramidVolume:'Min(?:imum)?\\s+face\\s+pyramid\\s+volume\\s*=\\s*'+MA_NUM
    };
    for(const [key,pattern] of Object.entries(scalarPatterns))assign(key,line,number(line,pattern),at);
    if(/^\s*Overall\s+domain\s+bounding\s+box\b/i.test(line)){
      const m=/\(\s*([+\deE.\-]+)\s+([+\deE.\-]+)\s+([+\deE.\-]+)\s*\)\s*\(\s*([+\deE.\-]+)\s+([+\deE.\-]+)\s+([+\deE.\-]+)\s*\)/.exec(line);
      if(m&&m.slice(1).every(v=>Number.isFinite(Number(v))))bounds={min:m.slice(1,4).map(Number),max:m.slice(4,7).map(Number),line:at,unit:'m (OpenFOAM coordinate convention)'};
    }
    const fails=/(\d+)\s+mesh\s+checks?\s+failed/i.exec(line);
    if(fails)failedChecks=Number(fails[1]);
    if(/\b(?:FOAM FATAL ERROR|error in primitiveMesh|Failed\s+mesh\s+checks)\b/i.test(line))addUnique(failures,trim,at);
    else if(/^\s*\*{2,}\s*/.test(line)||/\b(?:severely\s+non.orthogonal|highly\s+skew|incorrect\s+orientation|non-manifold|negative\s+volume)\b/i.test(line)){
      if(/failed|error|illegal|negative|non.manifold/i.test(line))addUnique(failures,trim,at);
      else addUnique(warnings,trim,at)
    }
    const e=/^\s*Errors?\s*:\s*(\d+)\s*$/i.exec(line);if(e)errorsCount=Number(e[1]);
    const w=/^\s*Warnings?\s*:\s*(\d+)\s*$/i.exec(line);if(w)warningCount=Number(w[1]);
  }
  const metricCount=Object.values(records).filter(v=>v.status==='reported').length;
  // Numeric reports without a checkMesh marker must not be certified checkMesh.
  if(metricCount>=3&&/^\s*(?:points|faces|cells)\s*:/im.test(raw))recognized=true;
  if(regionsSeen.size&&!Number.isFinite(records.regions.value))
    records.regions={...records.regions,value:regionsSeen.size,status:'observed-labels-only',line:null};
  const indicatesFailure=failures.length>0||(failedChecks!==null&&failedChecks>0)||(errorsCount!==null&&errorsCount>0);
  const status=!recognized?'unrecognized':indicatesFailure?'failed':
    meshOk&&failedChecks!==null&&failedChecks===0?'reported-ok':
    meshOk?'reported-ok':failedChecks===0?'no-failed-checks-reported':'incomplete';
  const flags=warnings.length?['Review warnings emitted by checkMesh.']:[];
  if(!recognized)flags.push('This input was not recognized as a checkMesh-like report.');
  if(!meshOk&&failedChecks===null)flags.push('No checkMesh pass/fail summary found; status is not a proof of mesh quality.');
  if(!records.maxNonOrthogonality.value&&records.maxNonOrthogonality.status==='not-reported')
    flags.push('Non-orthogonality was not reported; do not assume it was zero.');
  return{
    schema:'foamlens/checkmesh-audit/1',sourceFile:cleanSource,sourceKind:'user-selected-checkMesh-text',
    recognized,status,regionLabel:lastRegion,regionLabels:[...regionsSeen],metrics:records,
    bounds,reported:{meshOk,failedChecks,errorsCount,warningCount},
    messages:{warnings,failures},notes:flags,
    limitations:[
      'Values are transcribed from a selected checkMesh text report, not independently computed from polyMesh.',
      'Unreported values are null; missing measurements are not interpreted as zero.',
      'A reported Mesh OK does not independently certify solver stability, physical validity or multi-region interface consistency.',
      'Dimension labels assume OpenFOAM native SI mesh coordinates; any pre-processing unit scaling must be verified separately.'
    ]
  }
}
/* FOAMLENS_CHECKMESH_CORE_END */
function maUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function maEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let maLastReport=null;
function maRender(report){
  const body=document.getElementById('maBody'),status=document.getElementById('maStatus');
  if(!body||!status)return;
  if(!report){status.textContent=maUi('Select a local checkMesh output (.log/.txt). No case files are modified.','Selecciona un reporte checkMesh local (.log/.txt). No se modifican archivos.');body.textContent='';return}
  const r=report,colors={failed:'extWarn','reported-ok':'extGood',incomplete:'extWarn',unrecognized:'extWarn','no-failed-checks-reported':'extGood'};
  status.innerHTML='<strong class="'+(colors[r.status]||'')+'">'+maEsc(r.status)+'</strong> · '+maEsc(r.sourceFile||'file')+' · '+Object.values(r.metrics).filter(m=>m.status!=='not-reported').length+' '+maUi('reported metrics','métricas reportadas');
  const rows=Object.values(r.metrics).map(m=>'<tr><td>'+maEsc(m.label)+'</td><td>'+maEsc(m.value===null?'—':Number(m.value).toLocaleString('en-US',{maximumSignificantDigits:8}))+'</td><td>'+maEsc(m.unit)+'</td><td>'+maEsc(m.status)+'</td></tr>').join('');
  const bs=r.bounds?r.bounds.min.map((x,i)=>['X','Y','Z'][i]+': '+x+' → '+r.bounds.max[i]+' m').join(' · '):maUi('Not reported','No reportadas');
  const msg=[...r.messages.failures.map(x=>'ERROR line '+x.line+': '+x.message),...r.messages.warnings.map(x=>'WARNING line '+x.line+': '+x.message),...r.notes].map(x=>'<li>'+maEsc(x)+'</li>').join('');
  body.innerHTML='<div class="extInfo"><b>'+maUi('Domain bounds','Límites del dominio')+':</b> '+maEsc(bs)+'</div>'+
    '<div class="extTableWrap"><table><thead><tr><th>'+maUi('Measured quantity','Magnitud reportada')+'</th><th>'+maUi('Value','Valor')+'</th><th>'+maUi('Units','Unidades')+'</th><th>'+maUi('Evidence','Evidencia')+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (msg?'<ul class="smallnote">'+msg+'</ul>':'')+
    '<p class="smallnote">'+maEsc(r.limitations[0])+'</p>';
}
function maExport(){
  if(!maLastReport)return;
  const payload=JSON.stringify({...maLastReport,exportedAt:new Date().toISOString()},null,2);
  if(typeof downloadText==='function')downloadText('FoamLens_checkMesh_audit.json',payload,'application/json');
  else{
    const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='FoamLens_checkMesh_audit.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
  }
}
async function maReadSelected(){
  const input=document.getElementById('maFile'),file=input?.files?.[0];
  if(!file)return;
  const status=document.getElementById('maStatus');
  if(file.size>12*1024*1024){status.textContent=maUi('Maximum report size: 12 MiB.','Tamaño máximo: 12 MiB.');return}
  try{
    status.textContent=maUi('Reading selected text locally…','Leyendo texto seleccionado localmente…');
    const content=await file.text(),report=maPureCheckMesh(content,file.name);
    maLastReport=report;maRender(report);
    document.getElementById('maExport').disabled=false
  }catch(e){status.textContent=maUi('Cannot inspect this file: ','No se puede inspeccionar el archivo: ')+String(e?.message||e)}
}
function maInstall(){
  const parent=document.getElementById('datasetModeBlock');
  if(!parent||document.getElementById('maPanel'))return;
  const d=document.createElement('details');d.id='maPanel';d.className='analysisExt';
  d.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Mesh & Geometry Auditor — checkMesh evidence" data-fl-es="Auditor de malla y geometría — evidencia checkMesh">Mesh & Geometry Auditor — checkMesh evidence</strong><span class="badge">checkMesh · source text</span></summary>'+
    '<div class="extSectionBody"><p class="smallnote" data-fl-en="Import an existing checkMesh report, including any mesh warnings. This tool does not run checkMesh or alter a simulation." data-fl-es="Importa un reporte checkMesh existente. Esta herramienta no ejecuta checkMesh ni modifica la simulación.">Import an existing checkMesh report, including any mesh warnings. This tool does not run checkMesh or alter a simulation.</p>'+
    '<div class="extActions"><label class="field" for="maFile"><span data-fl-en="Local report" data-fl-es="Reporte local">Local report</span><input type="file" id="maFile" accept=".log,.txt,.out,text/plain"></label>'+
    '<button type="button" class="btn soft" id="maAnalyze" data-fl-en="Inspect report" data-fl-es="Inspeccionar reporte">Inspect report</button>'+
    '<button type="button" class="btn soft" id="maExport" disabled data-fl-en="Export audit JSON" data-fl-es="Exportar auditoría JSON">Export audit JSON</button></div>'+
    '<div id="maStatus" class="extStatus"></div><div id="maBody" class="extSectionBody"></div></div>';
  parent.append(d);
  document.getElementById('maAnalyze').addEventListener('click',maReadSelected);
  document.getElementById('maFile').addEventListener('change',()=>{maLastReport=null;document.getElementById('maExport').disabled=true;maRender(null)});
  document.getElementById('maExport').addEventListener('click',maExport);
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(d)}catch{}
  maRender(null)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maInstall,{once:true});
else maInstall();
window.FoamLensMeshAuditor={parse:maPureCheckMesh,export:maExport};
