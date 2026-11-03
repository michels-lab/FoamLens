# Operación Granada #156 — Phase / Momentum Evidence Explorer

**State:** candidate implementation on branch `feat/granada-156-physics-evidence-explorer-20261019`. NOT published or merged. The public v1.8.10 installer is unchanged.

## Existing scientific capabilities audited and intentionally preserved

Original FoamLens already had substantial Phase Change / Momentum functionality:
- `v13-field-mapping.js`: discovery-based Field Mapping per case and material region, candidate roles suggested from names/dimensions and corrected by user, saved in workspace state rather than the OpenFOAM case.
- Main Field engine in `index.html`: original OpenFOAM time/region/partition field loading, scalar/vector parsing, liquid/mushy/solid segmentation, local `pmStats` (mean, median, p5/p25/p75/p95), cell-wise ratios with epsilon, Pearson/Spearman, derived rates, formula parser and verification.
- `v14-momentum-mechanisms.js`: original cell-wise magnitude ratios, pressure-gradient vs buoyancy vs Darcy comparisons and evolution from actually shared times.
- `v13-physical-analysis.js` and `v13-solidification-analysis.js`: physical rates and phase signal diagnostics.

This Granada does **not** reimplement those scientific engines, silently reinterpret another region's fields, or alter any of the active #162 Field, #164 CAD, #165 2D/3D, #166 Energy, #167 Thermocouple and #168 Case Health PRs.

## New isolated user workflow

The read-only **Analysis → Granada · Phase / Momentum Evidence Explorer** is a unified query:
**Case → Analysis Type (Source Field / Phase Change / Momentum) → Region → Source Variable → Vector Component → Spatial Subset → Statistic → Discrete Source Plot**.

1. Choose an actual imported OpenFOAM case and region. The original `volumeFieldInventory` gives **source filenames, exact physical time directories and partition labels**; the independently inspected `discoveryModel.fields` supplies **field kind/dimensions**. Phase/velocity/acceleration role labels come from the existing editable per-region Field Mapping.
2. Analysis Type narrows choices only to genuinely mapped and present original fields. No fixed metal/mold case identities, guessed Darcy field, source-simulation mutation or automatic graph of all variables.
3. Select scalar value or vector magnitude/X/Y/Z. An original scalar source cannot masquerade as a vector. Unknown kinds, dimensional disagreements across sources or invalid components block the query rather than being inferred from naming.
4. Select whole region or liquid/mushy/solid subset. Phase subsets are available only when the same case/region has a **dimensionless original mapped alphaL** field, at the selected exact physical time and with cell/partition alignment. Bounds must satisfy 0 ≤ low ≤ high ≤ 1; liquid fraction must be finite and within [0,1]. Missing partitions/invalid cell samples are unavailable, not fabricated.
5. Choose count/mean/median/p5/p25/p75/p95/min/max/std. The module reuses the existing `pmLoadFieldSet`, `pmAlignedComponents`, `pmFilterByPhase` and `pmStats` implementations. For uniform fields without a source-confirmed cell count, total-cell count remains **unknown**; unweighted field-value samples cannot be advertised as exact physical volume averages.
6. Analyze up to **600 real source physical times**, with explicit rejection rather than hidden truncation. The plotted values are **points only**, not an interpolated or falsely continuous curve. Invalid physical times/unsupported source files are listed individually with reasons.
7. Output a scientific table and locally downloaded JSON with original paths, physical time, region, component, role, statistical measure, per-time cell-count confidence, phase thresholds, missing times, source warnings and physical limitations. Exports are invalidated on changed inputs and source identity. No automatic causality, front mechanism or recalescence interpretation.

## Examples of strict scientific behavior

- Only temperature exists in a region and no alphaL → whole-region temperature statistics are available; liquid/mushy/solid subset analysis is disabled.
- Both temperature and alphaL exist, but alphaL has temperature dimensions → phase subsets disabled, since alphaL is not verified dimensionless.
- Two case regions have a field named `T` → region choices show only that region's own field files/times; cross-region values never blend.
- Cell arrays are missing one partition, phase fractions outside [0,1], incomplete metadata, or NaN → that exact time is not silently treated as zero or calculated on a shortened sample.
- Only one uniform value is available and original cell count is unknown → a mean may be descriptive, but total physical cells is unknown and count-statistic should not claim one cell.
- No written time between 2 and 5 s → there are no interpolated data points at 3 or 4 s.
- Low acceleration ratio in one cell is an observation. It **does not** justify assigning cause, force dominance or local mushy-zone suppression without validating equations, dimensions, sign conventions and source derivation.

## Validation and gaps

Regressions:
- Existing `phase-momentum.test.cjs`, `field-mapping.test.cjs`, `momentum-mechanisms.test.cjs`.
- New `physics-evidence-explorer.spec.cjs` with distinct source cases/regions, metadata contradictions, phase gating, missing files, actual point times, unknown total cell count, and audit metadata.
- New `physics-evidence-loader.spec.cjs` requiring native versioned WebView2 inclusion and preservation of scientific engines.
- Dedicated independent Linux/Windows workflow `.github/workflows/granada-physics-evidence.yml`, with exact-head CI status reviewed before merge.

**Still open for #156:** complete dictionary provenance and material-specific model interpretation from fvModels/fvOptions/fvSchemes, explicit sign/dimensions-aware derived-field verification report on arbitrary tensor/vector sources, physical volume-weighted region statistics, robust large-mesh performance, full source case + installed Setup/Portable/WebView2 acceptance. Original Phase/Momentum full feature set remains in its existing screens, not all subsumed by this one exploratory panel.

**Boundary:** Granada is a conflict-free candidate, not an authorization to merge, distribute or version-bump. No user-case data is uploaded.
