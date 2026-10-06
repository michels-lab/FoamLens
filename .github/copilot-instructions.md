# Copilot instructions — FoamLens

Read `AGENTS.md`, `docs/GIT_AUDIT_LOG.md` and the relevant workflow/tests before modifying FoamLens.

Keep scientific evidence and provenance explicit. Never invent OpenFOAM values, associations, topology compatibility or causal interpretation.

Fix UI ownership problems at the component/workspace level rather than hiding controls with accumulating overrides. Preserve separation among 3D Field View, Spatial Profiles, Time Series and Solver Logs.

Use current-commit regression tests and Windows build/smoke validation where applicable. Update the project audit log for meaningful changes. Do not publish a release unless explicitly assigned.
