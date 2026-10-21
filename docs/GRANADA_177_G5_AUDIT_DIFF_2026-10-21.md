# Granada G5 — offline comparison of UI audit exports (2026-10-21)

Independent QA utility for FoamLens issue #177. This **does not redesign** Field/Time Series/Review/Live and does not replace actual Windows WebView2 screenshots.

## Usage

Run `node tools/granada-ui-audit/audit-diff.cjs before.json after.json > comparison.json` with JSON exports from a compatible UI audit. Exit 0: no detected disappearance/regression; exit 2: regression/removal; exit 1: invalid input. Local only; no network, no install dependencies. Run tests: `node --test tools/granada-ui-audit/audit-diff.test.cjs`.

The comparator normalizes nested objects and arrays containing `tab/workspace/screen` plus `id/controlId/locator`, `hidden`, `clipped`, `disabled`, and optional `status/visibility`. It reports newly hidden/clipped/disabled controls, removed identifiers, newly visible and added identifiers, and coverage counts.

## Limitations / gates

- Exact emitted schema of PR #179's Audit all tab layouts has **not** been verified against the source branch in this isolated block. Adapter or integration tests must be added after it is available, avoiding conflicting edits.
- A missing control can mean an inactive/conditional view rather than a defect. Review every flagged result against the same scenario, viewport and DPI. A pass proves only that the supplied snapshots did not differ in recorded flags.
- Arbitrary raw text, error messages, source paths, scientific case data and screenshots are omitted. IDs/tab labels from arbitrary exports may still contain private material: inspect outputs locally before sharing.
- Must still capture and review real before/after installed Windows screens at 1024/1280/1920 widths and 125/150/175/200% DPI, plus keyboard and native clickability.
- No version/release or completed product-UI claim.

## Deliverables

1. Offline comparison, source-controlled and read-only.
2. Machine-readable regression exit code for future CI wiring.
3. Node built-in regression tests for hidden, clipped, disabled, removed and newly visible controls; duplicate detection and bounded recursion.

**Measured local verification:** tests ran on Node 22, 5/5 passed before upload. **GitHub CI on this branch:** not yet verified. **Installed Windows acceptance:** pending.
