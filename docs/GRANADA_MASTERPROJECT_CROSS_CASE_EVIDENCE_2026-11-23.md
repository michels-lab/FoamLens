# Granada — OpenFOAM MasterProject ↔ FoamLens (2026-11-23)

## Earlier FoamLens requests reconciled
The user requested a coherent global redesign beyond Time Series, real side-by-side Field A/B/C/D and independent physical cases, readable controls, metal+mold/XYZ per viewport, all cases available to B/C/D, simultaneous 3D+profiles, independent linked/unlinked playback, no transition flicker, complete original fields/probes and rigorous scientific comparison. Installed Windows/DPI 125–200% must be accepted on the owner's real case; CI is not that acceptance. Performance #117/3,008 files remains deferred.

## Original research sources inspected
| MasterProject source family | Distinct source evidence | What FoamLens should do |
| --- | --- | --- |
| C3D-04 3D-A curvilinear V4/T02 | metal 8,960 + mold 12,352 cells; original 2,496 mappedWall contact faces per side; original C14 native time reductions include volume-weighted temperature, alpha1, speed, and estimated sensible/latent changes | Preserve original fields/mapped regions and compare native reduction against physical frame/flux data; do not call energy estimates conservation |
| C3D-05 3D-B STEP/Gmsh HEX8 | metal 92,200 + mold 178,588 cells, 12,636 contact faces per side; native C14 10 s CFD completed but NOT physically validated; 3D-B read-only reductions include min/mean/max T and alpha1, counts below reported thresholds | Use stored native states and logs, never rerun CFD to display; distinguish end of execution from physical validity |
| QuickCup 2D B/C, B14–B16 and C14–C16 | Profiles, probes, postProcessing and original case/time/units | Compare only scientifically equivalent observables with original time labels and compatible dimensions |
| Contraction/shrinkage and VOF | Separate physics and material/source models | Remain distinct from C14 until actual source evidence confirms compatibility; no hardcoded thresholds or regions |

## Delivered here in isolated FoamLens branch
An optional read-only CSV importer is integrated with the *existing* Scientific Case Health panel in Analysis. It accepts an explicit time_s column and arbitrary original numeric headers (not case-name hardcoding), validates all finite decimal samples, rejects duplicates, missing times/values and 10,000+ row overflows, and reports all original column extrema plus saved interval coverage. The exported health JSON includes the reductions and unverified-source disclaimers. Selecting a new imported OpenFOAM case clears associated CSV, solver log and checkMesh attachments. It does not write any simulation input, construct fake temperatures, run foamMultiRun, assume source-unit conversion, infer recalescence or certify conservation. All parsing stays local.

Regression tests exercise representative native A/B schemas and invalid inputs on the original source parser. New CI checks Ubuntu and Windows while rerunning the preexisting scientific health regression and embedded frontend loader.

## Granada 23 Nov: precise original timeline provenance (additional code/tests)
- Original saved CSV times and indexed OpenFOAM output directories are compared in sorted physical order, one-to-one, with 16 × machine-epsilon relative precision (minimum scale 1e-9 s). Previously the broad 1e-10 s absolute floor could falsely align distinct near-zero physical frames.
- The health JSON now explicitly records `postrunTimeline`: matching sample count, unmatched CSV count, unmatched imported directory count, the first 12 unmatched physical times on each side, and source-inventory coverage status. One-to-one matching avoids inflating an apparent match by reusing an indexed frame.
- The original case health UI explains both missing CSV and indexed times. A missing original index is not represented as 100% case match. Machine-readable status is NEVER `originalCaseBindingVerified`, nor a physics validation.
- Reject a source timeline where two individually finite saved physical times have a nonfinite arithmetic difference. Otherwise exporting to JSON would silently coerce Infinity to null, creating false numeric evidence.
- Three new source-executing regressions cover partial/disjoint original inventories, frame intervals near t=0 and numeric overflow. These are parser regressions, not a physical owner-run validation.
- Exact head and Windows CI must be checked independently; no merge, signed release, or stable version increment from these parser tests alone.

## Scientific work still needed
1. Independently bind manually provided reductions to actual original 3D A/B field files and evidence reports, using source hashes and physical region/time association. No cross-case contamination.
2. Integrate temperature metal/mold, phaseChangeSource:alpha1, p_rgh, Courant, residuals, sensible/latent budgets and contact patch heat flux, with correct 3D mesh cell volumes; do not infer physical conservation from CSV summary or solver End.
3. Continue original Field A/B/C/D and Data/Analysis/Review/Live UX demands; inspect native Windows 1024/1280/1920 windows and actual OS scaling 125/150/175/200 percent.
4. Verify original experimental QuickCup 2D↔3D physical equivalence, mesh independence, CAD contact and solidification-front normal/velocity before closing science milestones.
5. Final release must be exact-main Windows Setup+Portable with hashes/updater, physical owner's approval and no RC/Developer substitution.

## Honest status
Separate draft PR for cross-project CSV capability; Field PR #371 and Time Series PR #372 remain independent and unchanged. Only code and CI evidence is available, not validation of the owner's physical source data. Global project milestone progress remains 47 percent (7/15). Latest public stable at review: v1.8.21.
