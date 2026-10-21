'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const test=require('node:test');
const {BASE,OWNERS,UPDATED,WORKFLOW,hash,safe,verifyManifest,workflowAdd,checkSource}=require('./granada_field_five_owner_composite.cjs');
const anchor='      - name: Test CI suite manifest\n';
function mock(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-field-five-')),baseline=new Map(),blobs=new Map();
 for(const file of [...UPDATED,WORKFLOW]){
  const bytes=Buffer.from(file===WORKFLOW?'name: Windows\n'+anchor+'        run: node desktop/tests/test-suite-manifest.test.cjs\n':
   '/* BASELINE '+file+' */\n');
  baseline.set(file,bytes);
  const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
 }
 for(const owner of OWNERS)for(const file of owner.files){
  const key=owner.pr+'|'+file;
  const unique='owner_'+owner.pr+'_'+file.replace(/[^a-zA-Z0-9]/g,'_');
  blobs.set(key,Buffer.from('/* PREVIEW FIXTURE */\nconst '+unique+' = '+owner.pr+';\n'));
 }
 const state={badHead:null,badFile:null,lexical:false};
 const head=pr=>state.badHead===pr?'0'.repeat(40):OWNERS.find(x=>x.pr===pr)?.sha;
 const source=(pr,sha,file)=>{
  if(pr===0)return baseline.get(file);
  if(state.badFile===file)throw Error('simulated corrupt remote');
  if(state.lexical&&file.startsWith('desktop/src/FoamLensDesktop/frontend/v2'))return Buffer.from('const COLLISION=1;');
  return blobs.get(pr+'|'+file);
 };
 return{root,state,baseline,blobs,head,source,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function withFixture(fn){const f=mock();try{return fn(f)}finally{f.cleanup()}}
test('requires exactly 5 original SHA-pinned owners and 14 nonoverlapping source paths',()=>{
 const files=verifyManifest();assert.equal(files.size,14);
 assert.deepEqual(OWNERS.map(x=>x.pr),[162,175,179,194,195]);
 assert(OWNERS.every(x=>/^[a-f0-9]{40}$/.test(x.sha)));
});
test('verify-only checks genuine original sources but never creates or edits a file',()=>withFixture(f=>{
 const r=checkSource(f.root,f.source,f.head,{verifyOnly:true});
 assert.equal(r.result,'VERIFIED_NOT_STAGED');assert.equal(r.owners.length,5);
 for(const file of OWNERS.flatMap(x=>x.files).filter(x=>!UPDATED.has(x)))assert.equal(fs.existsSync(path.join(f.root,file)),false);
 for(const [file,buf] of f.baseline)assert.equal(hash(fs.readFileSync(path.join(f.root,file))),hash(buf));
}));
test('staged composite contains originals from each exact owner and registers both new tests',()=>withFixture(f=>{
 const r=checkSource(f.root,f.source,f.head);
 assert.equal(r.result,'TEMPORARY_CI_STAGED');assert.equal(r.frontend_modules.length,3);
 assert.equal(r.mandatory_test_manifest_augmented,2);
 for(const owner of OWNERS)for(const file of owner.files)assert.deepEqual(fs.readFileSync(path.join(f.root,file)),f.blobs.get(owner.pr+'|'+file));
 const workflow=fs.readFileSync(path.join(f.root,WORKFLOW),'utf8');
 for(const file of ['field-multiregion-views.test.cjs','granada-177-g2-field-source-dock.test.cjs'])
  assert.equal(workflow.split('node desktop/tests/'+file).length-1,1);
 assert.equal(r.nativeInstalledVisualAccepted,false);assert.equal(r.published,false);
}));
test('stale PR #195 SHA aborts before touching all files',()=>withFixture(f=>{
 f.state.badHead=195;
 assert.throws(()=>checkSource(f.root,f.source,f.head),/Source PR moved/);
 assert.equal(fs.existsSync(path.join(f.root,OWNERS[1].files[0])),false);
}));
test('stale original v14 Field core aborts before any overlay',()=>withFixture(f=>{
 const file=OWNERS[0].files[0];fs.appendFileSync(path.join(f.root,file),'UNEXPECTED UPDATE');
 assert.throws(()=>checkSource(f.root,f.source,f.head),/Base source drift/);
 assert.equal(fs.existsSync(path.join(f.root,OWNERS[1].files[0])),false);
}));
test('unexpected pre-existing extension never gets overwritten',()=>withFixture(f=>{
 const file=OWNERS[1].files[0],dest=path.join(f.root,file);
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,'OTHER BRANCH WORK');
 assert.throws(()=>checkSource(f.root,f.source,f.head),/Unexpected existing\/new source file/);
 assert.equal(fs.readFileSync(dest,'utf8'),'OTHER BRANCH WORK');
}));
test('wrong original Windows manifest anchor stops stage before writes',()=>withFixture(f=>{
 const file=WORKFLOW;fs.writeFileSync(path.join(f.root,file),'DIFFERENT WORKFLOW');
 assert.throws(()=>checkSource(f.root,f.source,f.head),/Mandatory Windows workflow baseline drift/);
 assert.equal(fs.existsSync(path.join(f.root,OWNERS[1].files[0])),false);
}));
test('interdependent global frontend lexical namespace collision is caught',()=>withFixture(f=>{
 f.state.lexical=true;
 assert.throws(()=>checkSource(f.root,f.source,f.head),/Shared native lexical collision/);
 assert.equal(fs.existsSync(path.join(f.root,OWNERS[1].files[0])),false);
}));
test('unavailable owner source aborts atomically with no partial write',()=>withFixture(f=>{
 f.state.badFile=OWNERS[3].files[1];
 assert.throws(()=>checkSource(f.root,f.source,f.head),/simulated corrupt remote/);
 assert.equal(fs.existsSync(path.join(f.root,OWNERS[1].files[0])),false);
}));
test('duplicate PR source and disguised path traversal fail closed',()=>{
 const mutated=structuredClone(OWNERS);mutated[1].files[0]=mutated[0].files[0];
 assert.throws(()=>verifyManifest(mutated),/Overlapping ownership/);
 assert.throws(()=>safe('/tmp','desktop/tests/../../private.txt'),/Forbidden owner path/);
});
test('Windows test registration never duplicates an already-present command',()=>{
 const workflow='name: Windows\n'+anchor+'  run: node desktop/tests/field-multiregion-views.test.cjs\n';
 assert.throws(()=>workflowAdd(workflow),/already registered/);
});
test('source controls show PRs have actual new original camera workbench and measured F2 extension',()=>{
 assert(OWNERS[1].files.some(p=>p.endsWith('v24-field-f2-viewport-layout.js')));
 assert(OWNERS[4].files.some(p=>p.endsWith('v25-granada-field-source-dock.js')));
 assert(OWNERS[2].files.some(p=>p.endsWith('v24-granada-global-ux.js')));
 assert(OWNERS[3].files.some(p=>p.endsWith('audit-diff.cjs')));
});
