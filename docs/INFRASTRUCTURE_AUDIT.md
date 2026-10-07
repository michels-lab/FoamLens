# FoamLens — Infrastructure & External Services Audit

Last reviewed: **2026-10-06**

This file records FoamLens infrastructure decisions separately from scientific feature work.

## Current architecture
- Primary data model: **local-first** OpenFOAM case analysis.
- User simulation/case data are not uploaded to a cloud backend by the application.
- GitHub is used for source, CI, release artifacts and optional private real-fixture integration.
- Windows direct builds publish portable/installer artifacts with SHA-256 checksums.
- Microsoft Store distribution now has a separate MSIX channel bound to Partner Center Store ID `9P0PTHSQ89LL`; Store builds disable the GitHub self-updater and leave signing to Microsoft Store after submission.
- No Google Drive, Supabase Auth, Supabase Database, or other end-user cloud sync is currently required for core operation.

## Why local-first is correct
OpenFOAM projects can be large and can contain unpublished research data. Cloud upload must never be introduced implicitly. A future cloud feature must be opt-in and must distinguish lightweight workspace metadata from raw simulation data.

## Gaps / required follow-up
1. Automatic update path was introduced in FoamLens v1.6.0 and remains validated in the current v1.6.1 direct-release channel with semantic-version comparison, explicit user approval and SHA-256 installer verification. Keep current-HEAD updater and checksum regression coverage in every release gate.
2. Root product/license naming is reconciled from the legacy `OpenFOAM PostPlotter` label to FoamLens in the current v1.6.1 line; the packaged desktop license uses FoamLens.
3. Move duplicated About/developer presentation toward the shared Michel's Lab component contract while preserving the active official FoamLens product identity.
4. Keep CI proving current HEAD rather than relying on existence of prior release artifacts.
5. If remote project metadata is ever added, define privacy/storage limits before implementation.

## Cloud decision boundary
Do **not** add Supabase or Google Drive merely to make FoamLens “cloud enabled.”

Acceptable future cloud candidates:
- user-owned preferences/workspace metadata;
- optional project catalog metadata;
- explicit collaboration metadata;
- optional account/profile features.

Raw OpenFOAM case trees remain local unless the user explicitly chooses a remote-storage feature designed for large scientific datasets.

## Secret rule
Any future provider tokens, signing keys, private fixture tokens or service credentials must live in GitHub Actions/provider secret stores, never source or frontend code.

## Microsoft Store channel
- Partner Center package identity: `MichelDuarte.FoamLens`.
- Publisher: `CN=D2024BFC-8238-4063-A8DD-A91208327224`.
- Publisher display name: `Michel Duarte`.
- Store ID: `9P0PTHSQ89LL`.
- The Store package is a separate distribution channel, not a replacement for GitHub Setup/Portable builds.
- Store CI produces an unsigned MSIX for Partner Center; it must not be presented as a signed direct-download installer.
- Store submission/certification/publication are manual provider evidence and remain pending until actually completed in Partner Center.

5. Microsoft Store MSIX validation now runs on `main` as well as `distribution/**`, so shared-source changes cannot silently bypass the Store packaging contract after integration.
6. Runtime version identity no longer falls back to a prior real release literal; missing assembly metadata fails explicitly instead of reporting stale version identity.
