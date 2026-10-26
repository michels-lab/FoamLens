# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 329; classified: 325; readable documents: 62; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 6 |
| config | 7 |
| document | 56 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 97 |
| test | 99 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 33 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 11 implementation/config paths changed since this log's last commit; examples: .github/workflows/build-foamlens-desktop.yml, .github/workflows/granada-g21-signed-release-gate.yml, .github/workflows/granada-g22-compact-css-boundary.yml, .github/workflows/granada-g31-original-native-package-bom.yml, desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js, tools/granada_g21_native_signing.ps1. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID cfa9b2c78a11a8cc)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
