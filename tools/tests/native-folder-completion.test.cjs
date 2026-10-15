'use strict';
// Guard the real native host ordering: structural cache persistence is optional.
// This source contract supplements (does not replace) packaged Windows smoke tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = fs.readFileSync(path.join(__dirname, '../../desktop/src/FoamLensDesktop/Program.cs'), 'utf8');
const begin = host.indexOf('    private void EnumerateFolder(');
const end = host.indexOf('    private async Task HandleReadTextAsync', begin);
assert.ok(begin >= 0 && end > begin, 'Cannot locate native folder scan');
const scan = host.slice(begin, end);
const ready = scan.indexOf('type = "folderComplete"');
const persisted = scan.indexOf('NativeCaseCatalog.CommitAsync(');
assert.ok(ready > 0 && persisted > ready, 'Folder readiness must precede optional catalog IO');
assert.match(scan.slice(0, ready), /if \(chunk.Count > 0\) Post\(/,
    'Deliver the final file chunk before reporting completion');
assert.match(scan.slice(0, ready), /cancellationToken\.ThrowIfCancellationRequested\(\)/,
    'Honor cancellation before reporting readiness');
assert.match(scan, /catalogStatus = "deferred"/,
    'Do not claim optional catalog IO has completed');
assert.match(scan, /sourceBytes = scannedBytes/,
    'Report source volume from the enumerated files, not the deferred cache');
assert.match(scan, /catch \(OperationCanceledException\)[\s\S]*already delivered/,
    'Late cancellation must not retract a complete listing');
assert.match(scan, /if \(!exists\) complete = false/,
    'Do not cache a partial or racing filesystem walk as complete');
console.log('Native folder ready-before-cache contract PASS');
