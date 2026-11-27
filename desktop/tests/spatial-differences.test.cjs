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

test('panel stays visible and explains missing comparison inputs',()=>{
  assert(js.includes("if(box)box.style.display=''"));
  assert(js.includes("flSetIssue(st,'at least two spatial profiles are required'"));
  assert(js.includes("expected:'Two compatible rendered spatial profiles'"));
  assert(js.includes("currentDataView!=='profile'"));
});

test('export without a completed comparison is actionable',()=>{
  assert(js.includes("flSetIssue('sdStatus','analysis-not-run'"));
  assert(js.includes("expected:'Run the spatial comparison first'"));
});

test('core is project agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into spatial core: '+banned);
});


test('missing samples, duplicate coordinates and unequal lengths fail closed',()=>{
 for(const bad of [{t:[0,1],y:[null,2]},{t:[0,1],y:['',2]},{t:[0,1],y:[false,2]},{t:[0,0,1],y:[1,2,3]},{t:[0,1],y:[1]}])assert(!api.sdGrid(bad,{t:[0,1],y:[0,1]}).valid);
});
test('strict shared domain and explicit grid limit',()=>{
 const A={t:[0,1],y:[0,1]},B={t:[1+1e-13,2],y:[1,2]};
 assert(!api.sdGrid(A,B).valid);assert(!api.sdGrid(A,A,'bogus').valid);
 assert(!api.sdGrid({t:[0,.5,1],y:[0,5,1]},A,'common',2).valid);
 assert(Number.isNaN(api.sdValueAt([[0,0],[1,1]],1+1e-13)));
 const q=api.sdGrid(A,{t:[.25,.75],y:[.25,.75]});assert(q.valid&&q.grid[0]===.25&&q.grid.at(-1)===.75);
});
test('near but distinct physical coordinates remain distinct',()=>{
 const q=api.sdGrid({t:[0,1e-12,1],y:[0,4,1]},{t:[0,1],y:[0,1]});
 assert(q.valid&&q.grid.includes(1e-12)&&q.A[q.grid.indexOf(1e-12)]===4);
});
test('pair comparison and export retain actual-time and source binding',()=>{
 const block=js.slice(js.indexOf('function sdSamePhysicalKind'),js.indexOf('let sdMResult'));
 const check=new Function(core+'\n'+block+'\nreturn sdSamePhysicalKind;')();
 const A={caseId:'A',t:[0,1],y:[1,2],field:{canonical:'T',unit:'K'},profileAxis:'x',profileCoordUnit:'m',sourcePath:'A.csv',profileTime:10};
 const B={...A,caseId:'B',sourcePath:'B.csv',playbackMeta:{mode:'nearest',used:9}};
 assert(!check(A,B).ok);assert(!check(A,{...A,field:{canonical:'T',unit:'C'}}).ok);assert(check(A,{...A,caseId:'B'}).ok);
 assert(js.includes('r.binding!==sdPairBinding(A,B,mode,epsilon,budget)'));assert(js.includes('metricWeighting:'));assert(js.includes('sourcePaths:'));
});

console.log('Spatial quantitative comparison regression suite passed: '+passed.length+' checks.');
for(const n of passed)console.log('  ✓ '+n);

test('large pair grid keeps original coordinates and rejects insufficient budget',()=>{
 const n=120001,t=Array.from({length:n},(_,i)=>i),y=t.map(i=>i===60001?10:0),B={t:[0,n-1],y:[0,0]};
 const q=api.sdGrid({t,y},B,'common',n);assert(q.valid);assert.equal(q.grid.length,n);assert.equal(q.subsampled,false);
 const m=api.sdMetrics(q);assert.equal(m.maxAbs,10);assert.equal(m.maxAbsX,60001);assert(near(m.lengthWeighted.mae,10/(n-1)));
 assert(!api.sdGrid({t,y},B,'common',n-1).valid);
});
test('length weighting integrates sign crossings and irregular spatial samples',()=>{
 const m=api.sdMetrics({valid:true,grid:[0,1,4],A:[-2,2,2],B:[0,0,0]});
 assert(near(m.lengthWeighted.mae,1.75));assert(near(m.lengthWeighted.rmse,Math.sqrt(10/3)));assert(near(m.lengthWeighted.bias,1.5));
 const large=api.sdMetrics({valid:true,grid:[0,1],A:[1e200,1e200],B:[0,0]});assert.equal(large.rmse,1e200);
});
test('multicase comparison governed by total aligned values rather than hard case or coordinate cap',()=>{
 const compare=new Function(core+';return sdMCompare;')();
 const sources=Array.from({length:10},(_,i)=>({caseId:String(i),t:[0,1,2],y:[i,i,i],field:{canonical:'T',unit:'K'},profileAxis:'x',profileCoordUnit:'m',sourcePath:'source'+i,profileTime:1}));
 const cfg={confirmed:true,mapping:'same physical origin',limit:3,sampleBudget:30},r=compare(sources,cfg);
 assert(r.valid,r.reason);assert.equal(r.sources.length,10);assert(near(r.comparisons.at(-1).rmse,9));
 assert(!compare(sources,{...cfg,sampleBudget:29}).valid);assert(!compare([sources[0],{...sources[1],component:'x'}],cfg).valid);
 const n=100001,t=Array.from({length:n},(_,i)=>i);
 const wide=compare([{...sources[0],t,y:t},{...sources[1],t:[0,n-1],y:[0,n-1]}],{...cfg,limit:n,sampleBudget:2*n});
 assert(wide.valid,wide.reason);assert.equal(wide.grid.length,n);assert(wide.comparisons[0].rmse<1e-9,'linear interpolation rounding tolerance');
});
test('display envelope retains narrow peaks while scientific arrays remain untouched',()=>{
 const begin=js.indexOf('function sdPreviewIndices('),end=js.indexOf('function sdMColor(',begin);
 assert(begin>=0&&end>begin);const preview=new Function(js.slice(begin,end)+';return sdPreviewIndices;')();
 const grid=Array.from({length:20001},(_,i)=>i),y=grid.map(i=>i===12345?100:i===12346?-100:0);
 const ids=preview(grid,y,700);assert(ids.length<=1402);assert(ids.includes(12345)&&ids.includes(12346));assert.equal(ids[0],0);assert.equal(ids.at(-1),20000);assert.equal(y.length,20001);
});
