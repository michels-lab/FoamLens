# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 475; classified: 471; readable documents: 100; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 10 |
| config | 7 |
| document | 94 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 143 |
| test | 128 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 62 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 42 implementation/config paths changed since this log's last commit; examples: .github/workflows/build-foamlens-desktop.yml, .github/workflows/field-playback-fast.yml, .github/workflows/granada-150-checkmesh-namespace.yml, .github/workflows/granada-177-g2-field-command-dock.yml, .github/workflows/granada-177-g23-data-analysis.yml, .github/workflows/granada-177-g5-native-visual-review.yml. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID 6cbd5c089aa23e2e)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
