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
  let recognized=false,hasEnd=false,fatal=false,foamAbort=false,physicalTimes=[],lastEndLine=-1,lastProgressLine=-1;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(/^(?:Time\s*=\s*[+\deE.-]+|Exec\s*:|Create\s+time|Courant\s+Number|Solving\s+for\s+)/i.test(line))recognized=true;
    const time=/^Time\s*=\s*([+\deE.-]+)\s*$/.exec(line);
    if(time){const t=chNumber(time[1]);if(Number.isFinite(t)){physicalTimes.push(t);lastProgressLine=i}}
    if(/^(?:Courant\s+Number|Solving\s+for\s+|ExecutionTime\s*=|Time\s*step\s*=)/i.test(line))lastProgressLine=i;
    if(/^End\s*$/i.test(line)){hasEnd=true;lastEndLine=i;add('explicit-end',line,i)}
    // Normal Foundation sigFpe startup announces trapping, not an exception.
    if(/\bFOAM\s+FATAL\s+(?:IO\s+)?ERROR\b|^\s*(?:Floating\s+point\s+exception|Segmentation\s+fault)\b/i.test(line)){
      fatal=true;add('fatal',line,i)
    }
    if(/\bFOAM\s+aborting\b|\b(?:received|caught|terminated by)\s+(?:signal\s+)?SIG(?:SEGV|FPE)\b/i.test(line)||/^SIG(?:SEGV|FPE)\b/.test(line)){foamAbort=true;add('abort',line,i)}
  }
  const noBackwards=physicalTimes.every((t,i)=>i===0||t>=physicalTimes[i-1]);
  const endAfterProgress=hasEnd&&lastEndLine>=lastProgressLine;
  return{recognized,completion:!recognized?'unknown':(fatal||foamAbort)?'failed':endAfterProgress?'explicit-end-reported':'not-demonstrated',
    fatal:fatal||foamAbort,hasEnd,endAfterProgress,events,nondecreasingTime:noBackwards,
    observedTimes:physicalTimes.length,timeStart:physicalTimes.length?physicalTimes[0]:null,
    timeLast:physicalTimes.length?physicalTimes.at(-1):null,
    sourceFile:String(name||'').slice(0,150),
    limitations:['User-selected run log is not cryptographically bound to the selected case.',
      'An End marker in a text file is not independently proof that all configured boundary conditions or physical equations are valid.']}
}
// Read user-selected, source-native postrun CSV without rerunning OpenFOAM.
// A syntactically consistent reduction is NOT proof of original frame values,
// material properties, mesh completeness, conservation or experiment matching.
function chCsvCells(line){
  const cells=[];let value='',quoted=false,closed=false;
  const finish=()=>{cells.push(value.trim());value='';closed=false};
  for(let i=0;i<line.length;i++){
    const char=line[i];
    if(quoted){
      if(char==='"'){
        if(line[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}
      }else value+=char
    }else if(char===','){finish()}
    else if(char==='"'){
      if(value.trim()!==''||closed)throw Error('Malformed CSV quote in source row');
      quoted=true
    }else{
      if(closed&&char.trim()!=='')throw Error('Unexpected data after CSV quote');
      if(!closed)value+=char
    }
  }
  if(quoted)throw Error('Unclosed CSV quote in source row');
  finish();return cells
}
function chPostRunCsv(text='',sourceFile=''){
  if(typeof text!=='string'||text.length>4*1024*1024)
    throw Error('Native postrun CSV exceeds 4 MiB local-only limit');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  while(lines.length&&lines.at(-1).trim()==='')lines.pop();
  if(lines.length<3||lines.length>10001)
    throw Error('Native postrun requires 2–10000 actual physical samples');
  const header=chCsvCells(lines[0]);
  if(header.length<2||header.length>80||
     header.some(h=>!/^[A-Za-z_][A-Za-z0-9_.:\/%-]{0,119}$/.test(h))||
     new Set(header).size!==header.length||!header.includes('time_s'))
    throw Error('Require unique source numeric column names and explicit time_s header');
  const columnValues=header.map(()=>({min:Infinity,max:-Infinity,first:null,last:null}));
  const valuesByColumn=header.map(()=>[]);
  let firstTime=null,lastTime=null,minGap=Infinity,maxGap=0;const savedTimes=[];
  for(let row=1;row<lines.length;row++){
    const cells=chCsvCells(lines[row]);
    if(cells.length!==header.length)
      throw Error('Incomplete or mismatched source CSV row '+(row+1));
    const values=cells.map(chNumber);
    if(values.some(n=>!Number.isFinite(n)))
      throw Error('Missing/nonfinite/nondecimal source sample at row '+(row+1));
    const time=values[header.indexOf('time_s')];
    if(lastTime!==null){
      if(!(time>lastTime))throw Error('Original saved physical times must be strictly increasing');
      const gap=time-lastTime;
      if(!Number.isFinite(gap)||gap<=0)
        throw Error('Saved physical time interval is not finite; cannot export misleading timing statistics');
      minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap)
    }else firstTime=time;
    lastTime=time;savedTimes.push(time);
    for(let col=0;col<values.length;col++){
      const value=values[col],record=columnValues[col];
      valuesByColumn[col].push(value);
      if(row===1)record.first=value;
      record.last=value;record.min=Math.min(record.min,value);record.max=Math.max(record.max,value)
    }
  }
  const result={schema:'foamlens/native-postrun-csv-evidence/1',
    sourceFile:String(sourceFile||'').slice(0,180),
    samples:lines.length-1,savedTimes_s:savedTimes,
    firstTime_s:firstTime,lastTime_s:lastTime,
    minSavedInterval_s:minGap,maxSavedInterval_s:maxGap,
    headers:header.slice(),
    columns:header.map((name,i)=>({name,...columnValues[i]})),
    originalSamplesRevalidated:false,
    physicalModelValidated:false,originalCaseBindingVerified:false,
    note:'Imported numeric reductions only; timestamps are saved outputs, not solver deltaT. No source-frame, contact, latent heat, Courant, or experimental verification.'};
  // Full saved columns are used by the local workbench; do not expand every value in the summary JSON.
  Object.defineProperty(result,'valuesByColumn',{value:valuesByColumn,enumerable:false});
  return result
}

