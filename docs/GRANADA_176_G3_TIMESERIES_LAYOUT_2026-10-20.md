# Operación Granada Grande — G3 / Time Series T2 (2026-10-20)

**Scope:** UI portion of [#176](https://github.com/michels-lab/FoamLens/issues/176), dependent on the scientific history builder tracked by [#146](https://github.com/michels-lab/FoamLens/issues/146). Part of umbrella [#177](https://github.com/michels-lab/FoamLens/issues/177). **Candidate branch:** `feat/granada-176-g3-timeseries-layout-20261020`. **Public release:** remains FoamLens Desktop v1.8.10; NO merge, version increment, installer or scientific validation implied.

## Evidence-based baseline

- `desktop/src/FoamLensDesktop/frontend/index.html` already contains Time Series focus, Variable 1, optional Variable 2, probe/case filtering, actions and hints.
- `v14-dual-timeseries.js` preserves the real existing-curve catalog, supports different dimensions/units and separate Y axes, and identifies eligible 3D sources without fabricating a pre-existing curve.
- `v14-zz-field-workspace.js` builds physically indexed histories from original OpenFOAM 3D fields, probe and profile sources, using two independent slots, but installs its original source selectors/Build action inside collapsed `#fwDataFieldHistories` in the small sidebar. It has an epoch `fwState.fieldTsSeq` checked before each async sample and before atomic commit.
- The old UI can force users to open a hidden section before they can build a curve; the generic «Variable 0» appearance has a separate functional root cause under #146, not solved by CSS.

## Deliverable A — permanent source-native data panels

New `desktop/src/FoamLensDesktop/frontend/v24-granada-timeseries-t2.js` makes an **Existing time series** panel separate from **Create history from real OpenFOAM fields**. It moves the **original DOM nodes** with their original IDs and existing listeners, including both source slots, physical case/region/field/component/stat/probe selectors and original Build action. No fake field choices, no duplicate second scientific engine, no new sampling formulas.

The original `fwDataFieldHistories` details element remains as a hidden open **refresh anchor**: the pre-existing history selector updater requires `details.open`, so late OpenFOAM imports continue to repopulate the two original source slots. Only the empty shell hides, NOT any selector or status. The history UI remains visible when there are no pre-existing time series.

## Deliverable B — cancellation, state and real limitations

Always-present **Cancel build** is disabled at idle and available during a source-history Build. Cancelling increments the existing scientific generator's `fieldTsSeq`; async source loops observe the changed epoch and exit before a cancelled draft reaches the atomic `fwCommitFieldHistoryDrafts` transaction. A currently awaited file read may finish; no OS-level cancellation of read I/O or granular numeric progress is claimed. Source error messages remain in the native `fwTsStatus` surface with a live status region. No fallback to invented “Variable 0”.

The source builder only generates curves when asked; entering the Time Series tab does not automatically parse files or create data. Existing real time-series selection/filter semantics and case context remain owned by the old core.

## Deliverable C — responsive UI, localization and automated QA

Consistent restrained style via existing `--panel`, `--panel2`, `--line`, `--accent` theme tokens; readable selectors, responsive grid, visible focus, controls/status/legend hierarchy and bilingual EN/ES labels. No Field A–D, cameras, CAD, solver log parsing, importer, existing Review/Live PR #180 or global Ribbon PR #179 code touched.

- Source/runtime test `desktop/tests/granada-176-timeseries-ui.spec.cjs`: checks real node ownership & old handlers; two source slots; no duplicate selectors; epoch cancellation; original source refresh anchor; responsive, language, keyboard markup and scientific boundaries.
- Dedicated `.github/workflows/granada-176-timeseries-t2.yml`: Ubuntu + Windows with new test plus original `dual-timeseries.test.cjs`, `timeseries-source-catalog.test.cjs`, `section-ownership.test.cjs` and `test-suite-manifest.test.cjs`.
- **Local test evidence actually executed:** candidate JavaScript compiled using JS `Function`; a minimal source DOM mock reparented original Build and refreshed the old anchor, original click handler still fired, and Cancel advanced the epoch from 7 to 8. This mock is NOT an installed Windows test, and does not replace the full Node or native GUI tests.
- **Current CI evidence:** pending workflow execution on candidate PR; do not mark as green before observing results.

## Remaining gates / re-entry

1. Run full dedicated Windows+Ubuntu Node CI on exact candidate head, fix failures, then full Windows Desktop build on PR.
2. Test original imported 2D probe curves alongside **two actual** unrelated OpenFOAM case/region/field/component history sources. Check relative time, units, axes, field association, restart/cancel/retry and data provenance. Need owner-authenticated fixture when required.
3. Verify installed Windows Setup/Portable at 1024 / 1280 / 1920 CSS widths and 125 / 150 / 175 / 200% DPI; screenshots of no-data / import / two-source / loading / error / cancel / complete states. Confirm main chart canvas remains useful after sidebar expansion; correct if UX suffers.
4. T1 #146 still owns full catalog and physically correct complex time-history generation, including source metadata, reported progress and any genuine Variable 0 parsing bugs. This T2 change MUST NOT be used to falsely close it.
5. Coordinate merge order with global #177 Ribbon PR #179 and Review/Live PR #180. Full all-tab G0–G5 #177, Field #162/#175 and CAD remain separate. Owner visual signoff and explicit release authorization are still required.

**Honest status:** code candidate + limited JS mock validation; real Windows packaged visual review, scientific fixture validation, and merge/release remain open.
