'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {verify,SCHEMA}=require('./granada_g21_signing_guard.cjs');
const sha='a'.repeat(40), thumb='b'.repeat(40),version='1.8.11';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-g21-'));
 const report={schema:SCHEMA,sourceSha:sha,version,nativeAuthenticodeVerified:true,signerThumbprint:thumb,assets:{}};
 for(const kind of ['portable','setup']){
  const filename='FoamLens-'+(kind==='setup'?'Setup':'Portable')+'-v'+version+'.exe';
  const binary=Buffer.concat([Buffer.from('MZ'),Buffer.alloc(130,kind==='portable'?1:2)]);
  fs.writeFileSync(path.join(root,filename),binary);
  const digest=crypto.createHash('sha256').update(binary).digest('hex');
  fs.writeFileSync(path.join(root,filename+'.sha256'),digest+'  '+filename+'\n');
  report.assets[kind]={filename,sha256:digest,authenticodeStatus:'Valid',signerThumbprint:thumb};
 }
 return{root,report};
}
function withFixture(fn){const o=fixture();try{fn(o);}finally{fs.rmSync(o.root,{recursive:true,force:true});}}
test('a native-signed original-matching, correctly checksummed attestation is structurally accepted',()=>withFixture(({root,report})=>{
 assert.deepEqual(verify(report,root,sha,version),{ready:true,errors:[]});
}));
test('rejects missing native attestation and forged node-only signer',()=>withFixture(({root,report})=>{
 report.nativeAuthenticodeVerified=false;
 assert.equal(verify(report,root,sha,version).ready,false);
 assert.equal(verify(null,root,sha,version).ready,false);
}));
test('rejects unsigned and untrusted certificate statuses',()=>withFixture(({root,report})=>{
 for(const status of ['NotSigned','UnknownError','NotTrusted','HashMismatch','']){
  report.assets.setup.authenticodeStatus=status;
  assert.equal(verify(report,root,sha,version).ready,false,status);
 }
}));
test('rejects different publisher identities and missing thumbprint',()=>withFixture(({root,report})=>{
 report.assets.portable.signerThumbprint='c'.repeat(40);
 assert.equal(verify(report,root,sha,version).ready,false);
 report.signerThumbprint='';
 assert.equal(verify(report,root,sha,version).ready,false);
}));
test('rejects a swapped signed file even if report says Valid',()=>withFixture(({root,report})=>{
 fs.appendFileSync(path.join(root,report.assets.setup.filename),'tampered');
 assert.equal(verify(report,root,sha,version).ready,false);
}));
test('rejects sidecar mismatches and absent sidecar',()=>withFixture(({root,report})=>{
 const file=path.join(root,report.assets.portable.filename+'.sha256');
 fs.writeFileSync(file,'0'.repeat(64)+'  wrong.exe');
 assert.equal(verify(report,root,sha,version).ready,false);
 fs.rmSync(file);
 assert.equal(verify(report,root,sha,version).ready,false);
}));
test('rejects source SHA, version, or artifact identity mismatches',()=>withFixture(({root,report})=>{
 assert.equal(verify(report,root,'c'.repeat(40),version).ready,false);
 assert.equal(verify(report,root,sha,'1.8.12').ready,false);
 report.assets.portable.filename='../FoamLens-Portable-v1.8.11.exe';
 assert.equal(verify(report,root,sha,version).ready,false);
}));
test('requires real Windows PE MZ header, not a mislabeled text file',()=>withFixture(({root,report})=>{
 const f=path.join(root,report.assets.setup.filename);
 const buffer=Buffer.from('not a PE executable');
 fs.writeFileSync(f,buffer);
 const d=crypto.createHash('sha256').update(buffer).digest('hex');
 report.assets.setup.sha256=d;
 fs.writeFileSync(f+'.sha256',d+'  '+report.assets.setup.filename+'\n');
 assert.equal(verify(report,root,sha,version).ready,false);
}));