// Source CSV timestamps and imported OpenFOAM time directories must never be
// treated as equivalent solely because they round to a broad decimal window.
// A relative machine-precision guard prevents one saved frame from matching
// a physically distinct (small-time) frame at t≈0.
function chSourceTimeEqual(a,b){
  return Number.isFinite(a)&&Number.isFinite(b)&&
    Math.abs(a-b)<=16*Number.EPSILON*Math.max(1e-9,Math.abs(a),Math.abs(b))
}
function chSourceTimeCoverage(saved=[],indexed=[]){
  let csv=0,original=0,matched=0,missingCsv=0,missingOriginal=0;
  const firstUnmatchedCsvTimes_s=[],firstUnmatchedIndexedTimes_s=[];
  const noCsv=(t)=>{missingCsv++;if(firstUnmatchedCsvTimes_s.length<12)firstUnmatchedCsvTimes_s.push(t)};
  const noOriginal=(t)=>{missingOriginal++;if(firstUnmatchedIndexedTimes_s.length<12)firstUnmatchedIndexedTimes_s.push(t)};
  while(csv<saved.length&&original<indexed.length){
    if(chSourceTimeEqual(saved[csv],indexed[original])){matched++;csv++;original++}
    else if(saved[csv]<indexed[original])noCsv(saved[csv++]);
    else noOriginal(indexed[original++])
  }
  while(csv<saved.length)noCsv(saved[csv++]);
  while(original<indexed.length)noOriginal(indexed[original++]);
  return{csvSamples:saved.length,indexedOutputTimes:indexed.length,matchedCsvSamples:matched,
    unmatchedCsvSamples:missingCsv,unmatchedIndexedOutputTimes:missingOriginal,
    firstUnmatchedCsvTimes_s,firstUnmatchedIndexedTimes_s,
    coverage:!indexed.length?'original-inventory-unavailable':
      matched===saved.length?'csv-times-covered':matched?'partial-coverage':'no-overlap',
    originalCaseBindingVerified:false,physicalModelValidated:false,
    note:'Numeric timestamp alignment only (16 × machine epsilon relative to physical time). No hash, field, region or case-binding proof.'}
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
       'OpenFOAM execution evidence found, but no terminal End marker (or further solver progress after End).'+
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
  // External native reductions are manually selected. Attribute them to the
  // case only as unverified source-file context, never as certified physics.
  const postrunTimeline=input.postrun?chSourceTimeCoverage(input.postrun.savedTimes_s,distinctTimes):null;
  if(input.postrun){
    const p=input.postrun;
    const directoryOverlap=postrunTimeline.matchedCsvSamples;
    const checkedEnd=hasControl?strictNumber(config.endTime):null;
    const endConsistent=checkedEnd!=null&&chSourceTimeEqual(p.lastTime_s,checkedEnd);
    record('native-postrun','Native postrun CSV timeline','warning',
      p.samples+' explicit output samples from '+p.firstTime_s+' to '+p.lastTime_s+
      ' s; '+(p.headers.length-1)+' numeric reduction column(s). Saved interval: '+
      p.minSavedInterval_s+'–'+p.maxSavedInterval_s+
      ' s. CSV was checked for finite numeric values, strictly increasing source times and complete rows; no CFD was rerun.'+
      (distinctTimes.length?' '+directoryOverlap+'/'+p.samples+' CSV times align with the indexed original output-time directories; '+postrunTimeline.unmatchedCsvSamples+' CSV times unmatched; '+postrunTimeline.unmatchedIndexedOutputTimes+' original indexed times absent from CSV. Source coverage may be partial; numeric alignment is NOT proof of case ownership.':' No original output-time directory inventory for cross-check.')+
      (checkedEnd!=null?' Configured endTime='+checkedEnd+' s; last CSV time '+
        (endConsistent?'agrees numerically with this setting (NOT proof of solver completion).':'does not agree with this setting (review log and source).'):'')+
      ' This manually selected summary is not bound to original frames, patch fluxes, material parameters or independent experiments.',
      p.sourceFile?[p.sourceFile]:[],
      'For actual physical acceptance, inspect original metal/mold fields, solver log, energy/phase coupling and independent experimental evidence.');
  }

  const counts=Object.fromEntries(chStatuses.map(s=>[s,checks.filter(v=>v.status===s).length]));
  return{schema:'foamlens/scientific-case-health/1',
    caseId:c.id,caseName:String(c.name||''),rootPath:String(c.rootPath||''),
    checks,counts,coverage:{analyzed:checks.filter(s=>['verified','warning','error'].includes(s.status)).length,
      total:checks.length},overall:'not-certified',
    postrunTimeline,
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
let chLast=null,chBound=null,chMesh=null,chRuntimeLog=null,chPostrun=null,chSelectionVersion=0,chEvidenceOwner=null,chEvidenceModel=null;
const chReportStates=new Map();
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
function chRenderReportStates(){
  const host=chEl('chReportStates'),button=chEl('chAudit');
  if(button)button.disabled=!chSelectedCase()?.discoveryModel||[...chReportStates.values()].some(v=>v.status==='reading'||v.status==='error');
  if(!host)return;
  const labels={runtime:chUi('Solver log','Log del solver'),mesh:'checkMesh',postrun:chUi('Postrun CSV','CSV postrun')};
  const states={reading:chUi('Reading…','Leyendo…'),ready:chUi('Parsed','Leído'),error:chUi('Cannot read','No se pudo leer'),empty:chUi('Not attached','Sin adjuntar')};
  host.innerHTML=Object.keys(labels).map(key=>{
    const item=chReportStates.get(key)||{status:'empty',file:''};
    return '<div style="padding:8px;border:1px solid var(--line);border-radius:8px;min-width:0;overflow-wrap:anywhere"><b>'+chEsc(labels[key])+'</b> · '+chEsc(states[item.status])+(item.file?'<div class="smallnote">'+chEsc(item.file)+'</div>':'')+(item.error?'<div class="smallnote" role="alert">'+chEsc(item.error)+'</div>':'')+'</div>'
  }).join('')
}
function chResetReports(){
  chSelectionVersion++;chEvidenceOwner=chSelectedCase();chEvidenceModel=chEvidenceOwner?.discoveryModel||null;
  chMesh=null;chRuntimeLog=null;chPostrun=null;chReportStates.clear();
  for(const id of ['chRuntimeFile','chMeshFile','chPostrunFile']){const input=chEl(id);if(input)input.value=''}
  chRenderReportStates()
}
function chReportsCurrent(){
  const c=chSelectedCase();
  return !!c&&c===chEvidenceOwner&&c.discoveryModel===chEvidenceModel
}
function chBoundCurrent(){
  const c=chSelectedCase(),now=c?chSourceLogRows(c):[];
  return !!chLast&&!!chBound&&chReportsCurrent()&&c===chBound.case&&c.discoveryModel===chBound.model&&
    now.length===chBound.logs.length&&now.every((v,i)=>v===chBound.logs[i])&&
    chRuntimeLog===chBound.runtimeLog&&chMesh===chBound.meshReport&&chPostrun===chBound.postrun
}
async function chLoadReport(id,key,bytes){
  if(!chReportsCurrent()){chResetReports();chInvalidate(chUi('Choose a case and attach the reports again.','Elige un caso y vuelve a adjuntar los reportes.'));return}
  const seq=chSelectionVersion,input=chEl(id),file=input.files?.[0];
  const request={status:file?'reading':'empty',file:file?.name||''};
  chReportStates.set(key,request);
  if(key==='runtime')chRuntimeLog=null;else if(key==='mesh')chMesh=null;else chPostrun=null;
  chInvalidate(chUi('Source evidence changed.','Cambió la evidencia fuente.'));chRenderReportStates();
  const current=()=>seq===chSelectionVersion&&chReportsCurrent()&&chReportStates.get(key)===request;
  try{
    const data=await chReadFile(input,bytes);if(!current())return;
    if(key==='runtime')chRuntimeLog=data?chRuntime(data.text,data.file):null;
    else if(key==='mesh')chMesh=data?maPureCheckMesh(data.text,data.file):null;
    else chPostrun=data?chPostRunCsv(data.text,data.file):null;
    request.status=data?'ready':'empty';
  }catch(e){if(!current())return;request.status='error';request.error=String(e?.message||e)}
  if(!current())return;
  chRenderReportStates();
  if([...chReportStates.values()].some(v=>v.status==='reading'))return;
  if([...chReportStates.values()].some(v=>v.status==='error')){
    chInvalidate(chUi('A report could not be read. Replace or clear it before auditing.','No se pudo leer un reporte. Sustitúyelo o quítalo antes de auditar.'));return
  }
  if(chPostrun&&chSelectedCase()?.discoveryModel){chRun();return}
  chInvalidate(chUi('Reports ready. Run the case audit.','Reportes listos. Ejecuta la auditoría.'))
}
function chRefresh(){
  const sel=chEl('chCase');if(!sel)return;
  const old=sel.value,options=Array.isArray(cases)?cases:[],prior=chSelectedCase();
  sel.innerHTML='<option value="">'+chEsc(chUi('Select OpenFOAM case','Seleccionar caso OpenFOAM'))+'</option>'+
    options.map(c=>'<option value="'+chEsc(c.id)+'">'+chEsc(c.name||c.id)+'</option>').join('');
  if(options.some(c=>String(c.id)===old))sel.value=old;
  else if(typeof activeContextCaseId!=='undefined'&&activeContextCaseId!=null&&
      options.some(c=>String(c.id)===String(activeContextCaseId)))sel.value=String(activeContextCaseId);
  if(prior!==chSelectedCase()||!chReportsCurrent()){chResetReports();chInvalidate(chUi('Choose case, optionally attach original reports, then run evidence audit.','Elige caso, adjunta reportes si existen y ejecuta la auditoría de evidencia.'));return}
  chRenderReportStates();
  if(chLast&&!chBoundCurrent())chInvalidate(chUi('Case evidence changed. Re-run the audit.','Cambió la evidencia del caso. Ejecuta la auditoría nuevamente.'))
}
// Original postrun workbench: linked physical-time plots and exact stored-sample inspection.
function chPostrunFmt(n){
  if(!Number.isFinite(n))return '—';
  return n===0?'0':Number(n.toPrecision(7)).toString()
}
function chPostrunChart(p,index,first,last,cursor,color){
  const ts=p.savedTimes_s,ys=p.valuesByColumn[index],W=840,H=224,L=94,R=22,T=30,B=42;
  let ymin=Infinity,ymax=-Infinity;
  for(let i=first;i<=last;i++){ymin=Math.min(ymin,ys[i]);ymax=Math.max(ymax,ys[i])}
  const xmin=ts[first],xmax=ts[last],scaleY=Math.max(Math.abs(ymin),Math.abs(ymax),Number.MIN_VALUE);
  const yn0=ymin/scaleY,yn1=ymax/scaleY,scaleX=Math.max(Math.abs(xmin),Math.abs(xmax),Number.MIN_VALUE);
  const xn0=xmin/scaleX,xn1=xmax/scaleX;
  const x=i=>L+(xn1===xn0?.5:(ts[i]/scaleX-xn0)/(xn1-xn0))*(W-L-R);
  const y=v=>T+(yn1===yn0?.5:1-(v/scaleY-yn0)/(yn1-yn0))*(H-T-B);
  const blend=(a,b,t)=>a*(1-t)+b*t;
  let grid='';
  for(let j=0;j<=4;j++){
    const q=j/4,px=L+q*(W-L-R),py=T+q*(H-T-B);
    grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py+'" y2="'+py+'" stroke="#8994a3" opacity=".25"/>'+
      '<text x="'+(L-8)+'" y="'+(py+4)+'" text-anchor="end" font-size="11">'+chEsc(chPostrunFmt(blend(ymax,ymin,q)))+'</text>'+
      '<line x1="'+px+'" x2="'+px+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#8994a3" opacity=".2"/>'+
      '<text x="'+px+'" y="'+(H-B+17)+'" text-anchor="middle" font-size="11">'+chEsc(chPostrunFmt(blend(xmin,xmax,q)))+'</text>';
  }
  let coords='';
  for(let i=first;i<=last;i++)coords+=(i===first?'':' ')+x(i).toFixed(3)+','+y(ys[i]).toFixed(3);
  const k=Math.max(first,Math.min(last,cursor)),cx=x(k),cy=y(ys[k]);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+chEsc(p.headers[index])+'" style="display:block;width:100%;height:auto;max-height:300px;background:#111827;border-radius:9px" fill="#dbe5ef" font-family="system-ui,sans-serif">'+
    '<rect width="'+W+'" height="'+H+'" rx="9" fill="#111827"/>'+
    '<text x="'+L+'" y="18" font-size="13" font-weight="650" fill="'+color+'">'+chEsc(p.headers[index])+'</text>'+
    grid+'<path d="M '+L+' '+T+' V '+(H-B)+' H '+(W-R)+'" fill="none" stroke="#94a3b8"/>'+
    '<polyline points="'+coords+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'+
    '<line x1="'+cx+'" x2="'+cx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#e2e8f0" opacity=".85" stroke-dasharray="4 4"/>'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="4" fill="'+color+'" stroke="#fff"/>'+
    '<text x="'+((W+L-R)/2)+'" y="'+(H-5)+'" text-anchor="middle" font-size="11">time_s [s]</text></svg>'
}
function chPostrunSave(name,content,mime){
  if(typeof downloadText==='function'){downloadText(name,content,mime);return}
  const u=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');
  a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)
}
// Lower/upper bound over strictly increasing actual saved physical times.
function chPostrunWindow(ts,start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>end)return null;
  let lo=0,hi=ts.length;while(lo<hi){const mid=(lo+hi)>>1;if(ts[mid]<start)lo=mid+1;else hi=mid}
  const first=lo;lo=first;hi=ts.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(ts[mid]<=end)lo=mid+1;else hi=mid}
  return first<lo?{first,last:lo-1}:null
}
function chPostrunExtrema(values,first,last){
  let min=first,max=first;
  for(let i=first+1;i<=last;i++){if(values[i]<values[min])min=i;if(values[i]>values[max])max=i}
  return{min,max}
}
function chMountPostrunWorkbench(p){
  const host=chEl('chPostrunWorkbench');if(!host||!p?.valuesByColumn)return;
  const available=p.headers.map((name,i)=>({name,i})).filter(c=>c.name!=='time_s');
  if(!available.length)return;
  const opts=available.map(c=>'<option value="'+c.i+'">'+chEsc(c.name)+'</option>').join('');
  const label=(a,b)=>chEsc(chUi(a,b));
  host.style.cssText='display:grid;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);margin-bottom:12px;min-width:0';
  host.innerHTML='<h3 style="margin:0">'+label('Native postrun timeline','Evolución temporal de resultados nativos')+'</h3>'+
    '<p class="smallnote" style="margin:0;overflow-wrap:anywhere">'+chEsc(p.sourceFile)+' · '+p.samples+' '+label('original saved samples','muestras originales guardadas')+
    ' · '+label('independent Y scales, shared physical time; source headers preserved','escalas Y independientes, tiempo físico compartido; encabezados originales conservados')+'</p>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:8px">'+
    '<div class="field"><label for="chMetric1">'+label('Metric 1','Variable 1')+'</label><select id="chMetric1">'+opts+'</select></div>'+
    '<div class="field"><label for="chMetric2">'+label('Metric 2','Variable 2')+'</label><select id="chMetric2"><option value="">'+label('None','Ninguna')+'</option>'+opts+'</select></div>'+
    '<div class="field"><label for="chRangeFirst">'+label('First saved sample','Primera muestra')+'</label><input id="chRangeFirst" type="number" min="1" max="'+p.samples+'" value="1" step="1"></div>'+
    '<div class="field"><label for="chRangeLast">'+label('Last saved sample','Última muestra')+'</label><input id="chRangeLast" type="number" min="1" max="'+p.samples+'" value="'+p.samples+'" step="1"></div></div>'+
    '<div class="extActions"><button class="btn soft" id="chApplyRange" type="button">'+label('Apply time window','Aplicar intervalo')+'</button>'+
    '<button class="btn soft" id="chResetRange" type="button">'+label('Full history','Historial completo')+'</button>'+
    '<button class="btn soft" id="chExportWindow" type="button">'+label('Export visible samples CSV','Exportar muestras visibles CSV')+'</button>'+
    '<button class="btn soft" id="chExportChart" type="button">'+label('Export chart SVG','Exportar gráfica SVG')+'</button></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:8px">'+
    '<div class="field"><label for="chPhysicalStart">'+label('Start physical time [s]','Tiempo físico inicial [s]')+'</label><input type="number" step="any" id="chPhysicalStart" value="'+p.firstTime_s+'"></div>'+
    '<div class="field"><label for="chPhysicalEnd">'+label('End physical time [s]','Tiempo físico final [s]')+'</label><input type="number" step="any" id="chPhysicalEnd" value="'+p.lastTime_s+'"></div>'+
    '<button class="btn soft" type="button" id="chApplyPhysical">'+label('Find saved times in interval','Buscar tiempos guardados en intervalo')+'</button></div>'+
    '<p id="chRangeMsg" class="smallnote" aria-live="polite" style="margin:0"></p>'+
    '<div id="chNativePlots" style="display:grid;gap:6px;min-width:0"></div>'+
    '<div class="field"><label for="chCursor">'+label('Inspect an actual saved time','Inspeccionar un tiempo guardado real')+'</label>'+
    '<input id="chCursor" type="range" style="width:100%" min="0" max="'+(p.samples-1)+'" value="0" step="1"></div>'+
    '<div class="extActions"><button class="btn soft" type="button" id="chPreviousSample">'+label('Previous sample','Muestra anterior')+'</button><button class="btn soft" type="button" id="chNextSample">'+label('Next sample','Muestra siguiente')+'</button>'+
    '<button class="btn soft" type="button" id="chMetricMin">'+label('Go to metric 1 minimum','Ir al mínimo de variable 1')+'</button><button class="btn soft" type="button" id="chMetricMax">'+label('Go to metric 1 maximum','Ir al máximo de variable 1')+'</button></div>'+
    '<div id="chSampleReadout" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(175px,100%),1fr));gap:8px;overflow-wrap:anywhere" aria-live="polite"></div>'+
    '<div id="chWindowExtrema" style="display:grid;gap:6px;overflow-wrap:anywhere"></div>'+
    '<p class="smallnote" style="margin:0">'+label('Lines connect saved samples for visualization only. No missing states, physical units or validation are inferred. The CSV is manually associated with the selected case.','Las líneas conectan muestras guardadas solo para visualización. No se infieren estados faltantes, unidades ni validación física. El CSV se asocia manualmente al caso seleccionado.')+'</p>';
  const firstInput=chEl('chRangeFirst'),lastInput=chEl('chRangeLast'),m1=chEl('chMetric1'),m2=chEl('chMetric2'),slider=chEl('chCursor'),msg=chEl('chRangeMsg');
  m1.value=String(available[0].i);if(available.length>1)m2.value=String(available[1].i);
  let first=0,last=p.samples-1,charts=[],frame=0;
  const alive=()=>chPostrun===p&&host.isConnected&&chBound?.postrun===p&&chBoundCurrent();
  const indices=()=>[...new Set([m1.value,m2.value].filter(v=>v!=='').map(Number))];
  const card=(title,value,sub='')=>'<div style="padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--panel)"><div class="smallnote">'+chEsc(title)+'</div><b style="font-size:17px">'+chEsc(value)+'</b><div class="smallnote">'+chEsc(sub)+'</div></div>';
  const render=()=>{
    frame=0;if(!alive())return;
    const cursor=Number(slider.value),ix=indices();
    charts=ix.map((i,j)=>chPostrunChart(p,i,first,last,cursor,j?'#fbbf24':'#5eead4'));
    chEl('chNativePlots').innerHTML=charts.join('');
    chEl('chSampleReadout').innerHTML=card('time_s',String(p.savedTimes_s[cursor])+' s',label('Saved sample','Muestra guardada')+' '+(cursor+1)+' / '+p.samples)+
      ix.map(i=>card(p.headers[i],String(p.valuesByColumn[i][cursor]),label('Original numeric value','Valor numérico original'))).join('');
    const indexed=chLast?.postrunTimeline;
    const extrema=ix.map(i=>{const e=chPostrunExtrema(p.valuesByColumn[i],first,last),v=p.valuesByColumn[i],ts=p.savedTimes_s;
      return '<div style="padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel)"><b>'+chEsc(p.headers[i])+'</b><div class="smallnote">'+label('Window minimum','Mínimo del intervalo')+': '+chEsc(String(v[e.min]))+' @ '+chEsc(String(ts[e.min]))+' s · '+label('Window maximum','Máximo del intervalo')+': '+chEsc(String(v[e.max]))+' @ '+chEsc(String(ts[e.max]))+' s</div></div>'});
    if(indexed)extrema.unshift('<p class="smallnote" style="margin:0">'+label('Whole-file indexed time coverage (not case ownership)','Cobertura temporal del archivo completo (no prueba pertenencia al caso)')+': '+indexed.matchedCsvSamples+' / '+indexed.csvSamples+'</p>');
    chEl('chWindowExtrema').innerHTML=extrema.join('');
    chEl('chPreviousSample').disabled=cursor<=first;chEl('chNextSample').disabled=cursor>=last;
    msg.textContent=(last-first+1)+' '+chUi('saved samples','muestras guardadas')+' · '+String(p.savedTimes_s[first])+'–'+String(p.savedTimes_s[last])+' s';
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render)};
  const apply=()=>{
    if(!alive())return;const a=Number(firstInput.value),b=Number(lastInput.value);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b>p.samples||a>b){msg.textContent=chUi('Choose a valid ordered saved-sample window.','Elige un intervalo válido de muestras guardadas.');return}
    first=a-1;last=b-1;slider.min=String(first);slider.max=String(last);slider.value=String(Math.max(first,Math.min(last,Number(slider.value))));
    chEl('chPhysicalStart').value=String(p.savedTimes_s[first]);chEl('chPhysicalEnd').value=String(p.savedTimes_s[last]);render()
  };
  chEl('chApplyRange').onclick=apply;chEl('chResetRange').onclick=()=>{firstInput.value='1';lastInput.value=String(p.samples);apply()};
  chEl('chApplyPhysical').onclick=()=>{
    if(!alive())return;const a=chEl('chPhysicalStart').value,b=chEl('chPhysicalEnd').value;
    const window=a.trim()&&b.trim()?chPostrunWindow(p.savedTimes_s,Number(a),Number(b)):null;
    if(!window){msg.textContent=chUi('No saved samples in this interval, or invalid bounds.','No hay muestras guardadas en ese intervalo, o los límites no son válidos.');return}
    firstInput.value=String(window.first+1);lastInput.value=String(window.last+1);apply()
  };
  const jump=i=>{if(!alive())return;slider.value=String(Math.max(first,Math.min(last,i)));render()};
  chEl('chPreviousSample').onclick=()=>jump(Number(slider.value)-1);
  chEl('chNextSample').onclick=()=>jump(Number(slider.value)+1);
  chEl('chMetricMin').onclick=()=>jump(chPostrunExtrema(p.valuesByColumn[Number(m1.value)],first,last).min);
  chEl('chMetricMax').onclick=()=>jump(chPostrunExtrema(p.valuesByColumn[Number(m1.value)],first,last).max);
  m1.onchange=render;m2.onchange=render;slider.oninput=schedule;
  chEl('chExportWindow').onclick=()=>{
    if(!alive())return;const ix=indices(),rows=[['time_s',...ix.map(i=>p.headers[i])].join(',')];
    for(let j=first;j<=last;j++)rows.push([p.savedTimes_s[j],...ix.map(i=>p.valuesByColumn[i][j])].join(','));
    chPostrunSave('FoamLens_postrun_selected_samples.csv',rows.join('\n')+'\n','text/csv')
  };
  chEl('chExportChart').onclick=()=>{
    if(!alive())return;const cursor=Number(slider.value),svgs=indices().map((i,j)=>chPostrunChart(p,i,first,last,cursor,j?'#fbbf24':'#5eead4'));
    const body=svgs.map((svg,j)=>svg.replace('<svg ','<svg x="0" y="'+(j*224)+'" width="840" height="224" ')).join('');
    chPostrunSave('FoamLens_postrun_timeline.svg','<svg xmlns="http://www.w3.org/2000/svg" width="840" height="'+(svgs.length*224)+'" viewBox="0 0 840 '+(svgs.length*224)+'">'+body+'</svg>','image/svg+xml')
  };
  render()
}

