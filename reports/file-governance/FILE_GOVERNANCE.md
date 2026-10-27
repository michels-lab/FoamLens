# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 375; classified: 371; readable documents: 72; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 8 |
| config | 7 |
| document | 66 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 117 |
| test | 103 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 43 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 13 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-177-global-ux.yml, .github/workflows/granada-developer-note-triage.yml, .github/workflows/granada-g37-real-b13-play-stress.yml, .github/workflows/granada-g41-play-attribution-guards.yml, desktop/src/FoamLensDesktop/Developer/Audit.js, desktop/src/FoamLensDesktop/Program.cs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID 0de06db4fcf8a1a6)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
