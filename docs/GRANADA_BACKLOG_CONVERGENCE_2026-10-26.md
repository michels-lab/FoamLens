# FoamLens · Granada backlog convergence and anti-proliferation

**Audit date: 2026-10-26.** Scope: original \`michels-lab/FoamLens\`. This is workboard governance and read-only CI, **not** a new FoamLens stable release or proof that all source features are complete.

## Verified inventory, before and after

| Verified live GitHub measure | Before owner intervention | After first safe consolidation |
| --- | ---: | ---: |
| Open GitHub Issues (excluding pull requests) | 20 | 20 |
| Open pull requests | 65 | **59** |
| Draft pull requests | 64 | **58**, verified after consolidation |
| Historical QA-only draft PRs closed without merge | 0 | **6** |
| Product source branches/commits deleted | 0 | **0** |
| Stable published release | v1.8.10 | v1.8.10 |

The 20 issues are **not** 20 currently reproduced bugs. They include broad features, release gates, and source-backed user requests. No functional issue was closed merely because a historical QA stage became obsolete.

**Stacked PRs:** 26 before, **20 after** (six historical draft snapshots archived, without deleting any underlying branch). The backlog remains congested; this is only the first safe clean-up.

## Six closed test-workflow-only snapshots

Inspected exact changed-file lists **before** each closure. Each draft changed only \`.github/workflows/granada-177-real-openfoam-field-f1.yml\` and a corresponding dated QA findings document — **no unique desktop product source**.

- [#207](https://github.com/michels-lab/FoamLens/pull/207) — G7 Windows B13 36 screenshots.
- [#217](https://github.com/michels-lab/FoamLens/pull/217) — G9 native Time Series provenance.
- [#220](https://github.com/michels-lab/FoamLens/pull/220) — G10 chart no-overlays stage.
- [#222](https://github.com/michels-lab/FoamLens/pull/222) — G11 chart vertical focus.
- [#224](https://github.com/michels-lab/FoamLens/pull/224) — G11 filter recapture.
- [#227](https://github.com/michels-lab/FoamLens/pull/227) — G12 1140px Play snapshot.

Each closed PR has an individualized closing comment linking evidence and the more recent [G37 #257](https://github.com/michels-lab/FoamLens/pull/257), whose source \`3081ce6f0da71187f5de2fe6d9e8e3cb265a9f57\` finished [native Windows QuickCup 6-repeat run 40394191015](https://github.com/michels-lab/FoamLens/actions/runs/40394191015) with success. G37 is **not merged/released**, and the Windows scientific case/multiregion/desktop user acceptance is not satisfied by closing older historical branches.

## Issue classification

Actual GitHub labels were added based on the issue's meaning:

- **Defects/risk:** [#252](https://github.com/michels-lab/FoamLens/issues/252) stale unbundled JS hypothesis needing native reproduction; [#238](https://github.com/michels-lab/FoamLens/issues/238) exact-main signing/release proof; [#230](https://github.com/michels-lab/FoamLens/issues/230) intermittent Play clipping; [#117](https://github.com/michels-lab/FoamLens/issues/117) measured owner-case import performance.
- **Enhancements:** [#145–156](https://github.com/michels-lab/FoamLens/issues/145), [#158](https://github.com/michels-lab/FoamLens/issues/158), [#176](https://github.com/michels-lab/FoamLens/issues/176), [#177](https://github.com/michels-lab/FoamLens/issues/177). Issue #131 is an explicit release-validation checklist, not falsely labeled as a product bug or docs-only task.

These are GitHub's existing basic \`bug\`/\`enhancement\` labels, **not** an invented P0 validation. Source, separate test and release evidence must still be verified.

## Deterministic preventive gate

- Production tool: [\`tools/granada_backlog_guard.cjs\`](../tools/granada_backlog_guard.cjs), **read-only** paginated GitHub issues/PR search. Correctly excludes PRs from issue count, counts drafts, stacked branches, heuristic QA candidates and references with missing open parent PRs. No auto-close/rebase/merge/release.
- Adversarial fixture: [\`tools/test_granada_backlog_guard.cjs\`](../tools/test_granada_backlog_guard.cjs). Verifies open issue-vs-PR separation, 13-open-PR freeze, P0 and consolidated PR exceptions, grandfathering older PR updates, unsafe repo identifiers, multi-page API reading, 403 fail-closed and wrong domain pagination denial.
- GitHub Actions: [\`granada-backlog-convergence.yml\`](../.github/workflows/granada-backlog-convergence.yml): source tests on relevant main pushes, weekly read-only report, and read-only admission on newly opened/reopened PR. **No repository modification tokens**: contents/pull requests/issues read only. New noncritical PRs fail admission if over 12; historical PRs remain usable and updateable; exception P0 must reference a tracked issue and cleanup PR must reference at least two predecessor PRs. Workflow tool and fixtures do not prove product quality.
- CI exact source [run 40405611961](https://github.com/michels-lab/FoamLens/actions/runs/40405611961) **PASSED** on \`7bb6890681876e1de80bd38109a734f2d08b80b7\`, after negative fixture rejected \`../api\` repository identifier and source validation was corrected. Original failure remains visible in [run 40405463125](https://github.com/michels-lab/FoamLens/actions/runs/40405463125); do not erase that history.

## Release and integration blockers not reclassified

- G38 scientific series export [#258](https://github.com/michels-lab/FoamLens/pull/258) **merged** at squash \`339684bd4772e1e4230eed206247817faa5ca228\`; exact PR head native Windows/QuickCup plus domain and dual OS were successful. Merged \`main\` passed Windows subsequently, but no new final release.
- G39 [#259](https://github.com/michels-lab/FoamLens/pull/259): previous exact SHA \`ee02cd3e38f9cbd45e775aab34fd459f98a0463e\` **FAILED** full Windows CI at Review case identity binding due to test expecting a historical GitHub issue URL. Instead of opening another PR, its original owning branch was corrected directly at \`77a2d0b00284ce60503d1d3ce7ab8dee4a4e1e59\`; **run new exact-SHA full Windows QA before considering merge**. Targeted tests alone are insufficient. No privacy-sensitive local research files were posted to GitHub.
- P0 [#252](https://github.com/michels-lab/FoamLens/issues/252), [#230](https://github.com/michels-lab/FoamLens/issues/230), [#238](https://github.com/michels-lab/FoamLens/issues/238), G35–G37 stacked CAD/security/Field, independent thermocouples/energy/mesh/front physics and real user 3,008-file performance remain open or incomplete.
- **No stable release published, signed package asserted or temporary tester release created**.

## Operating rule for the NEXT 'op granada'

Read [master backlog-first standard](https://github.com/michels-lab/Michel-Software-Standards/blob/main/standards/GRANADA_CONTINUOUS_BLOCK_PROTOCOL.md) and local \`.michelslab/GRANADA.md\`. Refresh actual issues/PR counts and exact head. First handle [failed G39 Windows suite](https://github.com/michels-lab/FoamLens/actions/runs/40401488114) and oldest ready source PRs, then safe QA archive. Maintain a single owner for G35/G36/G37 stack; do not open another unrelated feature branch while 59 PR are open. Keep a before/after table and exact reentry. Target fewer than 12 total PRs in stages, without erasing user-requested unique scientific features or falsely completing experimental release gates.
