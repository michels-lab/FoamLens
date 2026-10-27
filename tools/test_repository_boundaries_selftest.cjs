#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const {eligible,scanSource,audit,failed,trackedPaths}=require('./test_repository_boundaries.cjs');

const SOURCE='desktop/tests/science.test.cjs';
const cases=[
  ['JS require copied Life', "const x = require('../michels-life/dashboard.js');", true],
  ['ES module copied InstaCleaner', "import cleaner from '../ig-cleaner/robots.js';", true],
  ['TypeScript from copied Loud project', "import {volume} from '../louderme/volume';", true],
  ['C# foreign namespace', 'using MichelsLife.Accounts;', true],
  ['Installer wrong product identity', 'AppId = "LouderMe";', true],
  ['JSON wrong app identity', '"productName": "InstaCleaner",', true],
  ['Test fixture crossed repository', 'const fixture = "fixtures/michels-life/user.json";', true],
  ['HTML injected foreign executable', '<script src="../ig-cleaner.js"></script>', true],
  ['Path without extension', 'const plugin = "../louderme/engine";', true],
  ['Absolute executable folder path', 'const moduleRoot = "/ig-cleaner/robots";', true],
  ['Template literal foreign path', 'const target = `../michels-life/dashboard`;', true],
  ['Foreign package namespace', 'const target = "com.michel.instacleaner.desktop";', true],
  ['Alternative appName key', '"appName": "LouderMe",', true],
  ['Alternative packageName key', '"packageName": "InstaCleaner",', true],
  ['Unrelated text mention is not executable reference', 'const note = "We discussed LouderMe design";', false],
  ['Own scientific extensionless module path', 'const plugin = "../openfoam/reader";', false],
  ['Foreign executable path', 'const binary = "../LouderMe.exe";', true],
  ['Foreign source file name', 'const harmless = 1;', false],
  ['Scientific calculation source', 'const phase = solidFraction + liquidFraction;', false],
  ['OpenFOAM dataset reference', 'const fixture = "tests/foam/solidification/case1.foam";', false],
  ['Ordinary owner provenance', 'const author = "Michel Duarte";', false],
  ['Doc-style human note', '// fixture used previously: insta-cleaner', false],
  ['No generic OpenFOAM suppression', 'const fixture = "fixtures/ig-cleaner/OpenFOAM/log";', true]
];
let passed=0;
for(const [label,text,expect] of cases){
  assert.equal(scanSource(SOURCE,text).length>0,expect,label);
  passed++;
}
assert.equal(scanSource('desktop/Michels-Life/README.cs','const x = 1;').length,1);
assert.equal(scanSource('docs/ARCHIVE.md','const fixture = "ig-cleaner.exe";').length,0);
assert.equal(scanSource('tools/test_repository_boundaries_selftest.cjs','const fixture = "ig-cleaner.exe";').length,0);
assert.equal(scanSource('index.html','<script src="../ig-cleaner.js"></script>').length,1);
assert.equal(eligible('desktop/FoamLens/Program.cs'),true);
assert.equal(eligible('index.html'),true);
assert.equal(eligible('assets/logo.svg'),false);
assert.equal(eligible('docs/GIT_AUDIT_LOG.md'),false);
passed+=8;

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'foam-boundary-'));
try{
  cp.execFileSync('git',['init','-q'],{cwd:temp});
  fs.mkdirSync(path.join(temp,'desktop','tests'),{recursive:true});
  fs.mkdirSync(path.join(temp,'docs'),{recursive:true});
  fs.writeFileSync(path.join(temp,'desktop','tests','safe.js'),'const T=273.15;');
  fs.writeFileSync(path.join(temp,'desktop','tests','leak.js'),"const fixture = '../ig-cleaner/accounts.json';");
  fs.writeFileSync(path.join(temp,'docs','history.md'),'copied ig-cleaner formerly');
  fs.writeFileSync(path.join(temp,'desktop','tests','oversize.js'),'a'.repeat(2*1024*1024+1));
  cp.execFileSync('git',['add','.'],{cwd:temp});
  const files=trackedPaths(temp);
  assert.equal(files.length,4,'tracked Git index must be used');
  let report=audit(temp,files);
  assert.equal(report.checked,2);
  assert.equal(report.findings.length,1);
  assert.equal(report.findings[0].app,'InstaCleaner');
  assert.deepEqual(report.skippedOversize,['desktop/tests/oversize.js']);
  assert.equal(failed(report),true);
  fs.rmSync(path.join(temp,'desktop','tests','leak.js'));
  report=audit(temp,files);
  assert.equal(report.unreadable.length,1,'missing tracked source must not silently pass');
  fs.writeFileSync(path.join(temp,'desktop','tests','leak.js'),'const U = 1;');
  fs.writeFileSync(path.join(temp,'desktop','tests','oversize.js'),'const U = 1;');
  report=audit(temp,files);
  assert.equal(failed(report),false);
  assert.equal(report.checked,4-1,'docs excluded');
  passed+=9;
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}
console.log('PASS: FoamLens boundary positive/negative/runtime scenarios ('+passed+' assertions)');
