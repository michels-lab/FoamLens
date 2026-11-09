'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const passed=[];function test(name,fn){fn();passed.push(name)}

test('Watch Run is a desktop-oriented live monitor, not a browser placeholder',()=>{
  for(const token of ['id="liveRunState"','id="liveProgressBar"','id="liveMetricDeltaT"','id="liveMetricCourant"','id="liveMetricResidual"','id="liveMetricCoupling"','id="liveMetricExecution"','id="liveRefreshNow"','id="liveStop"','id="liveOpenNumerical"']) assert(index.includes(token),'Missing Watch Run UI token '+token);
  assert(!index.includes('Web-only limits'));
  assert(!index.includes('only works while this tab remains open'));
});

test('Watch Run parses physical and numerical state from a live OpenFOAM log tail',()=>{
  for(const token of ['function parseLiveLogSnapshot(text)','Courant\\s+Number','Initial\\s+residual','Final\\s+residual','ExecutionTime','Floating point exception','function liveRunState(snapshot)']) assert(index.includes(token),'Missing live parser token '+token);
});

test('Watch Run polls read-only folder data every five seconds and supports manual refresh/stop',()=>{
  assert(index.includes("window.showDirectoryPicker({mode:'read'})"));
  assert(index.includes('liveWatchTimer=setInterval(inspectLiveDirectory,5000)'));
  assert(index.includes("liveRefreshNow')?.addEventListener('click',inspectLiveDirectory)"));
  assert(index.includes("liveStop')?.addEventListener('click',stopLiveWatch)"));
  assert(!index.includes("showDirectoryPicker({mode:'readwrite'})"));
});

test('Watch Run explains minimized desktop monitoring and links to Numerical Performance',()=>{
  assert(index.includes('Monitoring continues when the FoamLens window is minimized.'));
  assert(index.includes('function openLiveNumericalPerformance()'));
  assert(index.includes("const box=$('npTools')"));
});


const evidenceStart=index.indexOf('const LIVE_STALE_MS=');
const renderStart=index.indexOf('function renderLiveSnapshot(snapshot){',evidenceStart);
assert(evidenceStart>=0&&renderStart>evidenceStart);
const sourceModel=new Function(index.slice(evidenceStart,renderStart)+';return {LIVE_STALE_MS,liveLogEvidence,liveRunState,liveReadFailure}')();
const now=1700000000000;
const base={folderName:'B3',logName:'log.icoFoam',logBytes:2100,logModifiedAt:now-120000,failed:false,ended:false};

test('Old log is stale across repeated reads, never inferred as running',()=>{
 const first=sourceModel.liveLogEvidence(base,null,now);
 assert.equal(first.logAgeMs,120000);assert.equal(sourceModel.liveRunState(first),'stale');
 const second=sourceModel.liveLogEvidence(base,first,now+5000);
 assert.equal(second.logAgeMs,125000);assert.equal(second.logChanged,false);
 assert.equal(sourceModel.liveRunState(second),'stale');
});
test('Real log bytes trigger a new source event then age back to stale',()=>{
 const first=sourceModel.liveLogEvidence(base,null,now);
 const update={...base,logBytes:2300,logModifiedAt:now+6000};
 const fresh=sourceModel.liveLogEvidence(update,first,now+6000);
 assert.equal(fresh.logChanged,true);assert.equal(sourceModel.liveRunState(fresh),'running');
 const later=sourceModel.liveLogEvidence(update,fresh,now+67000);
 assert.equal(sourceModel.liveRunState(later),'stale');
 const truncated=sourceModel.liveLogEvidence({...update,logBytes:20,logModifiedAt:now+70000},later,now+70000);
 assert.equal(truncated.logChanged,true);assert.equal(sourceModel.liveRunState(truncated),'running');
});
test('Unverified and terminal logs do not pretend the solver is running',()=>{
 const unknown=sourceModel.liveLogEvidence({...base,logModifiedAt:0},null,now);
 assert.equal(sourceModel.liveRunState(unknown),'unverified');
 const changed=sourceModel.liveLogEvidence({...base,logBytes:2200,logModifiedAt:0},unknown,now+5000);
 assert.equal(sourceModel.liveRunState(changed),'running');
 assert.equal(sourceModel.liveRunState(sourceModel.liveLogEvidence({...base,logName:''},null,now)),'waiting');
 assert.equal(sourceModel.liveRunState({...unknown,ended:true}),'completed');
 assert.equal(sourceModel.liveRunState({...unknown,failed:true,ended:true}),'failed');
 const other=sourceModel.liveLogEvidence({...base,folderName:'C3'},sourceModel.liveLogEvidence(base,null,now),now+5000);
 assert.equal(other.logChanged,false);assert.equal(sourceModel.liveRunState(other),'stale');
});


