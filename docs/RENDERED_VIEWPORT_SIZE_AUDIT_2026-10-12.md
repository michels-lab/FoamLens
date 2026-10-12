# Automated rendered viewport size evidence — 2026-10-12

## Scope and finding
Issue #29 requires genuine Home/About/Data/Field captures at two supported Windows native sizes, from both installed Setup and Portable. Before this change, the release gate checked screenshot hashes, labels and **at least two distinct dimensions anywhere in each runtime variant**. This could allow a single required surface (e.g. Home) to be captured at only one physical size if another unrelated screenshot supplied the second size; a label swap could also pass.

## Guard
For each required surface and each direct-Windows runtime variant, require one real decoded image dimension for `wide` and one for `compact`, with `wide.width > compact.width`. Supplementary About-bottom and real metal/mold captures cannot substitute for this per-surface evidence. The original SHA-256 checks and exact binary/source binding remain mandatory.

## Negative regression
- Re-render installed Home compact PNG at the wide native dimensions; update the manifest image digest and claimed dimensions correctly, leaving all other screenshots and artifact digests genuine. The gate must fail the Home pair.
- Exchange portable Data wide/compact **labels** while leaving their bytes, paths and hashes unchanged. The gate must fail the Data pair.
- Restore the original candidate analog fixture and require that a valid standalone Setup/Portable manifest still passes.

## Evidence boundary
Tests generate marked synthetic PNG fixtures in a temporary directory; they are never presented as actual native Windows captures. The real Windows and QuickCup workflows must pass on this PR's exact SHA. Owner screenshot review remains post-release, and this change neither authorizes nor publishes a release.
