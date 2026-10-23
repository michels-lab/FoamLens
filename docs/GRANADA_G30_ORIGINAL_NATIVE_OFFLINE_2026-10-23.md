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

## Exact original native evidence: final PASS (2026-10-23)

**Workflow and source reviewed:** [G30 Windows run #40019091026](https://github.com/michels-lab/FoamLens/actions/runs/40019091026), **completed SUCCESS** on G30 QA commit `6c59204d1924a70c146ed1355e38cfbfe6a09710`, with original product `main` unchanged at `d651c43e0507c5316070fbd4859c9fb3196850a2`. Ubuntu and Windows adversarial source tests + Windows genuine Chromium probe compilation passed, then original app and Inno Setup compiled, 0 product build errors.

Genuine hosted Windows runtime log:

1. `20:28:26Z`: independent Chromium **online navigation succeeded** to original owning repo's public GitHub release API (no response copied).
2. `20:28:31–32Z`: actual Windows Firewall outbound-deny rules confirmed for original **Portable**, original **Installed** and real **msedgewebview2.exe**.
3. `20:28:36Z`: new independent Chromium navigation **failed under enforced native block**, as required.
4. `20:28:36–20:29:00Z`: original real Windows WebView2 embedded smoke succeeded Portable cold/repeat and Installed cold/repeat, with actual original frontend.
5. `20:29:23Z` and `20:29:36Z`: original **normal** installed UI and portable UI each remained visibly alive while background update network checks could not connect.
6. `20:29:37Z`: real installed Inno was uninstalled, then original Portable was started and passed offline again.
7. `20:29:46Z`: Chromium was still independently verified blocked; `20:29:46Z` G30 native acceptance PASSED; exact original-product SHA and evidence schema checks passed.

**Claim supported:** original FoamLens 1.8.10 Windows UI launches and runs for the verified duration as installed or portable without working Internet on a disposable GitHub-hosted Windows runner. **Not supported:** complete offline processing of owner's real 3,008-file OpenFOAM case, numerical physics accreditation, physical Windows 125–200% DPI and all user screenshot signoffs, independent signed Authenticode publisher/updater or final release readiness. Source-only review is not this runtime proof; actual native trace is linked above. No user data or private CFD case included.

**Historical CI parse defect:** early G30 runs prior to `6c59204` failed without jobs because an unquoted YAML step name included a colon. Quoting the YAML scalar restored valid CI, then actual three-job native proof passed. The product binaries themselves never failed due to that YAML defect. This is distinct from a native Windows error and must not be portrayed as one.

