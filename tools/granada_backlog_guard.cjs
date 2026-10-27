#!/usr/bin/env node
'use strict';
// Granada's read-only backlog convergence guard. Never merges/closes a GitHub resource.
// Requires Node 22; live calls need public GitHub API or an Actions read token.
const assert=require('node:assert/strict');

const DEFAULTS=Object.freeze({maxOpen:12,maxActive:8,maxWorkstreams:3});
function issueNumber(x){return x && Number.isInteger(x.number)?x.number:0}
function summarize(pulls,issues,opts={}){
  assert(Array.isArray(pulls)&&Array.isArray(issues),'verified issue and PR arrays required');
  const sorted=pulls.filter(p=>p.state==='open').slice().sort((a,b)=>a.number-b.number);
  const realIssues=issues.filter(x=>x.state==='open'&&!x.pull_request);
  const drafts=sorted.filter(p=>p.draft);
  const stacked=sorted.filter(p=>p.base && p.base.ref!=='main');
  const basenames=new Set(sorted.map(p=>p.head&&p.head.ref).filter(Boolean));
  const historicalQaCandidates=sorted.filter(p=>{
    const title=String(p.title||'').toLowerCase();
    return /(?:granada g(?:\d+|[a-z]\d+)).*(?:real|native|test|verify|repro|capture|qa)|^test\(/.test(title);
  });
  const danglingBases=stacked.filter(p=>!basenames.has(p.base.ref));
  const all=sorted.length;
  return {
    repository:opts.repository||'',
    issues:realIssues.length,openPrs:all,drafts:drafts.length,stacked:stacked.length,
    candidateHistoricQa:historicalQaCandidates.length,
    historicalQaPrNumbers:historicalQaCandidates.map(issueNumber),
    branchDependencyNeedsReview:danglingBases.map(issueNumber),
    exactOpenPrNumbers:sorted.map(issueNumber),
    congested:all>(opts.maxOpen??DEFAULTS.maxOpen),
    budget:opts.maxOpen??DEFAULTS.maxOpen,
    targets:{activePrs:opts.maxActive??DEFAULTS.maxActive,workstreams:opts.maxWorkstreams??DEFAULTS.maxWorkstreams},
    // No arbitrary 'fixed' estimate: implementation readiness needs source diff and exact SHA checks.
    warning:'QA candidate classification is heuristic, never an automatic closure or merge verdict.'
  };
}
function admission(snapshot,pr,action){
  if(action!=='opened'&&action!=='reopened')return{allowed:true,reason:'Inventory/report only: existing PRs are grandfathered.'};
  if(!snapshot.congested)return{allowed:true,reason:'Within backlog budget.'};
  const title=String(pr?.title||'');
  const body=String(pr?.body||'');
  const urgent=/\bP0\b|critical security|data loss|secret disclosure/i.test(title)
    && /#\d+|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+/i.test(body);
  const cleanup=/\bBACKLOG-CONSOLIDATION\b/i.test(title)
    && new Set((body.match(/(?:#|\/pull\/)\d+/g)||[])).size>=2;
  if(urgent)return{allowed:true,reason:'Documented urgent P0 exception; review scientific/source QA separately.'};
  if(cleanup)return{allowed:true,reason:'Documented consolidation replacing at least two existing PRs.'};
  return{allowed:false,reason:'Backlog FREEZE: integrate or archive evidenced older PRs first; no new unrelated implementation PR. Urgent P0 requires source issue link; consolidation requires >=2 predecessor PR links.'};
}
function render(snapshot,decision){
  const bullets=[
    '## GRANADA read-only backlog convergence',
    '',
    '| Measure | Actual |',
    '|---|---:|',
    '| Open issues (excluding PRs) | '+snapshot.issues+' |',
    '| Open PRs | '+snapshot.openPrs+' |',
    '| Draft PRs | '+snapshot.drafts+' |',
    '| Stacked PRs (base != main) | '+snapshot.stacked+' |',
    '| Historical QA **review candidates only** | '+snapshot.candidateHistoricQa+' |',
    '| Congestion limit | '+snapshot.budget+' |',
    '',
    '**Status:** '+(snapshot.congested?'CONGESTED — new noncritical PR freeze':'Within total PR budget'),
    '',
    '**Admission:** '+(decision.allowed?'allowed':'blocked')+' — '+decision.reason,
    '',
    '**Review only; never auto-close:** '+(snapshot.historicalQaPrNumbers.join(', ')||'none'),
    '',
    '**Stacked branch references needing manual review:** '+(snapshot.branchDependencyNeedsReview.join(', ')||'none'),
    '',
    'Scientific correctness, unique source code, full CI, and exact shipped release remain separate gates.',
    'This is a metadata inventory. It does not certify that a PR is redundant, complete, merged or releasable.'
  ];
  return bullets.join('\n')+'\n';
}
function parseRepo(value){
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(value||''))||String(value).split('/').some(part=>part==='.'||part==='..'))throw Error('Invalid GitHub owner/repo');
  return value;
}
async function fetchPages(uri,token){
  const results=[];
  let next=uri;
  for(let page=0;next&&page<20;page++){
    const response=await fetch(next,{headers:{
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      ...(token?{Authorization:'Bearer '+token}:{})
    }});
    if(!response.ok)throw Error('GitHub backlog API HTTP '+response.status+' at page '+(page+1));
    const body=await response.json();
    if(!Array.isArray(body))throw Error('GitHub backlog API response is not a list');
    results.push(...body);
    const link=response.headers.get('link')||'';
    const match=link.match(/<([^>]+)>;\s*rel="next"/);
    next=match?match[1]:null;
    if(next&&!next.startsWith('https://api.github.com/'))throw Error('Unsafe GitHub pagination link');
  }
  if(next)throw Error('GitHub backlog inventory too large; refused partial totals');
  return results;
}
async function main(){
  const repo=parseRepo(process.env.GRANADA_REPOSITORY||process.env.GITHUB_REPOSITORY||'michels-lab/FoamLens');
  const root='https://api.github.com/repos/'+repo;
  const token=process.env.GITHUB_TOKEN||'';
  const [prs,issues]=await Promise.all([
    fetchPages(root+'/pulls?state=open&per_page=100',token),
    fetchPages(root+'/issues?state=open&per_page=100',token)
  ]);
  const snapshot=summarize(prs,issues,{repository:repo});
  const number=Number(process.env.GRANADA_PR_NUMBER||0);
  const pr=prs.find(p=>p.number===number);
  const action=process.env.GRANADA_PR_ACTION||'';
  if(action==='opened'||action==='reopened'){
    if(!pr)throw Error('Cannot verify newly opened PR from live inventory; deny on missing evidence.');
  }
  const decision=admission(snapshot,pr,action);
  const message=render(snapshot,decision);
  process.stdout.write(message);
  if(process.env.GITHUB_STEP_SUMMARY){
    require('node:fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY,message);
  }
  if(!decision.allowed)process.exitCode=1;
}
if(require.main===module){
  main().catch(e=>{console.error('GRANADA inventory BLOCKED: '+e.message);process.exitCode=1});
}
module.exports={summarize,admission,render,parseRepo,fetchPages,DEFAULTS};
