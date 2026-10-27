'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-thermocouple-xyz-mapping.js'),'utf8');
new Function(source);
const p=source.indexOf('/* FOAMLENS_TC_MAPPING_CORE_START */'),q=source.indexOf('/* FOAMLENS_TC_MAPPING_CORE_END */');
assert(p>=0&&q>p,'Missing testable Thermocouple Mapping core');
const api=new Function(source.slice(p,q)+
 ';return {xyz:tcXYZ,number:tcNumber,units:tcTempUnit,region:tcRegion,family:tcFamily,pairs:tcSeriesPairs,locate:tcLocate,compare:tcCompare,sensitivity:tcSensitivity}')();
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,'Expected '+a+' ≈ '+b);
const mesh={boundsMin:[0,0,0],boundsMax:[1,1,1],cellCount:1,
  owners:[0,0,0,0,0,0],faceOffsets:[0,4,8,12,16,20,24],
  cellCenters:[.5,.5,.5]};
const contains=(_,id,xyz)=>id===0&&xyz.every(v=>v>=0&&v<=1);
const point=[.2,.3,.4],mapped=api.locate(mesh,point,contains,()=>[0]);
assert.equal(mapped.status,'contained');assert(mapped.verified);
assert.equal(mapped.cellId,0);near(mapped.centerDistanceM,Math.hypot(.3,.2,.1));
assert.equal(api.locate(mesh,[2,.2,.2],contains,()=>[0]).status,'outside-bounds');
assert.equal(api.locate(mesh,[.2,.3,.4],()=>false,()=>[0]).status,'unverified');
assert.equal(api.locate({...mesh,faceOffsets:[]},point,contains).status,'unverified');
assert.equal(api.locate({...mesh,boundsMax:[2,2,2]},[1.5,1.5,1.5],()=>false,()=>[0]).status,'unverified');
const history=(probeId,xyz,t=[0,1,2],y=[300,310,320],more={})=>{
 const k=['field3d-probe-history',31,'metal','T','value',probeId,xyz.join(',')].join('|');
 return {caseId:31,caseName:'simulation',region:'metal',fieldHistoryKey:k,
    sourcePath:'derived:'+k,field:{unit:'K',canonical:'probe:T',original:'OpenFOAM 3D field sampled at fixed XYZ',
      dimensions:'[0 0 0 1 0 0 0]'},probePoint:xyz,probe:'View 1',t,y,...more}
};
const sim=history('a',point),exp={fileName:'sensor.csv',unit:'K',timeColumn:'time_s',temperatureColumn:'T',
  t:[0,1,2],y:[299,309,319]};
const config={caseId:31,region:'metal',targetXYZ:[200,300,400],coordinateUnit:'mm',
 location:mapped,probeLocation:mapped,maxOffsetM:1e-8,timeShiftS:0,sensitivityRadiusM:.1};
const good=api.compare(sim,exp,config);assert(good.valid,good.reason);
near(good.metrics.rmse,1);near(good.metrics.mae,1);near(good.metrics.bias,1);
near(good.metrics.maxAbs,1);assert.equal(good.metrics.n,3);
assert.deepEqual(good.targetXYZm,point);
assert.equal(good.meshEvidence.cellId,0);assert.equal(good.sourceEvidence.region,'metal');
assert.equal(good.noExtrapolation,true);assert.equal(good.noAutomaticRecalescenceLabel,true);
assert.equal(good.noSpatialInterpolation,true);assert.equal(good.noCaseMutation,true);
const celsius=api.compare(history('a',point,[0,1,2],[26.85,36.85,46.85],{
 field:{unit:'C',dimensions:'[0 0 0 1 0 0 0]',original:'OpenFOAM 3D field sampled at fixed XYZ'}}),
  {...exp,y:[27.85,37.85,47.85],unit:'C'},config);
assert(celsius.valid,celsius.reason);
near(celsius.metrics.bias,-1);
const shifted=api.compare(sim,{...exp,t:[-1,0,1]}, {...config,timeShiftS:1});
assert(shifted.valid,shifted.reason);
assert.equal(shifted.commonTime.start,0);
const trimmed=api.compare(sim,{...exp,t:[-2,0,1,2,3],y:[0,299,309,319,0]},config);
assert(trimmed.valid,trimmed.reason);
assert.equal(trimmed.metrics.n,3);
const alternative=history('b',[.23,.3,.4],[0,1,2],[301,311,321]);
const sensitivity=api.sensitivity(sim,[sim,alternative],exp,{
 ...config,locateAlternative:xyz=>api.locate(mesh,xyz,contains,()=>[0])});
