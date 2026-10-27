# GRANADA G21 — trustworthy signer gate for official FoamLens stable releases

**Date:** 2026-10-23. **Branch:** `fix/granada-g21-signed-stable-release-guard-20261023`. **Scope:** FoamLens Windows release channel ONLY; no modifications to original OpenFOAM scientific source, UX branches, account data or external products.

## Real incident and owning process

G19 [original main Windows Setup+Portable installed smoke #39914933222](https://github.com/michels-lab/FoamLens/actions/runs/39914933222) passed basic startup, but the actual downloaded source-bound packaging metadata identified **both real unsigned Windows binaries as Authenticode `NotSigned`**. The official `build-foamlens-desktop.yml` currently makes signing steps conditional on `HAS_WINDOWS_CERT`; its existing `publish` job can create a public tag release after screenshots/checksum validation without first requiring an authentic trusted publisher signature. SHA-256 proves bytes, **not** vendor origin or signature trust. This is a preventable release safety gap, independently of G20's physical scientific case validation.

## Implemented

- `tools/granada_g21_native_signing.ps1`: on the actual Windows build runner, before a release-bound build is uploaded, inspect **both real Setup and Portable** with native `Get-AuthenticodeSignature`; require `Status=Valid`, valid signer certificate with the **same real 40-digit fingerprint**, usable certificate period, exactly matched official versioned EXE filenames, and official SHA-256 sidecar equal to each signed file's *post-signing* SHA. A missing/invalid native signature **throws** before publication; no unsigned bypass or fake signer secret needed.
- `tools/granada_g21_signing_guard.cjs`: on the eventual publish runner, independently check the **same-run Windows-generated signature report**, both original EXE byte hashes, original source SHA, version, same trusted signer, PE header, filenames and checksum sidecars. Reject missing report; the Node report check **does not claim to cryptographically authenticate a PE** without the actual Windows Authenticode check.
- The official `.github/workflows/build-foamlens-desktop.yml` performs native gate ONLY on original production publish-intent events (tag, owner-dispatched publish, or main `release:` commit), includes the signed report in the exact build artifact, then checks it again **before `gh release create`**. Normal non-release branch testing is not blocked merely for lacking a code-signing certificate.
- Cross-platform adversarial source checks plus real native Windows **unsigned** negative tests in `.github/workflows/granada-g21-signed-release-gate.yml`: unsigned and untrusted, forged status, changed version/SHA, switched signers, swapped binary, altered sidecar, absent cert, not-PE.
- No release, tag, signer certificate issuance, external service, extra cost or automatic credential access introduced.

## Independent remaining requirements

This security patch alone does not pass scientific data correctness, actual physical high-DPI monitor validation, 36 captured workspace review, unresolved intermittent Field Play 70.390625px native failure, exact-main B13 science [G20 #241](https://github.com/michels-lab/FoamLens/pull/241), or real signed updater/network distribution. Those continue to block publication in [G19 P0 #238](https://github.com/michels-lab/FoamLens/issues/238).

**Evidence:** inspect exact-head G21 CI on the PR, and real Windows native Authenticode on an actual publish-bound signed candidate. On a normal PR, native unsigned **rejection** is a PASS for the safety test, not evidence of a real signed binary. The official public stable remains [v1.8.10](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.10); no new stable release published.
