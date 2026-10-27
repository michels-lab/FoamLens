#!/usr/bin/env node
'use strict';
// G21: second independent check for native Authenticode report, file hashes,
// current exact source and publisher before allowing FINAL stable release.
// This is deliberately not a substitute for Get-AuthenticodeSignature on Windows.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const SHA40=/^[a-f\d]{40}$/i, SHA64=/^[a-f\d]{64}$/i;
const SCHEMA='foamlens/granada-g21-native-authenticode/1';
const FILES=['portable','setup'];
function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function safeName(name) {return /^FoamLens-(Portable|Setup)-v\d+\.\d+\.\d+\.exe$/.test(name||'');}
function verify(report,root,sourceSha,version){
 const errors=[];
 if(!report||report.schema!==SCHEMA)errors.push('missing native signing audit schema');
 if(!SHA40.test(sourceSha||'')||report?.sourceSha!==sourceSha)errors.push('current source SHA differs');
 if(!/^\d+\.\d+\.\d+$/.test(version||'')||report?.version!==version)errors.push('signed files version mismatch');
 if(report?.nativeAuthenticodeVerified!==true)errors.push('not verified on a native Windows runner');
 if(!SHA40.test(report?.signerThumbprint||''))errors.push('missing real publisher certificate thumbprint');
 const binaries=report?.assets||{};
 for(const kind of FILES){
  const asset=binaries[kind]||{};
  const filename='FoamLens-'+(kind==='setup'?'Setup':'Portable')+'-v'+version+'.exe';
  if(!safeName(asset.filename)||asset.filename!==filename){errors.push(kind+': unexpected file identity');continue;}
  if(asset.authenticodeStatus!=='Valid')errors.push(kind+': invalid Authenticode or unsigned');
  if(asset.signerThumbprint!==report?.signerThumbprint)errors.push(kind+': inconsistent publisher certificate');
  if(!SHA64.test(asset.sha256||'')){errors.push(kind+': hash absent');continue;}
  const candidate=path.join(root,filename),checksum=candidate+'.sha256';
  try{
   if(!fs.statSync(candidate).isFile()||!fs.statSync(checksum).isFile())throw Error('expected artifact missing');
   if(sha256(candidate)!==asset.sha256.toLowerCase())throw Error('signed bytes SHA mismatch');
   const txt=fs.readFileSync(checksum,'utf8').trim();
   if(txt.toLowerCase()!==asset.sha256.toLowerCase()+'  '+filename.toLowerCase())throw Error('official .sha256 sidecar mismatch');
   const fd=fs.openSync(candidate,'r'),bytes=Buffer.alloc(2);
   try {fs.readSync(fd,bytes,0,2,0);}finally{fs.closeSync(fd);}
   if(bytes.toString('ascii')!=='MZ')throw Error('not a real Windows binary');
  }catch(e){errors.push(kind+': '+e.message);}
 }
 return{ready:errors.length===0,errors};
}
if(require.main===module){
 try{
  const [json,root,source,version]=process.argv.slice(2);
  if(!json||!root||!source||!version)throw Error('Usage: node granada_g21_signing_guard.cjs report.json artifact-dir original-sha version');
  const status=verify(JSON.parse(fs.readFileSync(json,'utf8')),root,source,version);
  if(!status.ready)throw Error(status.errors.join('; '));
  console.log('G21 exact native Authenticode, both signed asset hashes, source SHA and checksum files verified');
 }catch(e){console.error('FoamLens stable release BLOCKED: '+e.message);process.exitCode=2;}
}
module.exports={verify,SCHEMA};
