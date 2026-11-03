'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),zlib=require('node:zlib');
const gate=require('./granada_g37_per_restart_source_gate.cjs');
function chunk(type,data){
 const header=Buffer.alloc(8);
 header.writeUInt32BE(data.length,0);header.write(type,4,'ascii');
 const body=Buffer.concat([Buffer.from(type,'ascii'),data]);
 const check=Buffer.alloc(4);check.writeUInt32BE(gate.crc32(body));
 return Buffer.concat([header,data,check]);
}
function png(){
 const w=320,h=160,bpp=4,ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 const raw=Buffer.alloc((w*bpp+1)*h);
 for(let y=0;y<h;y++){
  const off=y*(w*bpp+1);raw[off]=0;
  for(let x=0;x<w*bpp;x++)raw[off+1+x]=(x*29+y*37+x*y)%256;
 }
 return Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
  chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))
 ]);
}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g37-original-source-'));
 const b13=path.join(root,'B13_prghPressure_airGapOF14','9.8');
 const metal=path.join(b13,'metal'),mold=path.join(b13,'mold');
 fs.mkdirSync(metal,{recursive:true});fs.mkdirSync(mold,{recursive:true});
 fs.writeFileSync(path.join(metal,'T'),'FoamFile\n{ format ascii; }\ninternalField uniform 123.456;\n');
 fs.writeFileSync(path.join(mold,'T'),'FoamFile\n{ format ascii; }\ninternalField uniform 456.789;\n');
 const capture=path.join(root,'captures','portable-1');
 fs.mkdirSync(path.join(capture,'screens'),{recursive:true});
 for(const n of ['field-wide.png','field-compact.png'])
  fs.writeFileSync(path.join(capture,'screens',n),png());
 const log=path.join(root,'native-log.txt');
 fs.writeFileSync(log,[
 'FoamLens real OpenFOAM packaged runtime smoke passed:',
 'FoamLens synchronized View 2 legend/Probe smoke passed:',
 'FoamLens Windows smoke test passed.'
 ].join('\n'));
 const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const opts={
  caseRoot:root,captureDir:capture,logPath:log,
  expectedMetal:sha(path.join(metal,'T')),expectedMold:sha(path.join(mold,'T'))
 };
 return {root,opts,metal:path.join(metal,'T'),mold:path.join(mold,'T')};
}
function withFixture(f){
 const data=fixture();
 try{f(data)}finally{fs.rmSync(data.root,{recursive:true,force:true})}
}
test('original two region source hashes and both decoded CRC-valid Field PNG pass',()=>withFixture(({opts})=>{
 const r=gate.verifyCycle(opts);
 assert.equal(r.sourceAndPngEvidencePassed,true);
 assert.equal(r.originalB13MetalUnchanged,true);
 assert.equal(r.originalB13MoldUnchanged,true);
 assert.equal(r.originalWideFieldPngCRCValid,true);
 assert.equal(r.originalCompactFieldPngCRCValid,true);
 assert.equal(r.releaseAuthorized,false);
 assert.equal(r.humanVisualAcceptance,false);
 assert(!JSON.stringify(r).includes(opts.expectedMetal));
}));
test('metal original changed during restart fails closed',()=>withFixture(({opts,metal})=>{
 fs.appendFileSync(metal,'changed');
 assert.throws(()=>gate.verifyCycle(opts),/metal changed/);
}));
test('mold original changed during restart fails closed',()=>withFixture(({opts,mold})=>{
 fs.appendFileSync(mold,'changed');
 assert.throws(()=>gate.verifyCycle(opts),/mold changed/);
}));
test('missing or replayed original source marker is rejected',()=>withFixture(({opts})=>{
 fs.writeFileSync(opts.logPath,'FoamLens Windows smoke test passed.');
 assert.throws(()=>gate.verifyCycle(opts),/source proof/);
 fs.writeFileSync(opts.logPath,[
  'FoamLens real OpenFOAM packaged runtime smoke passed:',
  'FoamLens real OpenFOAM packaged runtime smoke passed:',
  'FoamLens synchronized View 2 legend/Probe smoke passed:',
  'FoamLens Windows smoke test passed.'
 ].join('\n'));
 assert.throws(()=>gate.verifyCycle(opts),/recycled/);
}));
test('original Play failure cannot be called verified science',()=>withFixture(({opts})=>{
 fs.appendFileSync(opts.logPath,'\n"playNotCollapsed":false');
 assert.throws(()=>gate.verifyCycle(opts),/Play failed/);
}));
test('invalid PNG header and corrupted CRC both fail closed',()=>withFixture(({opts})=>{
 const img=path.join(opts.captureDir,'screens','field-wide.png');
 const bytes=fs.readFileSync(img);
 fs.writeFileSync(img,Buffer.concat([Buffer.from('garbage!'),bytes.subarray(8)]));
 assert.throws(()=>gate.verifyCycle(opts),/PNG signature/);
 fs.writeFileSync(img,Buffer.from(bytes));
 const bad=Buffer.from(bytes);bad[70]^=1;fs.writeFileSync(img,bad);
 assert.throws(()=>gate.verifyCycle(opts),/CRC mismatch/);
}));
test('missing real native capture is never substituted with fake data',()=>withFixture(({opts})=>{
 fs.unlinkSync(path.join(opts.captureDir,'screens','field-compact.png'));
 assert.throws(()=>gate.verifyCycle(opts),/compact Field missing/);
}));
test('invalid prior source SHA cannot pass as original B13',()=>withFixture(({opts})=>{
 assert.throws(()=>gate.verifyCycle({...opts,expectedMetal:'0'.repeat(63)}),/pre-start metal hash/);
}));
test('witness produces only privacy-safe boolean metadata',()=>withFixture(({opts})=>{
 const r=gate.verifyCycle(opts),serial=JSON.stringify(r);
 assert(!serial.includes(opts.caseRoot));
 assert(!serial.includes(opts.logPath));
 assert(!serial.includes(opts.expectedMold));
 assert.equal(r.valuesOrScreenshotsExported,false);
}));

