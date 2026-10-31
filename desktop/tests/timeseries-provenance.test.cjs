'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-dual-timeseries.js'),'utf8');
new Function(src);
const start=src.indexOf('/* FOAMLENS_DUAL_TIMESERIES_CORE_START */');
const end=src.indexOf('/* FOAMLENS_DUAL_TIMESERIES_CORE_END */',start);
assert(start>=0&&end>start,'Real Time Series core missing');
const core=src.slice(start,end+'/* FOAMLENS_DUAL_TIMESERIES_CORE_END */'.length);
const api=new Function(core+';return {tsdUnverifiedColumn,tsdEvidenceFieldLabel,tsdSourceEvidence}')();
let count=0;
const check=(name,fn)=>{fn();count++;console.log('  ✓ '+name)};
check('Raw numeric-only imported variable is explicitly unverified',()=>{
  assert.equal(api.tsdUnverifiedColumn({canonical:'0',display:'0',original:'0',quantity:'unknown'}),'0');
  assert.equal(api.tsdEvidenceFieldLabel({canonical:'0',display:'0'},'en'),'Column 0 (unidentified)');
  assert.equal(api.tsdEvidenceFieldLabel({canonical:'0',display:'0'},'es'),'Columna 0 (sin identificar)');
  assert.equal(api.tsdEvidenceFieldLabel({canonical:'2.5'},'en'),'Column 2.5 (unidentified)');
});
check('Verified scientific or explicit source labels are never overwritten',()=>{
  for(const f of [
    {canonical:'T',display:'Temperature',quantity:'temperature'},
    {canonical:'0',display:'Temperature',quantity:'temperature'},
    {canonical:'0',original:'T'},
    {canonical:'0',quantity:'temperature'},
    {canonical:'field_0',display:'field_0'}
  ])assert.equal(api.tsdUnverifiedColumn(f),null);
  assert.equal(api.tsdEvidenceFieldLabel({canonical:'T'},'es'),null);
});
const s=(c,source,unit,dimensions,quantity,extra={})=>({
  field:{canonical:c,display:c,unit,dimensions,quantity},sourcePath:source,
  fileName:source.split('/').pop(),...extra
});
check('Known equal units/quantities/dimensions remain compatible',()=>{
  const e=api.tsdSourceEvidence([
    s('T','A/postProcessing/probes/0/T','K','[0 0 0 1 0 0 0]','temperature',{postProcessing:{fieldName:'T'}}),
    s('T','B/postProcessing/probes/0/T','K','[0 0 0 1 0 0 0]','temperature',{postProcessing:{fieldName:'T'}})
  ],'T');
  assert.equal(e.curves,2);assert.deepEqual(e.units,['K']);
  assert.deepEqual(e.sourceFields,['T']);assert.equal(e.sources.length,2);
  assert.equal(e.inconsistentUnits,false);assert.equal(e.inconsistentDimensions,false);
  assert.equal(e.unknownColumns,false);assert.equal(e.missingSource,false);
});
check('Different verified units and dimensions are warned about, not converted',()=>{
  const e=api.tsdSourceEvidence([
    s('T','first','K','[0 0 0 1 0 0 0]','temperature'),
    s('T','second','°C','[1 0 -2 0 0 0 0]','pressure')
  ],'T');
  assert.equal(e.inconsistentUnits,true);assert.equal(e.inconsistentDimensions,true);
  assert.equal(e.inconsistentQuantities,true);assert.deepEqual(e.units,['K','°C']);
});
check('Unknown unit and missing path are surfaced without inventing properties',()=>{
  const e=api.tsdSourceEvidence([{
    field:{canonical:'0',display:'0',unit:'-',quantity:'unknown'},fileName:''
  }],'0');
  assert.equal(e.unknownColumns,true);assert.equal(e.incompleteUnits,true);
  assert.equal(e.missingSource,true);assert.deepEqual(e.sources,[]);
  assert.deepEqual(e.quantities,[]);
});
check('Empty and unrelated series do not leak between scientific fields',()=>{
  const a=api.tsdSourceEvidence([s('T','test/T','K','','temperature'),
    s('U','test/U','m/s','','velocity')],'T');
  assert.equal(a.curves,1);assert.deepEqual(a.sources,['test/T']);
  assert.equal(api.tsdSourceEvidence([],'T').curves,0);
});
check('Source paths and hostile literal strings are retained as text, not parsed as HTML',()=>{
  const source='<img src=x onerror=alert(1)>/T';
  const a=api.tsdSourceEvidence([s('T',source,'K','','temperature')],'T');
  assert.deepEqual(a.sources,[source]);
  const ui=src.slice(src.indexOf('function tsdUpdateScientificEvidence(){'),src.indexOf('function tsdRefreshTimeSeriesControls(){'));
  assert(ui.includes('node.textContent=label'));
  assert(ui.includes('warning.textContent=notices.join'));
  assert(!ui.includes('innerHTML'));
});
check('Real UI keeps source evidence updated and scoped to Time Series',()=>{
  for(const token of [
    'tsdPatchScientificLabels();tsdInjectCss()',
    'tsdUpdateSourceCatalog();tsdUpdateScientificEvidence()',
    "primary.dataset.showAll==='1'",
    "panel.id='tsdScientificEvidence'",
    "document.createElement('details')",
    "panel.open=wasOpen||warnings.length>0",
    "localizedFieldName.__tsdEvidencePatched=true"
  ])assert(src.includes(token),'Missing production integration: '+token);
});
check('Provenance labels override chart titles only in Time Series',()=>{
  const begin=src.indexOf('function tsdPatchScientificLabels(){'),
    stop=src.indexOf('function tsdUpdateScientificEvidence(){',begin);
  assert(begin>0&&stop>begin);
  const snippet=[
    "let currentDataView='timeseries';",
    "let localizedFieldName=(field)=>field.display;",
    "const tsdUi=(en,es)=>'en';",
    src.slice(begin,stop),
    "tsdPatchScientificLabels();const once=localizedFieldName;",
    "tsdPatchScientificLabels();",
    "if(localizedFieldName!==once)throw Error('double-patched');",
    "const timeseries=localizedFieldName({canonical:'0',display:'0'});",
    "const physical=localizedFieldName({canonical:'T',display:'Temperature'});",
    "currentDataView='profile';",
    "const profile=localizedFieldName({canonical:'0',display:'0'});",
    "return{timeseries,physical,profile};"
  ].join('\n');
  const fn=new Function(core+snippet);
  assert.deepEqual(fn(),{
    timeseries:'Column 0 (unidentified)',physical:'Temperature',profile:'0'
  });
});

