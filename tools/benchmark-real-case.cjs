'use strict';
/* Operación Granada #117: real-case read-only fingerprint + source I/O measurement.
   UI import performance remains separately measured by FoamLens UI export.
   No private file path, file content or per-file hash is written in reports. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {normalize,compareReports}=require('./compare-import-performance.cjs');
const SCHEMA='foamlens-real-case-benchmark-v1';
const TYPES=['polyMesh','postProcessing','dictionary','time-field','other'];
const round=n=>Math.round(n*1000)/1000;
const err=(code,message)=>Object.assign(new Error(message),{code});
function category(name){
  const a=name.replace(/\\/g,'/').split('/'),last=a.at(-1);
  if(a.includes('polyMesh'))return'polyMesh';
  if(a.includes('postProcessing'))return'postProcessing';
  if(a.includes('system')||(a.includes('constant')&&/^(thermophysicalProperties|transportProperties|turbulenceProperties|fvOptions|fvModels)$/.test(last)))return'dictionary';
  if(a.some(x=>/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(x)))return'time-field';
  return'other'
}
async function inventory(root,signal){
  const start=performance.now(),files=[],stack=[''];let directories=0;
  while(stack.length){
    if(signal?.aborted)throw err('CANCELLED','Capture cancelled, no partial report saved.');
    const dir=stack.pop();directories++;
    const entries=await fs.promises.readdir(path.join(root,dir),{withFileTypes:true});
    entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    for(const entry of entries){
      const relative=path.join(dir,entry.name),full=path.join(root,relative);
      if(entry.isSymbolicLink())throw err('SYMLINK','Found source symbolic link; fingerprint is not complete.');
      if(entry.isDirectory()){stack.push(relative);continue}
      if(!entry.isFile())throw err('UNSUPPORTED_ENTRY','Found nonregular source entry; fingerprint is not complete.');
      const st=await fs.promises.lstat(full);
      if(!st.isFile()||!Number.isSafeInteger(st.size))throw err('SOURCE_CHANGED','Source changed during enumeration.');
      files.push({full,relative:relative.replace(/\\/g,'/'),bytes:st.size,mtime:st.mtimeMs,type:category(relative)});
      if(files.length>250000)throw err('TOO_LARGE','More than 250,000 files; refusing incomplete sample.');
    }
  }
  files.sort((a,b)=>a.relative<b.relative?-1:a.relative>b.relative?1:0);
  const total=files.reduce((n,x)=>n+x.bytes,0);
  if(!Number.isSafeInteger(total)||!files.length)throw err('INVALID_SOURCE','Source byte count is unsafe or no files found.');
  return{files,directories,total,byType:Object.fromEntries(TYPES.map(k=>[k,files.filter(x=>x.type===k).length])),
    enumerationMs:round(performance.now()-start)}
}
async function fullDigest(index,signal){
  const begin=performance.now(),aggregate=crypto.createHash('sha256');
  aggregate.update('FoamLens-real-case-source-sha256-v1\0');
  for(const f of index.files){
    if(signal?.aborted)throw err('CANCELLED','Capture cancelled, no partial report saved.');
    const hash=crypto.createHash('sha256'),stream=fs.createReadStream(f.full,{highWaterMark:256*1024});
    let n=0;
    for await(const bytes of stream){hash.update(bytes);n+=bytes.length}
    const st=await fs.promises.lstat(f.full);
    if(n!==f.bytes||!st.isFile()||st.size!==f.bytes||st.mtimeMs!==f.mtime)
      throw err('SOURCE_CHANGED','Source file changed during measurement; discard partial evidence.');
    const label=Buffer.from(f.relative,'utf8');
    aggregate.update(String(label.length)+'\0');aggregate.update(label);
    aggregate.update('\0'+String(f.bytes)+'\0'+hash.digest('hex')+'\0');
  }
  return{digest:aggregate.digest('hex'),readAndHashMs:round(performance.now()-begin)}
}
function uiReport(input){
  if(input==null)return null;
  const n=normalize(input);
  if(!/^[A-Za-z0-9._+-]{1,50}$/.test(n.version)||!['full','indexed-fast'].includes(n.mode))
    throw err('INVALID_UI_METADATA','UI version/mode must be a bounded product identifier, not a path or free-form user string.');
  return{schema:'foamlens-scientific-import-performance-v1',version:n.version,mode:n.mode,
    fileCount:n.fileCount,caseCount:n.caseCount,loadedSeries:n.loadedSeries,
    sourceBytesKnown:n.sourceBytesKnown,sourceKindCounts:n.sourceKindCounts,
    firstInteractiveMs:n.firstInteractiveMs,totalParseAndMetadataMs:n.totalParseAndMetadataMs,
    finalizeMs:n.finalizeMs,fullAuditMs:n.fullAuditMs,stageMs:n.stageMs}
}
function inRoot(root,out){
  const rel=path.relative(root,out);
  return !rel||rel==='.'||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))
}
async function capture(root,out,opts={}){
  if(!['first','repeat'].includes(opts.label))throw err('LABEL','Pass must have --label first or repeat.');
  root=path.resolve(root);out=path.resolve(out);
  if(inRoot(root,out))throw err('OUTPUT_INSIDE_SOURCE','Report cannot be written into the measured case.');
  const initial=await fs.promises.lstat(root);
  if(!initial.isDirectory()||initial.isSymbolicLink())throw err('INVALID_SOURCE','Source must be a real local directory.');
  const start=performance.now(),baseline=process.memoryUsage(),peak={rss:baseline.rss,heap:baseline.heapUsed};
  const sample=()=>{const m=process.memoryUsage();peak.rss=Math.max(peak.rss,m.rss);peak.heap=Math.max(peak.heap,m.heapUsed)};
  const tick=setInterval(sample,50);tick.unref?.();
  let index,reading;
  try{index=await inventory(root,opts.signal);reading=await fullDigest(index,opts.signal)}
  finally{clearInterval(tick);sample()}
  const ui=uiReport(opts.ui);
  const report={
    schema:SCHEMA,generatedUtc:new Date().toISOString(),pass:opts.label,
    dataset:{manifestSHA256:reading.digest,fullContentVerified:true,
      fileCount:index.files.length,directoryCount:index.directories,sourceBytes:index.total,byType:index.byType},
    sourceIO:{enumerationMs:index.enumerationMs,readAndHashMs:reading.readAndHashMs,
      totalMs:round(performance.now()-start),sampledPeakRssBytes:peak.rss,sampledPeakHeapBytes:peak.heap},
    ui:ui?{...ui,sourceFileCountMatches:ui.fileCount===index.files.length,
      sourceBytesMatch:ui.sourceBytesKnown==null?null:ui.sourceBytesKnown===index.total}:null,
    evidence:{originalDataReadOnly:true,caseSourceFingerprint:'full SHA-256 plus relative source paths internally',
      pathsOrValuesExported:false,operatingSystemCacheFlushed:false,confirmedColdCache:false,
      applicationImportedByBenchmark:false,uiDatasetBinding:'user-attributed-not-verified',
      sampledMemoryScope:'Node benchmark process, not FoamLens, OS-wide RAM, WebView2 or GPU'},
    caveats:[
      'First/repeat labels do not establish OS cold vs warm cache; no filesystem cache flush is performed.',
      'Source scan + hashing is NOT FoamLens import time. UI timing stages exist only when genuine owner UI export is attached.',
      'An aggregate digest verifies identical file trees in both measurements, not that a separate UI import used the tree.',
      'Data-dependent values, private paths and per-file names/digests are never exported. No speedup versus historical screenshots is assumed.'
    ]
  };
  await fs.promises.mkdir(path.dirname(out),{recursive:true});
  const temp=out+'.'+process.pid+'.tmp';
  try{await fs.promises.writeFile(temp,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await fs.promises.rename(temp,out)}
  finally{await fs.promises.rm(temp,{force:true}).catch(()=>{})}
  return report
}
function compareMetric(a,b){
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  return{firstMs:a,repeatMs:b,deltaMs:round(a-b),ratioFirstOverRepeat:b>0?round(a/b):null}
}
function compare(first,repeat){
  if(first?.schema!==SCHEMA||repeat?.schema!==SCHEMA||first.pass!=='first'||repeat.pass!=='repeat')
    throw err('INPUT_SCHEMA','Expected complete first/repeat reports of the same schema.');
  const a=first.dataset,b=repeat.dataset;
  if(!a?.fullContentVerified||!b?.fullContentVerified||
     !/^[a-f0-9]{64}$/.test(a.manifestSHA256)||a.manifestSHA256!==b.manifestSHA256||
     a.fileCount!==b.fileCount||a.sourceBytes!==b.sourceBytes||a.directoryCount!==b.directoryCount||
     TYPES.some(t=>a.byType?.[t]!==b.byType?.[t]))
    throw err('DATASET_CHANGED','Full-content OpenFOAM source identity differs; comparison refused.');
  const ui=first.ui&&repeat.ui?compareReports(first.ui,repeat.ui):null;
  return{schema:'foamlens-real-case-comparison-v1',
    dataset:{manifestSHA256:a.manifestSHA256,fileCount:a.fileCount,sourceBytes:a.sourceBytes,
      directoryCount:a.directoryCount,byType:a.byType,identityVerifiedAcrossPasses:true},
    sourceIOMetrics:{enumeration:compareMetric(first.sourceIO?.enumerationMs,repeat.sourceIO?.enumerationMs),
      fullReadAndHash:compareMetric(first.sourceIO?.readAndHashMs,repeat.sourceIO?.readAndHashMs),
      total:compareMetric(first.sourceIO?.totalMs,repeat.sourceIO?.totalMs)},
    uiImportMetrics:ui,osColdCacheVerified:false,uiDatasetBindingVerified:false,
    caveat:'Source identity checked cryptographically between capture passes, but UI imports and physical OS cache status are not independently bound or verified. No unmeasured performance gain is claimed.'}
}
function parseFlags(args){
  const result={};
  for(let i=0;i<args.length;i+=2){
    if(!['--label','--ui'].includes(args[i])||i+1>=args.length||result[args[i]])
      throw err('USAGE','Only --label first|repeat and optional --ui exported.json are accepted.');
    result[args[i]]=args[i+1]
  }
  return result
}
async function cli(args){
  const [action,...rest]=args;
  if(action==='capture'){
    if(rest.length<4)throw err('USAGE','capture SOURCE_DIR OUT.json --label first|repeat [--ui UI_REPORT.json]');
    const [root,out,...flags]=rest,opts=parseFlags(flags);
    const ui=opts['--ui']?JSON.parse(await fs.promises.readFile(opts['--ui'],'utf8')):null;
    const v=await capture(root,out,{label:opts['--label'],ui});
    process.stdout.write(JSON.stringify({saved:true,pass:v.pass,sourceFiles:v.dataset.fileCount,
      bytes:v.dataset.sourceBytes,attachedUi:!!v.ui})+'\n');return
  }
  if(action==='compare'&&rest.length===2){
    const [first,repeat]=await Promise.all(rest.map(p=>fs.promises.readFile(p,'utf8').then(JSON.parse)));
    process.stdout.write(JSON.stringify(compare(first,repeat),null,2)+'\n');return
  }
  throw err('USAGE','capture SOURCE_DIR OUT.json --label first|repeat [--ui UI_REPORT.json] | compare FIRST.json REPEAT.json')
}
if(require.main===module){
  cli(process.argv.slice(2)).catch(e=>{
    const expected=new Set(['LABEL','INVALID_SOURCE','TOO_LARGE','SOURCE_CHANGED','CANCELLED',
      'SYMLINK','UNSUPPORTED_ENTRY','OUTPUT_INSIDE_SOURCE','INPUT_SCHEMA','DATASET_CHANGED',
      'USAGE','INVALID_UI_METADATA']);
    const code=expected.has(e?.code)?e.code:'IO_FAILURE';
    process.stderr.write('FoamLens benchmark ['+code+']: '+
      (code==='IO_FAILURE'?'Local I/O error. Check access and free space.':e.message)+'\n');
    process.exitCode=1
  })
}
module.exports={SCHEMA,TYPES,category,inventory,fullDigest,uiReport,capture,compare,parseFlags,inRoot};
