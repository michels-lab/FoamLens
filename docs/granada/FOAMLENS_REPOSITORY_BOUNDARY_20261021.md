# Granada — FoamLens repository boundary validation (2026-10-21)

## Scope and evidence
- Target: FoamLens only. Current main was inspected at commit `46c8471b907d496170a1cb8bf6c91db08550300f`.
- Recent main history includes correction of accidental Michel's Life test-fixture ownership (PR #204).
- New independent branch: `granada/foam-repo-boundary-20261021`; implementation commit `ad484581616020976dfbb906c2354c90f73e2e3d`.
- Added `tools/test_repository_boundaries.cjs`: read-only scan of Git-tracked executable/test paths for suspicious cross-app imports, fixture paths or product identity. Restricts scanning to owned source/test directories; excludes historical documentation and the scanner itself. Reports path/line; nonzero exit on potential contamination.
- This is a heuristic early-warning regression, **not** a proof of complete ownership or a replacement for independent project tests. Matches require human triage; coverage is limited to recognized names/signatures.

## Validation and integration truth
- Confirmed file creation through GitHub API. **Not executed** against full repository in this session; no CI run, native Windows application run, installed UX review or scientific verification claimed.
- The script is not yet wired to CI and cannot gate merges until tested for false positives and added to existing workflow(s).
- No runtime scientific code or other app repository was changed. No merge and no release.

## Next reentry
1. Run `node tools/test_repository_boundaries.cjs` in checked-out FoamLens and inspect detections. Add curated allowlist if actual false positives occur; do not silently weaken checks.
2. Wire into correct FoamLens CI test workflow and enforce on PRs after baseline passes.
3. Continue G0–G5 issue #177 (all-tabs real UX) independently of open Field/Time Series work; capture installed Windows screenshots at multiple widths and DPI.
4. Validate the release SHA, full installed runtime, updater/assets and real science fixtures before stable publication. A successful scan is not a release gate substitute.
