'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {BASE_PATHS,verify,compose,resolveWithin,sha256}=require('./granada_composite_candidate.cjs');
const MANIFEST=JSON.parse(fs.readFileSync(path.join(__dirname,'granada_composite_manifest.json'),'utf8'));
const results=[];
function group(name,fn){fn();results.push(name)}
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-composite-test-'));
 for(const p of BASE_PATHS){
  const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,'ORIGINAL SOURCE MUST REMAIN IMMUTABLE: '+p)
 }
 const state={badHead:null,badFile:null,badSyntax:null,globalConflict:false,fetched:[]};
 const provider={
  baseAncestor:sha=>{assert.equal(sha,MANIFEST.base_sha)},
  headFor:p=>p===state.badHead?'0'.repeat(40):MANIFEST.components.find(c=>c.pr===p)?.sha,
  fetch:p=>state.fetched.push(p),
  source:(pr,sha,file)=>{
   if(file===state.badFile)throw Error('simulated broken source');
   if(file===state.badSyntax)return Buffer.from('function(');
   const tag='pr_'+pr+'_'+file.replace(/[^a-zA-Z0-9]/g,'_');
   const code=state.globalConflict&&file.endsWith('.js')?'const CROSS_PR_COLLISION=1;':
     '/* ' + tag + ' */\nconst '+tag+'=true;\n';
   return Buffer.from(code)
  }
 };
 return{root,state,provider,cleanup(){fs.rmSync(root,{force:true,recursive:true})}}
}
function block(fn){const x=setup();try{return fn(x)}finally{x.cleanup()}}
group('Manifest is seven exact distinct owner PRs with 16 executable/test files and no branch collision',()=>{
 const out=verify(MANIFEST);
 assert.equal(out.owners,7);assert.equal(out.files,16);assert.equal(out.frontend.length,6);
 assert.equal(new Set(MANIFEST.components.map(x=>x.pr)).size,7);
 assert.deepEqual(MANIFEST.components.map(x=>x.pr),[175,179,180,181,182,183,184]);
});
group('Staging copies only pinned PR bytes, compiles modules together, never mutates originals',()=>block(x=>{
 const before=new Map(BASE_PATHS.map(p=>[p,sha256(fs.readFileSync(path.join(x.root,p)))]));
 const report=compose(MANIFEST,x.provider,{root:x.root});
 assert.equal(report.status,'STAGED_UNMERGED');
 assert.equal(report.counts.frontend,6);assert.equal(report.counts.files,16);
 assert.equal(report.sources.length,7);
 assert.equal(report.original_source_preserved,true);
 assert.equal(report.scientific_approval,false);assert.equal(report.release_authorized,false);
 assert.equal(report.installed_windows_approval,false);
 assert.deepEqual(x.state.fetched,[175,179,180,181,182,183,184]);
 for(const p of BASE_PATHS)assert.equal(sha256(fs.readFileSync(path.join(x.root,p))),before.get(p));
 for(const owner of report.sources)for(const item of owner.files)
  assert.equal(sha256(fs.readFileSync(path.join(x.root,item.path))),item.sha256);
 const ordered=[...report.exact_frontend_injection_order];
 assert.deepEqual(ordered,[...ordered].sort((a,b)=>a.toLowerCase()<b.toLowerCase()?-1:a.toLowerCase()>b.toLowerCase()?1:0));
}));
group('Verify-only computes full manifest and compiler evidence with zero staged writes',()=>block(x=>{
 const before=verify(MANIFEST);
 const report=compose(MANIFEST,x.provider,{root:x.root,write:false});
 assert.equal(report.status,'VALIDATED_UNMERGED');
 for(const p of MANIFEST.components.flatMap(x=>x.files))assert.equal(fs.existsSync(path.join(x.root,p)),false);
 assert.equal(report.counts.files,before.files);
}));
group('Changed PR head fails before any source modification, avoiding silently outdated integration',()=>block(x=>{
 x.state.badHead=181;
 assert.throws(()=>compose(MANIFEST,x.provider,{root:x.root}),/PR 181 moved/);
 assert.equal(fs.existsSync(path.join(x.root,MANIFEST.components[0].files[0])),false);
}));
group('Colliding target files cause hard failure, no overwrite of existing branch work',()=>block(x=>{
 const f=MANIFEST.components[0].files[0],target=path.join(x.root,f);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'OTHER AGENT SOURCE');
 assert.throws(()=>compose(MANIFEST,x.provider,{root:x.root}),/Refusing to overwrite/);
 assert.equal(fs.readFileSync(target,'utf8'),'OTHER AGENT SOURCE');
}));
group('Partial/missing PR source and invalid syntax abort without staged files',()=>block(x=>{
 const entry=MANIFEST.components[2].files[0];x.state.badFile=entry;
 assert.throws(()=>compose(MANIFEST,x.provider,{root:x.root}),/simulated broken source/);
 assert.equal(fs.existsSync(path.join(x.root,MANIFEST.components[0].files[0])),false);
 x.state.badFile=null;x.state.badSyntax=entry;
 assert.throws(()=>compose(MANIFEST,x.provider,{root:x.root}),/Syntax invalid/);
 assert.equal(fs.existsSync(path.join(x.root,MANIFEST.components[0].files[0])),false);
}));
group('Lexical collisions across six IIFE-injected modules fail closed even if each compiles alone',()=>block(x=>{
 x.state.globalConflict=true;
 assert.throws(()=>compose(MANIFEST,x.provider,{root:x.root}),/Runtime IIFE lexical collision/);
 for(const p of MANIFEST.components[0].files)assert.equal(fs.existsSync(path.join(x.root,p)),false);
}));
group('Path traversal, overwrite of core JS, release recipe and doubled paths are rejected',()=>{
 const bad=structuredClone(MANIFEST);
 bad.components[1].files[0]='../../outside.cjs';
 assert.throws(()=>verify(bad),/Forbidden source overlay/);
 bad.components[1].files[0]='desktop/src/FoamLensDesktop/frontend/v14-field-view.js';
 assert.throws(()=>verify(bad),/Forbidden source overlay/);
 bad.components[1].files[0]=MANIFEST.components[0].files[0];
 assert.throws(()=>verify(bad),/Overlapping source path/);
 bad.components[1].files[0]='.github/workflows/release.yml';
 assert.throws(()=>verify(bad),/Forbidden source overlay/);
});
group('Pin tampering, owner duplication and unsafe publication flag are rejected',()=>{
 const bad=structuredClone(MANIFEST);
 bad.components[1].sha='not-a-real-sha';
 assert.throws(()=>verify(bad),/Invalid source owner/);
 bad.components[1].sha=MANIFEST.components[1].sha;
 bad.components[1].pr=175;
 assert.throws(()=>verify(bad),/Duplicate PR/);
 bad.components[1].pr=179;bad.purpose='RELEASE';
 assert.throws(()=>verify(bad),/No-preview publication contract/);
});
group('Symlink source paths cannot escape candidate checkout',()=>block(x=>{
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-other-repo-'));
 try{
  const source=path.join(x.root,'tools');fs.renameSync(source,source+'-real');
  fs.symlinkSync(outside,source,'dir');
  assert.throws(()=>resolveWithin(x.root,'tools/granada_visual_review.cjs'),/Symlinked source directory/);
 }finally{fs.rmSync(outside,{recursive:true,force:true})}
}));
console.log('FoamLens Granada cross-PR composite: '+results.length+' negative/integration regression groups PASS.');
for(const name of results)console.log('  ✓ '+name);
