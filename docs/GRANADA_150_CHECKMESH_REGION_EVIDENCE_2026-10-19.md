# Operación Granada #150 — Multi-region checkMesh Evidence Matrix

**Date:** 2026-10-19. **Status:** independent source-backed candidate, **not merged or released**. Tracked under issue #150, distinct from Developer software auditing #158.

## Already existing on main (not rebuilt)

FoamLens `v20-mesh-quality-audit.js` already parses a *single* user-selected OpenFOAM `checkMesh` text report and reports count, volume, face and quality quantities with the precise original reported/not-reported distinction, geometry bounds, warning lines, explicitly separated multiple-region summaries, and JSON export. The main app also has a source-backed `discoveryModel.regions` inventory for imported cases. Those parsers and viewers remain unchanged.

## What this Granada adds

The isolated `v24-checkmesh-region-evidence.js` mounts **Analysis → Granada · Multi-region checkMesh Evidence Matrix**. Import up to **24 local original checkMesh text files** (12 MiB each). Optionally select a real imported OpenFOAM case to supply its expected region labels. The independent module calls the original `maPureCheckMesh` for every report, then creates a combined evidence matrix.

1. **Explicit region attribution only:** a checkMesh report's own `Region: label` headers (including multi-region reports already separated by the original parser) determine regions. Filenames, guessed material roles, user case name, imported case path, mesh viewer layer, or mere selection **never** become source proof of the report's actual region or original case. If no unique label exists, evidence is **unassigned**.
2. **Coverage:** actual reported labels are compared to the case's imported `discoveryModel.regions` only as an explicitly limited availability check. Report-to-case binding remains **manual and unverified**. Missing names and unexpected extras are visible.
3. **Collisions:** two reports declaring the same region are a **conflict**, never merged/summed/overwritten. The first value remains displayed as explicitly conflicting, and overall status cannot be green. Unknown/unreported metric values stay `null`.
4. **Source-reported internal contradictions:** checks for negative/noninteger counts, `internalFaces > faces`, nonpositive or inconsistent source-reported volumes; these are consistency checks of *text*, not an independent polyMesh recomputation or universal mesh-quality thresholds.
5. **Warnings and failures:** an original reported failure is surfaced even if regionless/unattributed. `Mesh OK` with warnings retains a separate caution status. Source interpretation status can never certify scientific or CFD validity.
6. **Location clues, not measured mesh geometry:** if an original warning mentions `cell 123`, `face #45` or explicit numeric `at (x y z)`, the evidence records **literal ID/coordinate clues** with original report line number. They are never presented as verified 3D locations until the actual source polyMesh is separately checked. No fabricated vertex association.
7. **Explicit local JSON export:** preserves source labels, report index (`report-01`), available metric evidence, contradictions, warnings, unknowns, unattributed failures and locator clues, while excluding filenames, absolute paths, raw log text, source case paths and scientific cell-field values. A new case, changed region discovery or file selection invalidates the export. No network calls, OpenFOAM execution or case mutation.

The result uses `overallScientificValidity: "not-certified"`, regardless of region coverage and number of `Mesh OK` reports. The output's `all-expected-regions-reported` status means only that the original report headers collectively account for expected labels without duplication: **it does not mean the case mesh is physically correct or its interfaces matched**.

## Reference scenarios covered by isolated regression

- Two original `metal` and `mold` reports, with separate reported cell, face and volume counts.
- A missing case region, a duplicate declared region, an unexpected region and a report without any attributed region.
- An explicitly failing checkMesh report **without a region label** cannot be silently dropped as merely unknown.
- Source counts contradiction (`internalFaces > faces`), nonpositive minimum volume, source `Mesh OK` with warning, and missing quality metrics interpreted as `null` rather than zero.
- Multiple region headers in a single checkMesh report, cell/face/coordinate text locator extraction, report filename privacy and lack of case mutation or network actions.
- Existing `mesh-quality-audit.test.cjs` parser regression and `test-suite-manifest.test.cjs`.

Dedicated GitHub Actions: `.github/workflows/granada-checkmesh-region-evidence.yml` on Ubuntu and Windows. Native bundled WebView2 installation and owner real-case visual acceptance are **not** proved by Node specs alone.

## Still open in #150

- Independently parse and verify original `polyMesh` geometry, actual cell and face coordinates, boundaries, owner/neighbour and patch labels; validate report case/region association through source hashes/mesh geometry and report origin.
- Calculate area, skew, nonorthogonality, orientation, element volume and topological integrity **from the source mesh**, plus physically meaningful quality criteria when justified, rather than transcribed text.
- Validate CAD versus OpenFOAM scale and surface boundaries without conflating an STL skin with a polyhedral volume mesh; connect independently validated interface patch pairs.
- Pin/locate actual defective faces/cells in the native 3D Field viewer, with sourced coordinates/IDs, multiple disconnected or moving geometries.
- Verify on the owner's actual QuickCup/OpenFOAM source case plus installed Windows Setup/Portable and explicit release authorization. No issue closure, binary merge or release is implied by CI.

### Parallel changes intentionally avoided

Active PRs #162 (Field), #164 (CAD), #165 (2D/3D), #166 (Energy), #167 (thermocouple), #168 (Case Health), #169 (Phase/Momentum), #170/#171 (both #153 Front), #172 (performance) and #173 (Developer). No shared scientific parsers, native Program.cs, monolithic Windows build workflow, or unfinished branch was modified. Master Granada protocol remains maintained by the separate Michel's Lab software standards repository.
