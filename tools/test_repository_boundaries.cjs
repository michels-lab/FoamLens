#!/usr/bin/env node
'use strict';

/**
 * FoamLens repository boundary regression.
 * Read-only and dependency-free. Checks tracked runtime/test fixtures without
 * treating historical documentation or intentional cross-project governance as code.
 * Run: node tools/test_repository_boundaries.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tracked = cp.execFileSync('git', ['ls-files', '-z'], {
  cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
}).split('\0').filter(Boolean);

const foreign = [
  { name: "Michel's Life", pattern: /(?:Michel['’]?s[ _-]*Life|michels[_-]life|life[_-]rpg|life[_-]dashboard)/i },
  { name: 'InstaCleaner', pattern: /(?:insta[_ -]?cleaner|ig[_-]cleaner)/i },
  { name: 'LouderMe', pattern: /louder[_ -]?me/i }
];
const runtimeRoots = /^(?:desktop\/(?:src|tests|developer|installer)\/|tools\/|scripts\/|assets\/|src\/|tests\/)/i;
const scriptExt = /\.(?:cs|js|cjs|mjs|ts|tsx|jsx|ps1|iss|html|json|yml|yaml|cmd|bat|sh)$/i;
const checked = [];
const failures = [];

for (const relative of tracked) {
  if (!runtimeRoots.test(relative) || !scriptExt.test(relative)) continue;
  if (relative === 'tools/test_repository_boundaries.cjs') continue;
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  if (fs.statSync(absolute).size > 2 * 1024 * 1024) continue;
  checked.push(relative);
  // A foreign name in comments or a shared rule is not necessarily a leak.
  // Flag only executable-looking imports, fixture paths or product identity keys.
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(?:\/\/|\*|#|<!--)/.test(line)) continue;
    if (!/(?:require\s*\(|from\s+['"]|import\s*\(|fixture|testdata|appId|assemblyName|productName|\.\.\/)/i.test(line)) continue;
    for (const item of foreign) {
      if (item.pattern.test(line)) failures.push(`${relative}:${i + 1}: possible ${item.name} artifact in FoamLens runtime/test ownership`);
    }
  }
}

console.log(`FoamLens repository-boundary audit: ${checked.length} tracked source/test files scanned`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: no foreign app fixture/import/product-identity signatures found in scanned files');
}
