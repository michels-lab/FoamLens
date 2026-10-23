# FoamLens GRANADA G19 — pure-main Windows packaged QA

Date: 2026-10-23. Parent issue: [#238](https://github.com/michels-lab/FoamLens/issues/238). Scope: FoamLens only. **No official release**, no RC/beta, no change to production source.

## Why G19 is separate

The existing G18/G18b real QuickCup B13 native proof mixes deliberately unmerged owner science/CAD/UI branches into a disposable host. Even when it passes, the compiled binary is not the current `main` product. The real G18b Windows test also observed the original Field Play width collapse at 70.390625 px on one run, followed by a later green run; the defect is intermittent. Those active test-only PRs are left untouched.

## Independent contribution

This isolated branch adds `tools/granada_g19_main_only_provenance.cjs`, adversarial tests and `.github/workflows/granada-g19-main-only-package.yml`.

The workflow checks out **two separate directories**: this QA branch (`qa/`) and the live official FoamLens `main` tree (`product/`). Only `product/` enters the .NET build, frontend bundle, Inno installer and smoke runtime. Before compilation it verifies exact full 40-character HEAD against remote current main, confirms original C# Program/Updater/Play/HTML/installer tracked Git blob IDs, rejects modified source and modified/missing files, and runs existing G15/G16/G17 regression and repository-boundary tests. Then it builds the current main self-contained single-file `FoamLens.exe`, executes its **real WebView2 basic portable smoke**, compiles the actual official Inno Setup script, performs a real silent current-user install, and runs the **installed executable's basic native smoke**. After build it checks the original tree unchanged and current main still points to the same SHA. It records original binary SHA-256 plus actual Authenticode status.

Output is restricted to small non-sensitive JSON provenance reports. No private OpenFOAM case data, screenshots, binaries, executable, token or installer are uploaded as artifacts. No GitHub releases/tags are created.

## Negative checks and exact-source status

- Test must reject a previous original-science **composite** head instead of treating it as main.
- Test must reject abbreviated/unknown main SHA, dirty tracked `Program.cs`, a missing updater, and main head drift.
- The test does **not** import unmerged science branches, does not change original Play acceptance thresholds, and does not auto-update or mutate research files.
- Evidence level of original main packaging remains **PENDING until the exact workflow completes**. A future successful workflow will confirm only its named **baseline** installed/portable smoke, not full 36-view quantitative science or physical DPI.

## Still blocked — required before final stable release

1. Original real QuickCup B13 independent five-case native QA and source hashes, Field PNG, original Play and 7 cameras at 1140/640, real 9.8-second metal/mold, repeated cold/warm Setup+Portable starts. No scientific values are invented.
2. Actual physical Windows DPI 125/150/175/200 percent and owner review of all 36 real screenshots. Emulated CSS viewport and green source assertions do not qualify.
3. Signer's real Authenticode identity and end-to-end official signed installer/explicit-consent SHA-256 updater verification; a test-installed unsigned executable does not qualify.
4. Exact-main release-integrity/checksum/version/feed contract and final stable public asset verification after all prior gates pass.
5. Intermittent CSS regression investigation [G18b #239](https://github.com/michels-lab/FoamLens/pull/239) remains independently owned. This work does not mark it fixed.

Acceptance tracker: [G19 issue #238](https://github.com/michels-lab/FoamLens/issues/238). The official public stable tag remains `v1.8.10` until genuine release conditions are met. No claims about a code signer or exact installed smoke should be interpreted as completed before the relevant GitHub Actions job reaches `success`.