test('Live recovery preserves last-good data and shows permission failures',()=>{
 const good=sourceModel.liveLogEvidence({...base,updatedAt:now},null,now);
 const permission=Object.assign(new Error('access denied'),{name:'NotAllowedError'});
 const bad=sourceModel.liveReadFailure(good,permission,now+5000);
 assert.equal(sourceModel.liveRunState(bad),'read-error');
 assert.equal(bad.readError.kind,'permission');
 assert.equal(bad.readError.count,1);
 assert.equal(bad.updatedAt,now);
 const badAgain=sourceModel.liveReadFailure(bad,permission,now+10000);
 assert.equal(badAgain.readError.count,2);
 const resumed=sourceModel.liveLogEvidence({...base,logBytes:2300,logModifiedAt:now+15000},badAgain,now+15000);
 assert.equal(sourceModel.liveRunState(resumed),'running');
 assert.equal(resumed.readError,undefined);
});


test('Live recovery renders retry advice and retained measurements',()=>{
 const nodes=new Map(),dot={classList:{add(){},remove(){}}};
 const el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',style:{},querySelector:()=>dot});return nodes.get(id)};
 const renderSource=index.slice(evidenceStart,index.indexOf('async function refreshLiveCapability(){',renderStart));
 const harness=new Function('$','diagEs','liveFmt','esc',
   'let liveLastSnapshot=null;'+renderSource+
   ';return {liveLogEvidence,liveReadFailure,renderLiveSnapshot}')(
    el,()=>false,v=>String(v),v=>String(v).replaceAll('<','&lt;'));
 const good={...base,currentTime:11,updatedAt:now,logModifiedAt:now};
 const snap=harness.liveLogEvidence(good,null,now);
 const denied=Object.assign(new Error('permission denied'),{name:'NotAllowedError'});
 harness.renderLiveSnapshot(harness.liveReadFailure(snap,denied,now+10000));
 assert.equal(el('liveRunState').textContent,'READ ERROR');
 assert(el('liveDetail').innerHTML.includes('Choose the case folder again'));
 assert(el('liveDetail').innerHTML.includes('Failed reads: 1'));
 assert.equal(el('liveMetricUpdatedLabel').textContent,'Last successful read');
 assert(el('liveLastUpdated').textContent.includes('last successful data'));
 assert(el('liveMetricMonitor').textContent.includes('Choose folder again'));
 assert.equal(el('liveMetricTime').textContent,'11 / NaN s');
 harness.renderLiveSnapshot(harness.liveLogEvidence({...good,logBytes:2500},snap,now+11000));
 assert.equal(el('liveRunState').textContent,'RECENT LOG ACTIVITY');
 assert.equal(el('liveMetricMonitor').textContent,'5 s monitor');
});