test('original G37 six-start Windows wrapper binds SHA before each launch and validates PNG after',()=>{
 const root=path.resolve(__dirname,'..');
 const script=fs.readFileSync(path.join(root,'tools/granada_g37_real_b13_play_stress.ps1'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/granada-g37-real-b13-play-stress.yml'),'utf8');
 const unchanged=s=>{
  assert.match(s,/foreach\(\$n in 1\.\.3\)\{\s*Native-Smoke \$exe 'portable' \$n/);
  assert.match(s,/Native-Smoke \$installedExe 'installed' \$n/);
  assert.match(s,/\$metalShaBefore=\(Get-FileHash -LiteralPath \$metalOriginal -Algorithm SHA256\)/);
  assert.match(s,/\$moldShaBefore=\(Get-FileHash -LiteralPath \$moldOriginal -Algorithm SHA256\)/);
  assert(s.indexOf('$metalShaBefore=')<s.indexOf("$p=Start-Process -FilePath $app"));
  assert.match(s,/node tools\/granada_g37_per_restart_source_gate\.cjs --case-root \$fixture/);
  assert.match(s,/--expected-metal \$metalShaBefore --expected-mold \$moldShaBefore/);
  assert.match(s,/Need \(\$LASTEXITCODE -eq 0\)/);
  assert.match(s,/sourceAndPngEvidencePassed=\$true/);
  assert.match(s,/@\(\$script:attempts\|Where-Object \{\$_.sourceAndPngEvidencePassed -ne \$true\}\).Count -eq 0/);
 };
 unchanged(script);
 assert.match(workflow,/originalB13AllSixPerRestartSourceAndPngGatePassed -ne \$true/);
 assert.match(workflow,/originalFieldWideAndCompactPngCrcDecoded -ne \$true/);
 assert.match(workflow,/node --test tools\/granada_g37_per_restart_source_gate\.test\.cjs/);
 assert.match(workflow,/node-version: '22'/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true|contents:\s*write/);
 assert.throws(()=>unchanged(script.replace('--expected-metal $metalShaBefore','--expected-metal $moldShaBefore')));
 assert.throws(()=>unchanged(script.replace("Native-Smoke $installedExe 'installed' $n","Write-Host skip-installed")));
});
