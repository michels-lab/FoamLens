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

## G67 — protected post-render restore when original Field frame is unavailable

- **Negative native result:** [CI 41144718413](https://github.com/michels-lab/FoamLens/actions/runs/41144718413) reached original Portable PASS but Installed failed strict cross-session Data restore. Bounded failure booleans established `savedCatalog=true`, `restoredTimeSeries=true`, `replayApplied=false`, `replaySuperseded=false`, and `replayModeChanged=false`; exact internal no-frame/pending/unavailable state was not yet distinguished. This is a genuine failed acceptance gate, not a GPU failure.
- **Direct source fix:** in `v23-session-state.js`, the saved Data/Analysis plot snapshot is now protected after synchronous rendering for *both* an original asynchronous Field-frame restore and the case where Field cannot schedule a frame (safe-mode fallback). Previously the no-frame branch returned a resolved `false` promise without its post-render replay, so renderer-induced Data `timeseries` could persist after restoring stored `catalog`.
- **Concurrency and data integrity:** keep G63 restore-generation and actual-mode guard; a newer accepted restore or genuine external navigation cancels stale plot replay. No fabricated OpenFOAM frame, field arrays, fluid/thermal values, or case-root modification. Maintain real `whenRestored()` semantics and differentiate the bounded status `applied-no-field` from `applied` after an actual Field restore.
- **Negative source execution:** added a test that executes the original production restore function with safe-mode Field fallback, a synchronous renderer that overwrites Catalog with Time Series, then awaits the guarded replay. Original pre-fix no-frame code cannot recover Catalog; the new source does, with no faux frame load and exactly two hydration passes. All **19/19 isolated session tests pass**.
- **Privacy diagnostic extension:** retain booleans for unavailable/no-field/pending replay, saved field selection, field mode and Data view; preserve the strict Installed equality invariant and private QuickCup source. Real Installed and Portable Windows result **must still pass** on exact updated PR head before merge; do not misrepresent 19 local tests as native success. Release #238 remains blocked.

## G68 — real native source/save provenance and diagnostic transport (2026-10-30)

- **Last exact native Installed regression:** [run 41146039044](https://github.com/michels-lab/FoamLens/actions/runs/41146039044) passed original QuickCup, Portable and several independent scientific/UX checks, but failed the original Installed cross-session equality: stored Data `catalog`, restored `timeseries`. Its log printed `replayUnavailable=true` and `fieldSelectionPresent=false`.
- **Critical correction of diagnosis:** the latter two flags were **not valid observations of actual WebView2 session state**. The old native JS `sessionSmoke` populated `sessionReplayStatus` and `sessionStoredFieldSelectionPresent`, but the enclosing result object did **not export** those values to C#. The native failure checker therefore treated them as missing. This is a smoke-result transport defect; do NOT attribute it to stale frontend packaging or missing Field selection without independent proof.
- **Second verified defect:** the smoke previously called `ss.save()` and ignored its boolean result, then immediately `ss.load()`. If the real session owner refused the save while a prior Field restore was active, the smoke could read an older persisted WebView2 snapshot and compare it as though it had been freshly stored. That possibility was not checked; whether it explains the Installed failure requires native acceptance.
- **G68 fix:** await the real `ss.whenRestored()` API, retry the original guarded `ss.save()` for a bounded 50 × 100 ms while respecting its existing protection; reject any false result before `ss.load()`. Reject snapshots without the original `fieldSelection` identity instead of silently comparing them. Require the current `replayStatus()` API; **export** bounded status, accepted fresh-save and selection presence in the actual smoke JSON. The C# validator now fails closed if those required flags are absent or false, without exporting case-root paths or scientific field values.
- **Same-failure executable tests:** the isolated test executes the original save-loop code with delayed true, permanently false and invalid previously stored snapshots. It requires no old-profile reads before success, no acceptance of an old snapshot, and a correctly transmitted bounded native result. Together with G59–G67 regressions, **21/21 source-executing session tests pass**.
- **Important:** this is a candidate correction of smoke freshness and evidence integrity; it does not declare the actual product bug or Installed outcome resolved. Only exact-head native Windows Installed+Portable CI may establish acceptance. Keep [PR #270](https://github.com/michels-lab/FoamLens/pull/270) draft and [#238](https://github.com/michels-lab/FoamLens/issues/238) release gate open. No RC/beta/release.
