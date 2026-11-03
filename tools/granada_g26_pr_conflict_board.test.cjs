'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {acceptedPath,kind,prInfo,overlaps,report,collect,REPO}=require('./granada_g26_pr_conflict_board.cjs');
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
function pull(n,title='FoamLens independent work') {
 return {number:n,title,html_url:'https://github.com/'+REPO+'/pull/'+n,
  draft:n%2===0,head:{sha:n===1?A:n===2?B:C},
  base:{ref:'main'},updated_at:'2026-10-23T12:00:00Z'};
}
function pr(n,paths) {return prInfo(pull(n),paths.map(filename=>({filename})),true);}
const main={commit:{sha:A}},release={tag_name:'v1.8.10',draft:false,prerelease:false};
const runs=[{id:11,name:'Build FoamLens Desktop for Windows',status:'completed',conclusion:'success',event:'pull_request',head_sha:A},
 {id:12,name:'Build FoamLens Desktop for Windows',status:'completed',conclusion:'failure',event:'push',head_sha:A},
 {id:13,name:'Build FoamLens Desktop for Windows',status:'completed',conclusion:'success',event:'push',head_sha:B}];

test('only read-only, FoamLens-scoped GitHub metadata API endpoints are allowed',()=>{
 for(const url of ['/repos/michels-lab/FoamLens/branches/main','/repos/michels-lab/FoamLens/pulls?state=open&per_page=100&page=4',
 '/repos/michels-lab/FoamLens/pulls/246/files?per_page=100&page=2',
 '/repos/michels-lab/FoamLens/releases/latest',
 '/repos/michels-lab/FoamLens/actions/runs?per_page=100'])assert.equal(acceptedPath(url),url);
 for(const s of ['/repos/other/private','/repos/michels-lab/FoamLens/actions/secrets',
 '/repos/michels-lab/FoamLens/releases','/repos/michels-lab/FoamLens/issues/5/comments',
 '/repos/michels-lab/FoamLens/pulls/245/merge','/repos/michels-lab/FoamLens/pulls?state=open&per_page=100&page=5'])
  assert.throws(()=>acceptedPath(s),/Disallowed/);
});
test('real product overlap is distinct from shared audit log and test-workflow collisions',()=>{
 const a=pr(1,['docs/GIT_AUDIT_LOG.md','desktop/src/FoamLensDesktop/Program.cs']);
 const b=pr(2,['docs/GIT_AUDIT_LOG.md','desktop/src/FoamLensDesktop/Program.cs','.github/workflows/test.yml']);
 const c=pr(3,['docs/GIT_AUDIT_LOG.md','.github/workflows/test.yml']);
 const d=pr(4,['docs/GIT_AUDIT_LOG.md','desktop/tests/new_case.test.cjs']);
 const x=overlaps([a,b,c,d]);
 assert.deepEqual(x.edges.map(e=>[e.a,e.b,e.severity]),[[1,2,'product'],[2,3,'workflow']]);
 assert.equal(x.risks.find(r=>r.number===1).product,1);
 assert.equal(x.risks.find(r=>r.number===4).n,0);
 assert.equal(kind('desktop/tests/new_case.test.cjs'),'test');
 assert.equal(kind('desktop/src/FoamLensDesktop/Program.cs'),'product');
});
test('only original push CI at exact main SHA counts; PR synthetic merge cannot pass',()=>{
 const x=report({main,release,prs:[pr(1,['desktop/src/FoamLensDesktop/Program.cs'])],runs});
 assert.equal(x.release.mainNativeBuildSucceeded,false);
 assert.equal(x.exactMainRuns.length,1);
 assert.equal(x.exactMainRuns[0].id,12);
 assert.equal(x.readyToRelease,false);
 assert.deepEqual(x.readyToMergeNumbers,[]);
});
test('even clean and fully green original-main CI cannot synthesize signed, numerical or owner proof',()=>{
 const x=report({main,release,prs:[],runs:[{...runs[0],event:'push'}]});
 assert.equal(x.release.mainNativeBuildSucceeded,true);
 assert.equal(x.release.signerProven,false);
 assert.equal(x.release.integratedScienceAndDpiApproved,false);
 assert.equal(x.readyToRelease,false);
});
test('incomplete PR file listing is explicit and never falsely exhaustive',()=>{
 const x=report({main,release,prs:[{...pr(1,['docs/GIT_AUDIT_LOG.md']),filesComplete:false}],runs}, {complete:false});
 assert.equal(x.coverage.filesComplete,false);
 assert.equal(x.coverage.reportIncludesAllOpenPrs,false);
});
test('missing main, release, workflow data or PR identity always fails',()=>{
 assert.throws(()=>report({main:{},release,prs:[],runs}),/MAIN/);
 assert.throws(()=>report({main,release:null,prs:[],runs}),/release/);
 assert.throws(()=>report({main,release,prs:[],runs:null}),/Incomplete/);
 assert.throws(()=>prInfo({number:5,head:{sha:'a'}},[],true),/identity/);
});
test('untrusted pull request title cannot produce source or head SHA identity',()=>{
 const p=prInfo(pull(1,'</script><script>alert(1)</script>'),[{filename:'docs/foo.md'}],true);
 assert.equal(p.title,'</script><script>alert(1)</script>');
 assert.equal(p.headSha,A);
 assert.equal(p.paths.length,1);
});
test('live API collector visits every relevant PR files page, no private/release mutation, and records source',async()=>{
 const paths=[];
 const fixtures=new Map([
 ['/repos/'+REPO+'/branches/main',main],
 ['/repos/'+REPO+'/releases/latest',release],
 ['/repos/'+REPO+'/actions/runs?per_page=100',{workflow_runs:runs}],
 ['/repos/'+REPO+'/pulls?state=open&per_page=100&page=1',[pull(1),pull(2)]],
 ['/repos/'+REPO+'/pulls/1/files?per_page=100&page=1',[{filename:'desktop/src/FoamLensDesktop/Program.cs'}]],
 ['/repos/'+REPO+'/pulls/2/files?per_page=100&page=1',[{filename:'desktop/src/FoamLensDesktop/Program.cs'}]]
 ]);
 const fake=async url=>{paths.push(url);assert(fixtures.has(url),'undocumented API call '+url);return fixtures.get(url)};
 const x=await collect(fake,'');
 assert.equal(x.mainSha,A);
 assert.equal(x.coverage.openPrs,2);
 assert.equal(x.coverage.sameFileProductOverlapPairs,1);
 assert.equal(x.analysisOnly,true);
 assert.deepEqual(x.sideEffects,[]);
 assert.equal(paths.length,7);
});
