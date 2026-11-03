# FoamLens — GRANADA G42: bounded File Steward lineage after real B13 main trigger
**2026-10-27 · test/CI-only P0 #230 and release-gate #238.** No product source, app CSS, CFD physics, installer artifact, credentials, user settings or stable release changes.

## Independent observed failing condition
- G41 native attribution was merged [#261](https://github.com/michels-lab/FoamLens/pull/261), followed by the separate real B13 workflow G40 [#260](https://github.com/michels-lab/FoamLens/pull/260).
- Exact G40 source branch [run 40500162938](https://github.com/michels-lab/FoamLens/actions/runs/40500162938): **native 6/6 PASS** (three genuine installed, three portable, actual original B13 metal/mold, 1140/640 original Play, genuine Inno and uninstall). 2026-10-27T12:08Z.
- G40 merged original source at `7ec4d91dc7347b11b170f093e6b6581faafc7955`. File Steward immediately and automatically appended `16e17de36cd12f2088c06a03044be2efddca6619` with the exact subject `chore(file-steward): refresh local audit findings [skip ci]` and ONLY four tracked paths: `docs/audits/FILE_GOVERNANCE_LOG.md`, `reports/file-governance/{FILE_GOVERNANCE.json,FILE_GOVERNANCE.md,SUMMARY.json}`. GitHub compare shows it is a direct descendant; there are **no product-file changes**. G40's strict equality to the *subsequent* remote main SHA could reject the automatically triggered genuine B13 run before it launches, despite exactly identical scientific product source. The baseline native 6/6 success remains valid for its original branch; it is not an owner physical-DPI sign-off or repeatability guarantee.

## Minimal bound
- Continue requiring exact checkout `github.sha` and complete 40-byte Git SHA.
- If running on main and HEAD equals current main, use existing original branch with zero changes.
- If main advanced, fetch and verify ancestry via `git merge-base --is-ancestor`, no more than 4 intervening commits, exact individual commit subject for *every* intervening commit, and exact 4-path filename allowlist across the actual snapshot/main diff. Re-query remote main SHA after these checks to fail on live races. Never fetch private cases into public artifacts.
- If a future product, workflow, security, science, physical unit or CSS source file changed, or a branch is unrelated, or File Steward signature differs, this gate **fails**. No test passes solely because commit says `[skip ci]`.
- Dedicated G42 branch is QA-only: same current original native source and independently measured five-case B13 fixture. Preserve 3 Installed + 3 Portable, original `playNotCollapsed` minimum 100×28, original playback/Field, metal/mold provenance and source safe sanitization. Add adversarial tests for dropping ancestry, commit subject, allowlist and remote revision recheck.

## Remaining
G42 proves the original source snapshot is product-identical despite a **later** audit-only main commit; it does not prove every future commit is approved or Play is permanently fixed. #230 remains open pending real repeated source and physical Windows DPI 125–200% and owner inspection of all 36 screenshots. #238 blocks any signed/updater stable publication. No release/RC/beta.
