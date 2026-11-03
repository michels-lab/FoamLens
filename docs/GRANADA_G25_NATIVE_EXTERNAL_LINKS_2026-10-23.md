# FoamLens GRANADA G25 — native Windows external-link and shell protocol hardening

**Date:** 2026-10-23. **Owns:** `michels-lab/FoamLens`, separate candidate `fix/granada-g25-external-uri-launch-guard-20261023`. **Original main:** `00533f68993fef7a7761026cf9c1ab13a21ab3cd`; last stable [v1.8.10](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.10). **No release, tag, publication or version bump.**

## Independently verified original source bug

The existing original `Program.cs` registered an unconditionally accepted `CoreWebView2.NewWindowRequested` handler and passed its arbitrary `e.Uri` directly to `OpenExternal`. The latter invoked `Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true })` with **no protocol/host restriction**. In contrast, the native JS `openExternal` bridge already checked HTTP(S), but that restriction was **bypassed by WebView2 popup requests**, e.g., page content trying to launch `file:`, `ms-settings:` or other Windows URI handlers. `NavigationStarting` only intercepted external HTTP(S), not unsafe non-HTTP(S) navigations; it also trusted the internal domain by host alone, not secure scheme/port/userinfo. An adversarially crafted frontend or imported untrusted project annotation that influences popup URLs could reach OS-protocol handlers.

This is not proof that any user was attacked or that a malicious project file currently exploits the code. It is a real source-level security boundary error, not an assumed compromise.

## Candidate product change and fail-closed regression

- `desktop/src/FoamLensDesktop/ExternalNavigationPolicy.cs`: pure, original production `Uri` policy with two separate decisions:
  - `IsInternalNavigation` permits ONLY the original secure `https://foamlens.local` virtual host, default HTTPS port, no user info. An HTTP downgrade or host lookalike is not internal.
  - `TryExternalHttpUrl` permits ONLY well-formed absolute HTTP(S) URLs outside internal domain, rejects custom Windows schemes (`file:`, `shell:`, `ms-*`, `javascript:`, `mailto:`, `data:`), relative paths, credentials, loopback/private local origin variants, and `.local` hosts. Returns a normalized URL rather than raw untrusted input.
- Three bounded original `Program.cs` changes: popup navigation now passes through safe `OpenExternal`; all noninternal top-level navigation is `e.Cancel=true` before offering a safe system browser link; `OpenExternal` itself enforces the common policy before the **only** `UseShellExecute` process launch. The native JS bridge returns an actual success/error if OS launch unavailable, instead of always reporting success. These prevent alternative callers from bypassing the check.
- No scientific parsing, OpenFOAM data, main layout, physical Field Play, wallet/login, user files, version or signing flow altered. Existing legitimate GitHub/Instagram/Facebook/LinkedIn HTTP(S) external links still work in the default browser.
- `tools/granada_g25_external_navigation_harness`: actual PRODUCTION `ExternalNavigationPolicy.cs` is linked and compiled into isolated .NET8 test program, not replicated as a mocked policy; tests more than 30 safe/unsafe inputs covering exact origin, ports, userinfo, scheme spoofing, local file/system protocol and legitimate official social links.
- `tools/granada_g25_navigation_wiring.test.cjs`: detects reintroduction of raw unsafe `Process.Start(uri)`, unguarded popup navigation, missing cancellation of noninternal navigation and native bridge bypass. Same-failure negative input examples explicitly would have been accepted by the **original** `NewWindowRequested` -> `OpenExternal` path.
- `.github/workflows/granada-g25-external-navigation-guard.yml`: compiles and tests exact desktop policy on Windows/Ubuntu, verifies original WebView2 source wiring and boundaries, then builds the **actual original WinForms Windows application** with official icon and without embedding the QA harness. The product's existing native B13 Windows CI independently runs on the source PR; do not conflate passing direct policy tests with packaged installed native smoke.

## Acceptance and constraints

- The product must **not silently launch arbitrary Windows protocol handlers** from WebView2 popups or navigation. Only vetted HTTP(S) external links retain normal behavior. We do not claim zero malicious content risk, network policy enforcement over subresources, or defense beyond the stated navigation/shell boundary.
- Approval requires terminal SUCCESS on **exact PR-head** cross-OS policy harness and real Windows host compilation, then native packaged Windows functional UI smoke as applicable. PR remains draft until verified and separately eligible for merge.
- **Stable release remains BLOCKED** by G21 original signed publisher/official updater proof, G22 physical DPI and owner review, independent numeric QuickCup precision, [G24 actual Chromium profile storage #245](https://github.com/michels-lab/FoamLens/pull/245) failure and [official release gate #238](https://github.com/michels-lab/FoamLens/issues/238). No RC, beta, prerelease or newly published stable assets.
