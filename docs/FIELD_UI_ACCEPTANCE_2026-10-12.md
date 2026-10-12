# FoamLENS Field Workspace UI acceptance — 2026-10-12

Scope: surgical scientific readout correctness; approved layout, theme, Ribbon, sidebar and icons unchanged.

- The physical-time navigation slider lists available snapshots, but must **not** describe its first tick as loaded until the active Field/Profile/Log workspace reports a finite actual frame time. Before a loaded frame, show `t = —`; keep navigation available.
- When time is actually 0, show `t = 0 s`, not missing.
- On an active physical time between stored frames (e.g. an explicit/interpolated `t=9.8 s` between `0` and `10`), readout reports **the active time**, not an invented nearest-frame time; slider may remain at the closest navigable tick.
- Screen reader range input `aria-valuetext` identifies the true active time or the absence of a loaded frame.
- Field-sourced Time Series min/max/delta/mean must reject missing, boolean, blank, nonfinite or reversed limits, rather than draw an invented 0; explicit valid 0 remains supported.
- Exact-head Windows CI/QuickCup and native compact/wide screenshot contract still required. A Node-executed kernel test is not a human visual inspection. No redesign or release in this workstream.
