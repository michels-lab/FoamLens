# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 370; classified: 366; readable documents: 71; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 8 |
| config | 7 |
| document | 65 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 116 |
| test | 101 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 42 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 9 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-developer-note-triage.yml, .github/workflows/granada-g37-real-b13-play-stress.yml, .github/workflows/granada-g41-play-attribution-guards.yml, desktop/src/FoamLensDesktop/Developer/Audit.js, desktop/src/FoamLensDesktop/Program.cs, desktop/tests/developer-note-triage.spec.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID 1743e4fcfc64c1a2)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
