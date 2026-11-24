'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-equivalent-observables.js');
const source=fs.readFileSync(file,'utf8');new Function(source);
const start=source.indexOf('/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_START */'),end=source.indexOf('/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_END */');
assert(start>=0&&end>start,'Pure scientific comparator core boundaries are required');
const {compare,eligible,pairs,unit,grid,fingerprint}=new Function(source.slice(start,end)+
 ';return{compare:eoCompare,eligible:eoEligible,pairs:eoPairs,unit:eoUnitInfo,grid:eoSampleGrid,fingerprint:eoSourceFingerprint}')();
const near=(a,b)=>assert(Math.abs(a-b)<=1e-9,String(a)+' expected '+b);
const series=(caseId,t,y,fieldUnit='K',more={})=>({
 caseId,caseName:'Case '+caseId,datasetType:'timeseries',derived:false,
 sourcePath:'case'+caseId+'/postProcessing/probes/0/T',
 field:{canonical:'T',unit:fieldUnit,dimensions:'[0 0 0 1 0 0 0]'},
 t,y,...more
});
const meta={observable:'Temperature at TC-1',basis:'physical-point',
 mapping:'Both source curves represent the same physical X,Y,Z sensor location.',confirmed:true};
const ok=compare(series(21,[0,1,2,3],[300,310,320,330]),series(22,[0,.5,1.5,2.5,3],[301,306,316,326,331]),meta);
assert(ok.valid,ok.reason);
assert.strictEqual(ok.source2d.caseId,21);assert.strictEqual(ok.source3d.caseId,22);
assert.strictEqual(ok.unit,'K');assert.strictEqual(ok.methods.noExtrapolation,true);
assert.strictEqual(ok.methods.noFieldSubtraction,true);
near(ok.metrics.bias3dMinus2d,1);near(ok.metrics.rmse,1);near(ok.metrics.mae,1);
assert(ok.metrics.interpolationPairs>0);
assert(ok.rows.every(r=>r.t>=0&&r.t<=3));
assert(ok.rows.every(r=>r.delta===1));
assert(ok.source2d.sourcePath.includes('postProcessing'));
assert.strictEqual(ok.spatialMappingNote,meta.mapping);
assert.strictEqual(ok.designation.includes('user-declared'),true);
const conversion=compare(series(2,[0,1],[0,100],'°C'),series(3,[0,1],[273.15,373.15],'K'),meta);
assert(conversion.valid,conversion.reason);near(conversion.metrics.rmse,0);
const pressure=compare(series(4,[0,1],[100,200],'kPa',{field:{canonical:'p',unit:'kPa',dimensions:'[1 -1 -2 0 0 0 0]'}}),
 series(5,[0,1],[100000,200000],'Pa',{field:{canonical:'p',unit:'Pa',dimensions:'[1 -1 -2 0 0 0 0]'}}),meta);
assert(pressure.valid,pressure.reason);near(pressure.metrics.mae,0);
for(const [a,b,config,why] of [
 [series(1,[0,1],[1,2]),series(1,[0,1],[2,3]),meta,'distinct'],
 [series(1,[0,1],[1,2],'K'),series(2,[0,1],[1,2],'W'),meta,'unit'],
 [series(1,[0,1],[1,2]),series(2,[4,5],[1,2]),meta,'shared physical-time'],
 [series(1,[0,1],[1,2],''),series(2,[0,1],[1,2]),meta,'measured'],
 [series(1,[0,1],[1,2],'K',{derived:true}),series(2,[0,1],[1,2]),meta,'measured'],
 [series(1,[0,1],[1,2]),series(2,[0,1],[1,2]),{...meta,confirmed:false},'confirmation'],
 [series(1,[0,1],[1,2]),series(2,[0,1],[1,2]),{...meta,mapping:'1,2'},'meaningful'],
 [series(1,[0,1],[1,2]),series(2,[0,1],[1,2],'K',{field:{canonical:'T',unit:'K',dimensions:'[0 1 0 0 0 0 0]'}}),meta,'dimensional'],
 [series(1,[0,1],[1,2]),series(2,[0,1],[1,2]),{...meta,basis:'invalid'},'spatial']
]){const r=compare(a,b,config);assert(!r.valid,why+' should reject');assert.strictEqual(r.rows.length,0)}
assert(!eligible(series(5,[0],[3])));
for(const [bad,label] of [
 [series(31,[0,1,2],[300,310]),'unmatched time/value sample lengths'],
 [series(31,[0,1,2],[300,null,320]),'missing numeric measurement'],
 [series(31,[0,1,2],[300,'NaN',320]),'nonfinite string value'],
 [series(31,[0,1,1],[300,310,320]),'duplicate original physical time'],
 [series(31,[0,1,1+1e-12],[300,310,320]),'near-duplicate physical time']
]){
 assert(!eligible(bad),label+' must not be eligible as a complete source');
 const negative=compare(bad,series(32,[0,1,2],[300,310,320]),meta);
 assert(!negative.valid,label+' must not produce a false source-backed model comparison');
 assert.match(negative.reason,/complete unique physical times/);
}

