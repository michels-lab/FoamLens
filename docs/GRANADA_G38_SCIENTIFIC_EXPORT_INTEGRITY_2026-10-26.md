# FoamLens · Granada G38 — measured series export integrity (2026-10-26)

**Status:** implementation on independent branch, original Windows/Ubuntu QA required; not merged or released. **Stable GitHub release:** v1.8.10; **main at discovery:** `d651c43e0507c5316070fbd4859c9fb3196850a2`.

## Why this workstream is independent
G35 CAD/trusted JavaScript #255, G36 wide Field Play #256, G37 repeated real B13 #257, actual OpenFOAM owner science/3D, original Windows updater/signature work are all separate and remain untouched. G37 exact source SHA `3081ce6f0da71187f5de2fe6d9e8e3cb265a9f57` native Windows 3 Installed + 3 Portable passed in [run 40394191015](https://github.com/michels-lab/FoamLens/actions/runs/40394191015). This is additional G36 QA, **not** an official merged/packaged release.

## Observed reproducible source bugs on public stable main

1. `rxFinitePoints` used `Number(value)` directly on imported time/value entries. JavaScript converts `null`, `''`, whitespace-only strings and `false` to **0**, creating nonexistent physical samples. Preserve measured numeric zero and valid dot-decimal / exponent strings, but exclude missing, nonnumeric, locale-comma, binary/hex and non-finite entries.
2. `rxStats` squared finite values before summing them; squaring e.g. `1e308` produces `Infinity`, and squaring `1e-300` underflows to zero. An ordinary arithmetic mean can overflow when adding finite opposite-sign extremes. Use incremental scaled mean and BLAS-style scaled sum-of-squares, keeping min/max and their *actual* physical x locations.
3. `rxCsv` concatenated untrusted OpenFOAM case names, paths, metadata into `# key=value` comment lines without stripping raw newline/control characters. A multiline name could turn a comment into an independent spreadsheet row/formula. Encode control characters visibly in those comment lines, retain machine-readable provenance JSON, accept finite numeric data cells only, and represent missing optional profile time as an empty cell rather than physical zero.

**Changed product owner only:** `desktop/src/FoamLensDesktop/frontend/v13-reproducible-export.js`. **Actual original code regression:** `desktop/tests/reproducible-export.test.cjs`. **Independent dual-OS source CI:** `.github/workflows/granada-g38-scientific-export.yml`, nonpublishing, read-only and without private scientific fixture upload.

## Evidence boundary and acceptance

- Original 10 export checks remain; four new groups exercise fabricated zero rejection, physical numeric parsing, finite huge/tiny RMS, hostile metadata multiline CSV, formula-string/nonfinite CSV rejection, valid missing profile time. The test harness extracts **actual original source** functions, not a rewritten mock.
- Mandatory: Windows and Ubuntu G38 source workflow on **exact commit**; regular FoamLens Windows build + science suite on exact PR SHA; source/branch collision review before merge; original CAD/Field PRs must not be accidentally combined.
- Not demonstrated by this workstream: numerical calibration against owner real experiment, rendered native Windows GUI, 125–200% physical DPI, updater/signed release, or human acceptance. G38 does **not** change the solver, imported cases, labels, axes, appearance, read-only behavior, or version.
- Preserve G37 private physical fixture and G35+G36 security/Play owners independently. The prior v1.8.10 release remains unchanged.

## Granada handoff / reentry

When exact-HEAD G38 CI succeeds, review original Windows build and merge eligibility separately; check PR collisions, then integrate only compatible source changes after all mandatory checks. Continue final stable-release gating under [issue #238](https://github.com/michels-lab/FoamLens/issues/238); maintain #230 Play source-integrated confirmation, signing and updater as open gates. **No RC, no prerelease, no claim that user has received this change.**
