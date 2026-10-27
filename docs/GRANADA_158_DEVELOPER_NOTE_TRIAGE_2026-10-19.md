# Operación Granada #158 — Developer twin annotation triage and locator integrity

**Date:** 2026-10-19. **Status:** draft/branch only; native installed validation and public release are different gates.

## Existing implemented baseline (NOT rebuilt)

FoamLens main already has a separate **FoamLensDeveloper.exe** built using `-p:FoamLensDeveloper=true`, a Developer-only embedded `Developer/Audit.js`, separate Developer WebView2 profile/cache and installer identity, real Developer WebView2 smoke, local JSON and AI repair prompt export, bounded event capture and point-to-control annotations persisted across restarts. The standard public FoamLens binary does **not** include this panel.

The existing public FoamLens app currently makes no claim of a supported customer-account login route. This Granada does not invent one or bypass authentication; any future public sign-in must retain identical normal login/logout/account switching in the Developer twin with isolated sessions before that requirement can be considered accepted.

## Added in this Granada

- **Priority:** P0 critical / P1 major / P2 minor, explicitly chosen by the developer. These are owner classification, not automatically verified severity.
- **Workflow status:** `open`, `investigating`, `resolved`; editable without losing original saved section, selector, time stamp or exact comment. Filter the notes list by status.
- **Locate integrity:** the **Check saved locations** action and **Run Audit checks** both inspect annotations on the displayed route. Check the originally stored CSS locator, whether it uniquely identifies one live DOM element, matching tag and human-readable section label. Classify each locator as `located`, `missing`, `ambiguous`, `changed-element`, `different-route` or `not-inspected`, and retain the last observed timestamp and reason. Do **not** retarget the comment to another button when the underlying application layout has changed.
- **Persistence:** the additional annotation fields are stored in the isolated Developer browser profile and loaded with backward-compatible default priority P1 / status open for existing notes. Original user wording is kept locally; report export sanitizes known file paths/tokens. Coordinates from local storage are bounded and validated.
- **Combined export:** on explicit export, JSON and AI prompt retain original location, note status, priority and last locator inspection in addition to bounded observed errors and automatic UI checks. Human-authored comments are always described as symptoms **reported by the owner**, not a confirmed runtime failure.
- **Safety:** untrusted host/browser event metadata is allowed only in expected fields (stack, line, column, origin). It may not overwrite error severity/source/message/page. No background upload, application mutation or public audit menus.

## Distinguish three different test levels

1. **Node regressions:** `desktop/tests/developer-twin-audit.test.cjs` and new `desktop/tests/developer-note-triage.spec.cjs` on Linux and Windows, including simulated restart/reload, changed/removed selectors, explicit priority/status transitions, prompt/provenance, and secret suppression.
2. **Real native WebView2 smoke:** isolated Windows CI builds `FoamLensDeveloper.exe`, runs native resource self-check and Developer UI smoke via existing `desktop/developer/build-developer.ps1 -SkipInstaller` (when that CI succeeds). **Developer executable is NOT published/uploaded by workflow**.
3. **Still not accepted:** owner's real installed Developer Setup/Portable across multiple monitor widths/DPI and persisted navigation, actual project/case workflows and comments, source module mapping of notes to specific code, signer/private channel distribution, comprehensive app-boundary security testing and owner authorization. Node checks alone are not a claim of a real released developer binary.

## Outstanding #158 and cross-app standards

The master `Michel-Software-Standards/standards/DEVELOPER_TWIN_AUDIT_STANDARD.md` remains authoritative for all Michel's Lab apps; this specific implementation does not alter the master or imply the other repos are complete. More work remains for security reviews at every relevant native bridge and connected provider boundary, scoped account/workspace isolation if actual login is added, user-reviewed export sanitization, source-to-error mapping, authenticated private build distribution, existing owner data migration and real installer tests.

**Parallel work avoided:** #162 Field, #164 CAD, #165 2D/3D, #166 Energy, #167 Thermocouple, #168 Health, #169 Phase/Momentum, #170/#171 Front and #172 owner benchmarking. No shared Windows Program.cs, frontend index, release workflow, version or scientific parser changed.

## 2026-10-27 — G43 owner consolidation on current main (reuse PR #173, no new PR)
Rebased this existing Developer-only candidate onto original latest production `main` `0773380a9d973007d38d430f64cf4a99c68fee72` via a leased ref update, using only the independent source module `Developer/Audit.js`, its isolated Node tests, dedicated native Developer Windows/Ubuntu workflow and this audit note. The original Developer module on historical base `cbf384b` is byte-identical to the original `main` Developer module before this adoption (`0dcbef3ece10145ab59970c4542ed8c7733ba6bc`); no conflicting Developer implementation or out-of-date original app source was overwritten. Old broad `CHANGELOG.md`, project-roadmap and global `docs/GIT_AUDIT_LOG.md` edits were deliberately not copied across the many independent 2026-10-27 main integrations; the source and current candidate audit remain here instead. No normal FoamLens frontend/WebView2 state/storage, science, updater or release binary was changed. Mandatory at this source head: Linux/Windows Developer audit tests, actual separate Windows Developer native build and smoke, ownership regression, and full standard packaged Windows CI if triggered. **Do not claim Windows installed Developer Setup, human visual approval or public stable acceptance from those checks.**
