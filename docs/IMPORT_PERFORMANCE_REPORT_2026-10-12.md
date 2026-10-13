# Scientific OpenFOAM import performance report — 2026-10-12

## Purpose
Owner's prior FoamLENS Desktop v1.8.1 screenshot reported **184.8 seconds for a 3,008-file 2D case at 95%**. A follow-up implementation must be benchmarked on the **same real dataset** to establish whether parsing, folder enumeration, scientific derived fields or rendering dominates. Synthetic UI regression milliseconds do not answer that question.

## User workflow
After importing a case, the **Project ready** modal includes **Export import performance (JSON)**. The export stays available if the user has not yet executed full solver Health/coupling audit. It explicitly records `fullAuditMs: null` when no completed full audit exists. A stage-wise `firstInteractiveMs` is available when measured, along with `totalParseAndMetadataMs`, `finalizeMs` and safe per-stage millisecond counters. The resulting file is `FoamLens_import_performance.json`; export does not claim GPU total VRAM or full-file byte throughput.

Only a fixed allowlist of numerical duration/count keys is exported. **No absolute directory names, case names, filenames, scientific field arrays, field units, solver values, or user identity** are serialized. JavaScript heap size is optional and null if unsupported by WebView2.

## Automated coverage
`desktop/tests/scientific-import-report.test.cjs` evaluates the actual source routine with a synthetic dataset containing canary private paths and field arrays; asserts privacy, truthful pending/null audit values, download wiring and numeric stage retention. Runs in both quick Node CI and exact Windows desktop regression.

## State and limitations
This performance report is an independent **future version** feature, **not part of the already validated v1.8.2 candidate** and not in its public binaries. A verified native cold/warm persistent cache and a 10k-time-step 2D benchmark remain the follow-up engineering targets tracked by issue #117. Publish only after full real QuickCup and Windows screenshots/installer validation.
