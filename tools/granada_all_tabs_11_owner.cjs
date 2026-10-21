#!/usr/bin/env node
'use strict';
/* FoamLens Granada: one ephemeral, exact-SHA native checkout combining all
 * original Field F1/F2, global UX G0–G6, source G5 and Ctrl+K.
 * No merges, public tag, release or case data are touched. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {parseArgs}=require('node:util');
const BASE='771f1bf09b13f66765aefb111d332cda73e995bc';
const FW='.github/workflows/build-foamlens-desktop.yml';
const F='desktop/src/FoamLensDesktop/frontend/';
const OWNERS=[
 {pr:162,sha:'f3a74ae88200a98df846fd6d113324f67dc8ea89',files:[F+'v14-field-view.js',F+'v14-z-field-compare.js','desktop/tests/field-compare.test.cjs','desktop/tests/field-multiregion-views.test.cjs']},
 {pr:175,sha:'18cc6462f671f3138a9581326ccf6d76a3af528d',files:[F+'v24-field-f2-viewport-layout.js','desktop/tests/field-f2-runtime-interactions.spec.cjs','desktop/tests/field-f2-viewport-layout.spec.cjs']},
 {pr:179,sha:'9840252445c4a8b5a26a2ab53db6edc38575eded',files:[F+'v24-granada-global-ux.js','desktop/tests/granada-177-global-ux.spec.cjs','desktop/tests/granada-177-ux-runtime.spec.cjs']},
 {pr:180,sha:'62c807f37b26b3dad70fc440c60c223455aef89d',files:[F+'v24-granada-g4-review-live.js','desktop/tests/granada-177-g4-review-live.spec.cjs']},
 {pr:181,sha:'0b46e9049656f9f61c0ce89bd21965ec05447997',files:[F+'v24-granada-timeseries-t2.js','desktop/tests/granada-176-timeseries-ui.spec.cjs']},
 {pr:182,sha:'a23df3e238056857137b3b0885b8325780aed9de',files:['tools/granada_visual_review.cjs','tools/test_granada_visual_review.cjs']},
 {pr:183,sha:'1901bf7e58a0be2e066eb5c0b8ea4a7231fab6f1',files:[F+'v24-granada-g23-data-analysis.js','desktop/tests/granada-177-g23-data-analysis.spec.cjs']},
 {pr:184,sha:'5ca1a6788bcca9fbd0eeb2afaa6a47ed3e5e5d7d',files:[F+'v24-granada-g6-export-preflight.js','desktop/tests/granada-177-g6-export-preflight.spec.cjs']},
 {pr:194,sha:'e60225630dc95d8a277c9090e110fbc874e75dfd',files:['tools/granada-ui-audit/audit-diff.cjs','tools/granada-ui-audit/audit-diff.test.cjs']},
 {pr:195,sha:'0321ab308cc88271d0bcd912eee5e772082c686b',files:[F+'v25-granada-field-source-dock.js','desktop/tests/granada-177-g2-field-source-dock.test.cjs']},
 {pr:201,sha:'a359756982686e454dc9f2433912c966a7a6d784',files:[F+'v26-granada-command-search.js','tools/granada_command_search.test.cjs']},
 {pr:205,sha:'fa864aac7c92b39dff6801e9ef1067008f6b986c',files:[F+'v27-granada-compact-workbench.js','tools/granada_g7_compact_workbench.test.cjs']}
];
const original=new Set([F+'v14-field-view.js',F+'v14-z-field-compare.js','desktop/tests/field-compare.test.cjs']);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const same=(a,b)=>Buffer.from(a).equals(Buffer.from(b))||Buffer.from(a).toString('utf8').replace(/\r\n/g,'\n')===
  Buffer.from(b).toString('utf8').replace(/\r\n/g,'\n');
function verifyManifest(owners=OWNERS){
 const expect=OWNERS.map(x=>x.pr),ids=new Set(),paths=new Set();
 if(owners.length!==expect.length)throw Error('Twelve pinned source owners are required');
 for(let i=0;i<owners.length;i++){
  const x=owners[i],standard=OWNERS[i];
  if(x.pr!==expect[i]||!/^[a-f\d]{40}$/.test(x.sha)||x.sha!==standard.sha||
   !Array.isArray(x.files)||x.files.length!==standard.files.length)throw Error('Owner or HEAD pin drift');
  if(ids.has(x.pr))throw Error('Duplicate PR');ids.add(x.pr);
  for(let j=0;j<x.files.length;j++){
   const p=x.files[j];
   if(typeof p!=='string'||p!==standard.files[j]||p.includes('..')||paths.has(p))throw Error('Foreign or duplicate source path');
   if(!p.startsWith(F)&&!p.startsWith('desktop/tests/')&&!p.startsWith('tools/'))throw Error('Forbidden owner root');
   paths.add(p);
  }
 }
 if(paths.size!==28)throw Error('Source cardinality changed');
 return paths;
}
function safe(root,p){
 if(typeof p!=='string'||!p.length||p.includes('..')||p.includes('\\')||p.startsWith('/')||
  !/^[a-zA-Z0-9_./-]+$/.test(p)||p.split('/').some(x=>!x||x==='.')||
  !verifyPath(p))throw Error('Blocked overlay path');
 const dest=path.resolve(root,...p.split('/'));
 if(!dest.startsWith(root+path.sep))throw Error('Escaped checkout');
 let part=root;
 for(const x of p.split('/')){part=path.join(part,x);if(fs.existsSync(part)&&fs.lstatSync(part).isSymbolicLink())throw Error('Symlink source overlay');}
 return dest;
}
function verifyPath(p){return OWNERS.some(x=>x.files.includes(p))}
function workflowPatch(input){
 let text=String(input).replace(/\r\n/g,'\n');
 const anchor='      - name: Test CI suite manifest\n';
 if(text.split(anchor).length!==2)throw Error('Missing or duplicate native manifest anchor');
 for(const file of ['field-multiregion-views.test.cjs','granada-177-g2-field-source-dock.test.cjs']){
  const command='node desktop/tests/'+file;
  if(text.includes(command))throw Error('Suite registered in baseline already');
  text=text.replace(anchor,'      - name: Granada twelve-owner source test — '+file+
   '\n        shell: pwsh\n        run: '+command+'\n\n'+anchor);
 }
 return text;
}
function syntaxCheck(bytes){
 const files=[...bytes.keys()].filter(p=>p.startsWith(F)&&/^v2[4567]-/.test(path.basename(p)))
  .sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}));
 if(files.length!==9)throw Error('Exactly nine additive native frontend modules required');
 try{new Function(files.map(p=>bytes.get(p).toString('utf8')).join('\n;\n'));}
 catch(e){throw Error('Original native shared-scope parse/collision: '+e.message);}
 return files;
}
function plan(root,read,head,{write=false}={}){
 verifyManifest();const base=fs.realpathSync(root),bytes=new Map(),report={
  schema:'foamlens/granada-all-tabs-twelve-owner/1',base:BASE,staged:!!write,
  kind:'EPHEMERAL_TEST_ONLY',originalHomePageRetained:true,noRelease:true,
  owners:[],modules:[],testManifestRegisteredOnce:true
 };
 const current=fs.readFileSync(safeWorkflow(base)),reference=read(BASE,FW);
 if(!Buffer.isBuffer(reference)||!same(current,reference))throw Error('Native CI workflow main drift');
 const patched=workflowPatch(current);
 const existing=new Map();
 for(const own of OWNERS){
  if(head(own.pr)!==own.sha)throw Error('Owner PR moved #'+own.pr);
  const files=[];
  for(const p of own.files){
   const dest=safe(base,p),exists=fs.existsSync(dest);
   if(exists!==original.has(p))throw Error('Unexpected pre-existing owner path: '+p);
   if(exists){
    const prior=fs.readFileSync(dest),baseline=read(BASE,p);
    if(!Buffer.isBuffer(baseline)||!same(prior,baseline))throw Error('Original scientific source changed: '+p);
    existing.set(p,prior);
   }
   const b=read(own.sha,p);
   if(!Buffer.isBuffer(b)||b.length<10||b.length>5*1024*1024)throw Error('Unreadable source: '+p);
   if(p.endsWith('.js')||p.endsWith('.cjs'))try{
    new Function(b.toString('utf8').replace(/^#![^\n]*\n/,''));
   }catch(e){throw Error('Invalid original module '+p+': '+e.message);}
   bytes.set(p,b);files.push({name:p,sha256:hash(b)});
  }
  report.owners.push({pr:own.pr,sha:own.sha,files});
 }
 report.modules=syntaxCheck(bytes).map(p=>({name:p,sha256:hash(bytes.get(p))}));
 if(!write)return report;
 const done=[];
 try{
  for(const [p,b]of bytes){
   const dest=safe(base,p);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,b,original.has(p)?undefined:{flag:'wx'});
   done.push({dest,old:existing.get(p)||null});
  }
  fs.writeFileSync(safeWorkflow(base),patched);
  done.push({dest:safeWorkflow(base),old:current});
 }catch(e){
  for(const {dest,old}of done.reverse())try{if(old)fs.writeFileSync(dest,old);else fs.unlinkSync(dest);}catch{}
  throw e;
 }
 return report;
}
function safeWorkflow(root){return path.join(root,FW);}
function git(args,root){
 const res=cp.spawnSync('git',args,{cwd:root,encoding:null,timeout:110000,maxBuffer:30*1024*1024,windowsHide:true});
 if(res.error||res.status!==0)throw Error('Git operation '+args.slice(0,2).join(' ')+': '+String(res.error?.message||res.stderr?.toString('utf8')||res.status).slice(0,420));
 return res.stdout;
}
function provider(root){
 const current=new Map();
 for(const own of OWNERS){
  const sha=git(['ls-remote','origin','refs/pull/'+own.pr+'/head'],root).toString('utf8').trim().split(/\s+/)[0];
  current.set(own.pr,sha);
 }
 for(const own of OWNERS)if(current.get(own.pr)!==own.sha)throw Error('PR source changed: #'+own.pr);
 git(['cat-file','-e',BASE+'^{commit}'],root);
 git(['merge-base','--is-ancestor',BASE,'HEAD'],root);
 for(const own of OWNERS){
  const ref='refs/remotes/granada-11/pr-'+own.pr;
  git(['fetch','--no-tags','origin','+refs/pull/'+own.pr+'/head:'+ref],root);
  if(git(['rev-parse',ref],root).toString('utf8').trim()!==own.sha)throw Error('Fetched owner drift: #'+own.pr);
 }
 return{head:n=>current.get(n),read:(sha,p)=>git(['show',sha+':'+p],root)};
}
function main(args=process.argv.slice(2)){
 const {values}=parseArgs({args,options:{report:{type:'string'},'verify-only':{type:'boolean'}}});
 const root=fs.realpathSync('.'),p=provider(root);
 const result=plan(root,p.read,p.head,{write:!values['verify-only']});
 if(values.report){
  const target=path.resolve(values.report);
  if(!target.startsWith(root+path.sep))throw Error('Report must remain in checkout');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 }
 process.stdout.write(result.schema+' | '+result.owners.length+' immutable PR owners | '+result.modules.length+' native extension modules | '+(result.staged?'STAGED':'VERIFIED')+'\n');
 return result;
}
if(require.main===module)try{main()}catch(e){console.error('GRANADA ALL-TABS SOURCE BLOCKED: '+e.message);process.exitCode=2;}
module.exports={BASE,FW,F,OWNERS,original,same,hash,verifyManifest,safe,workflowPatch,syntaxCheck,plan,main};
