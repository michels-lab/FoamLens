#!/usr/bin/env node
'use strict';
// Live, read-only GitHub facts. Never manufactures science/device acceptance.
// Does not acquire private QuickCup data or upload any downloaded source.
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const {SOURCE,REQUIRE_PRS}=require('./granada-release-proof.cjs');
const REPO='michels-lab/FoamLens';
function request(api,token){
 if(!/^\/(?:repos\/michels-lab\/FoamLens)(?:\/[a-zA-Z0-9_./?=&%-]+)?$/.test(api))throw Error('Unexpected GitHub API path');
 return new Promise((resolve,reject)=>{
  const req=https.get({hostname:'api.github.com',path:api,headers:{
   'Accept':'application/vnd.github+json',
   'User-Agent':'FoamLens-granada-readonly',
   'X-GitHub-Api-Version':'2022-11-28',
   ...(token?{'Authorization':'Bearer '+token}:{})
  },timeout:15000},res=>{
   let size=0,body='';
   res.setEncoding('utf8');
   res.on('data',part=>{size+=Buffer.byteLength(part);if(size>2*1024*1024){req.destroy(Error('GitHub response exceeds limit'));return;}body+=part;});
   res.on('end',()=>{
    if(res.statusCode===404)return resolve({notFound:true});
    if(res.statusCode!==200)return reject(Error('GitHub API HTTP '+res.statusCode));
    try{resolve(JSON.parse(body));}catch{reject(Error('Invalid GitHub JSON'));}
   });
  });
  req.on('timeout',()=>req.destroy(Error('GitHub read-only request timed out')));
  req.on('error',reject);
 });
}
async function collect(api=request,token=process.env.GITHUB_TOKEN||''){
 const prefix='/repos/'+REPO;
 const shaResponse=await api(prefix+'/git/ref/heads/main',token);
 const mainSha=shaResponse.object?.sha;
 if(!/^[a-f0-9]{40}$/.test(mainSha||''))throw Error('Invalid live main commit identity');
 const [file,latest,...prs]=await Promise.all([
  api(prefix+'/contents/desktop/src/FoamLensDesktop/FoamLensDesktop.csproj?ref='+mainSha,token),
  api(prefix+'/releases/latest',token),
  ...REQUIRE_PRS.map(n=>api(prefix+'/pulls/'+n,token))
 ]);
 if(file.encoding!=='base64'||typeof file.content!=='string')throw Error('Release version file was not downloaded');
 const xml=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
 const version=xml.match(/<Version>\s*(\d+\.\d+\.\d+)\s*<\/Version>/)?.[1];
 if(!version)throw Error('Authoritative native .csproj version missing');
 const requiredPRs=prs.map((p,i)=>({
  number:REQUIRE_PRS[i],merged:!!p.merged_at,
  mergeCommit:typeof p.merge_commit_sha==='string'?p.merge_commit_sha:null,
  state:p.state||'unknown'
 }));
 if(requiredPRs.some(p=>p.state==='unknown'))throw Error('Missing source PR audit evidence');
 const runData=await api(prefix+'/actions/workflows/build-foamlens-desktop.yml/runs?head_sha='+mainSha+'&per_page=50',token);
 if(!Array.isArray(runData.workflow_runs))throw Error('No GitHub workflow run listing');
 const workflowRuns=runData.workflow_runs.map(x=>({
  workflow:'build-foamlens-desktop.yml',headSha:x.head_sha,conclusion:x.conclusion,
  event:x.event,runId:x.id,status:x.status
 }));
 const versionString=latest.notFound?null:String(latest.tag_name||'').replace(/^v/,'');
 if(latest&&!latest.notFound&&!/^\d+\.\d+\.\d+$/.test(versionString))throw Error('Malformed latest release tag');
 return{
  schema:SOURCE,repository:REPO,mainSha,version,
  latestRelease:latest.notFound?null:{version:versionString,prerelease:latest.prerelease===true,
    publishedAt:latest.published_at||null,tag:latest.tag_name},
  requiredPRs,workflowRuns,
  evidenceNotice:'GitHub source/CI metadata only; real native scientific/setup/portable/screenshot/signing checks require separate proof.'
 };
}
async function main(args=process.argv.slice(2)){
 if(args.length>1)throw Error('Usage: node granada-github-snapshot.cjs [output.json]');
 const report=await collect();
 const payload=JSON.stringify(report,null,2)+'\n';
 if(args.length){
  const file=path.resolve(args[0]);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,payload,{flag:'wx'});
 }else process.stdout.write(payload);
 return report;
}
if(require.main===module){
 main().catch(e=>{process.stderr.write('FoamLens Granada GitHub snapshot FAILED: '+e.message+'\n');process.exitCode=1;});
}
module.exports={REPO,request,collect,main};
