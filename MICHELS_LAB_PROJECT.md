# Michel's Lab Project Governance

This repository is part of the **Michel's Lab** software ecosystem.

## Authority

- Shared engineering rules, reusable implementation patterns, branding conventions, cloud/security standards and cross-app status live in `michels-lab/Michel-Software-Standards`.
- App-specific implementation truth remains in this repository and its own audit/project logs.
- The machine-readable relationship is declared in `.michelslab/project.yml`.

## Reporting contract

This repository is monitored by the master standards repository. Changes that affect only this product stay here. A change must also be promoted to the master repository when it creates or changes a reusable rule or cross-app concern, including:

- releases/versioning policy;
- shared architecture;
- Google/Supabase/other external services;
- cloud synchronization;
- authentication/authorization;
- secret requirements;
- security/privacy;
- update/distribution patterns;
- shared Michel's Lab branding/About behavior;
- reusable CI/release practices;
- cross-app gaps or decisions.

## Active FoamLENS product backlog — 2026-10-19

- **Canonical work source in main:** `docs/DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md`. Include all documented pending areas: independent Field view regions/dimensions (#145), Time Series variable catalog and measured histories (#146), viewport layout/DPI (#149), CAD viewer/conversion STEP/IGES/STL/OBJ/BREP (#147), OpenFOAM triSurface/meshing prep (#148), and scientific analysis checkMesh, energy, thermocouple mapping, front evolution, 2D/3D, health, phase-change/momentum (#150–#156). Measured #117 and owner acceptance #131 remain open.
- The **published v1.8.10** is not evidence that newly proposed work is implemented. Implementation must audit existing code to avoid duplicate modules, use generic source-driven OpenFOAM rules (QuickCup only for test fixtures) and verify real Windows Setup/Portable, scientific output and release SHA-256.
- Keep `docs/GIT_AUDIT_LOG.md` and the plan current with actual commits, remaining blockers and exact acceptance evidence; no unauthorized release.

## FoamLENS Developer twin — #158

- Developer-only Windows application is a separate compiler variant, **not** an unlockable public mode. Keep its own installer AppId, executable, local cache and WebView2 profile. Embed auditor code only in the Developer binary; public releases and Store distributions exclude it.
- Internal auditor gathers observed errors/UI evidence, avoids collecting raw OpenFOAM case data, and exports an AI debugging prompt and JSON only on explicit local action. Sensitive strings are automatically redacted where practical and must be reviewed before sharing.
- Canonical specification and local build: `docs/FOAMLENS_DEVELOPER_EDITION_2026-10-19.md`. Track actual CI and status under #158; retain independent scientific user-facing Mesh Auditor #150.

## Secret boundary

Only secret **names and storage locations** may be documented. Passwords, tokens, signing passwords, private keys, database passwords, refresh tokens and privileged service credentials must never be committed.

## Workflow

**Project records implementation → master polls project status → reusable findings are promoted to standards → future projects consume those standards.**
