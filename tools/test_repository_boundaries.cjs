#!/usr/bin/env node
'use strict';

/**
 * FoamLens code/test ownership regression.
 * Examines tracked source-like text, not historical docs, binary data or scientific
 * results. A potential foreign app import/fixture/identity fails closed.
 *
 * node tools/test_repository_boundaries.cjs [--json]
 * Exported pure functions also support deterministic negative regression tests.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SELF = new Set([
  'tools/test_repository_boundaries.cjs',
  'tools/test_repository_boundaries_selftest.cjs'
]);
const FOREIGN = [
  {name: "Michel's Life", re: /(?:michel['’]?s[\s_-]*life|michels[_-]life|life[_-](?:rpg|dashboard))/i},
  {name: 'InstaCleaner', re: /(?:insta[\s_-]*cleaner|ig[_-]cleaner)/i},
  {name: 'LouderMe', re: /louder[\s_-]*me/i}
];
const OWNED = /^(?:desktop\/|tools\/|scripts\/|src\/|tests\/|assets\/|frontend\/|web\/|app\/|\.github\/workflows\/|index\.html$)/i;
const TEXT = /\.(?:cs|csproj|vb|fs|py|js|cjs|mjs|ts|tsx|jsx|html|css|json|xml|props|targets|config|yml|yaml|ps1|iss|cmd|bat|sh)$/i;
const CODE_REFERENCE = /\b(?:require\s*\(|import\s+|import\s*\(|from\s*['"]|using\s+|#include\s*[<"]|add_subdirectory\s*\(|source\s*\(|include\s*\()/i;
const PRODUCT_ID = /\b(?:appId|productName|assemblyName|executableName|applicationName|bundleId|packageId|shortcutName|appTitle)\b\s*['"]?\s*[:=]/i;
const DATA_REFERENCE = /(?:^|[^\w])(?:fixture|testdata|test[_-]?data|asset|resource|installer|release|artifact|binary|executable|targetpath|sourcepath|programfiles|appdata|desktopshortcut|appname)\b/i;
const PATH_REFERENCE = /(?:[./\\]|['"])[^'"]{0,140}(?:\.exe|\.dll|\.csproj|\.appx|\.msix|\.js|\.json|\.zip)\b/i;
const MAX_BYTES = 2 * 1024 * 1024;

function normalize(p) { return p.replace(/\\/g, '/'); }
function eligible(relative) {
  const p = normalize(relative);
  return !SELF.has(p) && OWNED.test(p) && TEXT.test(p);
}
function scanSource(relative, contents) {
  const findings = [];
  if (!eligible(relative)) return findings;
  for (const app of FOREIGN) {
    if (app.re.test(relative)) findings.push({path:relative, line:0, app:app.name, kind:'foreign-path'});
  }
  const lines = contents.split(/\r?\n/);
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    // Avoid historical commentary and governance prose. Suspicious executable
    // statements are checked, not every natural-language mention.
    if (/^\s*(?:\/\/|#(?!include)|\*|<!--|--)/.test(line)) continue;
    if (!CODE_REFERENCE.test(line) && !PRODUCT_ID.test(line) &&
        !DATA_REFERENCE.test(line) && !PATH_REFERENCE.test(line)) continue;
    for (const app of FOREIGN) {
      if (app.re.test(line)) findings.push({path:relative, line:i+1, app:app.name, kind:'cross-app-reference'});
    }
  }
  return findings;
}
function trackedPaths(root) {
  return cp.execFileSync('git', ['ls-files', '-z'], {
    cwd:root, encoding:'utf8', maxBuffer:32*1024*1024
  }).split('\0').filter(Boolean);
}
function audit(root=ROOT, paths=trackedPaths(root)) {
  const report = {schemaVersion:1, checked:0, skippedOversize:[], skippedLinks:[], unreadable:[], findings:[]};
  for (const relative of paths) {
    if (!eligible(relative)) continue;
    const full = path.join(root, relative);
    let stat;
    try { stat=fs.lstatSync(full); }
    catch(e) { report.unreadable.push({path:relative, reason:'unreadable tracked path'}); continue; }
    if (stat.isSymbolicLink()) { report.skippedLinks.push(relative); continue; }
    if (!stat.isFile()) continue;
    if (stat.size > MAX_BYTES) { report.skippedOversize.push(relative); continue; }
    try {
      report.findings.push(...scanSource(relative,fs.readFileSync(full,'utf8')));
      report.checked++;
    } catch(e) { report.unreadable.push({path:relative, reason:'cannot read file'}); }
  }
  return report;
}
function failed(report) {
  return report.findings.length>0 || report.unreadable.length>0 || report.skippedOversize.length>0;
}
if (require.main===module) {
  const json=process.argv.includes('--json');
  if (process.argv.some(x=>x!=='--json' && x.startsWith('--'))) {
    console.error('Usage: node tools/test_repository_boundaries.cjs [--json]');
    process.exit(2);
  }
  try {
    const report=audit();
    if (json) console.log(JSON.stringify(report,null,2));
    else {
      console.log('FoamLens repository boundary: '+report.checked+' tracked source/test files checked');
      for (const f of report.findings) console.error(f.path+':'+f.line+' '+f.app+' '+f.kind);
      for (const p of report.skippedOversize) console.error('UNINSPECTED oversized file: '+p);
      for (const p of report.unreadable) console.error('UNREADABLE '+p.path);
      console.log(failed(report) ? 'FAIL: inspect the named files before merge' :
        'PASS: no cross-app executable/fixture/product-identity signatures detected in inspected text');
      if (report.skippedLinks.length) console.log('Note: '+report.skippedLinks.length+' symlinks not inspected');
    }
    if (failed(report)) process.exitCode=1;
  } catch(e) {
    console.error('FoamLens ownership audit could not run: '+e.message);
    process.exitCode=2;
  }
}
module.exports={eligible,scanSource,audit,failed,trackedPaths};
