'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-equivalent-observables.js');
const source=fs.readFileSync(file,'utf8');new Function(source);
const start=source.indexOf('/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_START */'),end=source.indexOf('/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_END */');
assert(start>=0&&end>start,'Pure scientific comparator core boundaries are required');
const {compare,eligible,pairs,unit,grid}=new Function(source.slice(start,end)+
 ';return{compare:eoCompare,eligible:eoEligible,pairs:eoPairs,unit:eoUnitInfo,grid:eoSampleGrid}')();
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
const zeros=pairs(series(7,[0,1,2,null,''],[0,0,1,999,999]));
assert.deepStrictEqual(zeros.map(x=>x.t),[0,1,2]);
assert.strictEqual(zeros[0].y,0);
const repeated=pairs(series(8,[0,1,1,2],[5,7,9,6]));
assert.deepStrictEqual(repeated.map(x=>x.y),[5,9,6]);
const truncated=grid(pairs(series(1,[0,1,2,3],[1,2,3,4])),pairs(series(2,[1,2,3,4],[2,3,4,5])),2);
assert.deepStrictEqual(truncated.times,[1,3]);
assert.strictEqual(unit('watts').canonical,'watts');
assert.strictEqual(unit(''),null);
for(const token of [
 'id="eoPanel"','id="eoSource2d"','id="eoSource3d"','id="eoMapping"',
 'id="eoConfirm"','id="eoExportJson"','id="eoExportCsv"','noCaseMutation:true',
 'noFieldSubtraction:true','noExtrapolation:true','window.FoamLensEquivalentObservables',
 'document.getElementById(\'paTools\')'
])assert(source.includes(token),'UI / scientific contract missing '+token);
for(const banned of ['QuickCup','C14','B14','metalTop','T_mold'])
 assert(!source.includes(banned),'Case-specific lab fixture token found in generic production module: '+banned);
console.log('FoamLens Granada equivalent-observable comparison PASS: physical units, scope, provenance, time overlap, metrics, no mesh subtraction.');
