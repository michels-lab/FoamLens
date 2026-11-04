#!/usr/bin/env node
'use strict';
/*
 * G14b → G37: fail-closed ORIGINAL QuickCup B13 per-start source and PNG
 * witness. This QA-only code never touches the production app or uploads
 * research data. Only sanitized booleans are written to a temporary folder.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');

const PNG_SIG=Buffer.from([137,80,78,71,13,10,26,10]);
const MAX_PNG_BYTES=48*1024*1024;
const MAX_PIXEL_BYTES=160*1024*1024;
const MAX_SOURCE_BYTES=64*1024*1024;
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
 let x=n;
 for(let i=0;i<8;i++)x=x&1?0xedb88320^(x>>>1):x>>>1;
 return x>>>0;
});
function crc32(bytes){
 let crc=0xffffffff;
 for(const b of bytes)crc=CRC_TABLE[(crc^b)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function check(condition,message){if(!condition)throw new Error(message)}
function imageEvidence(p,label){
 check(fs.existsSync(p),label+' missing');
 const st=fs.lstatSync(p);
 check(st.isFile()&&!st.isSymbolicLink()&&st.size>500&&st.size<=MAX_PNG_BYTES,label+' invalid file');
 const bytes=fs.readFileSync(p);
 check(bytes.subarray(0,8).equals(PNG_SIG),label+' invalid PNG signature');
 let cursor=8,ihdr=false,ended=false,idats=[],width=0,height=0;
 while(cursor<bytes.length){
  check(cursor+12<=bytes.length,label+' truncated PNG chunk');
  const length=bytes.readUInt32BE(cursor),type=bytes.toString('ascii',cursor+4,cursor+8);
  check(length<=MAX_PNG_BYTES&&cursor+12+length<=bytes.length,label+' invalid PNG chunk size');
  const content=bytes.subarray(cursor+8,cursor+8+length);
  check(crc32(bytes.subarray(cursor+4,cursor+8+length))===bytes.readUInt32BE(cursor+8+length),
    label+' PNG CRC mismatch');
  if(!ihdr){
   check(type==='IHDR'&&length===13,label+' IHDR missing');
   width=content.readUInt32BE(0);height=content.readUInt32BE(4);
   check(width>=160&&width<=10000&&height>=90&&height<=10000,label+' invalid rendered dimensions');
   check(content[8]===8&&[2,6].includes(content[9])&&content[10]===0&&content[11]===0&&content[12]===0,
     label+' requires 8-bit RGB/RGBA noninterlaced screenshot');
   ihdr=true;
  } else if(type==='IDAT'){
   check(!ended,label+' IDAT after IEND');
   idats.push(content);
  } else if(type==='IEND'){
   check(length===0&&idats.length>0,label+' empty PNG');
   check(cursor+12===bytes.length,label+' bytes after IEND');
   ended=true;
  } else {
   check(/^[A-Za-z]{4}$/.test(type)&&!ended,label+' invalid chunk type');
  }
  cursor+=12+length;
 }
 check(ihdr&&ended&&idats.length>0,label+' incomplete PNG');
 const image=zlib.inflateSync(Buffer.concat(idats),{maxOutputLength:MAX_PIXEL_BYTES});
 const stride=width*(bytes[25]===6?4:3);
 check(image.length===(stride+1)*height,label+' corrupt PNG scanline bytes');
 for(let y=0;y<height;y++){
  check(image[y*(stride+1)]<=4,label+' invalid PNG filter');
 }
 return {valid:true,width,height};
}
function boundedSourceSha(file,label){
 check(fs.existsSync(file),label+' source missing');
 const stat=fs.lstatSync(file);
 check(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>32&&stat.size<=MAX_SOURCE_BYTES,
   label+' source absent or oversized');
 const data=fs.readFileSync(file);
 check(data.length===stat.size,label+' source changed while reading');
 return crypto.createHash('sha256').update(data).digest('hex');
}
function verifyCycle({caseRoot,captureDir,logPath,expectedMetal,expectedMold}){
 check(typeof expectedMetal==='string'&&/^[a-f0-9]{64}$/.test(expectedMetal), 'invalid pre-start metal hash');
 check(typeof expectedMold==='string'&&/^[a-f0-9]{64}$/.test(expectedMold), 'invalid pre-start mold hash');
 const b13=path.join(caseRoot,'B13_prghPressure_airGapOF14','9.8');
 const metal=path.join(b13,'metal','T'),mold=path.join(b13,'mold','T');
 check(boundedSourceSha(metal,'metal')===expectedMetal,'original metal changed during native restart');
 check(boundedSourceSha(mold,'mold')===expectedMold,'original mold changed during native restart');
 const log=fs.readFileSync(logPath,'utf8');
 const physicsMarker='FoamLens real OpenFOAM packaged runtime smoke passed:';
 const physicsCount=log.split(physicsMarker).length-1;
 check(physicsCount===1,'native source proof missing or recycled');
 check(log.includes('FoamLens synchronized View 2 legend/Probe smoke passed:'),'native second-view evidence missing');
 check(log.includes('FoamLens Windows smoke test passed.'),'native original Field/Play proof missing');
 check(!log.includes('"playNotCollapsed":false'),'original native Play failed');
 check(!log.includes('Real Field toolbar/canvas geometry or physical region evidence failed'),
  'native Field geometry failed');
 const screenshots=path.join(captureDir,'screens');
 const wide=imageEvidence(path.join(screenshots,'field-wide.png'),'wide Field');
 const compact=imageEvidence(path.join(screenshots,'field-compact.png'),'compact Field');
 return {
  schema:'foamlens/g37-original-per-restart-source-png/1',
  originalB13MetalUnchanged:true,originalB13MoldUnchanged:true,
  nativeOriginalScienceLogUnique:true,originalWideFieldPngCRCValid:wide.valid,
  originalCompactFieldPngCRCValid:compact.valid,
  sourceAndPngEvidencePassed:true,
  valuesOrScreenshotsExported:false,releaseAuthorized:false,humanVisualAcceptance:false
 };
}
function cli(args){
 const opts={};
 for(let i=0;i<args.length;i+=2){
  check(args[i]&&args[i].startsWith('--')&&i+1<args.length,'expected --key value options');
  opts[args[i].slice(2)]=args[i+1];
 }
 for(const key of ['case-root','capture-dir','native-log','expected-metal','expected-mold']){
  check(typeof opts[key]==='string'&&opts[key].length>0,'missing '+key);
 }
 check(process.env.GITHUB_ACTIONS==='true'&&process.env.RUNNER_OS==='Windows'&&
   process.env.RUNNER_ENVIRONMENT==='github-hosted',
   'native private fixture witness must run only on hosted Windows GitHub Actions');
 const result=verifyCycle({
  caseRoot:opts['case-root'],captureDir:opts['capture-dir'],logPath:opts['native-log'],
  expectedMetal:opts['expected-metal'],expectedMold:opts['expected-mold']
 });
 // Sanitized report stored only in G37's ephemeral private capture folder;
 // its parent is deleted before the workflow uploads boolean-only metadata.
 fs.writeFileSync(path.join(opts['capture-dir'],'original-source-and-png-proof.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 process.stdout.write('G37 per-start original B13 metal+mold SHA and two Field PNG CRC witnesses PASSED (private values withheld)\n');
}
if(require.main===module){
 try{cli(process.argv.slice(2))}catch(error){
  process.stderr.write('G37 per-start original B13 source / PNG witness FAIL: '+error.message.replace(/[\\\/].{8,}/g,'[redacted]')+'\n');
  process.exitCode=1;
 }
}
module.exports={crc32,imageEvidence,boundedSourceSha,verifyCycle};
