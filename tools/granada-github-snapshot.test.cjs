'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collect,REPO,request}=require('./granada-github-snapshot.cjs');
const {REQUIRE_PRS,SOURCE}=require('./granada-release-proof.cjs');
const HEAD='a'.repeat(40),MERGE='b'.repeat(40);
const response=new Map([
 ['/repos/'+REPO+'/git/ref/heads/main',{object:{sha:HEAD}}],
 ['/repos/'+REPO+'/contents/desktop/src/FoamLensDesktop/FoamLensDesktop.csproj?ref='+HEAD,
  {encoding:'base64',content:Buffer.from('<Project><PropertyGroup><Version>1.8.11</Version></PropertyGroup></Project>').toString('base64')}],
 ['/repos/'+REPO+'/releases/latest',{tag_name:'v1.8.10',prerelease:false,published_at:'2026-10-20T10:00:00Z'}],
 ['/repos/'+REPO+'/actions/workflows/build-foamlens-desktop.yml/runs?head_sha='+HEAD+'&per_page=50',
  {workflow_runs:[{head_sha:HEAD,event:'push',conclusion:'success',id:123,status:'completed'}]}]
]);
for(const n of REQUIRE_PRS)response.set('/repos/'+REPO+'/pulls/'+n,
 {number:n,state:'closed',merged_at:'2026-10-21T12:00:00Z',merge_commit_sha:MERGE});
function api(url){if(!response.has(url))throw Error('unrequested URL '+url);return Promise.resolve(response.get(url))}
test('takes main SHA, authoritative project version, real latest release, merged owner statuses and exact-build runs',async()=>{
 const result=await collect(api,'');
 assert.equal(result.schema,SOURCE);assert.equal(result.mainSha,HEAD);
 assert.equal(result.version,'1.8.11');assert.equal(result.latestRelease.version,'1.8.10');
 assert.equal(result.requiredPRs.length,REQUIRE_PRS.length);
 assert(result.requiredPRs.every(p=>p.merged&&p.mergeCommit===MERGE));
 assert.equal(result.workflowRuns[0].headSha,HEAD);
});
test('unmerged scientific or UX PR stays visibly unmerged rather than being inferred from CI',async()=>{
 const result=await collect(url=>url.endsWith('/pulls/162')?Promise.resolve({state:'open',merged_at:null,merge_commit_sha:HEAD}):api(url));
 assert.equal(result.requiredPRs[0].merged,false);
});
test('a missing latest release is distinct from fabricated release version',async()=>{
 const result=await collect(url=>url.endsWith('/releases/latest')?Promise.resolve({notFound:true}):api(url));
 assert.equal(result.latestRelease,null);
});
test('API lookup failure, missing source version and missing actions cannot produce a plausible report',async()=>{
 await assert.rejects(()=>collect(url=>url.endsWith('/pulls/194')?Promise.reject(Error('403')):api(url)));
 await assert.rejects(()=>collect(url=>url.includes('/contents/')?Promise.resolve({content:null}):api(url)));
 await assert.rejects(()=>collect(url=>url.includes('/actions/workflows/')?Promise.resolve({}):api(url)));
});
test('cannot request a non-FoamLens API resource',async()=>{
 await assert.rejects(()=>request('/repos/other-owner/Other/private'));
});
