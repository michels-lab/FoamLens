/* FoamLens — Operación Granada #155, scientific CASE health evidence index.
   Complements (never replaces) the existing Diagnostic, Energy, PIMPLE and checkMesh audits.
   Reports individual evidence states; NEVER claims whole-case physical validation.
*/
/* FOAMLENS_CASE_HEALTH_CORE_START */
const chStatuses=['verified','warning','error','insufficient-information','not-analyzed','not-applicable'];
function chNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  if(typeof value!=='string'||!value.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))return NaN;
  const n=Number(value);return Number.isFinite(n)?n:NaN
}
function chValidPairs(s){
  if(!Array.isArray(s?.t)||!Array.isArray(s?.y)||s.t.length!==s.y.length||!s.t.length)return null;
  const rows=[];
  for(let i=0;i<s.t.length;i++){
    const t=chNumber(s.t[i]),v=chNumber(s.y[i]);if(!Number.isFinite(t)||!Number.isFinite(v))return null;
    rows.push([t,v])
  }
  for(let i=1;i<rows.length;i++)if(!(rows[i][0]>rows[i-1][0]))return null;
  return rows
}
function chLogMetrics(logs,root,metric){
  return(logs||[]).filter(s=>String(s.logMetric||'')===metric&&
    (root===null||String(s.logRoot||'')===root)&&s.derived!==true&&
    s.derivedKind!=='difference').map(s=>({source:s,rows:chValidPairs(s)}));
}
function chRuntime(text='',name=''){
  if(typeof text!=='string')return{recognized:false,completion:'unknown',fatal:false,events:[],sourceFile:String(name)};
  if(text.length>4*1024*1024)throw Error('Solver log exceeds 4 MiB local audit limit');
  const lines=text.split(/\r?\n/),events=[],add=(kind,line,i)=>{
    if(events.length<35)events.push({kind,line:i+1,text:line.trim().slice(0,230)})
  };
  let recognized=false,hasEnd=false,fatal=false,foamAbort=false,physicalTimes=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(/^(?:Time\s*=\s*[+\deE.-]+|Exec\s*:|Create\s+time|Courant\s+Number|Solving\s+for\s+)/i.test(line))recognized=true;
    const time=/^Time\s*=\s*([+\deE.-]+)\s*$/.exec(line);
    if(time){const t=chNumber(time[1]);if(Number.isFinite(t))physicalTimes.push(t)}
    if(/^End\s*$/i.test(line)){hasEnd=true;add('explicit-end',line,i)}
    if(/\bFOAM\s+FATAL\s+(?:IO\s+)?ERROR\b|\bFloating\s+point\s+exception\b|^\s*Segmentation\s+fault\b/i.test(line)){
      fatal=true;add('fatal',line,i)
    }
    if(/\bFOAM\s+aborting\b|\bSIG(?:SEGV|FPE)\b/i.test(line)){foamAbort=true;add('abort',line,i)}
  }
  const noBackwards=physicalTimes.every((t,i)=>i===0||t>=physicalTimes[i-1]);
  return{recognized,completion:!recognized?'unknown':(fatal||foamAbort)?'failed':hasEnd?'explicit-end-reported':'not-demonstrated',
    fatal:fatal||foamAbort,hasEnd,events,nondecreasingTime:noBackwards,
    observedTimes:physicalTimes.length,timeStart:physicalTimes.length?physicalTimes[0]:null,
    timeLast:physicalTimes.length?physicalTimes.at(-1):null,
    sourceFile:String(name||'').slice(0,150),
    limitations:['User-selected run log is not cryptographically bound to the selected case.',
      'An End marker in a text file is not independently proof that all configured boundary conditions or physical equations are valid.']}
}
function chAudit(input={}){
  const c=input.case||{},m=c.discoveryModel||{},d=c.discovery||{},
    rawLogs=(input.logs||[]).filter(s=>String(s.caseId)===String(c.id)&&s.derived!==true),
    config=c.config||{},cfgSource=config.source||{},fields=Array.isArray(m.fields)?m.fields:[],
    dictionary=Array.isArray(m.dictionaries)?m.dictionaries:[],
    timeDirs=Array.isArray(m.timeDirectories)?m.timeDirectories:[],
    modelRegions=Array.isArray(m.regions)?m.regions:[],
    regions=[...new Set([...(modelRegions||[]),...((d.regions||[]))])],
    runtime=input.runtime||null,mesh=input.meshReport||null;
  const checks=[],record=(id,title,status,details,evidence=[],recommendation='')=>{
    if(!chStatuses.includes(status))throw Error('Unknown health state '+status);
    checks.push({id,title,status,details:String(details||''),evidence:evidence.slice(0,15),recommendation})
  };
  const paths=(arr)=>[...new Set((arr||[]).map(s=>String(s.sourcePath||s.path||'')).filter(Boolean))].slice(0,12);
  if(!Number.isFinite(chNumber(c.id)))return{schema:'foamlens/scientific-case-health/1',
    caseId:null,caseName:'',checks:[],coverage:{analyzed:0,total:0},overall:'not-assessed',
    limitations:['No actual OpenFOAM case selected.']};
  const strictNumber=(n)=>Number.isFinite(chNumber(n))?chNumber(n):null;
  const physicalTimes=timeDirs.map(chNumber).filter(Number.isFinite).sort((a,b)=>a-b),
    distinctTimes=[...new Set(physicalTimes)];
  if(!fields.length)record('fields','OpenFOAM field inventory','insufficient-information',
    'No inspectable field groups in the currently loaded case; missing source or partial folder import is possible.',[],
    'Import complete OpenFOAM time directories and check Data Catalog.');
  else{
    const noRecords=fields.filter(f=>!(f.records||[]).length);
    record('fields','OpenFOAM field inventory',noRecords.length?'warning':'verified',
      fields.length+' discovered field groups; '+noRecords.length+' lack original records.',
      paths(fields.flatMap(f=>f.records||[])), 'Field discovery is not proof of field values being numerically correct.');
  }
  if(distinctTimes.length<2)record('time','Physical time coverage','insufficient-information',
      'Fewer than two distinct numeric output-time directories were discovered.',[],
      'Load additional actual solver time directories.');
  else record('time','Physical time coverage','verified',
    distinctTimes.length+' distinct output-time directories; '+distinctTimes[0]+'–'+distinctTimes.at(-1)+' s. These are WRITE intervals, not timestep deltaT.',
    [],'Do not infer solver-step deltaT from write intervals.');
  const hasControl=!!cfgSource.controlDict;
  if(!hasControl)record('control','Run control and configured end time','insufficient-information',
    'Source controlDict could not be verified. Solver completeness/endTime cannot be inferred from last file time.',
    paths(dictionary),'Load system/controlDict with the case.');
  else{
    const delta=strictNumber(config.deltaT),end=strictNumber(config.endTime),
      adjust=typeof config.adjustTimeStep==='boolean'?config.adjustTimeStep:null;
    const readable=[delta!=null&&delta>0?'deltaT='+delta+' s':null,
      end!=null?'endTime='+end+' s':null,adjust!=null?'adjustTimeStep='+adjust:null].filter(Boolean);
    record('control','Run control and configured end time',readable.length?'verified':'warning',
      'Verified controlDict source; '+(readable.join(', ')||'runtime settings not fully extracted')+
      '. A configured end time is not proof that the run finished.',
      paths(dictionary.filter(x=>/controlDict/.test(x.name||x.sourcePath||''))),
      'Compare actual original solver End marker and final time separately.');
  }
  if(!runtime)record('completion','Solver run completion','not-analyzed',
    'No user-selected original solver log analyzed. Completion is unknown.');
  else if(!runtime.recognized)record('completion','Solver run completion','insufficient-information',
    'Selected text does not contain recognized OpenFOAM runtime lines.',runtime.sourceFile?[runtime.sourceFile]:[]);
  else record('completion','Solver run completion',
      runtime.completion==='failed'||runtime.nondecreasingTime===false?'error':
      runtime.completion==='explicit-end-reported'?'verified':'warning',
      runtime.completion==='explicit-end-reported'?'Original user-selected log reports End marker (run-log evidence only).':
       runtime.completion==='failed'?'Original user-selected log contains a fatal/abort event.':
       'OpenFOAM execution evidence found, but no explicit End marker.'+
       (runtime.nondecreasingTime===false?' Solver time decreased inside the same log.':''),
       runtime.sourceFile?[runtime.sourceFile]:[],
       'The log is manually selected and not independently proven to belong to this case.');
  const maxCo=chLogMetrics(rawLogs,'Courant','courantMax'),validCo=maxCo.filter(x=>x.rows);
  const configuredMaxCo=hasControl?strictNumber(config.maxCo):null;
  if(!maxCo.length)record('courant','Courant number','insufficient-information','No measured CourantMax log data for this case.');
  else if(!validCo.length)record('courant','Courant number','error','CourantMax series have missing/nonfinite/unordered samples.',paths(maxCo.map(x=>x.source)));
  else{
    const observations=validCo.flatMap(s=>s.rows.map(p=>p[1])),maximum=Math.max(...observations),
      limit=configuredMaxCo!=null&&configuredMaxCo>0?configuredMaxCo:null,
      alert=limit!==null&&maximum>limit,invalid=maxCo.length-validCo.length;
    record('courant','Courant number',invalid?'error':alert?'warning':limit===null?'insufficient-information':'verified',
      'Observed CourantMax peak '+maximum+' across '+observations.length+' samples; invalid source histories '+invalid+'.'+
       (limit!==null?' Case controlDict maxCo='+limit+'.':' No sourced maxCo limit; no generic numerical pass threshold inferred.'),
      paths(validCo.map(x=>x.source)),'A Courant below a configured limit is not a universal stability guarantee.');
  }
  const residualSeries=rawLogs.filter(s=>s.logMetric==='initialResidual'||s.logMetric==='finalResidual');
  if(!residualSeries.length)record('residuals','Linear solver residual evidence','insufficient-information',
    'No original initial/final residual log data available.');
  else{
    const groups=[...new Set(residualSeries.map(s=>s.logRoot))],invalid=residualSeries.filter(s=>!chValidPairs(s)),
      unsolved=groups.filter(g=>!residualSeries.some(s=>s.logRoot===g&&s.logMetric==='finalResidual'));
    record('residuals','Linear solver residual evidence',invalid.length?'error':unsolved.length?'warning':'verified',
      groups.length+' residual root(s): '+groups.join(', ')+'. Missing/invalid series: '+invalid.length+
      '. Roots lacking final residual evidence: '+unsolved.join(', ')+'. Low residuals are NOT convergence proof.',
      paths(residualSeries),'Use existing Diagnostic and Coupling Auditor for per-solve and PIMPLE details.');
  }
  const cont=rawLogs.filter(s=>String(s.logMetric||'').startsWith('continuity'));
  if(!cont.length)record('continuity','Continuity conservation evidence','insufficient-information',
    'No original continuity error history. Cannot claim mass-conservation accuracy.');
  else{
    const bad=cont.filter(s=>!chValidPairs(s)),valid=cont.filter(s=>chValidPairs(s));
    const sample=valid.flatMap(s=>chValidPairs(s).map(p=>Math.abs(p[1])));
    record('continuity','Continuity conservation evidence',bad.length?'error':'verified',
      valid.length+' continuity metric history(s) present; maximum reported absolute value '+
      (sample.length?Math.max(...sample):'unavailable')+
      '. Data presence/finite checks only; no user/physics-specific acceptance threshold provided.',
      paths(cont),'Continuity error magnitudes require solver, compressibility, units and problem context.');
  }
  if(!cfgSource.fvSolution)record('pimple','PIMPLE/PISO/SIMPLE settings','insufficient-information',
    'fvSolution not available; coupling topology and number of correctors cannot be certified.');
  else record('pimple','PIMPLE/PISO/SIMPLE settings',
    Number.isInteger(config.nOuterCorrectors)&&config.nOuterCorrectors>0&&
    Number.isInteger(config.nCorrectors)&&config.nCorrectors>0?'verified':'warning',
    'fvSolution source present; declared nOuter='+String(config.nOuterCorrectors??'unavailable')+
    ', nCorrectors='+String(config.nCorrectors??'unavailable')+
    '. Presence does not prove nonlinear convergence.',paths(dictionary),
    'Inspect the existing Coupling Auditor with solver-log evidence.');
  const info=mesh?.status;
  if(!mesh)record('mesh','checkMesh independent audit','not-analyzed',
    'No checkMesh file selected for this audit; do not treat missing report as Mesh OK.');
  else if(!mesh.recognized||info==='unrecognized')record('mesh','checkMesh independent audit','insufficient-information',
    'Selected checkMesh-like text is not recognized.',mesh.sourceFile?[mesh.sourceFile]:[]);
  else record('mesh','checkMesh independent audit',
    info==='failed'?'error':info==='reported-ok'&&!mesh.messages?.warnings?.length?'verified':'warning',
    'User-selected checkMesh report status: '+info+'. '+(mesh.regionAudits?.length||0)+' separate region report(s).'+
    (mesh.messages?.warnings?.length?' Warnings reported: '+mesh.messages.warnings.length+'.':''),
    mesh.sourceFile?[mesh.sourceFile]:[],
    'The checkMesh report is user-selected and not cryptographically bound to the case. Mesh OK is not CFD validation.');
  const untyped=fields.filter(f=>!String(f.dimensions||'').trim()||!String(f.fieldClass||'').trim()),
    missingBoundary=fields.filter(f=>!(f.boundaries||[]).length);
  if(!fields.length)record('dimensions','Field dimensions and BC metadata','insufficient-information',
    'No source field headers loaded for checking original dimensions or boundary metadata.');
  else record('dimensions','Field dimensions and BC metadata',
    untyped.length?'warning':'verified',
    'Fields lacking class/dimension header: '+untyped.length+'/'+fields.length+
    '. Fields without parsed patch declarations: '+missingBoundary.length+'/'+fields.length+
    '. Presence of metadata does NOT validate physical correctness of BC or thermophysical properties.',
    paths(fields.flatMap(f=>f.records||[])),'Review thermophysicalProperties, turbulenceProperties and patch values in source files.');
  if(regions.length<2)record('interfaces','Multi-region interface consistency','not-applicable',
      regions.length===1?'Only one material region was identified.':'No explicit multiple material regions discovered.');
  else record('interfaces','Multi-region interface consistency','insufficient-information',
    regions.length+' material-region labels discovered ('+regions.join(', ')+
      '). No independently matched interface patch geometry/normals, heat exchange, or contact resistance verified.',
      paths(dictionary),'Use separate Field and Energy interface auditors; do not infer patch correspondence by name.');
  const energy=rawLogs.filter(s=>['h','e','T'].includes(String(s.logRoot||''))&&s.logMetric==='initialResidual'),
    energyPost=(m.postProcessing||[]).filter(p=>/energy|enthalpy|heatflux|alpha|phase/i.test(p.functionPath||p.fileName||''));
  if(!energy.length&&!energyPost.length)record('energy','Energy/phase conservation evidence','insufficient-information',
    'No source energy/enthalpy/temperature solve or postProcessing reduction discovered.');
  else record('energy','Energy/phase conservation evidence','warning',
    energy.length+' energy/temperature residual series and '+energyPost.length+
    ' related postProcessing group(s) discovered. Conservation of sensible+latent energy remains unverified.',
    paths([...energy,...energyPost.flatMap(p=>p.records||[])]),
    'Use Energy Audit and complete physical boundary/storage accounting; no implicit heat-balance proof.');
  const counts=Object.fromEntries(chStatuses.map(s=>[s,checks.filter(v=>v.status===s).length]));
  return{schema:'foamlens/scientific-case-health/1',
    caseId:c.id,caseName:String(c.name||''),rootPath:String(c.rootPath||''),
    checks,counts,coverage:{analyzed:checks.filter(s=>['verified','warning','error'].includes(s.status)).length,
      total:checks.length},overall:'not-certified',
    sourceInventory:{timeDirectories:distinctTimes.length,fieldGroups:fields.length,logSeries:rawLogs.length,
      dictionaryEntries:dictionary.length,regions:regions.slice(0,100)},
    limitations:[
      'Health states classify evidence availability/observations, not the physical correctness of the simulation.',
      'Verified means the named source assertion is evidenced; it NEVER means the OpenFOAM case is physically valid.',
      'No automatic inference of time-step deltaT from write times, convergence from residual size, or mass/energy conservation from scalar output alone.',
      'No source research data is uploaded; uploaded runtime and checkMesh reports are analyzed locally and explicitly.',
      'Imported subsets, modified user-selected reports, and incomplete source indexing can change classifications.'
    ]}
}
/* FOAMLENS_CASE_HEALTH_CORE_END */

function chUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function chEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let chLast=null,chBound=null,chMesh=null,chRuntimeLog=null,chSelectionVersion=0;
function chEl(id){return document.getElementById(id)}
function chInvalidate(message=''){
  chLast=null;chBound=null;const b=chEl('chExport');if(b)b.disabled=true;
  const body=chEl('chBody');if(body)body.textContent='';
  if(message&&chEl('chStatus'))chEl('chStatus').textContent=message
}
function chSourceLogRows(c){
  return(typeof series==='undefined'||!Array.isArray(series)?[]:series).filter(s=>
    String(s.caseId)===String(c.id)&&
    (typeof datasetTypeOf==='function'?datasetTypeOf(s)==='log':s.datasetType==='log')&&
    s.derived!==true&&s.derivedKind!=='difference')
}
function chSelectedCase(){
  const x=chEl('chCase')?.value;
  return x===''?null:(Array.isArray(cases)?cases.find(c=>String(c.id)===String(x)):null)
}
function chRefresh(){
  const sel=chEl('chCase');if(!sel)return;
  const old=sel.value,options=Array.isArray(cases)?cases:[],prior=chSelectedCase();
  sel.innerHTML='<option value="">'+chEsc(chUi('Select OpenFOAM case','Seleccionar caso OpenFOAM'))+'</option>'+
    options.map(c=>'<option value="'+chEsc(c.id)+'">'+chEsc(c.name||c.id)+'</option>').join('');
  if(options.some(c=>String(c.id)===old))sel.value=old;
  else if(typeof activeContextCaseId!=='undefined'&&activeContextCaseId!=null&&
      options.some(c=>String(c.id)===String(activeContextCaseId)))sel.value=String(activeContextCaseId);
  if(prior!==chSelectedCase()){chSelectionVersion++;chMesh=null;chRuntimeLog=null;
    const runtimeInput=chEl('chRuntimeFile'),meshInput=chEl('chMeshFile');
    if(runtimeInput)runtimeInput.value='';if(meshInput)meshInput.value='';
  }
  chInvalidate(chUi('Choose case, optionally attach original reports, then run evidence audit.',
    'Elige caso, adjunta reportes si existen y ejecuta la auditoría de evidencia.'))
}
function chRun(){
  chInvalidate();const c=chSelectedCase(),status=chEl('chStatus');if(!c){status.textContent='Select an imported case.';return}
  if(!c.discoveryModel){status.textContent='Imported case discovery model unavailable; rescan the full case before auditing.';return}
  const logs=chSourceLogRows(c),r=chAudit({case:c,logs,runtime:chRuntimeLog,meshReport:chMesh});
  if(!r.checks.length){status.textContent='No case evidence could be evaluated.';return}
  chLast=r;chBound={case:c,model:c.discoveryModel,logs:logs.slice(),
    meshReport:chMesh,runtimeLog:chRuntimeLog};
  const counts=r.counts;
  status.textContent='Evidence coverage: '+r.coverage.analyzed+'/'+r.coverage.total+
    ' checks · errors '+counts.error+' · warnings '+counts.warning+
    ' · insufficient '+counts['insufficient-information']+' · NOT a case-validity verdict.';
  chEl('chBody').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    '<th>Evidence check</th><th>State</th><th>Source-backed observation and limitation</th></tr></thead><tbody>'+
    r.checks.map(check=>'<tr><td>'+chEsc(check.title)+'</td><td>'+chEsc(check.status)+'</td>'+
      '<td>'+chEsc(check.details)+(check.evidence?.length?'<div class="smallnote">Source: '+
      chEsc(check.evidence.join(' · '))+'</div>':'')+
      (check.recommendation?'<div class="smallnote">Next: '+chEsc(check.recommendation)+'</div>':'')+
      '</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="smallnote">'+chEsc(r.limitations.join(' '))+'</p>';
  chEl('chExport').disabled=false
}
function chDownload(data){
  const body=JSON.stringify(data,null,2);
  if(typeof downloadText==='function'){downloadText('FoamLens_scientific_case_health.json',body,'application/json');return}
  const u=URL.createObjectURL(new Blob([body],{type:'application/json'})),a=document.createElement('a');
  a.href=u;a.download='FoamLens_scientific_case_health.json';document.body.appendChild(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)
}
function chExport(){
  if(!chLast||!chBound)return;
  const c=chSelectedCase(),now=c?chSourceLogRows(c):[];
  // A case scan or log catalog refresh after evaluation must not export stale evidence.
  if(c!==chBound.case||c.discoveryModel!==chBound.model||
      now.length!==chBound.logs.length||now.some((v,i)=>v!==chBound.logs[i])||
      chRuntimeLog!==chBound.runtimeLog||chMesh!==chBound.meshReport){
    chInvalidate('Case catalog, source logs or evidence reports changed. Recalculate before exporting.');return
  }
  chDownload({...chLast,exportedAt:new Date().toISOString(),
    sourceContext:'read-only locally imported case + user-selected reports',
    reportBindingsVerifiedToCase:false})
}
async function chReadFile(input,maxBytes){
  const f=input.files?.[0];if(!f)return null;
  if(f.size>maxBytes)throw Error('File exceeds local audit size limit.');
  return{file:f.name,text:await f.text()}
}
function chInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('paTools');
  if(!host||chEl('chPanel'))return;
  const panel=document.createElement('details');panel.id='chPanel';panel.className='detailBlock';panel.style.marginTop='12px';
  panel.innerHTML='<summary><b data-fl-en="Granada · Scientific Case Health" data-fl-es="Granada · Salud científica del caso">Granada · Scientific Case Health</b></summary>'+
    '<p class="smallnote">Evidence-only OpenFOAM audit. Verified ≠ physically valid. Existing checkMesh, Coupling, and Energy auditors remain independent.</p>'+
    '<div class="field"><label>Imported OpenFOAM case</label><select id="chCase"></select></div>'+
    '<div class="extGrid2"><div class="field"><label>Optional original solver run log (.log/.txt) — manually attributed to case</label>'+
    '<input type="file" id="chRuntimeFile" accept=".log,.txt,.out,text/plain"></div>'+
    '<div class="field"><label>Optional original checkMesh report (.log/.txt) — manually attributed to case</label>'+
    '<input type="file" id="chMeshFile" accept=".log,.txt,.out,text/plain"></div></div>'+
    '<p class="smallnote">Optional report filenames are user-selected; their provenance is NOT cryptographically bound to the imported case.</p>'+
    '<div class="extActions"><button class="btn soft" type="button" id="chRefresh">Refresh case list</button>'+
    '<button class="btn primary" type="button" id="chAudit">Audit current evidence</button>'+
    '<button class="btn soft" type="button" id="chExport" disabled>Export JSON evidence</button></div>'+
    '<p id="chStatus" class="extStatus" aria-live="polite"></p><div id="chBody"></div>';
  host.appendChild(panel);
  chEl('chRefresh').onclick=chRefresh;chEl('chAudit').onclick=chRun;chEl('chExport').onclick=chExport;
  chEl('chCase').addEventListener('change',()=>{chSelectionVersion++;chMesh=null;chRuntimeLog=null;
    chEl('chRuntimeFile').value='';chEl('chMeshFile').value='';
    chInvalidate('Case changed. Optional reports cleared to prevent cross-case misattribution.')});
  for(const [id,key,bytes] of [['chRuntimeFile','runtime',4*1024*1024],['chMeshFile','mesh',12*1024*1024]]){
    chEl(id).addEventListener('change',async()=>{
      const seq=++chSelectionVersion;chInvalidate('Reading selected text locally…');
      if(key==='runtime')chRuntimeLog=null;else chMesh=null;
      try{
        const data=await chReadFile(chEl(id),bytes);if(seq!==chSelectionVersion)return;
        if(key==='runtime')chRuntimeLog=data?chRuntime(data.text,data.file):null;
        else chMesh=data?maPureCheckMesh(data.text,data.file):null;
        chInvalidate(data?'Report parsed. Re-run the case audit.':'Report cleared. Re-run the case audit.')
      }catch(e){if(seq!==chSelectionVersion)return;chInvalidate(String(e?.message||e))}
    })
  }
  panel.addEventListener('toggle',()=>{if(panel.open)chRefresh()});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(panel)}catch{}
  chRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',chInstall,{once:true});else chInstall();
window.FoamLensScientificCaseHealth={audit:chAudit,runtime:chRuntime,states:chStatuses.slice()};
