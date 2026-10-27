# FoamLens — 2D ↔ 3D equivalent measured observables (Granada #154)

**Status:** scientific implementation candidate; not in the published v1.8.10 Setup/Portable. Source files stay unmodified.

## Purpose
Compare the **same physical observable** from two genuinely distinct OpenFOAM cases even when their 2D and 3D meshes differ. This is not a field-to-field subtraction engine. Neither geometry equivalence nor dimensionality is inferred automatically.

## How to use
1. Import both OpenFOAM cases with source-backed temporal data (for example `postProcessing/probes`, explicitly measured regional averages, verified flux reductions). Time series must already have been generated/imported. If only volume fields exist, generating histories is a separate outstanding #146 feature; the comparator must not fabricate one.
2. Open **Analysis → 2D ↔ 3D · Equivalent measured observables**, expand the panel and choose **Refresh measured sources**.
3. Select the real measured source for the *user-designated* 2D case and the real measured source for the *user-designated* 3D case. They must be distinct cases and have compatible original OpenFOAM dimensions and convertible units.
4. Specify the **physical observable** and the **spatial equivalence basis**. Explain real coordinates, probe and region identification, normalization or cross-section mapping sufficiently for a reader to audit why the observations are comparable.
5. Check the equivalence confirmation after personally checking those inputs, select sample budget, then **Compare measured curves**. A fresh comparison is required if any input changes.
6. Review source paths, exact shared physical time, native/interpolated sample count, MAE, RMSE, 3D−2D bias and maximum absolute difference; export aligned CSV and JSON only on explicit action.

## Scientific constraints
- Source time/unit/field information is authoritative where it exists; unknown unit **cannot** silently become SI. Recognized examples: Celsius/Kelvin, kPa/Pa, kW/W; exact same other unit label can be compared but not converted.
- Alignment uses interpolation between bracketing measured source times only within their overlapping time range; never extrapolation.
- Quantity units and original OpenFOAM dimensional exponents are checked; compatibility of units alone cannot prove the location, axis/symmetry assumptions, cross-section scaling, interface orientation, or representativeness.
- The 2D/3D designation is user-provided and must not be described as mesh-verified. Neither case is modified. No implicit transfer from 2D cells to 3D cells.
- `n` counts paired evaluated time points, not statistically independent replicates. Correlated points are not independent experimental validation.
- Actual metal/molde region identities must come from sources, not filenames or assumed defaults.

## Not completed by this tranche
Automatic 2D/3D topology recognition, source-coordinate-to-cell/thermocouple verification, contour/profile mapping, section-normalized 2D/3D volume integrals, solidification-front equivalence, source sensitivity/error convergence, user QuickCup scientific acceptance, installed Windows visual review, published release.

**Relevant tickets:** #154 primary, #146 history generation, #152 physical thermocouple mapping, #151 energy conservation, #131 installed acceptance. Related overlapping work #162 Field and #164 CAD is deliberately skipped under Operación Granada. No release authorization.
