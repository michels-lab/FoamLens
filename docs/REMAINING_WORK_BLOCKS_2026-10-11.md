# FoamLENS — Closure blocks (2026-10-11)

**Historical snapshot:** for the consolidated active 2026-10-19 backlog, see [`DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md`](DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md). This covers both the recent Field A–D/CAD/STEP/STL/Time Series issues #145–#149 and earlier scientific work #150–#156 (mesh checkMesh, multiregion energy, thermocouples, 3D front, 2D/3D comparison, case health, Phase Change/Momentum). #117/#131 still open. Experimental code is NOT merged; v1.8.10 remains latest known published baseline.

This is the executable acceptance plan for the work that remains after main `a3540fe` (PR #58). Status is **evidence-based**, not an overall product-completion percentage. The desktop UI must preserve the approved visual design. Release publication is not authorized by this document.

| Block | Scope | Hard exit criteria | Evidence |
| --- | --- | --- | --- |
| **1 — Field 3D physical multiregion** | Metal+mold in ONE real WebGL scene; opaque/transparent interface, measured region fields/legends, physical-time mismatches, probe/export, GPU lifetime | Real OpenFOAM multi-region Windows portable+installed and screenshot validation; executable GL render-order regression; distinct fields and missing/asynchronous time cases; transparent interface reviewed without z-fighting; bounded resource usage | Issue #40, `desktop/tests/field-view.test.cjs`, Windows QuickCup/VTK, Program.cs native smoke |
| **2 — Data 2D / Compare / UX** | Actual Time Series/Probe/Spatial Profiles/Solver Logs; 2D difference + multi-case 3D A/B; responsive captions/header/About | Real interaction and plot persistence, no fabricated physical clock/units, direct screenshots across required viewports and themes | Issue #30 |
| **3 — Scientific performance and assumptions** | Scientific unit compatibility, thermal/energy assumptions, large case RAM/VRAM and cache/export benchmarks | Reproducible quantitative tests and documented supported scope/performance ceilings, no invalid field substitution | Work ledger + science tests |
| **4 — Product acceptance / distribution** | Current exact SHA compile/portable/install/updater, rendered Home/About/changed workspaces, integrity-bound evidence, audit updates, optional distribution | Direct candidate passes gates; post-release owner review remains independent and cannot block publication; release requires separate explicit request | Issue #29, CI visual manifest, `AGENTS.md` |

## Block 1: break the deliverable into checkable gates

- **B1.1 — Real measured geometry and regions:** already present (metal+mold at physical t=9.8, independent names, fields, GPU layers and legends). Regression maintenance required.
- **B1.2 — Transparent interface:** PR #59 opaque-first, PR #63 coplanar opaque depth tie, exact main CI 38138027905 success. **Current bounded candidate:** globally sort individual transparent triangles across measured metal/mold and the selected primary within 65,536 triangles, one WebGL draw and three reusable scratch buffers; otherwise fall back to established region-center blending. Real 32x32 native WebGL overlapped alpha pixel proof and Windows UI smoke are required. Triangle-center sort is not per-fragment order-independent transparency for intersecting/coplanar translucent polygons: issue stays OPEN.
- **B1.3 — Asynchronous/missing field:** verified by real on-disk B13 clone (PR #62, main `7c7d77b`): metal measured `T` at t=9.8; mold has only measured t=0, with the existing t=9.8 mold field removed from a **CI copy**. Windows portable and installed WebView2, source discovery, geometry-only missing-field legend and original-frame restoration passed exact-head CI [38136034400](https://github.com/michels-lab/FoamLens/actions/runs/38136034400); post-merge [38136514225](https://github.com/michels-lab/FoamLens/actions/runs/38136514225) SUCCESS. No invented measurement, time interpolation or region conflation.
- **B1.4 — Probing and exports:** attribution and exact frame checks exist; keep both measured and geometry-only provenance regression on real physical regions.
- **B1.5 — Scaling:** orphan buffer fix PR #60 and visibility cache PR #61 validated. PR #64 (main `cb78a2e`) has exact-head Windows CI success: 1-million-triangle *synthetic* Node RSS evidence with hard 65,536 transparent-sort cap, real WebView2 pixel test and measured native-host-only QuickCup working set. **Further process-memory acceptance candidate:** native Windows QuickCup smoke samples both host and all active WebView2 processes belonging to this WebView2 environment before/after case load, deduplicates PIDs, reports unreadable/terminated PIDs and actual working set/private bytes with no invented thresholds. Excludes crashpad, other native helpers and GPU driver VRAM; not whole-device memory. Full measured multi-million-cell *real* OpenFOAM case GPU RAM/VRAM/performance on owner hardware remains OPEN.

**Closure rule:** Block 1 is not complete merely because its first PR merges. Do not close issue #40 until B1.2 through B1.5 have adequate measured evidence; do not claim pixels or large-scene performance that CI has not verified. No Microsoft Store work while the channel is paused.

### Block 2 B2.2 — Field toolbar/probe false-zero guard (validated 2026-10-12)
- PR #68 passed both exact-head Windows CI runs #38184372194 / #38184369569 and was merged to `main` at `839f021b`. Invalid physical times and missing field samples no longer become measured zero; real t=0 and measured zero remain valid.
- PR #69 passed both exact-head Windows runs #38184333561 / #38184323493 and merged at `666304de`, excluding geometry-only/unmeasured cross-view probes.
- PR #70 passed #38196879728 / #38196865562 and merged at `4e7dac11`: A/B and extra views reject missing primary physical time and clear stale field/mesh/probe buffers.
- PR #71 passed #38197029876 / #38197015645 and merged at `5fba8ffb`: physically equivalent seven-component OpenFOAM dimension exponents compare numerically while explicit incompatible units remain blocked.

### Block 2 B2.5 — Numeric equivalence of OpenFOAM dimensions (2026-10-11)
- Reproduced false incompatible-units/dimensions rejection in temporal-alignment comparisons when the seven physical exponents have identical values but are serialized as `1`, `1.0` or `1e0`.
- Candidate uses strictly parsed, complete seven-exponent OpenFOAM vectors for numeric equivalence; malformed/incomplete dimensions retain conservative raw-text comparisons, and distinct explicit units (e.g. K/degC) stay incompatible without a conversion.
- Production-core V8 examples passed locally in the GitHub execution environment. New science regressions are committed; exact-head Windows/OpenFOAM integration CI remains pending. No release or owner visual acceptance is implied.

### B1.6 — Real-region camera bounds metadata guard (2026-10-12)
- Found mesh-union camera fit using `Number(null)`, `Number(false)`, and `Number('')`; invalid/missing coordinates could expand the physical scene to an invented zero-origin bound.
- Bounded fix parses only explicit finite numeric metadata for complete XYZ min/max triples. The real union of valid physical region meshes continues to drive camera fit; malformed/partial/reversed bounds are omitted rather than painted or inferred.
- New executable Field View tests cover missing, boolean, blank, Infinity, NaN, reversed/incomplete bounds and valid numeric strings. Source-executed smoke passed; exact-head Windows OpenFOAM CI is required. This **does not** close large-scene physical GPU/VRAM or owner screenshot acceptance (#40 remains open).


## Current evidence and remaining closure boundary — 2026-10-12

This section supersedes **candidate/pending** labels above only where exact-commit evidence exists. Do not interpret a closed source regression as owner visual acceptance, hardware VRAM certification or a published app release.

| Gate | Verified implemented evidence | What remains |
| --- | --- | --- |
| B1.6 physical multiregion camera bounds | PR #72, `main` `b0bc0dc`, both Windows runs #38212583297 and #38212564980 SUCCESS; rejects null/blank/boolean/reversed/partial bounds instead of creating fake geometry | B1.2 true intersecting alpha surfaces and B1.5 measured real multi-million-cell hardware RAM/VRAM / frame rate remain **open**, issue #40 |
| B2 physical clocks / probes / quantity dimensions | PRs #66, #68, #69, #70 and #71 merged with actual source-function regressions, QuickCup and Windows candidate checks | Full UI behavior and owner follow-up must still follow the relevant evidence contract; don't recreate fake-0 fixes |
| B3 phase/thermal/energy measured data | Integration PR #76, `main` `990cf418`, exact-head prior-to-merge Windows/QuickCup run #38213866848 **SUCCESS**. Solidification, Thermal and Energy Audit reject missing readings; residual energy integration fails closed if aligned grid has a missing physical sample | Broader thermophysical model assumptions, real large-case performance and any dataset-specific scientific validity outside the tested fixtures are still **open** |
| B4 Setup, Portable and native UI evidence | PR #67 Setup acceptance/shortcuts and PR #76 exact binary SHA-256 re-verification. Native build / installed+portable screenshots on validated PR branch; owner review remains **after** publication | Main integration run for `990cf418` and owner post-release review are separate gates; issue #29 remains **open** until full exact published candidate evidence and actual acceptance |
| Microsoft Store | Provider-bound Store channel remains paused as previously directed | No Store submission, certification or publication claim |

**Release boundary:** all source changes listed above are on `main` as of this recorded state; the new exact-head main run for `990cf418` was started, but this note does not assert it finished. No new release has been authorized or published. Do not close #29 or #40 based only on the regression merges.


## 2026-10-12 — integration triage against current main (audit update)

- Inspected `main` at `caa38c5cc0b564125e59a5dc62e4713c0b84273c`. Current README still identifies publicly published Desktop `v1.8.0`; this audit does **not** authorize release.
- The physical multiregion development branch `development/field-multiregion-scene-20261008` is 234 commits behind main and **zero ahead**: do not resurrect/merge it.
- `feat/field-weighted-oit-webgl2-20261012` at `9561d2e93e21cf288ff74d594585e7c35d826888`: 6 commits ahead / 9 behind main. Its PR-triggered Windows workflow run [38287191059](https://github.com/michels-lab/FoamLens/actions/runs/38287191059) finished **SUCCESS**. This is **branch-head evidence only**, not a rebased-main integration test, actual hardware acceptance or published binary.
- `feat/field-gpu-hardware-provenance-20261012` at `0b805beb9815ac999eccab3f30f684bc3e464193`: 3 commits ahead / 4 behind main. Its PR-triggered Windows workflow run [38290778910](https://github.com/michels-lab/FoamLens/actions/runs/38290778910) finished **SUCCESS**. This does **not** establish full GPU VRAM measurement or a pass on the owner's device.
- **Next integration gate:** reconcile both branch deltas against fresh main, confirm existing changes aren't duplicated, review `Program.cs`, `v14-field-view.js`, workflows and GPU scripts for conflicts, then run exact-head Windows packaged portable+installer scientific/UI and real multiregion acceptance. Do not merge old divergent heads merely because their earlier CI runs were green.
- **Open acceptance:** crossed-polygon OIT pixels on supported native GPUs; measured high-cell-count OpenFOAM frame rate, host/WebView2 process memory and GPU VRAM; owner post-release visual review. Keep #40 and #29 open and Microsoft Store paused.

### 2026-10-12 follow-up — explicit integration PR triage
- Created draft [#106](https://github.com/michels-lab/FoamLens/pull/106) from `feat/field-weighted-oit-webgl2-20261012` and draft [#107](https://github.com/michels-lab/FoamLens/pull/107) from `feat/field-gpu-hardware-provenance-20261012`. GitHub reports both **not mergeable** against current `main`; historical branch Windows successes alone do not unblock merge.
- Compared blob identities against `main`: GPU hardware inventory script, GPU process memory test, Windows `Program.cs` and GPU hardware provenance document are already byte-identical between the GPU branch and main. GPU memory-series scripts differ, while packaged GPU smoke already exists in main but not the old branch. This confirms blind merging/reverting the old branch could regress newer main behavior. Reconcile only truly missing changes, preserving later smoke instrumentation.
- No functional GPU/OIT merge, release or claimed owner hardware acceptance occurred during this triage. Next implementation must resolve the outstanding OIT source delta on top of current main and validate packaged evidence end-to-end.

### 2026-10-12 — Loaded real-case GPU telemetry gate integrated

- **B1.5 partial evidence milestone:** [PR #110](https://github.com/michels-lab/FoamLens/pull/110), `main` `52c91e4`, exact-head Windows CI [#38299366963](https://github.com/michels-lab/FoamLens/actions/runs/38299366963) **SUCCESS**. Portable and installed WebView2 hosts handshake with Windows sampler only **after** actual QuickCup OpenFOAM metal+mold Field rendering. Each reports PID, source SHA, case identity, loaded phase and three scoped GPU Process Memory samples, with unavailable/null rather than fictitious measurements. Previously observed `counter-sampled` results are hosted-runner GPU counters, **not** total VRAM. The real large/million-cell owner-hardware workload, per-adapter attribution and loaded/unloaded/playback peak remain open; issue #40 is not closed. No release was authorized.
