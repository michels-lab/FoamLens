'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {SCHEMA,TYPES,FINGERPRINT,category,inventory,capture,compare,uiReport,parseFlags,inRoot}=require('../benchmark-real-case.cjs');
const {compareReports}=require('../compare-import-performance.cjs');
const fixtureUi=(overrides={})=>({
 schema:'foamlens-scientific-import-performance-v1',version:'test-ui-1',mode:'indexed-fast',
 fileCount:3008,caseCount:1,loadedSeries:12,sourceBytesKnown:null,
 sourceKindCounts:{timeseries:0,profile:0,log:0,runlog:0,field:3008,ignore:0,unknown:0},
 firstInteractiveMs:184800,totalParseAndMetadataMs:110000,finalizeMs:40000,
 fullAuditMs:null,stageMs:{derivedSeries:3000,selectors:1500,dataViews:700,
 firstVisibleWorkspace:2000,diagnostics:null,audit:null},...overrides
});
(async()=>{
 const temp=await fs.promises.mkdtemp(path.join(os.tmpdir(),'FoamLens-private-benchmark-test-'));
 const root=path.join(temp,'SENSITIVE_DONOT_EXPORT_ROOT'),out1=path.join(temp,'pass1.json'),out2=path.join(temp,'pass2.json');
 try{
  assert.equal(SCHEMA,'foamlens-real-case-benchmark-v1');
  assert.deepEqual(TYPES,['polyMesh','postProcessing','dictionary','time-field','other']);
  assert.equal(FINGERPRINT,'FoamLens-case-tree-sha256-v2');
  assert.equal(category('constant/polyMesh/points'),'polyMesh');
  assert.equal(category('postProcessing/probes/0/T'),'postProcessing');
  assert.equal(category('system/controlDict'),'dictionary');
  assert.equal(category('0.25/metal/T'),'time-field');
  assert.equal(category('constant/random.txt'),'other');
  // A nested numeric folder is not an original OpenFOAM physical time.
  for(const name of ['constant/2026/table','logs/2026/temperature',
    'processorNote/0.5/T','system/12/something','misc/12/T','1e999/T'])
    assert.notEqual(category(name),'time-field','Nonphysical path became time data: '+name);
  for(const name of ['-1.5/metal/T','1e-3/mold/T','processor12/0.025/T',
    'processor2/-2.5/metal/T','0.00001/U'])
    assert.equal(category(name),'time-field','Valid original time folder missing: '+name);
  assert(inRoot(root,path.join(root,'result.json')));
  assert(!inRoot(root,path.join(temp,'result.json')));
  assert.throws(()=>parseFlags(['--mystery','bad']),/Only/);
  assert.throws(()=>parseFlags(['--label','first','--label','repeat']),/Duplicate|Only/);
  assert.throws(()=>uiReport({schema:'wrong'}),/Expected an exported/);
  await fs.promises.mkdir(root,{recursive:true});
  // Adversarial output path: lexical path is outside the source tree, but a
  // junction/symlink resolves back INTO the original OpenFOAM case.
  // Old code wrote pass.json into the case, violating read-only science.
  const alias=path.join(temp,'SYMLINKED_OUTPUT_TO_CASE');
  await fs.promises.symlink(root,alias,process.platform==='win32'?'junction':'dir');
  const aliasOut=path.join(alias,'benchmark.json');
  assert(!inRoot(root,aliasOut),'Make sure this reproduces the original lexical bypass');
  await assert.rejects(()=>capture(root,aliasOut,{label:'first'}),
    e=>e?.code==='OUTPUT_INSIDE_SOURCE','Aliased output directory cannot modify source');
  assert.equal(fs.existsSync(path.join(root,'benchmark.json')),false);
  const missingSubdir=path.join(alias,'new-subdir','report.json');
  await assert.rejects(()=>capture(root,missingSubdir,{label:'first'}),
    e=>e?.code==='OUTPUT_INSIDE_SOURCE','Nested missing alias output must be blocked BEFORE mkdir');
  assert.equal(fs.existsSync(path.join(root,'new-subdir')),false,
    'Failed validation must not create even an empty directory inside original case');
  // Synthetic test-only fixture. No private user OpenFOAM data is collected by CI.
  const dirs=['0','0.25','0.5','1.0','postProcessing/probes/0','system','constant/polyMesh'];
  // This empty physical-time folder is a meaningful source directory even
  // though no field file is present. Changing its name must alter the digest.
  await fs.promises.mkdir(path.join(root,'3.5'),{recursive:true});
  for(const d of dirs)await fs.promises.mkdir(path.join(root,d),{recursive:true});
  const names=[];
  for(let i=0;i<3008;i++){
   const dir=dirs[i%dirs.length],name='SECRET_SENSOR_FIELD_'+String(i).padStart(5,'0');
   const rel=path.join(dir,name),full=path.join(root,rel);
   await fs.promises.writeFile(full,'PRIVATE_SCIENTIFIC_VALUE_' +i+'\n');
   names.push(rel)
  }
  const inv=await inventory(root);
  assert.equal(inv.files.length,3008);assert.equal(inv.byType.polyMesh>0,true);
  assert.equal(inv.byType.postProcessing>0,true);assert.equal(inv.byType['time-field']>0,true);
  assert.equal(Object.values(inv.byType).reduce((n,x)=>n+x,0),3008);
  const one=await capture(root,out1,{label:'first',ui:fixtureUi()});
  const two=await capture(root,out2,{label:'repeat',ui:fixtureUi({firstInteractiveMs:86000})});
  assert.equal(one.schema,SCHEMA);
  assert.equal(one.dataset.fingerprintAlgorithm,FINGERPRINT);
  assert.equal(one.dataset.directoryCount,two.dataset.directoryCount);
  assert.equal(one.dataset.fileCount,3008);assert(one.dataset.sourceBytes>3008);
  assert.match(one.dataset.manifestSHA256,/^[a-f0-9]{64}$/);
  assert.equal(one.dataset.manifestSHA256,two.dataset.manifestSHA256);
  assert.equal(one.ui.firstInteractiveMs,184800);
  assert.equal(two.ui.firstInteractiveMs,86000);
  assert.equal(one.ui.fullAuditMs,null,'No actual completed solver audit cannot become zero');
  assert.equal(one.evidence.confirmedColdCache,false);
  assert.equal(one.evidence.applicationImportedByBenchmark,false);
  const raw=await fs.promises.readFile(out1,'utf8');
  for(const forbidden of ['SENSITIVE_DONOT_EXPORT_ROOT','SECRET_SENSOR_FIELD','PRIVATE_SCIENTIFIC_VALUE',root,temp,'case-file-name'])
   assert(!raw.includes(forbidden),'A sensitive path, filename or scientific value leaked: '+forbidden);
  const compared=compare(one,two);
  assert.equal(compared.dataset.identityVerifiedAcrossPasses,true);
  assert.equal(compared.dataset.fingerprintAlgorithm,FINGERPRINT);
  assert.equal(compared.osColdCacheVerified,false);
  assert.equal(compared.uiDatasetBindingVerified,false);
  assert.equal(compared.uiImportMetrics.metrics.firstInteractiveMs.deltaMs,98800);
  assert.equal(compared.uiImportMetrics.metrics.fullAuditMs,null);
  for(const k of ['enumeration','fullReadAndHash','total'])
   assert(Number.isFinite(compared.sourceIOMetrics[k].firstMs));
  const onlySource=compare({...one,ui:null},{...two,ui:null});
  assert.equal(onlySource.uiImportMetrics,null);
  assert.throws(()=>compare(two,one),/first\/repeat/);
  assert.throws(()=>compare(one,{...two,dataset:{...two.dataset,manifestSHA256:'a'.repeat(64)}}),/identity differs/i);
  assert.throws(()=>compare(one,{...two,dataset:{...two.dataset,fileCount:3009}}),/identity differs/i);
  assert.throws(()=>compare(one,{...two,ui:{...two.ui,version:'different-ui'}}),/not comparable/);
  const legacy={...two,dataset:{...two.dataset,fingerprintAlgorithm:'FoamLens-case-tree-sha256-v1'}};
  assert.throws(()=>compare(one,legacy),/identity differs/i,
    'Legacy file-only fingerprint must not masquerade as full tree identity');
  // Same files, same bytes, same number of directories: only a physically
  // meaningful EMPTY time-folder name changes. Old digest missed this.
  await fs.promises.rename(path.join(root,'3.5'),path.join(root,'6.25'));
  const renamed=await capture(root,path.join(temp,'renamed-empty-time.json'),{label:'repeat'});
  assert.equal(renamed.dataset.fileCount,one.dataset.fileCount);
  assert.equal(renamed.dataset.directoryCount,one.dataset.directoryCount);
  assert.equal(renamed.dataset.sourceBytes,one.dataset.sourceBytes);
  assert.deepEqual(renamed.dataset.byType,one.dataset.byType);
  assert.notEqual(renamed.dataset.manifestSHA256,one.dataset.manifestSHA256,
    'Renamed empty physical-time directory MUST change source identity');
  assert.throws(()=>compare(one,renamed),/identity differs/i,
    'Identical file contents cannot hide changed physical-time folder names');
  const renamedJSON=await fs.promises.readFile(path.join(temp,'renamed-empty-time.json'),'utf8');
  assert(!renamedJSON.includes('6.25')&&!renamedJSON.includes('3.5')&&!renamedJSON.includes(root),
    'Benchmark must not export individual physical-time folder names');
  await assert.rejects(()=>capture(root,path.join(root,'benchmark.json'),{label:'first'}),/cannot be written/);
  await assert.rejects(()=>capture(root,path.join(temp,'invalid.json'),{label:'warm'}),/first or repeat/);
  const canceled=new AbortController();canceled.abort();
  await assert.rejects(()=>capture(root,path.join(temp,'canceled.json'),{label:'first',signal:canceled.signal}),/cancelled/);
  assert.equal(fs.existsSync(path.join(temp,'canceled.json')),false,'No partial report for cancellation');
  // Changing a source file, even with identical file length, changes the verified fingerprint.
  const firstFile=path.join(root,names[3]),original=await fs.promises.readFile(firstFile,'utf8');
  await fs.promises.writeFile(firstFile,original.replace('PRIVATE_','PR1VATE_'));
  const changed=await capture(root,path.join(temp,'modified.json'),{label:'repeat'});
  assert.notEqual(changed.dataset.manifestSHA256,one.dataset.manifestSHA256);
  assert.throws(()=>compare(one,changed),/identity differs/i);
  assert.equal(changed.ui,null,'No fake UI import metrics when not attached');
  // 10k-directory inventory is metadata-only coverage; no timing/speedup claims.
  const tenKRoot=path.join(temp,'TEN_THOUSAND_SYNTHETIC');
  await fs.promises.mkdir(tenKRoot);
  for(let i=0;i<10000;i++)await fs.promises.writeFile(path.join(tenKRoot,'f'+i),'x');
  const large=await inventory(tenKRoot);
  assert.equal(large.files.length,10000);
  assert.equal(large.total,10000);
  console.log('Granada #117 PASS: 3,008-file SHA full-tree identity incl renamed empty physical-time dirs, privacy, strict timestamps, cancellation, changed bytes and 10,000-file inventory (SYNTHETIC ONLY).')
 }finally{await fs.promises.rm(temp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
