# FoamLENS — Closure blocks (2026-10-11)

This is the executable acceptance plan for the work that remains after main `a3540fe` (PR #58). Status is **evidence-based**, not an overall product-completion percentage. The desktop UI must preserve the approved visual design. Release publication is not authorized by this document.

| Block | Scope | Hard exit criteria | Evidence |
| --- | --- | --- | --- |
| **1 — Field 3D physical multiregion** | Metal+mold in ONE real WebGL scene; opaque/transparent interface, measured region fields/legends, physical-time mismatches, probe/export, GPU lifetime | Real OpenFOAM multi-region Windows portable+installed and screenshot validation; executable GL render-order regression; distinct fields and missing/asynchronous time cases; transparent interface reviewed without z-fighting; bounded resource usage | Issue #40, `desktop/tests/field-view.test.cjs`, Windows QuickCup/VTK, Program.cs native smoke |
| **2 — Data 2D / Compare / UX** | Actual Time Series/Probe/Spatial Profiles/Solver Logs; 2D difference + multi-case 3D A/B; responsive captions/header/About | Real interaction and plot persistence, no fabricated physical clock/units, direct screenshots across required viewports and themes | Issue #30 |
| **3 — Scientific performance and assumptions** | Scientific unit compatibility, thermal/energy assumptions, large case RAM/VRAM and cache/export benchmarks | Reproducible quantitative tests and documented supported scope/performance ceilings, no invalid field substitution | Work ledger + science tests |
| **4 — Product acceptance / distribution** | Current exact SHA compile/portable/install/updater, rendered Home/About/changed workspaces, integrity-bound evidence, audit updates, optional distribution | Direct candidate passes gates; post-release owner review remains independent and cannot block publication; release requires separate explicit request | Issue #29, CI visual manifest, `AGENTS.md` |

## Block 1: break the deliverable into checkable gates

- **B1.1 — Real measured geometry and regions:** already present (metal+mold at physical t=9.8, independent names, fields, GPU layers and legends). Regression maintenance required.
- **B1.2 — Transparent interface composition:** **IN PROGRESS**. Existing layer order draws selected primary before secondary, even if the latter is opaque or should blend behind the primary. Implement one shared opaque-first pass and camera-sorted transparent composition including the primary mesh. This is *approximate alpha blending*, not per-fragment order-independent transparency.
- **B1.3 — Asynchronous/missing field:** strict physical clock guards and geometry-only labeling already implemented. Still require real fixture screenshot/interaction coverage for different regions' time grids.
- **B1.4 — Probing and exports:** attribution and exact frame checks exist; keep both measured and geometry-only provenance regression on real physical regions.
- **B1.5 — Scaling:** budgeted streaming, cancellation and resource cleanup already exist. A repeatable high-cell-count RAM/VRAM benchmark and regression thresholds remain required.

**Closure rule:** Block 1 is not complete merely because its first PR merges. Do not close issue #40 until B1.2 through B1.5 have adequate measured evidence; do not claim pixels or large-scene performance that CI has not verified. No Microsoft Store work while the channel is paused.
