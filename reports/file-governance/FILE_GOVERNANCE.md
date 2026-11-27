# File steward: repository file audit

All tracked files classified; Markdown/text docs inspected with size cap. Binary/research-content validity and untracked files not assessed.
No file is auto-deleted or declared unused.

## Coverage

Tracked: 533; classified: 529; readable documents: 114; above read cap: 1; findings: 3.

## File roles

| Role | Count |
|---|---:|
| agent | 9 |
| asset | 6 |
| bitacora | 2 |
| build_script | 10 |
| config | 8 |
| document | 107 |
| index | 6 |
| installer_metadata | 1 |
| license | 1 |
| source | 157 |
| test | 150 |
| text_metadata | 1 |
| unknown | 2 |
| web_ui | 2 |
| workflow | 67 |

## Findings (human review required)

- **REVIEW / POTENTIAL_UNLOGGED_CHANGES** docs/GIT_AUDIT_LOG.md: 10 implementation/config paths changed since this log's last commit; examples: desktop/src/FoamLensDesktop/NativeCartesianMesh.cs, desktop/src/FoamLensDesktop/Program.cs, desktop/src/FoamLensDesktop/frontend/index.html, desktop/src/FoamLensDesktop/frontend/v14-zz-field-workspace.js, desktop/src/FoamLensDesktop/frontend/v18-context-help-resize.js, desktop/src/FoamLensDesktop/frontend/v24-field-f2-viewport-layout.js. Next: Inspect diffs and reconcile only meaningful decisions/results in the canonical log (ID ab5d23cf9702cceb)
- **REVIEW / UNKNOWN_PURPOSE** tools/native-quality/Make/files: No reliable purpose category from path. Next: Declare role after reviewing usage (ID d9f5be2807d4a759)
- **REVIEW / UNKNOWN_PURPOSE** tools/native-quality/Make/options: No reliable purpose category from path. Next: Declare role after reviewing usage (ID 80ac214ba57179dd)

Complete path → purpose/role/certainty list lives in FILE_GOVERNANCE.json. SUMMARY.json has counts only for master polling.
A dated file, duplicate, or suspicious name is an **investigation candidate**, not unwanted material.
No historical science cases, audit logs or evidence may be deleted automatically.
