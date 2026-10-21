'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {BASE,FW,F,OWNERS,original,same,hash,verifyManifest,safe,workflowPatch,syntaxCheck,plan}=require('./granada_all_tabs_11_owner.cjs');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-twelve-')),blobs=new Map(),base=new Map();
 for(const p of [...original,FW]){
  const content=Buffer.from(p===FW?'name: baseline\n      - name: Test CI suite manifest\n        shell: pwsh\n        run: node desktop/tests/test-suite-manifest.test.cjs\n':'/* BASE SOURCE '+p+' */\n');
  base.set(p,content);const dst=path.join(root,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,content);
 }
 for(const own of OWNERS)for(const p of own.files)blobs.set(own.sha+':'+p,Buffer.from('/* test fixture: NOT real source */\nconst F'+own.pr+'_'+p.replace(/[^a-zA-Z0-9]/g,'_')+' = '+own.pr+';\n'));
 const opts={moved:null,corrupt:null,duplicate:false};
 const read=(sha,p)=>{
  if(sha===BASE)return base.get(p);
  if(opts.corrupt===p)throw Error('Simulated unavailable source');
  if(opts.duplicate&&p.startsWith(F)&&p.includes('v2'))return Buffer.from('const collision=1;');
  return blobs.get(sha+':'+p);
 };
 const head=pr=>opts.moved===pr?'f'.repeat(40):OWNERS.find(x=>x.pr===pr)?.sha;
 return{root,blobs,base,opts,read,head,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function withF(fn){const x=fixture();try{return fn(x)}finally{x.close()}}
test('pinned owners span physical Field, all tabs, visual G5, Ctrl+K and compact G7',()=>{
 const paths=verifyManifest();assert.equal(OWNERS.length,12);assert.equal(paths.size,28);
 assert.deepEqual(OWNERS.map(x=>x.pr),[162,175,179,180,181,182,183,184,194,195,201,205]);
 assert.equal([...paths].filter(p=>p.startsWith(F)&&/^v2/.test(path.basename(p))).length,9);
});
test('plan verifies 12 live SHA owners but preserves entire source without stage',()=>withF(x=>{
 const p=plan(x.root,x.read,x.head);assert.equal(p.staged,false);
 assert.equal(p.owners.length,12);assert.equal(p.modules.length,9);
 for(const [file,buf]of x.base)assert.equal(hash(fs.readFileSync(path.join(x.root,file))),hash(buf));
 for(const own of OWNERS)for(const name of own.files)if(!original.has(name))assert.equal(fs.existsSync(path.join(x.root,name)),false);
}));
test('actual ephemeral stage installs complete 9-module sibling source plus 28 owner files',()=>withF(x=>{
 const p=plan(x.root,x.read,x.head,{write:true});
 assert.equal(p.staged,true);assert.equal(p.noRelease,true);assert.equal(p.originalHomePageRetained,true);
 for(const own of OWNERS)for(const name of own.files)assert.deepEqual(fs.readFileSync(path.join(x.root,name)),x.blobs.get(own.sha+':'+name));
 const workflow=fs.readFileSync(path.join(x.root,FW),'utf8');
 assert.equal(workflow.split('node desktop/tests/field-multiregion-views.test.cjs').length-1,1);
 assert.equal(workflow.split('node desktop/tests/granada-177-g2-field-source-dock.test.cjs').length-1,1);
 assert(!workflow.includes('publish: true'));
}));
test('stale PR #201 blocks ALL staging before changes',()=>withF(x=>{
 x.opts.moved=205;assert.throws(()=>plan(x.root,x.read,x.head,{write:true}),/Owner PR moved/);
 assert.equal(fs.existsSync(path.join(x.root,OWNERS[11].files[0])),false);
}));
test('scientific original v14 source drift is never accepted',()=>withF(x=>{
 const file=OWNERS[0].files[0];fs.appendFileSync(path.join(x.root,file),'CHANGED SCIENCE');
 assert.throws(()=>plan(x.root,x.read,x.head,{write:true}),/Original scientific source changed/);
 assert.equal(fs.existsSync(path.join(x.root,OWNERS[1].files[0])),false);
}));
test('unrelated branch file is never overwritten in a composite',()=>withF(x=>{
 const file=OWNERS[4].files[0];const target=path.join(x.root,file);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'OTHER OWNER');
 assert.throws(()=>plan(x.root,x.read,x.head,{write:true}),/Unexpected pre-existing owner path/);
 assert.equal(fs.readFileSync(target,'utf8'),'OTHER OWNER');
}));
test('CRLF source checkout is permitted only when exact source text matches',()=>withF(x=>{
 const file=OWNERS[0].files[0];const originalText=x.base.get(file).toString('utf8');
 fs.writeFileSync(path.join(x.root,file),originalText.replace(/\n/g,'\r\n'));
 fs.writeFileSync(path.join(x.root,FW),x.base.get(FW).toString('utf8').replace(/\n/g,'\r\n'));
 assert.equal(plan(x.root,x.read,x.head).owners.length,12);
 assert.equal(same('a\r\nb','a\nb'),true);
 assert.equal(same('a\nb','a\nc'),false);
}));
test('one malformed source in late UI owner stops without partial writing',()=>withF(x=>{
 x.opts.corrupt=OWNERS[11].files[1];
 assert.throws(()=>plan(x.root,x.read,x.head,{write:true}),/unavailable source/);
 assert.equal(fs.existsSync(path.join(x.root,OWNERS[1].files[0])),false);
}));
test('shared native top-level lexical collisions fail, not hidden by isolated pass',()=>withF(x=>{
 x.opts.duplicate=true;
 assert.throws(()=>plan(x.root,x.read,x.head,{write:true}),/shared-scope parse\/collision/);
 assert.equal(fs.existsSync(path.join(x.root,OWNERS[1].files[0])),false);
}));
test('duplicate or foreign nested path in manifest cannot be smuggled',()=>{
 const clone=structuredClone(OWNERS);clone[11].files[0]=clone[10].files[0];
 assert.throws(()=>verifyManifest(clone),/Foreign or duplicate/);
 assert.throws(()=>safe('/tmp','desktop/tests/../../private.txt'),/Blocked overlay path/);
});
test('relative symlinked artifact is rejected',()=>withF(x=>{
 const dir=path.join(x.root,'desktop','tests');fs.mkdirSync(dir,{recursive:true});
 const p=OWNERS[11].files[1],target=path.join(x.root,p);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.symlinkSync(x.root,target,'dir');
 assert.throws(()=>safe(x.root,p),/Symlink source overlay/);
}));
test('native test manifest injection cannot silently duplicate missing or existing suites',()=>{
 assert.throws(()=>workflowPatch('no anchor'),/Missing or duplicate/);
 const source='      - name: Test CI suite manifest\n      - name: data\n  run: node desktop/tests/field-multiregion-views.test.cjs\n';
 assert.throws(()=>workflowPatch(source),/registered in baseline/);
});
test('all nine additive modules have readable native JS and distinct source owners',()=>{
 assert.equal(OWNERS.filter(x=>x.files.some(y=>y.startsWith(F)&&/^v2/.test(path.basename(y)))).length,8);
 const one=OWNERS.filter(x=>x.files.some(y=>y.startsWith(F)&&/^v2/.test(path.basename(y))));
 assert(one.every(x=>x.files.some(y=>y.endsWith('.spec.cjs')||y.endsWith('.test.cjs'))));
});

test('G7 joins the 12-source native product without touching scientific owner data',()=>{
 const own=OWNERS.find(o=>o.pr===205);
 assert.equal(own.sha,'fa864aac7c92b39dff6801e9ef1067008f6b986c');
 assert(own.files.includes('desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js'));
 assert(own.files.includes('tools/granada_g7_compact_workbench.test.cjs'));
 assert(!own.files.some(x=>x.includes('v14-')||x.includes('Program.cs')||x.includes('index.html')));
});
