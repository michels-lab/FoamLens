# Real loaded OpenFOAM GPU process-counter capture — Windows packaged smoke

Date: 2026-10-12

## Problem addressed

The previous `foam-gpu-portable.json` and `foam-gpu-installed.json` were sampled just after process launch. They could not demonstrate GPU process counters while actual OpenFOAM metal/mold fields were loaded and rendered.

## New exact-artifact procedure

When the protected CI checks out the private QuickCup fixture, **both** Portable and installed Setup smoke hosts:

1. Open a real OpenFOAM case, verify physical metal/mold regions and scientific UI, render and capture evidence.
2. Write a unique readiness marker containing the live FoamLens.exe PID, exact checkout SHA, case path, UTC timestamp and the explicit *rendered OpenFOAM* phase.
3. Keep that same live WebView2 process and rendered case open until an external, bounded sampler acknowledges its observations.
4. The runner validates the readiness marker PID/SHA/phase, records three UTC-timestamped Windows `GPU Process Memory` counter snapshots, packages the raw time series and delta-eligibility diagnostics, then acknowledges the actual host.
5. Produce additional `foam-gpu-portable-loaded.json` and `foam-gpu-installed-loaded.json` artifacts, separately from the initial-launch snapshots.

The handshake is disabled when the fixture is unavailable and never activates for the normal interactive application. Stale markers, mismatched PID/commit and an unrendered startup phase fail closed; the app waits at most 45 seconds for the sampler after declaring readiness.

## Scope and limits

This is **real loaded-case process-counter evidence**, not an estimate of total graphics-driver VRAM and not a million-cell/owner-GPU benchmark. Dedicated/shared Windows GPU counters may be unavailable; in that case the report retains explicit `unavailable`/null rather than claiming 0 MB. An unstable or incompletely observed WebView2 child-PID set cannot yield a memory-growth delta. A three-sample hold is evidence of that loaded field, not a playback, unload or stress run.

Exact-head Windows compilation, PowerShell identity-regressions, QuickCup, Portable/Setup, EULA/shortcuts, native screenshots and hashes must still pass prior to merge. Do not close issue #40 or publish a release from this file.
