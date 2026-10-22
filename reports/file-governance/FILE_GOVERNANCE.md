# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 273; classified: 269; readable documents: 48; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 4 |
| config | 7 |
| document | 42 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 74 |
| test | 97 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 18 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 12 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-g7-compact-workbench-native.yml, .github/workflows/granada-original-command-search.yml, .github/workflows/granada-release-proof-readonly.yml, desktop/src/FoamLensDesktop/frontend/v26-granada-command-search.js, desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js, tools/granada-github-snapshot.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID 54cfbe3533168d95)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
