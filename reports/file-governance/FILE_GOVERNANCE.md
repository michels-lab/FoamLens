# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 314; classified: 310; readable documents: 57; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 6 |
| config | 7 |
| document | 51 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 92 |
| test | 98 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 29 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 3 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-backlog-convergence.yml, tools/granada_backlog_guard.cjs, tools/test_granada_backlog_guard.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID c471bbf1ef6d1e4b)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
