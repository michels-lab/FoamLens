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

console.log('Watch Run desktop monitoring regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
