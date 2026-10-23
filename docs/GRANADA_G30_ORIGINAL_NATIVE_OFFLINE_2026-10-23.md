# FoamLens — GRANADA G30: genuine offline Windows Installed + Portable

**2026-10-23** · Product source: original `main`, stable `v1.8.10` · QA only, independent feature ownership, no new release.

## Problem and independent objective

FoamLens is an installed **local scientific OpenFOAM data analysis product**, and a source check or ordinary online native smoke does not prove it starts and remains usable without Internet. A normal launch also initiates a background update **check**; networking unavailable must not crash or block the local interface. Existing development PRs already own Field, Time Series, CAD, numerics, source cache, identity, WebView2 persistence and release signing; this G30 branch touches **none** of those original code paths.

## Real execution (fail-closed)

- Checkout live exact `main` once into disposable hosted Windows; reject mismatch with authoritative GitHub remote or `1.8.10`. Build exactly its original self-contained .NET 8 WinForms/WebView2, bundled Web app, official icon and native Inno installer. No science features from open PRs, artificial frontend, mock browser or published binaries.
- Independent real Chromium WinForms witness (`Microsoft.Web.WebView2` same version as product) must first show **online** successful navigation to public **FoamLens's own official GitHub releases** endpoint with a unique non-cached URL. It captures **no response body** and writes nothing personal.
- On the disposable runner enable native per-program **Windows Firewall outbound blocking** for **both original FoamLens executables** (actual Installed and Portable paths) and **all discovered actual `msedgewebview2.exe` binary paths**. Verify real active rules and repeat identical Chromium network navigation with fresh nonce: **navigation must fail**; merely setting a proxy/environment variable or asserting a rule is not sufficient. Any unavailable firewall, runtime, permission or uncertain denial is **BLOCKED**, not a pass.
- With this independently proven offline state still enforced, launch the **original true Portable twice** with `--smoke-test`, the **real Inno-installed original twice** with `--smoke-test`, and both original binaries in **normal UI launch mode**. Original `--smoke-test` must produce its real WebView2 success marker and actual materialized bundled frontend; normal launched original UI must become visible, remain running during background automatic update-check attempts, and preserve the physical original local embedded frontend. After real uninstall repeat an offline original Portable smoke; reprove real Chromium outbound denial.
- **Always** remove every firewall rule in PowerShell `finally`, including on failure, and attempt cleanup of test-only Inno installation. Never delete native WebView2 browser profiles, user data, download anything besides existing official CI build dependencies, touch real user machines, or publish binaries.
- Cross-OS adversarial guard tests exercise malicious false-success mutations: missing Chromium block, omitted online baseline, spoofed network verdict, missing normal Windows UI, suppressed CI failure or fake scientific claims. Actual Windows PowerShell parsing, .NET WinForms probe compilation and native application binary/installer builds are independent gates.

## Evidence and limits

| What a final exact-head native SUCCESS would prove | Still outside scope |
| --- | --- |
| Real original native Windows 1.8.10 Installed and Portable survive loss of Internet with on-device WebView2 frontend | User's own machine, physical 125–200% DPI and all 36 visual owner screenshots |
| Actual Chromium network success before and failed attempt under verified Windows Firewall block | Offline importing/rendering and scientifically validating owner's original 3,008-file OpenFOAM case |
| Actual normal mode remains running while its auto-update network request cannot connect | Actual GitHub updater signing, Authenticode publisher and fresh stable distribution |
| Source files and installer match exact live original main, not 16-owner candidate | Independent source CFD numerical accuracy, solidification/recalescence interpretation |

**Acceptance:** no native result accepted until current exact PR-head **three jobs terminal green**, metadata schema checks pass and no `main` source drift. Keep [release blocker #238](https://github.com/michels-lab/FoamLens/issues/238) open. Public stable **v1.8.10** unchanged. The native job may legitimately fail if GitHub-hosted Windows Firewall is disabled or browser cannot reach the baseline endpoint; such an outcome is an evidence limitation, **not** permission to relax this experiment.

**Workflow:** [G30 Windows genuine offline verification](https://github.com/michels-lab/FoamLens/actions/workflows/granada-g30-real-native-offline.yml). **This file describes intended gates, not a green CI claim.**