const zeros=pairs(series(7,[0,1,2,null,''],[0,0,1,999,999]));
assert.deepStrictEqual(zeros.map(x=>x.t),[0,1,2]);
assert.strictEqual(zeros[0].y,0);
const repeated=pairs(series(8,[0,1,1,2],[5,7,9,6]));
assert.deepStrictEqual(repeated.map(x=>x.y),[5,9,6]);
// Original frames are never discarded to make a 2D/3D result "fit".
const forbiddenDecimation=grid(pairs(series(1,[0,1,2,3],[1,2,3,4])),
  pairs(series(2,[1,2,3,4],[2,3,4,5])),2);
assert.equal(forbiddenDecimation.valid,false,'A 2-point limit cannot silently discard real t=2');
assert.equal(forbiddenDecimation.sourcePoints,3);
assert.equal(forbiddenDecimation.times.length,0);
assert.match(forbiddenDecimation.reason,/no measured frames were silently discarded/);
const completeUnion=grid(pairs(series(1,[0,1,2,3],[1,2,3,4])),
  pairs(series(2,[1,2,3,4],[2,3,4,5])),3);
assert.equal(completeUnion.valid,true);
assert.deepStrictEqual(completeUnion.times,[1,2,3]);
assert.equal(completeUnion.notDecimated,true);
for(const invalidLimit of [0,1,1.5,100001,'',null,'0xFF']){
 const invalidGrid=grid(pairs(series(1,[0,1,2],[0,1,2])),
   pairs(series(2,[0,1,2],[0,1,2])),invalidLimit);
 assert.equal(invalidGrid.valid,false,'Never silently replace explicit bad source limit: '+String(invalidLimit));
 assert.match(invalidGrid.reason,/integer from 2 to 100000/);
}
const spikeTimes=Array.from({length:1601},(_,i)=>i/100);
const spikeSeries=spikeTimes.map((_,i)=>i===734?10000:0);
const spikeA=series(101,spikeTimes,spikeSeries,'W',
  {field:{canonical:'P',unit:'W',dimensions:'[1 2 -3 0 0 0 0]'}});
const spikeB=series(102,spikeTimes,spikeTimes.map(()=>0),'W',
  {field:{canonical:'P',unit:'W',dimensions:'[1 2 -3 0 0 0 0]'}});
const gridDenied=compare(spikeA,spikeB,{...meta,maxPoints:1500});
assert.equal(gridDenied.valid,false,'Never drop a genuine power peak for plausible RMSE');
assert.match(gridDenied.reason,/1601 genuine knots/);
const gridVerified=compare(spikeA,spikeB,{...meta,maxPoints:20000});
assert(gridVerified.valid,gridVerified.reason);
assert.equal(gridVerified.metrics.n,1601);
assert.equal(gridVerified.metrics.maxAbs,10000);
assert(gridVerified.rows.some(r=>r.t===7.34&&r.delta===-10000),
  'Actual short lived power excursion must remain in exact source-time grid');

