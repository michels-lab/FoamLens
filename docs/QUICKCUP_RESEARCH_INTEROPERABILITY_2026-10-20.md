# FoamLens and QuickCup — scientific integration log (2026-10-20)

FoamLens is a scientific research companion for QuickCup OpenFOAM, not only a viewer. It covers CAD and 3D geometry inspection, multiregion mesh diagnostics, energy, phase and momentum, 2D/3D comparisons, solver case health, thermocouples, and experimental comparison. These functions are generic to other supported OpenFOAM projects.

QuickCup is the source of original geometry, solver inputs, field data and scientific verification status. FoamLens reads and analyzes those sources without rewriting them. The scientific modules have open issue/PR work (#146–#156) and cannot be considered publicly shipped solely from code candidates.

QuickCup scientific work PR #18/#19 owns C3D-01 and PR #20 proposes a V15/V16 read-only evidence export: `quickcup-foamlens-openfoam-evidence-v1`. The format includes source path/hash, actual physical-time temperature comparisons, Courant and continuity diagnostics. FoamLens support for importing this proposed format is **not yet implemented or verified**.

Future acceptance: validate original case-region-time and units, keep missing data unknown, compare read-only physical metrics, demonstrate Windows Setup/Portable with the original research fixtures, and retain separate CFD versus experimental validation status.

Granada Grande policy applies to integration: prefer substantial end-to-end changes, related regression tests and verifiable acceptance; respect active PR ownership. This is a documentation handoff, not a new release or functional verification.
