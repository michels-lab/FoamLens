# FoamLens — GRANADA G14 / Play P0 native installed telemetry (2026-10-22)

## Known hard evidence and true uncertainty

- Actual G12 integrated source was accepted in [B13 run #39865252132](https://github.com/michels-lab/FoamLens/actions/runs/39865252132), including genuine Setup and Portable. On a later exact G13 temporary integration, [run #39871991261](https://github.com/michels-lab/FoamLens/actions/runs/39871991261) passed **raw/uninstalled** Windows Field at 1140 and 640 CSS px, all original five B13 QuickCup metal/mold/physics checks and 7/7 Camera controls (95px each, shelf within 1140px). The actual **Portable** runtime at 1140px then failed original `playNotCollapsed=false` while clock/physical field/region/camera tests remained true.
- The native condition is a conjunction of **width ≥100px, height ≥28px, original `scrollWidth<=clientWidth+2` text fit, Play/Reproducir visible label and loop/bucle in aria-label**. Old Windows failure log did not record each subcondition, so a particular font, CSS, initialization timing or translated-label explanation is NOT yet proven. See [P0 #230](https://github.com/michels-lab/FoamLens/issues/230).

## Source-isolated diagnostic package (4 deliverables)

1. `tools/granada_g14_native_play_telemetry.cjs` is **test-only** and injects a passive JS object into a disposable native `Program.cs` exactly once, AFTER G13 original Camera gate injection and BEFORE app bundling/build. It does not edit tracked product UI source on G13 or main. An exact-source guard refuses to install if original `playNotCollapsed` or the report shape changed.
2. Per Field viewport the real installed WinForms/WebView2 logs will now record **each original Play condition separately**, CSS pixel box, offset/client/scroll widths/heights, original text+aria/title, computed font family/size/weight/line-height/padding/grid overflow, real group/transport/ribbon rects, `document.fonts.status`, stylesheet G12/G13 presence, device pixel ratio and the live original physical time. PASS/FAIL is informational; original native conjunctive Play condition stays unchanged and still blocks native QA.
3. `tools/test_granada_g14_native_play_telemetry.cjs` simulates independent scroll-overflow, clipped dimensions, missing label, aria and G12 stylesheet, verifies the exact old native conjunction remains source-identical, and tests one-time fail-closed injection. Two OS workflow `.github/workflows/granada-g14-play-telemetry.yml` and existing cross-repo boundary audit.
4. The original full scientific Windows B13 workflow uses a separate stack [G14 test-only native PR](https://github.com/michels-lab/FoamLens/pulls) on top of the G13 native test PR #229, exact-pinned existing G13 code. An `if: always()` post-installed step preserves the **actual last installed/portable native log** under `artifacts/granada-installed-portable/evidence/granada-g14-last-native-play.log`, plus existing `field-failed-wide.png` if captured, even when the original Windows setup script correctly throws. The original evidence upload is also fail-safe; no binaries or cases are uploaded.

## Interpretation and acceptance

- If `rectWidthAtLeast100=false`: inspect original Field/G12 style specificity and actual DOM position / late re-render. If `textFitsClient=false`: inspect computed font/Play text, loader completion and text width while keeping readable labels. If `loopAccessible=false` or `labelPresent=false`: trace original playback state/translation, not CSS widths.
- Compare **raw**, **portable**, and **installed** runs on the same exact pinned source and original measured physical time 9.8 seconds at 1140 and 640 px. Under no circumstance change native `playNotCollapsed`, substitute simulated case results, force click UI controls, or infer success from a green source-only workflow.
- Do **not** merge G13 source PR #228 until the full real Setup+Portable B13 workflow passes original physical/Field/Camera/Play checks at both viewports and source captures can be inspected. Physical OS DPI 125/150/175/200, user aesthetic approval, all-tab source integrity and final updater/distribution checks remain distinct unsatisfied gates.
- No RC, beta, preview build, public installer, tag or stable release in this diagnostic PR. No background work is claimed: results must be explicitly read from GitHub.

## Status
- At creation: native evidence requested by new CI. An accepted GitHub commit or launched CI is **not** passing native validation. The exact run IDs and subcondition measurements should be added when confirmed.
