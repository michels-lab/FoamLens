# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 255; classified: 251; readable documents: 45; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 4 |
| config | 7 |
| document | 39 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 63 |
| test | 97 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 14 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 3 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-g10-preview-toolbar.yml, desktop/src/FoamLensDesktop/frontend/v29-granada-plot-toolbar.js, tools/granada_g10_preview_toolbar.test.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID e52ae08158c77c7a)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
