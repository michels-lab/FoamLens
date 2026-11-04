# Granada — experimental validation fraction-role correction (2026-11-03)

## Root cause / original regression
The existing `v14-experimental-validation.js` considered any canonical field containing `alpha` eligible phase evidence and unconditionally treated its values as liquid fraction. `evPhaseMetrics` assumed downward alphaL threshold crossing, while `evPhaseEvidenceAtRebound` called a decrease “solidifying”. For a genuine solid-fraction source (including ambiguously named `alpha1`), those conclusions can be reversed. Previous `experimental-validation.test.cjs` covered an alphaL-style descending series, not an alphaS source or unconfirmed physical role.

## Source-owner change
- Retain source-backed case selection but explicitly request **Confirm original fraction meaning**; default is **Unconfirmed — no phase claim**, without inferring anything from `alpha1`.
- Use user-confirmed `liquid` values unchanged; convert confirmed `solid` via `alphaL = 1 - alphaS` only after validating every source sample is numeric, finite and in [0,1].
- Reject non-dimensionless reported field dimensions, invalid/descending liquid-fraction thresholds and insufficient physical time points. Do not compute phase timings or a rebound-related phase interpretation on rejected source.
- Reset role on source/simulation change and rebind. Preserve independent simulation-versus-experiment temperature RMSE/MAE/bias despite absent/rejected optional phase evidence.
- Display an explicit warning when phase evidence is unavailable; when valid, show which original fraction was user-confirmed and whether conversion happened. Record source field/case/region/probe, declared role, conversion, dimensions, negative spatial co-location status and reason locally in `FoamLensLastExperimentalValidation.phaseProvenance`.
- No automatic recalescence identification, no spatial co-location certification, no modification or uploading of private OpenFOAM data, no new dependency and no released binaries.

## Regression evidence
- Existing regression `desktop/tests/experimental-validation.test.cjs` extended with unconfirmed-role, invalid range/blank/nonfinite, alphaS↔alphaL physical equivalence and source-owned `evRunValidation` negative tests (unknown role, inverted thresholds, wrong dimensions and out-of-range input) while preserving temperature comparison.
- Syntax compiled using V8 in current session; **full Node tests, packaged Windows WebView2 and Setup/Portable acceptance not yet proven** until exact PR-head workflow results.
- Latest verified public release `v1.8.10` is unchanged. The separate scientific mapping/solidification issues #152/#153 and stable artifact gate #238 remain open.

## Next gates
1. Verify exact PR HEAD GitHub Actions Node regression on Windows and selected scientific workflows.
2. Check genuine application UI in installed and portable WebView2 at compact and wide widths, including role reset and bilingual labels; record actual screenshot review.
3. Confirm on original mixed-role experimental data, case/region/probe co-location and independent external thermocouple calibration before any scientific validation claim.
4. No RC, no release or version bump from this branch.
