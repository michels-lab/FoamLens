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
