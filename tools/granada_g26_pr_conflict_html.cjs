#!/usr/bin/env node
'use strict';
// G26 self-contained OFFLINE viewer, generated from a READ-ONLY public repo snapshot.
// No remote scripts, tracking, data posting, third-party CSS, unsafe HTML interpolation.
const fs=require('node:fs'),path=require('node:path');
function html(report){
 if(report?.schema!=='foamlens/granada-g26-pr-conflict-snapshot/1'||report.analysisOnly!==true||
  !Array.isArray(report.pulls)||!Array.isArray(report.overlaps))
  throw Error('G26 refuses malformed or non-read-only evidence');
 const data=JSON.stringify(report).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const lines=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="robots" content="noindex,nofollow,noarchive">',
 '<title>FoamLens / Granada Integration Map</title>',
 '<style>',
 ':root{color-scheme:dark;font:14px system-ui,-apple-system,Segoe UI,sans-serif;background:#11131b;color:#e7eaf4}',
 '*{box-sizing:border-box}body{max-width:1450px;margin:auto;padding:25px 24px 50px}',
 'h1{letter-spacing:-.03em;font-size:clamp(26px,3vw,42px);margin:8px 0 4px}',
 '.muted{color:#a3a9ba}.eyebrow{color:#a2ccff;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:700}',
 '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:25px 0}',
 '.metric{border:1px solid #343a4d;border-radius:14px;background:#1b1f2c;padding:20px}',
 '.metric strong{font-size:30px;display:block}.metric span{color:#aab2c4;font-size:12px}',
 '.danger{color:#ffb7a6}.good{color:#a7f1c0}.warn{color:#ffd69b}',
 '.notice{padding:16px 0;border-top:1px solid #353a4a;border-bottom:1px solid #353a4a;line-height:1.55;margin:12px 0 25px}',
 '.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:20px 0}',
 'input,select{border:1px solid #50586d;background:#1b2030;color:#edf0fa;padding:11px 13px;border-radius:9px;min-height:42px}',
 'input{flex:1 1 310px}.listwrap{overflow:auto;border:1px solid #353b4e;border-radius:13px}',
 'table{width:100%;border-collapse:collapse;min-width:880px;text-align:left}',
 'th{font-size:11px;color:#aeb6cc;letter-spacing:.07em;text-transform:uppercase;background:#1c2130}',
 'td,th{border-bottom:1px solid #303546;padding:12px 13px;vertical-align:top}',
 'tbody tr:hover{background:#232a3c}a{color:#b1d7ff;text-decoration:none}a:hover{text-decoration:underline}',
 'code{font-size:12px;color:#b9c9e6;overflow-wrap:anywhere}.chip{font-size:11px;border:1px solid #666d80;padding:3px 6px;border-radius:6px}',
 'h2{margin:30px 0 10px;font-size:19px}.collisions{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:10px}',
 '.collision{background:#191e2a;border:1px solid #383e50;border-radius:11px;padding:15px}',
 '.paths{margin:8px 0 0;color:#aab1c3;overflow-wrap:anywhere;line-height:1.5}',
 '.small{font-size:12px}.footer{margin-top:30px;padding-top:17px;border-top:1px solid #343948}',
 '</style></head><body>',
 '<header><div class="eyebrow">Michel’s Lab / FoamLens / QA Only</div><h1>Integration &amp; ownership map</h1>',
 '<p class="muted">Read-only status of open PR workstreams. No merge or release is performed by this report.</p></header>',
 '<section class="grid" id="metrics" aria-label="Snapshot metrics"></section>',
 '<section class="notice" id="release-notice" aria-live="polite"></section>',
 '<h2>Open PR workstreams</h2>',
 '<div class="toolbar"><input id="search" type="search" placeholder="Filter by PR title, number, path…" aria-label="Filter workstreams">',
 '<select id="risk" aria-label="Filter ownership collisions"><option value="all">All workstreams</option>',
 '<option value="product">Same product file</option><option value="workflow">Same workflow file</option>',
 '<option value="none">No detected ownership collision</option><option value="draft">Draft only</option></select>',
 '<span class="muted small" id="count"></span></div>',
 '<div class="listwrap"><table><thead><tr><th>PR / workstream</th><th>State</th>',
 '<th>Product overlaps</th><th>Shared workflows</th><th>Head SHA</th></tr></thead><tbody id="prs"></tbody></table></div>',
 '<h2>Shared-source overlap pairs</h2><p class="muted small">Identical modified paths only; this is not a Git merge-conflict prediction. Documentation/log overlap is excluded.</p>',
 '<section id="collisions" class="collisions" aria-label="Overlap pairs"></section>',
 '<footer class="footer muted small" id="footer"></footer>',
 '<script type="application/json" id="granada-data">'+data+'</script>',
 '<script>',
 "'use strict';",
 "const info=JSON.parse(document.getElementById('granada-data').textContent);",
 "const el=id=>document.getElementById(id);",
 "function node(tag,txt,cls){const a=document.createElement(tag);if(txt!=null)a.textContent=String(txt);if(cls)a.className=cls;return a}",
 "function metric(value,label,klass){const d=node('div',null,'metric');d.append(node('strong',value,klass),node('span',label));el('metrics').append(d)}",
 "metric(info.coverage.openPrs,'Open PRs (not merged)');",
 "metric(info.coverage.sameFileProductOverlapPairs,'Shared product-source file pairs','warn');",
 "metric(info.coverage.sameFileWorkflowOverlapPairs,'Shared workflow-file pairs');",
 "metric(info.release.mainNativeBuildSucceeded?'YES':'NO','Full Windows build SUCCESS on exact original MAIN',info.release.mainNativeBuildSucceeded?'good':'danger');",
 "const notice=el('release-notice');",
 "notice.append(node('strong','RELEASE BLOCKED','danger'));",
 "notice.append(node('div','Latest public stable: '+info.release.latestPublicStable+' · Main: '+info.mainSha));",
 "notice.append(node('div','Native CI on exact main: '+info.release.ciForExactMain+' push runs; private quantitative science, physical DPI and signed distribution are NOT established by this report.'));",
 "notice.append(node('div','Repository coverage: '+(info.coverage.filesComplete&&info.coverage.reportIncludesAllOpenPrs?'COMPLETE':'INCOMPLETE — conclusions not exhaustive'),'muted'));",
 "const riskBy=new Map(info.pulls.map(p=>[p.number,p.risk]));",
 "function safeLink(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='github.com'&&u.pathname.startsWith('/michels-lab/FoamLens/pull/')?u.href:null}catch{return null}}",
 "function draw(){",
 " const q=el('search').value.trim().toLowerCase(),mode=el('risk').value;",
 " const parent=el('prs');parent.replaceChildren();let count=0;",
 " for(const p of info.pulls){const risk=riskBy.get(p.number)||{},matches=[String(p.number),p.title,...p.paths].join(' ').toLowerCase().includes(q);",
 " const filter=mode==='all'||mode==='draft'&&p.draft||mode==='product'&&risk.product>0||mode==='workflow'&&risk.workflow>0||mode==='none'&&risk.n===0;",
 " if(!matches||!filter)continue;count++;const tr=node('tr');const name=node('td');",
 " const link=safeLink(p.url);if(link){const a=node('a','#'+p.number+' · '+p.title);a.href=link;a.target='_blank';a.rel='noopener noreferrer';name.append(a)}else{name.append(node('span','#'+p.number+' · '+p.title))}",
 " name.append(node('div',p.fileCount+' modified paths','muted small'));tr.append(name);",
 " tr.append(node('td',p.draft?'DRAFT':'OPEN',p.draft?'warn':''));tr.append(node('td',risk.product||0));",
 " tr.append(node('td',risk.workflow||0));tr.append(node('td',p.headSha.slice(0,12),'small'));parent.append(tr);",
 " }el('count').textContent=count+' shown of '+info.pulls.length;",
 "}",
 "el('search').addEventListener('input',draw);el('risk').addEventListener('change',draw);draw();",
 "const holder=el('collisions');",
 "for(const entry of info.overlaps.filter(x=>x.severity==='product').slice(0,200)){",
 " const d=node('article',null,'collision');d.append(node('strong','#'+entry.a+' ↔ #'+entry.b+' · shared product code','warn'));",
 " d.append(node('p',entry.shared.join(' · ')+(entry.sharedTruncated?' (truncated)':''),'paths small'));holder.append(d);",
 "}",
 "if(!holder.children.length)holder.append(node('p','No same-product-file overlap detected. This does not certify compatibility.','muted'));",
 "el('footer').textContent='Captured: '+info.retrievedAt+' · Exact main '+info.mainSha+' · No uploads or automatic PR merges, and no real product acceptance is inferred.';",
 '</script></body></html>'
 ];
 return lines.join('\n');
}
function main(args=process.argv.slice(2)){
 if(args.length!==2||!/\.json$/.test(args[0])||!/\.html$/.test(args[1]))
  throw Error('Usage: node granada_g26_pr_conflict_html.cjs snapshot.json output.html');
 const report=JSON.parse(fs.readFileSync(args[0],'utf8'));
 const output=html(report);
 fs.mkdirSync(path.dirname(args[1]),{recursive:true});fs.writeFileSync(args[1],output);
 console.log('G26 offline conflict dashboard created; no external requests or tokens embedded');
}
if(require.main===module){try{main()}catch(e){console.error('G26 HTML REFUSED: '+e.message);process.exitCode=1;}}
module.exports={html};
