# FoamLens GRANADA G14b — repeated installed/portable **scientific provenance** (2026-10-22)

This is a strictly **test-only**, independent enhancement stacked on original G14 passive native Play P0 PR #231. Do not merge this branch as product code.

## Why this is necessary

The original two complete B13 Windows installed/portable G14 workflows, [#39885432973](https://github.com/michels-lab/FoamLens/actions/runs/39885432973) and [#39885572940](https://github.com/michels-lab/FoamLens/actions/runs/39885572940), passed and reported identical original Play geometry (112×32px wide, 106×30px compact, original text/loop aria, fonts loaded). They **do not diagnose** earlier intermittent P0 installed `playNotCollapsed=false` and do not authorize a release.

G14 original P0 test branch was expanded to execute **two additional cold/warm launches of each exact same Portable and Installed executable**. This branch strengthens every repeated launch beyond checking only process exit and present log strings.

## Added fail-closed proof on every actual repeat

- The real `--smoke-test` executable must still exit 0, log original G14 field/Play measurements at **both** CSS 1140 and 640, and preserve original camera and physical scientific contracts.
- The repeat must write a full **original real two-region OpenFOAM Field PNG** `field-real-multiregion.png`; a missing file always fails.
- Independently rerun the unchanged source-owned `tools/granada_real_case_native_gate.py` against THAT launch's **own log**, original 5-case B13 manifest and THAT launch's **own** PNG. This verifies nine distinct genuine CAD/checkMesh/OpenFOAM/Field/native log signatures, real `metal+mold` at physical time 9.8, source SHA-256 digests of `0/metal/T`, `0/mold/T`, `9.8/metal/T`, `9.8/mold/T`, original asymmetry declaration, a valid 2D PNG CRC and content size. The original gate reports provenance, **not scientific numerical accuracy**.
- Each repeat gets its own `native-original-b13-physics-gate.json` and verified PNG SHA-256 in structured `granada-g14-packaged-repeat-summary.json`. Distinct failed attempts do not overwrite earlier logs, images or gate outputs. `release_authorized:false`, `human_approved:false`, physical OS DPI still untested.
- Updated original positive/negative Node regression explicitly guards every real OpenFOAM scientific gate path; dual OS source CI, Windows PowerShell syntax parser and real B13 stacked CI are mandatory.

## No false sign-off

Current G14b Windows native workflow must be checked on its exact source SHA; a prior source or native green run cannot certify the new per-repeat B13 gate. Full 36 native installed/portable screenshot acquisition, signer/updater and owner aesthetic acceptance remain separate. P0 #230 remains open until actual individual `playNotCollapsed` failing criterion is observed and a source-bound correction is measured. No RC/beta/prerelease/stable release is published by G14b.
