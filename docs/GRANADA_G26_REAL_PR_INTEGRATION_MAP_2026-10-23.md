# FoamLens — GRANADA G26: read-only live PR ownership and integration conflict map

**Date:** 2026-10-23. **Repository:** `michels-lab/FoamLens`. **Independent QA-only branch:** `test/granada-g26-pr-integration-conflict-board-20261023`. **Original main:** `00533f68993fef7a7761026cf9c1ab13a21ab3cd`; **latest released:** v1.8.10. **No merge, release, tag, version bump, new hosting subscription, deploy or other app source touched.**

## Problem, scope, and true original blocker

Dozens of independently owned FoamLens draft PRs coexist, including native QuickCup science, Review/Field, actual Windows installer, G21 signed publication, G22 intermittent 1140px Play, G23 real user-profile data lifecycle, G24 WebView2 storage and G25 Windows native external-link handling. Counting green source CI on a draft PR as merged production is not safe; merely sharing `docs/GIT_AUDIT_LOG.md` across PRs is not a meaningful product-code overlap. The original repo already has `tools/granada-github-snapshot.cjs` and `tools/granada-release-proof.cjs`, which handle **stable release gating**; G26 does **not** replace or edit those. G26 instead solves the separate, user-relevant ownership ambiguity: **Which current open PRs actually touch the same implementation files?**

## Implemented functioning features

- `tools/granada_g26_pr_conflict_board.cjs`: read-only, **public FoamLens repository ONLY** GitHub API calls: current original main SHA, latest stable release, exact-main push workflow runs, paginated ALL open pull requests and per-PR **actual changed source filenames**. Rejects unsupported/write endpoint paths, missing/malformed SHA, absent release, incomplete pagination or original main SHA drift during data collection.
- Creates **all-pairs changed-file overlap** and types each by `product`, `workflow` or `test`; excludes documentation/audit-log-only overlaps. Records each PR's draft state and immutable HEAD SHA without assuming green GitHub Actions PR merge SHA represents a production main commit. No Git merge operations and no claim that same-file overlap *proves* an actual merge conflict.
- Generates **only a read-only audit** with `readyToRelease=false`, `readyToMergeNumbers=[]`, `signerProven=false`, `updaterProven=false`, `integratedScienceAndDpiApproved=false`. The existing authoritative native scientific, 36-screen, physical DPI, owner sign-off and signed-updater validation remain separate.
- `tools/granada_g26_pr_conflict_html.cjs`: **offline self-contained interactive HTML**, with PR search, source/workflow overlap filters, exact SHA metadata, live report timestamps and conflicting source file details. No CDN, external JS, tracking, network fetch or tokens in output. Escapes untrusted PR titles before embedding JSON in the page; links safely to the correct public GitHub PR.
- `.github/workflows/granada-g26-pr-integration-map.yml` runs cross-platform privacy/safety/false-merge and original-source regression tests, then a real authenticated **read-only** GitHub PR inventory, exports public-metadata-only JSON+HTML in a short-lived CI artifact. Workflow has only `contents:read`, `pull-requests:read`, `actions:read`.
- Source regressions in `granada_g26_pr_conflict_board.test.cjs` and `granada_g26_pr_conflict_html.test.cjs`: reject unsafe GitHub endpoint families, stale/wrong-main/pr-merge-only CI, incomplete PR source listing, false product collisions from audit-log-only edits, HTML/title injection, and invented release or merge verdicts.

## Verified real GitHub first run

[Workflow **#39953878372**](https://github.com/michels-lab/FoamLens/actions/runs/39953878372) at code SHA `5d7f29e9571dca332f55d0a70bdd6db3e9a6e7c3`: **SUCCESS 3/3** (Windows source tests, Ubuntu source tests, actual live GitHub graph). The authenticated read-only GitHub report verified:

- **55 original public FoamLens PRs OPEN** at snapshot time;
- **20 actual pairs** shared at least one code-of-product path, excluding mere shared documentation;
- current `main` `00533f68993fef7a7761026cf9c1ab13a21ab3cd`, public stable v1.8.10;
- public-metadata-only artifact **`FoamLens-G26-public-integration-map`**, 23,748 compressed bytes: [open GitHub Actions artifact](https://github.com/michels-lab/FoamLens/actions/runs/39953878372/artifacts/12501438054), contains interactive `integration-map.html` and `snapshot.json`. The HTML opens locally, without serving through a public access page. GitHub artifact retention at this run: 14 days.

**Important:** These are facts from a point-in-time snapshot, not immutable future current-state assertions. Fresh G26 runs must independently re-read current PRs and recheck original main SHA before publication. Artifact size is not a scientific case/owner asset; no private QuickCup CFD or personal data is uploaded.

## Unresolved release/ownership gates

- G25 [PR #246](https://github.com/michels-lab/FoamLens/pull/246): cross-OS security and original WinForms build PASS, but full Windows B13 [#39950894437](https://github.com/michels-lab/FoamLens/actions/runs/39950894437) FAILED a **stale Review regression source assertion** `desktop/tests/review-case-binding.test.cjs:58–59`, which still searches for the old `parsed.Scheme` string instead of new `ExternalNavigationPolicy.TryExternalHttpUrl`. Review functional UI was not shown broken by this assertion. Owning PR #246 is OPEN/DRAFT; G26 does not edit it or falsify that CI.
- G24 [PR #245](https://github.com/michels-lab/FoamLens/pull/245): actual first Portable native smoke timed out at 300 seconds in [#39948292250](https://github.com/michels-lab/FoamLens/actions/runs/39948292250); no true browser localStorage/IndexedDB persistence verified. G26 does not modify that owned work.
- G22 #243 Play and physical Windows DPI/36 owner visuals; G21 #242 genuine signed stable publisher/update feed; G20 #241 independent actual original-main B13 smoke and *still missing* quantitative numerical science assurance. Other scientific and CAD feature PRs remain independent drafts and do not become shipped features because their source tests pass.
- [Release blocker #238](https://github.com/michels-lab/FoamLens/issues/238) remains OPEN; actual native owner acceptance/signature/update distribution not complete. No RC, beta or newer stable release published by G26.

**Next usage:** inspect the interactive PR overlap board to group **same-file source owners** before planning integration. Do not merge any PR on overlap rank alone; run actual original-source runtime QA, resolve owner signoff, then use the pre-existing strict `granada-release-proof.cjs` for an authoritative stable-only verdict.
