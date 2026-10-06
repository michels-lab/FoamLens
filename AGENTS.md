# FoamLens — Agent Contract

FoamLens is a scientific OpenFOAM analysis product with a Web frontend and a Windows C#/.NET 8/WinForms/WebView2 desktop host. Before editing, read `.michelslab/project.yml`, `MICHELS_LAB_PROJECT.md`, `docs/GIT_AUDIT_LOG.md`, `docs/INFRASTRUCTURE_AUDIT.md`, and the tests/workflows that own the affected behavior.

Shared Michel's Lab rules live in `realmichelduarte/Michel-Software-Standards`.

## Product constraints

- Scientific correctness outranks cosmetic convenience.
- Do not fabricate OpenFOAM fields, boundary values, topology compatibility, physical interpretation or validation results.
- Preserve the current tab/workspace separation: controls must appear only where they are relevant.
- 3D, Profiles, Time Series and Solver Logs may share infrastructure but must not leak irrelevant UI into one another.
- Keep playback/navigation controls reachable in the workspace modes that require them.
- Do not perform unrelated visual redesign while fixing scientific or layout behavior.
- Findings/export/integration features must preserve enough provenance for a later expert or assistant to audit them.
- The current updater/release integrity path must retain explicit approval and SHA-256 verification.
- Never commit private fixture credentials or research data that belong outside this repository.

## Validation

Inspect the current workflows and use the strongest relevant current-commit regression suite for the changed surface. Desktop changes must use the repository's Windows build/smoke path when applicable. Scientific changes require tests that exercise the actual affected parser, field association, geometry, metric or analysis behavior.

A green historical release is not evidence for current HEAD.

## Completion

Record meaningful findings, fixes, failed approaches, tests and release evidence in `docs/GIT_AUDIT_LOG.md`. Infrastructure changes also update `docs/INFRASTRUCTURE_AUDIT.md` when relevant.

Do not bump a version or publish a release unless explicitly assigned.
