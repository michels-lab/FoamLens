/* Operación Granada #150 — read-only multi-report checkMesh evidence correlation.
 * Calls the existing maPureCheckMesh; does not execute checkMesh, mutate
 * OpenFOAM source cases, or claim physical multi-region interface agreement.
 */
/* Stable source-local namespace: scoped to prevent future globals overriding multipanel. */
(function(){
'use strict';
/* FOAMLENS_MESH_EVIDENCE_CORE_START */
const cmrMETRICS=['points','faces','internalFaces','cells','boundaryPatches','cellZones','faceZones',
  'maxNonOrthogonality','meanNonOrthogonality','maxSkewness','maxAspectRatio','maxOpenness',
  'minFaceArea','maxFaceArea','minVolume','maxVolume','totalVolume','minPyramidVolume'];
function cmrLabel(s){
  const value=String(s??'').trim();
  return value.length>0&&value.length<=120&&/^[A-Za-z0-9_.-]+$/.test(value)?value:null
}
function cmrOriginalRegionEvidence(text){
  // Exact source-output attribution only: a command-line region request AND
  // OpenFOAM's own named mesh creation must independently agree. No filename,
  // import-case choice or unsupported "region" word may establish identity.
  const empty={label:null,command:null,created:null,conflict:false,
    evidence:'not-established'};
  if(typeof text!=='string'||text.length>12*1024*1024)return empty;
  const fromExec=[],fromMesh=[];
  for(const line of text.split(/\r?\n/)){
    const exec=/^\s*Exec\s*:\s*checkMesh(?:\s|$)([^\r\n]*)$/i.exec(line);
    if(exec){
      for(const m of exec[1].matchAll(/(?:^|\s)-region(?:\s+|=)([A-Za-z0-9_.-]{1,120})(?=\s|$)/g)){
        const label=cmrLabel(m[1]);if(label)fromExec.push(label)
      }
    }
    const mesh=/^\s*Create\s+(?:polyMesh|mesh)\s+([A-Za-z0-9_.-]{1,120})\s+for\s+time\s*=\s*[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?\s*$/i.exec(line);
    if(mesh){const label=cmrLabel(mesh[1]);if(label)fromMesh.push(label)}
  }
  const execLabels=[...new Set(fromExec)],meshLabels=[...new Set(fromMesh)];
  const command=execLabels.length===1?execLabels[0]:null;
  const created=meshLabels.length===1?meshLabels[0]:null;
  const conflict=execLabels.length>1||meshLabels.length>1||
    Boolean(command&&created&&command!==created);
  return{label:!conflict&&command&&created?command:null,command,created,conflict,
    evidence:!conflict&&command&&created?
      'paired-checkMesh-region-option-and-OpenFOAM-named-mesh-creation':'not-established'}
}
function cmrDefects(text){
  if(typeof text!=='string'||text.length>12*1024*1024)
    return{items:[],truncated:false,unsupported:true};
  const items=[];
  for(const [index,line] of text.split(/\r?\n/).entries()){
    if(!/(?:skew|orthogonal|volume|openness|topology|face\s+orientation|non.manifold|illegal|failed|negative|problematic|error)/i.test(line))
      continue;
    if(items.length===80)break;
    const cell=/\bcell\s*(?:id|index|number|#|:)?\s*(\d{1,10})\b/i.exec(line),
      face=/\bface\s*(?:id|index|number|#|:)?\s*(\d{1,10})\b/i.exec(line),
      coord=/\b(?:at|point|location|coordinate)\s*[:=]?\s*\(\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*\)/i.exec(line);
    const vector=coord?coord.slice(1,4).map(Number):null;
    if(!cell&&!face&&!vector)continue;
    if(vector&&!vector.every(Number.isFinite))continue;
    items.push({line:index+1,cellId:cell?Number(cell[1]):null,faceId:face?Number(face[1]):null,
      reportedCoordinateM:vector,locationEvidence:vector?'literal-report-coordinate':
        'source-text-element-id-only',verifiedAgainstPolyMesh:false,
      caution:'Report text only; original cell/face identity and coordinates are not independently checked'});
  }
  return{items,truncated:items.length>=80,unsupported:false}
}
function cmrEvidence(reports,expectedRegions=[]){
  const no=(why)=>({schema:'foamlens/multiregion-mesh-evidence/1',status:'not-assessed',
    why,regions:[],missingRegions:[],unassigned:[],conflicts:[],defects:[],coverage:{expected:0,evidenced:0},
    overallScientificValidity:'not-certified'});
  if(!Array.isArray(reports)||!Array.isArray(expectedRegions)||reports.length>24)
    return no('Report inputs invalid or above the 24-report local limit');
  const normalized=expectedRegions.map(cmrLabel);
  if(normalized.some(x=>!x)||new Set(normalized).size!==normalized.length)
    return no('Case region labels contain missing, duplicate or unsupported values');
  const assigned=new Map(),unassigned=[],conflicts=[],defects=[],sources=[];
  let rejected=0,unattributedFailures=0,sourceLevelFailures=0;
  for(let i=0;i<reports.length;i++){
    const r=reports[i];
    if(!r?.audit||typeof r.audit!=='object'){rejected++;continue}
    const audit=r.audit,source='report-'+String(i+1).padStart(2,'0');
    sources.push({source,recognized:audit.recognized===true,reportStatus:String(audit.status||'unknown'),
      manuallyAttached:true,originalFilenameExported:false,
      rawTextExported:false});
    // Source-level failures may occur outside a named region. Never promote
    // reported per-region metrics to a clean overall result when the source
    // checkMesh run was failed or its identity cannot be established.
    if(audit.status==='failed'||audit.reported?.failedChecks>0||
       audit.reported?.errorsCount>0||(audit.messages?.failures||[]).length>0)
      sourceLevelFailures++;
    if(audit.recognized!==true){
      rejected++;
      unassigned.push({source,reportStatus:audit.status||'unrecognized',
        reason:'Unrecognized checkMesh-like source; region labels alone cannot establish report identity'});
      continue
    }
    const regionAudits=Array.isArray(audit.regionAudits)?audit.regionAudits:[];
    const labels=Array.isArray(audit.regionLabels)?audit.regionLabels.filter(Boolean):[];
    // The original v20 parser already isolates explicit multi-region sections.
    // For a single-region source, reconcile its declared label (if present)
    // with both independent OpenFOAM source markers rather than silently
    // trusting a filename or conflicting command/mesh creation.
    const proof=regionAudits.length?null:cmrOriginalRegionEvidence(r.rawText||'');
    const header=labels.length===1?cmrLabel(labels[0]):null;
    if(proof&&(proof.conflict||(header&&
       (proof.command&&proof.command!==header||
        proof.created&&proof.created!==header)))){
      conflicts.push({source,reason:'Contradictory original checkMesh region identity markers; cannot bind report to region'});
      unassigned.push({source,reportStatus:audit.status||'unknown',
        reason:'Conflicting header, command option or named-mesh creation; no region guessed'});
      continue
    }
    let groups=[];
    if(regionAudits.length){
      groups=regionAudits.map(x=>({label:cmrLabel(x.region),metrics:x.metrics||{},
        status:x.status,reported:x.reported||{},messages:x.messages||{},
        regionAttribution:'explicit-Region-header-in-multi-region-report'}))
    }else if(labels.length===1){
      groups=[{label:header,metrics:audit.metrics||{},status:audit.status,
        reported:audit.reported||{},messages:audit.messages||{},
        regionAttribution:'explicit-Region-header'}]
    }else if(labels.length===0&&proof?.label){
      groups=[{label:proof.label,metrics:audit.metrics||{},status:audit.status,
        reported:audit.reported||{},messages:audit.messages||{},
        regionAttribution:proof.evidence}]
    }
    if(!groups.length||groups.some(x=>!x.label)){
      if(audit.status==='failed')unattributedFailures++;
      unassigned.push({source,reportStatus:audit.status||'unknown',reason:!audit.recognized?'Unrecognized source text':
        'No consistent explicit report region marker: need Region: header or matching checkMesh -region and Create mesh lines; filenames/case selection never prove it'});
    }else for(const g of groups){
      if(assigned.has(g.label)){
        conflicts.push({region:g.label,first:assigned.get(g.label).source,second:source,
          reason:'More than one report assigns the same explicit region; numeric metrics not merged'});
        assigned.get(g.label).conflicted=true;
      }else{
        const metrics={};
        for(const key of cmrMETRICS){
          const m=g.metrics?.[key];
          metrics[key]={value:m?.status==='reported'&&Number.isFinite(m.value)?m.value:null,
            evidence:m?.status||'not-reported',unit:m?.unit||null}
        }
        const a=metrics,topologyIssues=[];
        const num=k=>a[k]?.value;
        for(const key of ['points','faces','internalFaces','cells','boundaryPatches']){
          const x=num(key);if(x!==null&&(!Number.isSafeInteger(x)||x<0))
            topologyIssues.push(key+' is not a nonnegative integer in source report')
        }
        if(num('internalFaces')!==null&&num('faces')!==null&&num('internalFaces')>num('faces'))
          topologyIssues.push('Reported internalFaces exceeds reported faces');
        if(num('minVolume')!==null&&num('minVolume')<=0)
          topologyIssues.push('Reported minimum cell volume is nonpositive');
        if(num('minVolume')!==null&&num('maxVolume')!==null&&num('minVolume')>num('maxVolume'))
          topologyIssues.push('Reported minimum volume exceeds maximum');
        if(num('totalVolume')!==null&&num('totalVolume')<=0)
          topologyIssues.push('Reported total volume is nonpositive');
        const failed=(g.status==='failed'||g.reported?.failedChecks>0||
          g.reported?.errorsCount>0||(g.messages?.failures||[]).length>0||topologyIssues.length>0);
        const reportedWarnings=Math.max(g.reported?.warningCount||0,(g.messages?.warnings||[]).length);
        assigned.set(g.label,{region:g.label,source,
          status:failed?'error':g.status==='reported-ok'&&reportedWarnings===0?
            'reported-ok-no-warnings':g.status==='reported-ok'?'reported-ok-with-warnings':
            'insufficient-evidence',
          originalReportStatus:g.status,metrics,topologyIssues,
          warnings:reportedWarnings,failures:(g.messages?.failures||[]).length,
          originalCheckMeshSummary:g.reported||{},regionAttribution:g.regionAttribution||'not-established',conflicted:false,
          reportEvidence:'reported-only; not independently computed from actual polyMesh'});
      }
    }
    const observed=cmrDefects(r.rawText||'');
    for(const d of observed.items)if(defects.length<100)defects.push({source,...d});
  }
  const rows=[...assigned.values()].sort((a,b)=>a.region.localeCompare(b.region));
  const expected=new Set(normalized),missing=normalized.filter(x=>!assigned.has(x));
  const extra=rows.filter(x=>expected.size&&!expected.has(x.region)).map(x=>x.region);
  if(extra.length)conflicts.push(...extra.map(region=>({region,reason:'Report region not found among the explicitly imported case regions'})));
  const bad=rows.some(x=>x.status==='error')||conflicts.length>0||
    unattributedFailures>0||sourceLevelFailures>0;
  // All expected names being present is NOT equivalent to complete checkMesh
  // summaries. Incomplete/no-summary/unrecognized input stays partial, never
  // masquerading as a fully reported source set.
  const sourceSummariesComplete=sources.every(x=>x.recognized&&x.reportStatus==='reported-ok')&&
    rows.every(x=>x.status==='reported-ok-no-warnings'||x.status==='reported-ok-with-warnings');
  const full=normalized.length>0&&missing.length===0&&rows.length===normalized.length&&
    !rejected&&unassigned.length===0&&sourceSummariesComplete&&!bad;
  return{
    schema:'foamlens/multiregion-mesh-evidence/1',
    status:bad?'conflicting-or-failed':full?'all-expected-regions-reported':
      'partial-or-unattributed',
    overallScientificValidity:'not-certified',
    coverage:{expected:normalized.length,evidenced:rows.filter(x=>expected.has(x.region)).length,
      reportsSupplied:reports.length,rejected,unattributed:unassigned.length,
      unattributedFailures,sourceLevelFailures},
    expectedRegions:normalized,regions:rows,missingRegions:missing,
    unassigned,conflicts,defects,sources,
    limitations:[
      'The checked inputs are user-selected local checkMesh text reports, not solver execution or independently inspected source polyMesh.',
      'Regions are attributed only from explicit Region: report headers, or a matching checkMesh -region option and OpenFOAM named mesh creation line. Filenames and selected cases never establish region attribution.',
      'Report labels are matched against case discovery region names for coverage only. That does not bind a report to its original OpenFOAM case.',
      'Metrics from duplicate labels or overlapping case reports are NOT aggregated or overwritten.',
      'A checkMesh Mesh OK summary does not certify polyMesh interfaces, physical dimensions, CAD units, heat transfer, conservation or CFD solution validity.',
      'Reported defect cell/face IDs and numeric coordinates are copied as location clues only; cannot be plotted as verified physical mesh points until original geometry is inspected.',
      'No user-specific scientific case file paths, original checkMesh filenames or raw report text are exported.'
    ]
  }
}

const cmrSHA256_RE=/^[a-f0-9]{64}$/;
const cmrPOLYMESH_FILES=['points','faces','owner','neighbour','boundary'];
function cmrVerifyLocalManifest(manifest,digests,evidence){
  const fail=reason=>({status:'rejected',reason,rows:[],verified:0});
  if(!manifest||manifest.schema!=='foamlens/local-checkmesh-region-capture/1'||
     manifest.scientificValidity!=='not-certified'||
     manifest.allSourceReportsReady!==true||!Array.isArray(manifest.regions)||
     !Array.isArray(digests)||manifest.regions.length!==digests.length||
     manifest.regions.length===0||manifest.regions.length>24)
    return fail('Manifest schema, readiness or report count unsupported');
  const hasCaseExpectation=Boolean(evidence?.coverage?.expected>0);
  if(!evidence||!Array.isArray(evidence.regions)||
     evidence.conflicts?.length||evidence.unassigned?.length||
     evidence.regions.length!==digests.length||
     (hasCaseExpectation&&evidence.status!=='all-expected-regions-reported')||
     (!hasCaseExpectation&&evidence.status!=='partial-or-unattributed'))
    return fail('Source evidence must have complete, nonconflicting original report identity; case regions are optional');
  const byHash=new Map(),names=new Set(),rows=[];
  for(const row of manifest.regions){
    if(!row||!cmrLabel(row.region)||names.has(row.region)||
       row.status!=='source-report-ready-not-certified'||
       row.scientificValidity!=='not-certified'||row.meshFilesUnchanged!==true||
       row.exitCode!==0||row.stderrPresent!==false||
       !cmrSHA256_RE.test(row.logSha256||'')||
       byHash.has(row.logSha256)||
       row.sourceMarkers?.matched!==true||
       row.sourceMarkers?.region!==row.region||
       row.sourceMarkers?.terminalMeshOk!==true||
       row.sourceMarkers?.sourceReportedFailure===true||
       !row.meshFilesSha256Before||
       !cmrPOLYMESH_FILES.every(x=>cmrSHA256_RE.test(row.meshFilesSha256Before[x]||'')))
      return fail('Manifest has invalid, duplicate, incomplete or contradictory local source records');
    names.add(row.region);byHash.set(row.logSha256,row);
  }
  const used=new Set();
  for(let i=0;i<digests.length;i++){
    const digest=digests[i],item=byHash.get(digest),source='report-'+String(i+1).padStart(2,'0');
    if(!cmrSHA256_RE.test(digest||'')||!item||used.has(digest))
      return fail('Original checkMesh report SHA-256 does not match unique manifest entry');
    used.add(digest);
    if(evidence.regions.filter(r=>r.region===item.region&&r.source===source&&
       !r.conflicted&&/^reported-ok-/.test(r.status)).length!==1)
      return fail('Manifest region and audited checkMesh region are inconsistent');
    rows.push({region:item.region,source,logSha256:digest,
      meshFilesSha256Before:Object.fromEntries(cmrPOLYMESH_FILES.map(k=>[k,item.meshFilesSha256Before[k]]))});
  }
  return{status:'original-report-sha256-matches-local-manifest',verified:rows.length,rows,
    scientificValidity:'not-certified',
    assurance:'User-supplied unsigned manifest; report integrity checked, original case identity not yet established'}
}
/* FOAMLENS_MESH_EVIDENCE_CORE_END */
function cmrEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let cmrLast=null,cmrInputs=[],cmrEpoch=0,cmrOwner=null;
async function cmrSHA256File(file){
  if(!globalThis.crypto?.subtle||typeof file?.arrayBuffer!=='function')
    throw Error('Local SHA-256 digest unavailable in this runtime');
  const buffer=await file.arrayBuffer();
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)))
    .map(b=>b.toString(16).padStart(2,'0')).join('')
}
async function cmrCompareImportedPolyMesh(rows,c,epoch){
  if(!c||!Array.isArray(c.allFiles)||!c.allFiles.length)
    return{status:'source-mesh-not-verified-unavailable',verifiedFiles:0};
  const all=c.allFiles,selected=[];
  for(const row of rows)for(const name of cmrPOLYMESH_FILES){
    const ending='/constant/'+row.region+'/polyMesh/'+name;
    const found=all.filter(f=>('/'+String(f?.webkitRelativePath||f?.name||'')
      .replace(/\\/g,'/')).endsWith(ending));
    if(found.length!==1)
      return{status:'source-mesh-not-verified-missing-or-duplicate-files',verifiedFiles:0};
    const file=found[0];
    // The native bridge's legacy text-based arrayBuffer() is NOT original
    // binary data. Refuse cryptographic claims until a raw byte API exists.
    if(file._nativeToken||typeof file.arrayBuffer!=='function'||file.size>24*1024*1024)
      return{status:'source-mesh-not-verified-raw-bytes-unavailable',verifiedFiles:0};
    selected.push({file,expected:row.meshFilesSha256Before[name]});
  }
  for(const item of selected){
    if(epoch!==cmrEpoch)return{status:'source-mesh-not-verified-selection-changed',verifiedFiles:0};
    const actual=await cmrSHA256File(item.file);
    if(actual!==item.expected)
      return{status:'source-mesh-sha256-mismatch',verifiedFiles:0};
  }
  return{status:'imported-source-polyMesh-sha256-matches-local-manifest',
    verifiedFiles:selected.length,scientificValidity:'not-certified'}
}
function cmrEl(id){return document.getElementById(id)}
function cmrReset(reason=''){
  cmrEpoch++;cmrLast=null;cmrOwner=null;
  const out=cmrEl('cmrReport');if(out)out.textContent='';
  const exp=cmrEl('cmrExport');if(exp)exp.disabled=true;
  if(reason&&cmrEl('cmrStatus'))cmrEl('cmrStatus').textContent=reason
}
function cmrCase(){return (Array.isArray(cases)?cases:[]).find(c=>String(c.id)===String(cmrEl('cmrCase')?.value))}
function cmrExpected(c){
  const regions=c?.discoveryModel?.regions||c?.discovery?.regions||[];
  return Array.isArray(regions)?[...new Set(regions.map(x=>String(x)))]:[]
}
function cmrRefresh(){
  const sel=cmrEl('cmrCase');if(!sel)return;
  const old=sel.value,all=Array.isArray(cases)?cases:[];
  sel.innerHTML='<option value="">No selected case — unattributed report analysis</option>'+
    all.map(c=>'<option value="'+cmrEsc(c.id)+'">'+cmrEsc(c.name||c.id)+'</option>').join('');
  if(all.some(c=>String(c.id)===old))sel.value=old;
  else if(typeof activeContextCaseId!=='undefined'&&all.some(c=>String(c.id)===String(activeContextCaseId)))sel.value=String(activeContextCaseId);
  cmrInputs=[];const file=cmrEl('cmrFiles');if(file)file.value='';
  const manifest=cmrEl('cmrManifest');if(manifest)manifest.value='';
  cmrReset('Case selection or discovered region names changed. Previously attached reports cleared.')
}
async function cmrAnalyze(){
  const at=++cmrEpoch,file=cmrEl('cmrFiles'),chosen=[...(file?.files||[])],
    manifestFile=cmrEl('cmrManifest')?.files?.[0]||null,status=cmrEl('cmrStatus');
  cmrLast=null;cmrEl('cmrExport').disabled=true;
  if(!chosen.length||chosen.length>24){status.textContent='Choose 1–24 original checkMesh text reports.';return}
  const c=cmrCase(),model=c?.discoveryModel,expected=cmrExpected(c),reports=[];
  status.textContent='Inspecting supplied checkMesh text locally; no solver or network access…';
  try{
    for(let i=0;i<chosen.length;i++){
      if(cmrEpoch!==at)return;
      const f=chosen[i];
      if(f.size>12*1024*1024)throw Error('Report '+(i+1)+' exceeds 12 MiB safe size limit');
      const contents=await f.text();if(cmrEpoch!==at)return;
      const audit=maPureCheckMesh(contents,'local report '+(i+1));
      reports.push({audit,rawText:contents})
    }
    if(cmrEpoch!==at)return;
    if(cmrCase()!==c||c?.discoveryModel!==model){
      cmrReset('Case discovery changed during file read; please reselect reports.');return
    }
    const result=cmrEvidence(reports,expected);
    let linkage={status:'not-supplied',verified:0},caseLink={status:'source-mesh-not-verified-no-manifest',verifiedFiles:0};
    if(manifestFile){
      if(manifestFile.size>256*1024)throw Error('Capture manifest exceeds the 256-KiB safe limit');
      const contents=await manifestFile.text();if(at!==cmrEpoch)return;
      let manifest;
      try{manifest=JSON.parse(contents)}catch{throw Error('Invalid local JSON capture manifest')}
      const digests=[];
      for(const selected of chosen){
        digests.push(await cmrSHA256File(selected));
        if(at!==cmrEpoch)return
      }
      linkage=cmrVerifyLocalManifest(manifest,digests,result);
      if(linkage.status==='rejected')
        throw Error('Original report SHA-256 does not match local capture manifest: '+linkage.reason);
      caseLink=await cmrCompareImportedPolyMesh(linkage.rows,c,at);
      if(at!==cmrEpoch)return;
      if(caseLink.status==='source-mesh-sha256-mismatch')
        throw Error('Imported source case polyMesh SHA-256 disagrees with capture manifest');
    }
    if(cmrCase()!==c||c?.discoveryModel!==model){
      cmrReset('Imported case changed during SHA-256 verification; re-audit.');return
    }
    result.localProvenance={reportManifestStatus:linkage.status,
      sourceCaseStatus:caseLink.status,verifiedOriginalReports:linkage.verified||0,
      verifiedSourceMeshFiles:caseLink.verifiedFiles||0,
      originalCaseProvenanceSigned:false,scientificValidity:'not-certified'};
    cmrLast=result;cmrInputs=chosen;cmrOwner={case:c,model,expected:expected.join('\0'),
      files:chosen,manifestFile};
    status.textContent=result.status+' · '+result.coverage.evidenced+'/'+result.coverage.expected+
      ' source-declared regions · '+result.coverage.unattributed+' unattributed reports. '+
      'Manifest: '+result.localProvenance.reportManifestStatus+' · source mesh: '+
      result.localProvenance.sourceCaseStatus+'. Scientific validity NOT certified.';
    const fmt=x=>x===null?'not reported':x.toLocaleString('en-US',{maximumSignificantDigits:8});
    const rows=result.regions.map(r=>'<tr>'+[
      r.region,r.source,r.regionAttribution,r.status,fmt(r.metrics.cells.value),fmt(r.metrics.faces.value),
      fmt(r.metrics.totalVolume.value),fmt(r.metrics.maxNonOrthogonality.value),
      r.warnings,r.topologyIssues.join('; ')||'—'
    ].map(v=>'<td>'+cmrEsc(v)+'</td>').join('')+'</tr>').join('');
    cmrEl('cmrReport').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
      ['Region','Source','Region evidence','Evidence status','Cells','Faces','Total m³','Max non-orth. °','Warnings','Count/volume contradictions']
        .map(x=>'<th>'+cmrEsc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<p class="smallnote">Missing: '+cmrEsc(result.missingRegions.join(', ')||'none')+
      ' · Conflicts: '+result.conflicts.length+' · Text-only defect locator clues: '+result.defects.length+
      ' · Unassigned: '+result.unassigned.length+'.</p>'+
      '<p class="smallnote">'+cmrEsc(result.limitations.join(' '))+'</p>';
    cmrEl('cmrExport').disabled=false
  }catch(e){
    if(at!==cmrEpoch)return;
    const message=String(e?.message||'');
    // Only display explanations generated by this module. External file/read
    // exceptions may contain an original private path; never echo them.
    const known=/^(?:Capture manifest exceeds|Invalid local JSON capture manifest|Original report SHA-256 does not match local capture manifest|Imported source case polyMesh SHA-256 disagrees with capture manifest|Local SHA-256 digest unavailable|Report [0-9]+ exceeds 12 MiB)/.test(message);
    cmrReset((known?message.slice(0,230):
      'Local source report or manifest could not be read safely.')+
      ' No partial evidence exported.')
  }
}
function cmrExport(){
  const c=cmrCase();
  if(!cmrLast||!cmrOwner)return;
  const files=[...(cmrEl('cmrFiles')?.files||[])],
    manifestFile=cmrEl('cmrManifest')?.files?.[0]||null;
  if(c!==cmrOwner.case||c?.discoveryModel!==cmrOwner.model||
     cmrExpected(c).join('\0')!==cmrOwner.expected||
     manifestFile!==cmrOwner.manifestFile||
     files.length!==cmrInputs.length||files.some((f,i)=>f!==cmrInputs[i])){
    cmrReset('Case/regions/report selection changed; recalculate before exporting.');return
  }
  const payload=JSON.stringify({...cmrLast,exportedAt:new Date().toISOString(),
    caseBinding:cmrLast.localProvenance?.sourceCaseStatus===
      'imported-source-polyMesh-sha256-matches-local-manifest'?
      'local-unsigned-manifest-report-and-source-files-sha256-match-at-inspection':
      'manual-attachment-not-cryptographically-verified'},null,2);
  if(typeof downloadText==='function'){downloadText('FoamLens_multiregion_checkmesh_evidence.json',payload,'application/json');return}
  const link=URL.createObjectURL(new Blob([payload],{type:'application/json'})),a=document.createElement('a');
  a.href=link;a.download='FoamLens_multiregion_checkmesh_evidence.json';document.body.appendChild(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(link),1200)
}
function cmrInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('datasetModeBlock');
  if(!host||cmrEl('cmrPanel'))return;
  const panel=document.createElement('details');panel.id='cmrPanel';panel.className='detailBlock';
  panel.innerHTML='<summary><b>Granada · Multi-region checkMesh Evidence Matrix</b></summary>'+
    '<p class="smallnote">Compare original checkMesh region labels and measured report values. No mesh or solver is executed; report binding and interface validity are NOT proven.</p>'+
    '<div class="extGrid2"><div class="field"><label>Imported case (optional expected material regions)</label><select id="cmrCase"></select></div>'+
    '<div class="field"><label>Original local checkMesh reports, max 24</label>'+
    '<input type="file" id="cmrFiles" accept=".log,.txt,.out,text/plain" multiple></div></div>'+
    '<div class="field"><label>Optional local capture manifest (SHA-256 verification)</label>'+
    '<input type="file" id="cmrManifest" accept=".json,application/json"></div>'+
    '<p class="smallnote">When provided, report hashes must match the unsigned local capture manifest. '+
    'If matching original source polyMesh bytes are available in the imported case, they are checked too. '+
    'No matching hash certifies mesh validity or solver correctness.</p>'+
    '<div class="extActions"><button type="button" class="btn soft" id="cmrRefresh">Refresh source case</button>'+
    '<button type="button" class="btn primary" id="cmrAnalyze">Compare real report evidence</button>'+
    '<button type="button" class="btn soft" id="cmrExport" disabled>Export source evidence JSON</button></div>'+
    '<p class="smallnote" id="cmrStatus" aria-live="polite"></p><div id="cmrReport"></div>';
  host.appendChild(panel);
  cmrEl('cmrRefresh').onclick=cmrRefresh;cmrEl('cmrAnalyze').onclick=()=>void cmrAnalyze();
  cmrEl('cmrExport').onclick=cmrExport;
  cmrEl('cmrCase').onchange=()=>{cmrInputs=[];cmrEl('cmrFiles').value='';cmrReset('Case changed: report attachments cleared.')};
  cmrEl('cmrFiles').onchange=()=>{cmrInputs=[];cmrReset('Original reports changed: re-audit before exporting.')};
  cmrEl('cmrManifest').onchange=()=>cmrReset('Capture manifest changed: verify original report hashes again.');
  // Opening and closing the panel must not silently erase audited source files.
  cmrRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cmrInstall,{once:true});else cmrInstall();
window.FoamLensMultiRegionMeshEvidence={analyze:cmrEvidence,parseLocators:cmrDefects};
})();
