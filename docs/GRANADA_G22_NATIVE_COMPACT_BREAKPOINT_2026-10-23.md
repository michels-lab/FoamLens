# GRANADA G22 — eliminate compact CSS leaking into native wide Field Play

**Date:** 2026-10-23. **Branch:** `fix/granada-g22-compact-css-breakpoint-20261023`. **Release status:** BLOCKED; this is a source candidate, not a signed stable release.

## Genuine original-main reproducible product failure

Original genuine packaged Windows FoamLens B13 in [#39918086260](https://github.com/michels-lab/FoamLens/actions/runs/39918086260) FAILED 1140px Field Play `playNotCollapsed:false` while real QuickCup mold/T at 9.8s, camera and physical field source passed. Separate genuine scientific original-main four native-start smoke [G20 #39918739276](https://github.com/michels-lab/FoamLens/actions/runs/39918739276) PASSED, confirming the failure is intermittent and that simple launch + B13 source is insufficient release acceptance.

Prior B13 #39900324375 captured **70.390625px Play with computed min-width 68px and `#appShell.gfwCompact=true` at wide 1140px**. That's exactly the original G7 **compact-only** Play CSS declaration, which was previously *not physically bounded by a CSS media query*, only by a dynamically toggled JavaScript `gfwCompact` class. G12/G16 wide styles may mask this race in some runs but require competing selector priorities. A stale compact class should not be able to alter a wide-screen layout at all.

## G22 actual source correction

- Change **one existing original-owner frontend module**, `desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js`. Keep the original G7 sidebar, drawer, scientific controls, DOM, Field, Analysis and CSS declarations intact; enclose **all** compact-specific CSS under `@media(max-width:1024px)`, including original 68px Play and mobile/reduced-motion child rules. Utility/overlay baseline styles remain global.
- Add a `matchMedia('(max-width:1024px)')` change listener invoking the **existing G7 `sync`**, in addition to existing window resize and body mode mutation listeners. It restores the original no-compact state when a native viewport crosses the breakpoint even if WebView2 coalesces native resize events. No polling, body mutation patches, duplicate Play buttons, forced inline styles or changes to field/scientific values.
- Add `tools/granada_g22_compact_media_guard.test.cjs` executing the original G7 style generator in an isolated JS VM, parsing CSS media-rule scopes to prove **every** `.gfwCompact` rule is inactive at 1025, 1140, 1200, 1250 and above, and retained at 480 for original mobile semantics. A synthetic unscoped 68px Play regression must be rejected. Existing original G7 + G16 source tests also run.
- `.github/workflows/granada-g22-compact-css-boundary.yml`: two-OS source tests; existing official `build-foamlens-desktop.yml` owns real private B13 Windows original packaged Play/Camera/Field acceptance and can still fail. Do **not** relax native `playNotCollapsed` threshold, timed measurements, signoff, or screenshots. G18b #239 diagnostic PR is **not edited**, and all other FoamLens/app repos remain untouched.

## Non-negotiable verification and caveats

Source and Node test success alone **does not prove** original Windows native timing bug resolved. Require actual **repeated** QuickCup B13 official branch packaging CI including original 1140px and 640px Play checks, Portable+Installed, actual camera/screenshot and physical source. An isolated green outcome may not eliminate intermittent failures. Do not merge while native release gates remain failing or publish a stable/RC/beta artifact until publisher signature/owner/physical DPI and independent quantitative science conditions are closed under [release blocker #238](https://github.com/michels-lab/FoamLens/issues/238).

G21 [signature guard PR #242](https://github.com/michels-lab/FoamLens/pull/242) is an independent release-security workstream, not a substitute for G22 UI native acceptance.
