# GRANADA G31 — original native Windows package & dependency inventory

**Scope:** independent QA-only supply-chain workstream against untouched original FoamLens `main`, stable 1.8.10. Does **not** import source from outstanding CAD, Time Series, Field, Developer or release-signing PRs.

## Why this is needed

A Windows installer/executable that compiles is not proof that its embedded `AppBundle.zip` actually contains **exactly the authorized source** or that all managed NuGet dependencies can be traced to the restored package content. Source-only analysis misses accidental stale extra `v*-*.js` extensions, case-colliding zip members, overwritten `index.html`, missing source modules, or a restored dependency version that differs from the direct project declaration. Hashing only `FoamLens.exe` does not prove the identity of each dependency or browser asset.

## Three coherent executable packages

1. **Exact frontend ZIP provenance and Windows path safety.** The Python standard-library verifier checks the **real produced** `AppBundle.zip`, CRC, each member SHA-256 against the original `main` frontend tree and license, count, total extracted size, directory traversal, absolute paths, Windows reserved names/backslashes, Unicode case-collisions, duplications, symlinks, and unreviewed/missing `v*-*.js`. The audit refuses unknown bundled source, instead of silently shipping it. This only audits the **embedded** package — not an attacker/old-version extra file already present in the user's materialized AppRoot.
2. **NuGet manifest from actual original .NET restore.** Read the current project's real `obj/project.assets.json` and `FoamLensDesktop.csproj`; every resolved package must provide a real 64-byte NuGet SHA-512 package checksum, pinned direct version must match restoration and no multiple ambiguous package versions appear. Emit only package IDs/versions/public SHA-512 digests.
3. **Authentic Windows package attachment and adversarial evidence.** On GitHub-hosted Windows, check out exactly live original `main`, build exact original v1.8.10 `FoamLens.exe` and genuine Inno Setup from source. Tie reported SHA-256 to both **actual** outputs and to the compiled ZIP/source and actual restore graph. Cross-OS Python adversarial tests must fail on tampered assets, added/missing JS, ZIP Slip, Windows path tricks, duplicate names, symlinks, corrupt ZIP and fake/missing NuGet SHA-512. Recheck original main SHA at job end. Upload only path-free cryptographic/package metadata, no signed-in account info, native binaries, private research cases or private tokens.

## Strict claim boundaries

- **PASS** means actual original Windows binary and native Inno compiler outputs were connected to original frontend ZIP contents and a recorded NuGet dependency material inventory; it does not prove vulnerability-free packages or license entitlement.
- **Not tested:** CVE live advisory database; third-party code license completeness; malicious local files retained from old app installs; scientific/case numeric correctness; genuine Authenticode signer identity; physical DPI 125/150/175/200 and 36 owner screenshots; signed updater/official final release. Those remain **BLOCKED**, and public stable **v1.8.10** remains unchanged.
- The original host has `ApplyFrontendExtensions()` enumerating disk files with `Directory.GetFiles(AppRoot, "v*-*.js")` after re-extracting embedded ZIP with overwrite. This creates an independently identified **possible stale local extension contamination** case: a preexisting additional `v*-*.js` could be included despite not existing in the real embedded bundle. G31 **does not claim that is fixed**, and cannot safely patch `Program.cs` while [CAD PR #164](https://github.com/michels-lab/FoamLens/pull/164) owns changes to that file; requires separate native reproduction, bundled-allowlist runtime fix and negative regression when ownership releases.

**Next approval condition:** exact G31 PR head all 3 CI jobs terminal success; existing release gate [#238](https://github.com/michels-lab/FoamLens/issues/238) stays open regardless. Tests, installers and report must never be published as a new FoamLens release.

**Native workflow:** [G31 exact-main Windows package BOM](https://github.com/michels-lab/FoamLens/actions/workflows/granada-g31-original-native-package-bom.yml).
