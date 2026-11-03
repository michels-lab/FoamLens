# Operación Granada — G5: real G0 UI-audit comparison (2026-10-21)

Linked tasks: #177 (G0–G5), PR #179 (G0/G1 producer), PR #194 (G5 consumer). This independent candidate changes only `tools/granada-ui-audit/`, its separate workflow, and this file. Field/3D (#145/#149), Time Series (#146/#176), Review/Live (#180), and Developer Twin (#158) remain owned by their active workstreams.

## Source contract checked

`desktop/src/FoamLensDesktop/frontend/v24-granada-global-ux.js` **in PR #179** emits `schema: "foamlens/granada-177-visible-controls/1"`, `viewport.{cssWidth,cssHeight,devicePixelRatio}`, `activeRibbon`, `activeAppMode`, and `evidence.byMode[mode][]`. Each row has `mode`, `id`, `priority`, `mounted`, `active`, `more`, `hidden`, `conditional`, `clipped`, `disabled` and computed `state`.

The first PR #194 candidate incorrectly expected a flat/nested `tab`/`controlId` record; it did not actually consume this real format. This Granada replaces its adapter with the actual schema and includes source-shaped contract tests. It does **not** modify the PR #179 producer while unmerged.

## Deliverables

1. G0 **schema-aware** parser indexes each `mode::id`; rejects inconsistent, duplicate, malformed or unknown records and refuses falsely green empty audits.
2. **Honest regression classification**: visible active primary -> hidden/clipped/missing/disabled/conditional/moved into More; removed active IDs are failures; improved visibility is reported separately. Inactive modes are **not visually tested** and report inventory changes as manual-review items instead of pretending pixels were checked.
3. **Context isolation**: matching active Ribbon/app mode, CSS window width/height and devicePixelRatio is mandatory. Different contexts yield `comparable:false`, exit 3 and explicitly named mismatch fields. Do separate captures for each of 1024/1280/1920 widths and Windows 125/150/175/200% DPI.
4. **Privacy and resource bounds**: no raw case path, user text, scientific value or screenshots are emitted, and only safe DOM ids and known mode names can enter output. Maximum JSON file 5 MiB and 10,000 records. Still inspect outputs for identifiers before sharing.
5. **Cross-platform CI**: 16 Node built-in regression tests, invoked independently on Ubuntu/Windows through a new read-only GitHub Actions workflow. No npm install, cloud account, native production updater or release required.

## CLI

```sh
node tools/granada-ui-audit/audit-diff.cjs before.json after.json > audit-comparison.json
node --test tools/granada-ui-audit/audit-diff.test.cjs
```

Exit codes: `0` comparable with no *confirmed* active regressions; `2` active regression or removed active control; `3` mismatched source context (do not compare); `1` invalid file/schema/input. **Exit 0 is NOT acceptance**: read `reviewRequired` and `coverage.inactiveUnverified`; collect screenshots and run installed Windows keyboard/click tests. Disabled state can be normal for missing data; human triage of flagged regressions remains mandatory.

## Evidence / reentry

- Local Node v22.16.0: `node --test` **16/16 passing**, after correcting a deliberately rejected empty-input test scenario. The negative empty-audit test remains.
- Tests use data shaped like the PR #179 producer and exercise CLI exit 0/2/3, active/inactive separation, privacy, malformed schemas and non-overlap logic. This is contract compatibility evidence, not producer+consumer on the same installed WebView2 candidate.
- GitHub Actions on final PR HEAD: **pending verification** until checks report a result.
- Installed Windows Setup/Portable, screenshot visual acceptance, actual multi-region OpenFOAM source case, and 125–200% DPI matrix: **pending**. Do not close #177 or issue a release.
- Reentry after PR #179 integration: run exact producer exports for matching scenario/viewport and test full producer→diff pipeline. Re-run real Windows + scientific regression suites and report failures with branch SHA. Keep G0↔G5 contracts versioned.
