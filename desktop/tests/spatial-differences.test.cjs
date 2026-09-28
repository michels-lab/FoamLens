'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-spatial-differences.js');
const js=fs.readFileSync(file,'utf8'),begin='/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_START */',end='/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);assert(a>=0&&b>a,'Spatial difference core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {sdAlmost,sdPairs,sdValueAt,sdGrid,sdPearson,sdMetrics};')();
const near=(x,y,t=1e-9)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(n,f){f();passed.push(n)}

test('different spatial grids align by coordinate',()=>{
  const A={t:[0,1,2,3],y:[0,2,4,6]},B={t:[.5,1.5,2.5,3.5],y:[1,3,5,7]};
  const q=api.sdGrid(A,B,'common',100);assert(q.valid&&near(q.start,.5)&&near(q.end,3));
  for(let i=0;i<q.grid.length;i++)assert(near(q.A[i],2*q.grid[i])&&near(q.B[i],2*q.grid[i]));
});

test('reference grid remains inside overlap',()=>{
  const A={t:[0,1,2,3],y:[0,1,2,3]},B={t:[1.2,2.1,3.2],y:[1.2,2.1,3.2]};
  const q=api.sdGrid(A,B,'referenceA',100);assert(q.valid);assert(q.grid.every(x=>x>=1.2-1e-12&&x<=3+1e-12));
});

test('no spatial extrapolation',()=>{
  const A={t:[0,1],y:[0,1]},B={t:[2,3],y:[2,3]};assert.strictEqual(api.sdGrid(A,B,'common',100).valid,false);
});

test('quantitative spatial metrics',()=>{
  const q={valid:true,grid:[0,1,2],A:[2,4,8],B:[1,5,6]};
  const m=api.sdMetrics(q,1e-12);assert.strictEqual(m.count,3);assert(near(m.mae,4/3));assert(near(m.rmse,Math.sqrt(2)));assert(near(m.maxAbs,2)&&near(m.maxAbsX,2));
});

test('relative differences protect zero denominator',()=>{
  const q={valid:true,grid:[0,1],A:[2,3],B:[0,1]},m=api.sdMetrics(q,1e-9);assert(Number.isNaN(m.relativeDifference[0]));assert(near(m.percentDifference[1],200));
});

test('runtime comparison uses currently rendered profiles',()=>{
  assert(js.includes("currentViewSeries().filter(s=>datasetTypeOf(s)==='profile'"));
  assert(js.includes('Uses the profiles currently rendered at the same physical playback time.'));
  assert(js.includes('temporalProvenance:{A:r.A.playbackMeta||null,B:r.B.playbackMeta||null}'));
});

test('export records spatial and temporal provenance',()=>{
  for(const token of ['noIndexAlignment:true','noExtrapolation:true','sharedRange','physicalTime','playbackMeta','FoamLens_spatial_comparison.json'])assert(js.includes(token),'Missing '+token);
});

test('panel is capability gated to profile comparisons',()=>{
  assert(js.includes("box.style.display=src.length>=2?'':'none'"));
  assert(js.includes("currentDataView!=='profile'"));
});

test('core is project agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into spatial core: '+banned);
});

console.log('Spatial quantitative comparison regression suite passed: '+passed.length+' checks.');
for(const n of passed)console.log('  ✓ '+n);
