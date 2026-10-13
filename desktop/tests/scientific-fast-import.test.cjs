'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const start=src.indexOf('// Large 2D transient runs can have thousands of time directories');
const end=src.indexOf('function prepareImportProgress(totalFiles,totalCases){',start);
assert(start>=0&&end>start,'Production fast-import path must be present');
const fragment=src.slice(start,end);
const now=()=>Number(process.hrtime.bigint()/1000000n);

async function runScenario(fileCount,curveCount){
  const called=[],progress=[],nodes=new Map(),cases=[{id:1,name:'2D metal mold',discovery:{regions:['metal','mold']}}];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',classList:{add(){},remove(){}},value:'',onclick:null});return nodes.get(id)};
  const mock={
    console:{info(...x){called.push('log '+x.join(' '))}},
    performance:{now},series:Array.from({length:curveCount},(_,id)=>({id,caseId:1})),cases,currentDataView:'timeseries',
    document:{querySelectorAll:()=>[],body:{classList:{toggle(){}}}},
    $:node,diagEs:()=>false,esc:String,updateContextTrail:()=>{},refreshGlobalContext:()=>called.push('context'),
    pendingLazyProfileCount:()=>0,projectDisplayName:()=>cases[0].name,
    hasRealWorkspaceEvidence:()=>true,applyHealthStateVisual:()=>{},
    scanStepState:(key,state)=>called.push('step '+key+' '+state),
    scanSetLive:(p)=>progress.push(p),
    scanYieldProgress:async p=>{progress.push(p)},
    scannerYield:async()=>{},
    invalidateHealthAnalysisIndex:()=>called.push('invalidate'),
    ensureVelocityDerivedSeries:()=>called.push('derived'),
    refreshDatasetControls:()=>called.push('selectors'),
    refreshLogSelectors:()=>called.push('logs'),
    updateDatasetViewUI:()=>called.push('data-ui'),
    refreshProfileTimes:()=>called.push('profile-time'),
    refreshDifferenceControls:()=>called.push('difference'),
    refreshCouplingDiagnostics:()=>called.push('coupling'),
    renderPhaseFront:()=>called.push('phase-front'),
    computeWorkspaceHealthProgressive:async()=>{called.push('health');return {findings:[],counts:{FAIL:0,WARNING:0,NOTICE:0,INFO:0},per:[]}},
    refreshWorkspaceReview:()=>called.push('review'),
    renderCaseManager:()=>called.push('case-ui'),
    renderList:()=>called.push('list-ui'),
    draw:()=>called.push('plot'),
    updateMeta:()=>called.push('plot-meta'),
    setOverlayOpen:()=>{},flSetIssue:()=>{},window:{},workspaceHealthSnapshot:null,
    flUi:(en)=>en
  };
  vm.createContext(mock);
  vm.runInContext(fragment+';globalThis.__api={run:finalizeBulkImportWorkspace,audit:flRunScientificAuditOnDemand,preview:flFastImportOverview,ready:flNeedsFastScientificImport,getState:()=>({pending:flImportAuditPending,perf:flImportPerformance})}',mock,{filename:'live-foamlens-import.js',timeout:1000});
  const t=now();await mock.__api.run(fileCount,fileCount);const elapsed=now()-t;
  return {called,progress,elapsed,api:mock.__api,nodes};
}
(async()=>{
  const big=await runScenario(3008,3008);
  assert(big.elapsed<2000,'Opening 3,008 indexed 2D output files must not synchronously execute expensive diagnostics');
  assert(big.api.getState().pending,'Large case audit must explicitly be pending, never falsely healthy');
  for(const heavy of ['difference','coupling','phase-front','health']){
    assert(!big.called.includes(heavy),'Import must not eagerly perform expensive '+heavy+' analysis');
  }
  assert(big.called.includes('plot')&&big.called.includes('case-ui'),'First scientific data plot and case explorer must be usable immediately');
  assert(big.progress.some(x=>x>=97),'Fast import must have truthful finite completion progress');
  assert(big.api.getState().perf.mode==='indexed-fast','Large physical transient run must use lazy analysis mode');
  assert(big.api.getState().perf.stageMs.firstVisibleWorkspace>=0,'First visible plot timing must be reported');
  assert(big.nodes.get('workspaceHealthState').textContent==='NOT YET ANALYZED','Uncomputed health must not be presented as healthy');
  assert(big.nodes.get('readyFindings')===undefined||big.nodes.get('readyFindings').textContent!=='0','Uncomputed finding count must not be reported as a scientific zero');
  assert(typeof big.nodes.get('workspaceFindings').onclick==='object'||big.nodes.get('workspaceFindings').innerHTML.includes('Run full scientific audit'),'On-demand diagnostic control must be visible');
  const data=await big.api.audit();
  assert(big.called.includes('health')&&big.called.includes('coupling')&&big.called.includes('review'),
    'Explicit audit request must run all promised scientific health and coupling diagnostics');
  assert(!big.api.getState().pending,'Full audit must clear pending state only after successful analysis');
  assert(data&&Array.isArray(data.findings),'Scientific health audit must produce a result');
  assert(big.api.getState().perf.auditMs>=0,'Explicit full-audit duration must be reported separately');

  const small=await runScenario(14,14);
  for(const required of ['difference','coupling','phase-front','health','plot','review']){
    assert(small.called.includes(required),'Small cases must preserve eager scientific analysis: '+required);
  }
  assert(!small.api.getState().pending,'Small case must preserve immediate validated health state');
  assert.equal(small.api.getState().perf.mode,'full');

  assert(src.includes("if(flFastImportOverview())return;"),
    'Review render must not auto-recompute expensive Health behind the fast-import path');
  assert(src.includes("flImportAuditPending?'Not analyzed':(workspaceHealthSnapshot||workspaceHealth()).findings.length"),
    'Ready overlay must never run health computation on the fast-import path');
  assert(src.includes("if(activeAppMode==='review'&&flImportAuditPending)void flRunScientificAuditOnDemand()"),
    'Review navigation must re-enable the full requested scientific audit');
  assert(src.includes("scanStepState('structure','done',diagEs()?'Archivos seleccionados':'Files selected')"),
    'Raw 2D file import must not show Prepare cases Waiting after files are parsed');
  assert(src.includes('id="readyPerformance"'),
    'A scientific owner benchmark must be exportable from the completed import dialog');
  assert(src.includes("schema:'foamlens-scientific-import-timing-v1'")&&
    src.includes('fileParseAndMetadataMs:perf.fileParseAndMetadataMs??null')&&
    src.includes('endToEndMs:perf.endToEndMs??null'),
    'Import timing report must include parse and full-load wall time with explicit provenance');
  assert(src.includes('auditEvaluated:!flImportAuditPending')&&
    src.includes("downloadText('FoamLens_import_timing_v1.json'"),
    'Export must distinguish uncomputed health audit from actual evidence and save a JSON report');
  console.log('FoamLENS 2D fast-import regression PASS: 3,008 files opened without eager heavy diagnostics; small case unchanged; audit on demand and truthful state verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
