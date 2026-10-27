# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 411; classified: 407; readable documents: 81; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 8 |
| config | 7 |
| document | 75 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 124 |
| test | 115 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 51 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 6 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-177-g4-review-live.yml, desktop/src/FoamLensDesktop/frontend/v24-granada-g4-review-live.js, desktop/src/FoamLensDesktop/frontend/v33-granada-wide-play-cascade-guard.js, desktop/tests/granada-177-g4-review-live.spec.cjs, desktop/tests/granada-g43-play-wide-original.spec.cjs, tools/granada_g16_wide_play_cascade.test.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID 507b7a90f18d0c62)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
