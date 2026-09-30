'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-reproducible-export.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_REPRODUCIBLE_EXPORT_CORE_START */',end='/* FOAMLENS_REPRODUCIBLE_EXPORT_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Reproducible export core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {rxFinitePoints,rxStats,rxSafeObject,rxProvenance};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('finite point export preserves physical X values',()=>{
  const p=api.rxFinitePoints({t:[0,.25,.9,NaN],y:[1,2,3,4]});
  assert.deepStrictEqual(p,[{index:0,x:0,value:1},{index:1,x:.25,value:2},{index:2,x:.9,value:3}]);
});

test('selected statistics are reproducible',()=>{
  const s=api.rxStats([{x:0,value:-2},{x:1,value:4},{x:2,value:1}]);
  assert.strictEqual(s.count,3);
  assert.strictEqual(s.min,-2);
  assert.strictEqual(s.max,4);
  assert.strictEqual(s.minX,0);
  assert.strictEqual(s.maxX,1);
  assert(Math.abs(s.mean-1)<1e-12);
  assert(Math.abs(s.rms-Math.sqrt(7))<1e-12);
});

test('postProcessing provenance is exported explicitly',()=>{
  const p=api.rxProvenance({sourcePath:'postProcessing/r/power/0/surfaceFieldValue.dat',postProcessing:{kind:'surfaceReduction',reduction:'sum(phi)',selection:{faces:true,area:true}}});
  assert.strictEqual(p.postProcessing.kind,'surfaceReduction');
  assert.strictEqual(p.postProcessing.selection.area,true);
});

test('derived provenance is explicit',()=>{
  const p=api.rxProvenance({
    derived:true,derivedKind:'physicalDerived',sourceKind:'derived',sourcePath:'FoamLens physical analysis',
    physicalAnalysis:{operation:'physical-time-derivative',formula:'−dT/dt'},
    temporalAlignment:{mode:'common',method:'linear'},
    vectorDerivation:{components:['x','y','z']}
  });
  assert.strictEqual(p.derived,true);
  assert.strictEqual(p.derivedKind,'physicalDerived');
  assert.strictEqual(p.physicalAnalysis.operation,'physical-time-derivative');
  assert.strictEqual(p.temporalAlignment.mode,'common');
  assert.deepStrictEqual(p.vectorDerivation.components,['x','y','z']);
});

test('JSON payload records case region field units and dimensions',()=>{
  for(const token of [
    "format:'FoamLens Series Export'",
    "generatedBy:flBuildIdentity()",
    'caseRoot:',
    'caseTags:[...(c?.tags||[])]',
    'region:rxRegion(s)',
    'dimensions,',
    'unit,',
    'provenance:rxProvenance(s)',
    'statistics:rxStats(points)'
  ]) assert(js.includes(token),'Missing payload token '+token);
});

test('solver-log export keeps physical time and timestep index separate',()=>{
  assert(js.includes("return{sampleIndex:p.index,timestepIndex:i,physicalTime:p.x,value:p.value}"));
  assert(js.includes("['sample_index','timestep_index','physical_time_s','value']"));
});

test('profile export separates coordinate and physical profile time',()=>{
  assert(js.includes("return{sampleIndex:p.index,coordinate:p.x,value:p.value,physicalTime:"));
  assert(js.includes("['sample_index','coordinate','value','physical_time_s']"));
});

test('CSV embeds case tags, provenance and statistics metadata',()=>{
  assert(js.includes("'# caseTags='+(d.caseTags||[]).join(',')"));

  assert(js.includes("'# provenance='+JSON.stringify"));
  assert(js.includes("'# statistics='+JSON.stringify"));
});

test('export controls are contextual to selected series',()=>{
  assert(js.includes("wrap.style.display=s&&rxFinitePoints(s).length?'':'none'"));
  assert(js.includes("anchor.insertAdjacentElement('afterend',wrap)"));
});

test('product fixture names do not appear in export core',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!core.includes(banned),'Fixture leaked into export core: '+banned);
});

console.log('Reproducible selected-series export regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
