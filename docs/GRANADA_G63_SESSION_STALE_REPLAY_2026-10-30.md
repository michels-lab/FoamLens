# FoamLens — Granada G63: restored Field race guard (2026-10-30)

## Failure class and owner
The original G60 asynchronous Field frame restore safely re-applied the saved Data plot after the original frame promise settled. However, that callback could settle after the user navigated away from Field or a newer session snapshot was restored. At that point replaying the **old** saved Data view would unexpectedly override newer user/restore state.

The issue is confined to the original session owner `desktop/src/FoamLensDesktop/frontend/v23-session-state.js`. No OpenFOAM parser, CFD values, field files, physical time, mesh, renderer, case catalog, updater or version changes.

## G63 change
- Increment `flSessionRestoreGeneration` at the start of every accepted `flSessionRestoreSnapshot`.
- Preserve G59 synchronous hydration and G60 post-frame hydration, but allow the latter only if the session generation is still current **and** the application is still in the originally restored mode.
- Preserve the original `whenRestored()` promise and original loaded-frame result, even when replay is correctly suppressed.
- Avoid a stale completion overwriting the restored Data plot after a user goes to Data or another saved snapshot supersedes the old one.

## Regression and validation
Existing `desktop/tests/session-persistence.test.cjs` now includes two new **production-function execution** scenarios, not just source-token assertions:
1. Field restored, user navigates to Data, old Field frame completes: old saved Catalog cannot be replayed onto Data.
2. Two Field restores overlap and complete out of order: only latest restore can replay its own plot state.

The original G59c synchronous and G60 asynchronous same-failure cases remain active. **15/15 checks passed in an isolated JavaScript execution of the real production session function and repository fixture texts**. Windows Installed and Portable smoke and exact-head repository CI still require independent acceptance. This branch is deliberately separate from the ongoing G37 real B13 six-cycle Windows execution, so the source and proof SHA are not changed underneath that running job.

## Explicit limits
This guard prevents **stale post-frame snapshot replay**. It does not claim to cancel or fully isolate an already-running underlying 3D field loader; that would require a separate owner-level cancellation audit. Do not imply this branch passed six native Windows cycles, scientific experimental validation or physical monitor-DPI acceptance.

**Release remains blocked by #238; no release or RC.**

## G63b — Field → Data → Field before an old frame resolves

- **New negative proof (2026-10-30):** the previous G63 guard only compared the final mode. A user can leave Field and return before the old frame settles, yielding the same final mode and bypassing the protection. A reproduction executes the original `flSessionPatchNavigation` wrapper together with `flSessionRestoreSnapshot`, not a mock direct mode setter.
- **Owner fix:** a genuine external mode change increments the restore generation after successful navigation, but calls made *inside* an active restore do not invalidate themselves. The old callback may finish loading its original frame; it cannot rehydrate a stale plot snapshot onto the new interaction. This does not claim to cancel the underlying field computation.
- **Negative/positive tests:** the exact original G63 branch source fails the added Field → Data → Field case. G63b passes, with all **16/16 session tests** green in an isolated execution of the actual repository test source and original production functions.
- **Commits:** [source e0d1a72](https://github.com/michels-lab/FoamLens/commit/e0d1a72669b17cb3a3eb46ff5243d0b117f5dc85), [test 04c2949](https://github.com/michels-lab/FoamLens/commit/04c29497e9d68648b7c84aa11503e0860920a086).
- Exact-head Windows native Installed/Portable and PR checks remain required; do not merge on local-test proof alone. G37 6/6 run on G62 main is independent and must not be cancelled. No release.

## G64 — exact-head Installed failure diagnosis (2026-10-30)

- The exact G63b native Windows candidate [run 41142146282](https://github.com/michels-lab/FoamLens/actions/runs/41142146282) reached **Portable PASS** including real OpenFOAM runtime, 3D and session flags, but failed in the **Installed** smoke on the original unweakened cross-session `savedDataViewEqualsRestored=false` invariant. The subsequent `capture_loaded_gpu_evidence.ps1` process-not-found exception occurred after the native process exited; it is secondary, not evidence of a GPU code defect.
- Root cause is **not yet proven**. Valid competing explanations include a skipped late snapshot replay after an actual mode/restore-generation change, a legitimate user mutation, or the original Data plot state being recaptured by a later navigation. The existing 16/16 isolated JS checks were insufficient to reproduce this Installed interleaving.
- G64 code instruments the original session replay with **bounded decision values only**: `pending`, `no-plots`, `superseded`, `mode-changed`, `applied`. Native C# smoke records a bounded `sessionReplayStatus` and, on failure, prints only booleans for stored/restored Catalog, restored Time Series, applied/superseded/mode-change. It **never** echoes the original QuickCup paths, field arrays, measured data or raw JSON into the public failure output.
- The original strict native cross-session equality guard remains unchanged. Same-failure source tests now enforce bounded-only diagnostic flags; **17/17 isolated session tests passed**, but Windows Installed+Portable must run on exact new head and an eventual real failure must be corrected, not bypassed.
- This G64 change is diagnostics only, not a claim that G63 Installed is repaired. Existing G37 real QuickCup six-cycle [run 41141234200](https://github.com/michels-lab/FoamLens/actions/runs/41141234200) remains a PASS for the older exact main SHA only, not evidence about this PR. No merge/release while installed failure persists.
