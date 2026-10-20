#!/usr/bin/env node
'use strict';
/* GRANADA — exact-source composite of Field F1, CAD, and Equivalent Observables.
   This changes ONLY an ephemeral CI checkout: never merge PR owner branches. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const BASE='529d7055a6d97d06d2ee4158e858de94037228d7';
const PRS={
  162:'f3a74ae88200a98df846fd6d113324f67dc8ea89',
  164:'68f56e176e6f0ce9ac95833acb196451f9dcb35a',
  165:'af64ef2ffd8d2f12024654986120653583f2ffcb'
};
const HOST='desktop/src/FoamLensDesktop/Program.cs';
const FIELD=['desktop/src/FoamLensDesktop/frontend/v14-field-view.js','desktop/src/FoamLensDesktop/frontend/v14-z-field-compare.js'];
const FTEST=['desktop/tests/field-multiregion-views.test.cjs'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function git(args,root,maxBuffer=16*1024*1024){
 const p=cp.spawnSync('git',args,{cwd:root,encoding:null,timeout:90000,maxBuffer,windowsHide:true});
 if(p.error||p.status!==0)throw Error('git '+args.slice(0,2).join(' ')+': '+String(p.stderr?.toString('utf8')||p.error?.message||p.status).slice(0,500));
 return p.stdout
}
function extract(doc,start,end,name){
 const a=doc.indexOf(start),b=a>=0?doc.indexOf(end,a+start.length):-1;
 if(a<0||b<0||doc.indexOf(start,a+start.length)>=0)throw Error(name+' owner block not unique');
 const block=doc.slice(a,b);
 if(block.length<400||block.length>18000)throw Error(name+' unexpected source length');
 return block.trimEnd()
}
function composeHost(main,field,cad,equivalent){
 const smokes={
  cad:extract(cad,'            // Confirm the CAD surface inspector is usable inside the real packaged WebView2.','\n            var hasBridge','CAD native smoke'),
  equivalent:extract(equivalent,'            // Granada #154: the actual packaged WebView2 must expose scientific','\n            var hasBridge','2D/3D native smoke')
 };
 const a='                    // Regression for the owner-reported View B defect:';
 const b='                    Log("FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed: " + viewBSmoke);';
 const idx=field.indexOf(a),last=field.indexOf(b,idx);
 if(idx<0||last<0||field.indexOf(a,idx+1)>=0)throw Error('Field F1 exact source block not found');
 smokes.field=field.slice(idx,last+b.length);
 const marker='            var hasBridge = await _web.CoreWebView2.ExecuteScriptAsync(';
 if(main.split(marker).length!==2||!main.includes('Mesh & Geometry Auditor')||!main.includes('meshAuditSurfaceJson'))
  throw Error('Preserve original native Mesh Auditor smoke; host anchor changed');
 const fieldMarker='                if (expectedPhysicalRegions.Length > 1)\n                {\n                    var evidence = Environment.GetEnvironmentVariable(';
 if(!main.includes(fieldMarker)||main.split(fieldMarker).length!==2)
  throw Error('Real OpenFOAM multiregion evidence guard changed');
 const composed=main.replace(marker,smokes.cad+'\n\n'+smokes.equivalent+'\n\n'+marker)
   .replace(fieldMarker,'                if (expectedPhysicalRegions.Length > 1)\n                {\n'+smokes.field+'\n                }\n\n'+fieldMarker);
 if(composed.includes('Mesh report inspector is not mounted')!==true||composed.split('meshAuditSurfaceJson').length<3)
  throw Error('Original checkMesh WebView2 coverage lost');
 for(const needle of ['FoamLens CAD STL/OBJ WebView2 smoke passed','equivalent-observables native WebView2 smoke failed','real OpenFOAM View B metal+mold and metric XYZ smoke passed']){
  if(!composed.includes(needle))throw Error('Missing integrated source smoke '+needle)
 }
 return{content:composed,smokes:Object.fromEntries(Object.entries(smokes).map(([k,v])=>[k,{bytes:Buffer.byteLength(v),sha256:hash(Buffer.from(v))}]))}
}
function assemble(root,options={}){
 const preview=!!options.verifyOnly;
 const cwd=fs.realpathSync(root);
 const originalHost=fs.readFileSync(path.join(cwd,HOST));
 const main=git(['show',BASE+':'+HOST],cwd);
 if(!originalHost.equals(main))throw Error('Native host drift from pinned baseline — refuse overwrite');
 const owner={},blobs={};
 for(const [num,sha] of Object.entries(PRS)){
  const got=git(['ls-remote','origin','refs/pull/'+num+'/head'],cwd).toString('utf8').trim().split(/\s+/)[0];
  if(got!==sha)throw Error('Source PR #'+num+' changed HEAD; pinned='+sha+' current='+got);
  const ref='refs/remotes/granada-host/pr-'+num;
  git(['fetch','--no-tags','origin','+refs/pull/'+num+'/head:'+ref],cwd);
  if(git(['rev-parse',ref],cwd).toString('utf8').trim()!==sha)throw Error('Source fetch SHA mismatch');
  const buf=git(['show',sha+':'+HOST],cwd);
  if(buf.length>4*1024*1024)throw Error('Unexpected C# host size');
  owner[num]=buf.toString('utf8');
 }
 const merged=composeHost(main.toString('utf8'),owner[162],owner[164],owner[165]);
 const sources={};
 for(const p of [...FIELD,...FTEST]){
  const file=path.resolve(cwd,...p.split('/'));
  if(!file.startsWith(cwd+path.sep)||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())throw Error('Unsafe original File path '+p);
  const original=fs.readFileSync(file),baseline=git(['show',BASE+':'+p],cwd);
  if(!original.equals(baseline))throw Error('Frontend baseline drift '+p);
  const contents=git(['show',PRS[162]+':'+p],cwd);
  if(!contents.length||contents.length>3*1024*1024)throw Error('Invalid Field F1 source '+p);
  if(p.endsWith('.js'))new Function(contents.toString('utf8'));
  if(p.endsWith('.cjs'))new Function('require','module','process',contents.toString('utf8'));
  blobs[p]={old:original,new:contents};
  sources[p]={original_sha256:hash(original),owner_sha256:hash(contents),source_pr:162};
 }
 const report={
  schema:'FoamLens-Granada-Native-Host-Merge-Candidate-v1',
  base_sha:BASE,source_pr_sha:PRS,original_mesh_auditor_smoke_preserved:true,
  candidate_host_sha256:hash(Buffer.from(merged.content)),original_host_sha256:hash(originalHost),
  composed_source_smokes:merged.smokes,staged_frontend:sources,
  native_host_status:preview?'COMPILED_SOURCE_PLAN_UNSTAGED':'TEMPORARY_CI_NATIVE_HOST_STAGED',
  release_authorized:false,merged_to_main:false,real_openfoam_multiregion_verified:false,
  setup_portable_accepted:false,scientific_approval:false
 };
 if(!preview){
  const written=[];
  try{
   for(const [p,pair] of Object.entries(blobs)){
    fs.writeFileSync(path.join(cwd,...p.split('/')),pair.new);written.push([p,pair.old])
   }
   fs.writeFileSync(path.join(cwd,HOST),merged.content);written.push([HOST,originalHost])
  }catch(e){
   for(const [p,old] of written.reverse())try{fs.writeFileSync(path.join(cwd,...p.split('/')),old)}catch{}
   throw e
  }
 }
 return report
}
function main(){
 const args=process.argv.slice(2),verifyOnly=args.includes('--verify-only');
 const reportPath=args.find(x=>x.startsWith('--report='))?.slice(9);
 const out=assemble(process.cwd(),{verifyOnly});
 if(reportPath){
  fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify(out,null,2)+'\n')
 }
 console.log('Granada host integration '+out.native_host_status+
  ' / original mesh check preserved / CAD, 2D3D and Field F1 smokes pinned / no release')
}
if(require.main===module)try{main()}catch(e){console.error('GRANADA NATIVE HOST BLOCKED: '+e.message);process.exitCode=2}
module.exports={BASE,PRS,HOST,FIELD,FTEST,hash,extract,composeHost,assemble};
