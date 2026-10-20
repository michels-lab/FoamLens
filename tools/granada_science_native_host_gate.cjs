#!/usr/bin/env node
'use strict';
/* Source-only audit of native host collisions. Never attempt automatic 3-way merge. */
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process'),path=require('node:path');
const SHA=/^[a-f0-9]{40}$/i;
const NATIVE_PR={162:'f3a74ae88200a98df846fd6d113324f67dc8ea89',164:'68f56e176e6f0ce9ac95833acb196451f9dcb35a',165:'af64ef2ffd8d2f12024654986120653583f2ffcb'};
const NATIVE_FILES=['desktop/src/FoamLensDesktop/Program.cs','.github/workflows/build-foamlens-desktop.yml'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function git(root,args,maxBuffer=8*1024*1024){
 const x=cp.spawnSync('git',args,{cwd:root,encoding:null,maxBuffer,timeout:120000,windowsHide:true});
 if(x.error||x.status!==0)throw Error('Git native host audit failed: '+args[0]+': '+
  String(x.stderr?.toString('utf8').slice(0,600)||x.error?.message||x.status));
 return x.stdout
}
function parseHunks(diff){
 const text=String(diff),out=[];
 const re=/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
 let match;
 while((match=re.exec(text))!==null){
  const start=Number(match[1]),count=match[2]==null?1:Number(match[2]);
  const end=count>0?start+count-1:start;
  out.push({base_start:start,base_end:end,base_length:count,new_start:Number(match[3]),
    new_length:match[4]==null?1:Number(match[4])})
 }
 return out
}
function hunkOverlap(a,b){
 // Include source-line insertion anchors to avoid ignoring adjacent insertions.
 return a.base_start<=b.base_end&&b.base_start<=a.base_end
}
function analyze(base,variants,files=NATIVE_FILES){
 const collisions=[],perFile={};
 for(const filename of files){
  const variantsForFile=[];
  for(const [owner,source] of Object.entries(variants)){
   const doc=source[filename];if(!doc)throw Error('Missing original native variant '+owner+' '+filename);
   variantsForFile.push({pr:Number(owner),sha256:hash(doc.bytes),size:doc.bytes.length,
     change_hunks:parseHunks(doc.diff),changed:doc.bytes.compare(base[filename])!==0})
  }
  const overlappingPairs=[];
  for(let i=0;i<variantsForFile.length;i++)for(let j=i+1;j<variantsForFile.length;j++){
   const a=variantsForFile[i],b=variantsForFile[j],ranges=[];
   for(const left of a.change_hunks)for(const right of b.change_hunks)
    if(hunkOverlap(left,right))ranges.push({left,right});
   if(ranges.length)overlappingPairs.push({left_pr:a.pr,right_pr:b.pr,overlap_count:ranges.length,base_line_pairs:ranges.slice(0,16)})
  }
  perFile[filename]={original_sha256:hash(base[filename]),variants:variantsForFile,
    overlapping_pairs:overlappingPairs};
  collisions.push(...overlappingPairs.map(x=>({...x,file:filename})))
 }
 return{
  schema:'FoamLens Granada native-host three-owner gate v1',
  candidate:'FRONTEND_ONLY_NOT_NATIVE_HOST_MERGE',
  source_sha:NATIVE_PR,
  hostIntegration:'BLOCKED_REQUIRES_CONFLICT_RESOLUTION_AND_WINDOWS_QA',
  originalHostLeftUnchanged:true,
  CAD_stepIgesBrepSupported:false,
  CAD_stlObjSourceModuleOnly:true,
  fieldF1NativeRegionSupportIntegrated:false,
  scientific2D3DHostIntegration:false,
  files:perFile,collisions,
  realMultiregionVerified:false,installedWindowsVerified:false,ownerApproved:false,
  nextRequired:['Resolve original Program.cs changes for #162/#164/#165 with explicit owners',
   'Resolve original build workflow changes, build both desktop editions',
   'Run field multi-region source-backed case and CAD STL/OBJ actual import/export',
   'Confirm no false STEP/IGES claim, DPI/installed/portable visuals and user approval']
 }
}
function main(argv=process.argv.slice(2)){
 const outFile=argv[0]||'artifacts/granada-science-host-conflicts.json';
 const root=process.cwd(),manifest=JSON.parse(fs.readFileSync('tools/granada_composite_manifest.json','utf8'));
 if(!SHA.test(manifest.base_sha))throw Error('Bad base');
 for(const [pr,sha] of Object.entries(NATIVE_PR)){
  const current=git(root,['ls-remote','origin','refs/pull/'+pr+'/head']).toString('utf8').trim().split(/\s+/)[0];
  if(current!==sha)throw Error('Native host PR #'+pr+' changed HEAD, regenerate this gate');
  const ref='refs/remotes/granada-native-review/pr-'+pr;
  git(root,['fetch','--no-tags','origin','+refs/pull/'+pr+'/head:'+ref]);
  if(git(root,['rev-parse',ref]).toString('utf8').trim()!==sha)throw Error('Wrong fetched SHA')
 }
 const originals={};
 for(const filename of NATIVE_FILES)originals[filename]=git(root,['show',manifest.base_sha+':'+filename]);
 const variants={};
 for(const [pr,sha] of Object.entries(NATIVE_PR)){
  variants[pr]={};
  for(const filename of NATIVE_FILES)variants[pr][filename]={
   bytes:git(root,['show',sha+':'+filename]),
   diff:git(root,['diff','--unified=0',manifest.base_sha,sha,'--',filename]).toString('utf8')
  }
 }
 const report=analyze(originals,variants);
 fs.mkdirSync(path.dirname(path.resolve(outFile)),{recursive:true});
 fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');
 console.log('Granada native-host gate: '+report.hostIntegration+
  '; overlapping edit pairs='+report.collisions.length+'; no native host source changed');
 return report
}
if(require.main===module)try{main()}catch(e){console.error(e.message);process.exitCode=2}
module.exports={NATIVE_PR,NATIVE_FILES,parseHunks,hunkOverlap,analyze,main};
