# Native FoamLENS Windows License Agreement wizard — 2026-10-12

This test opens the exact built candidate Setup EXE in **interactive** current-user mode on the GitHub Windows runner. The normal Welcome page is traversed to the actual EULA using Windows UI Automation.

Acceptance checks:
- The wizard exposes a real **I accept the agreement** and **I do not accept the agreement** choice (from the existing product-specific full `desktop/LICENSE.txt`).
- The Next button is blocked before acceptance.
- Selecting acceptance enables Next; selecting decline disables Next again.
- A real screenshot is captured from the actual Setup window and retained in the build artifact (including on downstream failure).
- The automation kills the interactive wizard after inspecting it; it does not install software, click through consent or publish a release.

This complements, but does not substitute for, the existing silent **actual installed executable** tests and checked/unchecked desktop shortcut regression. Automation may require Win32 UIAutomation to expose native radio controls; a failing runner must be diagnosed from its own logs, not waived as PASS.
