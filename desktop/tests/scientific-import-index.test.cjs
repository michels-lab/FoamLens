'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const first=html.indexOf('function differenceSharedProbeIds(');
const scope=html.indexOf('function differenceScopeSeries(',first);
const variable=html.indexOf('function differenceVariableOptions(',scope);
const next=html.indexOf('function refreshDifferenceControls(',variable);
assert(first>=0&&scope>first&&variable>scope&&next>variable,'Production difference routine not found');
const fragment=html.slice(first,scope)+'\n'+html.slice(variable,next);
let calls=0;
const inputs=new Map([
  ['differenceCaseA',{value:'1'}],
  ['differenceCaseB',{value:'2'}],
  ['profileSet',{value:''}]
]);
const series=[];
const caseCount=2,variables=100,curveCount=3008;
for(let i=0;i<curveCount;i++){
  const caseId=i%caseCount+1,canonical='field_'+(Math.floor(i/caseCount)%variables);
  series.push({caseId,field:{canonical,display:canonical,unit:'-'},probe:Math.floor(i/variables)%2,
    datasetType:'timeseries',t:[0,1],y:[i,i+1]});
}
const ctx={
  series,currentDataView:'timeseries',
  $:id=>inputs.get(id)||{value:''},
  datasetTypeOf:s=>{calls++;return s.datasetType||'timeseries'},
  profileOptionsBase:()=>[],logOptionsBase:()=>[],
  Number,Map,Set
};
vm.createContext(ctx);
vm.runInContext(fragment+';globalThis._options=differenceVariableOptions',ctx,{timeout:1000});
const before=Date.now();
const options=ctx._options();
const ms=Date.now()-before;
assert(options.length>=40,'Synthetic shared probes must remain comparable for both cases');
assert(calls<=curveCount*3,'Variable eligibility must be linear, not scan 3,008 curves per variable');
assert(ms<1500,'Indexed two-case shared-variable lookup must complete rapidly at 3,008 curves');
const names=new Set(options.map(x=>x.canonical));
assert(names.has('field_0'),'Scientific field identity must remain unchanged');
assert(html.includes('allCaseFileRows.slice(0,shownFileCount)'),
  'Case manager must render a bounded number of file rows initially');
assert(html.includes("flCaseFileRowLimits.get(c.id)||80"),
  'Long file lists must default to 80 visible rows');
assert(html.includes('data-role="case-files-all"')&&html.includes('flCaseFileRowLimits.set(c.id,allCaseFileRows.length)'),
  'All individual files must remain accessible on explicit request');
assert(html.includes("if(currentDataView==='profile')renderPhaseFront()"),
  'Phase front analysis must be activated when the user selects spatial profiles');
console.log('FoamLENS 2D 3,008-series indexing PASS: '+options.length+
  ' scientific fields, '+calls+' classification visits, '+ms+
  ' ms; paginated case file rows preserve full access.');
