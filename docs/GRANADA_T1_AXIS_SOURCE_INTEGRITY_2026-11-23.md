# FoamLens — GRANADA T1: Time Series source metadata integrity (2026-11-23)

## Root cause and direct effect

- Original `tsdFields(ts)` collapsed same-`canonical` fields by keeping the **last** case/region's metadata. Two imported curves named `T` could advertise `K` or `°C` depending only on import ordering, despite no unit conversion. That metadata also entered the two-variable axis planner.
- Original `tsdDimensionPowers` parsed exponent words via `Number()`. JavaScript accepts hexadecimal, binary and octal strings that are **not** legitimate OpenFOAM dimension exponents, creating undeserved axis metadata verification.

## Corrections on isolated T1 branch

1. `tsdFields` now collects one canonical selector without inventing an extra physical quantity. It retains unit, seven-exponent dimension label and quantity only if all original series agree. Contradictions produce explicit unknown metadata (`?`/`unknown`) rather than the most recent case's label.
2. Strict finite **decimal/scientific lexical** parsing prevents `0x1`, `0b1`, `0o1`, `1_0`, `Infinity` or overflow exponents from being certified as seven OpenFOAM physical dimensions. Valid signed decimals and scientific notation remain supported.
3. Real-source negative regressions exercise case B14 (`T [K]`) and case C14 (`T [°C]`) as **synthetic labels only** — no owner's simulation data are claimed or touched — and check permutation independence, invalid dimensions, invalid quantity, and safe Y-axis separation.

## Scientific limit and release gate

This correction **does not numerically convert Kelvin/Celsius**, alter source readings, manufacture histories, label recalescence or certify mixed-source comparisons. Existing scientific evidence warnings remain visible. Same-canonical curves with conflicting scales still require explicit case/source review; future comparison UI must not interpret the shared canonical name as physical compatibility.

This branch is **not** an installed release. Run `node desktop/tests/dual-timeseries.test.cjs`, `timeseries-source-catalog.test.cjs`, `timeseries-provenance.test.cjs`, `field-timeseries-association.test.cjs`; require original Ubuntu/Windows Time Series CI and native Windows QuickCup/Setup/Portable before merge/release. Keep PR #371 Field science untouched; owner B14/C14 and physical DPI/UX checks remain distinct.

**Global verified milestones:** 7/15 (47%) remain unchanged; metadata regression on a branch is not physical product acceptance.

## Extension from real renderer audit (continued Granada)

- The original `index.html` chart's `assignments(vis)` previously accepted only **two** physical Y axes, and the dual-variable module assigned entire canonical-name groups to one axis. Even after the selector fix, `T [K]` and `T [°C]` sharing one name could be drawn together or three independent quantities could be incorrectly merged into the right axis.
- New source-owned pure `tsdPlotAxisPreflight` evaluates the **actual visible source series**. The renderer now refuses (with bilingual visible explanation, no data deletion) charts with contradictory field metadata under the same name or more than two independent physical scale families. Original Data controls still allow choosing a compatible case / variables. Time Series assignment uses only verified source-family grouping; Profile and Logs retain their own rendering.
- Temperature display now respects **explicit input metadata** `K` versus `°C` while preserving original raw samples. The mean is aggregated from raw original values and converted exactly once, avoiding stale Kelvin-only offset logic. Delta-temperature values are never offset.
- The original PNG/SVG/CSV export entrypoints already require a non-empty `visibleCurrentSeries()`; because Time Series source-invalid plots return empty, they fail closed as `no-visible-data` instead of exporting misleading curves. The Data series list and underlying source history remain intact.
- Regression tests now exercise original `tsdPlotAxisPreflight`, the real `assignments` override, original chart availability, K/°C display, and cross-workspace isolation (rather than only source-text assertions). Native Windows and QuickCup exact-HEAD checks are still required.
- Historical release `v1.8.21` remains latest public. PR #371 science is intentionally untouched, and branch PR #372 stays draft pending exact source QA and owner acceptance; no new version bump, no fake scientific validation.
