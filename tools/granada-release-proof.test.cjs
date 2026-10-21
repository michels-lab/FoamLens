'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const gate=require('./granada-release-proof.cjs');
const zlib=require('node:zlib'),{crc32,imageStatus}=require('./granada-png-proof.cjs');
const pngCache=new Map();
function png(width,height,seed){
 const key=width+':'+height+':'+seed;
 if(pngCache.has(key))return pngCache.get(key);
 const stride=width*3,raw=Buffer.alloc((stride+1)*height),row=Buffer.alloc(stride);
 for(let x=0;x<width;x++){row[x*3]=(x*3+seed)%256;row[x*3+1]=(x*13+seed*7)%256;row[x*3+2]=(x*17+seed*11)%256;}
 for(let y=0;y<height;y++){raw[y*(stride+1)]=0;row.copy(raw,y*(stride+1)+1);}
 const part=(name,body)=>{
  const len=Buffer.alloc(4),t=Buffer.from(name),crc=Buffer.alloc(4);len.writeUInt32BE(body.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t,body])));
  return Buffer.concat([len,t,body,crc]);
 };
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 const data=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),part('IHDR',ihdr),
  part('IDAT',zlib.deflateSync(raw,{level:6})),part('IEND',Buffer.alloc(0))]);
 pngCache.set(key,data);return data;
}

