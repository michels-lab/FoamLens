# GRANADA grande — Windows Setup/Portable all original workspaces (2026-11-17)

## Proven source progress

- Owner request: deliver a **stable** FoamLens release, not a release candidate.
- PR #352 merged as `5041467d80c5afc4fb2c5b6e085ef55958a8f4db`. It enforces the 36-slot offline G5 visual matrix at the release publishing boundary; partial evidence does not invalidate a scientifically passing native developer build.
- Original Windows run `44175667993` passed WinForms/WebView2, Setup/Portable, QuickCup, G5 reviewer and regression suites, but reported only **10/36 independently evidenced images**, with six same-workspace screenshots byte-identical and five entire workspaces missing from the captured matrix. This is an **evidence limitation**, not proof that every duplicated screenshot was copied or that a view is broken.

## This independent G5 capture block

1. Call a new **native WebView2** routine from `CaptureScientificWorkspaceEvidenceAsync` after the real B13 Field, Data and Time Series workspace checks. Use the product's **existing** Ribbon controls to activate compare, Analysis, Review and Live, verify the active original application mode, measured element bounds and viewport visibility, then capture genuine CDP PNGs. No overlays, synthetic screenshots, fabricated simulation results, simulated physics, or script-injected UI are accepted.
2. Bind the already existing real `time-series-*.png` and newly captured `field-compare-*.png`, `analysis-*.png`, `review-*.png`, `live-*.png` to the original screenshot manifest, together with Home, About, Data, Field. Require nine workspaces per viewport, **two viewport sizes per variant**, for an expected **36 named cells** plus optional About scroll and real metal/mold supplements.
3. Expand negative `test_visual_evidence.py` coverage and the existing G5 source-integrity test. Preserve the Microsoft Store/MSIX Home/About contract as its own unrelated channel; do not conflate Store artifacts with Setup/Portable or borrow confidential QuickCup data.
4. Maintain a strict separation: **native browser-CSS dimensions are not physical Windows 125/150/175/200% DPI**; a genuine screenshot is not human aesthetic approval, and the G5 reviewer can still find identical pixels or missing/damaged captures. The strict publish boundary remains in place.

## Release readiness

This PR is **not** a stable release, and its source code plus tests must pass exact-head original Windows/QuickCup and G5 dual-OS CI before merge. The next release remains blocked pending the real 36-slot evidence matrix, physical Windows DPI/owner review and final exact-main binary and checksum verification in #238. No Authenticode certificate is required for an explicitly unsigned direct GitHub release, but SmartScreen and checksum/source identity must be honestly disclosed.
