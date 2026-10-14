# Native OpenFOAM temporal cache — correctness and performance block (2026-10-13)

## Scope
FoamLENS v1.8.2 first separated the usable 2D workspace from expensive solver analysis. This independent block adds a **per-user, disk-backed cache of parsed native OpenFOAM temporal arrays, probe metadata, and complete supported ASCII scalar/vector/tensor field results with their parsed boundary-patch provenance**. It accelerates a repeat import of unchanged, moderately large numeric time-series source files without creating new scientific results or silently reusing stale values.

The cache is not an excuse to skip solver audits, perform lossy sampling, or claim a faster end-to-end load of the owner's actual 3,008-file simulation. The owner screenshot was **184.8 seconds at 95%** on v1.8.1; before/after timings have not yet been obtained from that data.

## Exact cache contract

- Used by native `parseTemporalFile` and `parseOpenFOAMField` requests in Windows. Field entries are stored only if parsing succeeded, the ASCII field was closed, and the boundary-patch metadata has been decoded. Separate `temporal-v1` and `field-v1` cache directories avoid type cross-contamination. Files under 256 KiB, above 64 MiB, or when `FOAMLENS_DISABLE_TEMPORAL_CACHE=1` are parsed normally.
- Root: local per-user application data, `FoamLens/Desktop/ScientificCache/temporal-v1` or `field-v1` (not stored in the project's source directory or uploaded to GitHub). Cache filenames are SHA-256 of normalized source paths, not readable absolute paths.
- A **full SHA-256 of source bytes** must match the stored checksum, in addition to source file length and UTC last-write time. The parser also rechecks the source after a cold parse, and refuses to cache results from a file the solver changed mid-import.
- Cached payloads carry their own SHA-256, schema magic, source length/timestamp and source hash. Invalid/corrupt/truncated data are treated as a miss and reparsed. Cache writes use temporary files and atomic replacement, so interruption cannot publish partial data.
- Data are **lossless**: all sampled time and value columns, probe headers, source header text and byte provenance are serialized. IEEE NaN and infinities are preserved through explicit JSON floating-point handling. Nothing is decimated.
- Cache errors, unavailable write permissions and removed directories cannot prevent a normal scientific parse; cancellation is never swallowed. Each type's temporary disk cache is capped opportunistically to 2 GiB and each cached response at 32 MiB. Eviction is periodic, not a quadratic full-directory scan for every parsed file.
- **Privacy:** cache files contain a local copy of numerical scientific results. Do not send/share the cache directory. Folder tokens remain session-specific and are never stored. The environment toggle above offers immediate opt-out for sensitive machines.

## Regression and release gates

The Windows-compiled executable accepts `--temporal-cache-self-test` and runs without creating its WebView2 window. In addition to core checks, the test serializes/deserializes the **actual private native `TemporalParseResult` and `OpenFoamFieldParseResult` types**, verifying probe coordinates, exact physical units, metadata, NaN/infinity, 2D scalar-cell values, and field closure. The deterministic test checks:

1. Cold parse stores exact scientific values.
2. Warm parse uses the actual parsed cache and preserves NaN and positive infinity.
3. Replacing source bytes **without changing size or mtime** invalidates the cache via SHA-256.
4. Truncated/corrupt cache triggers a new parse rather than returning false scientific values.
5. Cancellation propagates and does not return a fabricated successful result.

Full CI must still compile Windows, run this executable test, real OpenFOAM QuickCup/VTK, portable/installed WebView2 Field/Data scientific smoke, the EULA, screenshots and updater regression before merge or release.

## Follow-up performance stages

A verified per-directory metadata catalog, end-to-end real-case parsing/first-interaction benchmark (cold/warm, bytes, file type mix, CPU/RAM peak), bounded worker scheduling and support for progressively visualizing million-cell 2D/3D fields remain separate engineering work. Native cache verification hashes necessarily read source bytes on warm import; actual speedup depends on data size, disk, format and number of fields. Do **not** claim completion of issue #117 until the actual owner dataset has been benchmarked and scientific output equivalence verified.
