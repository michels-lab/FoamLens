'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-dual-timeseries.js'),'utf8');
new Function(source);
const begin=source.indexOf('// Existing curves and available 3D OpenFOAM fields');
const end=source.indexOf('function tsdRefreshTimeSeriesControls(){',begin);
assert(begin>0&&end>begin,'Real source field catalog controller missing');
const cases=[{id:'same',name:'Experimental case'},{id:'other',name:'Other simulation'}];
let costlyFrameReads=0;
const groups=(c,region)=>c.id==='same'&&region==='metal'?
  [{name:'T',kind:'scalar',times:[0,.2,.5]},{name:'U',kind:'vector',times:[0,.3]},{name:'dictionary',kind:'object',times:[0]}]:
  c.id==='same'&&region==='mold'?[{name:'T',kind:'scalar',times:[0,.2]}]:
  [{name:'alpha',kind:'scalar',times:[0,1]}];
const catalog=new Function('fwFieldTsReadyCases','fvReadyRegions','fvFieldGroups','document','timeSeriesOptionsBase','tsdUi','console',
  source.slice(begin,end)+';return{tsdSourceFieldCatalog,tsdUpdateSourceCatalog};')(
  ()=>cases,c=>c.id==='same'?['metal','mold']:[''],groups,
  {getElementById:()=>null},()=>[],(en)=>en,console
);
const list=catalog.tsdSourceFieldCatalog();
assert.deepStrictEqual(list.map(x=>x.name),['T','U','T','alpha'],
  'Each real field, case and region must remain separately discoverable');
assert.deepStrictEqual(list[1].components,['x','y','z','magnitude']);
assert.strictEqual(list[0].timeCount,3);
assert.strictEqual(costlyFrameReads,0,'Catalog must not parse time-dependent field frames');
for(const fragment of [
  "panel.classList.toggle('hidden',!tsdShouldShowPanel(false))","No generated curves yet",
  "tsdUpdateSourceCatalog();tsdUpdateScientificEvidence();return","details.open=true",
  "fwRefreshFieldTsControls()","Existing measured time-series",
  "OpenFOAM 3D fields available for explicit history generation",
  "No measured time-series has been imported or built",
  "timeSeriesOptionsBase()"
])assert(source.includes(fragment),'Broken visible Time Series UX contract: '+fragment);

const warnings=[],partialLogs={error:(...args)=>warnings.push(args)};
const errorRegion=(c,region)=>{
  if(c.id==='same'&&region==='mold')throw new Error('Unavailable mold field metadata');
  return groups(c,region)
};
const partialCatalog=new Function('fwFieldTsReadyCases','fvReadyRegions','fvFieldGroups','document','timeSeriesOptionsBase','tsdUi','console',
  source.slice(begin,end)+';return{tsdSourceFieldCatalog,tsdUpdateSourceCatalog};')(
  ()=>cases,c=>c.id==='same'?['metal','mold']:[''],
  errorRegion,{getElementById:()=>null},()=>[],en=>en,partialLogs
);
const partial=partialCatalog.tsdSourceFieldCatalog();
assert.deepStrictEqual(partial.map(x=>[x.caseId,x.region,x.name]),[
  ['same','metal','T'],['same','metal','U'],['other','','alpha']
],'A broken mold inventory must not hide metal fields or the other case');
assert.deepStrictEqual(partialCatalog.tsdSourceFieldCatalog.issues,[
  {caseId:'same',region:'mold',stage:'fields'}
]);
assert.strictEqual(warnings.length,1,'Metadata error must be logged without guessing field names');
const partialStatus={textContent:'',setAttribute:()=>{}};
const nodes={tsdSourceFieldCount:partialStatus,fwDataFieldHistories:{open:true},
  gr176HistoryCard:{},timeSeriesControls:{querySelector:()=>null}};
let partialRefreshCount=0;
const realStatus=new Function('fwFieldTsReadyCases','fvReadyRegions','fvFieldGroups','document','timeSeriesOptionsBase','tsdUi','fwRefreshFieldTsControls','console',
  source.slice(begin,end)+';return{tsdSourceFieldCatalog,tsdUpdateSourceCatalog};')(
  ()=>cases,c=>c.id==='same'?['metal','mold']:[''],errorRegion,
  {getElementById:id=>nodes[id]||null},()=>[{field:{canonical:'T'}}],en=>en,
  ()=>{partialRefreshCount++},partialLogs
);
realStatus.tsdUpdateSourceCatalog();
assert.match(partialStatus.textContent,/Partial catalog: 1 case\/region source/);
assert.match(partialStatus.textContent,/available fields remain selectable/);
assert.strictEqual(partialRefreshCount,1,'Valid field sources still refresh the builder with existing imported curves');
assert.strictEqual(costlyFrameReads,0,'Source inventory must not read original time-dependent frames');

console.log('Time Series field source catalog PASS: 4 available real case/region fields, vector components, visible generation with zero existing curves.');
