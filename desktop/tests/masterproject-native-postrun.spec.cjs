'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(root,'v24-scientific-case-health.js'),'utf8');
new Function(source);
const start=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_START */'),
  end=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_END */',start);
assert(start>=0&&end>start,'Original Scientific Case Health module must supply source-owned parser');
const api=new Function(source.slice(start,end)+';return {csv:chPostRunCsv,audit:chAudit}')();
const passed=[];
const test=(name,fn)=>{fn();passed.push(name)};
const aCsv='time_s,metal_volume_m3,mold_volume_m3,metal_T_volMean_K,mold_T_volMean_K,metal_alpha1_volMean\n'+
  '0,0.00004794,0.00010289,1500,300,1\n'+
  '0.1,0.00004794,0.00010289,1480,301,0.999\n'+
  '0.2,0.00004794,0.00010289,1460,302,0.95\n';
const bCsv='time_s,metal_T_min_K,metal_T_mean_K,metal_T_max_K,alpha1_min,alpha1_mean,alpha1_max,alpha1_below_0_999_cells\n'+
  '0,1499,1500,1501,1,1,1,0\n'+
  '0.1,1470,1480,1490,0.99,0.995,1,3\n'+
  '0.2,1430,1440,1450,0.70,0.80,0.90,300\n';
test('original C3D04-style A reduction reads all columns and saved times without CFD',()=>{
  const data=api.csv(aCsv,'native_A.csv');
  assert.equal(data.schema,'foamlens/native-postrun-csv-evidence/1');
  assert.equal(data.samples,3);
  assert.deepEqual([data.firstTime_s,data.lastTime_s,data.minSavedInterval_s,data.maxSavedInterval_s],
    [0,0.2,0.1,0.1]);
  assert.equal(data.columns.find(x=>x.name==='metal_alpha1_volMean').min,0.95);
  assert.deepEqual(data.headers,['time_s','metal_volume_m3','mold_volume_m3',
    'metal_T_volMean_K','mold_T_volMean_K','metal_alpha1_volMean']);
  assert.equal(data.physicalModelValidated,false);
  assert.equal(data.originalSamplesRevalidated,false);
  assert.equal(data.originalCaseBindingVerified,false);
});
test('original C3D05-style B reduction does not fabricate onset, conservation or physics',()=>{
  const data=api.csv(bCsv,'native_B.csv');
  assert.equal(data.samples,3);
  assert.equal(data.columns.find(x=>x.name==='alpha1_below_0_999_cells').max,300);
  assert.equal(data.columns.find(x=>x.name==='alpha1_min').min,.7);
  assert.equal(data.headers.length,8);
  assert(!('firstSolidificationTime_s' in data),'Do not infer onset from arbitrary summary names');
  assert(!('energyConserved' in data));
});
test('quoting, line endings and scientific decimal notation remain supported',()=>{
  const csv='time_s,"metal.T_mean_K"\r\n0,1.500e3\r\n0.1,1.4e3\r\n';
  const data=api.csv(csv,'quoted.csv');
  assert.equal(data.columns[1].name,'metal.T_mean_K');
  assert.equal(data.columns[1].max,1500);
});
test('non-OpenFOAM numeric labels and incomplete original samples must fail closed',()=>{
  const bad=[
    'time_s,T\n0,1500\n0.1,',
    'time_s,T\n0,1500\n0,1400',
    'time_s,T\n0,1500\n-0.1,1400',
    'time_s,T\n0,1500\n0.1,0x1',
    'time_s,T\n0,1500\n0.1,NaN',
    'time_s,T\n0,1500\n0.1,Infinity',
    'time_s,T\n0,1500\n0.1,1e309',
    'time_s,T\n0,1500\n0.1',
    'time_s,T\n0,1500\n0.1,1400,extra',
    'T,times\n1500,0\n1400,0.1',
    'time_s,T,T\n0,1500,1500\n0.1,1400,1400',
    'time_s,T\n0,1500\n0.1,"1400',
    'time_s,T\n0,1500\n\n0.1,1400',
    'time_s,T\n0,1500\n0.1,=SUM(1,2)',
    'time_s,T\n0,1500\n0.1,1_000'
  ];
  for(const csv of bad)assert.throws(()=>api.csv(csv,'bad.csv'),Error,
    'Unverified source CSV must not result in valid physical timeline: '+csv.slice(0,45));
});
test('the source parser never truncates an over-limit native time history',()=>{
  const rows=['time_s,T'];
  for(let i=0;i<10001;i++)rows.push((i/10)+','+(1500-i/10));
  assert.throws(()=>api.csv(rows.join('\n'),'oversized.csv'),/10000/);
});
test('scientific health records a manually attributed reduction only as a warning',()=>{
  const selected={id:12,name:'Imported case',config:{},discoveryModel:{
    fields:[],dictionaries:[],regions:['metal','mold'],timeDirectories:[0,.1,.2],postProcessing:[]},
    discovery:{regions:['metal','mold']}};
  const parsed=api.csv(aCsv,'original_A.csv');
  const sourceChecks=api.audit({case:selected,logs:[]});
  const audit=api.audit({case:selected,logs:[],postrun:parsed});
  assert.equal(sourceChecks.checks.some(c=>c.id==='native-postrun'),false);
  const info=audit.checks.find(c=>c.id==='native-postrun');
  assert.equal(info.status,'warning');
  assert.match(info.details,/not bound to original frames/);
  assert.deepEqual(info.evidence,['original_A.csv']);
  assert.equal(audit.overall,'not-certified');
});
test('selected case numeric time inventory is compared without inventing or authorizing missing frames',()=>{
  const parsed=api.csv(aCsv,'unbound-A.csv');
  assert.deepEqual(parsed.savedTimes_s,[0,.1,.2],
    'Every source physical time must remain available for actual inventory comparison');
  const selected={id:32,name:'Imported original',config:{source:{controlDict:'case/system/controlDict'},
    endTime:.2,deltaT:.001},discoveryModel:{
      fields:[],dictionaries:[{name:'controlDict',sourcePath:'case/system/controlDict'}],
      regions:['metal','mold'],timeDirectories:[0,.2],postProcessing:[]},
    discovery:{regions:['metal','mold']}};
  const observed=api.audit({case:selected,postrun:parsed,logs:[]});
  const check=observed.checks.find(c=>c.id==='native-postrun');
  assert.equal(check.status,'warning');
  assert.match(check.details,/2\/3 CSV times align with the indexed original output-time directories/);
  assert.match(check.details,/Configured endTime=0.2 s/);
  assert.match(check.details,/NOT proof of solver completion/);
  const incorrect=api.audit({case:{...selected,config:{source:{controlDict:'case/system/controlDict'},
    endTime:10,deltaT:.001}},postrun:parsed,logs:[]});
  assert.match(incorrect.checks.find(c=>c.id==='native-postrun').details,
    /does not agree with this setting/);
  assert.equal(incorrect.overall,'not-certified');
});