check('Actual provenance DOM refresh follows case and field filters and removes stale panels',()=>{
  const start=src.indexOf('function tsdUpdateScientificEvidence(){'),
    end=src.indexOf('function tsdRefreshTimeSeriesControls(){',start);
  assert(start>0&&end>start);
  const nodes={};
  class El{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.value='';this.open=false}
    appendChild(child){this.children.push(child);return child}
    replaceChildren(){this.children=[]}
    insertAdjacentElement(place,child){nodes[child.id]=child}
    remove(){delete nodes[this.id]}
  }
  nodes.timeSeriesFilterHint=new El('div');
  nodes.timeSeriesVariable=new El('select');
  nodes.timeSeriesVariable2=new El('select');
  nodes.timeSeriesVariable.value='T';
  const document={
    getElementById:id=>nodes[id]||null,
    createElement:tag=>new El(tag)
  };
  let selectedCase=null;
  let rows=[
    {...s('T','metal/probes/T','K','[0 0 0 1 0 0 0]','temperature'),caseId:1},
    {...s('T','mold/probes/T','°C','[0 0 0 1 0 0 0]','temperature'),caseId:2},
    {...s('0','<img src=x onerror=alert(1)>','-','','unknown'),caseId:1}
  ];
  const run=new Function('document','timeSeriesOptionsBase','tsdMatchesFilters',
    'tsdUi','tsdSourceEvidence',
    src.slice(start,end)+';return tsdUpdateScientificEvidence')(
    document,()=>rows,
    row=>row.field.canonical===nodes.timeSeriesVariable.value&&
      (!selectedCase||row.caseId===selectedCase),
    (en)=>en,api.tsdSourceEvidence);
  run();
  let panel=nodes.tsdScientificEvidence;
  assert(panel&&panel.open,'Incompatible selected cases must expand the evidence panel');
  assert(panel.children[1].children.some(child=>child.tag==='p'),
    'Mixed known units must produce a warning');
  selectedCase=1;run();
  panel=nodes.tsdScientificEvidence;
  assert(panel,'Selected case must preserve evidence');
  assert.equal(panel.children[1].children.some(child=>child.tag==='p'),false,
    'A filtered-out second case must not cause a false units warning');
  nodes.timeSeriesVariable.value='0';run();
  panel=nodes.tsdScientificEvidence;
  assert(panel.children[1].children.some(child=>child.tag==='p'),
    'An unverified numeric field must warn the user');
  const sourceText=panel.children[1].children.map(child=>child.textContent||'').join('\n');
  assert(sourceText.includes('<img src=x onerror=alert(1)>'),
    'Literal untrusted source metadata must remain text');
  nodes.timeSeriesVariable.dataset.showAll='1';run();
  assert.equal(nodes.tsdScientificEvidence,undefined,
    'Source details must disappear when all-variable mode is selected');
  delete nodes.timeSeriesVariable.dataset.showAll;rows=[];run();
  assert.equal(nodes.tsdScientificEvidence,undefined,
    'Empty data must not leave stale source warnings');
});
check('G54 derived history preserves case/region/counts without inventing original file paths',()=>{
  const row=s('T','derived:CASE-A|metal|T','K','[0 0 0 1 0 0 0]','field3d_T_value_mean',{
    caseId:'CASE-A',caseName:'Iron metal',
    fieldHistoryEvidence:{
      schema:'foamlens/field-history-evidence/1',caseId:'CASE-A',caseName:'Iron metal',
      region:'metal',field:'T',component:'value',sourceKind:'global',
      statistic:'mean',dimensions:'[0 0 0 1 0 0 0]',verifiedDimensions:true,
      originalTimeCount:3,finiteSampleCount:2,omittedTimeCount:1,
      aggregation:'arithmetic-unweighted'
    }
  });
  const e=api.tsdSourceEvidence([row],'T');
  assert.equal(e.curves,1);assert.deepEqual(e.sources,[]);
  assert.equal(e.missingSource,true,'derived key is not an original on-disk file');
  assert.equal(e.histories.length,1);assert.equal(e.histories[0].caseId,'CASE-A');
  assert.equal(e.histories[0].region,'metal');
  assert.equal(e.histories[0].finiteSampleCount,2);
  assert.equal(e.incompleteHistories,true);
  assert.equal(e.unverifiedHistoryDimensions,false);
  assert(src.includes("tsdUi('unweighted arithmetic mean','media aritmética sin ponderación')"),
    'scientifically unweighted source statistics must be visible in both languages');
});

console.log('PASS: '+count+' FoamLens Time Series provenance and identity tests');
