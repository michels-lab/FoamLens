# FoamLens — GRANADA G15: installer update asset/checksum binding

2026-10-22. Product-facing release-integrity block, isolated from all original Field/Camera/OpenFOAM simulation owners. No release, candidate, beta, prerelease, public installer or private case tree is published here.

## Actual defect addressed

Main's existing signed/user-consented updater already downloaded `FoamLens-Setup-vX.Y.Z.exe` and a companion `.sha256` release asset, and validated SHA-256. But its parsing formerly accepted the **FIRST arbitrary 64-hex SHA within the entire checksum text** if the **installer name appeared anywhere**. A checksum file with unrelated entries or a comment containing the expected filename was therefore not tied unequivocally to the exact executable digest. The download URL supplied by GitHub release JSON was also not separately checked against the exact official `michels-lab/FoamLens` release path/tag/asset name.

This is a **metadata consistency / defense-in-depth defect**, not evidence of a demonstrated remote compromise. SHA-256 still computed over the downloaded executable. It is also NOT an Authenticode signature and cannot alone prove a publisher's authenticity.

## Implemented real production change

- A single new `desktop/src/FoamLensDesktop/UpdateAssetIntegrity.cs` defines `RequireExactSha256` and `RequireOfficialReleaseAsset`. It accepts a single 64-hex digest-only companion checksum (already bound to a specifically named `.sha256` asset), GNU-style hash followed by whitespace and the **exact expected installer file name**, or binary `*` marker. It rejects malformed hashes, extra entries, filenames with paths, mismatched filenames, comments/embedded filenames, control NUL, and more than 4096 chars. Hash comparison remains constant semantic SHA256, and the **original user consent/version check** remains unchanged.
- The source release asset URL must use HTTPS `github.com/michels-lab/FoamLens/releases/download/{exact-tag}/{exact-name}`; it disallows arbitrary hosts, alternate repos, tags, binaries, query strings, fragments, embedded credentials, and nonstandard ports. GitHub's normal HTTP redirect to its CDN remains handled by the existing HttpClient, but no untrusted initial browser_download_url from the JSON is directly accepted.
- Tiny surgical original native `Program.cs` changes now require both original URLs to validate **before downloading**, cap downloaded checksum size and parse the **bound expected digest** before comparing the actual installer SHA-256. The original installer launch only occurs after explicit user approval and matching real bytes. No bypass of Developer-only or Microsoft Store updater channels; no automatic downloading of raw OpenFOAM case files.

## Verification, QA and release boundary

- `tools/granada_g15_updater_harness` is a real .NET 8 cross-platform executable that links **the identical production C# integrity source file** and exercises acceptance and rejection of digest-only/GNU checksum formats, multiline/mismatched/tampered hash lists, path traversal, malicious URLs, fake hosts, wrong tags/binaries and embedded credentials.
- `tools/granada_g15_updater_source.test.cjs` asserts release consent, original version comparison, SHA256 downloaded-content validation, correct Store/Developer routing, and newly mandatory URL/name binding remain wired into the original native program.
- `.github/workflows/granada-g15-updater-integrity.yml` runs real .NET8 and Node tests on Ubuntu and Windows with the original source ownership gate. **A submitted workflow is not an accepted test result.** Record actual exact-source CI before merging. Real native Windows build and release-integrity hash smoke must also pass.
- Scope G15 only: one new production `.cs`, small replacement inside original updater method, two test artifacts, dedicated CI and docs. No CFD, physical Field, CAD, G7–G14 original owners, UI reflow, import/export or local case mutation. Do not present CI source tests as actual Microsoft Store signing, physical OS DPI, owner screenshot signoff, installer signatures, updater end-to-end release or automatic future delivery.
- No final stable release authorized until current-main exact-sha product build, original QuickCup B13/native/installed/updater/distribution and manual evidence gates. Never use RC/beta, and do not merge unfinished native test PR #232 into main.