assert(sensitivity.valid);assert.equal(sensitivity.status,'measured-alternatives');
assert.equal(sensitivity.results.length,1);
near(sensitivity.results[0].rmseK,2);near(sensitivity.results[0].deltaRMSEK,1);
assert(sensitivity.results[0].probeSource.includes('field3d-probe-history'));
const unmatched=api.sensitivity(sim,[sim,alternative],exp,config);
assert.equal(unmatched.status,'unavailable');assert.equal(unmatched.results.length,0);
const wrongCase=history('b',[.23,.3,.4],[0,1,2],[301,311,321],{caseId:98});
assert.equal(api.sensitivity(sim,[sim,wrongCase],exp,{...config,locateAlternative:()=>mapped}).results.length,0);
// Same-failure regressions — real source identity must be internally coherent.
const wrongHistoryKey=sim.fieldHistoryKey.replace('|31|metal|','|99|mold|');
const foreignHistory={...sim,fieldHistoryKey:wrongHistoryKey,sourcePath:'derived:'+wrongHistoryKey};
assert(!api.compare(foreignHistory,exp,config).valid,'History key with another case/region cannot impersonate this OpenFOAM case');
assert(!api.compare({...sim,sourcePath:'derived:'+wrongHistoryKey},exp,config).valid,
  'Path of a different 3D probe history cannot impersonate the selected probe');
const fakeXYZKey=sim.fieldHistoryKey.replace(point.join(','),'0.3,0.3,0.4');
assert(!api.compare({...sim,fieldHistoryKey:fakeXYZKey,sourcePath:'derived:'+fakeXYZKey},exp,config).valid,
  'Probe XYZ evidence must be bound to the real original field-history identity');
const zeroKey=sim.fieldHistoryKey.replace('|31|metal|','|0|metal|');
const zeroSim={...sim,caseId:0,fieldHistoryKey:zeroKey,sourcePath:'derived:'+zeroKey};
assert(api.compare(zeroSim,exp,{...config,caseId:0}).valid,'Real verified case zero is legitimate');
for(const missing of [null,undefined,'',false,{}]){
 assert(!api.compare(zeroSim,exp,{...config,caseId:missing}).valid,
   'Missing target case cannot be silently treated as case zero: '+String(missing));
 const invalidSource={...zeroSim,caseId:missing};
 assert(!api.compare(invalidSource,exp,{...config,caseId:0}).valid,
   'Invalid source case cannot become case zero');
}
assert(source.includes('tcProbeSourceConsistent(s)'),'Source picker must reject inconsistent 3D probe history metadata');

const badCases=[
 ['cell verification',{...config,location:{status:'unverified',verified:false}}],
 ['unverified original probe',{...config,probeLocation:{status:'unverified',verified:false}}],
 ['mismatched mapping XYZ',{...config,location:{...mapped,pointM:[.5,.5,.5]}}],['wrong region',{...config,region:'mold'}],
 ['wrong case',{...config,caseId:42}],['wrong units',{...config,coordinateUnit:''}],
 ['invalid XYZ',{...config,targetXYZ:[200,'',400]}],
 ['exceeded offset',{...config,targetXYZ:[700,300,400]}],
 ['no tolerance',{...config,maxOffsetM:''}],
 ['missing shift',{...config,timeShiftS:''}]
];
for(const [name,cfg] of badCases){const result=api.compare(sim,exp,cfg);assert(!result.valid,name+' must fail');assert(!result.rows.length)}
for(const e of [
 {...exp,t:[0,1,1]}, {...exp,t:[0,2,1]}, {...exp,y:[299,null,319]},
 {...exp,t:[4,5,6]}, {...exp,unit:'F'}, {...exp,t:[0,0.1,0.2],y:[299,309,319],unit:''}
])assert(!api.compare(sim,e,config).valid,'Invalid experimental data must not be interpolated');
for(const modified of [
 {...sim,fieldHistoryKey:''},{...sim,sourcePath:'fake.csv'},
 {...sim,probePoint:null},{...sim,field:{unit:'J'}},
 {...sim,t:[0,1,1]},
 {...sim,field:{unit:'K',dimensions:'[1 2 -2 0 0 0 0]'}}
])assert(!api.compare(modified,exp,config).valid,'Invalid OpenFOAM probe source must fail');
assert.equal(api.xyz([10,20,30],'cm')[0],.1);
assert.equal(api.xyz([10,20,30],'in'),null);
assert.equal(api.number(null)!==api.number(null),true,'Null is not physical zero');
assert.equal(api.units('°C').offset,273.15);
assert.deepEqual(api.pairs([0,1,2],[0,0,0]),[[0,0],[1,0],[2,0]]);
for(const token of ["id='tcTools'","id=\"tcFile\"","id=\"tcCalculate\"","id=\"tcExportJson\"",
 "id=\"tcExportCsv\"","id=\"tcPlot\"","function tcDraw(result)","Alternative measured probe XYZ [m]","evParseTable(raw)","fvCellContainsPoint","fvNearbyCells",
 "noAutomaticRecalescenceLabel:true","window.FoamLensThermocoupleXYZ",
 "sourcePath:'derived:'+k"]) {
 if(token==="sourcePath:'derived:'+k")continue;
 assert(source.includes(token),'Missing UI/3D product contract '+token);
}
for(const fixture of ['QuickCup','B12_','C12_','metalTop'])assert(!source.includes(fixture),'Thesis fixture leaked into general product: '+fixture);
console.log('Granada #152 Thermocouple XYZ PASS: containment, Kelvin conversion, strict evidence, shifted overlap, mismatch rejection, mapped sensitivity.');
