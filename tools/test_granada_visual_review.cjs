'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {audit,render,main,MODES,VARIANTS,SIZES,png}=require('./granada_visual_review.cjs');
const commit='1234567890abcdef1234567890abcdef12345678';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');

function crc32(buffer){
  let crc=0xffffffff;
  for(const byte of buffer){
    crc^=byte;
    for(let k=0;k<8;k++)crc=(crc&1)?(0xedb88320^(crc>>>1)):(crc>>>1)
  }
  return(crc^0xffffffff)>>>0
}
function chunk(type,data){
  const marker=Buffer.from(type,'ascii'),len=Buffer.alloc(4),crc=Buffer.alloc(4);
  len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([marker,data])));
  return Buffer.concat([len,marker,data,crc])
}
function makePng(width,height,seed){
  // Synthetic pixels, but a fully structured and DECOMPRESSIBLE PNG;
  // never call these native screenshots outside source regression tests.
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;
  const row=width*4+1,raw=Buffer.alloc(row*height);
  for(let y=0;y<height;y++){
    raw[y*row]=0;
    raw[y*row+1]=seed%251;
    raw[y*row+2]=(seed*3)%253;
    raw[y*row+3]=(seed*7)%251;
    raw[y*row+4]=255
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])
}
const fixture=makePng(960,720,1);
const passed=[];
function test(label,cb){cb();passed.push(label)}
const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-granada-g5-'));
function make(){
  const setup=path.join(root,'setup.exe'),portable=path.join(root,'portable.exe');
  fs.writeFileSync(setup,'TEST ONLY Installer artifact');fs.writeFileSync(portable,'TEST ONLY Portable artifact');
  const doc={schema:'michelslab-rendered-ui-v1',source_commit:commit,
    artifact_sha256:{windows:digest(fs.readFileSync(setup))},
    portable_artifact_sha256:{windows:digest(fs.readFileSync(portable))},screenshots:[]};
  for(const variant of VARIANTS)for(const viewport of SIZES)for(const surface of MODES){
    // Artificial PNG-header fixtures for provenance regressions ONLY;
    // never classify their pixels as a real app screenshot.
    const bytes=makePng(viewport==='wide'?1140:640,720,doc.screenshots.length+1);
    const filename=variant+'-'+viewport+'-'+surface+'.png';fs.writeFileSync(path.join(root,filename),bytes);
    doc.screenshots.push({platform:'windows',runtime_variant:variant,viewport,surface,path:filename,
      sha256:digest(bytes),width:viewport==='wide'?1140:640,height:720,
      capture_method:variant==='installed'?'installed-windows-desktop':'running-desktop-app',
      candidate_artifact_sha256:variant==='installed'?doc.artifact_sha256.windows:doc.portable_artifact_sha256.windows});
  }
  return{doc,setup,portable};
}
const {doc,setup,portable}=make(),opts={root,sha:commit,setup,portable};
try{
  test('only authentic schema, source SHA, distinct installed/portable artifact bindings qualify',()=>{
    const data=audit(doc,opts);
    assert.equal(data.status,'REQUIRES_HUMAN_REVIEW');
    assert.equal(data.human_approved,false);
    assert.equal(data.captured_slots,36);assert.equal(data.required_slots,36);
    assert.equal(data.missing_surfaces.length,0);
    assert.equal(data.artifact_checks.installed.state,'verified');
    assert.equal(data.artifact_checks.portable.state,'verified');
    assert.equal(audit(doc,{root,sha:commit}).status,'INVALID',
      'even 36 full-size frames must not receive review status without verified exact candidate EXEs');
  });
  test('missing Analysis, Review, Live and Time Series cannot pass strict complete coverage',()=>{
    const copy=structuredClone(doc);
    copy.screenshots=copy.screenshots.filter(x=>!['analysis','review','live','time-series'].includes(x.surface));
    const data=audit(copy,opts);
    assert.equal(data.status,'INCOMPLETE');
    assert.deepEqual(data.missing_surfaces.filter(x=>['analysis','review','live','time-series'].includes(x)).sort(),['analysis','live','review','time-series']);
    assert.equal(data.coverage.find(x=>x.surface==='field').complete,true);
  });
  test('a spoofed source commit or binary is not allowed to inherit screenshots',()=>{
    assert.equal(audit(doc,{...opts,sha:'0'.repeat(40)}).status,'INVALID');
    const bad=structuredClone(doc);
    bad.screenshots[0].candidate_artifact_sha256='0'.repeat(64);
    assert.equal(audit(bad,opts).status,'INVALID');
    const badArtifact={...opts,setup:portable};
    assert.equal(audit(doc,badArtifact).status,'INVALID');
  });
  test('tampered file SHA, dimension or path traversal is never accepted',()=>{
    let bad=structuredClone(doc);bad.screenshots[0].sha256='f'.repeat(64);
    assert.equal(audit(bad,opts).status,'INVALID');
    bad=structuredClone(doc);bad.screenshots[0].width=42;
    assert.equal(audit(bad,opts).status,'INVALID');
    bad=structuredClone(doc);bad.screenshots[0].path='../outside.png';
    const data=audit(bad,opts);
    assert.equal(data.status,'INVALID');
    assert(data.issues.some(x=>x.code==='invalid-png'));
  });
  test('duplicate slots and duplicated screenshots across different tabs fail closed',()=>{
    let bad=structuredClone(doc);
    bad.screenshots.push({...bad.screenshots[0]});
    assert.equal(audit(bad,opts).status,'INVALID');
    bad=structuredClone(doc);
    bad.screenshots[1].path=bad.screenshots[0].path;
    bad.screenshots[1].sha256=bad.screenshots[0].sha256;
    const data=audit(bad,opts);
    assert.equal(data.status,'INVALID');
    assert(data.issues.some(i=>i.code==='same-image-different-tabs'));
  });

  test('G71 rejects synthetic markers, tiny PNGs, IHDR spoofs, appended bytes and corrupt image payloads',()=>{
    let bad=structuredClone(doc);
    bad.screenshots[0].capture_method='synthetic-test-only';
    assert.equal(audit(bad,opts).status,'INVALID','synthetic capture must never count as real Windows');
    const original=doc.screenshots[0],tiny=makePng(1,1,240),tinyPath='g71-tiny.png';
    fs.writeFileSync(path.join(root,tinyPath),tiny);
    bad=structuredClone(doc);
    bad.screenshots[0]={...original,path:tinyPath,sha256:digest(tiny),width:1,height:1};
    assert.equal(audit(bad,opts).status,'INVALID','1px frame must never fulfill 36 native slots');
    const append=Buffer.concat([fixture,Buffer.from('FAKE_TRAILING_CAPTURE')]),appendPath='g71-append.png';
    fs.writeFileSync(path.join(root,appendPath),append);
    bad=structuredClone(doc);
    bad.screenshots[0]={...original,path:appendPath,sha256:digest(append),width:960,height:720};
    assert.equal(audit(bad,opts).status,'INVALID','trailing payload disqualifies complete PNG');
    const corrupt=Buffer.from(fixture);corrupt[45]^=0xff;
    const corruptPath='g71-crc.png';fs.writeFileSync(path.join(root,corruptPath),corrupt);
    bad=structuredClone(doc);
    bad.screenshots[0]={...original,path:corruptPath,sha256:digest(corrupt),width:960,height:720};
    assert.equal(audit(bad,opts).status,'INVALID','valid file SHA alone cannot compensate for broken PNG CRC');
    assert.throws(()=>png(Buffer.from([137,80,78,71,13,10,26,10,0])),/Invalid PNG signature/);
  });

  test('only PNG dimensions from the file are trusted; report is offline and safe',()=>{
    assert.deepEqual(png(fixture),{width:960,height:720});
    const data=audit(doc,opts),html=render(data);
    assert(html.includes('Content-Security-Policy'));
    assert(html.includes('data:image/png;base64'));
    assert(!html.includes('http://')&&!html.includes('https://'));
    assert(html.includes('CAPTURED · REVIEW REQUIRED'));
    assert(html.includes('REQUIRES_HUMAN_REVIEW'));
    assert(html.includes('human')||html.includes('humana'));
  });
  test('CLI emits HTML + JSON; strict gate rejects incomplete matrices',()=>{
    const manifest=path.join(root,'manifest.json'),html=path.join(root,'review.html'),json=path.join(root,'review.json');
    fs.writeFileSync(manifest,JSON.stringify(doc));
    const args=['--manifest',manifest,'--output',html,'--json',json,'--sha',commit,'--setup',setup,'--portable',portable,'--strict'];
    assert.equal(main(args),0);
    assert(fs.statSync(html).size>1000);
    const report=JSON.parse(fs.readFileSync(json,'utf8'));
    assert(!JSON.stringify(report).includes('bytes'), 'JSON may not embed screenshot pixel data');
    assert.equal(report.status,'REQUIRES_HUMAN_REVIEW');
    const incomplete=structuredClone(doc);
    incomplete.screenshots=incomplete.screenshots.filter(x=>x.surface!=='field-compare');
    fs.writeFileSync(manifest,JSON.stringify(incomplete));
    assert.equal(main(args),3);
  });
  console.log('Granada G5 native evidence: '+passed.length+' regression groups passed.');
  for(const label of passed)console.log('  ✓ '+label);
}finally{fs.rmSync(root,{recursive:true,force:true})}
