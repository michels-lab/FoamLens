# FoamLens import diagnostics — privacy-safe input volume (2026-10-14)

## Motivation

The real 3,008-file 2D OpenFOAM import reported 184.8 seconds on v1.8.1. Stage timings alone cannot distinguish thousands of small files from a few huge native scalar/vector field files. This change augments the opt-in JSON report with volume and a fixed file-type mix; it is **not** itself an import speedup.

## Data contract

- `sourceBytesKnown`: sum of finite positive safe `File.size` properties only; `null` if no size was available. This is a **lower bound**, not total case bytes when unsized directory handles exist.
- `sourceBytesSizedFiles` and `sourceBytesUnknownFiles`: measured positive-size inputs vs unavailable/zero-placeholder size inputs. Direct browser directory handles intentionally return placeholder zero and are **not reopened** just to produce diagnostics.
- `sourceKindCounts`: fixed categories `timeseries`, `profile`, `log`, `runlog`, `field`, `ignore`, `unknown`. Any unrecognized category maps to `unknown`. No filenames, full paths, case names, field measurements, headers or solver values are exported.
- The report remains schema v1 with additive fields, preserving older report readers and user-owned privacy boundaries. Values reflect selected import inputs, including lazily indexed profiles, not every ignored file in a source directory.

## Test and limits

`desktop/tests/scientific-import-report.test.cjs` runs the actual frontend reporting function using secret-path/name canaries. It verifies known/unknown byte distinction, type allowlisting and JSON export privacy. Cold/warm timing on the *owner's actual 3,008-file case* and system RAM/VRAM observations remain required before issue #117 can close. Numeric source size does not measure loaded allocation, parsing throughput or a speedup.

## Release policy

Independent follow-up PR to current v1.8.3 candidate; no version bump or release from this branch. Run exact candidate-source CI before integration.
