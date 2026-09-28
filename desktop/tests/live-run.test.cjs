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

console.log('Watch Run desktop monitoring regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
