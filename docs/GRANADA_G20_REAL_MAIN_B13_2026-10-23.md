# FoamLens G20 — authentic private B13 verification on **original main-only** Windows binaries

**Date:** 2026-10-23. **Owner repo:** `michels-lab/FoamLens`. **PR:** [#241](https://github.com/michels-lab/FoamLens/pull/241). **Release:** BLOCKED — no tag, release candidate, beta or published stable version created.

## Problem this QA block addresses

[G19 #240](https://github.com/michels-lab/FoamLens/pull/240) built and smoke-tested the unmodified `main` host as real Setup and Portable, but its test did **not** include private measured CFD files. A passing binary launch alone cannot certify Field source handling, region/time association or the 3D workbench. Earlier original B13 Windows tests with physical science were performed on a temporary 16-owner composite containing unmerged source modules, not the exact official `main` product.

## New isolated technical implementation

- `tools/granada_g20_private_b13_extract.py` obtains **original** measured QuickCup B13 Git blobs on the **same Windows runner**, from the authorized private branch via a sparse checkout. It refuses Windows-illegal paths, missing required metal/mold original frames, modified hashes, outside-root symlinks and destination/source collisions. Files are not fabricated or interpolated.
- Five separate runtime **test identities** are copies of **one** authentic simulation, not five independent experiments. Only the explicitly named asynchronous test copy omits `9.8/mold/T`; it retains the original physical `9.8/metal/T` and `0/mold/T` bytes. Original `0` and `9.8` `metal/mold/T` and `constant/metal/polyMesh` source hashes are checked per test identity.
- `tools/test_granada_g20_private_b13_extract.py` tests refusal paths. This suite initially failed on a fixture placement mistake (negative test's destination was inside the source); fixed in commit `e499df2e7982851bbd3b7ba8986f9b0537c7cbb4`. A **failed or queued workflow is not scientific acceptance**.
- `tools/granada_g20_original_main_real_b13.ps1` builds original live `main` bundled WinForms/WebView2 and a real Inno Setup package, then attempts two independent real B13 native starts from Portable and two from Installed. It requires the original real OpenFOAM packaged-smoke marker and Windows smoke marker on **each** start, and checks unchanged original `main` SHA and individual original C#/installer Git blob identity. Separate original product and QA directories; never graft unmerged scientific branches into production.
- `.github/workflows/granada-g20-original-main-b13.yml` runs cross-platform negative checks then authentic Windows scientific regression. It reports **only hash and test metadata**, no raw OpenFOAM research files, screenshots, logs or EXE uploaded as artifacts; no upload to a new external service beyond GitHub Actions. Absence of original private fixture access fails closed.

## Known missing release gates (must remain open)

1. Full original quantitative B13 5-case physical-output validation and independent per-run 3D Field PNG/mesh/source provenance beyond smoke markers; no numerical solver accuracy certification.
2. Intermittent native Play width regression at 70.390625 px from prior actual Installed run, with physical cause unresolved in [G18b #239](https://github.com/michels-lab/FoamLens/pull/239). **Do not change its acceptance threshold**.
3. Exactly 36 approved genuine Native Installed/Portable workspace captures with real physical monitor DPI 125, 150, 175 and 200%, owner review, and original seven cameras in each required state.
4. Actual trusted publisher Authenticode signature, validated SHA-256 updater external distribution, explicit user consent, and exact final tag/assets/feed after scientific and visual approval. G19 test artifacts were `NotSigned`; do not infer a current signing secret from that observation.
5. Current original `main` plus fully merged user-facing source features — separate unmerged science/CAD/UX PR workstreams must be evaluated independently and not merged by a test suite.

**CI evidence:** [G20 Actions](https://github.com/michels-lab/FoamLens/actions/workflows/granada-g20-original-main-b13.yml), inspect completed exact source HEAD before marking a gate passed. Actual green G19 baseline: [#39914933222](https://github.com/michels-lab/FoamLens/actions/runs/39914933222). Official published version verified separately: [v1.8.10](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.10).

**Definition of done for this independent G20 block:** cross-OS regression and source-pinned real Windows science packaging jobs terminal green; truthful checksums, original 4 starts and per-run physical measurements inspected. This does not, by itself, make the project release-ready.
