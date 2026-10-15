'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/index.html'),'utf8');
const begin=html.indexOf('/* FOAMLENS_DATA_LOADED_CASE_COMPARISON_START */');
const end=html.indexOf('/* FOAMLENS_DATA_LOADED_CASE_COMPARISON_END */',begin);
assert(begin>0&&end>begin,'Execute real production case comparison functions');
const selectorStart=html.indexOf('function seriesMatchesGlobalContext(s){'),selectorEnd=html.indexOf('function refreshGlobalContext()',selectorStart);
assert(selectorStart>0&&selectorEnd>selectorStart,'Execute actual global case selector contract');
const source=html.slice(begin,end)+html.slice(selectorStart,selectorEnd);
const cases=[{id:10,name:'case Alpha',visible:true},{id:20,name:'case Beta',visible:true},
{id:30,name:'case Gamma',visible:true},{id:40,name:'logs only',visible:true},{id:50,name:'indexed profiles',visible:true}];
const series=[
{caseId:10,datasetType:'profile',profileTime:1,field:{canonical:'T'}},
{caseId:20,datasetType:'profile',profileTime:2,field:{canonical:'T'}},
{caseId:10,datasetType:'timeseries'},
{caseId:20,datasetType:'timeseries'},
{caseId:30,datasetType:'timeseries'},
{caseId:40,datasetType:'log'}
];
const indexed=new Map([[50,12]]);
const el={};const $=id=>el[id]||(el[id]={textContent:'',innerHTML:'',disabled:false,dataset:{},open:true,
 classList:{state:new Map(),toggle(k,v){this.state.set(k,v)}},value:''});
const modules=new Function('cases','series','pendingLazyProfileCount','datasetTypeOf','$','flUi','esc',
 'stopAllPlayback','refreshGlobalContext','resetProfilePlaybackState','clearProfilePlaybackFrameCache',
 'refreshDatasetControls','renderList','updateMeta','draw','hydrateLazyProfilesForContext','profileOptionsBase','lazyProfileCountForContext',`
let activeContextCaseId=10,activeContextRegion='',currentDataView='profile';
${source}
return{state:dataCompareState,dataCompareAvailableCases,dataCompareCounts,dataCompareRefresh,dataCompareApply,dataCompareReset,
 dataCompareCaseAllowed,seriesMatchesGlobalContext,scope:()=>({activeContextCaseId,activeContextRegion,currentDataView})}`)(
cases,series,id=>indexed.get(id)||0,s=>s.datasetType,$,(a,b)=>a,
s=>String(s).replace(/[&<>"']/g,'_'),()=>{},()=>{},()=>{},()=>{},()=>{},()=>{},()=>{},()=>{},()=>false,
()=>series.filter(s=>s.datasetType==='profile'),()=>0);
const state=modules.state;
assert.equal(modules.dataCompareAvailableCases().length,5,'Show all imported cases, including time-only and logs-only');
assert.deepEqual(modules.dataCompareCounts(50),{profiles:0,indexed:12,times:0,logs:0},
 'Indexed pending profile data must remain distinct from actually parsed curves');
modules.dataCompareRefresh();
assert.equal($('dataImportMore').open,false,'Loaded Profiles must not push Add files/Add folder above cases');
assert.equal($('dataCompareExisting').classList.state.get('hidden'),false);
assert.match($('dataCompareCaseList').innerHTML,/case Alpha/);
assert.match($('dataCompareCaseList').innerHTML,/case Gamma/);
assert.match($('dataCompareCaseList').innerHTML,/logs only/);
assert.match($('dataCompareCaseList').innerHTML,/indexed profiles/);
assert.equal($('dataCompareProfiles').disabled,false,'Two measured cases allow comparison');
state.selected=new Set([10,20]);state.touched=true;
modules.dataCompareRefresh();
modules.dataCompareApply('profile');
assert.equal(modules.scope().activeContextCaseId,null,'Do not constrain multi-case charts to prior one-case toolbar selection');
assert.equal(modules.dataCompareCaseAllowed(10,'profile'),true);
assert.equal(modules.dataCompareCaseAllowed(20,'profile'),true);
assert.equal(modules.dataCompareCaseAllowed(30,'profile'),false);
assert.equal(modules.dataCompareCaseAllowed(30,'log'),true,'Data comparison must never hide solver-log/Field data');
assert.equal(modules.seriesMatchesGlobalContext({caseId:10}),true);
assert.equal(modules.seriesMatchesGlobalContext({caseId:20}),true);
assert.equal(modules.seriesMatchesGlobalContext({caseId:30}),false);
assert.equal($('profileSet').dataset.compareDefault,'1','Comparison cannot inherit an unrelated case-specific output folder');
assert.equal($('profileLine').dataset.compareDefault,'1','Keep optional line choice without excluding other cases');
modules.dataCompareReset();
assert.equal(modules.scope().activeContextCaseId,10,'Restore exact single-case choice');
assert.equal(modules.seriesMatchesGlobalContext({caseId:20}),false,'Return to single case filter after comparison');
state.selected=new Set([10,20,30]);state.touched=true;
modules.dataCompareApply('timeseries');
assert.equal(modules.scope().currentDataView,'timeseries');
assert.equal(modules.seriesMatchesGlobalContext({caseId:30}),true,'Compare actual loaded time series without reimport');
assert.equal(modules.seriesMatchesGlobalContext({caseId:40}),false);
modules.dataCompareReset();
state.selected=new Set([30,40]);state.touched=true;modules.dataCompareRefresh();
assert.equal($('dataCompareProfiles').disabled,true,'Do not fabricate spatial profile curves for time-only and log-only cases');
assert.equal($('dataCompareTimeSeries').disabled,true,'Single time-series case cannot masquerade as two-case comparison');
for(const id of ['dataCompareExisting','dataCompareCaseList','dataCompareProfiles','dataCompareTimeSeries',
'dataCompareSelectAll','dataCompareClear','dataCompareReset','dataImportMore','profileSet','profileVariable','profileTime'])
  assert(html.includes('id="'+id+'"'),'Missing accessible real DOM control: '+id);
assert.equal((html.match(/id="addFiles"/g)||[]).length,1,'Existing import handlers must retain only their original button');
assert.equal((html.match(/id="addFolder"/g)||[]).length,1);
assert(html.includes("if(!dataCompareCaseAllowed(s.caseId,currentDataView))return false"),
'Live series filter must honor checked loaded cases');
assert(html.includes("if(dataCompareState.active&&currentDataView==='profile')return"),
'Lazy profiles must be sourced from selected real cases');
assert(html.includes("flUi('All profile sets · selected cases'"),
'Cross-case comparison must not exclude second case by first-case path');
assert(html.includes("flUi('All matching profile lines'"),
'Cross-case comparison must allow equivalent source lines');
console.log('Data loaded-case comparison: direct selected-case chart filtering, existing-time-series fallback, exact missing-profile state, case restoration and no duplicate import PASS');
