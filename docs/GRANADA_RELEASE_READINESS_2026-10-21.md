# FoamLens · Operación Granada — release authority and readiness (2026-10-21)

## Standing owner authorization

**Owner request, 2026-10-21:** Operación Granada CAN complete a public release. This is a **standing conditional authorization** for the **specific app targeted by the Granada invocation**: if and only if every release gate passes, publish ONE verified **final stable release** without requesting a second release order. Unlike earlier project instructions, Granada is not limited to preparation/QA.

**Absolutely no Release Candidate, RC, beta/pre-release or provisional public release.** Keep development branches, CI binaries and tests internal. If any gate remains blocked, do not create a tag, publish partial assets or label tests as a release; park with exact evidence and advance another independent block. Never release a different app or act on private cloud credentials/user data.

Canonical source of truth: [Michel's Lab GRANADA standard](https://github.com/michels-lab/Michel-Software-Standards/blob/main/standards/OPERACION_GRANADA_STANDARD.md), [release protocol](https://github.com/michels-lab/Michel-Software-Standards/blob/main/standards/RELEASE_PROTOCOL.md).

## Actual FoamLens assessment this Granada

**Conclusion: FINAL RELEASE BLOCKED / NOT PUBLISHED.** Do not mistake an integration preview CI pass for a merged/stable product.

- Current main on assessment began at `771f1bf09b13f66765aefb111d332cda73e995bc` (later governance-only commits updated the documentation); the large Field/UX work remains in open PRs, outside published main.
- [#162](https://github.com/michels-lab/FoamLens/pull/162) — independent multi-region A–D and measured XYZ; actual owner/physical acceptance unfinished.
- [#175](https://github.com/michels-lab/FoamLens/pull/175) — independent viewport resize and high-DPI overlap; installed visual matrix outstanding.
- [#179](https://github.com/michels-lab/FoamLens/pull/179) — original Ribbon and G0 source visibility evidence; full cross-tab owner aesthetic review outstanding.
- [#194](https://github.com/michels-lab/FoamLens/pull/194) — comparator of G0 visibility exports; successful synthetic contract tests but final integrated DOM/viewport acceptance outstanding.
- [#195](https://github.com/michels-lab/FoamLens/pull/195) — direct original Field cameras; the latest corrected full Windows CI and installer smoke passed, but this PR was not merged.
- [#196](https://github.com/michels-lab/FoamLens/pull/196) — independent five-owner composite, exact pinned SHAs and compiled native WebView2 smoke, [run 39606702272](https://github.com/michels-lab/FoamLens/actions/runs/39606702272) SUCCESS, but still a temporary unmerged integration and not source-backed real A–D owner acceptance.
- Further unresolved user-requested work includes Time Series source discovery/layout, Analysis, Review, Live, CAD, scientific health/integrity and comprehensive Developer Edition; keep these tasks in their existing owners/issues.

**Release gates before stable shipping**: explicit coherent integration in approved source tree and safe merged HEAD; exact-release-SHA regression suites; real imported OpenFOAM metal/mold A–D source/time/metric scale scientific assertions; native installed Windows Setup and Portable launch, 1024/1280/1920 viewport and 125–200% DPI captures/hit-testing; original separate Developer Edition isolation; consistent official version, final Setup/Portable artifacts, update manifest and SHA-256; signing truth, changelog, license/About and no confirmed P0 defects. Human visual review is **after publication**, not an invented pre-release sign-off. Do not invent missing simulation or installer results.

## Reentry

1. Recheck actual main HEAD, the current release/feed, all active PR heads, claims and release workflows: earlier CI run results are not proof of new HEAD.
2. Integrate only noninterfering source modules once owner QA and mandatory checks are complete; do not push unresolved scientific correctness into release.
3. Once ALL gates pass, Granada is already authorized to issue the final stable official release: verify the public GitHub release, exact assets/digests and in-app updater before reporting it as published.
4. Until then, continue a different large independent pending package. **No release today.**

This is a release decision log, not a public tag or build.