// SI prefixes in source units are physical measurements, not case-insensitive labels.
for(const [symbol,canonical,expected] of [
  ['mW','W',.001],['MW','W',1000000],['mJ','J',.001],['MJ','J',1000000],
  ['mPa','Pa',.001],['MPa','Pa',1000000],['kPa','Pa',1000],
  ['W','W',1],['J','J',1],['Pa','Pa',1]
]){
 const x=unit(symbol);assert(x,'Valid SI source label '+symbol);
 assert.equal(x.canonical,canonical);
 assert(Math.abs(x.transform(1)-expected)<=Math.max(1e-12,expected*1e-12));
}
assert.equal(unit('MW').transform(1)/unit('mW').transform(1),1e9);
assert.equal(unit('MPa').transform(1)/unit('mPa').transform(1),1e9);
for(const badUnit of ['mw','mj','mpa','kw','kpa','pa','Kw']){
 assert.equal(unit(badUnit),null,'Ambiguous SI spelling must not create wrong physics: '+badUnit);
}
const watt2=series(201,[0,1],[1,2],'MW',
 {field:{canonical:'P',unit:'MW',dimensions:'[1 2 -3 0 0 0 0]'}});
const watt3=series(202,[0,1],[1e9,2e9],'mW',
 {field:{canonical:'P',unit:'mW',dimensions:'[1 2 -3 0 0 0 0]'}});
const equalPower=compare(watt2,watt3,meta);
assert(equalPower.valid,equalPower.reason);
near(equalPower.metrics.rmse,0);
assert(!eligible(series(null,[0,1],[300,310])),
  'Missing source case ID cannot become case zero');
assert(!eligible(series(false,[0,1],[300,310])));
assert(!eligible(series('0x10',[0,1],[300,310])));
assert(eligible(series(0,[0,1],[300,310])), 'Genuine OpenFOAM case 0 supported');
assert(!compare(series(0,[0,1],[300,310]),series(null,[0,1],[300,310]),meta).valid);
assert(!compare(series(103,[0,1],[300,-1]),series(104,[0,1],[300,320]),meta).valid,
  'Impossible Kelvin samples must not be reported in scientific 2D/3D metrics');
assert(!compare(series(103,[0,1,2],[300,310,320]),
  series(104,[-1,0,1,2],[ -1,300,310,320]),meta).valid,
  'Even an invalid Kelvin value before shared time coverage is corrupt original evidence');
assert.strictEqual(unit('watts').canonical,'watts');
assert.strictEqual(unit(''),null);
const original=series(41,[0,1],[300,310]);
const hash=fingerprint(original);
assert.equal(hash,fingerprint({...original,t:[0,1],y:[300,310]}),
  'Identical original measurements must retain the same source binding');
original.y[1]=999;
assert.notEqual(hash,fingerprint(original),
  'Editing actual source measurements must invalidate exported scientific evidence');
const originalMetadata=series(42,[0,1],[300,310]);
const headerHash=fingerprint(originalMetadata);
originalMetadata.field.unit='°C';
assert.notEqual(headerHash,fingerprint(originalMetadata),
  'Unit metadata changes must invalidate previously computed model comparison');
assert(!source.includes('eoLast=result;\n  const fmt='),
  'Comparison cannot leave source bindings out of the export path');
assert(source.includes('eoBound={')&&source.includes('eoSourceFingerprint({...a,datasetType:'),
  'Evidence exports must revalidate original in-memory data before writing');

for(const token of [
 "el.id='eoPanel'",'id="eoSource2d"','id="eoSource3d"','id="eoMapping"',
 'id="eoConfirm"','id="eoExportJson"','id="eoExportCsv"','noCaseMutation:true',
 'noFieldSubtraction:true','noExtrapolation:true','window.FoamLensEquivalentObservables',
 'document.getElementById(\'paTools\')','function eoInvalidate','previousCatalog=eoCatalog','eoLast=null'
])assert(source.includes(token),'UI / scientific contract missing '+token);
for(const banned of ['QuickCup','C14','B14','metalTop','T_mold'])
 assert(!source.includes(banned),'Case-specific lab fixture token found in generic production module: '+banned);
console.log('FoamLens Granada equivalent-observable comparison PASS: physical units, scope, provenance, time overlap, metrics, no mesh subtraction.');
