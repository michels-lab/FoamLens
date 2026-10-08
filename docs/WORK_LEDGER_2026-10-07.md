# FoamLens — Consolidated Work Ledger

Audit date: 2026-10-07. Baseline `main` `4c408b3d5d0b75982a1d98504cabeeb47fd4e048` (Desktop v1.6.1). This ledger distinguishes **implemented** from **fully verified**; test file existence is evidence of coverage, not proof that every scientific scenario is correct. No new features are approved merely because they are possible.

## Priority definitions
- P0: correctness and preventing misleading scientific interpretations.
- P1: defined functional assurance/performance work after P0.
- P2: bounded enhancements or external publication work.
- P3: deferred/optional/maintenance.

| Priority | Area | Status | Evidence | Next action |
|---|---|---|---|---|
| P0 | Windows CI, setup, portable | VERIFIED | CI #922 SUCCESS; v1.6.1 release; portable and installed smoke | Maintain gates |
| P0 | Scientific integration | VERIFIED_WITH_SCOPE | QuickCup + VTK passed #922; synthetic regression suite | Retain fixture-independent behavior; expand coverage based on reproduced defects |
| P0 | Field Mapping physical dimensions | IN_PROGRESS | v13-field-mapping.js; field-mapping.test.cjs; PR #26 | Validate dimensional guard with CI before merge |
| P0 | Dimensional semantics throughout comparisons | AUDIT_NEEDED | dimensions-units.test.cjs, temporal-alignment.test.cjs, spatial-differences.test.cjs | Inspect case/field compatibility and missing metadata end-to-end; add failing tests first |
| P1 | General field/case discovery | IMPLEMENTED | discovery-model.test.cjs, generic-case-identity.test.cjs, openfoam-integration.test.cjs | No rewrite; issue-led extensions |
| P1 | Multiregion and decomposed fields | IMPLEMENTED | multiregion-analysis.test.cjs, decomposed-field-view.test.cjs | Preserve region-specific identity |
| P1 | Temporal alignment and comparisons | IMPLEMENTED | temporal-alignment.test.cjs, dual-timeseries.test.cjs, general-case-comparison.test.cjs | Check complex edge cases; no speculative rewrite |
| P1 | Spatial and strict 3D differences | IMPLEMENTED | spatial-differences.test.cjs, field-compare.test.cjs | Preserve mesh/topology equality requirements |
| P1 | 2D/3D plot ownership and unified controls | CLOSED | UX coherence audit #792, plot-surfaces.test.cjs, section-ownership.test.cjs | Regression-only |
| P1 | Large dataset throughput/cache/export | IMPLEMENTED_OPTIMIZATION_OPEN | large-project-stress.test.cjs, native-field-streaming.test.cjs, multipanel-performance.test.cjs | Require measured bottleneck/benchmark before changing |
| P1 | Findings, provenance and exports | IMPLEMENTED | findings-export.test.cjs, reproducible-export.test.cjs | Audit metadata completeness per output before expansion |
| P2 | Thermal, solidification and phase | IMPLEMENTED_SCOPE_TO_AUDIT | thermal-analysis.test.cjs, solidification-analysis.test.cjs, phase-momentum.test.cjs | Scientific scope/assumptions audit; no unbounded physics feature mandate |
| P2 | Energy, coupling and flow | IMPLEMENTED_SCOPE_TO_AUDIT | energy-audit.test.cjs, coupling-audit.test.cjs, flow-analysis.test.cjs | Scientific scope/assumptions audit |
| P2 | Vector, vorticity and streamlines | IMPLEMENTED | vector-analysis.test.cjs, vector-fields.test.cjs, streamline VTK reference in CI | Regression-only unless defect reproduced |
| P2 | Solver logs/numerical performance | IMPLEMENTED | numerical-performance.test.cjs, momentum-mechanisms.test.cjs | Optional extensions require definition |
| P2 | Store MSIX build | VERIFIED_BUILD | Store CI #6 SUCCESS; store-msix.test.cjs | Partner Center acceptance/publication still external pending |
| P3 | Optional Authenticode | BLOCKED_EXTERNAL | Signing skipped, no publisher certificate | Only when certificate is available |
| P3 | GitHub App / cloud | DEFERRED_BY_USER | INFRASTRUCTURE_AUDIT.md local-first | Do not implement |
| P3 | Historical documentation cleanup | DOCUMENTATION_DEBT | GIT_AUDIT_LOG.md header still claims v1.4.2; v1.4 spec historic | Reconcile current-state headers without altering historical entries |
| P3 | Legacy open PR #7 | REVIEW_NEEDED | Open old v1.5.0 candidate PR; current release v1.6.1 | Assess obsolete status, close only after confirming no unique changes |

## Execution policy
1. Audit each topic once. Do not open a PR for every tiny issue; consolidate corrections by validated workstream.
2. Only promote confirmed defects or explicitly scoped requirements to development. Add regression tests that reproduce them.
3. Prefer one working branch and one reviewed PR for the current block; no automatic stable release.
4. Protect the current visuals, local-first behavior, immutable brand assets, OpenFOAM case files and existing scientific validation.
5. Keep GitHub integration for end users paused at user's instruction; ordinary source CI remains active.
6. Before claiming closure, record exact CI run and any test limitations.

## Immediate gate
- PR #26 contains the Field Mapping dimensional guard and targeted regression cases; draft until current-head CI validates it.
- Follow with a focused end-to-end field/unit compatibility audit and then benchmark-defined performance work, not speculative rewrites.