console.log('Watch Run desktop monitoring regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);


async function runLiveIORecoveryTests(){
 const readerStart=index.indexOf('async function inspectLiveDirectory(){',renderStart);
 const readerEnd=index.indexOf('function openLiveNumericalPerformance(){',readerStart);
 assert(readerStart>renderStart&&readerEnd>readerStart,'native Watch Run reader must exist');
 const runtimeSource=
   'let liveDirectoryHandle=null,liveWatchTimer=null,liveLastSnapshot=null,liveActiveRead=null,liveWatchGeneration=0;'+
   'const $=env.lookup,window={showDirectoryPicker:env.pick},setInterval=env.addTimer,clearInterval=env.removeTimer;'+
   'const diagEs=()=>false,flSetIssue=(...args)=>env.errors.push(args);'+
   'const parseLiveLogSnapshot=()=>({currentTime:1,failed:false,ended:false});'+
   'const configWord=()=>\'\',configNumber=()=>NaN;'+
   'function renderLiveSnapshot(snapshot){liveLastSnapshot=snapshot||null;env.events.push(snapshot)};'+
   index.slice(evidenceStart,renderStart)+index.slice(readerStart,readerEnd)+
   ';return {chooseLiveFolder,inspectLiveDirectory,stopLiveWatch,liveRunState,'+
   'snapshot:()=>liveLastSnapshot,timer:()=>liveWatchTimer,generation:()=>liveWatchGeneration}';
 const createRuntime=(pick)=>{
   const nodes=new Map(),timers=new Map(),events=[],errors=[];
   let serial=0;
   const env={
     lookup:id=>{if(!nodes.has(id))nodes.set(id,{disabled:true,innerHTML:'',textContent:''});return nodes.get(id)},
     pick,events,errors,
     addTimer:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id},
     removeTimer:id=>timers.delete(id)
   };
   const api=new Function('env',runtimeSource)(env);
   return {...api,env,nodes,timers,events,errors}
 };
 const file={lastModified:Date.now(),size:128,
   slice(){return{text:async()=> 'Time = 1'}}};
 let permission='denied',ioError=null;
 const folder={name:'QuickCup-B3',
   async queryPermission(){return permission},
   async *entries(){
     if(ioError)throw ioError;
     yield ['log.icoFoam',{kind:'file',getFile:async()=>file}]
   },
   async getDirectoryHandle(){throw new Error('optional controlDict missing')}
 };
 const run=createRuntime(async()=>folder);
 await run.chooseLiveFolder();
 assert.equal(run.liveRunState(run.snapshot()),'read-error');
 assert.equal(run.snapshot().readError.kind,'permission');
 assert.equal(run.snapshot().readError.count,1);
 assert.equal(run.nodes.get('liveRefreshNow').disabled,false,'initial permission denial cannot disable retry');
 assert.equal(run.nodes.get('liveStop').disabled,false,'stop remains available on initial failure');
 assert.equal(run.timers.size,1,'automatic read-only retry continues after first read failure');
 permission='granted';
 await run.inspectLiveDirectory();
 assert.equal(run.snapshot().readError,undefined,'recovered permissions clear the read error');
 const successfulAt=run.snapshot().updatedAt;
 ioError=new Error('temporary file read failure');
 await run.inspectLiveDirectory();
 await run.inspectLiveDirectory();
 assert.equal(run.liveRunState(run.snapshot()),'read-error');
 assert.equal(run.snapshot().readError.kind,'io');
 assert.equal(run.snapshot().readError.count,2);
 assert.equal(run.snapshot().updatedAt,successfulAt,'failed polls cannot update last-good timestamp');
 assert.equal(run.timers.size,1,'transient I/O failures do not kill monitoring');
 ioError=null;file.size=155;file.lastModified=Date.now()+1;
 await run.inspectLiveDirectory();
 assert.equal(run.snapshot().readError,undefined,'successful recovery clears I/O state');
 assert.equal(run.errors.length,0,'recoverable source errors do not spam unrelated issue logs');
 run.stopLiveWatch();
 assert.equal(run.snapshot(),null);
 assert.equal(run.timers.size,0);
 assert.equal(run.nodes.get('liveStop').disabled,true);
 passed.push('Live read-only reader auto-recovers permission and transient I/O failures');

 let release,markStarted;
 const gate=new Promise(resolve=>{release=resolve});
 const started=new Promise(resolve=>{markStarted=resolve});
 const slow={name:'QuickCup-C3',queryPermission:async()=> 'granted',
   async *entries(){
     markStarted();await gate;
     yield ['log.icoFoam',{kind:'file',getFile:async()=>file}]
   },
   async getDirectoryHandle(){throw new Error('optional')}
 };
 const race=createRuntime(async()=>slow);
 const pending=race.chooseLiveFolder();
 await started;
 race.stopLiveWatch();release();
 await pending;
 assert.equal(race.snapshot(),null,'late read after Stop must not revive old scientific data');
 assert.equal(race.timers.size,0,'late folder picker cannot re-arm polling after Stop');
 assert.equal(race.nodes.get('liveStop').disabled,true);
 passed.push('Stop during pending async read never restores the old session');
}
runLiveIORecoveryTests().then(()=>{
 console.log('Watch Run async folder recovery checks passed.');
}).catch(error=>{console.error(error);process.exitCode=1});
