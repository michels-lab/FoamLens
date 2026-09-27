'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const extension = path.join(__dirname, '..', 'src', 'FoamLensDesktop', 'frontend', 'v13-temporal-alignment.js');
const js = fs.readFileSync(extension, 'utf8');

const begin = '/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_START */';
const end = '/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_END */';
const a = js.indexOf(begin);
const b = js.indexOf(end, a);
assert(a >= 0 && b > a, 'Temporal alignment core markers are missing.');

const core = js.slice(a, b + end.length);
const api = new Function(core + '\nreturn {' +
  'taAlmostEqual,taFinitePairs,taCommonTimeRange,taNearestSample,taLinearSample,' +
  'taDownsampleGrid,taCommonGrid,taReferenceGrid,taAlignOne,taAlignSeries,' +
  'taPearsonPairs,taDifferenceValues,taPairMetrics};')();

const near = (x, y, tol = 1e-9) => Math.abs(x - y) <= tol;
const passed = [];
function test(name, fn) { fn(); passed.push(name); }

test('physical overlap only', () => {
  const A = { t:[0,1,2,3,4,5], y:[0,1,2,3,4,5] };
  const B = { t:[1.2,2.4,3.9,5.1], y:[10,20,30,40] };
  const r = api.taCommonTimeRange([A,B]);
  assert(r.valid && near(r.start,1.2) && near(r.end,5));
});

test('nearest never extrapolates', () => {
  const p = api.taFinitePairs({t:[2,4,6],y:[20,40,60]});
  assert.strictEqual(api.taNearestSample(p,1).ok,false);
  assert.strictEqual(api.taNearestSample(p,7).ok,false);
  const q = api.taNearestSample(p,4.4);
  assert(q.ok && q.status==='nearest' && near(q.usedTime,4) && near(q.delta,-.4));
});

test('linear interpolation is physical-time based', () => {
  const p = api.taFinitePairs({t:[1,3],y:[10,30]});
  const q = api.taLinearSample(p,2);
  assert(q.ok && q.status==='interpolated' && near(q.value,20));
  assert.deepStrictEqual(q.from,[1,3]);
});

test('common grid uses union inside shared interval', () => {
  const A={t:[0,1,2,3],y:[0,1,2,3]};
  const B={t:[.5,1.5,2.5,3.5],y:[0,1,2,3]};
  const g=api.taCommonGrid([A,B],100);
  assert(g.valid && near(g.range.start,.5) && near(g.range.end,3));
  for(const t of [.5,1,1.5,2,2.5,3]) assert(g.grid.some(v=>near(v,t)));
});

test('reference case grid uses selected source times only', () => {
  const A={t:[0,1,2,3,4],y:[0,1,2,3,4]};
  const B={t:[.25,1.25,2.25,3.25],y:[0,1,2,3]};
  const g=api.taReferenceGrid([A,B],1,100);
  assert(g.valid);
  assert.deepStrictEqual(g.grid,[.25,1.25,2.25,3.25]);
});

test('fixed vs adaptive alignment', () => {
  const fixed={t:[0,1,2,3,4,5],y:[0,10,20,30,40,50]};
  const adaptive={t:[0,.73,1.41,2.16,3.02,4.11,5.08],y:[0,7.3,14.1,21.6,30.2,41.1,50.8]};
  const r=api.taAlignSeries([fixed,adaptive],{mode:'common',method:'linear'});
  assert(r.valid && near(r.range.start,0) && near(r.range.end,5));
  assert(r.series[0].y.length===r.grid.length && r.series[1].y.length===r.grid.length);
  const i=r.grid.findIndex(t=>near(t,3));
  assert(i>=0 && near(r.series[1].y[i],30,1e-8));
});

test('adaptive vs adaptive nearest provenance', () => {
  const A={t:[0,.8,1.9,3.2],y:[0,8,19,32]};
  const B={t:[.1,.95,2.1,3.0,3.4],y:[1,9.5,21,30,34]};
  const r=api.taAlignSeries([A,B],{mode:'reference',referenceIndex:0,method:'nearest'});
  assert(r.valid);
  assert(r.series[1].meta.some(m=>m.status==='nearest'));
});

test('native mode preserves independent grids', () => {
  const A={t:[0,1,2],y:[1,2,3]},B={t:[0,.5,1,1.5,2],y:[1,2,3,4,5]};
  const r=api.taAlignSeries([A,B],{mode:'native'});
  assert(r.valid && r.mode==='native');
  assert.deepStrictEqual(r.series[0].t,[0,1,2]);
  assert.deepStrictEqual(r.series[1].t,[0,.5,1,1.5,2]);
});

test('difference metrics are evaluated only on aligned values', () => {
  const t=[0,1,2],A=[2,4,8],B=[1,5,6];
  const m=api.taPairMetrics(t,A,B,1e-12);
  assert.strictEqual(m.count,3);
  assert(near(m.mae,(1+1+2)/3));
  assert(near(m.rmse,Math.sqrt((1+1+4)/3)));
  assert(near(m.maxAbs,2) && near(m.maxAbsTime,2));
});

test('relative and percent differences protect near-zero denominator', () => {
  const A=[2,4,6],B=[1,0,3];
  const rel=api.taDifferenceValues(A,B,'relative',1e-9);
  const pct=api.taDifferenceValues(A,B,'percent',1e-9);
  assert(near(rel[0],1) && Number.isNaN(rel[1]) && near(rel[2],1));
  assert(near(pct[0],100) && Number.isNaN(pct[1]) && near(pct[2],100));
});

test('large common grids are bounded without changing endpoints', () => {
  const t1=Array.from({length:5000},(_,i)=>i/1000);
  const t2=Array.from({length:5000},(_,i)=>.0005+i/1000);
  const A={t:t1,y:t1},B={t:t2,y:t2};
  const g=api.taCommonGrid([A,B],300);
  assert(g.valid && g.grid.length<=300);
  assert(near(g.grid[0],g.range.start) && near(g.grid.at(-1),g.range.end));
});

test('UI exposes required temporal alignment modes and derived differences', () => {
  for(const token of ['Common Time Grid','Reference Case Grid','Nearest','Linear','Add A − B curve','Add % difference']) {
    assert(js.includes(token), 'Missing UI token '+token);
  }
  assert(js.includes('No extrapolation.'));
  assert(js.includes("derivedKind:'temporalAlignmentDifference'"));
});

test('comparison exports preserve reproducibility metadata', () => {
  for(const token of ['taExportPayload','noExtrapolation:true','commonRange','provenanceA','provenanceB','FoamLens_temporal_comparison.json','FoamLens_temporal_comparison.csv']) {
    assert(js.includes(token), 'Missing export metadata token '+token);
  }
});

test('core contains no project fixture names', () => {
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal']) {
    assert(!core.includes(banned), 'Fixture-specific token leaked into temporal core: '+banned);
  }
});

console.log('Temporal alignment / difference regression suite passed: '+passed.length+' checks.');
for(const name of passed) console.log('  ✓ '+name);
