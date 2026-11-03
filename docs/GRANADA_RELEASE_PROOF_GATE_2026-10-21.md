# FoamLens — Operación Granada: final stable release proof (2026-10-21)

## Product objective

Make the owner's new permanent order usable: **Granada may ship an application's definitive stable release when, and only when, the actual product gates are passed, without asking again.** The problem is not lack of permission; FoamLens has many active F1/F2/Field/Time Series/CAD/Developer PRs and no coherent integrated release source + installed/physical acceptance. A green isolated Node job is NOT sufficient.

This workstream is **isolated from active #162, #175, #179–#196 and screenshots owner #193**: new `tools/granada-*` release-proof and its own read-only workflow. It **does not modify** `Program.cs`, native UI, science, install/update workflows, release tags, credentials, fixture paths, or other PR branches.

## Three functional deliverables

1. **Final-release proof engine** `tools/granada-release-proof.cjs`: deterministic, read-only, fail-closed evaluation of:
   - proof/main commit binding and final semantic version newer than latest stable;
   - merged owner integration for #162/#175/#179/#180/#181/#183/#184/#194/#195 (**#196 is temporary QA-only; do not merge just to satisfy this gate**) (all actual merge commits, not merely open green PRs);
   - full Windows release build with `success`, `event=push`, exact main commit;
   - only `stable`, never RC/beta/prerelease;
   - EXACT Setup and Portable file SHA-256, matching source/version and executable MZ signature;
   - installed Setup launch, portable launch, license, fixed About, verified updater;
   - real imported metal+mold OpenFOAM regions in all views A/B/C/D, correct XYZ and time/source association;
   - distinct FoamLens Developer executable, profile isolation, redacted diagnostics and persistent section comments;
   - **36 unique** installed/portable source+artifact SHA-bound PNG screenshots across eight tabs, 3 widths and Windows DPI 125/150/175/200;
   - release notes, locally staged verified final assets/checksum files, declared signing state and verified updater feed plan; the PUBLIC links/digests/feed are verified **after** the release.
   A missing section blocks release; verdict names the exact gate. `READY_TO_PUBLISH_STABLE` is a *prepublication technical status*, NOT a claim of an actual release or independent human approval.

2. **Pixel/file-integrity shield** `tools/granada-png-proof.cjs`: strict file-relative-path guard, rejects traversal/symlinks, hashes every local binary/capture, rejects fake PNG headers, bad chunk CRC, malformed/missing IDAT/IEND, invalid compressed data, unsupported pixel modes, effectively blank images and short cropped screenshots (height under 540 native pixels). PNG capture physical width must agree with reported CSS width × DPI (4-pixel tolerance); duplicate image hashes cannot pass as 36 independent screenshots. Uses only Node built-ins and bounded input/decompression, no private screenshots uploaded by the tool.

3. **Live GitHub state collection and continuous tests** `tools/granada-github-snapshot.cjs`: read-only GitHub API GET of current `main`, native csproj version, latest public stable release, the nine release-bearing owner PR merge commits (the temporary #196 integration preview is not merge-required) and the full Windows build workflow runs for that exact SHA. Never infers PR integration from green CI. Dedicated `.github/workflows/granada-release-proof-readonly.yml` runs proof, PNG and collector regressions on Ubuntu+Windows, then creates a live source metadata + deliberately **BLOCKED** release readiness report: it has no fabricated installed/physical evidence and performs no publishing or release-mutating actions.

## CLI / evidence contract

```sh
node --test tools/granada-release-proof.test.cjs tools/granada-github-snapshot.test.cjs
node tools/granada-github-snapshot.cjs artifacts/granada-github.json
node tools/granada-release-proof.cjs artifacts/granada-github.json path/to/real-proof.json . > artifacts/verdict.json
```

The proof document must use schema `foamlens/granada-final-release-proof/1` and `sourceSha` equal to the authoritative main SHA. Binary paths are relative to proof working root under `artifacts/`; never upload them to public reports. The screenshot array records platform, tab, CSS width, DPI, exact source SHA, artifact SHA-256, relative PNG path and PNG SHA-256. Raw CFD data, researcher names, private case paths and secrets do not belong in proof reports.

Exit status: `0` all required evidence passed; `2` blocked with reasons; `1` invalid/truncated input. **A green test fixture is explicitly SYNTHETIC, not a real screenshot, signed installer or scientific benchmark.** Producers of signed native, rendered and OpenFOAM evidence remain independent trusted owner workflows. This tool validates claims/digests, does not itself acquire real owner-device/experimental evidence.

## Current release decision

**NOT READY / NO RELEASE / NO TAG.** Provenance and CI from prior #195 full Windows build and #196 multi-PR composite are useful development QA but those PRs are unmerged and do not establish real combined Field metal+mold and native 36-screenshot acceptance on main. Keep all original PR owners and backlog open. This new block solves auditability and guards future autonomous final release execution; it does NOT publish a new user-facing feature by itself.

## Validation / reentry

- `node:test` includes synthetic positive and negative checks for SHA tampering, stalled/unknown PRs, mismatched native CI, version/RC, installer hash, missing screenshots, repeated fake captures, traversal/symlink, malformed/blank PNG and GH API failure.
- **Automated proof tests:** GitHub Actions run [39612143948](https://github.com/michels-lab/FoamLens/actions/runs/39612143948) PASS at earlier source HEAD: 20/20 tests on Ubuntu and Windows; read-only live GitHub snapshot job PASS. **Latest branch HEAD after further screenshot hardening must be rechecked separately.** Actual installed Windows and private QuickCup B13 metal+mold: NOT executed by this tool. No updater/public assets published or modified.
- Next Granada: safely integrate owner-validated Field UI/scientific branches, then collect real accepted native proof for final integrated main; only then authorize the final release under the standing Granada order. An unrelated public release may not be inferred from this gate.

## Live read-only snapshot observation (2026-10-21)

The GitHub-backed workflow produced a correctly **BLOCKED** verdict with nine missing gates in its tested prior snapshot: `next-stable-version`, `required-integration`, `exact-main-native-ci`, `installer-and-portable-integrity`, `actual-windows-runtime`, `real-multiregion-science`, `developer-twin-isolation`, `native-36-screenshot-matrix`, `official-distribution-readiness`. Some gates are expected to remain blocked until the source owner PRs are merged and the exact release artifacts have been built. The live verdict contained no forged Windows capture or private research data.

**Correction to original implementation before merge:** #196 is an ephemeral cross-owner integration preview and must **not** be merged just to satisfy a release gate; it was removed from mandatory product PR list. Final artifact checksum files and planned updater metadata must be created/verified **before publication**, while checks of publicly downloadable assets and live feeds occur **after publication**; proof preflight must not demand already-public files. Final source checks do not claim online release verification.