test('cross-case timeline coverage is bounded, two-sided and exportable without case-certification',()=>{
  const csv=api.csv(aCsv,'source_summary.csv');
  const selected={id:12,name:'A',config:{},discoveryModel:{
    fields:[],timeDirectories:[0,.2,.3],regions:[],dictionaries:[],postProcessing:[]},discovery:{}};
  const audit=api.audit({case:selected,logs:[],postrun:csv});
  const t=audit.postrunTimeline;
  assert.equal(t.coverage,'partial-coverage');
  assert.equal(t.matchedCsvSamples,2);
  assert.equal(t.csvSamples,3);
  assert.equal(t.indexedOutputTimes,3);
  assert.equal(t.unmatchedCsvSamples,1);
  assert.equal(t.unmatchedIndexedOutputTimes,1);
  assert.deepEqual(t.firstUnmatchedCsvTimes_s,[.1]);
  assert.deepEqual(t.firstUnmatchedIndexedTimes_s,[.3]);
  assert.equal(t.originalCaseBindingVerified,false);
  assert.equal(t.physicalModelValidated,false);
  assert.equal(audit.overall,'not-certified');
  const detail=audit.checks.find(x=>x.id==='native-postrun').details;
  assert.match(detail,/1 CSV times unmatched/);
  assert.match(detail,/numeric alignment is NOT proof of case ownership/);
  assert.equal(api.audit({case:{...selected,discoveryModel:{...selected.discoveryModel,
    timeDirectories:[]}},logs:[],postrun:csv}).postrunTimeline.coverage,
    'original-inventory-unavailable');
});
test('near-zero physical frames are not falsely treated as identical across cases',()=>{
  const csv=api.csv('time_s,T\n0,1500\n0.00000000005,1490\n','small-times.csv');
  const selected={id:32,name:'original near zero',config:{},discoveryModel:{
    fields:[],timeDirectories:[0,0.0000000001],regions:[],dictionaries:[],postProcessing:[]}};
  const audit=api.audit({case:selected,logs:[],postrun:csv});
  assert.equal(audit.postrunTimeline.matchedCsvSamples,1,
    'time 5e-11 is not interchangeable with time 1e-10');
  assert.equal(audit.postrunTimeline.unmatchedCsvSamples,1);
  assert.equal(audit.postrunTimeline.unmatchedIndexedOutputTimes,1);
  const nearly=api.audit({case:{...selected,discoveryModel:{...selected.discoveryModel,
    timeDirectories:[0,0.00000000005+Number.EPSILON*0.00000000005]}},
    logs:[],postrun:csv});
  assert.equal(nearly.postrunTimeline.matchedCsvSamples,2,
    'machine precision alone can account for matching time representations');
});
test('finite CSV values cannot yield an infinite saved interval in a JSON evidence report',()=>{
  assert.throws(()=>api.csv('time_s,T\n-1e308,1500\n1e308,1400\n','overflow.csv'),
    /time interval is not finite/);
  assert.equal(api.csv('time_s,T\n0,1500\n0.1,1400\n').minSavedInterval_s,.1);
});

