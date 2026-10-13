'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const cache=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','TemporalScientificCache.cs'),'utf8');
const project=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
assert(/internal sealed partial class FoamLensForm : Form/.test(program),
  'Windows native FoamLens form must compile both cache and host as one partial type');
assert(cache.includes('internal sealed partial class FoamLensForm'),'Scientific cache must belong to actual desktop host');
assert(program.includes('ParseTemporalFileCachedAsync(path, requestId, operation.Token)'),
  'Real parseTemporalFile request must use the scientific cache, not a standalone demo');
assert(program.includes('cacheHit ? "verified-disk-hit" : "source-parse"'),
  'Native progress must distinguish verified cache hits from source parses');
assert(program.includes('await RunTemporalCacheSelfTestAsync()'),
  'Portable+Setup smoke must execute real exact-content invalidation cases');
assert(cache.includes('SHA256.HashDataAsync(stream, ct)'),
  'Every candidate cache hit must independently hash all original source bytes');
assert(cache.includes('CryptographicOperations.FixedTimeEquals(actual, supplied)'),
  'Byte corruption of the scientific cache must be detected before consuming data');
assert(cache.includes('File.SetLastWriteTimeUtc(source, originalTime)'),
  'Self-test must explicitly preserve mtime when changing a same-size scientific result');
assert(cache.includes('if (changedHit || changed.Columns[0].Y[2] != 90)'),
  'Source edits must refresh changed values, not return a stale cache hit');
assert(cache.includes('if (corruptHit || recovered.Columns[0].Y[2] != 90)'),
  'Corrupted cache must trigger a real scientific parse');
assert(cache.includes('FOAMLENS_DISABLE_TEMPORAL_CACHE'),
  'A scientist must be able to disable the cache for a trustworthy cold baseline');
assert(cache.includes('StableSource(path, length, ticks)')&&cache.includes('HashExactSourceAsync(path, ct)'),
  'Must invalidate live solver outputs changing while a cache is being populated');
assert(cache.includes('MaxTemporalCacheFileBytes')&&cache.includes('TemporalCacheIo'),
  'Bound individual cache payload size and concurrent source hash throughput');
assert(!cache.includes('AppRoot'), 'Persistent scientific cache may not live in the versioned frontend bundle');
assert(project.includes('<TargetFramework>net8.0-windows</TargetFramework>'),
  'Native cache self-tests must run on the actual Desktop Windows runtime');
console.log('FoamLENS native temporal-cache implementation and exact-content invalidation contracts PASS');
