# Operación Granada GRANDE — G4: Review + Live permanent workspaces (2026-10-20)

**Status:** Functional candidate in independent PR; native user-installed acceptance pending. This file is this workstream's permanent bitácora because the global `docs/GIT_AUDIT_LOG.md` is concurrently owned by the separate G0/G1 UX PR #179. Its future integration must reconcile both entries, not overwrite one.

## Original implementation audited (unchanged)

- Review has seven real original `reviewTab*` buttons, one scientific `Case Auditor`, source-linked findings, inspector, configuration comparison, case comparison, completeness and case relationships. `setReviewPane` owns which original tab/view is active.
- Live has a read-only directory chooser, independent refresh/stop action handlers, a five-second watcher, solver run state, physical-time progress, last update and numerical metrics. **No new solver or file-reading algorithm is claimed here.**
- The monolithic `index.html` and original Review/Live handlers are NOT modified in this workstream. Field 3D and Time Series have their own WIP PRs/branches. All new behavior is in the independently native-injected `v24-granada-g4-review-live.js`.

## Real delivered changes (three connected outcomes)

1. **Review task navigation:** original Review header, finding badge and navigation move together into a sticky top work dock. Two primary tabs **Case Auditor** and **Findings** stay visible; the five lower-frequency original tabs (Inspector, Compare Configuration, Compare Cases, Output Completeness, Relationships) become one keyboard-accessible **More views** menu with bilingual label and current secondary tab in the summary. Exactly the original DOM buttons/IDs/listeners and their real `setReviewPane` bindings are preserved, not copied. Their results pane stays directly below. Selected tab state is tracked through the original `.active` class (MutationObserver on real DOM); closing and reopening never discards a tab's loaded data.
2. **Live always-visible workflow:** the same original Watch Run title/capability badge, folder chooser, refresh/stop controls, source status, solver run state, current case label, last update time and physical-time progress bar move to a persistent header. Detailed real numerical metrics and log evidence stay in the workspace below with more room. Buttons keep their original disabled state until the real watcher enables them. **No synthetic solver state or false ‘running’ success** is injected.
3. **Layout + G4 evidence:** concise unified control/legend typography, consistent spacing, compact/wide responsive grids and overflow-protected summary, with scoped selectors only in `#reviewSurface` and `#liveSurface`. `window.FoamLensGranadaG4.audit()` returns user-private-data-free, current DOM-only evidence: canonical Review/Live controls, whether primary versus secondary, current CSS viewport/DPR, geometry and explicit `inactive-not-inspected` status. It is a diagnostic contract (no automatic export, background upload or QA certification).

### QA implemented

- `desktop/tests/granada-177-g4-review-live.spec.cjs`: browser-like DOM original element identity tests for seven Review tabs and Live title/buttons/run state/progress; header reparenting; primary selectors; secondary menu; source active transition; original click handlers; live/review mode evidence without private case data; no mutations to OpenFOAM scientific paths.
- `.github/workflows/granada-177-g4-review-live.yml` on Ubuntu and Windows runs that suite plus unchanged `review-case-binding.test.cjs`, `live-run.test.cjs`, `ribbon-ui.test.cjs` and `test-suite-manifest.test.cjs`.
- CI at `1e56af574a48ea8254bbe61a717be7f13a85e1df`: [run 39389135662](https://github.com/michels-lab/FoamLens/actions/runs/39389135662) **SUCCESS** on both OSes, after fixing a test-only mock `contexts` schema mismatch and extending the real Live DOM fixture. New documentation commits have their own exact HEAD, not falsely certified by an older run.

### Not finished, and why

- Real **native installed Setup and Portable** high-DPI visuals at 1024/1280/1920 CSS px and 125/150/175/200% Windows OS scaling, navigation while monitoring the owner's true OpenFOAM run, ability to expand/collapse Review More and original source tabs with real keyboard, scroll/sticky behavior under app toolbar and all source states, and owner aesthetic review.
- Integration with independent global UX G0/G1 PR #179, Field F1/F2 PRs #162/#175, Time Series T1/T2 #146/#176 (none touched), then whole-app G5 visual owner acceptance.
- Native scientific file logs, source paths and case data must remain read-only and private. No release, version bump, merge or issue #177 closure is permitted from this candidate alone.

**Next independent Granada package:** source-backed Time Series T1, using existing original field-history parser and generator; do not make Review/Live review or CI block this work.
