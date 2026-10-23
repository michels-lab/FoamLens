'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {html}=require('./granada_g26_pr_conflict_html.cjs');
const {report,prInfo}=require('./granada_g26_pr_conflict_board.cjs');
const SHA='a'.repeat(40);
const malicious='</script><img src=x onerror=alert(1)>';
const pull=prInfo({number:27,title:malicious,draft:true,head:{sha:SHA},
 html_url:'https://github.com/michels-lab/FoamLens/pull/27'},[{filename:'desktop/src/FoamLensDesktop/Program.cs'}]);
const summary=report({main:{commit:{sha:SHA}},release:{tag_name:'v1.8.10',prerelease:false,draft:false},prs:[pull],
 runs:[]});
test('offline HTML escapes untrusted PR title and cannot inject executable script or image markup',()=>{
 const doc=html(summary);
 assert(doc.includes('\\u003c/script\\u003e')||doc.includes('\\u003c/script>')===false);
 assert(!doc.includes(malicious));
 assert(!doc.includes('onerror=alert(1)'));
 assert(doc.includes('textContent'));
 assert(doc.includes('granada-data'));
});
test('self-contained dashboard includes functional search, filter, safe links and overlap details',()=>{
 const doc=html(summary);
 for(const s of ['id="search"','id="risk"','addEventListener(\'input\',draw)','addEventListener(\'change\',draw)',
 'safeLink(', 'noopener noreferrer','id="collisions"','sameFileProductOverlapPairs','RELEASE BLOCKED'])
  assert(doc.includes(s),s);
});
test('never loads external images, trackers, scripts or fonts from network',()=>{
 const doc=html(summary);
 assert(!/<script[^>]+src=/i.test(doc));
 assert(!/<link[^>]+href=/i.test(doc));
 assert(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon|import\(/.test(doc));
 assert(doc.includes('noindex,nofollow'));
});
test('non-report or editable report cannot masquerade as read-only integration verdict',()=>{
 assert.throws(()=>html(null),/malformed/);
 assert.throws(()=>html({...summary,schema:'bad'}),/malformed/);
 assert.throws(()=>html({...summary,analysisOnly:false}),/non-read-only/);
});
