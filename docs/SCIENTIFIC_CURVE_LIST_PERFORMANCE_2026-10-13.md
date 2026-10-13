# FoamLENS scientific curve-list scalability — 2026-10-13

## User evidence and source diagnosis

The user's actual v1.8.1 Windows import screenshot recorded **3,008 files, 184.8 seconds elapsed and 95%** while derived/solver analyses were running on a 2D model. That original elapsed time must never be represented as a benchmark of the later v1.8.2 code. Issue #117 tracks native persistent indexing, large-mesh benchmarks, and real owner-hardware before/after evidence.

The initial first-interaction remediation in v1.8.2 removed expensive eager solver audits and bounded **individual file rows** in the *Case Manager*. The separate curve selection panel, `renderList()`, however, continued to call `appendSeries()` on **every** selected scientific series, allocating a checkbox, label, metadata, listeners and DOM element for each plot trace even when thousands of curves had been indexed. It also recreated that entire list when the selected curve changed.

## This change

- Bound the **2D curve-list DOM** to **120 visible rows initially** across all cases, while keeping the full unmodified series collection and plot selection/visibility data intact. This is not field decimation, downsampling, or exclusion from the physical analysis.
- Provide explicit **Show next 150** and **Show all curves** controls. Clicking either retains the user's full access to every scientific data series; the latter deliberately opts in to building more DOM nodes.
- For multiple cases, preserve physical case grouping and truthful total curve counts. Render only group headers whose members are actually in the visible slice.
- Keep list limits **per scientific Data view** (timeseries, profile, log), so expanding the timeseries list does not force thousands of profile rows on first visit.
- Add compact responsive footer styling and source-executed, 3,008-curve regression that verifies the initial 120 rows, next 150, full 3,008 on request, separate physical groups, no mutation/removal of original y/t data, and independent view defaults.
- Run this regression in both rapid Node 22 and full Windows .NET/WebView2/QuickCup release CI. Keep existing source-executed fast-import, scientific probe, numerical equivalence, EULA, native OpenFOAM and visual gates.

## Limits and remaining critical work

This improves **DOM list construction and interaction**, not the initial reading or parsing of the user's 3,008 raw OpenFOAM files. Actual cold/warm end-to-end import timing and CPU/RAM/native memory, plotting 10,000 traces, large 2D/3D meshes and disk-backed native field index remain unverified and open in issue #117. The user is willing to ship a large native scientific dependency if it genuinely improves numerical workflows.

No new release until exact branch-head CI passes. Do not overwrite the already published v1.8.2 binaries and do not claim v1.8.3 is public until GitHub Release assets and SHA-256 are verified.
