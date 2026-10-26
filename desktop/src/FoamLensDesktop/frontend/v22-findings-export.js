/* FoamLens Desktop v1.6.0 — exportable Findings evidence bundle + assistant/GitHub handoff. */
let flFindingsExportInstalled=false;
function fxeUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(document.getElementById('language')?.value==='es'?es:en)}catch{return en}}
function fxeFinite(v){
  // OpenFOAM physical measurements use numeric dot decimals; JS Number(null/''/false) invents zero.
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(typeof v!=='string')return null;
  const str=v.trim();
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(str))return null;
  const n=Number(str);return Number.isFinite(n)?n:null
}
function fxeClone(v,d=0,seen=new WeakSet()){
  if(v==null||['string','number','boolean'].includes(typeof v))return v;
  if(typeof v==='function')return undefined;
  if(d>5)return '[depth limit]';
  if(typeof v==='object'){
    if(seen.has(v))return '[circular]';seen.add(v);
    if(Array.isArray(v)){
      const items=v.slice(0,250).map(x=>fxeClone(x,d+1,seen)).filter(x=>x!==undefined);
      seen.delete(v);return items
    }
    const out={};let n=0;
    for(const [k,x] of Object.entries(v)){
      if(['t','y','values','scalarValues','componentValues','points','faces','cells','vertices'].includes(k))continue;
      const y=fxeClone(x,d+1,seen);if(y!==undefined)out[k]=y;if(++n>=120)break;
    }
    seen.delete(v);return out
  }
  return String(v)
}
function fxeFieldName(s){return s?.field?.canonical||s?.field?.raw||s?.field?.name||s?.name||''}
function fxeTimeRange(s){
  // Streaming finite time bounds: no phantom t=0 and no call-stack overflow from Math.min(...largeArray).
  let min=null,max=null,count=0;
  if(Array.isArray(s?.t))for(const raw of s.t){
    const time=fxeFinite(raw);if(time===null)continue;
    if(min===null||time<min)min=time;
    if(max===null||time>max)max=time;
    count++
  }
  if(count)return{min,max,count};
  const profileTime=fxeFinite(s?.profileTime);
  return profileTime===null?{min:null,max:null,count:0}:{min:profileTime,max:profileTime,count:1}
}
function fxeDataset(s){
  return{
    id:s?.id??null,type:typeof datasetTypeOf==='function'?datasetTypeOf(s):(s?.datasetType||''),
    field:fxeFieldName(s),fieldRaw:s?.field?.raw||'',unit:s?.field?.unit||s?.unit||'',
    dimensions:s?.field?.dimensions||s?.dimensions||'',association:s?.field?.association||s?.association||'',
    region:s?.region||s?.regionName||'',sourcePath:s?.sourcePath||'',fileName:s?.fileName||'',
    profileTime:fxeFinite(s?.profileTime),profileLine:s?.profileLine||'',profileAxis:s?.profileAxis||'',
    logFamily:s?.logFamily||'',logMetric:s?.logMetric||'',logSubIter:fxeFinite(s?.logSubIter),
    derivedKind:s?.derivedKind||'',timeRange:fxeTimeRange(s)
  }
}
function fxeCase(c){
  const ss=(series||[]).filter(s=>Number(s?.caseId)===Number(c?.id));
  let outputs=[];try{if(typeof outputCompletenessForCase==='function')outputs=outputCompletenessForCase(c)||[]}catch{}
  const r=typeof observedCaseTimeRange==='function'?observedCaseTimeRange(c?.id):{};
  return{
    id:c?.id??null,name:c?.name||'',rootPath:c?.rootPath||'',tags:[...(c?.tags||[])],visible:c?.visible!==false,
    regions:[...(c?.discovery?.regions||[])],
    observedTimeRange:{min:fxeFinite(r?.min),max:fxeFinite(r?.max),count:Number(r?.count)||0},
    configuration:fxeClone(c?.config||{}),runAudit:fxeClone(c?.runAudit||{}),discovery:fxeClone(c?.discovery||{}),
    outputCompleteness:fxeClone(outputs),
    dataInventory:{
      seriesCount:ss.length,
      fields:[...new Set(ss.map(fxeFieldName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),
      sources:[...new Set(ss.map(s=>s?.sourcePath||s?.fileName).filter(Boolean))].sort(),
      datasets:ss.map(fxeDataset)
    }
  }
}
function fxeFinding(f,index,caseMap){
  const c=caseMap.get(Number(f?.caseId));
  const related=(series||[]).filter(s=>{
    if(Number(s?.caseId)!==Number(f?.caseId))return false;
    if(!f?.field)return true;
    const n=fxeFieldName(s);return n===f.field||String(n).includes(String(f.field))||String(f.field).includes(String(n))
  }).slice(0,30).map(fxeDataset);
  return{
    index:index+1,id:f?.id||('finding_'+(index+1)),severity:f?.severity||'',title:f?.title||'',
    detail:f?.detail||'',reason:f?.reason||'',caseId:f?.caseId??null,caseName:c?.name||'',caseRoot:c?.rootPath||'',
    field:f?.field||'',time:fxeFinite(f?.time),measured:fxeFinite(f?.measured),reference:fxeFinite(f?.reference),
    target:fxeClone(f?.target||{}),relatedEvidence:related
  }
}
function fxeBundle(){
  const findings=typeof allWorkspaceFindings==='function'?allWorkspaceFindings():[];
  const caseMap=new Map((cases||[]).map(c=>[Number(c.id),c]));
  let health=null,thresholds={};
  try{const h=workspaceHealthSnapshot||(typeof workspaceHealth==='function'?workspaceHealth():null);if(h)health={state:h.state||'',reason:h.reason||'',counts:fxeClone(h.counts||{})}}catch{}
  try{if(typeof diagSettings==='function')thresholds=diagSettings()}catch{}
  return{
    schema:'FoamLens Findings Assistant Bundle',schemaVersion:1,generatedAt:new Date().toISOString(),
    generatedBy:typeof flBuildIdentity==='function'?flBuildIdentity():'FoamLens',
    purpose:'Evidence-preserving handoff for technical review. Findings describe available evidence and are not causal proof without verification.',
    reviewInstructions:[
      'Review FAIL and WARNING first, then NOTICE findings.',
      'Separate explicit evidence from inference; missing configured output alone is not proof of solver failure.',
      'Use measured/reference values and physical time when present.',
      'Use source paths, dimensions, association and configuration metadata to verify compatibility.',
      'Cite finding IDs in conclusions and state what extra evidence is needed where evidence is insufficient.'
    ],
    workspace:{
      name:typeof projectDisplayName==='function'?projectDisplayName():'FoamLens workspace',health,thresholds:fxeClone(thresholds),
      activeContext:{caseId:typeof activeContextCaseId!=='undefined'?activeContextCaseId:null,region:typeof activeContextRegion!=='undefined'?activeContextRegion:''},
      caseCount:(cases||[]).length,seriesCount:(series||[]).length,findingCount:findings.length
    },
    cases:(cases||[]).map(fxeCase),findings:findings.map((f,i)=>fxeFinding(f,i,caseMap))
  }
}
function fxeMdEscape(v){return String(v??'').replaceAll('|','\\|').replace(/\r?\n/g,' ')}
function fxeMarkdown(b=fxeBundle()){
  const c=b.workspace?.health?.counts||{},L=[
    '# FoamLens Findings Review Bundle','',
    'Generated: '+b.generatedAt,'Build: '+b.generatedBy,'Workspace: '+(b.workspace?.name||'—'),
    'Cases: '+(b.workspace?.caseCount||0)+' · Series: '+(b.workspace?.seriesCount||0)+' · Findings: '+(b.workspace?.findingCount||0),
    'Health: '+(b.workspace?.health?.state||'—'),
    'Counts: '+(c.FAIL||0)+' FAIL · '+(c.WARNING||0)+' WARNING · '+(c.NOTICE||0)+' NOTICE · '+(c.INFO||0)+' INFO','',
    '## Instructions for the reviewer','',...b.reviewInstructions.map(x=>'- '+x),'',
    '## Findings','',
    '| # | Severity | Case | Field | Time [s] | Measured | Reference | Finding | Evidence / reason |',
    '|---:|---|---|---|---:|---:|---:|---|---|'
  ];
  for(const f of b.findings)L.push('| '+f.index+' | '+fxeMdEscape(f.severity)+' | '+fxeMdEscape(f.caseName)+' | '+fxeMdEscape(f.field)+' | '+(f.time??'')+' | '+(f.measured??'')+' | '+(f.reference??'')+' | '+fxeMdEscape(f.title)+' | '+fxeMdEscape(f.detail||f.reason)+' |');
  L.push('','## Case evidence');
  for(const x of b.cases){
    L.push('','### '+(x.name||('Case '+x.id)),'',
      '- Root: `'+(x.rootPath||'—')+'`','- Regions: '+(x.regions?.join(', ')||'—'),
      '- Observed time: '+(x.observedTimeRange?.min??'—')+' to '+(x.observedTimeRange?.max??'—')+' s',
      '- Fields: '+(x.dataInventory?.fields?.join(', ')||'—'),'- Datasets: '+(x.dataInventory?.seriesCount||0),
      '- Sources: '+(x.dataInventory?.sources?.slice(0,40).map(s=>'`'+s+'`').join(', ')||'—'),'',
      '<details><summary>Configuration / run evidence</summary>','','```json',
      JSON.stringify({configuration:x.configuration,runAudit:x.runAudit,outputCompleteness:x.outputCompleteness},null,2),
      '```','</details>');
  }
  L.push('','## Machine-readable evidence','','The companion JSON export includes per-finding related dataset metadata, discovery metadata, navigation targets and complete case evidence inventories without raw numeric arrays.');
  return L.join('\n')
}
async function fxeCopy(text){
  try{await navigator.clipboard.writeText(text);return true}catch{}
  try{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();return !!ok}catch{return false}
}
async function fxeOpen(uri){
  try{if(typeof FOAMLENS_NATIVE!=='undefined'&&FOAMLENS_NATIVE&&typeof foamLensNativeRequest==='function'){await foamLensNativeRequest('openExternal',{uri});return true}}catch{}
  try{window.open(uri,'_blank','noopener,noreferrer');return true}catch{return false}
}
function fxeFileStem(){const n=(typeof projectDisplayName==='function'?projectDisplayName():'FoamLens').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');return n||'FoamLens'}
function fxeExportJson(){const b=fxeBundle();downloadText(fxeFileStem()+'_findings_evidence.json',JSON.stringify(b,null,2),'application/json')}
function fxeExportMarkdown(){const b=fxeBundle();downloadText(fxeFileStem()+'_findings_assistant.md',fxeMarkdown(b),'text/markdown')}
async function fxeChatGPT(){
  const b=fxeBundle(),prompt='Please analyze this FoamLens findings bundle as a technical OpenFOAM review. Distinguish evidence from inference, prioritize critical findings, explain likely causes, and propose verification steps.\n\n'+fxeMarkdown(b);
  const ok=await fxeCopy(prompt),st=document.getElementById('status');if(st)st.textContent=ok?fxeUi('Findings copied for ChatGPT.','Hallazgos copiados para ChatGPT.'):fxeUi('Could not copy findings automatically.','No se pudieron copiar los hallazgos automáticamente.');
  await fxeOpen('https://chatgpt.com/')
}
function fxeGithubCounts(b){
  // Do not trust user-provided health summary text as a public issue payload.
  const counts={FAIL:0,WARNING:0,NOTICE:0,INFO:0,OTHER:0};
  for(const finding of Array.isArray(b?.findings)?b.findings:[]){
    const level=String(finding?.severity??'').toUpperCase();
    if(Object.prototype.hasOwnProperty.call(counts,level)&&level!=='OTHER')counts[level]++;
    else counts.OTHER++
  }
  return counts
}
function fxeGithubBody(b){
  const c=fxeGithubCounts(b);
  return [
    '## FoamLens scientific findings review (public-safe summary)',
    '',
    'Findings: '+(c.FAIL+c.WARNING+c.NOTICE+c.INFO+c.OTHER),
    'Severity: '+c.FAIL+' FAIL · '+c.WARNING+' WARNING · '+c.NOTICE+' NOTICE · '+c.INFO+' INFO · '+c.OTHER+' OTHER',
    '',
    '### Scientific verification',
    'Review evidence and distinguish measured results, inferences and missing information.',
    'Case names, local paths, physical samples, confidential field names, finding text and research metadata are intentionally excluded from this PUBLIC issue link.',
    'Detailed local Markdown and JSON evidence can be exported from FoamLens and shared only after the owner independently reviews and redacts it.',
    '',
    '> This issue is a request for review; it is not evidence of a solver defect or physical validation.'
  ].join('\n')
}
async function fxeGithub(){
  const b=fxeBundle(),c=fxeGithubCounts(b);
  const title='FoamLens findings review ('+c.FAIL+'F/'+c.WARNING+'W/'+c.NOTICE+'N)';
  // Never send the workspace title or confidential research metadata in an external GET URL.
  const uri='https://github.com/michels-lab/FoamLens/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(fxeGithubBody(b));
  await fxeOpen(uri)
}
function fxeMenuHtml(){
  return '<div class="fxeMenu" role="menu">'+
    '<button type="button" data-fxe="md">Assistant bundle (.md)</button>'+
    '<button type="button" data-fxe="json">Raw evidence (.json)</button>'+
    '<button type="button" data-fxe="chatgpt">Copy for ChatGPT ↗</button>'+
    '<button type="button" data-fxe="github">Create GitHub issue ↗</button></div>'
}
function fxeAttach(host,id){
  if(!host||document.getElementById(id))return;
  const wrap=document.createElement('div');wrap.className='fxeWrap';wrap.id=id;
  wrap.innerHTML='<button class="btn tiny fxeToggle" type="button" aria-expanded="false">'+fxeUi('Export findings ▾','Exportar hallazgos ▾')+'</button>'+fxeMenuHtml();
  host.appendChild(wrap);
  const toggle=wrap.querySelector('.fxeToggle'),menu=wrap.querySelector('.fxeMenu');
  toggle.onclick=e=>{e.stopPropagation();const open=!wrap.classList.contains('open');document.querySelectorAll('.fxeWrap.open').forEach(x=>x.classList.remove('open'));wrap.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false')};
  menu.onclick=async e=>{
    const a=e.target?.closest?.('[data-fxe]');if(!a)return;wrap.classList.remove('open');toggle.setAttribute('aria-expanded','false');
    if(a.dataset.fxe==='md')fxeExportMarkdown();else if(a.dataset.fxe==='json')fxeExportJson();else if(a.dataset.fxe==='chatgpt')await fxeChatGPT();else if(a.dataset.fxe==='github')await fxeGithub()
  }
}
function fxeInstall(){
  if(flFindingsExportInstalled)return true;
  const title=document.getElementById('workspaceFindingsTitle'),all=document.getElementById('allFindings');if(!title||!all)return false;
  fxeAttach(title.closest('.surfaceCardHead'),'fxeWorkspace');
  let bar=document.getElementById('fxeReviewBar');if(!bar){bar=document.createElement('div');bar.id='fxeReviewBar';bar.className='fxeReviewBar';all.parentElement?.insertBefore(bar,all)}fxeAttach(bar,'fxeReview');
  if(!document.getElementById('fxeStyle')){
    const s=document.createElement('style');s.id='fxeStyle';s.textContent='.fxeWrap{position:relative;display:inline-flex;margin-left:6px}.fxeMenu{position:absolute;right:0;top:calc(100% + 6px);z-index:760;display:none;min-width:220px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 16px 40px rgba(0,0,0,.28)}.fxeWrap.open .fxeMenu{display:grid;gap:3px}.fxeMenu button{border:0;background:transparent;color:var(--text);text-align:left;padding:8px 9px;border-radius:8px;cursor:pointer;font:inherit}.fxeMenu button:hover{background:var(--accentSoft)}.fxeReviewBar{display:flex;justify-content:flex-end;margin:8px 0 10px}';
    document.head.appendChild(s)
  }
  document.addEventListener('click',()=>document.querySelectorAll('.fxeWrap.open').forEach(x=>{x.classList.remove('open');x.querySelector('.fxeToggle')?.setAttribute('aria-expanded','false')}));
  document.addEventListener('foamlens-language-change',()=>document.querySelectorAll('.fxeToggle').forEach(b=>b.textContent=fxeUi('Export findings ▾','Exportar hallazgos ▾')));
  window.FoamLensFindingsExport={bundle:fxeBundle,markdown:fxeMarkdown,exportJson:fxeExportJson,exportMarkdown:fxeExportMarkdown,copyForChatGPT:fxeChatGPT,createGithubIssue:fxeGithub,isInstalled:()=>flFindingsExportInstalled};
  flFindingsExportInstalled=true;return true
}
(function retry(){if(fxeInstall())return;requestAnimationFrame(retry)})();
