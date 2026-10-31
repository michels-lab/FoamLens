# Operación Granada #155 — Scientific Case Health

**Scope:** source-backed evidence inventory for an imported OpenFOAM case; isolated from in-progress Field #162, CAD #164, 2D/3D #165, energy #166 and thermocouple #167 PRs.

**Status:** candidate on branch `feat/granada-155-scientific-case-health-20261019`, **NOT** a released FoamLens feature. No solver, mesh generator or case mutation is performed.

## Existing components reused rather than rewritten

- Main frontend imports real OpenFOAM case structure into `case.discoveryModel`: actual time directories, field/header dimensions, boundary names, dictionary records, postProcessing classification and region labels. This remains the structural source.
- Native foamLog / raw solver log parser already exposes original root/metric time series, including `CourantMax`, residuals (initial/final), continuity and runtime. Existing Diagnostic and Coupling Audit provide per-solve and PIMPLE behavior.
- Existing `v20-mesh-quality-audit.js` parses a locally selected checkMesh report; this Health module **calls the same parser** and preserves warnings rather than copying physics rules.
- Existing `v14-energy-audit.js` and separate multiregion Granada #151 remain the home for flux identities, sign conventions and energy closure: the Health report **does not substitute** an energy calculation.

## What the new Analysis panel delivers

Choose an imported case in **Analysis → Granada · Scientific Case Health**. Optionally choose (on local disk) the original solver run log and checkMesh report for further evidence. These reports are **user-attributed**, not cryptographically verified to belong to the selected case; changing case clears both. Click **Audit current evidence**. The output contains:

| ID | Evidence checked | Important limitation |
|---|---|---|
| fields | Native field inventory, source records | Not proof of physically valid values |
| time | Numeric original write-time directories | Never inferred solver deltaT |
| control | Actual `controlDict` availability, `deltaT`, `endTime`, `maxCo` if present | Configured `endTime` is not achieved `endTime` |
| completion | Original local solver log `End` / fatal event / time monotonicity | Text may not belong to the selected case |
| courant | Actual `CourantMax` source histories | Compare only to provenance-backed `controlDict.maxCo`; no arbitrary universal threshold |
| residuals | Available initial/final root histories | Low residual does not certify nonlinear convergence |
| continuity | Original continuity-error histories | Size needs dimensional/solver context |
| pimple | Original `fvSolution` and corrector metadata | Presence/number of correctors not convergence |
| mesh | Unchanged original `checkMesh` parser statuses and warnings | `Mesh OK` is not CFD validation |
| dimensions | Field class, dimensions and boundary-header presence | Metadata alone cannot certify BC correctness |
| interfaces | Material-region labels and outstanding interface checks | No automatic patch/normal equivalence |
| energy | Source log and postProcessing hints | No inferred sensible/latent energy conservation |

**Six possible states** are `verified`, `warning`, `error`, `insufficient-information`, `not-analyzed` and `not-applicable`. Every state refers to **that named piece of evidence** only. Global `overall` is deliberately always `not-certified`; there is no global pass percentage or fabricated quality score.

Health JSON is exported **locally on explicit action**, with status, case ID/path, metric evidence, warnings, evidence coverage, and original-source limitations. Exports are invalidated when case/source identities or reports change; no research data is uploaded.

## Example classifications

- Complete source folders, finite log histories, `Mesh OK` with no warning and `End` → multiple checks `verified`, but **global not-certified**; mass and energy closure still require dedicated physics.
- Only an arbitrary `latestTime` directory with no logs/dictionaries → completion `not-analyzed`, source completeness `insufficient-information`; no false green status.
- `FOAM FATAL ERROR` and `End` in the same log → `error` (fatal takes precedence).
- Courant 2.1 with verified `controlDict.maxCo=2` → contextual `warning`; without original maxCo → `insufficient-information`, no guessed numerical threshold.
- `Mesh OK` plus high-skewness warning → `warning`, rather than an indiscriminate verified green status.
- Two region names but no matched interface mesh/contact evidence → `insufficient-information`, not interface `verified`.

## Deliberately unfinished

- Automatic trustworthy binding of local run/checkMesh files to the imported case via file origin/hash; signed official provenance.
- Exact end-time/controlDict stop condition and restart/parallel-run completion verification (beyond log evidence and header).
- Contextual solver/property-specific thresholds for continuity, energy, momentum residuals, non-orthogonality, skewness and BC quality.
- Dynamic per-region fields and property-constant consistency; original boundary values; contact/interface normals and conservation.
- Real imported owner cases (both full and deliberately damaged); packaged Setup/Portable installed WebView2 integration; high-volume regression and actual user acceptance.
- Publication, merging with other WIP PRs, and bumping public version. Granada never implies release authorization.

## Regression commands

```sh
node desktop/tests/mesh-quality-audit.test.cjs
node desktop/tests/coupling-audit.test.cjs
node desktop/tests/energy-audit.test.cjs
node desktop/tests/scientific-case-health.spec.cjs
node desktop/tests/scientific-case-health-loader.spec.cjs
```

Dedicated `.github/workflows/granada-scientific-case-health.yml` runs this suite in **Ubuntu and Windows** for the exact candidate commit. Status must be verified from Actions, not presumed from commit presence.
