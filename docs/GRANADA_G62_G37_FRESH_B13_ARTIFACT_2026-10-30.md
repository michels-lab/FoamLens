# FoamLens Granada G62 — Real B13 fixture freshness and fail-closed provenance (2026-10-30)

## Verified failure
- The exact merged main source `79ee3fa36745994f9f6b27a611c92d37674174c5` triggered [G37 run 41140345010](https://github.com/michels-lab/FoamLens/actions/runs/41140345010). Source guard checks passed on Windows and Ubuntu, but the six-native-cycle job failed **before build/launch** trying to download `QuickCup-MultiCase-Windows-runtime` from permanently pinned run `40439636990`. That run now has no such unexpired artifact. **Zero native cycles completed** in this G37 run; do not claim a scientific failure or G37 6/6 pass.
- The same source commit produced a fresh artifact through the independent original Windows builder [run 41140345067](https://github.com/michels-lab/FoamLens/actions/runs/41140345067), size ~407.6 MB. Source content remains private; no payload copied into public Git.

## G62 implementation
- Replace expiring run-ID with a **read-only GitHub Actions query** of recent successful original `Build FoamLens Desktop for Windows` main-branch fixture job runs. Require actual completed original `Real OpenFOAM QuickCup regression` job and exactly one non-expired `QuickCup-MultiCase-Windows-runtime` artifact above a small size sanity threshold. Check original branch, event and source commit identity before download.
- Permit a source-ancestral builder only when `git merge-base --is-ancestor` holds and the complete intervening diff has **only** the explicitly whitelisted G37 QA files/documentation or four File Steward report files, never scientific or product code. Otherwise wait for a correct independent builder and ultimately **fail closed**, no synthetic data fallback.
- Continue verifying real metal + mold T at t=9.8 s, five source cases, original Inno setup, all physical Field Play thresholds and three actual Portable plus three Installed cycles. Continue to upload **sanitized boolean-only results**, not raw fixture/log/images.
- Add same-failure negative source checks for expired fixed run IDs, missing source ancestry, relaxed allowlist, missing successful independent source job, missing real artifact or missing fail-closed branch. Pull requests run **source guards only**; the costly six-cycle Windows native job remains for allowed push/dispatch events after integration.

## Acceptance and status
- Product source, original scientific numerical behavior, UI and public release version are untouched by this QA-only change.
- G37 should pass exact-main `6/6` with an independently generated, non-expired real B13 fixture. If it fails later at native Field, retain real causal stage telemetry and fix that separately. Success of an isolated source guard or other Windows build **does not** close G37.
- [Release gate #238](https://github.com/michels-lab/FoamLens/issues/238) stays open for signed updater/Authenticode, real DPI 125/150/175/200, 36 screenshot visual acceptance and exact as-shipped tests. **No RC, beta or stable release** until all gates independently pass.
