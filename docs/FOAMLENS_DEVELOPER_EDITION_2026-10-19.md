# FoamLENS Developer — isolated Windows twin and internal Audit

Status: DEVELOPMENT CANDIDATE — NOT a public release · 2026-10-19
Tracking: [#158](https://github.com/michels-lab/FoamLens/issues/158)
Public baseline: FoamLens Desktop v1.8.10

## What is separate
- `FoamLensDeveloper.exe` is a **different compiled .NET 8 WinForms/WebView2 application**, not a hidden switch in regular FoamLens.
- The developer-only JavaScript `Developer/Audit.js` is an **embedded assembly resource with a compile-time inclusion condition** (`FoamLensDeveloper=true`). The standard public binary and frontend bundle do not embed the Developer Audit resource.
- Separate local cache and WebView2 profile under `%LOCALAPPDATA%\FoamLensDeveloper\Desktop`. No overwrite of public FoamLens workspace/profile.
- `FoamLensDeveloper.iss` has its own application identifier, folder, shortcuts and uninstaller; can coexist with regular FoamLens.
- Developer binary is **never attached to public GitHub Releases or Microsoft Store** by the standard CI job. Build/upload sharing is a separate owner-controlled activity; merely renaming a public file does not provide authentication.

## Local developer build (Windows)

Run from repo root after installing .NET 8 SDK and optionally Inno Setup 6:

```powershell
powershell -ExecutionPolicy Bypass -File desktop/developer/build-developer.ps1
```

To skip creating the separate Setup executable: `-SkipInstaller`. The script builds an AppBundle from the normal UI if needed; compiles the Developer assembly with isolated intermediate files; validates embedded audit resource; and opens the real Developer WebView2 UI for a smoke test. Output is local to `desktop/artifacts/developer-publish/FoamLensDeveloper.exe` and optionally `desktop/artifacts/developer/FoamLensDeveloper-Setup-v*.exe`.

**Only distribute this edition to the authorized developer.** Build availability in a repository does not constitute binary access control. If the repo or CI workflow artifacts are public, do **not** upload the developer binary there. For true restricted access, use a private release/deployment channel with GitHub user permissions or equivalent access controls. No login/auth feature is claimed.

## Developer's persistent section annotations (requested 2026-10-19)

- **Point to section** enters a selection mode. The developer clicks the actual control/graph/viewport/section, and the click is intercepted so an OpenFOAM action is not accidentally executed while annotating.
- The app binds a local note to a **DOM selector, route/page, section heading, element tag, screen coordinates/size, created and updated timestamps**; the developer then writes a free-text comment. UI supports **Save, Edit, Locate (highlight target), Delete**, and a list of previous notes.
- Notes are persisted in **WebView2 localStorage exclusively in the FoamLensDeveloper profile**, scoped to the local app origin; they survive application restarts and normal audit-session clearing. Storage failure is surfaced to the user; export is a backup.
- The on-demand JSON and AI debugging prompt include **all saved section locations and the exact user-authored comments** (up to the documented 2,000-character bound per note), alongside observed errors. Missing targets are retained as notes instead of being discarded. This gives the AI a stable pointer, not an invented source filename.
- Up to 100 notes, explicit user edits/deletions, no automatic upload. Contents are redacted for known path/secret patterns at export; developer must review before sharing with an AI. The annotation text itself is intentionally stored locally in full as entered.
- Added persisted-note regression across simulated reloads, sanitization and a real WebView2 smoke that selects an element, saves an actual UI note and asserts its appearance in the generated AI prompt.

## Developer Audit (not the scientific Mesh Auditor)

The visible **Dev Audit** dock in the Developer edition can:
1. Capture observed JS errors, unhandled promise rejections, failed local resources, and native WebView2 renderer/process failures reported by the host. Bound incident history and record non-sensitive click targets (never typed values).
2. Perform explicit **Run Audit checks**: duplicate DOM IDs, missing fundamental controls, visible Field command layout overflow, overlapping viewport header and rendering surface, current viewport and available browser heap metric.
3. Review findings, clear current session, export a **sanitized JSON evidence report**, copy an **AI debugging prompt** or save the AI prompt as `.txt`.
4. Export issue/time/source, sanitized stack, reproduction click targets, runtime version, viewport/DPI and coverage limitations; ask an IA to supply grounded fixes with regressions, not fabricated CFD facts.

No telemetry upload/network request is made by the auditor. Exports are local user actions only. Scripts redact known URL query credentials, Bearer tokens and local user paths, and impose a cap on incident count and text length; **automated redaction is not an absolute privacy guarantee**. The developer must review a prompt before sharing it with an external AI, especially if a plugin, case file or a third-party script embeds private data in an error message.

### Diagnostic limitations
- This is **observed runtime and bounded UI inspection**, not source-wide static analysis, unit testing or proof of scientific validity.
- A running app cannot infer every latent error and should report untested areas explicitly.
- Future D2+ enhancements: configurable audit recipes for onboarding, plot/3D, source-backed provenance/units, performance snapshots, real Windows event timeline, screenshot attachment with explicit opt-in and issue grouping. These are future tasks, not shipped by this candidate.
- Mesh & Geometry Auditor (#150) remains a separate *scientific* user-facing feature, not the Developer software audit.

## Acceptance checklist
- [ ] CI node test: `desktop/tests/developer-twin-audit.test.cjs`, privacy + capped history and compile-time isolation.
- [ ] Windows pipeline: build public executable unchanged; build Developer EXE via `-p:FoamLensDeveloper=true`, self-test + real WebView2 native UI smoke.
- [ ] Manual Windows: install both versions, launch together, show isolated workspace settings and installer cleanup. Verify audit prompt/JSON copied/exported and no developer controls in normal app.
- [ ] Privacy: never upload developer binary by default. No public release without explicit authorization.



## Operación Granada #158 — owner note triage add-on (unreleased, 2026-10-19)

An independent Developer-only candidate adds user-chosen P0/P1/P2 priority, open/investigating/resolved status, status filtering, and a **Check saved locations** action. The normal Run Audit checks can also re-inspect every persisted locator for a unique element on the current route with the saved original tag and section label. The last-observed states are located, missing, ambiguous, changed-element, different-route and not-inspected. A moved or removed original control is retained as an unresolved note; it is **never** mapped silently to an unrelated element. These findings prove DOM locator condition only, not the truth of the owner's reported bug.

Combined JSON / AI prompts retain the owner's exact location and comment plus triage and last inspection states, independently of actual observed errors. The persisted WebView2 profile is still isolated from the standard app; source research data is not uploaded. Current public FoamLens does not assert a supported login workflow; no fake login/bypass is introduced.

Isolated CI: existing `developer-twin-audit.test.cjs`, new `developer-note-triage.spec.cjs` and actual Windows Developer.exe WebView2 smoke via `desktop/developer/build-developer.ps1 -SkipInstaller`. See `docs/GRANADA_158_DEVELOPER_NOTE_TRIAGE_2026-10-19.md`. This add-on remains **unreleased** until owner's installed Developer/Setup acceptance and explicit distribution authorization.
