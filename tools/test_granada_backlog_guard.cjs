'use strict';
const assert=require('node:assert/strict');
const {summarize,admission,render,parseRepo,fetchPages,resolveAdmissionPr}=require('./granada_backlog_guard.cjs');
const makePr=n=>({number:n,title:'feat: unique module '+n,state:'open',draft:n%3===0,
  base:{ref:n===2?'stacked-parent':'main'},head:{ref:'branch-'+n}});
const prs=Array.from({length:13},(_,i)=>makePr(i+1));
prs[2].title='GRANADA G11: native B13 QA snapshot';
prs[1].base.ref='branch-1';
prs[4].base.ref='missing-other-branch';
const issues=[
  {number:1,state:'open',title:'real source bug'},
  {number:2,state:'open',title:'forward-compatible scientific roadmap'},
  {number:3,state:'open',pull_request:{url:'https://api.github.com/pulls/3'}},
  {number:4,state:'closed',title:'already fixed'}];
const result=summarize(prs,issues,{repository:'michels-lab/FoamLens'});
assert.equal(result.issues,2,'REST issues API includes PRs; must exclude them');
assert.equal(result.openPrs,13);
assert.equal(result.drafts,4);
assert.equal(result.stacked,2);
assert.deepEqual(result.historicalQaPrNumbers,[3]);
assert.deepEqual(result.branchDependencyNeedsReview,[5]);
assert.equal(result.congested,true);
assert.equal(admission(result,prs[3],'synchronize').allowed,true,'grandfather existing PR updates');
assert.equal(admission(result,prs[3],'opened').allowed,false,'new unrelated work freezes');
assert.equal(admission(result,{title:'[P0] fix critical security',body:'Original defect #230'},'opened').allowed,true);
assert.equal(admission(result,{title:'[P0] scary claim',body:'no actual issue'},'opened').allowed,false);
assert.equal(admission(result,{title:'[BACKLOG-CONSOLIDATION] G9/G10 evidence',body:'Supersedes #207 and #217'},'opened').allowed,true);
assert.equal(admission(result,{title:'[BACKLOG-CONSOLIDATION] vague',body:'Only #207'},'opened').allowed,false);
assert.equal(admission({...result,congested:false},prs[3],'opened').allowed,true);
const report=render(result,{allowed:false,reason:'freeze'});
assert(report.includes('Open issues (excluding PRs) | 2')&&report.includes('**Review only; never auto-close:** 3'));
assert(report.includes('not certify') && !report.includes('successfully merged'));
assert.throws(()=>parseRepo('../api'),/Invalid/);
assert.equal(parseRepo('michels-lab/FoamLens'),'michels-lab/FoamLens');
async function paginationTests(){
  const previous=global.fetch;let calls=0;
  try{
    global.fetch=async(url)=>{
      calls++;
      assert(url.startsWith('https://api.github.com/'));
      return{ok:true,headers:{get:()=>calls===1?'<https://api.github.com/repos/test/repo/pulls?page=2>; rel="next"':''},
        json:async()=>[{number:calls}]};
    };
    assert.deepEqual(await fetchPages('https://api.github.com/repos/test/repo/pulls'),[ {number:1},{number:2} ]);
    assert.equal(calls,2,'large PR/issue inventories require real pagination');
    global.fetch=async()=>({ok:false,status:403});
    await assert.rejects(fetchPages('https://api.github.com/repos/test/repo/pulls'),/HTTP 403/);
    global.fetch=async()=>({ok:true,headers:{get:()=>'<https://evil.invalid/leak>; rel="next"'},json:async()=>[]});
    await assert.rejects(fetchPages('https://api.github.com/repos/test/repo/pulls'),/Unsafe GitHub/);
  }finally{global.fetch=previous;}
}
async function delayedOpeningTests(){
  const old=global.fetch;
  const root='https://api.github.com/repos/michels-lab/FoamLens';
  const closed={number:356,state:'closed',merged_at:'2026-11-18T02:35:00Z',
    base:{repo:{full_name:'michels-lab/FoamLens'}}};
  let calls=0;
  try{
    // A queued "opened" run may execute after a legitimate squash merge.
    global.fetch=async(url)=>{
      calls++;assert.equal(url,root+'/pulls/356');
      return{ok:true,json:async()=>closed};
    };
    const found=await resolveAdmissionPr([],root,356,'opened','test-readonly');
    assert.equal(found.alreadyClosed,true,'closed original PR needs verified event-lifecycle handling');
    assert.equal(found.pr.number,356);
    assert.equal(calls,1,'only exact PR lookup is allowed, no broad search');
    const live={...closed,state:'open'};
    global.fetch=async()=>({ok:true,json:async()=>live});
    await assert.rejects(resolveAdmissionPr([],root,356,'opened',''),
      /Cannot verify newly opened PR from live inventory/,
      'a still-open PR missing from inventory must fail closed');
    global.fetch=async()=>({ok:true,json:async()=>({
      ...closed,base:{repo:{full_name:'malicious/other'}}})});
    await assert.rejects(resolveAdmissionPr([],root,356,'reopened',''),
      /Cannot verify newly opened PR from live inventory/,
      'no PR from another repository can bypass congestion');
    global.fetch=async()=>({ok:false,status:404});
    await assert.rejects(resolveAdmissionPr([],root,356,'opened',''),/HTTP 404/,
      'unverifiable or deleted PR must remain blocked');
    const present={...closed,state:'open'};
    global.fetch=async()=>{throw Error('do not call remote endpoint for existing PR')};
    const active=await resolveAdmissionPr([present],root,356,'opened','');
    assert.equal(active.alreadyClosed,false,'live open PR must retain backlog admission gate');
    assert.equal(active.pr,present);
    const unchanged=await resolveAdmissionPr([],root,356,'synchronize','');
    assert.equal(unchanged.alreadyClosed,false,'non-opening events remain read-only reporting');
    await assert.rejects(resolveAdmissionPr([],root,0,'opened',''),/invalid event number/);
  }finally{global.fetch=old}
}

paginationTests().then(()=>delayedOpeningTests()).then(()=>console.log('Granada backlog guard PASS: admission, stale merged-PR event, cross-repo rejection, paging and fail-closed API.'),
e=>{console.error(e);process.exitCode=1;});
