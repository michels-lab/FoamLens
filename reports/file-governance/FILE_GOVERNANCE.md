# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 365; classified: 361; readable documents: 68; above read cap: 1; findings: 1.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 8 |
| config | 7 |
| document | 62 |
| index | 5 |
| installer_metadata | 1 |
| license | 1 |
| source | 116 |
| test | 100 |
| text_metadata | 1 |
| web_ui | 2 |
| workflow | 41 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 4 implementation/config paths changed since this log's last commit; examples: .github/workflows/granada-g41-play-attribution-guards.yml, desktop/src/FoamLensDesktop/Program.cs, tools/granada_g37_real_b13_play_stress.ps1, tools/granada_g41_native_play_diagnostics.test.cjs. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID bc7fb44a9bb9e044)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
