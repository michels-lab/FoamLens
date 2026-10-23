# GRANADA G23 — real Inno reinstall/uninstall and Unicode Portable profile safety

**Date:** October 23, 2026. **Scope:** a new independent Windows **QA-only** workstream, based on exact official `main` source. Public stable remains v1.8.10. **No product code, release workflow, app version, signed publisher secret, or user account is changed.**

## Distinct user outcome and original issue

The canonical `main` desktop application stores its own WebView2 profile under `%LOCALAPPDATA%\FoamLens\Desktop\WebView2`; its installer is original Inno Setup in `desktop/installer/FoamLens.iss`. Existing tests exercise install, checkbox shortcut opt-in/out and basic uninstall but do not independently establish that an ordinary user can reinstall the *same version*, remove that application, and still retain the files and separate profiles the installer should never own. They also do not test the Portable executable run from USB-like paths containing accents, CJK characters and spaces.

These are safety and functionality gaps distinct from the unfinished G20 original scientific input tester #241 (science), G21 signed publisher security #242 and G22 Field Play responsive CSS #243. No other branch's files are modified or rebased.

## Implemented source-backed validation

- `tools/granada_g23_windows_install_profile_lifecycle.ps1`: only permitted when **both** `GITHUB_ACTIONS=true`, `RUNNER_ENVIRONMENT=github-hosted`, and `RUNNER_OS=Windows`. All install/test paths must fall *under a newly unoccupied folder within the disposable GitHub Actions workspace*; existing desktop shortcut or destination halts testing.
- Uses the actual original `main` WinForms+WebView2 **single-file EXE**, calls its original `--smoke-test` for Unicode-and-spaces Portable *before and after uninstall*, and checks genuine recent native success markers in FoamLens log. Compares SHA-256 of installed EXE against the **exact same build** Portable.
- Installs official Inno Setup with `/CURRENTUSER` and the optional desktop shortcut *explicitly unchecked*. Starts installed FoamLens natively. Creates only **unique non-sensitive synthetic sentinels** in its `%LOCALAPPDATA%\FoamLens\Desktop`, WebView2 storage folder, and **separate developer-edition** data folder. Explicitly declares that these are filesystem protections, **not real IndexedDB/localStorage round-trip or private simulation case data**.
- Reinstalls the **same version** into the same directory. Confirms the exact original binary identity, native app launch and unmodified user-owned hashes. Runs the **real** Inno Setup uninstaller and proves the app EXE is removed while the original FoamLens/WebView2/developer profile markers and unrelated user work survive. Independently verifies the USB-like Portable executable still launches after uninstall.
- Never recursively deletes user profile or contents. Clean-up removes *only exact unique G23-generated sentinel file paths* and can remove its disposable installer via original uninstaller. It refuses an existing desktop shortcut to avoid overwriting it. All cases are executed solely on GitHub-hosted disposable Windows, **never on an owner's computer**.
- `.github/workflows/granada-g23-windows-profile-lifecycle.yml`: original-main-only checkout isolated from QA scripts, original icon/frontend bundle, real .NET8 self-contained build, genuine Inno Setup, Windows runner install/uninstall and cross-OS contract tests. Before and after checks reject upstream SHA drift, source modifications, and absent native evidence. Uploads **only final non-sensitive hash/count/limitation JSON**, no installers, binaries, PII, WebView2 contents, CFD data, or screenshots.
- `tools/granada_g23_windows_install_profile_lifecycle.test.cjs`: negative static ownership/path/destructive-cleanup/privacy contracts across Windows and Ubuntu; Windows additionally parses the real PowerShell before any install.

## Science/release limitations

This QA **does not** prove true localStorage/IndexedDB transactional persistence or cross-version migration (same-version reinstall only), all Windows DPI scales, original B13 numerics, 36 full screenshots, actual in-app developer note persistence, Authenticode signer trust or real signed updater behavior. Never mark it as completed until exact latest Windows native job is terminal green.

Official remaining stable gate: [release #238](https://github.com/michels-lab/FoamLens/issues/238). `main` remains isolated; no beta, RC or stable release published by G23.

## Verified terminal native QA result

- At code SHA `4066c953294d25cac7179a657cdf807af8df0a42`, [G23 #39940667785](https://github.com/michels-lab/FoamLens/actions/runs/39940667785) **terminal SUCCESS** on both cross-OS source-contract jobs and the actual original-main Windows native installer lifecycle. Original product `main` pinned and reverified at `00533f68993fef7a7761026cf9c1ab13a21ab3cd`.
- Four original Windows WebView2 smoke pass lines: Portable Unicode/spaces, initial installed, same-version reinstalled, Portable after uninstall. Actual installer/uninstaller returned success. Synthetic profile sentinel hashes remained stable. Actions artifact contains **metadata only** (570-byte JSON), never files from personal accounts or the QuickCup B13 repository.
- This is a user-data *filesystem preservation* regression, not full browser storage serialization, cross-version upgrade, signed distribution, or physical scientific fidelity. Separate G20/G21/G22 release gates still apply.
