# Operación Granada — FoamLens source ownership gate (2026-10-21)

## What changed
This branch extends PR #208 as an independent, non-scientific QA package after the merged #204 foreign-fixture cleanup.

1. **Executable ownership audit** — `tools/test_repository_boundaries.cjs` checks Git-tracked source and test files across desktop, tools, scripts, frontend, assets and the root Web entrypoint. It detects foreign-app import paths, runnable fixture references, product identity values and tracked file names. Historical docs are deliberately not scanned as executable code. The scanner does not modify files and supports `--json` evidence.
2. **Regression coverage** — `tools/test_repository_boundaries_selftest.cjs` tests deliberate failures for cross-app JS/C#/HTML/installer cases, positive OpenFOAM scientific examples, documentation nonmatches, real temporary `git ls-files` index behavior, unreadable tracked files and oversized-file fail-closed behavior.
3. **Cross-platform CI** — `.github/workflows/foamlens-boundary-regression.yml` runs the two tests on Linux and Windows PRs; on Linux it also reruns the pre-existing original File Steward scientific fixtures and read-only tracked-tree audit. Workflow permissions are read-only and do not build installers, merge, tag, upload or release.
4. **Coverage boundary** — Rule-based signatures are an early-warning detector, not proof no foreign app name can appear. No binary decompilation, external paths, hidden files, scientific data content or user research cases are inspected; skipped oversized files fail the gate for review and symlinks are reported as not inspected.

## Ownership and isolation
- Original base main SHA: `46c8471b907d496170a1cb8bf6c91db08550300f`.
- Branch: `granada/foam-repo-boundary-20261021`.
- Code changes stay inside this QA module and its workflow. Field/3D, Time Series, CAD, Analysis, OpenFOAM solvers, UI and active PR owners are untouched.
- This is not a replacement for issue #177 visual acceptance, a physics validation or installed Setup/Portable QA.

## Verification and release classification
- GitHub accepted the source, tests and workflow commits; a new cross-platform workflow was triggered for PR #208.
- **Do not assert passing** until exact final branch SHA and both jobs have completed successfully. CI/run numbers and findings belong in this section at the next evidence update.
- No merge, native app QA, scientific fixture parity, human visual approval, signed assets, final version tag or release has occurred in this branch.

## Next entry
1. Inspect Linux and Windows workflow on the exact branch HEAD; fix false positives or test defects without weakening ownership detection.
2. Add reviewed exceptions only if grounded by a legitimate repository-owned fixture; document any exception with rationale, line and reviewer.
3. After successful QA and no branch conflict, consider merging this bounded non-runtime PR. Integration into a stable release remains a distinct decision/gate.
4. Resume G0–G7 UI/3D science and real installed/portable B13 DPI/capture work through their existing owner branches; do not overwrite #205–#207.
