'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const slice=(a,b)=>{const x=source.indexOf(a),y=source.indexOf(b,x+a.length);assert(x>=0&&y>x,'Missing production source block: '+a);return source.slice(x,y)};
const core=slice('/* FOAMLENS_DUAL_PROFILE_CORE_START */','/* FOAMLENS_DUAL_PROFILE_CORE_END */');
const api=new Function(core+';return {profileVariableSet,profileMatchesVariable,profileAxisPlan}')();
assert.deepStrictEqual(api.profileVariableSet('T','alpha1'),['T','alpha1']);
assert.deepStrictEqual(api.profileVariableSet('T','T'),['T']);
assert.deepStrictEqual(api.profileVariableSet('T',''),['T']);
assert.equal(api.profileMatchesVariable('T','T','alpha1'),true);
assert.equal(api.profileMatchesVariable('alpha1','T','alpha1'),true);
assert.equal(api.profileMatchesVariable('phaseChangeSource:alpha1','T','alpha1'),false);
assert.equal(api.profileMatchesVariable('alpha1','T',''),false);
const T={canonical:'T',quantity:'temperature',unit:'K'},alpha={canonical:'alpha1',quantity:'liquid_fraction',unit:'-'};
assert.deepStrictEqual(api.profileAxisPlan(T,alpha),{primary:'left',secondary:'right',separate:true});
assert.deepStrictEqual(api.profileAxisPlan(alpha,T),{primary:'left',secondary:'right',separate:true});
assert.deepStrictEqual(api.profileAxisPlan(T,{...T}),{primary:'left',secondary:'left',separate:false});

// Exercise actual production selection predicate, including existing case,
// region, line, set and exact physical-time filters. No second case picker.
const selected={profileSet:'setA',profileVariable:'T',profileVariable2:'alpha1',profileLine:'y=10mm',profileTime:'2',compareHeights:false};
const $=id=>({value:selected[id]??'',checked:!!selected[id]});
const predicate=new Function('$','datasetTypeOf','profileTimeEqual','profileMatchesVariable',
  slice('function profileMatchesSelection(s){','function seriesInCurrentView(s){')+';return profileMatchesSelection')(
  $,s=>s.datasetType,(a,b)=>Number(a)===Number(b),api.profileMatchesVariable);
const row=(canonical,caseId,line='y=10mm',time=2)=>({datasetType:'profile',caseId,field:{canonical},profileOutputPath:'setA',profileLineKey:line,profileTime:time,visible:true});
assert.equal(predicate(row('T',10)),true);
assert.equal(predicate(row('alpha1',10)),true);
assert.equal(predicate(row('T',20)),true);
assert.equal(predicate(row('alpha1',20)),true);
assert.equal(predicate(row('U_x',10)),false);
assert.equal(predicate(row('alpha1',10,'y=20mm')),false);
assert.equal(predicate(row('alpha1',10,'y=10mm',3)),false);
selected.profileVariable2='';
assert.equal(predicate(row('alpha1',10)),false);
selected.profileVariable2='alpha1';

// Exact production playback selection includes the same visible cases but
// cannot invent a missing second-variable frame.
const cases=[row('T',10),row('alpha1',10),row('T',20),row('alpha1',20),row('pressure',20),row('alpha1',30)];
const datasetContext={
  $:id=>({value:selected[id]??'',checked:!!selected[id]}),
  profileOptionsBase:()=>cases,
  profileMatchesVariable:api.profileMatchesVariable,
  isCaseVisible:id=>id!==30,
  seriesFamilyVisible:()=>true,
  Number
};
const getPlayback=new Function(...Object.keys(datasetContext),slice('function profilePlaybackSeries(){','function profilePlaybackGroupKey(s){')+';return profilePlaybackSeries')(...Object.values(datasetContext));
const values=getPlayback();
assert.deepStrictEqual(values.map(s=>s.field.canonical+':'+s.caseId).sort(),['T:10','T:20','alpha1:10','alpha1:20']);
const axisContext={currentDataView:'profile',profileSelectedVariables:()=>['T','alpha1'],$:id=>({value:selected[id]}),profileAxisPlan:api.profileAxisPlan};
const calcAxes=new Function(...Object.keys(axisContext),slice('function assignments(vis){','function niceTicks(')+';return assignments')(...Object.values(axisContext));
const mapped=values.map((s,i)=>({...s,id:i+1,field:s.field.canonical==='T'?T:alpha,axis:'Auto'}));
const axes=calcAxes(mapped);
assert.deepStrictEqual([...axes.values()],['left','right','left','right']);
selected.profileVariable2='';
assert(source.includes('profileVariable2')&&source.includes("id=\"profileDualHint\""));
for(const needle of [
 'profileMatchesVariable(s.field?.canonical,variable,second)',
 'profileMatchesVariable(s.field?.canonical,v,v2)',
 'profileMatchesVariable(s.field?.canonical,vSel.value,v2Sel.value)',
 'profileMatchesVariable(s.field?.canonical,vSel.value,secondary.value)',
 "profileSelectedVariables().length===2&&profilePlaybackGroups().length>1",
 "if(currentDataView==='profile'&&profilePlaybackUsesGlobalClock())return",
 "$('profileVariable2')?.value||''",
 "rymin:right?.[0],rymax:right?.[1]",
 "yr0=animationLockedRanges.rymin;yr1=animationLockedRanges.rymax",
 "$('profileVariable2').addEventListener('change'",
 "No second variable","Sin segunda variable"
])assert(source.includes(needle),'Missing integrated dual-variable profile feature: '+needle);
assert(!source.includes('const byVar=bySet.filter(s=>!vSel.value||s.field.canonical===vSel.value)'), 'Profile line/times still constrained to first variable');
console.log('Dual-variable profiles: same real cases/line/time, unit axes, and playback wiring PASS');

assert(source.includes("variable:localizedFieldName(exact.field)")&&source.includes("variable:localizedFieldName(near.field)"),
  'Both variables must be distinguishable in synchronized playback diagnostics');
assert(source.includes("shown.map(localizedFieldName).join(' + ')"),'Dual-variable figure title must name both measured fields');
assert(source.includes("if(!profilePlaybackUsesGlobalClock())"),'Single-case two-field playback must report a common time clock');