function chRun(){
  chInvalidate();const c=chSelectedCase(),status=chEl('chStatus');if(!c){status.textContent='Select an imported case.';return}
  if(!chReportsCurrent()){chResetReports();status.textContent=chUi('Case source changed. Attach the original reports again.','Cambió la fuente del caso. Adjunta los reportes originales nuevamente.');return}
  if([...chReportStates.values()].some(v=>v.status==='reading'||v.status==='error')){status.textContent=chUi('Finish reading all reports and replace or clear failed files.','Termina la lectura de todos los reportes y sustituye o quita los archivos con error.');return}
  if(!c.discoveryModel){status.textContent='Imported case discovery model unavailable; rescan the full case before auditing.';return}
  const logs=chSourceLogRows(c),r=chAudit({case:c,logs,runtime:chRuntimeLog,meshReport:chMesh,postrun:chPostrun});
  if(!r.checks.length){status.textContent='No case evidence could be evaluated.';return}
  r.postrunEvidence=chPostrun?{...chPostrun}:null;
  chLast=r;chBound={case:c,model:c.discoveryModel,logs:logs.slice(),
    meshReport:chMesh,runtimeLog:chRuntimeLog,postrun:chPostrun};
  const counts=r.counts;
  status.textContent='Evidence coverage: '+r.coverage.analyzed+'/'+r.coverage.total+
    ' checks · errors '+counts.error+' · warnings '+counts.warning+
    ' · insufficient '+counts['insufficient-information']+' · NOT a case-validity verdict.';
  chEl('chBody').innerHTML=(chPostrun?'<section id="chPostrunWorkbench"></section>':'')+'<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    '<th>Evidence check</th><th>State</th><th>Source-backed observation and limitation</th></tr></thead><tbody>'+
    r.checks.map(check=>'<tr><td>'+chEsc(check.title)+'</td><td>'+chEsc(check.status)+'</td>'+
      '<td>'+chEsc(check.details)+(check.evidence?.length?'<div class="smallnote">Source: '+
      chEsc(check.evidence.join(' · '))+'</div>':'')+
      (check.recommendation?'<div class="smallnote">Next: '+chEsc(check.recommendation)+'</div>':'')+
      '</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="smallnote">'+chEsc(r.limitations.join(' '))+'</p>'+
    (chPostrun?'<h4>'+chEsc(chUi('Original reported numeric columns (not physical validation)',
      'Columnas numéricas reportadas (no validación física)'))+'</h4>'+
      '<p class="smallnote">'+chEsc(chUi(
        'Min/max/first/last values are calculated from every saved CSV row. No missing frames are generated and no physical units are inferred from names.',
        'Mín/máx/primero/último se calculan de todas las filas del CSV. No se generan tiempos faltantes ni se infieren unidades físicas a partir de nombres.'))+'</p>'+
      '<div class="extTableWrap"><table class="extTable"><thead><tr><th>Source header</th><th>Min</th><th>Max</th><th>First</th><th>Last</th></tr></thead><tbody>'+
      chPostrun.columns.filter(col=>col.name!=='time_s').map(col=>
        '<tr><td>'+chEsc(col.name)+'</td><td>'+chEsc(col.min)+'</td><td>'+
        chEsc(col.max)+'</td><td>'+chEsc(col.first)+'</td><td>'+chEsc(col.last)+
        '</td></tr>').join('')+'</tbody></table></div>':'');
  if(chPostrun)chMountPostrunWorkbench(chPostrun);
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
  // All evidence exports share the same original case and log binding.
  if(!chBoundCurrent()){
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
    '<div class="field"><label>Optional read-only native postrun time-series CSV (.csv) — manually attributed to this case</label>'+ 
    '<input type="file" id="chPostrunFile" accept=".csv,text/csv"></div>'+ 
    '<p class="smallnote">CSV: explicit time_s and numeric reduction columns. Timeline audit only: no source-frame/experimental validity or automatic case binding. All analysis stays local.</p>'+ 
    '<p class="smallnote">Optional report filenames are user-selected; their provenance is NOT cryptographically bound to the imported case.</p>'+
    '<div id="chReportStates" aria-live="polite" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:8px"></div>'+
    '<div class="extActions"><button class="btn soft" type="button" id="chRefresh">Refresh case list</button>'+
    '<button class="btn primary" type="button" id="chAudit">Audit current evidence</button>'+
    '<button class="btn soft" type="button" id="chExport" disabled>Export JSON evidence</button></div>'+
    '<p id="chStatus" class="extStatus" aria-live="polite"></p><div id="chBody"></div>';
  host.appendChild(panel);
  chEl('chRefresh').onclick=chRefresh;chEl('chAudit').onclick=chRun;chEl('chExport').onclick=chExport;
  chEl('chCase').addEventListener('change',()=>{chResetReports();
    chInvalidate(chUi('Case changed. Optional reports cleared to prevent cross-case misattribution.','Cambió el caso. Se quitaron los reportes para evitar atribución cruzada.'))});
  for(const [id,key,bytes] of [['chRuntimeFile','runtime',4*1024*1024],['chMeshFile','mesh',12*1024*1024],['chPostrunFile','postrun',4*1024*1024]]){
    chEl(id).addEventListener('change',()=>chLoadReport(id,key,bytes))
  }
  panel.addEventListener('toggle',()=>{if(panel.open)chRefresh()});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(panel)}catch{}
  chRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',chInstall,{once:true});else chInstall();
window.FoamLensScientificCaseHealth={audit:chAudit,runtime:chRuntime,postrunCsv:chPostRunCsv,states:chStatuses.slice()};
