# FoamLENS native OpenFOAM temporal scientific disk cache — 2026-10-13

## Goal and owner evidence
Owner reported FoamLENS v1.8.1 taking **184.8 seconds at 95%** on a 2D case containing **3,008 files**. v1.8.2 removes eager solver-audit/UI work, but warm reimports still parse unchanged temporal data. A professional numerical tool needs correct, persistent, measurable cache behavior; application size is not a constraint.

## Implementation (Windows Desktop native host)
- All native `parseTemporalFile` requests are routed through `ParseTemporalFileCachedAsync`, the same native endpoint used by production 2D timeseries. Other scientific types (spatial profiles, solver logs, mesh and volumetric fields) are **not** yet cached and must not be described as such.
- Location: per-user `%LOCALAPPDATA%\FoamLens\Desktop\scientific-cache\temporal-v1\`, outside the versioned application bundle. Canonical file names are **SHA-256 of normalized full source path** (no plaintext private scientific path in the cache filename).
- Each candidate **cache hit hashes every byte of the original file** with SHA-256; metadata `size + LastWriteTimeUtc ticks` are checked as an additional live-file guard, not as a substitute. Metadata comparisons alone are unsafe: a user may overwrite a value without changing size or mtime.
- Valid cache entries also require a matching scientific binary schema marker, full original source SHA-256, original source byte count, bounded probe and column counts, and a full SHA-256 hash of the cache file. Corrupt, incomplete, absent or modified cache entries **fall back to the original scientific parser**.
- Cold parsing hashes source before parsing and rehashes afterward. A changing live OpenFOAM result is parsed but **never cached** if the fingerprint changed. Atomic staged file writes avoid exposing incomplete payloads after ordinary interruption.
- Bounded native cache read/write throughput: six concurrent source hash operations and individual cache size limit of 512 MiB. Direct parsed result is always returned if cache write fails; cache can be completely bypassed via `FOAMLENS_DISABLE_TEMPORAL_CACHE=1`.
- Emit native operation completion provenance: `verified-disk-hit` or `source-parse`. No fabricated measured performance or generalization beyond temporal series.

## Verification
- Native Windows startup/smoke executes `RunTemporalCacheSelfTestAsync` with actual source and parsed values: first import cold, second exact hit, source modification with **same size and restored timestamp** forces a miss and returns changed numerical value, corrupted cache forces a miss and reparse.
- The normal Windows QuickCup/VTK + portable/installed WebView2 checks exercise the same .NET host. `desktop/tests/native-temporal-cache.test.cjs` enforces scientific integrity and test coverage at CI source level.
- Actual end-to-end cold/warm performance on the owner's original 3,008-file case remains **unmeasured**. Source hashing still costs linear disk I/O and may be slower on cold import; this version targets correct warm repeated temporal parsing, not instant full 3D field import.
- Other pending targets (issue #117): Native worker pipeline, profile and volumetric field caching, memory-mapped binary arrays, capped global-cache eviction, a 10k-step workload and owner-device numerical/time benchmark. A larger installer is acceptable if numerical accuracy and independent tests are maintained.

**Status:** Candidate native code for exact-head CI. No public release/tag and no claim that original 184.8-second cold load was eliminated.

## 2026-10-13 implementation follow-through: small temporal outputs and owner measurements

The frontend previously only called `parseTemporalFile` if the native file exceeded `FL_TEMPORAL_NATIVE_THRESHOLD`. A case with 3,008 small probe/timestep files therefore bypassed any native cache. Production `flReadTemporalColumns` now uses the native cached parser for **all nonempty token-backed temporal files**. An empty native parse explicitly falls back to the existing JS tokenizer rather than inventing samples. HTML-uploaded files without a native token still use the non-native parser.

The native `TemporalParseResult` now provides a structured `cacheStatus` value with the parsed T/Y data (`verified-disk-hit` or `source-parse`). The explicit `FoamLens_import_performance.json` diagnostic reports `nativeTemporalCacheHits` and `nativeTemporalSourceParses` as aggregated **counts only**, alongside measured parsing and UI timings. It does not export paths, names, private scientific fields or any hash of user files. Missing native data remain nullable rather than fabricated hits. The owner can compare first import and second import for the exact same source cases; overall load may still be I/O-bound.

CI source test `native-performance.test.cjs` was updated after Windows identified a stale direct-call assertion: it now requires the live native handler to use `ParseTemporalFileCachedAsync` and retain `ParseTemporalFileAsync` as the full numerical/cancellation fallback. The fast Node suite executes a **small** mock native output with and without numeric rows, exercising both cached-result and JS-fallback paths. Real .NET numerical cache invalidation continues to run during portable and installed Windows smoke.
