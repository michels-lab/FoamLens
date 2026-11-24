'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(root,'v24-scientific-case-health.js'),'utf8');
new Function(source);
const start=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_START */'),
  end=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_END */',start);
assert(start>=0&&end>start,'Original Scientific Case Health module must supply source-owned parser');
const api=new Function(source.slice(start,end)+';return {csv:chPostRunCsv,audit:chAudit}')();
const passed=[];
const test=(name,fn)=>{fn();passed.push(name)};
const aCsv='time_s,metal_volume_m3,mold_volume_m3,metal_T_volMean_K,mold_T_volMean_K,metal_alpha1_volMean\n'+
  '0,0.00004794,0.00010289,1500,300,1\n'+
  '0.1,0.00004794,0.00010289,1480,301,0.999\n'+
  '0.2,0.00004794,0.00010289,1460,302,0.95\n';
const bCsv='time_s,metal_T_min_K,metal_T_mean_K,metal_T_max_K,alpha1_min,alpha1_mean,alpha1_max,alpha1_below_0_999_cells\n'+
  '0,1499,1500,1501,1,1,1,0\n'+
  '0.1,1470,1480,1490,0.99,0.995,1,3\n'+
  '0.2,1430,1440,1450,0.70,0.80,0.90,300\n';
test('original C3D04-style A reduction reads all columns and saved times without CFD',()=>{
  const data=api.csv(aCsv,'native_A.csv');
  assert.equal(data.schema,'foamlens/native-postrun-csv-evidence/1');
  assert.equal(data.samples,3);
  assert.deepEqual([data.firstTime_s,data.lastTime_s,data.minSavedInterval_s,data.maxSavedInterval_s],
    [0,0.2,0.1,0.1]);
  assert.equal(data.columns.find(x=>x.name==='metal_alpha1_volMean').min,0.95);
  assert.deepEqual(data.headers,['time_s','metal_volume_m3','mold_volume_m3',
    'metal_T_volMean_K','mold_T_volMean_K','metal_alpha1_volMean']);
  assert.equal(data.physicalModelValidated,false);
  assert.equal(data.originalSamplesRevalidated,false);
  assert.equal(data.originalCaseBindingVerified,false);
});
test('original C3D05-style B reduction does not fabricate onset, conservation or physics',()=>{
  const data=api.csv(bCsv,'native_B.csv');
  assert.equal(data.samples,3);
  assert.equal(data.columns.find(x=>x.name==='alpha1_below_0_999_cells').max,300);
  assert.equal(data.columns.find(x=>x.name==='alpha1_min').min,.7);
  assert.equal(data.headers.length,8);
  assert(!('firstSolidificationTime_s' in data),'Do not infer onset from arbitrary summary names');
  assert(!('energyConserved' in data));
});
test('quoting, line endings and scientific decimal notation remain supported',()=>{
  const csv='time_s,"metal.T_mean_K"\r\n0,1.500e3\r\n0.1,1.4e3\r\n';
  const data=api.csv(csv,'quoted.csv');
  assert.equal(data.columns[1].name,'metal.T_mean_K');
  assert.equal(data.columns[1].max,1500);
});
test('non-OpenFOAM numeric labels and incomplete original samples must fail closed',()=>{
  const bad=[
    'time_s,T\n0,1500\n0.1,',
    'time_s,T\n0,1500\n0,1400',
    'time_s,T\n0,1500\n-0.1,1400',
    'time_s,T\n0,1500\n0.1,0x1',
    'time_s,T\n0,1500\n0.1,NaN',
    'time_s,T\n0,1500\n0.1,Infinity',
    'time_s,T\n0,1500\n0.1,1e309',
    'time_s,T\n0,1500\n0.1',
    'time_s,T\n0,1500\n0.1,1400,extra',
    'T,times\n1500,0\n1400,0.1',
    'time_s,T,T\n0,1500,1500\n0.1,1400,1400',
    'time_s,T\n0,1500\n0.1,"1400',
    'time_s,T\n0,1500\n\n0.1,1400',
    'time_s,T\n0,1500\n0.1,=SUM(1,2)',
    'time_s,T\n0,1500\n0.1,1_000'
  ];
  for(const csv of bad)assert.throws(()=>api.csv(csv,'bad.csv'),Error,
    'Unverified source CSV must not result in valid physical timeline: '+csv.slice(0,45));
});
test('the source parser never truncates an over-limit native time history',()=>{
  const rows=['time_s,T'];
  for(let i=0;i<10001;i++)rows.push((i/10)+','+(1500-i/10));
  assert.throws(()=>api.csv(rows.join('\n'),'oversized.csv'),/10000/);
});
test('scientific health records a manually attributed reduction only as a warning',()=>{
  const selected={id:12,name:'Imported case',config:{},discoveryModel:{
    fields:[],dictionaries:[],regions:['metal','mold'],timeDirectories:[0,.1,.2],postProcessing:[]},
    discovery:{regions:['metal','mold']}};
  const parsed=api.csv(aCsv,'original_A.csv');
  const sourceChecks=api.audit({case:selected,logs:[]});
  const audit=api.audit({case:selected,logs:[],postrun:parsed});
  assert.equal(sourceChecks.checks.some(c=>c.id==='native-postrun'),false);
  const info=audit.checks.find(c=>c.id==='native-postrun');
  assert.equal(info.status,'warning');
  assert.match(info.details,/not bound to original frames/);
  assert.deepEqual(info.evidence,['original_A.csv']);
  assert.equal(audit.overall,'not-certified');
});
test('real panel and export preserve source identity and case invalidation',()=>{
  for(const token of ["id=\"chPostrunFile\"",
    "for(const [id,key,bytes] of [['chRuntimeFile'",
    "['chPostrunFile','postrun',4*1024*1024]",
    "postrun:chPostrun","r.postrunEvidence=chPostrun",
    "chPostrun!==chBound.postrun",
    "chPostrun=null",
    "chPostrun=data?chPostRunCsv(data.text,data.file):null",
    "chPostrun.columns.filter(col=>col.name!=='time_s')",
    "physicalModelValidated:false,originalCaseBindingVerified:false"
  ])assert(source.includes(token),'Required original native source/UX wiring missing: '+token);
  assert(!source.includes('XMLHttpRequest')&&!source.includes('fetch('),
    'Original CSV must remain a read-only local asset, not network uploaded');
});
console.log('FoamLens MasterProject-native generic postrun CSV suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
