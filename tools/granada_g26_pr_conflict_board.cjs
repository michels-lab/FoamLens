#!/usr/bin/env node
'use strict';
// G26: read-only, exact-source evidence of FoamLens's independent PR workstreams.
// No merges, releases, secrets, proprietary QuickCup data or inferred QA passes.
const fs=require('node:fs');
const https=require('node:https');
const REPO='michels-lab/FoamLens', SHA=/^[0-9a-f]{40}$/;
const MAX_PAGES=4, PAGE_SIZE=100, MAX_PR_FILES=300;
function acceptedPath(path) {
 if(!/^\/repos\/michels-lab\/FoamLens\/(?:branches\/main|releases\/latest|pulls\?state=open&per_page=100&page=[1-4]|pulls\/\d+\/files\?per_page=100&page=[1-3]|actions\/runs\?per_page=100)$/.test(path)) throw Error('Disallowed read-only GitHub endpoint');
 return path;
}
function getJson(path,token=process.env.GITHUB_TOKEN||'') {
 acceptedPath(path);
 return new Promise((resolve,reject)=>{
  let total=0,s='';
  const req=https.get({hostname:'api.github.com',path,headers:{
   'User-Agent':'FoamLens-G26-readonly',
   'Accept':'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   ...(token?{Authorization:'Bearer '+token}:{})
  },timeout:18000},response=>{
   response.setEncoding('utf8');
   response.on('data',part=>{
    s+=part;total+=Buffer.byteLength(part);
    if(total>4*1024*1024)req.destroy(Error('Oversized public GitHub metadata'));
   });
   response.on('end',()=>{
    if(response.statusCode!==200)return reject(Error('GitHub read-only metadata HTTP '+response.statusCode));
    try{resolve(JSON.parse(s));}catch{reject(Error('Invalid GitHub JSON'));}
   });
  });
  req.on('timeout',()=>req.destroy(Error('GitHub metadata timeout')));
  req.on('error',reject);
 });
}
function kind(path) {
 if(/^docs\/|^(?:README|CHANGELOG|AGENTS|MICHELS_LAB_PROJECT)\b|^\.michelslab\//i.test(path))return 'documentation';
 if(/^\.github\/workflows\//.test(path))return 'workflow';
 if(/(^|\/)(?:test|tests|__tests__)\//i.test(path)||/\.test\.[cm]?js$/i.test(path))return 'test';
 return 'product';
}
function prInfo(p,files,complete=true) {
 if(!Number.isInteger(p.number)||p.number<1||!SHA.test(p.head?.sha||'')) throw Error('PR source identity incomplete');
 return {
  number:p.number,title:String(p.title||'').slice(0,220),url:String(p.html_url||''),
  headSha:p.head.sha,draft:p.draft===true,updatedAt:p.updated_at||null,
  base:p.base?.ref||'unknown',fileCount:files.length,filesComplete:complete,
  paths:[...new Set(files.map(x=>x.filename).filter(x=>typeof x==='string'&&x.length<=300))].sort()
 };
}
function overlaps(prs) {
 const edges=[],risk=new Map(prs.map(p=>[p.number,{n:0,product:0,workflow:0}]));
 for(let i=0;i<prs.length;i++)for(let j=i+1;j<prs.length;j++){
  const a=prs[i],b=prs[j],set=new Set(a.paths);
  const shared=b.paths.filter(f=>set.has(f)).sort();
  // Central audit-log edits are not evidence that two science features conflict.
  const owned=shared.filter(f=>kind(f)!=='documentation');
  if(!owned.length)continue;
  const byKind={product:[],workflow:[],test:[]};
  for(const path of owned)byKind[kind(path)].push(path);
  const severity=byKind.product.length?'product':byKind.workflow.length?'workflow':'test';
  edges.push({a:a.number,b:b.number,severity,shared:owned.slice(0,45),sharedTruncated:owned.length>45});
  for(const p of [a,b]){const state=risk.get(p.number);state.n++;state.product+=byKind.product.length;state.workflow+=byKind.workflow.length;}
 }
 return {edges,risks:prs.map(p=>({number:p.number,...risk.get(p.number)}))};
}
function report({main,release,prs,runs},retrieval={}) {
 const sha=main?.commit?.sha;
 if(!SHA.test(sha||''))throw Error('Missing exact current MAIN commit SHA');
 if(!Array.isArray(prs)||!Array.isArray(runs))throw Error('Incomplete PR/workflow evidence');
 if(!release||typeof release.tag_name!=='string')throw Error('Latest official release missing');
 if(release.prerelease===true||release.draft===true)throw Error('Latest stable release endpoint not a published stable');
 const {edges,risks}=overlaps(prs);
 const verifiedMainRuns=runs.filter(x=>x.head_sha===sha&&x.event==='push').map(x=>({
  id:x.id,name:x.name||'',conclusion:x.conclusion||null,status:x.status,sha:x.head_sha,
  url:x.html_url||null
 }));
 const codeOverlapEdges=edges.filter(e=>e.severity==='product');
 const safety={
  mainSha:sha,latestPublicStable:release.tag_name,
  ciForExactMain:verifiedMainRuns.length,
  mainNativeBuildSucceeded:verifiedMainRuns.some(x=>x.name==='Build FoamLens Desktop for Windows'&&x.status==='completed'&&x.conclusion==='success'),
  integratedScienceAndDpiApproved:false,
  signerProven:false,
  updaterProven:false,
  readyToPublish:false,
  reason:'This read-only PR board cannot certify physical DPI, proprietary numerical science, code-signing or updater distribution. The separate final native release-proof gate is authoritative.'
 };
 return {
  schema:'foamlens/granada-g26-pr-conflict-snapshot/1',repository:REPO,mainSha:sha,
  retrievedAt:new Date().toISOString(),release:safety,
  coverage:{openPrs:prs.length,inspectedPrFiles:prs.reduce((n,p)=>n+p.fileCount,0),
    filesComplete:prs.every(p=>p.filesComplete)&&retrieval.complete!==false,
    reportIncludesAllOpenPrs:retrieval.complete!==false,
    sameFileProductOverlapPairs:codeOverlapEdges.length,
    sameFileWorkflowOverlapPairs:edges.filter(e=>e.severity==='workflow').length,
    evidenceLimit:'Same-file overlap is not a true Git merge-conflict prediction. Unmerged PR feature work is NOT shipped and a draft PR is NOT approved.'},
  pulls:prs.map(p=>({...p,risk:risks.find(r=>r.number===p.number)})),
  overlaps:edges,exactMainRuns:verifiedMainRuns,
  analysisOnly:true,sideEffects:[],readyToMergeNumbers:[],readyToRelease:false
 };
}
async function collect(api=getJson,token=process.env.GITHUB_TOKEN||'') {
 const prefix='/repos/'+REPO;
 const [main,release,runsObject]=await Promise.all([
  api(prefix+'/branches/main',token),api(prefix+'/releases/latest',token),
  api(prefix+'/actions/runs?per_page=100',token)]);
 if(!Array.isArray(runsObject.workflow_runs))throw Error('Actions runs list not available');
 const prs=[];
 let allPages=false;
 for(let pg=1;pg<=MAX_PAGES;pg++){
  const page=await api(prefix+'/pulls?state=open&per_page=100&page='+pg,token);
  if(!Array.isArray(page))throw Error('Incomplete open PR listing');
  for(const p of page){
   const files=[];
   let complete=false;
   for(let filePage=1;filePage<=3;filePage++){
    const batch=await api(prefix+'/pulls/'+p.number+'/files?per_page=100&page='+filePage,token);
    if(!Array.isArray(batch))throw Error('Incomplete PR files listing: '+p.number);
    files.push(...batch);
    if(batch.length<100){complete=true;break;}
   }
   prs.push(prInfo(p,files.slice(0,MAX_PR_FILES),complete));
  }
  if(page.length<PAGE_SIZE){allPages=true;break;}
 }
 return report({main,release,prs,runs:runsObject.workflow_runs},{complete:allPages});
}
function cli(args=process.argv.slice(2)){
 if(args.length!==1||!/\.json$/.test(args[0]))throw Error('Usage: node granada_g26_pr_conflict_board.cjs output.json');
 return collect().then(data=>{
  if(!data.coverage.filesComplete||!data.coverage.reportIncludesAllOpenPrs)throw Error('PR file pagination incomplete; do not publish falsely exhaustive report');
  fs.mkdirSync(require('node:path').dirname(args[0]),{recursive:true});
  fs.writeFileSync(args[0],JSON.stringify(data,null,2)+'\n',{flag:'w'});
  console.log('G26 read-only live snapshot: '+data.coverage.openPrs+' open PRs, '+data.coverage.sameFileProductOverlapPairs+' product-source overlap pairs, main '+data.mainSha);
 });
}
if(require.main===module)cli().catch(e=>{console.error('G26 FAIL CLOSED: '+e.message);process.exitCode=1;});
module.exports={REPO,acceptedPath,kind,prInfo,overlaps,report,collect};
