'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-flow-analysis.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_FLOW_ANALYSIS_CORE_START */',end='/* FOAMLENS_FLOW_ANALYSIS_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Flow analysis core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {faPairs,faPercentile,faWeightedStats,faZeroCrossings};')();

const near=(x,y,t=1e-10)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('time-weighted mean is not biased by adaptive sampling density',()=>{
  const x=[0,.01,.02,.03,.1,1,5,10],y=x.slice();
  const s=api.faWeightedStats(x,y);
  assert(near(s.mean,5,1e-12));
});

test('coordinate-weighted RMS uses physical spacing',()=>{
  const x=[0,.1,.2,10],y=[3,3,3,3];
  const s=api.faWeightedStats(x,y);
  assert(near(s.mean,3));
  assert(near(s.rms,3));
  assert(near(s.meanAbs,3));
});

test('weighted stats retain distribution percentiles and span',()=>{
  const s=api.faWeightedStats([0,1,4],[1,5,9]);
  assert.strictEqual(s.count,3);
  assert.strictEqual(s.min,1);
  assert.strictEqual(s.max,9);
  assert.strictEqual(s.median,5);
  assert.strictEqual(s.span,4);
});

test('zero crossings interpolate physical coordinate',()=>{
  const z=api.faZeroCrossings([0,2,5],[-2,2,-4]);
  assert.strictEqual(z.length,2);
  assert(near(z[0],1));
  assert(near(z[1],3));
});

test('flow source is chosen explicitly by the user',()=>{
  assert(js.includes('<label>Flow signal</label><select id="faSource"></select>'));
  assert(js.includes('<label>Interpret as</label>'));
  assert(js.includes('User-defined flow signal'));
  assert(js.includes('Velocity component'));
  assert(js.includes('Speed / vector magnitude'));
  assert(js.includes('Vorticity'));
});

test('flow statistics are weighted by physical axis rather than sample count',()=>{
  assert(js.includes('time-weighted'));
  assert(js.includes('coordinate-weighted'));
  assert(js.includes('adaptive/nonuniform sampling does not bias them by sample count'));
});

test('flow analysis obeys active case and region context',()=>{
  assert(js.includes('seriesMatchesGlobalContext'));
});

test('flow analysis exports descriptive provenance without fixture coupling',()=>{
  assert(js.includes("analysis:'flow-signal-statistics'"));
  assert(js.includes('interpretation:interp'));
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!js.includes(banned),'Fixture leaked into Flow Analysis: '+banned);
});

console.log('General Flow Analysis regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
