#!/usr/bin/env node
'use strict';
/* Granada: FAIL-CLOSED and PINNED preview of five independently owned PRs.
 * Writes only to throwaway CI working tree, never original PRs or main. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {parseArgs}=require('node:util');
const BASE='771f1bf09b13f66765aefb111d332cda73e995bc';
const OWNERS=[
 {pr:162,sha:'f3a74ae88200a98df846fd6d113324f67dc8ea89',files:[
  'desktop/src/FoamLensDesktop/frontend/v14-field-view.js',
  'desktop/src/FoamLensDesktop/frontend/v14-z-field-compare.js',
  'desktop/tests/field-compare.test.cjs',
  'desktop/tests/field-multiregion-views.test.cjs']},
 {pr:175,sha:'18cc6462f671f3138a9581326ccf6d76a3af528d',files:[
  'desktop/src/FoamLensDesktop/frontend/v24-field-f2-viewport-layout.js',
  'desktop/tests/field-f2-runtime-interactions.spec.cjs',
  'desktop/tests/field-f2-viewport-layout.spec.cjs']},
 {pr:179,sha:'9840252445c4a8b5a26a2ab53db6edc38575eded',files:[
  'desktop/src/FoamLensDesktop/frontend/v24-granada-global-ux.js',
  'desktop/tests/granada-177-global-ux.spec.cjs',
  'desktop/tests/granada-177-ux-runtime.spec.cjs']},
 {pr:194,sha:'e60225630dc95d8a277c9090e110fbc874e75dfd',files:[
  'tools/granada-ui-audit/audit-diff.cjs',
  'tools/granada-ui-audit/audit-diff.test.cjs']},
 {pr:195,sha:'0321ab308cc88271d0bcd912eee5e772082c686b',files:[
  'desktop/src/FoamLensDesktop/frontend/v25-granada-field-source-dock.js',
  'desktop/tests/granada-177-g2-field-source-dock.test.cjs']}
];
const PRIMARY='desktop/src/FoamLensDesktop/frontend/';
const WORKFLOW='.github/workflows/build-foamlens-desktop.yml';
const UPDATED=new Set(OWNERS[0].files.slice(0,3));
const SHA=/^[a-f0-9]{40}$/;
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
// Windows git autocrlf may change only line endings; NEVER accept semantic changes.
const canonical=bytes=>Buffer.from(bytes).toString('utf8').replace(/\r\n/g,'\n');
const sameSource=(a,b)=>Buffer.from(a).equals(Buffer.from(b))||canonical(a)===canonical(b);
function shell(args,root){
 const r=cp.spawnSync('git',args,{cwd:root,encoding:null,maxBuffer:24*1024*1024,timeout:100000,windowsHide:true});
 if(r.error||r.status!==0)throw Error('Git '+args.slice(0,2).join(' ')+': '+String(r.error?.message||r.stderr?.toString('utf8')||r.status).slice(0,500));
 return r.stdout;
}
function safe(root,relative){
 if(!/^(?:desktop\/(?:src\/FoamLensDesktop\/frontend|tests)\/|tools\/granada-ui-audit\/)[a-zA-Z0-9_.\/-]+$/.test(relative)||
  relative.includes('..')||relative.includes('//')||relative.startsWith('/'))throw Error('Forbidden owner path');
 const dst=path.resolve(root,...relative.split('/'));
 if(!dst.startsWith(root+path.sep))throw Error('Destination escaped repo');
 let part=root;
 for(const segment of relative.split('/')){part=path.join(part,segment);if(fs.existsSync(part)&&fs.lstatSync(part).isSymbolicLink())throw Error('Symlinked source forbidden');}
 return dst;
}
function verifyManifest(owners=OWNERS){
 const expected=[162,175,179,194,195];
 if(owners.length!==expected.length||owners.some((x,i)=>x.pr!==expected[i]||!SHA.test(x.sha)||!x.files.length))throw Error('Missing, reordered or unpinned owner');
 const files=new Set();
 for(const entry of owners)for(const f of entry.files){
  if(files.has(f))throw Error('Overlapping ownership: '+f);files.add(f);
  if(f.includes('Program.cs')||f.includes('build-foamlens-desktop.yml'))throw Error('Forbidden native host/workflow override');
  // Unrecognized paths are rejected before any Git IO.
  if(!/^(?:desktop\/src\/FoamLensDesktop\/frontend\/v(?:14|24|25)-[\w.-]+\.js|desktop\/tests\/[\w.-]+\.(?:test|spec)\.cjs|tools\/granada-ui-audit\/audit-diff(?:\.test)?\.cjs)$/.test(f))
   throw Error('Unexpected owner file '+f);
 }
 if(files.size!==14)throw Error('Incorrect exact source file count');
 return files;
}
function workflowAdd(source){
 // Only the temporary copy is normalized; the original checkout is never committed.
 source=source.replace(/\r\n/g,'\n');
 const required=['field-multiregion-views.test.cjs','granada-177-g2-field-source-dock.test.cjs'];
 const anchor='      - name: Test CI suite manifest\n';
 if(!source.includes(anchor)||source.indexOf(anchor)!==source.lastIndexOf(anchor))throw Error('Mandatory test manifest anchor missing/duplicated');
 let updated=source;
 for(const name of required){
  const command='node desktop/tests/'+name;
  if(updated.includes(command))throw Error('This owner test already registered in baseline: '+name);
  updated=updated.replace(anchor,'      - name: Granada composite staging validation — '+name+'\n        shell: pwsh\n        run: '+command+'\n\n'+anchor);
 }
 return updated;
}
function checkSource(root,readFromOwner,expectedHead,{verifyOnly=false}={}){
 verifyManifest();
 if(typeof readFromOwner!=='function'||typeof expectedHead!=='function')throw Error('Invalid provider');
 const report={schema:'foamlens/granada-field-five-owner-preview/1',base_sha:BASE,
  result:verifyOnly?'VERIFIED_NOT_STAGED':'TEMPORARY_CI_STAGED',owners:[],baseline_files_untouched:[],
  frontend_modules:[],failClosed:true,merged:false,published:false,
  nativeInstalledVisualAccepted:false,physicalFieldF1Verified:false};
 const rootPath=fs.realpathSync(root);const bytes=new Map(),baseline=new Map();
 for(const entry of OWNERS){
  if(expectedHead(entry.pr)!==entry.sha)throw Error('Source PR moved: #'+entry.pr);
  const saved=[];
  for(const filename of entry.files){
   const dest=safe(rootPath,filename),exists=fs.existsSync(dest);
   if(UPDATED.has(filename)!==exists)throw Error('Unexpected existing/new source file: '+filename);
   if(exists){
    const before=fs.readFileSync(dest),canonical=readFromOwner(0,BASE,filename);
    if(!Buffer.isBuffer(canonical)||!sameSource(before,canonical))throw Error('Base source drift: '+filename);
    baseline.set(filename,before);
   }
   const buf=readFromOwner(entry.pr,entry.sha,filename);
   if(!Buffer.isBuffer(buf)||!buf.length||buf.length>4*1024*1024)throw Error('Invalid source blob: '+filename);
   if(filename.endsWith('.js')||filename.endsWith('.cjs')){
    try{new Function(buf.toString('utf8').replace(/^#![^\n]*\n/,''));}
    catch(e){throw Error('Owner module syntax failure: '+filename+' '+e.message);}
   }
   bytes.set(filename,buf);saved.push({file:filename,sha256:hash(buf)});
  }
  report.owners.push({pr:entry.pr,head_sha:entry.sha,files:saved});
 }
 // Compiles the new sibling modules in exact alphabetical native extension order
 // (inside a shared IIFE in Program.cs). Detect sibling top-level collisions.
 const ordered=[...bytes.keys()].filter(p=>p.startsWith(PRIMARY)&&p.includes('/v2')).sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}));
 try{new Function(ordered.map(p=>bytes.get(p).toString('utf8')).join('\n;\n'));}
 catch(e){throw Error('Shared native lexical collision: '+e.message);}
 report.frontend_modules=ordered.map(p=>({name:path.basename(p),sha256:hash(bytes.get(p))}));
 const workflowPath=path.join(rootPath,WORKFLOW),currentWorkflow=fs.readFileSync(workflowPath,'utf8');
 const baseWorkflow=readFromOwner(0,BASE,WORKFLOW);
 if(!Buffer.isBuffer(baseWorkflow)||!sameSource(Buffer.from(currentWorkflow),baseWorkflow))
  throw Error('Mandatory Windows workflow baseline drift');
 const augmented=workflowAdd(currentWorkflow);
 if(verifyOnly)return report;
 const touched=[];
 try{
  for(const [filename,buf] of bytes){
   const target=safe(rootPath,filename);fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.writeFileSync(target,buf,UPDATED.has(filename)?undefined:{flag:'wx'});
   touched.push({target,prior:baseline.get(filename)||null});
  }
  fs.writeFileSync(workflowPath,augmented);touched.push({target:workflowPath,prior:Buffer.from(currentWorkflow)});
 }catch(e){
  for(const {target,prior} of touched.reverse()){try{if(prior)fs.writeFileSync(target,prior);else fs.unlinkSync(target)}catch{}}
  throw e;
 }
 report.baseline_files_untouched=['desktop/src/FoamLensDesktop/Program.cs','desktop/src/FoamLensDesktop/frontend/index.html'];
 report.mandatory_test_manifest_augmented=2;
 return report;
}
function provider(root){
 const refs=new Map();
 // Phase one: check all remote exact SHA pins before fetching or writing.
 for(const entry of OWNERS){
  const current=shell(['ls-remote','origin','refs/pull/'+entry.pr+'/head'],root).toString('utf8').trim().split(/\s+/)[0];
  refs.set(entry.pr,current);
 }
 return{
  expectedHead:p=>refs.get(p),
  prepare(){
   for(const entry of OWNERS){
    if(refs.get(entry.pr)!==entry.sha)throw Error('Source PR moved: #'+entry.pr);
    const ref='refs/remotes/granada-field-preview/pr-'+entry.pr;
    shell(['fetch','--no-tags','origin','+refs/pull/'+entry.pr+'/head:'+ref],root);
    const got=shell(['rev-parse',ref],root).toString('utf8').trim();
    if(got!==entry.sha)throw Error('Fetched SHA drift: #'+entry.pr);
   }
   shell(['cat-file','-e',BASE+'^{commit}'],root);
   shell(['merge-base','--is-ancestor',BASE,'HEAD'],root);
  },
  source(pr,sha,filename){return shell(['show',(pr===0?BASE:sha)+':'+filename],root);}
 };
}
function main(argv=process.argv.slice(2)){
 const {values}=parseArgs({args:argv,options:{'verify-only':{type:'boolean'},report:{type:'string'}}});
 const root=fs.realpathSync('.'),p=provider(root);p.prepare();
 const report=checkSource(root,p.source,p.expectedHead,{verifyOnly:!!values['verify-only']});
 if(values.report){fs.mkdirSync(path.dirname(values.report),{recursive:true});fs.writeFileSync(values.report,JSON.stringify(report,null,2)+'\n');}
 console.log(report.result+' / 5 pinned owners / '+report.frontend_modules.length+' new frontend modules / no merge/release');
 return report;
}
if(require.main===module)try{main()}catch(e){console.error('GRANADA FIELD COMPOSITE BLOCKED: '+e.message);process.exitCode=2;}
module.exports={BASE,OWNERS,UPDATED,WORKFLOW,hash,sameSource,safe,verifyManifest,workflowAdd,checkSource,main};
