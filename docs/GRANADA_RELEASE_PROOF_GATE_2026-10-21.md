# FoamLens — Operación Granada: final stable release proof (2026-10-21)

## Product objective

Make the owner's new permanent order usable: **Granada may ship an application's definitive stable release when, and only when, the actual product gates are passed, without asking again.** The problem is not lack of permission; FoamLens has many active F1/F2/Field/Time Series/CAD/Developer PRs and no coherent integrated release source + installed/physical acceptance. A green isolated Node job is NOT sufficient.

This workstream is **isolated from active #162, #175, #179–#196 and screenshots owner #193**: new `tools/granada-*` release-proof and its own read-only workflow. It **does not modify** `Program.cs`, native UI, science, install/update workflows, release tags, credentials, fixture paths, or other PR branches.

## Three functional deliverables

1. **Final-release proof engine** `tools/granada-release-proof.cjs`: deterministic, read-only, fail-closed evaluation of:
   - proof/main commit binding and final semantic version newer than latest stable;
   - merged owner integration for #162/#175/#179/#180/#181/#183/#184/#194/#195/#196 (all actual merge commits, not merely open green PRs);
   - full Windows release build with `success`, `event=push`, exact main commit;
   - only `stable`, never RC/beta/prerelease;
   - EXACT Setup and Portable file SHA-256, matching source/version and executable MZ signature;
   - installed Setup launch, portable launch, license, fixed About, verified updater;
   - real imported metal+mold OpenFOAM regions in all views A/B/C/D, correct XYZ and time/source association;
   - distinct FoamLens Developer executable, profile isolation, redacted diagnostics and persistent section comments;
   - **36 unique** installed/portable source+artifact SHA-bound PNG screenshots across eight tabs, 3 widths and Windows DPI 125/150/175/200;
   - release notes, official assets/checksums, signing state truth and updater feed.
   A missing section blocks release; verdict names the exact gate. `READY_TO_PUBLISH_STABLE` is a *prepublication technical status*, NOT a claim of an actual release or independent human approval.

2. **Pixel/file-integrity shield** `tools/granada-png-proof.cjs`: strict file-relative-path guard, rejects traversal/symlinks, hashes every local binary/capture, rejects fake PNG headers, bad chunk CRC, malformed/missing IDAT/IEND, invalid compressed data, unsupported pixel modes and effectively blank images. PNG capture physical width must agree with reported CSS width × DPI (4-pixel tolerance); duplicate image hashes cannot pass as 36 independent screenshots. Uses only Node built-ins and bounded input/decompression, no private screenshots uploaded by the tool.

3. **Live GitHub state collection and continuous tests** `tools/granada-github-snapshot.cjs`: read-only GitHub API GET of current `main`, native csproj version, latest public stable release, the ten mandatory owner PR merge commits and the full Windows build workflow runs for that exact SHA. Never infers PR integration from green CI. Dedicated `.github/workflows/granada-release-proof-readonly.yml` runs proof, PNG and collector regressions on Ubuntu+Windows, then creates a live source metadata + deliberately **BLOCKED** release readiness report: it has no fabricated installed/physical evidence and performs no publishing or release-mutating actions.

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
- **Tests and CI on exact branch SHA: pending until GitHub Actions reports.** Installed on Michel's PC: not tested. Real QuickCup B13 metal+mold: not independently executed here. Updater/public assets: not published or touched.
- Next Granada: safely integrate owner-validated Field UI/scientific branches, then collect real accepted native proof for final integrated main; only then authorize the final release under the standing Granada order. An unrelated public release may not be inferred from this gate.
