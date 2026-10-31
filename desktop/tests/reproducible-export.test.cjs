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

test('export controls stay visible and explain missing source data',()=>{
  assert(js.includes("wrap.style.display=''"));
  assert(js.includes("j.disabled=!ready"));
  assert(js.includes("c.disabled=!ready"));
  assert(js.includes("flSetIssue(note,'export-source-missing'"));
  assert(js.includes("flSetIssue('rxExportNote','export-source-missing'"));
  assert(js.includes("anchor.insertAdjacentElement('afterend',wrap)"));
});

test('product fixture names do not appear in export core',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!core.includes(banned),'Fixture leaked into export core: '+banned);
});


test('missing measurements never silently become physical zero, scientific dot decimals remain valid',()=>{
  const p=api.rxFinitePoints({
    t:[0,null,'','  ','1.5','0x10','1e-3',2,'+3','.25'],
    y:[7,8,9,10,11,12,13,null,false,' -2.0E+1 ']
  });
  assert.deepStrictEqual(p,[
    {index:0,x:0,value:7},
    {index:4,x:1.5,value:11},
    {index:6,x:0.001,value:13},
    {index:9,x:0.25,value:-20}
  ]);
  assert.deepStrictEqual(api.rxFinitePoints({t:[0,1,2,3,4],y:[0,false,{},[],NaN]}),[{index:0,x:0,value:0}]);
});

test('finite extreme-value mean and RMS do not overflow or underflow',()=>{
  const large=api.rxStats([{x:0,value:1e308},{x:1,value:-1e308}]);
  assert(Number.isFinite(large.mean)&&Math.abs(large.mean)<1e294,'balanced mean must remain finite');
  assert(Number.isFinite(large.rms)&&Math.abs(large.rms/1e308-1)<1e-12,'RMS must be finite at scientific extremes');
  const tiny=api.rxStats([{x:0,value:1e-300},{x:1,value:-1e-300}]);
  assert(Number.isFinite(tiny.rms)&&tiny.rms>0);
  assert(Math.abs(tiny.rms/1e-300-1)<1e-12);
  const zeros=api.rxStats([{x:0,value:0},{x:1,value:0}]);
  assert.strictEqual(zeros.rms,0);
});

const csvStart=js.indexOf('function rxCsv(payload){');
const csvEnd=js.indexOf('\nfunction rxFileStem(',csvStart);
assert(csvStart>=0&&csvEnd>csvStart,'actual runtime CSV exporter must be discoverable');
const rxCsv=new Function(js.slice(csvStart,csvEnd)+'\nreturn rxCsv;')();

function testCsvPayload(){
  return {
    generatedBy:'FoamLens v1.8.10',
    dataset:{
      datasetType:'timeseries',caseName:'original\n=HYPERLINK("https://invalid.example")',
      caseRoot:'C:\\case\r\n+SUM(1,1)',caseTags:['metal','mold\n@fake'],
      region:'solid',field:'T',dimensions:'[0 0 0 1 0 0 0]',unit:'K',
      provenance:{sourcePath:'postProcessing\\foo\n=2+2',derivedKind:'source'}
    },
    statistics:{count:1,min:-2,max:-2},
    points:[{sampleIndex:0,physicalTime:0,value:-2}]
  };
}

test('CSV metadata is single-line even with malicious line breaks from imported case/provenance',()=>{
  const csv=rxCsv(testCsvPayload());
  const lines=csv.split('\n');
  assert.strictEqual(lines.length,16,'exactly 14 comments, a header and one measured sample');
  assert(lines.slice(0,14).every(line=>line.startsWith('# ')));
  assert(!lines.some(line=>/^[=+@]/.test(line)),'no injected spreadsheet command rows');
  assert(lines.find(line=>line.startsWith('# case=')).includes('\\n=HYPERLINK'));
  const source=lines.find(line=>line.startsWith('# provenance='));
  assert.strictEqual(JSON.parse(source.slice('# provenance='.length)).sourcePath,'postProcessing\\foo\n=2+2');
  assert(lines[15].includes('"-2"'),'negative physical measurements must remain numeric');
});

test('CSV rejects formula strings and non-finite numeric data cells, permits missing profile time',()=>{
  const p=testCsvPayload();
  p.points[0].value='=HYPERLINK("https://invalid.example")';
  assert.throws(()=>rxCsv(p),/finite scientific numeric values/);
  p.points[0].value=Infinity;
  assert.throws(()=>rxCsv(p),/finite scientific numeric values/);
  p.points[0].value=-2;
  p.dataset.datasetType='profile';
  p.points=[{sampleIndex:0,coordinate:1.5,value:-2,physicalTime:null}];
  assert(rxCsv(p).split('\n').at(-1).endsWith(',""'),'unknown physical time must be blank, not zero');
});

console.log('Reproducible selected-series export regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