const HEAD='a'.repeat(40),OLD='b'.repeat(40);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-release-proof-'));
 const binary={};
 for(const p of gate.PLATFORMS){
  const file='artifacts/'+p+'.exe',payload=Buffer.alloc(512,p==='setup'?71:91);
  payload.write('MZ',0,'ascii');
  fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.writeFileSync(path.join(root,file),payload);
  binary[p]={platform:p,sourceSha:HEAD,version:'1.8.11',file,sha256:hash(payload)};
 }
 // Real structured PNGs generated solely as synthetic test fixtures. Not Windows screenshots.
 const captures=[];
 for(const [index,p]of gate.PLATFORMS.entries()){
  for(let i=0;i<18;i++){
   const file='artifacts/fake-'+p+'-'+i+'.png',cssWidth=[1024,1280,1920][i%3],dpi=[1.25,1.5,1.75,2][i%4];
   const image=png(Math.round(cssWidth*dpi),260,(index*18)+i+1);
   fs.writeFileSync(path.join(root,file),image);
   captures.push({platform:p,tab:gate.TABS[i%8],cssWidth,dpi,sourceSha:HEAD,
    artifactSha256:binary[p].sha256,file,sha256:hash(image)});
  }
 }
 const github={schema:gate.SOURCE,mainSha:HEAD,version:'1.8.11',
  latestRelease:{version:'1.8.10',prerelease:false},
  requiredPRs:gate.REQUIRE_PRS.map(n=>({number:n,merged:true,mergeCommit:'c'.repeat(40)})),
  workflowRuns:[{workflow:'build-foamlens-desktop.yml',event:'push',headSha:HEAD,conclusion:'success'}]};
 const proof={schema:gate.SCHEMA,sourceSha:HEAD,releaseMode:'stable',prerelease:false,
  artifacts:Object.values(binary),
  appRuntime:{sourceSha:HEAD,setupInstalled:true,setupLaunched:true,portableLaunched:true,
   licenseAccepted:true,aboutAccessible:true,updaterVerified:true},
  science:{sourceSha:HEAD,realOpenFOAMFixture:true,realCaseImported:true,
   physicalRegions:['metal','mold'],verifiedViews:['A','B','C','D'],metricXYZVerified:true,
   fieldTimeAssociationVerified:true,noFabricatedData:true},
  developerEdition:{sourceSha:HEAD,separateExecutable:true,isolatedProfile:true,redactedReport:true,
   sectionAnnotationsRetained:true},
  captures,
  finalDistribution:{sourceSha:HEAD,updateFeedPlanVerified:true,releaseNotesComplete:true,
   checksumFilesGenerated:true,stagedArtifactsVerified:true,signingStateDeclared:true}
 };
 return{root,github,proof,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function withFixture(fn){const f=fixture();try{return fn(f)}finally{f.cleanup()}}
test('complete SYNTHETIC proof exercises all gates; never treated as real release evidence',()=>withFixture(f=>{
 const x=gate.inspect(f.github,f.proof,f.root);
 assert.equal(x.readyToPublish,true);assert.equal(x.gates.length,12);
 assert.equal(x.counts.verifiedScreenshots,36);
 assert.equal(x.result,'READY_TO_PUBLISH_STABLE');
}));
test('missing all evidence fails closed with actionable gate names',()=>withFixture(f=>{
 const result=gate.inspect(f.github,{schema:gate.SCHEMA,sourceSha:HEAD},f.root);
 assert.equal(result.readyToPublish,false);
 for(const id of ['stable-only','installer-and-portable-integrity','actual-windows-runtime',
  'real-multiregion-science','developer-twin-isolation','native-36-screenshot-matrix',
  'official-distribution-readiness'])assert(result.gates.some(g=>g.id===id&&!g.passed));
}));
test('unmerged required source PR refuses release even with full synthetic QA',()=>withFixture(f=>{
 f.github.requiredPRs.find(x=>x.number===162).merged=false;
 assert.match(gate.inspect(f.github,f.proof,f.root).gates.find(x=>x.id==='required-integration').reason,/162/);
}));
test('workflow must pass for exact main SHA and push event',()=>withFixture(f=>{
 f.github.workflowRuns[0].headSha=OLD;
 assert.equal(gate.inspect(f.github,f.proof,f.root).gates.find(x=>x.id==='exact-main-native-ci').passed,false);
 f.github.workflowRuns[0].headSha=HEAD;f.github.workflowRuns[0].event='pull_request';
 assert.equal(gate.inspect(f.github,f.proof,f.root).gates.find(x=>x.id==='exact-main-native-ci').passed,false);
}));
test('no RC, prerelease, stale version or older source can publish',()=>withFixture(f=>{
 f.proof.releaseMode='rc';f.proof.prerelease=true;f.github.latestRelease.version='1.8.11';
 f.proof.sourceSha=OLD;
 const x=gate.inspect(f.github,f.proof,f.root);
 for(const id of ['main-source-identity','stable-only','next-stable-version'])
  assert.equal(x.gates.find(v=>v.id===id).passed,false);
}));
test('tampered installer fails integrity by exact bytes and SHA-256',()=>withFixture(f=>{
 fs.appendFileSync(path.join(f.root,'artifacts/setup.exe'),'MODIFIED');
 assert.equal(gate.inspect(f.github,f.proof,f.root).gates.find(x=>x.id==='installer-and-portable-integrity').passed,false);
}));
test('a 35-capture manifest fails instead of pretending completeness',()=>withFixture(f=>{
 f.proof.captures.pop();
 const x=gate.inspect(f.github,f.proof,f.root);
 assert.equal(x.counts.verifiedScreenshots,35);
 assert.equal(x.gates.find(v=>v.id==='native-36-screenshot-matrix').passed,false);
}));
test('repeated or missing tabs cannot inflate the 36-slot matrix',()=>withFixture(f=>{
 f.proof.captures[7].tab='Home';
 f.proof.captures[15].tab='Home';
 const x=gate.inspect(f.github,f.proof,f.root);
 assert.equal(x.gates.find(v=>v.id==='native-36-screenshot-matrix').passed,false);
}));
test('artifact and capture source identity or sha drift fails closed',()=>withFixture(f=>{
 f.proof.artifacts[0].sourceSha=OLD;
 assert.equal(gate.inspect(f.github,f.proof,f.root).readyToPublish,false);
 f.proof.artifacts[0].sourceSha=HEAD;f.proof.captures[0].sourceSha=OLD;
 assert.equal(gate.inspect(f.github,f.proof,f.root).readyToPublish,false);
}));
test('path traversal and symlinks never escape proof root',()=>withFixture(f=>{
 assert.throws(()=>gate.safeFile(f.root,'artifacts/../private.txt'),/unsafe/);
 assert.throws(()=>gate.safeFile(f.root,'/root/private.txt'),/unsafe/);
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-release-outside-'));
 try{
  fs.symlinkSync(outside,path.join(f.root,'artifacts','escape'),'dir');
  assert.throws(()=>gate.safeFile(f.root,'artifacts/escape/a.png'),/symlinked/);
 }finally{fs.rmSync(outside,{force:true,recursive:true})}
}));
test('reject unsupported schemas and oversized proof input',()=>withFixture(f=>{
 assert.throws(()=>gate.inspect({schema:'other'},f.proof,f.root),/Unsupported/);
 const file=path.join(f.root,'huge.json');fs.writeFileSync(file,Buffer.alloc(1024*1024+1));
 assert.throws(()=>gate.cli([file,file,f.root]),/Oversized proof JSON/);
}));
test('real CLI is JSON-only and returns code 2 when proof is missing',()=>withFixture(f=>{
 const a=path.join(f.root,'github.json'),b=path.join(f.root,'proof.json');
 fs.writeFileSync(a,JSON.stringify(f.github));fs.writeFileSync(b,JSON.stringify({schema:gate.SCHEMA,sourceSha:HEAD}));
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'granada-release-proof.cjs'),a,b,f.root],{encoding:'utf8'});
 assert.equal(run.status,2);assert.equal(JSON.parse(run.stdout).result,'RELEASE_BLOCKED');
}));
test('version ordering uses semantic integers, rejects malformed release target',()=>{
 assert.equal(gate.newer('1.8.11','1.8.9'),true);
 assert.equal(gate.newer('1.8.9','1.8.10'),false);
 assert.equal(gate.newer('1.8.10','1.8.10'),false);
 assert.equal(gate.newer('1.8.11-rc1','1.8.10'),false);
});

test('capture gate rejects forged PNG headers, corrupt CRC and blank white pixels',()=>withFixture(f=>{
 const file=f.proof.captures[0].file,original=fs.readFileSync(path.join(f.root,file));
 assert(imageStatus(original)?.diversePixels);
 const forged=Buffer.alloc(256,1);Buffer.from('89504e470d0a1a0a','hex').copy(forged);
 assert.equal(imageStatus(forged),null);
 const altered=Buffer.from(original);altered[30]^=1;
 assert.equal(imageStatus(altered),null);
 const blank=png(320,240,0);
 assert(imageStatus(blank)?.diversePixels);
 fs.writeFileSync(path.join(f.root,file),forged);
 assert.equal(gate.inspect(f.github,f.proof,f.root).readyToPublish,false);
}));
test('captured pixels must match CSS width times DPI and not be recycled across tabs',()=>withFixture(f=>{
 f.proof.captures[0].cssWidth=1920;
 assert.equal(gate.inspect(f.github,f.proof,f.root).gates.find(g=>g.id==='native-36-screenshot-matrix').passed,false);
 f.proof.captures[0].cssWidth=1024;
 f.proof.captures[1].sha256=f.proof.captures[0].sha256;
 assert.equal(gate.inspect(f.github,f.proof,f.root).readyToPublish,false);
}));
