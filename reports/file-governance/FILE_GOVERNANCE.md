# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 522; classified: 518; readable documents: 111; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 10 |
| config | 8 |
| document | 105 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 153 |
| test | 148 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 67 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 6 implementation/config paths changed since this log's last commit; examples: desktop/src/FoamLensDesktop/frontend/v14-field-view.js, desktop/src/FoamLensDesktop/frontend/v14-z-field-compare.js, desktop/src/FoamLensDesktop/frontend/v24-field-f2-viewport-layout.js, desktop/tests/field-multiregion-views.test.cjs, desktop/tests/field-multiview-ux.test.cjs, desktop/tests/field-view.test.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID de0c956b2084feaf)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
