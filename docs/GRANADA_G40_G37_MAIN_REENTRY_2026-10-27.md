# Granada G40 — Post-merge G37 real QuickCup re-entry
Date: 2026-10-27
Scope: FoamLens only, native QA and its regression tests; no product code/release.

## Confirmed problem
The merged G37 workflow still tested its current HEAD by diffing all files back to historical main commit 1a5723a6026356f69337abe3052108c91d09d454. On an actual main dispatch after valid later merges (G38/G39 scientific export, G27/G29/G30 native QA and File Steward), that check classifies those already merged, legitimate product changes as unowned branch edits. This can falsely fail before any actual native Windows B13 verification and make G37 inert after merging.

## Bounded correction
- On workflow_dispatch from refs/heads/main, compare checked-out full 40-hex SHA to the actual live main ref obtained read-only by git ls-remote. Abort if unknown or stale. Treat current official main as authoritative without cherry-picking any unmerged science or WebView2/CAD source.
- Only on recognized historical G37 / G40 QA branches, diff from the current origin/main merge-base with the existing explicit QA+documentation allowlist. Original product owners remain excluded.
- Add G40 push trigger and adversarial structural regression. Retain actual 3 Portable + 3 Installed, 1140/640 Play geometry, original B13 metal/mold source, screenshots and sanitized failure reporting, existing 110-minute limit, private-source isolation and no artifact publication.
- This change alone does **not** prove G37 passes its next true Windows run, fix intermittent Play #230, confirm physical 125-200% OS DPI, independently validate CFD accuracy, sign installers or meet release issue #238. No new tag/release/beta/RC.

## Acceptance
Exact branch run: Ubuntu + Windows negative source checks and real six native original Windows B13 cycle need terminal success. Check any failure at its stage, keep failed original boolean-only evidence and #230 open until recurrence risk and independent physical owner acceptance are satisfied.

## G40 live-main automation after verified G41 merge
After original [G41 #261](https://github.com/michels-lab/FoamLens/pull/261) completed the full genuine Windows OpenFOAM/Setup/Portable CI and was merged to main, G40 remains distinct independent QA-only owner. Enabling `push: main` only for actual Field/Play/Program.cs/G37 QA changes permits the **G40 integration itself** to run real original private B13 3+3 against the new combined source and use G41's actual original measured Play booleans. Metadata-only File Steward pushes deliberately do not download/build the large private fixture. Manual `workflow_dispatch` remains possible. Any red Play result is an actual product #230 gate, not a permission to relax the 100x28px original acceptance. Do not publish unsigned binaries and do not call a failed native cycle a pass.
