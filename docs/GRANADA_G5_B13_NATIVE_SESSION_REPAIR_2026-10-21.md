# Operación Granada — source-owned native G5 screenshot / state repair
**2026-10-21 · FoamLens · stacked PR #203 on G5 owner #193.**

## Defects found in ACTUAL Windows WebView2 with original QuickCup B13

These are reproducible defects from Windows CI, not synthetic failures or product-release validation. There are no source or value changes to the original CFD measurements.

1. [Run 39595655524](https://github.com/michels-lab/FoamLens/actions/runs/39595655524): the original five-case B13 scientific smoke and metal+mold Field/View B/physical XYZ passed. G5 capture failed in Portable at **Time Series/wide**, reporting `modeOk=true; dataOk=true; titleOk=false`. The G5 host was inspecting text content of a Ribbon container, instead of the real `#flRaDataTimeSeries` command's accessible name. The new capture gate validates source command name, geometry, CSS and the original active Data mode/tab.
2. [Run 39627695096](https://github.com/michels-lab/FoamLens/actions/runs/39627695096): an outdated negative test still looked for `modeData/modeReview`, which no longer own Ribbon navigation. Updated against the original present `flRibbonTab-data`, `flRaReview`, `flRaLive` controls. Never weaken the live scientific assertions.
3. [Run 39628338679](https://github.com/michels-lab/FoamLens/actions/runs/39628338679): original B13 scientific smoke and **Portable passed** far enough to execute Inno Setup, then Installed failed the cross-session round-trip. G5's Time Series navigation contaminated the previously saved `catalog` Data view and left it as `timeseries`. G5 must restore the exact pre-audit view before native session smoke, not claim the source session was unchanged.
4. [Run 39630147562](https://github.com/michels-lab/FoamLens/actions/runs/39630147562): the capture of a lexical `currentDataView` sometimes returned no value through WebView2 `ExecuteScriptAsync`. Added fail-closed fallback to a **uniquely active real original dataset tab**; never infer from a guessed app mode or accept multiple active tabs.
5. [Run 39631585946](https://github.com/michels-lab/FoamLens/actions/runs/39631585946): the new source-checked state capture reached Portable but restoration failed with `{ok:false}`. Root cause: the source `setDataView(mode)` is not a callable global through the WebView2 host context, although the four original dataset tab buttons expose source-bound `.onclick` handlers. The latest patch dispatches the **actual** original tab `.click()` for the named pre-audit Data view, only if the control exists, is enabled and has its original handler. It restores Field layout via original Field button and verifies **exactly one** active Data tab equal to the original. If the target is absent/disabled/ambiguous or the source UI does not restore, it fails. The check is never short-circuited to claim success.

## Scope and limits

- Changed **only the stacked G5 native source compositor and its source-contract tests**, not scientific parsing, measured case files, original Field/Time Series app JS, or packaged release source.
- Private QuickCup fixture remains in trusted CI; no personal paths, sample temperatures or project credentials printed here.
- All existing strict scientific case, 5-case provenance, mesh, original View B, real Inno installed/portable, SHA and 36-picture requirements remain intact. No fabricated screenshots/CFD, no autopass.
- This repair is **not** a release. Owner's targeted Granada permits a FINAL stable release only after all release gates are green, including real Setup/Portable + visual review + exact integrated main/science/update checks; no RC.
- **Latest source QA:** verify exact new commit's CI before declaring success. Historical runs above are evidence of the specific failures, not proofs that latest branch passed.
