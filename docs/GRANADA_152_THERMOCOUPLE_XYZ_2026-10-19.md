# Granada #152 — Thermocouple XYZ mapping, source-backed scientific validation

Status: **unreleased candidate**. This is an independent module from a fresh `main`, not a merge of unfinished Field, CAD, 2D/3D or Energy PRs. A passing parser test is not proof of installed WebView2 behavior or physical validity of an experimental run.

## What the module actually does

The pre-existing FoamLens `v14-experimental-validation.js` already handles CSV/TXT, simulated/experimental temperature comparison, thermal rebound observations, and phase evidence. The published Field system separately supports 3D Probe selection and generation of source-backed time histories using `fwBuildProbeFieldHistory`. This Granada **connects the two without duplicating them**.

In the **Analysis → Granada · Thermocouple XYZ Mapping** section:
1. Create actual 3D temperature probe history using **Data → 3D field history** and pin a Probe in the correct material region. The source must be one of the existing `field3d-probe-history|...` sequences produced by the application from OpenFOAM fields. An arbitrary added curve cannot masquerade as a probe history.
2. Load the same case and region, including its actual `polyMesh`, in the **Field** view. The current loaded mesh is essential: neither a bounding box nor a nearest center is sufficient to prove that a sensor is inside material. The existing OpenFOAM face-based `fvCellContainsPoint` method is used, requiring face/owner topology, and the selected sensor and source-probe locations must each pass independently. If topology/case/region is unavailable, or no cell is found, the comparison is blocked.
3. Type the sensor's measured X, Y, Z with an explicit unit (m, cm or mm), and an explicit maximum physical separation from its source probe. No implicit coordinates or zero by default.
4. Import a real experimental CSV/TXT/TSV/DAT file; select the actual time and temperature columns, K or °C, and any explicit experiment time shift in seconds. Missing numeric rows, duplicate physical times, non-finite values and unrecognized units block evaluation. The user must review the columns; no measurement is generated.
5. Compare only experimental samples inside the overlapping physical-time range (source temperature linearly interpolated in time when necessary). Report paired n, RMSE, MAE, signed model−experiment bias, max |ΔT|, real containment cell IDs, sensor/probe XYZ, physical separation, and source provenance.
6. Optionally evaluate sensitivity using **other independently generated 3D Probe histories** from the same case/region/field family and inside an explicit metric radius. Every alternate Probe position must independently pass actual containing-cell validation. If no suitable other measurements exist, report *unavailable*; never simulate displaced samples by applying an assumed thermal gradient.
7. Export the evidence JSON or aligned CSV on explicit action. Changing any source, column, unit, location or tolerance invalidates prior computed export.

## Scientific limits and backlog

- The cell method checks actual faces with the convex half-space test used by FoamLens Field. Highly non-convex/degenerate cells, material interfaces and geometry tolerances may require stronger exact polyhedral containment and mesh-quality verification.
- The actual thermocouple bead dimensions, lead wires, material assignment, thermal contact and calibration are not measured automatically. A user-configured spatial tolerance documents mismatch; it does not certify co-location.
- A derived history is accepted **only** when it retains its source-backed Field history key, case, region, real XYZ and original time samples. Read-only analysis does not generate arbitrary OpenFOAM probe data.
- Sensitivity is evaluated only across distinct *existing measured/sampled histories*. No spatial interpolation or synthetic displacement temperature.
- Thermal rebound is not automatically designated metallurgical recalescence. The earlier Experimental Validation module's phase-evidence tools remain separate.
- Pending #152: test on the owner's experimental thermocouple records and source cases; actual 3D region switching and installed Setup/Portable WebView2 acceptance; more complete concave/irregular-cell geometric containment; explicit mapping to independently imported OpenFOAM probes file location metadata where provided; complete sensitivity protocol/reporting and comparison graphic. No case mutation, automatic upload, version increment or public release.

## Validation gates

`desktop/tests/thermocouple-xyz-mapping.spec.cjs` tests known convex cell containment, out-of-bounds, absent topology, independent probe containment, Kelvin/Celsius, time shift/no extrapolation, provenance, deliberate region/case mismatch and sensitivity across real alternative histories. `thermocouple-xyz-loader.spec.cjs` checks integration into existing native frontend modules. Dedicated GitHub Actions CI runs these with the existing `experimental-validation.test.cjs` and `field-probe.test.cjs` on Ubuntu and Windows, without changing overlapping PRs or the monolithic Windows build workflow.

**Release policy:** no release without Michel's explicit per-app order. Original pending PRs are not superseded or closed by this Granada.
