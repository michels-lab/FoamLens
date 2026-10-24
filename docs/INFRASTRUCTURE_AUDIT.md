# FoamLens — Infrastructure & External Services Audit

Last reviewed: **2026-10-06**

This file records FoamLens infrastructure decisions separately from scientific feature work.

## Planned Developer-only application variant and audit infrastructure — 2026-10-19

- `FoamLensDeveloper.exe` compiled by `FoamLensDeveloper=true` from same .NET/WebView2 source, developer-only embedded JS resource and distinct local profile/caches and Setup AppId. The regular product is not a mode toggle.
- No Developer binary attached to public GitHub Releases or Microsoft Store. CI may compile/test the private variant but must not upload it by default; authenticated private channels remain a separate distribution decision.
- Audit evidence consists of locally observed incidents and bounded checks; sanitized prompt and JSON exported only by user click. Best-effort secret/path redaction is not a substitute for manual review. See `docs/FOAMLENS_DEVELOPER_EDITION_2026-10-19.md` / #158.
- Developer software errors and scientific OpenFOAM `checkMesh` integrity (#150) are different domains and separate evidence.

## CAD/STEP/IGES/STL infrastructure boundary — 2026-10-19 (surface preview candidate only)

- Product plan: [`DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md`](DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md), issues #147 and #148. Native geometry kernel **candidate** Open CASCADE/OCCT, not yet installed/redistributed; perform platform binary + LGPL exception analysis first. Gmsh/DXF, WSL and possible mesh generation are future optional dependencies with distinct license/version gates, never cloud requirements.
- Preserve original source STEP/IGES and CAD units; STL triangulates *surfaces*, has no reliable built-in physical unit and is not an OpenFOAM volume mesh. Confirm exact Foundation or OpenFOAM.com edition before writing `constant/geometry` vs `constant/triSurface` and dictionary templates. Export separate named regions and provenance for metal/mold only if genuinely present in the imported source.
- Continue local-only work, no automatic solver execution in GitHub Actions, no case mutation without explicit user action. Implement as independently cancellable .NET/WebView2 native worker with progress and caps only after validation. A bounded STL/OBJ browser/WebView2-only read-only preview and local metric STL export exists on a candidate development branch; **not shipped**, not a native CAD worker and does not change the planned verified OCCT/isolated-worker requirement. The testable core remains bundled offline. Source-coordinate units must be confirmed independently per imported file before STL export; composite geometries are rendered in meters only when every visible file's units are confirmed. File count/size/triangle caps mitigate accidental large imports but do not replace worker isolation and cancellation. Native STEP/IGES/BREP remains NOT implemented; do not advertise it as supported.

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

## 2026-10-15 — Private case structural catalog candidate
- Stores relative case filenames/sizes/modification ticks and directory identities exclusively in %LOCALAPPDATA%/FoamLens/Desktop/ScientificCache/case-inventory-v1; research filenames are private local metadata and are not uploaded or included in exported performance reports.
- SHA-256 protects checkpoint integrity, while each use compares against a newly enumerated current inventory. Never use this structural cache to claim content-level identity or reuse scientific measurements: NativeTemporalCache independently verifies full raw source SHA-256. Can disable with FOAMLENS_DISABLE_CASE_CATALOG=1. Source directories remain read-only.
