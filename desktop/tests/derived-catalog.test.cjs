'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');

const p0=index.indexOf('function flDerivedProvenance(s){');
const p1=index.indexOf('function flAllCatalogRows()',p0);
assert(p0>=0&&p1>p0,'Derived catalog functions were not found.');
const src=index.slice(p0,p1);

const api=new Function('series','datasetTypeOf','caseById','seriesRegion','pmFmt',src+'\nreturn {flDerivedProvenance,flDerivedCatalogRows};')(
  [
    {
      id:'d1',caseId:1,caseName:'A vs B',name:'A − B: T',derived:true,derivedKind:'temporalAlignmentDifference',
      sourceKind:'derived',sourcePath:'FoamLens temporal alignment',t:[0,1,2],y:[1,2,3],
      field:{canonical:'difference:T',unit:'K',dimensions:'[0 0 0 1 0 0 0]'},
      temporalAlignment:{mode:'common',method:'linear',sourceA:'Case A · T',sourceB:'Case B · T',range:{start:0,end:2}}
    },
    {
      id:'d2',caseId:1,caseName:'Case A',name:'Cooling Rate: T',derived:true,derivedKind:'physicalDerived',
      sourceKind:'derived',sourcePath:'FoamLens physical analysis',t:[0,1],y:[5,4],
      field:{canonical:'derived:Cooling Rate',unit:'K/s',dimensions:'[0 0 -1 1 0 0 0]'},
      physicalAnalysis:{operation:'physical-time-derivative',formula:'−dT/dt',source:'Case A · T'}
    },
    {
      id:'d3',caseId:1,caseName:'Case A',name:'|vorticity|',derived:true,derivedKind:'vectorMagnitude',
      sourceKind:'derived',sourcePath:'FoamLens generic vector magnitude',datasetType:'profile',profileTime:3.5,
      t:[0,1,2],y:[2,3,4],field:{canonical:'mag:vorticity',unit:'1/s',dimensions:'[0 0 -1 0 0 0 0]'},
      vectorDerivation:{base:'vorticity',components:['x','y','z'],alignment:'physical-coordinate-linear'}
    },
    {
      id:'d4',caseId:1,caseName:'Case A',name:'Net energy/power balance',derived:true,derivedKind:'physicalDerived',
      sourceKind:'derived',sourcePath:'FoamLens physical analysis',t:[0,1],y:[5,2],
      field:{canonical:'derived:balance',unit:'W',dimensions:'[1 2 -3 0 0 0 0]'},
      physicalAnalysis:{operation:'weighted-energy-power-balance',terms:[
        {source:'volume term',provenance:{postProcessing:{kind:'volumeReduction'}}},
        {source:'surface term',provenance:{postProcessing:{kind:'surfaceReduction'}}}
      ]}
    }
  ],
  s=>s.datasetType==='profile'?'profile':'timeseries',
  id=>({id,name:'Case A'}),
  s=>s.region||'fluid',
  v=>String(v)
);

const passed=[];function test(name,fn){fn();passed.push(name)}

const rows=api.flDerivedCatalogRows();

test('derived catalog includes all test derivations',()=>{
  assert.strictEqual(rows.length,4);
  assert(rows.every(r=>r.category==='derived'&&r.origin==='FoamLens derived'&&r.derived===true));
});

test('Energy Balance catalog provenance exposes volume and surface source types',()=>{
  const r=rows.find(x=>x.name==='Net energy/power balance');
  assert(r);
  assert(r.details.includes('weighted-energy-power-balance'));
  assert(r.details.includes('volumeReduction'));
  assert(r.details.includes('surfaceReduction'));
});

test('temporal difference provenance is preserved',()=>{
  const r=rows.find(x=>x.name==='A − B: T');
  assert(r);
  assert(r.details.includes('Temporal alignment'));
  assert(r.details.includes('common'));
  assert(r.details.includes('linear'));
  assert(r.details.includes('Case A · T'));
  assert.strictEqual(r.unit,'K');
  assert.strictEqual(r.timeMin,0);
  assert.strictEqual(r.timeMax,2);
});

test('physical derivative provenance and units are preserved',()=>{
  const r=rows.find(x=>x.name==='Cooling Rate: T');
  assert(r);
  assert(r.details.includes('physical-time-derivative'));
  assert(r.details.includes('−dT/dt'));
  assert.strictEqual(r.unit,'K/s');
  assert.strictEqual(r.dimensions,'[0 0 -1 1 0 0 0]');
});

test('vector magnitude provenance and physical profile time are preserved',()=>{
  const r=rows.find(x=>x.name==='|vorticity|');
  assert(r);
  assert(r.details.includes('Vector derivation'));
  assert(r.details.includes('components x/y/z'));
  assert(r.details.includes('physical-coordinate-linear'));
  assert.strictEqual(r.spatial,true);
  assert.strictEqual(r.temporal,false);
  assert.strictEqual(r.timeMin,3.5);
  assert.strictEqual(r.timeMax,3.5);
});

test('catalog has explicit Derived filter and bilingual label',()=>{
  assert(index.includes('<option value="derived">Derived / FoamLens</option>'));
  assert(index.includes("'Derivados / FoamLens'"));
});

test('catalog visually distinguishes native and derived provenance',()=>{
  assert(index.includes("r.derived?'dataCatalogDerived':'dataCatalogNative'"));
  assert(index.includes('.dataCatalogNative'));
  assert(index.includes('.dataCatalogDerived'));
});

test('catalog uses explicit unit before dimension-derived fallback',()=>{
  assert(index.includes("r.unit||pmUnitFromDimensions(r.dimensions)"));
});

console.log('Derived Data Catalog regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
