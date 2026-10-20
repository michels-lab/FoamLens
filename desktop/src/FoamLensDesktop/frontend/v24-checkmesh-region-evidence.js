/* Operación Granada #150 — read-only multi-report checkMesh evidence correlation.
 * Calls the existing maPureCheckMesh; does not execute checkMesh, mutate
 * OpenFOAM source cases, or claim physical multi-region interface agreement.
 */
/* FOAMLENS_MESH_EVIDENCE_CORE_START */
const meMETRICS=['points','faces','internalFaces','cells','boundaryPatches','cellZones','faceZones',
  'maxNonOrthogonality','meanNonOrthogonality','maxSkewness','maxAspectRatio','maxOpenness',
  'minFaceArea','maxFaceArea','minVolume','maxVolume','totalVolume','minPyramidVolume'];
function meLabel(s){
  const value=String(s??'').trim();
  return value.length>0&&value.length<=120&&/^[A-Za-z0-9_.-]+$/.test(value)?value:null
}
function meDefects(text){
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
function meEvidence(reports,expectedRegions=[]){
  const no=(why)=>({schema:'foamlens/multiregion-mesh-evidence/1',status:'not-assessed',
    why,regions:[],missingRegions:[],unassigned:[],conflicts:[],defects:[],coverage:{expected:0,evidenced:0},
    overallScientificValidity:'not-certified'});
  if(!Array.isArray(reports)||!Array.isArray(expectedRegions)||reports.length>24)
    return no('Report inputs invalid or above the 24-report local limit');
  const normalized=expectedRegions.map(meLabel);
  if(normalized.some(x=>!x)||new Set(normalized).size!==normalized.length)
    return no('Case region labels contain missing, duplicate or unsupported values');
  const assigned=new Map(),unassigned=[],conflicts=[],defects=[],sources=[];
  let rejected=0;
  for(let i=0;i<reports.length;i++){
    const r=reports[i];
    if(!r?.audit||typeof r.audit!=='object'){rejected++;continue}
    const audit=r.audit,source='report-'+String(i+1).padStart(2,'0');
    sources.push({source,recognized:audit.recognized===true,reportStatus:String(audit.status||'unknown'),
      manuallyAttached:true,originalFilenameExported:false,
      rawTextExported:false});
    const regionAudits=Array.isArray(audit.regionAudits)?audit.regionAudits:[];
    const labels=Array.isArray(audit.regionLabels)?audit.regionLabels.filter(Boolean):[];
    let groups=[];
    if(regionAudits.length){
      groups=regionAudits.map(x=>({label:meLabel(x.region),metrics:x.metrics||{},
        status:x.status,reported:x.reported||{},messages:x.messages||{}}))
    }else if(labels.length===1){
      groups=[{label:meLabel(labels[0]),metrics:audit.metrics||{},status:audit.status,
        reported:audit.reported||{},messages:audit.messages||{}}]
    }
    if(!groups.length||groups.some(x=>!x.label)){
      unassigned.push({source,reason:!audit.recognized?'Unrecognized source text':
        'No unique explicit region label in report; cannot infer region from filename or selected case'});
    }else for(const g of groups){
      if(assigned.has(g.label)){
        conflicts.push({region:g.label,first:assigned.get(g.label).source,second:source,
          reason:'More than one report assigns the same explicit region; numeric metrics not merged'});
        assigned.get(g.label).conflicted=true;
      }else{
        const metrics={};
        for(const key of meMETRICS){
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
          (g.messages?.failures||[]).length>0||topologyIssues.length>0);
        assigned.set(g.label,{region:g.label,source,
          status:failed?'error':g.status==='reported-ok'&&!(g.messages?.warnings||[]).length?
            'reported-ok-no-warnings':g.status==='reported-ok'?'reported-ok-with-warnings':
            'insufficient-evidence',
          originalReportStatus:g.status,metrics,topologyIssues,
          warnings:(g.messages?.warnings||[]).length,failures:(g.messages?.failures||[]).length,
          originalCheckMeshSummary:g.reported||{},conflicted:false,
          reportEvidence:'reported-only; not independently computed from actual polyMesh'});
      }
    }
    const observed=meDefects(r.rawText||'');
    for(const d of observed.items)if(defects.length<100)defects.push({source,...d});
  }
  const rows=[...assigned.values()].sort((a,b)=>a.region.localeCompare(b.region));
  const expected=new Set(normalized),missing=normalized.filter(x=>!assigned.has(x));
  const extra=rows.filter(x=>expected.size&&!expected.has(x.region)).map(x=>x.region);
  if(extra.length)conflicts.push(...extra.map(region=>({region,reason:'Report region not found among the explicitly imported case regions'})));
  const bad=rows.some(x=>x.status==='error')||conflicts.length>0;
  const full=normalized.length>0&&missing.length===0&&rows.length===normalized.length&&
    !rejected&&unassigned.length===0&&!bad;
  return{
    schema:'foamlens/multiregion-mesh-evidence/1',
    status:bad?'conflicting-or-failed':full?'all-expected-regions-reported':
      'partial-or-unattributed',
    overallScientificValidity:'not-certified',
    coverage:{expected:normalized.length,evidenced:rows.filter(x=>expected.has(x.region)).length,
      reportsSupplied:reports.length,rejected,unattributed:unassigned.length},
    expectedRegions:normalized,regions:rows,missingRegions:missing,
    unassigned,conflicts,defects,sources,
    limitations:[
      'The checked inputs are user-selected local checkMesh text reports, not solver execution or independently inspected source polyMesh.',
      'Region names must appear explicitly inside each original checkMesh report. Filenames and case names never establish region attribution.',
      'Report labels are matched against case discovery region names for coverage only. That does not bind a report to its original OpenFOAM case.',
      'Metrics from duplicate labels or overlapping case reports are NOT aggregated or overwritten.',
      'A checkMesh Mesh OK summary does not certify polyMesh interfaces, physical dimensions, CAD units, heat transfer, conservation or CFD solution validity.',
      'Reported defect cell/face IDs and numeric coordinates are copied as location clues only; cannot be plotted as verified physical mesh points until original geometry is inspected.',
      'No user-specific scientific case file paths, original checkMesh filenames or raw report text are exported.'
    ]
  }
}
/* FOAMLENS_MESH_EVIDENCE_CORE_END */
function meEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let meLast=null,meInputs=[],meEpoch=0,meOwner=null;
function meEl(id){return document.getElementById(id)}
function meReset(reason=''){
  meEpoch++;meLast=null;meOwner=null;
  const out=meEl('meReport');if(out)out.textContent='';
  const exp=meEl('meExport');if(exp)exp.disabled=true;
  if(reason&&meEl('meStatus'))meEl('meStatus').textContent=reason
}
function meCase(){return (Array.isArray(cases)?cases:[]).find(c=>String(c.id)===String(meEl('meCase')?.value))}
function meExpected(c){
  const regions=c?.discoveryModel?.regions||c?.discovery?.regions||[];
  return Array.isArray(regions)?[...new Set(regions.map(x=>String(x)))]:[]
}
function meRefresh(){
  const sel=meEl('meCase');if(!sel)return;
  const old=sel.value,all=Array.isArray(cases)?cases:[];
  sel.innerHTML='<option value="">No selected case — unattributed report analysis</option>'+
    all.map(c=>'<option value="'+meEsc(c.id)+'">'+meEsc(c.name||c.id)+'</option>').join('');
  if(all.some(c=>String(c.id)===old))sel.value=old;
  else if(typeof activeContextCaseId!=='undefined'&&all.some(c=>String(c.id)===String(activeContextCaseId)))sel.value=String(activeContextCaseId);
  meInputs=[];const file=meEl('meFiles');if(file)file.value='';
  meReset('Case selection or discovered region names changed. Previously attached reports cleared.')
}
async function meAnalyze(){
  const at=++meEpoch,file=meEl('meFiles'),chosen=[...(file?.files||[])],status=meEl('meStatus');
  meLast=null;meEl('meExport').disabled=true;
  if(!chosen.length||chosen.length>24){status.textContent='Choose 1–24 original checkMesh text reports.';return}
  const c=meCase(),model=c?.discoveryModel,expected=meExpected(c),reports=[];
  status.textContent='Inspecting supplied checkMesh text locally; no solver or network access…';
  try{
    for(let i=0;i<chosen.length;i++){
      if(meEpoch!==at)return;
      const f=chosen[i];
      if(f.size>12*1024*1024)throw Error('Report '+(i+1)+' exceeds 12 MiB safe size limit');
      const contents=await f.text();if(meEpoch!==at)return;
      const audit=maPureCheckMesh(contents,'local report '+(i+1));
      reports.push({audit,rawText:contents})
    }
    if(meEpoch!==at)return;
    if(meCase()!==c||c?.discoveryModel!==model){
      meReset('Case discovery changed during file read; please reselect reports.');return
    }
    const result=meEvidence(reports,expected);
    meLast=result;meInputs=chosen;meOwner={case:c,model,expected:expected.join('\0'),files:chosen};
    status.textContent=result.status+' · '+result.coverage.evidenced+'/'+result.coverage.expected+
      ' source-declared regions · '+result.coverage.unattributed+' unattributed reports. Scientific validity NOT certified.';
    const fmt=x=>x===null?'not reported':x.toLocaleString('en-US',{maximumSignificantDigits:8});
    const rows=result.regions.map(r=>'<tr>'+[
      r.region,r.source,r.status,fmt(r.metrics.cells.value),fmt(r.metrics.faces.value),
      fmt(r.metrics.totalVolume.value),fmt(r.metrics.maxNonOrthogonality.value),
      r.warnings,r.topologyIssues.join('; ')||'—'
    ].map(v=>'<td>'+meEsc(v)+'</td>').join('')+'</tr>').join('');
    meEl('meReport').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
      ['Region','Source','Evidence status','Cells','Faces','Total m³','Max non-orth. °','Warnings','Count/volume contradictions']
        .map(x=>'<th>'+meEsc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<p class="smallnote">Missing: '+meEsc(result.missingRegions.join(', ')||'none')+
      ' · Conflicts: '+result.conflicts.length+' · Text-only defect locator clues: '+result.defects.length+
      ' · Unassigned: '+result.unassigned.length+'.</p>'+
      '<p class="smallnote">'+meEsc(result.limitations.join(' '))+'</p>';
    meEl('meExport').disabled=false
  }catch(e){if(at!==meEpoch)return;meReset('Report inspection failed. Use original text log files. No partial evidence exported.')}
}
function meExport(){
  const c=meCase();
  if(!meLast||!meOwner)return;
  if(c!==meOwner.case||c?.discoveryModel!==meOwner.model||
     meExpected(c).join('\0')!==meOwner.expected||
     [...(meEl('meFiles')?.files||[])].some((f,i)=>f!==meInputs[i])){
    meReset('Case/regions/report selection changed; recalculate before exporting.');return
  }
  const payload=JSON.stringify({...meLast,exportedAt:new Date().toISOString(),
    caseBinding:'manual-attachment-not-cryptographically-verified'},null,2);
  if(typeof downloadText==='function'){downloadText('FoamLens_multiregion_checkmesh_evidence.json',payload,'application/json');return}
  const link=URL.createObjectURL(new Blob([payload],{type:'application/json'})),a=document.createElement('a');
  a.href=link;a.download='FoamLens_multiregion_checkmesh_evidence.json';document.body.appendChild(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(link),1200)
}
function meInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('datasetModeBlock');
  if(!host||meEl('mePanel'))return;
  const panel=document.createElement('details');panel.id='mePanel';panel.className='detailBlock';
  panel.innerHTML='<summary><b>Granada · Multi-region checkMesh Evidence Matrix</b></summary>'+
    '<p class="smallnote">Compare original checkMesh region labels and measured report values. No mesh or solver is executed; report binding and interface validity are NOT proven.</p>'+
    '<div class="extGrid2"><div class="field"><label>Imported case (optional expected material regions)</label><select id="meCase"></select></div>'+
    '<div class="field"><label>Original local checkMesh reports, max 24</label>'+
    '<input type="file" id="meFiles" accept=".log,.txt,.out,text/plain" multiple></div></div>'+
    '<div class="extActions"><button type="button" class="btn soft" id="meRefresh">Refresh source case</button>'+
    '<button type="button" class="btn primary" id="meAnalyze">Compare real report evidence</button>'+
    '<button type="button" class="btn soft" id="meExport" disabled>Export source evidence JSON</button></div>'+
    '<p class="smallnote" id="meStatus" aria-live="polite"></p><div id="meReport"></div>';
  host.appendChild(panel);
  meEl('meRefresh').onclick=meRefresh;meEl('meAnalyze').onclick=()=>void meAnalyze();
  meEl('meExport').onclick=meExport;
  meEl('meCase').onchange=()=>{meInputs=[];meEl('meFiles').value='';meReset('Case changed: report attachments cleared.')};
  meEl('meFiles').onchange=()=>{meInputs=[];meReset('Original reports changed: re-audit before exporting.')};
  panel.addEventListener('toggle',()=>{if(panel.open)meRefresh()});
  meRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',meInstall,{once:true});else meInstall();
window.FoamLensMultiRegionMeshEvidence={analyze:meEvidence,parseLocators:meDefects};
