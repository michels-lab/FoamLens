# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 428; classified: 424; readable documents: 85; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 10 |
| config | 7 |
| document | 79 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 131 |
| test | 116 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 54 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 2 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-176-timeseries-t2.yml, desktop/tests/section-ownership.test.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID a6fb5e60f627c3ae)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