test('real panel and export preserve source identity and case invalidation',()=>{
  for(const token of ["id=\"chPostrunFile\"",
    "for(const [id,key,bytes] of [['chRuntimeFile'",
    "['chPostrunFile','postrun',4*1024*1024]",
    "postrun:chPostrun","r.postrunEvidence=chPostrun",
    "chPostrun===chBound.postrun",
    "chPostrun=null",
    "chPostrun=data?chPostRunCsv(data.text,data.file):null",
    "chPostrun.columns.filter(col=>col.name!=='time_s')",
    "physicalModelValidated:false,originalCaseBindingVerified:false"
  ])assert(source.includes(token),'Required original native source/UX wiring missing: '+token);
  assert(!source.includes('XMLHttpRequest')&&!source.includes('fetch('),
    'Original CSV must remain a read-only local asset, not network uploaded');
});
console.log('FoamLens MasterProject-native generic postrun CSV suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

async function reportOwnershipRegression(source,assert){
  const begin=source.indexOf('function chRenderReportStates(){'),end=source.indexOf('function chRefresh(){',begin);
  const nodes={},caseA={id:1,discoveryModel:{}},caseB={id:2,discoveryModel:{}};
  let currentCase=caseA,audits=0;
  for(const id of ['chRuntimeFile','chMeshFile','chPostrunFile','chAudit','chReportStates'])nodes[id]={value:'',files:[]};
  const state=new Function('chEl','chSelectedCase','chUi','chEsc','chInvalidate','chReadFile','chRuntime','maPureCheckMesh','chPostRunCsv','chRun','chSourceLogRows',
    'let chLast=null,chBound=null,chMesh=null,chRuntimeLog=null,chPostrun=null,chSelectionVersion=0,chEvidenceOwner=null,chEvidenceModel=null;const chReportStates=new Map();'+source.slice(begin,end)+
    ';return {reset:chResetReports,load:chLoadReport,current:chReportsCurrent,states:()=>Object.fromEntries(chReportStates),reports:()=>[chRuntimeLog,chMesh,chPostrun]}')(
      id=>nodes[id],()=>currentCase,en=>en,String,()=>{},input=>input.files[0]?.read||Promise.resolve(null),(v)=>v,v=>v,v=>v,()=>{audits++},()=>[]);
  function pick(id,name){let resolve,reject;const read=new Promise((a,b)=>{resolve=a;reject=b});nodes[id].files=[{name,read}];return {resolve:v=>resolve({file:name,text:v}),reject}}
  state.reset();
  let log=pick('chRuntimeFile','run.log'),csv=pick('chPostrunFile','run.csv');
  let lp=state.load('chRuntimeFile','runtime',100),cp=state.load('chPostrunFile','postrun',100);
  csv.resolve('CSV');await cp;assert.equal(audits,0);assert.equal(nodes.chAudit.disabled,true);
  log.resolve('LOG');await lp;assert.deepEqual(state.reports(),['LOG',null,'CSV']);assert.equal(audits,1);
  let old=pick('chPostrunFile','old.csv'),op=state.load('chPostrunFile','postrun',100);
  let fresh=pick('chPostrunFile','new.csv'),np=state.load('chPostrunFile','postrun',100);
  fresh.resolve('NEW');await np;old.resolve('OLD');await op;assert.equal(state.reports()[2],'NEW');
  let mesh=pick('chMeshFile','mesh.log'),mp=state.load('chMeshFile','mesh',100);
  currentCase=caseB;state.reset();mesh.resolve('STALE');await mp;assert.deepEqual(state.reports(),[null,null,null]);
  let bad=pick('chMeshFile','bad.log'),bp=state.load('chMeshFile','mesh',100);bad.reject(Error('invalid file'));await bp;
  assert.equal(state.states().mesh.status,'error');assert.equal(nodes.chAudit.disabled,true);
  nodes.chMeshFile.files=[];await state.load('chMeshFile','mesh',100);assert.equal(state.states().mesh.status,'empty');assert.equal(nodes.chAudit.disabled,false);
  currentCase.discoveryModel={};assert.equal(state.current(),false);
}

reportOwnershipRegression(source,assert).then(()=>console.log('Independent report ownership regression passed')).catch(error=>{console.error(error);process.exitCode=1});
