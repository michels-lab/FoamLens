# FoamLens Git Audit Log

> Living engineering log for the FoamLens repository.  
> Repository: `realmichelduarte/FoamLens`  
> Primary branch: `main` · current public release: `v1.4.2`  
> Generated from GitHub history on 2026-09-28. Times below are UTC unless noted otherwise.

## Maintenance rule

This file is the durable project bitácora. After any meaningful Git operation—commit, branch change, pull request action, release/prerelease, CI failure or recovery, packaging change, or important prerelease finding—append/update the relevant section here. Do not rely only on chat history.

## Current repository state

| Item | State |
|---|---|
| Current public release | `v1.4.2` — FoamLens v1.4.2, normal release |
| Release-time `main` / tag head | `7d4a14c1b4238d0c87dd4276219357d9bff6ebdc` — docs: record global diagnostics and test-suite audit |
| Validated product head | `4046e498627b5e6d14cc4160f056ee35d6fa7515` — GitHub Actions run #385 SUCCESS |
| Release assets | `FoamLens-Portable-v1.4.2.exe`, SHA-256, `FoamLens-Setup-v1.4.2.exe` |
| Real regression fixture | `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13` |
| Latest prerelease | `v1.3.0-rc.1` — legacy prerelease retained for history |

## Important project milestones

- **2026-09-24** — repository history begins with `Initial release: OpenFOAM PostPlotter v20`.
- **2026-09-27** — Windows packaging/release line progressed through v1.0.0, v1.0.1, v1.0.2, v1.1.0, v1.2.0, and a published v1.3.0 release on `main`.
- **2026-09-28** — development continued on `development/v1.3.0-general-discovery` for the broader general OpenFOAM v1.3.0 work, with PR #1 opened as a draft against `main`.
- **2026-09-28** — master-spec audit/regression hardening added physical-time playback cache/prefetch, solver corrector + termination parsing, and stronger Windows visual smoke tests.
- **2026-09-28** — `v1.3.0-rc.1` prerelease was published from the development branch with portable EXE, SHA-256, and installer assets.
- **2026-09-28** — prerelease testing exposed UI defects: hidden sidebar lacked an obvious restore affordance and the Cases popover could be covered by navigation. Commit `3ddc9b6` fixed both; Actions run #189 passed.
- **2026-09-28** — prerelease testing exposed a background-execution defect: scanner yields depended on `requestAnimationFrame`, so scientific work could stall when the WebView stopped producing render frames. The pipeline was changed to a render-independent task scheduler and guarded by regression tests; Windows minimized-window smoke validation passed in run #191.
- **2026-09-28** — prerelease review found Watch Run technically functional but too browser-oriented and too sparse for the desktop product. It was upgraded to a read-only live OpenFOAM run monitor with explicit RUNNING/COMPLETED/FAILED state, physical-time progress, deltaT, Courant, latest residual, coupling/corrector state, execution/clock time, five-second refresh, manual refresh/stop, and a Numerical Performance handoff. Actions run #192 passed.
- **2026-09-28** — Review/Case Auditor identity was hardened after prerelease screenshots showed mixed case selector/health/root state. Commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **2026-09-28** — native Windows branding was added to the EXE, form/taskbar, installer and shortcuts. Commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed.

## Releases

| Published | Tag | Name | Type | Target | Assets |
|---|---|---|---|---|---|
| 2026-09-27 02:44:44 UTC | `v1.0.0` | FoamLens v1.0.0 | Release | `main` | `FoamLens-Portable-v1.0.0.exe`, `FoamLens-Portable-v1.0.0.exe.sha256`, `FoamLens-Setup-v1.0.0.exe` |
| 2026-09-27 03:01:21 UTC | `v1.0.1` | FoamLens v1.0.1 | Release | `main` | `FoamLens-Portable-v1.0.1.exe`, `FoamLens-Portable-v1.0.1.exe.sha256`, `FoamLens-Setup-v1.0.1.exe` |
| 2026-09-27 03:22:51 UTC | `v1.0.2` | FoamLens v1.0.2 | Release | `main` | `FoamLens-Portable-v1.0.2.exe`, `FoamLens-Portable-v1.0.2.exe.sha256`, `FoamLens-Setup-v1.0.2.exe` |
| 2026-09-27 04:04:32 UTC | `v1.1.0` | FoamLens v1.1.0 | Release | `main` | `FoamLens-Portable-v1.1.0.exe`, `FoamLens-Portable-v1.1.0.exe.sha256`, `FoamLens-Setup-v1.1.0.exe` |
| 2026-09-27 22:37:10 UTC | `v1.2.0` | FoamLens v1.2.0 | Release | `main` | `FoamLens-Portable-v1.2.0.exe`, `FoamLens-Portable-v1.2.0.exe.sha256`, `FoamLens-Setup-v1.2.0.exe` |
| 2026-09-27 23:25:42 UTC | `v1.3.0` | FoamLens v1.3.0 | Release | `main` | `FoamLens-Portable-v1.3.0.exe`, `FoamLens-Portable-v1.3.0.exe.sha256`, `FoamLens-Setup-v1.3.0.exe` |
| 2026-09-28 18:18:03 UTC | `v1.3.0-rc.1` | FoamLens Desktop v1.3.0-rc.1 | Pre-release | `development/v1.3.0-general-discovery` | `FoamLens-Portable-v1.3.0-rc.1.exe`, `FoamLens-Portable-v1.3.0-rc.1.exe.sha256`, `FoamLens-Setup-v1.3.0-rc.1.exe` |
| 2026-09-28 20:04:27 UTC | `v1.3.1` | FoamLens v1.3.1 | Release | `main` | `FoamLens-Portable-v1.3.1.exe`, `FoamLens-Portable-v1.3.1.exe.sha256`, `FoamLens-Setup-v1.3.1.exe` |
| 2026-09-29 17:28:32 UTC | `v1.3.2` | FoamLens v1.3.2 | Release | `main` | `FoamLens-Portable-v1.3.2.exe`, `FoamLens-Portable-v1.3.2.exe.sha256`, `FoamLens-Setup-v1.3.2.exe` |
| 2026-09-29 19:59:43 UTC | `v1.4.0` | FoamLens v1.4.0 | Release | `main` | Windows portable, SHA-256 and installer assets |
| 2026-09-30 06:42:45 UTC | `v1.4.1` | FoamLens v1.4.1 | Release | `main` | Windows portable, SHA-256 and installer assets |
| 2026-09-30 09:25:48 UTC | `v1.4.2` | FoamLens v1.4.2 | Release | `main` | `FoamLens-Portable-v1.4.2.exe`, `FoamLens-Portable-v1.4.2.exe.sha256`, `FoamLens-Setup-v1.4.2.exe` |

## Pull requests

| # | Created | State | Draft | Head → Base | Current head SHA | Title |
|---:|---|---|---|---|---|---|
| 1 | 2026-09-28 09:16:04 UTC | merged | no | `development/v1.3.0-general-discovery` → `main` | `d5a94b527ae6` | Release FoamLens Desktop v1.3.1 |
| 2 | 2026-09-29 17:25:23 UTC | merged | no | `release/v1.3.2` → `main` | `f5e6ab835da5` | Release FoamLens Desktop v1.3.2 |

## Complete commit history visible from the development branch

This table records every commit currently reachable from `development/v1.3.0-general-discovery`, oldest first.

| # | Date | SHA | Commit |
|---:|---|---|---|
| 1 | 2026-09-24 21:39:42 UTC | `1c12b7a480b6` | Initial release: OpenFOAM PostPlotter v20 |
| 2 | 2026-09-24 23:20:03 UTC | `849bc8f78d08` | Release OpenFOAM PostPlotter v22 |
| 3 | 2026-09-24 23:20:06 UTC | `a7ddd943ee76` | Document v22 smart case import and case visibility |
| 4 | 2026-09-24 23:20:08 UTC | `372a424803da` | Update changelog for v22 |
| 5 | 2026-09-25 20:50:19 UTC | `d8551a3d0c77` | Release OpenFOAM PostPlotter v29 |
| 6 | 2026-09-25 20:50:23 UTC | `4baca068e69e` | Update README for v29 |
| 7 | 2026-09-25 20:50:26 UTC | `eb1b20d00d27` | Document v23-v29 changes |
| 8 | 2026-09-27 02:08:34 UTC | `d38d69e4bff3` | Add FoamLens Desktop v1 Windows build |
| 9 | 2026-09-27 02:10:14 UTC | `b11ffdfd62af` | Fix Windows path separator in FoamLens Desktop host |
| 10 | 2026-09-27 02:12:58 UTC | `9af4e44fc0db` | Include FoamLens installer in Windows artifact |
| 11 | 2026-09-27 02:34:28 UTC | `87d37175dd3d` | Build and publish FoamLens Windows installer |
| 12 | 2026-09-27 02:35:23 UTC | `f46f58ad363d` | Rename project branding to FoamLens |
| 13 | 2026-09-27 02:35:25 UTC | `ebc960dd49eb` | Document FoamLens Windows installer workflow |
| 14 | 2026-09-27 02:35:52 UTC | `4010114eaadc` | Fix FoamLens Windows build expression escaping |
| 15 | 2026-09-27 02:42:37 UTC | `16bac95fd403` | Publish FoamLens installer to GitHub Releases |
| 16 | 2026-09-27 02:48:09 UTC | `d75261a6fb05` | Rename FoamLens portable Windows build |
| 17 | 2026-09-27 02:48:17 UTC | `8afe751612f2` | Document FoamLens portable build naming |
| 18 | 2026-09-27 02:48:19 UTC | `a39886c220ea` | Document FoamLens portable build naming |
| 19 | 2026-09-27 02:58:00 UTC | `b6e2b348ca4c` | Fix FoamLens Desktop controls and native bridge |
| 20 | 2026-09-27 02:59:39 UTC | `951b86a891cb` | Release FoamLens Desktop v1.0.1 control fix |
| 21 | 2026-09-27 03:21:18 UTC | `0a25bf5daa0b` | Detect raw OpenFOAM solver logs in FoamLens v1.0.2 |
| 22 | 2026-09-27 04:02:55 UTC | `84d8c6debd82` | Synchronize Spatial Profiles by physical time in v1.1.0 |
| 23 | 2026-09-27 22:29:01 UTC | `c84ba3c4cbbd` | Add capability-driven Phase Change and Momentum analysis in v1.2.0 |
| 24 | 2026-09-27 22:30:43 UTC | `cfa8878ae761` | Fix Phase Change Momentum regression test syntax |
| 25 | 2026-09-27 22:32:34 UTC | `d4c485d66af9` | Harden Phase Change Momentum test harness |
| 26 | 2026-09-27 22:35:21 UTC | `bd16cf052713` | Use real multiline OpenFOAM metadata fixture |
| 27 | 2026-09-27 23:24:02 UTC | `3519bab807f6` | Build general OpenFOAM discovery model in v1.3.0 |
| 28 | 2026-09-27 23:32:58 UTC | `07a3de7c0ab3` | Start v1.3.0 general discovery from v1.2.0 baseline |
| 29 | 2026-09-27 23:39:11 UTC | `08fa233d55f8` | Add general temporal alignment and difference core |
| 30 | 2026-09-27 23:39:43 UTC | `42bf382967ae` | Add temporal alignment regression suite |
| 31 | 2026-09-27 23:39:59 UTC | `b5996406231a` | Inject v1.3 temporal analysis into Desktop frontend |
| 32 | 2026-09-27 23:40:08 UTC | `f960cabf2850` | Run v1.3 temporal alignment checks in CI |
| 33 | 2026-09-27 23:42:00 UTC | `9b3fdb0bc950` | Add general numerical performance and run-log analysis |
| 34 | 2026-09-27 23:42:23 UTC | `064ad9b4bdc0` | Add numerical performance regression suite |
| 35 | 2026-09-27 23:42:35 UTC | `94531fba57bd` | Load modular v1.3 Desktop analysis extensions |
| 36 | 2026-09-27 23:42:43 UTC | `643fa3a053c5` | Bundle and test modular v1.3 numerical analysis |
| 37 | 2026-09-27 23:43:33 UTC | `8a197ba8f25f` | Add reproducible temporal comparison exports |
| 38 | 2026-09-27 23:43:40 UTC | `3a4e4a6d745b` | Test reproducible comparison export metadata |
| 39 | 2026-09-27 23:44:08 UTC | `a624b46315be` | Fix adaptive deltaT association with next physical time |
| 40 | 2026-09-27 23:44:30 UTC | `479a4df14b06` | Clarify published v1.2.0 versus v1.3 development |
| 41 | 2026-09-27 23:44:39 UTC | `c69a074c93ba` | Mark Desktop v1.3.0 as development |
| 42 | 2026-09-27 23:46:26 UTC | `03beaaea3999` | Add general derived physical analysis |
| 43 | 2026-09-27 23:46:41 UTC | `f82a33b6b2f3` | Add general physical analysis regression suite |
| 44 | 2026-09-27 23:46:49 UTC | `5c573eb739af` | Run general physical analysis regressions in CI |
| 45 | 2026-09-27 23:48:00 UTC | `fd8ce3d98f93` | Expand general Field Mapping roles |
| 46 | 2026-09-27 23:48:16 UTC | `9126ba838f8b` | Add expanded Field Mapping regression suite |
| 47 | 2026-09-27 23:48:23 UTC | `8d33b2d63ce0` | Run expanded Field Mapping regressions in CI |
| 48 | 2026-09-27 23:49:28 UTC | `cd219a3db2ab` | Add generic vector magnitude derivation |
| 49 | 2026-09-27 23:49:43 UTC | `5a4a542fbc6a` | Add generic vector-field regression suite |
| 50 | 2026-09-27 23:49:49 UTC | `6fcd001e5c3a` | Run generic vector-field regressions in CI |
| 51 | 2026-09-27 23:50:36 UTC | `43388856e809` | Add native progress and cancellation controls |
| 52 | 2026-09-27 23:52:31 UTC | `1a44a89aabb9` | Add cancellable native folder and foamLog operations |
| 53 | 2026-09-27 23:52:44 UTC | `c512d00d72aa` | Add native cancellation and background regressions |
| 54 | 2026-09-27 23:52:54 UTC | `3faf291880cb` | Run native cancellation regressions in CI |
| 55 | 2026-09-27 23:53:34 UTC | `db078a414e19` | Test malformed and missing OpenFOAM data handling |
| 56 | 2026-09-27 23:54:41 UTC | `66bb588ddb0a` | Extend raw solver logs with deltaT and outer-iteration series |
| 57 | 2026-09-27 23:54:49 UTC | `bee07c4556ec` | Test deltaT and coupling extensions to legacy solver logs |
| 58 | 2026-09-27 23:55:19 UTC | `61a3a41eb715` | Hide temporal comparison controls without compatible data |
| 59 | 2026-09-27 23:55:22 UTC | `f2fd803d13ed` | Hide numerical controls without solver-log data |
| 60 | 2026-09-27 23:55:23 UTC | `810c0b3d68f9` | Hide physical analysis controls without temporal data |
| 61 | 2026-09-27 23:55:26 UTC | `f622409e0b05` | Hide vector controls without compatible XYZ fields |
| 62 | 2026-09-27 23:55:34 UTC | `21a06257aabb` | Add capability-driven UI regression |
| 63 | 2026-09-27 23:55:42 UTC | `c939ec90c312` | Run capability-driven UI regression in CI |
| 64 | 2026-09-27 23:56:00 UTC | `9b0b0b437142` | Decouple vector tools from physical-analysis visibility |
| 65 | 2026-09-27 23:56:08 UTC | `e70e888b223f` | Guard independent capability panel visibility |
| 66 | 2026-09-27 23:56:30 UTC | `0cdbe9acbd29` | Fix outer-iteration regression assertion |
| 67 | 2026-09-27 23:56:51 UTC | `41ee1a87ceb2` | Make Native temporal alignment the default view |
| 68 | 2026-09-27 23:56:57 UTC | `8f6c0b6d2016` | Test Native as default temporal alignment |
| 69 | 2026-09-27 23:57:32 UTC | `75570492d5b7` | Validate complete v1.3 extension syntax in CI |
| 70 | 2026-09-28 00:00:36 UTC | `dc682987a12f` | Add quantitative spatial profile comparison |
| 71 | 2026-09-28 00:00:55 UTC | `4ed1fcf6a206` | Add spatial quantitative comparison regressions |
| 72 | 2026-09-28 00:01:04 UTC | `89ab8109d1ba` | Run spatial quantitative regressions in CI |
| 73 | 2026-09-28 00:01:52 UTC | `9a7ce114a9c7` | Propagate physical units and dimensions through derived analysis |
| 74 | 2026-09-28 00:02:06 UTC | `4a4ce76444e4` | Test derived units and dimension safety |
| 75 | 2026-09-28 00:02:19 UTC | `60ce3e36826f` | Correct units for temporal difference curves |
| 76 | 2026-09-28 00:02:27 UTC | `38c6fa35bcea` | Test temporal difference curve units |
| 77 | 2026-09-28 00:04:07 UTC | `f57642c8ef61` | Add physical-time versus timestep-index numerical plots |
| 78 | 2026-09-28 00:04:18 UTC | `c98c81fa09f1` | Test physical-time and timestep-index solver plots |
| 79 | 2026-09-28 00:16:45 UTC | `8a3b75fb0492` | Respect active case and region in temporal analysis |
| 80 | 2026-09-28 00:16:48 UTC | `2146041449a2` | Respect active case and region in physical analysis |
| 81 | 2026-09-28 00:16:50 UTC | `fdcd3092f630` | Respect active case and region in numerical analysis |
| 82 | 2026-09-28 00:16:52 UTC | `7b5979e30acc` | Respect active case and region in vector analysis |
| 83 | 2026-09-28 00:17:30 UTC | `de523fa823fc` | Strengthen multi-region analysis context |
| 84 | 2026-09-28 00:17:47 UTC | `af96715ac35a` | Add multi-region analysis regression suite |
| 85 | 2026-09-28 00:18:00 UTC | `b7d53466dc52` | Run multi-region analysis regressions in CI |
| 86 | 2026-09-28 00:20:03 UTC | `27d18eb0db84` | Scope Field Mapping by case and region |
| 87 | 2026-09-28 00:20:30 UTC | `9efb0d0d2836` | Separate mapping-edit region from analysis region |
| 88 | 2026-09-28 00:20:43 UTC | `274f867c1425` | Test region-scoped Field Mapping |
| 89 | 2026-09-28 00:21:15 UTC | `bcc995f9a328` | Update Field Mapping regression for regional signature |
| 90 | 2026-09-28 00:21:53 UTC | `14bfb1bb6f9e` | Make Field Mapping capabilities region-aware |
| 91 | 2026-09-28 00:22:05 UTC | `1a90e75a6a3d` | Test regional capability and workspace persistence |
| 92 | 2026-09-28 00:27:24 UTC | `3359e7699c39` | Remove case-name family and variant inference |
| 93 | 2026-09-28 00:27:42 UTC | `df03a6487e60` | Add no-case-name-inference regression suite |
| 94 | 2026-09-28 00:29:23 UTC | `37d6534e09ee` | Remove inferred case families and variants from product logic |
| 95 | 2026-09-28 00:29:36 UTC | `395d729e061e` | Remove redundant case-identity override module |
| 96 | 2026-09-28 00:30:38 UTC | `abf1d967e66d` | Test base product against case-name inference |
| 97 | 2026-09-28 00:31:18 UTC | `9e4c33561b21` | Run case-name neutrality regression in CI |
| 98 | 2026-09-28 00:31:52 UTC | `5c311c63e4e9` | Expand real fixed and adaptive OpenFOAM integration coverage |
| 99 | 2026-09-28 00:32:50 UTC | `d9b4d139edcc` | Fix case-name neutrality test syntax |
| 100 | 2026-09-28 00:33:24 UTC | `3c232da2336d` | Guard product code from fixture-specific names |
| 101 | 2026-09-28 00:33:50 UTC | `754e85d3bd86` | Mark v51 workspace and About as development |
| 102 | 2026-09-28 00:34:36 UTC | `91bb2c27be6c` | Add development version consistency regression |
| 103 | 2026-09-28 00:34:49 UTC | `a795ad20ebc6` | Run development version consistency regression |
| 104 | 2026-09-28 00:36:21 UTC | `a85504e4c919` | Expand OpenFOAM dimension and SI unit interpretation |
| 105 | 2026-09-28 00:37:57 UTC | `42678b82be1a` | Translate Data Catalog SI-unit header |
| 106 | 2026-09-28 00:38:15 UTC | `fe13347f91b8` | Add OpenFOAM dimensions and SI-unit regressions |
| 107 | 2026-09-28 00:38:33 UTC | `e0a8d206b813` | Run dimensions and SI-unit regressions in CI |
| 108 | 2026-09-28 00:39:52 UTC | `b83a0f15ef5b` | Catalog FoamLens derived data with provenance |
| 109 | 2026-09-28 00:40:20 UTC | `6abe57e7cbcb` | Add derived Data Catalog provenance regressions |
| 110 | 2026-09-28 00:40:39 UTC | `69b3f44821b6` | Run derived Data Catalog provenance regressions |
| 111 | 2026-09-28 00:41:23 UTC | `71197abc139f` | Fix isolated dimensions test harness |
| 112 | 2026-09-28 00:42:28 UTC | `495c73a66749` | Align UI copy with neutral case identity and derived catalog |
| 113 | 2026-09-28 00:43:37 UTC | `3e3ba84068a3` | Add reproducible selected-series exports |
| 114 | 2026-09-28 00:43:59 UTC | `1f7fd50357fe` | Add reproducible series export regressions |
| 115 | 2026-09-28 00:44:15 UTC | `b607013ce14c` | Run reproducible export regressions in CI |
| 116 | 2026-09-28 00:45:03 UTC | `fe953b7d5aa2` | Update dimensions regression for explicit derived units |
| 117 | 2026-09-28 00:46:25 UTC | `0ce8ff883134` | Add explicit descriptive case tags |
| 118 | 2026-09-28 00:46:46 UTC | `0d6d01f31e05` | Include descriptive case tags in reproducible exports |
| 119 | 2026-09-28 00:47:07 UTC | `b94535415daf` | Add descriptive case-tag regression suite |
| 120 | 2026-09-28 00:47:33 UTC | `0a61dad28e98` | Make case-tag neutrality regression behavior-based |
| 121 | 2026-09-28 00:48:13 UTC | `3ed1a10fef68` | Run descriptive case-tag regressions in CI |
| 122 | 2026-09-28 00:48:20 UTC | `e6ee52662e3b` | Test case tags in reproducible exports |
| 123 | 2026-09-28 00:50:10 UTC | `9a8522274c3d` | Add physical-coordinate spatial gradient analysis |
| 124 | 2026-09-28 00:50:49 UTC | `007ac1cfa3f2` | Test nonuniform physical-coordinate gradients |
| 125 | 2026-09-28 00:51:06 UTC | `e7255c623da3` | Allow Physical Analysis from spatial-profile capability |
| 126 | 2026-09-28 00:52:43 UTC | `f478bb171755` | Add general flow-signal analysis |
| 127 | 2026-09-28 00:53:14 UTC | `10c203cbbd03` | Add provenance to flow analysis summaries |
| 128 | 2026-09-28 05:27:57 UTC | `fd6f4b7e5849` | Add general flow-analysis regression suite |
| 129 | 2026-09-28 05:28:14 UTC | `29cb19e94c28` | Run general Flow Analysis regressions in CI |
| 130 | 2026-09-28 05:29:47 UTC | `1a7387c1a170` | Add explicit solidification and remelting analysis |
| 131 | 2026-09-28 05:30:13 UTC | `cdbab12e175f` | Add solidification/remelting regression suite |
| 132 | 2026-09-28 05:30:31 UTC | `d9e141405f21` | Run solidification/remelting regressions in CI |
| 133 | 2026-09-28 05:31:53 UTC | `529194d91e71` | Add explicit general Thermal Analysis |
| 134 | 2026-09-28 05:32:18 UTC | `365ea581ad73` | Add general Thermal Analysis regressions |
| 135 | 2026-09-28 05:32:51 UTC | `2bada2b2b6d0` | Gate new physical modules by available data |
| 136 | 2026-09-28 05:33:06 UTC | `315918698867` | Run Thermal Analysis regressions in CI |
| 137 | 2026-09-28 05:35:02 UTC | `d0720b9a2787` | Separate General Analysis from Difference UI |
| 138 | 2026-09-28 05:36:07 UTC | `c7fbed778aa2` | Place v13-temporal-alignment in General Analysis |
| 139 | 2026-09-28 05:36:21 UTC | `5e6e4398b2fb` | Place v13-numerical-performance in General Analysis |
| 140 | 2026-09-28 05:36:34 UTC | `14e9c74e8911` | Place v13-physical-analysis in General Analysis |
| 141 | 2026-09-28 05:36:43 UTC | `2a2e3befb6dc` | Place v13-vector-fields in General Analysis |
| 142 | 2026-09-28 05:36:56 UTC | `2d3684638614` | Place v13-flow-analysis in General Analysis |
| 143 | 2026-09-28 05:37:09 UTC | `b0bd873b2d4c` | Place v13-solidification-analysis in General Analysis |
| 144 | 2026-09-28 05:37:18 UTC | `469f69f2fbd3` | Place v13-thermal-analysis in General Analysis |
| 145 | 2026-09-28 05:37:50 UTC | `52364cab270d` | Add General Analysis UI organization regression |
| 146 | 2026-09-28 05:38:11 UTC | `badef2e31ba4` | Run Analysis UI organization regression in CI |
| 147 | 2026-09-28 05:38:51 UTC | `2181b60d4691` | Use unequivocal heating interval in Thermal regression |
| 148 | 2026-09-28 05:40:21 UTC | `42857ae1346d` | Preserve postProcessing provenance on temporal series |
| 149 | 2026-09-28 05:40:54 UTC | `e10f3385862d` | Preserve volume and surface provenance in Energy Balance |
| 150 | 2026-09-28 05:41:31 UTC | `767a44e1539c` | Export postProcessing provenance with selected series |
| 151 | 2026-09-28 05:41:49 UTC | `743ea3e1f244` | Show Energy Balance source types in Data Catalog provenance |
| 152 | 2026-09-28 05:43:31 UTC | `ecb1f9a2dcc4` | Test volume and surface Energy Balance provenance |
| 153 | 2026-09-28 05:43:41 UTC | `7f858c785698` | Test postProcessing provenance in reproducible exports |
| 154 | 2026-09-28 05:43:54 UTC | `747bf1169b6b` | Test Energy Balance source types in Data Catalog |
| 155 | 2026-09-28 05:47:26 UTC | `5e87f6f71e8d` | Complete general Flow Analysis regressions |
| 156 | 2026-09-28 05:47:44 UTC | `7749a69b2f0e` | Run general Flow Analysis regressions in CI |
| 157 | 2026-09-28 05:47:53 UTC | `ff594d2f32d9` | Parse large Desktop temporal files incrementally |
| 158 | 2026-09-28 05:48:32 UTC | `25c1721c362f` | Add incremental temporal parser regressions |
| 159 | 2026-09-28 05:49:19 UTC | `e8ddf7f9fc63` | Run incremental temporal parser regressions in CI |
| 160 | 2026-09-28 05:51:36 UTC | `946d0292b0db` | Add cancellable native temporal-file parser |
| 161 | 2026-09-28 05:51:41 UTC | `beae43e5b5c0` | Parse large Desktop OpenFOAM fields incrementally |
| 162 | 2026-09-28 05:52:18 UTC | `fcdbefb1643c` | Add incremental OpenFOAM field parser regressions |
| 163 | 2026-09-28 05:52:26 UTC | `008f4da8569a` | Use cancellable native streaming for large temporal files |
| 164 | 2026-09-28 05:52:41 UTC | `ee28a78e9189` | Run incremental field parser regressions in CI |
| 165 | 2026-09-28 05:53:07 UTC | `8e90d29e49df` | Keep concurrent temporal operations isolated |
| 166 | 2026-09-28 05:53:31 UTC | `dff78dbef8eb` | Test native temporal streaming progress and cancellation |
| 167 | 2026-09-28 05:54:13 UTC | `2e8e77d8fc51` | Test native streaming temporal parser |
| 168 | 2026-09-28 05:55:34 UTC | `697ec0d10b1f` | Add cancellable native OpenFOAM field streaming parser |
| 169 | 2026-09-28 05:56:17 UTC | `79f4fe5e92b8` | Expand neutral general case comparison table |
| 170 | 2026-09-28 05:56:42 UTC | `9f44cb5308d5` | Add neutral general case-comparison regressions |
| 171 | 2026-09-28 05:57:06 UTC | `df49a99bc0a4` | Run neutral general case-comparison regressions in CI |
| 172 | 2026-09-28 05:57:14 UTC | `af327050d3c1` | Use cancellable native streaming for large OpenFOAM fields |
| 173 | 2026-09-28 05:57:46 UTC | `335b9e656427` | Add native OpenFOAM field streaming regressions |
| 174 | 2026-09-28 05:58:12 UTC | `a5804a833716` | Run native field streaming regressions in CI |
| 175 | 2026-09-28 05:58:28 UTC | `52e5dca514cd` | Fix native temporal metadata regression assertion |
| 176 | 2026-09-28 05:59:57 UTC | `a97b15bf144d` | Update Phase Momentum regression for streaming field parser |
| 177 | 2026-09-28 06:02:09 UTC | `04c6274b92d3` | Update temporal cancellation regression for unified data reads |
| 178 | 2026-09-28 06:04:36 UTC | `3c6dcc86f794` | Fix OpenFOAM field parser factory naming collision |
| 179 | 2026-09-28 06:05:02 UTC | `6cf21a77fc5d` | Update native field streaming factory regressions |
| 180 | 2026-09-28 06:26:55 UTC | `4669d0cb2dc7` | Support ASCII tensor field payloads |
| 181 | 2026-09-28 06:28:28 UTC | `1538beafa6fb` | Keep field parser core self-contained |
| 182 | 2026-09-28 06:30:35 UTC | `de560a8747ea` | Cover tensor fields in incremental parser |
| 183 | 2026-09-28 06:34:56 UTC | `0aac3e63e835` | Stress-test large incremental datasets |
| 184 | 2026-09-28 08:01:01 UTC | `26a2f0fc2be6` | Harden bilingual UI and Review presentation |
| 185 | 2026-09-28 08:08:19 UTC | `3cca331710f8` | Update regressions for bilingual UI markup |
| 186 | 2026-09-28 08:12:59 UTC | `a500ba7ab5ef` | Update case-tag regression for corrected Spanish copy |
| 187 | 2026-09-28 08:36:03 UTC | `31220b7e2be2` | Run QuickCup regression on Linux |
| 188 | 2026-09-28 08:59:28 UTC | `11501db3225a` | Complete bilingual UI audit and overflow hardening |
| 189 | 2026-09-28 09:10:39 UTC | `78501c8b4838` | Add Windows executable startup smoke test |
| 190 | 2026-09-28 09:10:58 UTC | `18e447632526` | Run packaged EXE smoke test in Windows CI |
| 191 | 2026-09-28 09:13:47 UTC | `bea07b55cf02` | Smoke-test installed Windows build |
| 192 | 2026-09-28 09:17:08 UTC | `80af3128c2c3` | Reconcile main history into v1.3.0 development |
| 193 | 2026-09-28 09:46:38 UTC | `94a59ed87a04` | Expand real OpenFOAM master-spec regression coverage |
| 194 | 2026-09-28 09:47:00 UTC | `851332602ce3` | Cover playback performance and write-interval regressions |
| 195 | 2026-09-28 09:48:04 UTC | `fada2ce22ca1` | Add runtime visual smoke validation |
| 196 | 2026-09-28 09:48:19 UTC | `562336e18ba3` | Capture runtime visual smoke artifacts |
| 197 | 2026-09-28 09:50:31 UTC | `fe2c93af63d3` | Cover complete temporal difference metrics |
| 198 | 2026-09-28 09:54:23 UTC | `ab75602eaaaf` | Document v1.3.0 master-spec regression audit |
| 199 | 2026-09-28 18:03:16 UTC | `892875618214` | Cache and prefetch Spatial Profile playback frames |
| 200 | 2026-09-28 18:04:31 UTC | `88e788746490` | Track solver correctors and run termination |
| 201 | 2026-09-28 18:05:28 UTC | `eeb2d744b346` | Test solver correctors and termination status |
| 202 | 2026-09-28 18:06:02 UTC | `900035267071` | Harden runtime visual smoke checks |
| 203 | 2026-09-28 18:08:16 UTC | `94e5629b642b` | Refine visual smoke clipping check |
| 204 | 2026-09-28 18:10:27 UTC | `f053e2727c36` | Update v1.3.0 audit after final regression hardening |
| 205 | 2026-09-28 18:40:01 UTC | `3ddc9b6795b7` | Fix sidebar restore handle and Cases panel stacking |

## GitHub Actions history

Every workflow run currently returned by the repository Actions history, oldest first.

| Run | Date | Event | Ref | SHA | Result |
|---:|---|---|---|---|---|
| #1 | 2026-09-27 02:08:48 UTC | push | `main` | `d38d69e4bff3` | failure |
| #2 | 2026-09-27 02:10:16 UTC | push | `main` | `b11ffdfd62af` | success |
| #3 | 2026-09-27 02:13:00 UTC | push | `main` | `9af4e44fc0db` | success |
| #4 | 2026-09-27 02:34:30 UTC | push | `main` | `87d37175dd3d` | failure |
| #5 | 2026-09-27 02:35:27 UTC | push | `main` | `ebc960dd49eb` | failure |
| #6 | 2026-09-27 02:35:54 UTC | push | `main` | `4010114eaadc` | success |
| #7 | 2026-09-27 02:42:39 UTC | push | `main` | `16bac95fd403` | success |
| #8 | 2026-09-27 02:48:11 UTC | push | `main` | `d75261a6fb05` | success |
| #9 | 2026-09-27 02:48:21 UTC | push | `main` | `a39886c220ea` | success |
| #10 | 2026-09-27 02:58:02 UTC | push | `main` | `b6e2b348ca4c` | success |
| #11 | 2026-09-27 02:59:43 UTC | push | `main` | `951b86a891cb` | success |
| #12 | 2026-09-27 03:21:23 UTC | push | `main` | `0a25bf5daa0b` | success |
| #13 | 2026-09-27 04:03:01 UTC | push | `main` | `84d8c6debd82` | success |
| #14 | 2026-09-27 22:29:08 UTC | push | `main` | `c84ba3c4cbbd` | failure |
| #15 | 2026-09-27 22:30:50 UTC | push | `main` | `cfa8878ae761` | failure |
| #16 | 2026-09-27 22:32:42 UTC | push | `main` | `d4c485d66af9` | failure |
| #17 | 2026-09-27 22:35:30 UTC | push | `main` | `bd16cf052713` | success |
| #18 | 2026-09-27 23:24:09 UTC | push | `main` | `3519bab807f6` | success |
| #19 | 2026-09-27 23:40:10 UTC | push | `development/v1.3.0-general-discovery` | `f960cabf2850` | success |
| #20 | 2026-09-27 23:42:02 UTC | push | `development/v1.3.0-general-discovery` | `9b3fdb0bc950` | success |
| #21 | 2026-09-27 23:42:25 UTC | push | `development/v1.3.0-general-discovery` | `064ad9b4bdc0` | success |
| #22 | 2026-09-27 23:42:37 UTC | push | `development/v1.3.0-general-discovery` | `94531fba57bd` | success |
| #23 | 2026-09-27 23:42:45 UTC | push | `development/v1.3.0-general-discovery` | `643fa3a053c5` | failure |
| #24 | 2026-09-27 23:43:35 UTC | push | `development/v1.3.0-general-discovery` | `8a197ba8f25f` | failure |
| #25 | 2026-09-27 23:43:42 UTC | push | `development/v1.3.0-general-discovery` | `3a4e4a6d745b` | failure |
| #26 | 2026-09-27 23:44:11 UTC | push | `development/v1.3.0-general-discovery` | `a624b46315be` | success |
| #27 | 2026-09-27 23:44:45 UTC | push | `development/v1.3.0-general-discovery` | `c69a074c93ba` | success |
| #28 | 2026-09-27 23:46:28 UTC | push | `development/v1.3.0-general-discovery` | `03beaaea3999` | success |
| #29 | 2026-09-27 23:46:43 UTC | push | `development/v1.3.0-general-discovery` | `f82a33b6b2f3` | success |
| #30 | 2026-09-27 23:46:51 UTC | push | `development/v1.3.0-general-discovery` | `5c573eb739af` | success |
| #31 | 2026-09-27 23:48:02 UTC | push | `development/v1.3.0-general-discovery` | `fd8ce3d98f93` | success |
| #32 | 2026-09-27 23:48:18 UTC | push | `development/v1.3.0-general-discovery` | `9126ba838f8b` | success |
| #33 | 2026-09-27 23:48:24 UTC | push | `development/v1.3.0-general-discovery` | `8d33b2d63ce0` | success |
| #34 | 2026-09-27 23:49:31 UTC | push | `development/v1.3.0-general-discovery` | `cd219a3db2ab` | success |
| #35 | 2026-09-27 23:49:45 UTC | push | `development/v1.3.0-general-discovery` | `5a4a542fbc6a` | success |
| #36 | 2026-09-27 23:49:51 UTC | push | `development/v1.3.0-general-discovery` | `6fcd001e5c3a` | success |
| #37 | 2026-09-27 23:50:39 UTC | push | `development/v1.3.0-general-discovery` | `43388856e809` | success |
| #38 | 2026-09-27 23:52:33 UTC | push | `development/v1.3.0-general-discovery` | `1a44a89aabb9` | success |
| #39 | 2026-09-27 23:52:46 UTC | push | `development/v1.3.0-general-discovery` | `c512d00d72aa` | success |
| #40 | 2026-09-27 23:52:56 UTC | push | `development/v1.3.0-general-discovery` | `3faf291880cb` | success |
| #41 | 2026-09-27 23:53:36 UTC | push | `development/v1.3.0-general-discovery` | `db078a414e19` | success |
| #42 | 2026-09-27 23:54:43 UTC | push | `development/v1.3.0-general-discovery` | `66bb588ddb0a` | success |
| #43 | 2026-09-27 23:54:51 UTC | push | `development/v1.3.0-general-discovery` | `bee07c4556ec` | failure |
| #44 | 2026-09-27 23:55:21 UTC | push | `development/v1.3.0-general-discovery` | `61a3a41eb715` | failure |
| #45 | 2026-09-27 23:55:23 UTC | push | `development/v1.3.0-general-discovery` | `f2fd803d13ed` | failure |
| #46 | 2026-09-27 23:55:26 UTC | push | `development/v1.3.0-general-discovery` | `810c0b3d68f9` | failure |
| #47 | 2026-09-27 23:55:28 UTC | push | `development/v1.3.0-general-discovery` | `f622409e0b05` | failure |
| #48 | 2026-09-27 23:55:37 UTC | push | `development/v1.3.0-general-discovery` | `21a06257aabb` | failure |
| #49 | 2026-09-27 23:55:44 UTC | push | `development/v1.3.0-general-discovery` | `c939ec90c312` | failure |
| #50 | 2026-09-27 23:56:02 UTC | push | `development/v1.3.0-general-discovery` | `9b0b0b437142` | failure |
| #51 | 2026-09-27 23:56:10 UTC | push | `development/v1.3.0-general-discovery` | `e70e888b223f` | failure |
| #52 | 2026-09-27 23:56:32 UTC | push | `development/v1.3.0-general-discovery` | `0cdbe9acbd29` | success |
| #53 | 2026-09-27 23:56:53 UTC | push | `development/v1.3.0-general-discovery` | `41ee1a87ceb2` | success |
| #54 | 2026-09-27 23:56:59 UTC | push | `development/v1.3.0-general-discovery` | `8f6c0b6d2016` | success |
| #55 | 2026-09-27 23:57:34 UTC | push | `development/v1.3.0-general-discovery` | `75570492d5b7` | success |
| #56 | 2026-09-28 00:00:38 UTC | push | `development/v1.3.0-general-discovery` | `dc682987a12f` | success |
| #57 | 2026-09-28 00:00:57 UTC | push | `development/v1.3.0-general-discovery` | `4ed1fcf6a206` | success |
| #58 | 2026-09-28 00:01:06 UTC | push | `development/v1.3.0-general-discovery` | `89ab8109d1ba` | success |
| #59 | 2026-09-28 00:01:55 UTC | push | `development/v1.3.0-general-discovery` | `9a7ce114a9c7` | success |
| #60 | 2026-09-28 00:02:08 UTC | push | `development/v1.3.0-general-discovery` | `4a4ce76444e4` | success |
| #61 | 2026-09-28 00:02:21 UTC | push | `development/v1.3.0-general-discovery` | `60ce3e36826f` | success |
| #62 | 2026-09-28 00:02:29 UTC | push | `development/v1.3.0-general-discovery` | `38c6fa35bcea` | success |
| #63 | 2026-09-28 00:04:09 UTC | push | `development/v1.3.0-general-discovery` | `f57642c8ef61` | success |
| #64 | 2026-09-28 00:04:20 UTC | push | `development/v1.3.0-general-discovery` | `c98c81fa09f1` | success |
| #65 | 2026-09-28 00:16:47 UTC | push | `development/v1.3.0-general-discovery` | `8a3b75fb0492` | success |
| #66 | 2026-09-28 00:16:50 UTC | push | `development/v1.3.0-general-discovery` | `2146041449a2` | success |
| #67 | 2026-09-28 00:16:52 UTC | push | `development/v1.3.0-general-discovery` | `fdcd3092f630` | success |
| #68 | 2026-09-28 00:16:54 UTC | push | `development/v1.3.0-general-discovery` | `7b5979e30acc` | success |
| #69 | 2026-09-28 00:17:32 UTC | push | `development/v1.3.0-general-discovery` | `de523fa823fc` | success |
| #70 | 2026-09-28 00:17:49 UTC | push | `development/v1.3.0-general-discovery` | `af96715ac35a` | success |
| #71 | 2026-09-28 00:18:01 UTC | push | `development/v1.3.0-general-discovery` | `b7d53466dc52` | success |
| #72 | 2026-09-28 00:20:05 UTC | push | `development/v1.3.0-general-discovery` | `27d18eb0db84` | failure |
| #73 | 2026-09-28 00:20:33 UTC | push | `development/v1.3.0-general-discovery` | `9efb0d0d2836` | failure |
| #74 | 2026-09-28 00:20:45 UTC | push | `development/v1.3.0-general-discovery` | `274f867c1425` | failure |
| #75 | 2026-09-28 00:21:17 UTC | push | `development/v1.3.0-general-discovery` | `bcc995f9a328` | success |
| #76 | 2026-09-28 00:21:55 UTC | push | `development/v1.3.0-general-discovery` | `14bfb1bb6f9e` | success |
| #77 | 2026-09-28 00:22:07 UTC | push | `development/v1.3.0-general-discovery` | `1a90e75a6a3d` | success |
| #78 | 2026-09-28 00:27:26 UTC | push | `development/v1.3.0-general-discovery` | `3359e7699c39` | success |
| #79 | 2026-09-28 00:27:45 UTC | push | `development/v1.3.0-general-discovery` | `df03a6487e60` | success |
| #80 | 2026-09-28 00:29:26 UTC | push | `development/v1.3.0-general-discovery` | `37d6534e09ee` | success |
| #81 | 2026-09-28 00:29:38 UTC | push | `development/v1.3.0-general-discovery` | `395d729e061e` | success |
| #82 | 2026-09-28 00:30:40 UTC | push | `development/v1.3.0-general-discovery` | `abf1d967e66d` | success |
| #83 | 2026-09-28 00:31:21 UTC | push | `development/v1.3.0-general-discovery` | `9e4c33561b21` | failure |
| #84 | 2026-09-28 00:31:54 UTC | push | `development/v1.3.0-general-discovery` | `5c311c63e4e9` | failure |
| #85 | 2026-09-28 00:32:52 UTC | push | `development/v1.3.0-general-discovery` | `d9b4d139edcc` | success |
| #86 | 2026-09-28 00:33:25 UTC | push | `development/v1.3.0-general-discovery` | `3c232da2336d` | success |
| #87 | 2026-09-28 00:33:53 UTC | push | `development/v1.3.0-general-discovery` | `754e85d3bd86` | success |
| #88 | 2026-09-28 00:34:38 UTC | push | `development/v1.3.0-general-discovery` | `91bb2c27be6c` | success |
| #89 | 2026-09-28 00:34:51 UTC | push | `development/v1.3.0-general-discovery` | `a795ad20ebc6` | success |
| #90 | 2026-09-28 00:36:24 UTC | push | `development/v1.3.0-general-discovery` | `a85504e4c919` | success |
| #91 | 2026-09-28 00:37:59 UTC | push | `development/v1.3.0-general-discovery` | `42678b82be1a` | success |
| #92 | 2026-09-28 00:38:17 UTC | push | `development/v1.3.0-general-discovery` | `fe13347f91b8` | success |
| #93 | 2026-09-28 00:38:35 UTC | push | `development/v1.3.0-general-discovery` | `e0a8d206b813` | failure |
| #94 | 2026-09-28 00:39:54 UTC | push | `development/v1.3.0-general-discovery` | `b83a0f15ef5b` | failure |
| #95 | 2026-09-28 00:40:23 UTC | push | `development/v1.3.0-general-discovery` | `6abe57e7cbcb` | failure |
| #96 | 2026-09-28 00:40:42 UTC | push | `development/v1.3.0-general-discovery` | `69b3f44821b6` | failure |
| #97 | 2026-09-28 00:41:25 UTC | push | `development/v1.3.0-general-discovery` | `71197abc139f` | failure |
| #98 | 2026-09-28 00:42:31 UTC | push | `development/v1.3.0-general-discovery` | `495c73a66749` | failure |
| #99 | 2026-09-28 00:43:40 UTC | push | `development/v1.3.0-general-discovery` | `3e3ba84068a3` | failure |
| #100 | 2026-09-28 00:44:01 UTC | push | `development/v1.3.0-general-discovery` | `1f7fd50357fe` | failure |
| #101 | 2026-09-28 00:44:17 UTC | push | `development/v1.3.0-general-discovery` | `b607013ce14c` | failure |
| #102 | 2026-09-28 00:45:05 UTC | push | `development/v1.3.0-general-discovery` | `fe953b7d5aa2` | success |
| #103 | 2026-09-28 00:46:27 UTC | push | `development/v1.3.0-general-discovery` | `0ce8ff883134` | success |
| #104 | 2026-09-28 00:46:47 UTC | push | `development/v1.3.0-general-discovery` | `0d6d01f31e05` | success |
| #105 | 2026-09-28 00:47:09 UTC | push | `development/v1.3.0-general-discovery` | `b94535415daf` | success |
| #106 | 2026-09-28 00:47:35 UTC | push | `development/v1.3.0-general-discovery` | `0a61dad28e98` | success |
| #107 | 2026-09-28 00:48:15 UTC | push | `development/v1.3.0-general-discovery` | `3ed1a10fef68` | success |
| #108 | 2026-09-28 00:48:22 UTC | push | `development/v1.3.0-general-discovery` | `e6ee52662e3b` | success |
| #109 | 2026-09-28 00:50:13 UTC | push | `development/v1.3.0-general-discovery` | `9a8522274c3d` | failure |
| #110 | 2026-09-28 00:50:51 UTC | push | `development/v1.3.0-general-discovery` | `007ac1cfa3f2` | failure |
| #111 | 2026-09-28 00:51:08 UTC | push | `development/v1.3.0-general-discovery` | `e7255c623da3` | success |
| #112 | 2026-09-28 00:52:45 UTC | push | `development/v1.3.0-general-discovery` | `f478bb171755` | success |
| #113 | 2026-09-28 00:53:16 UTC | push | `development/v1.3.0-general-discovery` | `10c203cbbd03` | success |
| #114 | 2026-09-28 05:27:59 UTC | push | `development/v1.3.0-general-discovery` | `fd6f4b7e5849` | success |
| #115 | 2026-09-28 05:28:16 UTC | push | `development/v1.3.0-general-discovery` | `29cb19e94c28` | success |
| #116 | 2026-09-28 05:29:49 UTC | push | `development/v1.3.0-general-discovery` | `1a7387c1a170` | success |
| #117 | 2026-09-28 05:30:15 UTC | push | `development/v1.3.0-general-discovery` | `cdbab12e175f` | success |
| #118 | 2026-09-28 05:30:33 UTC | push | `development/v1.3.0-general-discovery` | `d9e141405f21` | success |
| #119 | 2026-09-28 05:31:55 UTC | push | `development/v1.3.0-general-discovery` | `529194d91e71` | success |
| #120 | 2026-09-28 05:32:20 UTC | push | `development/v1.3.0-general-discovery` | `365ea581ad73` | success |
| #121 | 2026-09-28 05:32:53 UTC | push | `development/v1.3.0-general-discovery` | `2bada2b2b6d0` | success |
| #122 | 2026-09-28 05:33:07 UTC | push | `development/v1.3.0-general-discovery` | `315918698867` | failure |
| #123 | 2026-09-28 05:35:04 UTC | push | `development/v1.3.0-general-discovery` | `d0720b9a2787` | failure |
| #124 | 2026-09-28 05:36:09 UTC | push | `development/v1.3.0-general-discovery` | `c7fbed778aa2` | failure |
| #125 | 2026-09-28 05:36:23 UTC | push | `development/v1.3.0-general-discovery` | `5e6e4398b2fb` | failure |
| #126 | 2026-09-28 05:36:36 UTC | push | `development/v1.3.0-general-discovery` | `14e9c74e8911` | failure |
| #127 | 2026-09-28 05:36:45 UTC | push | `development/v1.3.0-general-discovery` | `2a2e3befb6dc` | failure |
| #128 | 2026-09-28 05:36:57 UTC | push | `development/v1.3.0-general-discovery` | `2d3684638614` | failure |
| #129 | 2026-09-28 05:37:12 UTC | push | `development/v1.3.0-general-discovery` | `b0bd873b2d4c` | failure |
| #130 | 2026-09-28 05:37:21 UTC | push | `development/v1.3.0-general-discovery` | `469f69f2fbd3` | failure |
| #131 | 2026-09-28 05:37:52 UTC | push | `development/v1.3.0-general-discovery` | `52364cab270d` | failure |
| #132 | 2026-09-28 05:38:13 UTC | push | `development/v1.3.0-general-discovery` | `badef2e31ba4` | failure |
| #133 | 2026-09-28 05:38:54 UTC | push | `development/v1.3.0-general-discovery` | `2181b60d4691` | success |
| #134 | 2026-09-28 05:40:23 UTC | push | `development/v1.3.0-general-discovery` | `42857ae1346d` | success |
| #135 | 2026-09-28 05:40:56 UTC | push | `development/v1.3.0-general-discovery` | `e10f3385862d` | success |
| #136 | 2026-09-28 05:41:35 UTC | push | `development/v1.3.0-general-discovery` | `767a44e1539c` | success |
| #137 | 2026-09-28 05:41:51 UTC | push | `development/v1.3.0-general-discovery` | `743ea3e1f244` | success |
| #138 | 2026-09-28 05:43:33 UTC | push | `development/v1.3.0-general-discovery` | `ecb1f9a2dcc4` | success |
| #139 | 2026-09-28 05:43:43 UTC | push | `development/v1.3.0-general-discovery` | `7f858c785698` | success |
| #140 | 2026-09-28 05:43:56 UTC | push | `development/v1.3.0-general-discovery` | `747bf1169b6b` | success |
| #141 | 2026-09-28 05:47:28 UTC | push | `development/v1.3.0-general-discovery` | `5e87f6f71e8d` | success |
| #142 | 2026-09-28 05:47:47 UTC | push | `development/v1.3.0-general-discovery` | `7749a69b2f0e` | success |
| #143 | 2026-09-28 05:47:56 UTC | push | `development/v1.3.0-general-discovery` | `ff594d2f32d9` | success |
| #144 | 2026-09-28 05:48:34 UTC | push | `development/v1.3.0-general-discovery` | `25c1721c362f` | success |
| #145 | 2026-09-28 05:49:21 UTC | push | `development/v1.3.0-general-discovery` | `e8ddf7f9fc63` | success |
| #146 | 2026-09-28 05:51:38 UTC | push | `development/v1.3.0-general-discovery` | `946d0292b0db` | success |
| #147 | 2026-09-28 05:51:43 UTC | push | `development/v1.3.0-general-discovery` | `beae43e5b5c0` | success |
| #148 | 2026-09-28 05:52:20 UTC | push | `development/v1.3.0-general-discovery` | `fcdbefb1643c` | success |
| #149 | 2026-09-28 05:52:29 UTC | push | `development/v1.3.0-general-discovery` | `008f4da8569a` | success |
| #150 | 2026-09-28 05:52:43 UTC | push | `development/v1.3.0-general-discovery` | `ee28a78e9189` | success |
| #151 | 2026-09-28 05:53:09 UTC | push | `development/v1.3.0-general-discovery` | `8e90d29e49df` | success |
| #152 | 2026-09-28 05:53:33 UTC | push | `development/v1.3.0-general-discovery` | `dff78dbef8eb` | success |
| #153 | 2026-09-28 05:54:15 UTC | push | `development/v1.3.0-general-discovery` | `2e8e77d8fc51` | failure |
| #154 | 2026-09-28 05:55:36 UTC | push | `development/v1.3.0-general-discovery` | `697ec0d10b1f` | failure |
| #155 | 2026-09-28 05:56:19 UTC | push | `development/v1.3.0-general-discovery` | `79f4fe5e92b8` | failure |
| #156 | 2026-09-28 05:56:44 UTC | push | `development/v1.3.0-general-discovery` | `9f44cb5308d5` | failure |
| #157 | 2026-09-28 05:57:08 UTC | push | `development/v1.3.0-general-discovery` | `df49a99bc0a4` | failure |
| #158 | 2026-09-28 05:57:16 UTC | push | `development/v1.3.0-general-discovery` | `af327050d3c1` | failure |
| #159 | 2026-09-28 05:57:48 UTC | push | `development/v1.3.0-general-discovery` | `335b9e656427` | failure |
| #160 | 2026-09-28 05:58:14 UTC | push | `development/v1.3.0-general-discovery` | `a5804a833716` | failure |
| #161 | 2026-09-28 05:58:30 UTC | push | `development/v1.3.0-general-discovery` | `52e5dca514cd` | failure |
| #162 | 2026-09-28 05:59:59 UTC | push | `development/v1.3.0-general-discovery` | `a97b15bf144d` | failure |
| #163 | 2026-09-28 06:02:12 UTC | push | `development/v1.3.0-general-discovery` | `04c6274b92d3` | failure |
| #164 | 2026-09-28 06:04:38 UTC | push | `development/v1.3.0-general-discovery` | `3c6dcc86f794` | failure |
| #165 | 2026-09-28 06:05:04 UTC | push | `development/v1.3.0-general-discovery` | `6cf21a77fc5d` | success |
| #166 | 2026-09-28 06:26:58 UTC | push | `development/v1.3.0-general-discovery` | `4669d0cb2dc7` | failure |
| #167 | 2026-09-28 06:28:32 UTC | push | `development/v1.3.0-general-discovery` | `1538beafa6fb` | failure |
| #168 | 2026-09-28 06:30:39 UTC | push | `development/v1.3.0-general-discovery` | `de560a8747ea` | success |
| #169 | 2026-09-28 06:35:00 UTC | push | `development/v1.3.0-general-discovery` | `0aac3e63e835` | success |
| #170 | 2026-09-28 08:01:17 UTC | push | `development/v1.3.0-general-discovery` | `26a2f0fc2be6` | failure |
| #171 | 2026-09-28 08:08:31 UTC | push | `development/v1.3.0-general-discovery` | `3cca331710f8` | failure |
| #172 | 2026-09-28 08:13:02 UTC | push | `development/v1.3.0-general-discovery` | `a500ba7ab5ef` | failure |
| #173 | 2026-09-28 08:36:12 UTC | push | `development/v1.3.0-general-discovery` | `31220b7e2be2` | success |
| #174 | 2026-09-28 08:59:44 UTC | push | `development/v1.3.0-general-discovery` | `11501db3225a` | success |
| #175 | 2026-09-28 09:10:42 UTC | push | `development/v1.3.0-general-discovery` | `78501c8b4838` | success |
| #176 | 2026-09-28 09:11:00 UTC | push | `development/v1.3.0-general-discovery` | `18e447632526` | success |
| #177 | 2026-09-28 09:13:50 UTC | push | `development/v1.3.0-general-discovery` | `bea07b55cf02` | success |
| #178 | 2026-09-28 09:46:40 UTC | push | `development/v1.3.0-general-discovery` | `94a59ed87a04` | success |
| #179 | 2026-09-28 09:47:02 UTC | push | `development/v1.3.0-general-discovery` | `851332602ce3` | success |
| #180 | 2026-09-28 09:48:06 UTC | push | `development/v1.3.0-general-discovery` | `fada2ce22ca1` | success |
| #181 | 2026-09-28 09:48:21 UTC | push | `development/v1.3.0-general-discovery` | `562336e18ba3` | success |
| #182 | 2026-09-28 09:50:34 UTC | push | `development/v1.3.0-general-discovery` | `fe2c93af63d3` | success |
| #183 | 2026-09-28 18:03:22 UTC | push | `development/v1.3.0-general-discovery` | `892875618214` | success |
| #184 | 2026-09-28 18:04:35 UTC | push | `development/v1.3.0-general-discovery` | `88e788746490` | success |
| #185 | 2026-09-28 18:05:32 UTC | push | `development/v1.3.0-general-discovery` | `eeb2d744b346` | success |
| #186 | 2026-09-28 18:06:06 UTC | push | `development/v1.3.0-general-discovery` | `900035267071` | failure |
| #187 | 2026-09-28 18:08:20 UTC | push | `development/v1.3.0-general-discovery` | `94e5629b642b` | success |
| #188 | 2026-09-28 18:18:05 UTC | push | `v1.3.0-rc.1` | `f053e2727c36` | success |
| #189 | 2026-09-28 18:40:05 UTC | push | `development/v1.3.0-general-discovery` | `3ddc9b6795b7` | success |

## Current open prerelease QA items

- **Review / Case Auditor context consistency:** resolved in commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **Native Windows icon:** resolved in commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed packaging, portable smoke, installer build and installed-app smoke.
- **Background execution:** resolved in commit `4a3701bb400a51cb907afbdc6de42de125c6418c`; Actions run #191 passed the real minimized-window runtime smoke.
- **Watch Run desktop UX:** implementation upgraded in commit `128e68e022a4a82fe4f9a2ea7384503fa93a4c04`; Actions run #192 passed.
- **Review / Case Auditor context consistency:** Smart Import now binds detected cases by stable source/root identity and carries the resolved `caseId` through the load pipeline instead of re-looking up mutable display names. Review uses a shared case-context binder and stamps all audit output with that same `caseId`. Run #193 passed.
- **Native Windows branding:** native FoamLens icon is embedded in the EXE, assigned to the window/taskbar and used by installer/shortcuts. Run #194 passed.


## Subsequent changes after the baseline history snapshot

| Date | SHA | Change | Validation |
|---|---|---|---|
| 2026-09-28 | `ac013cc25bea` | Add complete Git development audit log | Documentation baseline |
| 2026-09-28 | `43b62231af6f` | Keep scientific work running outside render frames | Run #190 success |
| 2026-09-28 | `4a3701bb400a` | Smoke-test minimized background execution | Run #191 success |
| 2026-09-28 | `128e68e022a4` | Upgrade Watch Run for desktop monitoring | Run #192 success |
| 2026-09-28 | `fafce7e97fa8` | Keep Review data bound to the selected case | Run #193 success |
| 2026-09-28 | `5e1d00de11dc` | Add native FoamLens Windows icon | Run #194 success |

### GitHub Actions after the baseline snapshot

| Run | Ref | SHA | Result |
|---:|---|---|---|
| #190 | `development/v1.3.0-general-discovery` | `43b62231af6f` | success |
| #191 | `development/v1.3.0-general-discovery` | `4a3701bb400a` | success |
| #192 | `development/v1.3.0-general-discovery` | `128e68e022a4` | success |
| #193 | `development/v1.3.0-general-discovery` | `fafce7e97fa8` | success |
| #194 | `development/v1.3.0-general-discovery` | `5e1d00de11dc` | success |

## How to update this log

When a new change is made, record the actual commit SHA and CI result after the operation completes. When a prerelease bug is found, add it as an open QA item first; move it into the milestone/commit history only after the fix is committed and validated. Releases should record the exact tag, target and generated binary assets.


## 2026-09-28 — v1.3.1 release preparation

- Desktop semantic version bumped from `1.3.0` to `1.3.1` before merging PR #1.
- Reason: the `main` workflow publishes the GitHub Release from the desktop project version; keeping `1.3.0` would overwrite/reuse the existing `v1.3.0` release instead of creating a new patch release.
- Target release after CI + merge: `v1.3.1`.


## 2026-09-28 — FoamLens Desktop v1.3.1 released

- PR #1 (`Release FoamLens Desktop v1.3.1`) was marked ready and merged into `main`.
- Merge commit: `97060108c7cbed8d06310644195a7c2ee0989562`.
- Development head merged: `d5a94b527ae6eec76a8ce1cef9ca5b61dd0a2d57`.
- Final development validation: GitHub Actions run #195 — success.
- Main/release validation: GitHub Actions run #196 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Tag `v1.3.1` points to the merge commit above.
- Published GitHub Release: `FoamLens v1.3.1`.
- Release assets:
  - `FoamLens-Portable-v1.3.1.exe`
  - `FoamLens-Portable-v1.3.1.exe.sha256`
  - `FoamLens-Setup-v1.3.1.exe`
- Release published at 2026-09-28 20:04:27 UTC.

## 2026-09-29 — v1.3.2 release correction

- GitHub already published normal release `v1.3.1` from merge commit `97060108c7cbed8d06310644195a7c2ee0989562`; Actions run #196 passed.
- Post-release inspection found that the binary still carried internal `development / release candidate` wording even though the functional prerelease QA fixes were included.
- The existing `v1.3.1` artifacts are intentionally not being silently replaced from a different commit. A clean patch release is being prepared instead.
- Branch `release/v1.3.2` was created directly from `main` commit `3735424af6f6413b72fbfe7e101a97040448fa40`.
- v1.3.2 removes development/RC wording, reports frontend `v51` and Desktop `v1.3.2`, stores new workspace payloads as `productVersion: v51`, and updates README/version regressions accordingly.
- CI on release branches is enabled through the `release/**` workflow branch pattern. Actions run #198 completed successfully: real QuickCup regression, complete scientific/UI suites, portable EXE smoke, native icon checks, minimized background execution, installer build and installed-app smoke all passed.

| #198 | 2026-09-29 | `release/v1.3.2` | `ada3a9168610` | success | v1.3.2 release correction; full Windows + QuickCup validation passed. |


## 2026-09-29 — FoamLens Desktop v1.3.2 released

- Release branch: `release/v1.3.2`.
- Release preparation commit: `ada3a9168610ddec3bf56973e4dc1aef85568db8`.
- Release validation record commit: `f5e6ab835da5f2767df657b40d1f85a816b8e27b`.
- PR #2 (`Release FoamLens Desktop v1.3.2`) merged into `main`.
- Merge commit: `368655e5b4f9aaddb4f528d530318612f7cb6b19`.
- Release-branch validation: GitHub Actions run #198 — success.
- Main/release validation: GitHub Actions run #199 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Minimized/background execution smoke: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Published GitHub Release: `FoamLens v1.3.2`.
- Release type: normal release, not prerelease.
- Release assets:
  - `FoamLens-Portable-v1.3.2.exe`
  - `FoamLens-Portable-v1.3.2.exe.sha256`
  - `FoamLens-Setup-v1.3.2.exe`
- Release published at 2026-09-29 17:28:32 UTC.
- `v1.3.1` was left intact; its assets were not silently replaced.


## 2026-09-29 — v1.4.0 Field View development started

- Development branch: `development/v1.4.0-field-view`, created directly from released `main` v1.3.2 commit `2ab17037bcc6922f25ed2f28d9e2a493a33fa327`.
- Native Desktop bridge extended with read-only, cancellable ASCII OpenFOAM `polyMesh` parsing for `points`, `faces`, `owner`, and `neighbour`.
- Frontend extension loading generalized from `v13-*.js` to `v*-*.js`; the new viewer lives in isolated module `v14-field-view.js` rather than modifying the monolithic v51 frontend.
- Added the **Field View** data tab with WebGL mesh rendering, boundary-surface scalar coloring, mesh edges, camera orbit/zoom, color maps, locked color ranges and physical-time playback.
- Added vector-field visualization with magnitude/component selection, velocity glyphs and configurable streamlines derived from the actual instantaneous cell-centred OpenFOAM vector field.
- Streamlines use local inverse-distance vector interpolation with midpoint integration; this is an explicit FoamLens approximation and is not claimed to reproduce ParaView/VTK interpolation bit-for-bit.
- Added default-region and named-region `constant/polyMesh` discovery.
- Fixed multi-region eligibility so cases such as `metal` / `mold` are visualizable when a meshed named region has compatible volume fields.
- Decomposed processor fields are not silently mapped onto a reconstructed mesh; Field View requests reconstruction when topology/count alignment cannot be established.
- Initial fallback QA exposed and fixed an over-escaped ASCII `points` parser regex (`point-count-mismatch` on a valid cube).
- Initial WebGL QA exposed and fixed a renderer-factory naming typo before release.
- Dedicated regression: `desktop/tests/field-view.test.cjs` validates a synthetic OpenFOAM cube, region discovery, multi-region availability, physical-time navigation, colormaps, streamline integration, native bridge wiring, vector/streamline product wiring and generic versioned module loading.
- Real QuickCup regression remains green, but the QuickCup fixture repository does not version `polyMesh`; therefore mesh geometry itself is currently regression-tested with the synthetic OpenFOAM fixture. QuickCup's `controlDict` uses `writeFormat ascii`, matching the supported mesh format.
- Validation progression:
  - Run #200: failed only in the new Field View cube parser.
  - Run #201: failed on the same fallback parser after the separate renderer typo was fixed.
  - Run #202: success after fixing ASCII point parsing.
  - Runs #203 and #204: success with vector glyphs and their regression coverage.
  - Run #206: **success** after the multi-region fix and dedicated multi-region test; real QuickCup regression, all legacy suites, Field View suite, portable EXE smoke, installer build and installed-app smoke all passed.
- Final validated code SHA for run #206: `919131e08b4edaa65e458bcbf955b73f06c62847`.
- Documentation-only scope record added afterward in `docs/v1.4.0-field-view-spec.md`; no release was published and `main` remains v1.3.2.


### 2026-09-29 — v1.4.0 development packaging and final Field View validation

- Branch-only Desktop version advanced to `1.4.0` so development artifacts are not mislabeled as the stable v1.3.2 release.
- v1.4 uses an isolated local app-bundle root (`FoamLens/Desktop/1.4.0/app`); the public `main` release remains v1.3.2.
- The version overlay identifies this branch as `Desktop v1.4.0 development` while the retained v51 base remains release-clean.
- Added vector glyphs derived from the actual cell-centred vector field, alongside streamlines.
- Fixed Field View availability for named multi-regions such as `metal` / `mold`.
- Fixed colormap legend synchronization so Viridis, Turbo and cool–warm legends match the colors actually rendered on the mesh.
- Run #211 validated the complete v1.4.0 development build identity, full scientific/UI suites, real QuickCup regression, portable EXE smoke, installer and installed-app smoke.
- Runs #212/#213 validated the colormap legend correction.
- **Final validation: GitHub Actions run #213 — success.**
- Final tested head: `c3cd5651e99211a4af4168fb8ecac063bcbf0f41`.
- Run #213 artifact: `FoamLens-Windows-v1.4.0` (artifact id `11058631160`).
- No GitHub Release was published and `main` was not modified.


## 2026-09-29 — FoamLens Desktop v1.4.0 released

- Development branch: `development/v1.4.0-field-view`.
- PR #3 (`Release FoamLens Desktop v1.4.0`) merged into `main`.
- Merge commit: `361821e98ee77bb7bf39ec250a50d71f97566e52`.
- Main/release validation: GitHub Actions run #214 — **success**.
- Real QuickCup regression: success.
- 3D OpenFOAM Field View regression: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Published GitHub Release: `FoamLens v1.4.0`.
- Release type: normal release, not prerelease.
- Tag: `v1.4.0`.
- Release target: `main`.
- Release published at 2026-09-29 19:59:43 UTC.
- Release assets:
  - `FoamLens-Portable-v1.4.0.exe` — 72,864,903 bytes.
  - `FoamLens-Portable-v1.4.0.exe.sha256` — 96 bytes.
  - `FoamLens-Setup-v1.4.0.exe` — 67,776,500 bytes.
- v1.4.0 introduces the OpenFOAM Field View with transient mesh coloring, physical-time playback, vector glyphs, streamlines, multi-region support, and synchronized colormap legends.


## 2026-09-29 — v1.4.1 post-release hotfix + thesis-analysis expansion

Branch: `fix/v1.4.1-field-view-discovery` (created from released `main` v1.4.0).

### Field View hotfix
- Fixed versioned frontend extension injection so v14 modules are inserted inside the main FoamLens frontend IIFE rather than an unrelated inner/later IIFE.
- Field View remains discoverable even when no compatible 3D dataset is available and reports the missing requirement instead of disappearing.
- Added Overview quick access to 3D Field View.
- Added packaged-executable smoke validation for the actual mounted Field View UI.
- Final Field View smoke path validated in the portable and installed Desktop build.

### Sidebar UX
- Added persistent collapsible/expandable sidebar sections.
- Section state is stored locally and restored across sessions.
- Case-management-heavy content is compactable so it no longer dominates the working sidebar.

### Smart Import version grouping
- Detected case/version groups are exposed in Smart Import.
- Users can select/deselect a detected version group in one action while preserving per-case selection.

### Dual-variable Time-Series Focus
- Added optional second simultaneous variable for time-series comparison.
- Supports independent left/right Y axes for quantities with different units (for example temperature and liquid fraction).
- Existing single-variable workflow remains valid.

### Formal convergence audit
- Added explicit linear-solver and PIMPLE/nonlinear coupling evidence.
- Keeps same-solve initial→final residual convergence separate from cross-outer coupling convergence.
- Adds formal coupling-ratio metrics and regression coverage.

### Automatic momentum mechanism audit
- Detects mapped Darcy, buoyancy and pressure-gradient acceleration fields generically.
- Calculates per-cell magnitude statistics and local mechanism ratios.
- Reports median/P95/fraction > 1 and excluded near-zero denominators.
- Can create physical-time evolution curves without temporal extrapolation.
- Does not convert ratios into causal/mechanism verdicts.

### postProcessing provenance correction
- Multi-column OpenFOAM reductions now preserve per-column identity instead of assigning every column the field inferred from the filename.
- `sum(energyFlux)`, `sum(heatFlux)`, `volIntegrate(h)`, etc. preserve operation + field metadata.
- Parsed function-object metadata now includes `operation`, `weightField`, `patch`, `patches` and `cellZone`.

### Automatic Energy Audit
- Added automatic detection of OpenFOAM energy-flux decomposition.
- Checks the OpenFOAM v14 identity `energyFlux = energyAdvectiveFlux + heatFlux` over common physical times.
- Reports absolute and relative closure residuals plus integrated advective/diffusive/total/residual energies.
- Detects sensible-energy inventory only when provenance supports a rho-weighted volume integral of specific energy.
- Detects integrated latent-heat power when compatible volume-reduction provenance is present.
- Does not impose an unverified conservation sign convention across boundary/sensible/latent terms.
- Can create derived closure-residual and cumulative-boundary-energy curves.

### Validation
- Run #241: success after per-column postProcessing provenance regression.
- Runs #236–#239: success for automatic momentum mechanism audit and CI wiring.
- Runs #233–#235: success for formal convergence audit and CI wiring.
- Runs #230–#232: success for dual-variable Time-Series Focus and CI wiring.
- Runs #227–#229: success for Smart Import version grouping and CI wiring.
- Runs #224–#226: success for persistent collapsible sidebar sections and CI wiring.
- **Run #244: SUCCESS** at head `64a13fff1b018b986a0e0581b59c9692644d3e1b`.
  - Real QuickCup regression: success.
  - Automatic Energy Audit regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063691879`).
- No GitHub Release was published from the hotfix branch; `main` remains the released v1.4.0 until the branch is intentionally promoted.


## 2026-09-29 — Experimental validation workflow

### Evidence boundary from the thesis project
- The QuickCup project audit explicitly states that the repository **does not currently contain a numeric experimental Quick-Cup thermocouple time series** (CSV/XLSX/raw points).
- Therefore FoamLens does not report experimental RMSE/MAE or event errors from repository data and no synthetic values are treated as thesis results.
- The validation workflow is prepared for a future raw or digitized experimental curve.

### Simulation vs experiment module
- Added `v14-experimental-validation.js`.
- Imports experimental `.csv`, `.txt`, `.dat` and `.tsv` time-temperature tables.
- Supports comma, semicolon, tab and whitespace delimiters.
- Semicolon-delimited files with decimal commas are parsed without confusing decimal commas for separators.
- Time and temperature columns are auto-detected but remain explicitly selectable.
- Experimental temperature units can be declared as K or °C.
- Experimental time alignment uses an explicit user-defined time shift; no hidden automatic shift is applied.
- Comparison is restricted to the shared physical-time interval and never extrapolates.
- Reports:
  - RMSE of T(t);
  - MAE of T(t);
  - mean bias (simulation − experiment);
  - maximum absolute temperature difference;
  - Tmin and its time;
  - thermal-rebound candidate amplitude, peak time and maximum positive dT/dt.
- An optional liquid-fraction series provides independent phase evidence:
  - alphaL onset/completion threshold-crossing times;
  - phase-defined solidification duration;
  - liquid-fraction trend during the simulated thermal-rebound candidate.
- A positive dT/dt interval is **not** automatically labelled recalescence. Phase evidence is displayed separately as solidifying, remelting, approximately stationary or unavailable.
- Can add the aligned experimental temperature curve and ΔT(sim−exp) residual to the standard Time-Series plot.

### Regression and packaging
- Run #247 exposed an actual delimiter-detection bug: decimal commas in semicolon CSV files biased the first implementation toward comma separation.
- Fixed delimiter detection to prefer a consistent tabular column count across sampled rows.
- **Run #248: SUCCESS** at code head `5854f4dcc5cbcd3b32e600ef772aa3c773bc2dd2`.
  - Simulation-vs-experiment regression: success.
  - Real QuickCup regression: success.
  - All previous Field View/sidebar/import/convergence/momentum/energy regressions: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063823771`).
- No GitHub Release was published; this remains on the v1.4.1 hotfix/development branch.


## 2026-09-29 — Field View interior slice reconstruction

### Mesh topology
- Extended the native OpenFOAM ASCII `polyMesh` result with full volumetric connectivity:
  - flattened face-point indices;
  - face offsets;
  - owner labels;
  - neighbour labels.
- The browser fallback parser exposes the same connectivity, so native and web paths share the same slice algorithm.

### Interior Slice
- Added a real interior slice reconstruction to Field View rather than a near-plane cell-centre point filter.
- Reconstructs point values from adjacent cell-centred values using inverse-distance weighting.
- Decomposes each polyhedral cell into tetrahedra formed by the reconstructed cell centre and triangulated cell faces.
- Intersects those tetrahedra with an arbitrary X/Y/Z plane and interpolates the selected scalar/vector-component values at the intersection vertices.
- Controls added:
  - Show slice;
  - plane normal X/Y/Z;
  - normalized plane position;
  - slice opacity.
- Slice updates with the physical-time playback, selected field/component and current colormap/range.
- When a slice is active the boundary surface is rendered as translucent contextual geometry without depth-writing over the interior cut.
- The UI explicitly states that the cell-to-point reconstruction/tetrahedralization is not claimed to be bit-identical to ParaView/VTK.

### Validation
- Synthetic unit-cube regression checks a plane at `x=0.37`:
  - every slice vertex lies on the requested plane;
  - a uniform cell value remains uniform on the slice;
  - reconstructed cross-sectional area is 1.0.
- Native parser regression verifies full face/owner/neighbour connectivity is exported.
- Field View regression verifies slice controls and WebGL buffers remain wired.
- **Run #253: SUCCESS** at code head `ef6506953af2bd9484542ffa99e71ec87bcdb5a4`.
  - Field View/slice regression: success.
  - Real QuickCup regression: success (QuickCup repository still does not track a polyMesh fixture, so the actual thesis mesh is not represented by this fixture).
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063484823`).
- No GitHub Release was published from this branch.


## 2026-09-29 — Field View iso-surface / contour reconstruction

### Iso-surface
- Added a reconstructed 3D iso-surface / contour layer to Field View for the currently selected scalar or vector component.
- Uses the same volumetric reconstruction basis as interior slices:
  - cell-centred values;
  - inverse-distance cell-to-point reconstruction;
  - polyhedral cell tetrahedralization.
- Extracts the constant-value surface with marching tetrahedra.
- Removes duplicate reconstructed triangles by tolerance-based geometric keys and rejects degenerate triangles.
- User controls:
  - Show iso-surface;
  - explicit iso value (default `0.5`);
  - opacity;
  - use-current-midrange helper.
- For liquid fraction, `alphaL = 0.5` can be viewed directly as a mid-front contour; temperature can use an explicitly selected isotherm.
- Iso-surfaces update with:
  - physical-time playback;
  - selected field/component;
  - color map;
  - locked/unlocked display range.
- When an interior slice or iso-surface is active, the external boundary surface is rendered as translucent context rather than depth-occluding the interior geometry.
- FoamLens explicitly describes the reconstruction as marching tetrahedra on reconstructed cell-centred data and does not claim bit-identical ParaView/VTK output.

### Regression
- Dedicated test: `desktop/tests/isosurface.test.cjs`.
- Analytic tetrahedron regression verifies a linear scalar field produces the expected `phi = 0.5` plane and triangle area.
- Four-edge tetrahedron intersections are triangulated into finite non-degenerate triangles.
- Out-of-range iso values produce no geometry.
- Product wiring regression verifies controls, WebGL iso buffers and physical-time update hooks.

### Validation
- **GitHub Actions run #260: SUCCESS**.
- Validated head: `1b0acb91076a55bd7bca9dde2b450c83c5c51619`.
- Real QuickCup regression: success.
- Field View + iso-surface regression: success.
- All previous sidebar/import/dual-series/convergence/momentum/energy/experimental-validation suites: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11068679330`).
- No GitHub Release was published from the hotfix branch.


## 2026-09-29 — 3D Field View probe / picking

### Probe interaction
- Added a dedicated 3D probe mode to Field View.
- Clicking rendered geometry performs a true 3D ray cast against the triangles currently represented by FoamLens rather than selecting the nearest screen pixel.
- Supported pick targets:
  - boundary surface;
  - interior slice;
  - iso-surface.
- Boundary-surface picks resolve the exact owner cell and report that cell-centred field value.
- Slice picks use barycentric interpolation of the reconstructed slice vertex values.
- Iso-surface picks report the selected constant iso value.
- For reconstructed interior geometry, FoamLens also reports the nearest cell explicitly as an approximation; it is labelled as nearest rather than presented as an exact containing-cell lookup.
- Probe readout reports:
  - source geometry;
  - selected field;
  - value and inferred unit;
  - physical time;
  - X/Y/Z;
  - cell / nearest-cell identity when available.
- A 3-axis marker is rendered at the picked 3D location.
- Pointer-drag motion is separated from clicking so orbiting the camera does not accidentally create a probe.
- Probe state is cleared whenever the displayed physical-time frame/field changes so FoamLens never leaves a stale value from a previous timestep on screen.

### Numerical implementation
- Canvas coordinates are unprojected through the inverse current model-view-projection matrix.
- Ray / triangle intersection uses Möller–Trumbore geometry.
- Slice scalar values are interpolated with barycentric coordinates.
- When several triangles lie along the ray, the nearest positive intersection is selected.

### Regression
- Dedicated test: `desktop/tests/field-probe.test.cjs`.
- Validates:
  - 4×4 matrix inversion on identity;
  - a known ray/triangle intersection;
  - barycentric interpolation;
  - nearest-hit selection;
  - iso constant-value picking;
  - rejection of parallel/outside rays;
  - UI controls and WebGL marker-buffer wiring;
  - fixture-name neutrality.

### Validation
- **GitHub Actions run #264: SUCCESS**.
- Validated head: `4d481d8a4c33a4783e2b677d4937ced121990472`.
- Real QuickCup regression: success.
- 3D Field View, slice, iso-surface and probe regressions: success.
- All previous scientific/UI regressions: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11069760533`).
- No GitHub Release was published from the hotfix branch.


## 2026-09-30 — Field View iso-surfaces / contours

### 3D iso-surface reconstruction
- Added reconstructed constant-value surfaces to Field View through `v14-isosurface.js`.
- Uses marching tetrahedra over the same volumetric reconstruction used by Interior Slice:
  - cell-centred field values;
  - adjacent-cell inverse-distance point reconstruction;
  - cell-centre tetrahedralization;
  - edge interpolation at the requested iso value.
- Does not approximate an iso-surface by merely selecting nearby cell centres.
- Controls added:
  - Show iso-surface;
  - numeric iso value;
  - opacity;
  - Use current midrange.
- Typical thesis use:
  - liquid fraction `alphaL = 0.5` to inspect a mid solidification front;
  - an explicitly selected temperature to inspect an isotherm.
- Iso-surfaces update during physical-time playback and use the current field, component, colormap and locked/display range.
- Surface geometry becomes translucent when an interior slice or iso-surface is active so the interior visualization remains visible.
- Implementation remains explicit that reconstruction is not claimed to be bit-identical to ParaView/VTK.

### Regression
- Added a marching-tetrahedra linear-field regression:
  - tetrahedron vertices with scalar values `[0,1,1,1]`;
  - requested iso `0.5`;
  - reconstructed triangle lies exactly on `x+y+z=0.5`;
  - expected triangle area is `sqrt(3)/8`.
- Run #266 exposed a test-harness error only (`near` helper missing); the geometry implementation itself was not the failing assertion.
- Fixed the regression helper without changing the iso algorithm.
- **Run #267: SUCCESS** at head `3efeeb81617b42ba7bf7e8a47f4b9c0f3ead1f6c`.
  - Real QuickCup regression: success.
  - Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the development/hotfix branch.


## 2026-09-30 — Strict 3D difference field comparison

### Difference view
- Extended synchronized side-by-side 3D case comparison with an optional third viewport for a signed difference field.
- Difference definition is explicit: `Δ = Primary − Comparison`.
- Difference visualization uses a symmetric cool–warm range around zero.
- The same resolved physical-time synchronization used by side-by-side comparison is preserved.
- FoamLens refuses to calculate a 3D difference unless meshes are topologically and geometrically equivalent.
- Compatibility checks include:
  - point count;
  - face count;
  - cell count;
  - internal/boundary face count;
  - point coordinates within a geometry-scaled tolerance;
  - face offsets;
  - face-point connectivity;
  - owner labels;
  - neighbour labels.
- FoamLens does not subtract unrelated meshes merely because they happen to have the same number of cells.
- If compatibility fails, the UI reports the mismatch reason rather than displaying a false difference.

### Regression
- Added `desktop/tests/field-compare.test.cjs`.
- Regression checks:
  - identical meshes accepted;
  - moved geometry rejected;
  - changed connectivity rejected;
  - signed difference follows Primary − Comparison;
  - absolute-difference helper remains numerically correct;
  - color range remains symmetric around zero;
  - third viewport and compatibility wiring remain present.
- Added dedicated CI step: `Test strict 3D difference field comparison`.
- **Run #270: SUCCESS** at head `efd8ca7669d819f689f0ca96b00950911a94ce61`.
  - Real QuickCup regression: success.
  - 3D Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Strict 3D difference regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Volume-weighted polyhedral cell centroids

### Geometry precision
- Replaced the previous mean-of-face-centres cell location approximation in both the native Desktop polyMesh parser and the JavaScript fallback.
- Cell centres are now calculated as volume-weighted polyhedral centroids using signed tetrahedral integration.
- OpenFOAM face orientation is respected:
  - stored internal-face orientation is outward for the owner cell and reversed for the neighbour cell;
  - boundary faces retain their stored outward orientation.
- A local mean-face-centre reference is used only for numerical stability; it does not define the final centroid.
- Degenerate cells fall back explicitly to the previous mean-face-centre reference rather than returning invalid coordinates.
- `CellCenterMethod` now reports:
  - `volume-weighted-polyhedral`; or
  - `volume-weighted-polyhedral-with-mean-face-fallback:N` when a fallback was required.
- This improves the geometric basis used by vector glyph placement, streamline interpolation, interior slices, iso-surfaces and 3D picking.

### Regression
- Added an asymmetric square-pyramid regression whose exact centroid is `(0, 0, 0.75)`.
- The former mean-face-centres method would place the same cell at `z = 0.8`, so the test distinguishes the new method from the old approximation.
- Unit-cube mesh parsing and all existing Field View regressions remain green.
- **Run #273: SUCCESS** at head `ba28cdb7af0669dcfe97bda5ef03683676b1ab78`.
  - Real QuickCup regression: success.
  - 3D Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Strict 3D difference regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Native binary OpenFOAM polyMesh support

### Binary mesh parser
- Extended the Desktop-native `parseOpenFOAMMesh` path from ASCII-only text reads to byte-oriented mesh parsing.
- ASCII and binary now converge into one common topology/geometry builder so validation, volume-weighted centroids, boundary triangulation and edge extraction cannot diverge by file format.
- Supported native binary layouts:
  - contiguous point/vector lists;
  - contiguous `owner` / `neighbour` label lists;
  - OpenFOAM `faceCompactList` binary faces represented by offsets + flattened labels.
- Reads optional OpenFOAM `arch` metadata for:
  - LSB / MSB endianness;
  - 32/64-bit labels;
  - 32/64-bit scalars.
- A 64-bit label that cannot fit FoamLens' current in-memory integer indexing is rejected explicitly instead of truncating.
- For binary headers without `arch`, FoamLens uses the common LSB / label32 / scalar64 ABI and reports the format as `binary-lsb-label32-scalar64-assumed` rather than hiding the assumption.
- Unsupported/unknown binary face layouts are rejected with an explicit reason.
- Browser/JavaScript fallback intentionally remains ASCII-only; binary support is a Desktop-native capability.

### Native smoke regression
- Added an in-process binary polyMesh self-test executed on every Desktop smoke run.
- The fixture is a real byte-level one-cell cube using:
  - `format binary`;
  - `arch "LSB;label=32;scalar=64"`;
  - `vectorField` points;
  - `faceCompactList` faces;
  - binary `labelList` owner/neighbour.
- The production parser must recover 8 points, 6 faces, 1 cell and centroid `(0.5, 0.5, 0.5)`.
- Because the self-test runs inside `--smoke-test`, it validates both the portable EXE and the installed EXE.
- **Run #277: SUCCESS** at head `83e1146baba23eb3bdf4a29d0f57e9a9d58c435b`.
  - Real QuickCup regression: success.
  - Full Field View suite: success.
  - Native binary mesh self-test in portable EXE: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Native binary mesh self-test in installed EXE: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Time-varying / dynamic OpenFOAM mesh playback

### Dynamic mesh discovery
- Extended Field View mesh discovery beyond `constant/[region/]polyMesh` to recognize `<time>/[region/]polyMesh` snapshots.
- Supports the common moving-mesh case where a timestep writes only `points` while `faces`, `owner` and `neighbour` remain inherited from the previous valid topology.
- Supports topology-changing snapshots when a later physical time writes replacement topology components.
- Mesh state resolution is causal in physical time: FoamLens selects the most recent valid mesh state with `t_mesh <= t_field`; it never borrows a future mesh state.
- If no complete `constant/polyMesh` exists, FoamLens requires a complete same-time dynamic snapshot before inheritance begins. Partial files from unrelated earlier times are not combined to fabricate a mesh basis.
- Legacy v1.4.0 static mesh inventories remain compatible and are interpreted as static constant meshes.

### Playback and geometry synchronization
- Field playback now resolves mesh geometry before loading each transient field frame.
- When the resolved mesh snapshot changes, FoamLens rebuilds:
  - boundary surface geometry;
  - mesh edges;
  - volume-weighted cell centroids;
  - spatial hash used by vector interpolation;
  - slice / iso-surface geometry state;
  - 3D probe state;
  - streamline/vector geometry on the refreshed mesh.
- User camera orientation/zoom is preserved across dynamic-mesh playback rather than reset on every geometry change.
- The time readout/status explicitly reports the active mesh state (`constant` or mesh physical time).
- Native ASCII/binary polyMesh parsing is reused for dynamic snapshots; browser fallback remains ASCII-only as documented.

### Regression
- Added `desktop/tests/dynamic-mesh.test.cjs`.
- Coverage verifies:
  - constant and time-directory polyMesh discovery;
  - points-only moving meshes inheriting constant topology;
  - topology replacement at the correct physical time;
  - strict rejection of future mesh geometry;
  - complete-basis requirement when constant mesh is absent;
  - 3D readiness only when at least one field time has a valid mesh state;
  - playback wiring preserves camera while geometry changes.
- Run #284 exposed a backward-compatibility regression in the existing synthetic/static mesh inventory test.
- Fixed legacy `complete:true` inventories to resolve as static constant meshes.

### Validation
- **GitHub Actions run #285: SUCCESS** at head `64257bb97da6faef29345ac6da548b5899d1725b`.
- Real QuickCup regression: success.
- Existing Field View regression: success.
- Dynamic mesh regression: success.
- Iso-surface / 3D probe / strict 3D difference regressions: success.
- Sidebar/import/dual-series/convergence/momentum/energy/experimental-validation regressions: success.
- Portable EXE build and smoke: success.
- Installer build and installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11075183630`).
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — v1.4.1 candidate final reconciliation

### Requested UX/features closed
- Smart Import groups detected cases by version and supports group select/deselect while preserving per-case control.
- Large case-management block is moved to the end of the sidebar at runtime and is collapsed by default.
- Sidebar sections are individually collapsible/expandable with persistent state.
- Time-Series Focus supports an optional second simultaneous variable with independent left/right Y axes.
- Field View is always discoverable, has an Overview quick action and reports missing 3D prerequisites instead of disappearing.

### Thesis/scientific-analysis gaps closed
- Formal linear-solver vs PIMPLE/nonlinear convergence audit.
- Automatic momentum-mechanism audit.
- Automatic OpenFOAM energy audit with provenance and closure checks.
- Simulation-vs-experiment validation with RMSE/MAE/bias and independent phase evidence.
- Dual temperature/liquid-fraction plotting for coupled solidification inspection.
- 3D slices, iso-surfaces, probe picking, synchronized case comparison and strict signed difference fields.
- Volume-weighted polyhedral cell centroids.
- Native ASCII/binary polyMesh support.
- Time-varying/dynamic mesh playback synchronized causally in physical time.

### Remaining explicit non-blocking boundaries
- 3D Field View renders cell-, internal-face-, and point-associated scalar/vector fields with explicit association semantics. `surface*Field` boundary-patch values remain unrendered until explicit `polyMesh/boundary` patch topology and per-patch values are preserved; FoamLens does not fabricate them.
- Browser fallback remains ASCII-only for polyMesh; native Desktop supports binary.
- FoamLens streamline and reconstructed slice/iso algorithms are documented approximations and are not claimed bit-identical to ParaView/VTK.
- The QuickCup repository does not version its actual polyMesh, so real thesis-mesh rendering cannot be CI-regressed from that repository; real QuickCup fields/postProcessing are still regression-tested.

### Documentation reconciliation
- Updated Field View specification from the obsolete first-v1.4 slice to the actual v1.4.1 candidate capability set.
- Desktop README now distinguishes the public v1.4.0 release from the v1.4.1 candidate.
- Root README corrected from stale Desktop v1.3.2 to public v1.4.0 and documents the validated v1.4.1 candidate features.

### Final candidate validation
- **GitHub Actions run #288: SUCCESS** at tested code head `7e478c3df54d1f97bbf41846374d6c94adccffcb`.
- Real QuickCup regression: success.
- All scientific/UI regressions: success.
- Dynamic mesh regression: success.
- Field View / slice / iso / probe / strict 3D difference regressions: success.
- Version/release-label consistency regression: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11075137890`).
- Root README was updated afterward as documentation only; no product code changed after the tested head.
- v1.4.1 has **not** been published as a GitHub Release yet.


## 2026-09-30 — Field View point / internal-face field associations

### Association-aware 3D rendering
- Extended Field View beyond cell-centred `vol*Field` data without converting other associations into fake cell values.
- The field selector now exposes the association explicitly:
  - **Cell** for `vol*Field`;
  - **Face (internalField)** for `surface*Field`;
  - **Point** for `point*Field`.
- `point*Field` values are rendered directly on the actual mesh vertices used by each boundary triangle.
- `surface*Field internalField` values are rendered on the actual internal mesh faces. Internal polygonal faces are triangulated for WebGL while retaining the exact source face identity.
- At run #297, the external boundary still remained neutral/translucent because explicit `boundaryField` patch values were not yet mapped. This limitation was subsequently closed and validated in run #310 (see the later surfaceField boundary-patch section); FoamLens never substituted owner-cell values or fabricated boundary-face data.
- Association-specific size checks are enforced against:
  - cell count for volume fields;
  - internal-face count for surface fields;
  - point count for point fields.
- A mismatch produces an explicit field/mesh association-count error.

### Interior analysis and vectors
- Interior Slice and Iso-surface remain explicitly cell-centred-volume operations.
- Selecting a Face or Point field disables/clears those controls rather than silently coercing the data to cells.
- Iso-surface code contains its own independent volume-association guard so programmatic calls cannot bypass the UI restriction.
- Vector glyphs and streamlines remain based on a `volVectorField`; Face/Point vector fields are available for direct coloring/components but are not silently used as cell-centred streamline input.

### Association-aware 3D Probe
- Volume-field boundary picks retain exact owner-cell semantics.
- Point-field boundary picks interpolate the actual point values barycentrically on the hit triangle.
- Surface-field picks ray-cast against the rendered internal-face triangles and return the exact internal face id/value.
- Probe readout reports the field association and the appropriate element identity instead of always presenting every hit as a cell.

### Regression and validation
- Extended the existing Field View and 3D Probe regression suites rather than creating redundant parallel test harnesses.
- Added checks for:
  - direct point-vertex coloring;
  - internal-face triangulation and preserved face identity;
  - Cell / Face / Point selector wiring;
  - association-specific element counts;
  - exact internal-face probe ids;
  - explicit prevention of Face/Point → Cell coercion.
- Run #294 exposed only an overly strict test tolerance on `Float32Array` values (`0.10000000149` vs `0.1`); production rendering was not the failing logic.
- Run #296 exposed only a stale test token from an intermediate helper signature; the final architecture intentionally preserves `fvFieldGroups(..., storage='volume')` as the default contract and requests `'any'` only where the main Field View selector needs all associations.
- **GitHub Actions run #297: SUCCESS** at head `3eb42874d6d3e45c8101024c038e69db0f0bf617`.
  - Real QuickCup regression: success.
  - Field View association regression: success.
  - Dynamic mesh regression: success.
  - Iso-surface regression: success.
  - Association-aware 3D Probe regression: success.
  - Strict 3D difference regression: success.
  - All existing scientific/UI suites: success.
  - Portable EXE build + smoke: success.
  - Installer build + installed-app smoke: success.
  - Windows artifact upload: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077332065`, 135,204,904 bytes).
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Explicit surfaceField boundary-patch rendering

### Boundary topology and values
- Added native and fallback parsing of `polyMesh/boundary` patch topology.
- Mesh results now preserve patch name/type plus exact `startFace` / `nFaces` ranges and boundary-triangle face identities.
- Native ASCII OpenFOAM field parsing now preserves explicit `boundaryField` patch values after parsing `internalField`.
- Supported explicit patch payloads:
  - uniform scalar/vector values;
  - nonuniform scalar/vector lists with strict count validation.
- Patches without an explicit numeric `value` remain unavailable; FoamLens does not substitute owner-cell values or invent patch data.

### Field View
- `surface*Field` now renders:
  - real `internalField` values on internal faces; and
  - explicit patch values on the exact boundary faces defined by `polyMesh/boundary`.
- Missing/symbolic patch values remain neutral context.
- Display range includes explicit boundary values when present.
- Field association readout reports boundary coverage as explicit faces / total boundary faces.
- 3D Probe can resolve an explicitly rendered boundary face and preserve its global face identity / patch association.
- Native Desktop payloads are preferred; ASCII text parsing remains available as fallback.

### Validation
- Dedicated regression: `desktop/tests/surface-boundary.test.cjs`.
- Tests cover exact patch ranges, uniform/nonuniform scalar/vector values, magnitude/components, strict list-count rejection, symbolic/missing values, native payload preservation, fallback parsing and probe/render wiring.
- **GitHub Actions run #310: SUCCESS** at head `ecb5f124ad42071752b1e0bf767193cb89297248`.
- Real QuickCup regression: success.
- All Field View / dynamic mesh / slice / iso / probe / difference / association regressions: success.
- All scientific/UI regressions: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077418978`, 135,226,247 bytes).
- No GitHub Release was published from the candidate branch.


## 2026-09-30 — pointField interior Slice / Iso reconstruction

### Association semantics
- Interior Slice and Iso-surface now support both:
  - cell-centred `vol*Field` data; and
  - point-associated `point*Field` data.
- Point-associated reconstruction preserves the actual OpenFOAM point values at mesh vertices.
- Each cell receives only an auxiliary centre value needed for the existing cell-centre tetrahedralization:
  - primary method: 3D affine least-squares reconstruction from the cell's real point values;
  - fallback: inverse-distance weighting only when the local point geometry is rank-deficient / cannot support the affine solve.
- Face-associated `surface*Field` data remains excluded from Interior Slice / Iso; FoamLens does not silently reconstruct face data into a volumetric field.

### Analytic regression
- Added `desktop/tests/point-interior.test.cjs`.
- Synthetic tetrahedron with exact linear point field `phi = x` verifies:
  - reconstructed cell-centre value = 0.25;
  - Slice at `x = 0.5` lies exactly on that plane and interpolates `phi = 0.5`;
  - Slice cross-sectional area = 0.125;
  - Iso-surface `phi = 0.5` reconstructs the same cross-section with area = 0.125.
- Updated the older Field View association contract so Point is explicitly supported for interior reconstruction while Face remains distinct.

### Validation
- **GitHub Actions run #315: SUCCESS** at head `8326ccf3c45d4c0762e6ff9eaaec5b62e7ce9302`.
- Point-interior regression: success.
- Field View / dynamic mesh / slice / iso / probe / explicit boundary / strict 3D difference regressions: success.
- Real QuickCup regression: success.
- All scientific/UI regressions: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077801222`, 135,228,265 bytes).
- No GitHub Release was published from the candidate branch.


## 2026-09-30 — Decomposed surfaceField rendering

- Extended decomposed Field View to surface*Field internal faces and explicit physical boundary patches.
- Internal values are aligned by explicit processor internal-face ranges; missing/extra partitions and count mismatches remain rejected.
- Processor-local physical boundary faces are translated to exact global composite face ids.
- Artificial processor interface patches remain topology-only and are excluded from physical rendering/coverage.
- Run #330 reached the new product checks but failed on a test-only source-file assertion.
- The assertion was corrected without changing product logic.
- **Run #331: SUCCESS** at head `0c86da6b5a7ef0ff125c0d14bcd13aabf720fb09`.
- Real QuickCup regression, decomposed Field View, surface-boundary, dynamic mesh, Slice, Iso, 3D Probe, strict 3D difference, all scientific/UI suites, portable smoke, installer and installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (id `11079714552`, 135239220 bytes).
- No GitHub Release was published from this branch.


## 2026-09-30 — v1.4.1 candidate freeze after decomposed Field View completion

### Requested workflow/UX closure
- Smart Import groups detected cases by version and supports group select/deselect while preserving individual case selection.
- The large case-management card is moved to the end of the sidebar at runtime and defaults collapsed.
- Sidebar cards are individually collapsible/expandable with persistent state.
- Time-Series Focus supports two simultaneous variables with independent left/right Y axes.
- Field View remains discoverable even when 3D prerequisites are missing and is directly accessible from Overview.

### Thesis/post-processing closure
- Formal linear-solver vs PIMPLE/nonlinear convergence audit.
- Automatic momentum-mechanism audit.
- Automatic OpenFOAM energy audit with source provenance and closure checks.
- Simulation-vs-experiment validation with RMSE/MAE/bias and separate phase evidence.
- Association-aware Cell / Face / Point Field View.
- Interior Slice and Iso reconstruction for volume and point fields.
- Vector glyphs, streamlines, 3D probe/picking, synchronized comparison and strict signed difference fields.
- ASCII + native binary polyMesh.
- Dynamic/time-varying mesh playback.
- Processor-decomposed volume, point and surface fields with explicit matching processor mesh states.
- Physical surfaceField boundary patches are mapped to composite global faces; artificial processor-interface patches are excluded from physical rendering and coverage.

### Final product-code validation
- Latest product-code validation: **GitHub Actions run #331 — SUCCESS**.
- Tested product-code head: `0c86da6b5a7ef0ff125c0d14bcd13aabf720fb09`.
- Run #331 artifact: `FoamLens-Windows-v1.4.1`.
- Artifact id: `11079714552`.
- Artifact size: 135,239,220 bytes.
- Real QuickCup regression: success.
- Decomposed Field View + surface-boundary regression: success.
- Dynamic mesh / Slice / Iso / 3D Probe / strict 3D difference regressions: success.
- All scientific/UI regressions: success.
- Portable EXE smoke: success.
- Installer build + installed-app smoke: success.

### Candidate state
- Commits after the tested product-code head through the current documentation reconciliation are documentation-only.
- No v1.4.1 GitHub Release has been published from this candidate branch.
- Remaining boundaries are explicit/non-blocking rather than missing requested features:
  - browser fallback polyMesh remains ASCII-only while Desktop native supports binary;
  - streamlines and reconstructed Slice/Iso algorithms are documented FoamLens approximations and are not claimed bit-identical to ParaView/VTK;
  - face-associated surfaceField data is not silently converted into a volumetric field for Slice/Iso;
  - the QuickCup repository still does not version its actual thesis polyMesh, so the exact thesis mesh cannot be CI-regressed from that repository.


## 2026-09-30 — Real B13 Solver Logs ingestion defect isolated and fixed

### Real-case evidence
- Full reference case branch: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- B13 contains 89 log-like files, including `log.foamMultiRun` and native `foamLog` members such as `logs/p_rgh_0`, `logs/h_0`, and `logs/CourantMax_0`.
- Real `foamLog` time tokens are written with a unit suffix, for example `0.001s` and `0.002s`.

### Root cause
- The JavaScript parser already accepted a leading numeric prefix from tokens such as `0.001s`.
- The Windows native batch parser used `double.TryParse(...)` on the complete token, so `0.001s` was rejected.
- Native parsing therefore returned empty time/value arrays; `solverLogSeriesFromParsed` correctly refused to create zero-length series, leaving the Solver Logs UI at 0 despite the files being present.

### Structural fix
- Branch: `fix/v1.4.2-real-case-ingestion`.
- Commit: `46de7e60b27c410e6c49b9f411fdce5e95b1d049`.
- Native `ParseFoamLogAsync` now uses the same leading-number grammar as the browser parser.
- Added a native executable smoke regression that parses a temporary real-format sample:
  - `0.001s\t0.0062232`
  - `0.002s\t0.0207126`
- The regression validates both parsed time and value arrays and fails the Windows smoke test if suffix handling regresses.

### Validation
- GitHub Actions run #333: **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- GitHub Release publication: **SKIPPED** on the fix branch; no release was duplicated.


## 2026-09-30 — Complete B13 real-case ingestion and UX closure

### Real B13 3D Field View
- Full fixture: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- B13 exposes a default/root `constant/polyMesh` plus complete named-region meshes for `metal` and `mold`.
- Its transient scalar/vector fields are associated with named regions, especially `metal` and `mold`.
- Root cause of `3D data unavailable`: Field View previously populated the region selector from every complete mesh and selected the first one. The empty/default mesh region sorted before `metal`/`mold`, so Field View selected a mesh-only region even though the case was globally 3D-capable.
- Structural fix: `fvReadyRegions(caseObj)` is now the shared source of truth for 3D-ready regions. Region selection prefers regions with a complete mesh and compatible scalar/vector field association at a valid mesh time.
- B13 therefore exposes `metal` and `mold` as ready regions instead of opening on the mesh-only default region.
- Product commit: `7062d783a1908bf6c5d274df7d1a1ebc93a033c7`.
- Regression commit: `d815ca59288522e7b3e283103f8908fc6fb082ad`.

### Complete B13 regression fixture
- CI QuickCup fixture checkout now uses branch `foamlens-real-fixture-b13` instead of the older repository `main` fixture state.
- The real integration test explicitly validates complete `metal`/`mold` meshes, `metal/T`, `metal/U`, `mold/T`, and Field View readiness.
- CI fixture commit: `68714a15646346592288507ec122b75d194fa0fe`.
- Real B13 regression passed in runs #335 and #343.

### Time-Series Focus variable-selection regression
- Root cause: the dual-variable extension inserted an empty `All variables` option into Variable 1 and reused the original autoinit/empty-state semantics. Refresh/reset/show-all actions could therefore leave the primary selector empty and disable Variable 2.
- Structural fix:
  - Variable 1 now contains only real detected variables.
  - `tsdPrimaryChoice` preserves an available selection or selects the first real variable.
  - Variable 2 remains optional and excludes the selected primary variable.
  - `Show all variables` is now an explicit button mode rather than an empty primary selection.
  - The button visibly reports the show-all state, and selecting a real primary/secondary variable exits that mode.
- Product commits:
  - `c506df4d45dc25f3f5425f5fd4c3ddf7b004f5f3`
  - `a5e6e3c13146a2aebb6182d65d84ba3dea81f862`
- Regression commits:
  - `b8a66722858f3ff90e8cbeea45e424fe61262a74`
  - `a404e45f4cc427ea7c125cab20dedad16a8082e7`

### Global sidebar toggle / scrollbar collision
- Root cause: the expanded-state toggle was centered directly on the sidebar boundary with `left: calc(var(--sidebar-w) - 17px)`, overlapping the scroll/resize rail.
- Structural fix:
  - Expanded toggle moved into the sidebar header area with a fixed gap from the right boundary.
  - Brand area reserves space for the control.
  - Collapsed-state fixed reopen control remains reachable at the left edge.
- Product commit: `13b02bb1ad7d467bece21e4b8b1204af13a7a8d0`.
- Regression commit: `d4595d92da7f835e9e1369eef95faa06ead21d31`.

### Final validation
- GitHub Actions run #343: **SUCCESS**.
- Complete B13 real OpenFOAM integration regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- Collapsible/global sidebar regression: **SUCCESS**.
- Dual-variable Time-Series Focus regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**. No release was created or replaced.


## 2026-09-30 — FoamLens Desktop v1.4.2 development build validated

### Version identity
- Current published Desktop release remains **v1.4.1**.
- Fix branch build identity advanced to **v1.4.2** without creating a release.
- Desktop project, assembly/file versions, isolated runtime bundle path, Field View visible build identity, root README, Desktop README and version-consistency regression were aligned.
- Version bump commit: `d10fa4485c1215d266c88e4f3c54e5209896fb73`.
- Desktop README alignment: `2043bf78164db3fe60d00d932b0629b4253bd3f1`.
- Version-test alignment: `3be75c9dc02760e1de77c9706491502425011626`.

### Final validation
- GitHub Actions run #346: **SUCCESS**.
- Complete B13 real OpenFOAM integration regression: **SUCCESS**.
- Native Solver Logs suffix parsing regression: **SUCCESS**.
- 3D Field View + ready-region selection regression: **SUCCESS**.
- Dual-variable Time-Series Focus regression: **SUCCESS**.
- Sidebar/scrollbar regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.2`.
- Artifact id: `11084015589`.
- GitHub Release publication: **SKIPPED**. No v1.4.2 release or tag was created.


## 2026-09-30 — Global actionable diagnostics + full test-suite audit (v1.4.2 development)

### User-facing diagnostic contract
- FoamLens now treats error/incompatibility reporting as an application-wide contract rather than a per-panel convenience.
- Interactive failures are routed through the shared `flIssueDescriptor / flSetIssue / flClearIssue` system where applicable.
- Actionable diagnostics expose:
  - **Problem** — what operation/input is invalid or unavailable.
  - **Cause** — the detected technical reason/evidence.
  - **Try / Qué cambiar** — the next concrete corrective action.
  - Context when known: analysis/view, field, region, physical time, component, source path and expected input.
- `flSetIssue` also exposes structured metadata on the rendered status element:
  - `data-issue-code`
  - `data-issue-problem`
  - `data-issue-cause`
  - `data-issue-action`
  - corrective action in the element title.
- The diagnostic regression now executes `flSetIssue` / `flClearIssue` against a DOM-like element instead of only checking source strings.

### Analysis/capability visibility
- Flow Analysis, Thermal Analysis, Solidification / Remelting and Physical Analysis no longer disappear merely because their required source data are missing.
- They remain visible and report `analysis-source-missing` with the required input.
- Existing global capability tools (Temporal Alignment, Numerical Performance, Generic Vector Fields) remain visible and diagnostic when unavailable.
- This prevents “missing capability” from being mistaken for “feature does not exist”.

### Silent user actions removed
Previously silent/no-op paths were replaced with actionable diagnostics for:
- Difference Plot selection / missing comparable pair / missing temporal or spatial overlap.
- Smart Import with no selected cases.
- Watch Run read/monitor failures.
- Solver-log playback with insufficient times or sub-iterations.
- Phase Front calculation/export without compatible profiles/results.
- PNG, SVG and CSV export with no visible compatible data.
- Missing Flow/Thermal/Solidification analysis result before export.
- Coupling Audit without case/residual evidence or without enough samples.
- Generic Vector Magnitude refresh failures.
- Iso-surface invalid association, invalid numeric iso value and out-of-range iso value.

### Real B13 Phase/Momentum regression
- Reference fixture: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- Real file `B13_prghPressure_airGapOF14/0/metal/alphat` is an ASCII `volScalarField` with `internalField uniform 0;`.
- The real-case regression now verifies:
  - B13 `alphat` remains in the volume-field inventory.
  - Its source-file reference is preserved.
  - The parser accepts it as a supported uniform scalar.
  - `Scalar value` resolves to a finite zero value instead of “No compatible values”.
  - statistics remain finite and report min/max/mean/std = 0.
- Uniform fields with no expanded mesh-cell count no longer pretend that the single stored uniform value means “one physical cell”; the UI explicitly reports that the mesh cell count was not expanded.

### Native field-routing finding
- Desktop now routes every native-backed OpenFOAM field through the native field parser first, regardless of file size; small fields are no longer excluded by the former >4 MB routing threshold.
- Browser/JS fallback remains available when native parsing itself fails.

### Binary field limitation corrected
- **Binary OpenFOAM field payloads remain explicitly unsupported by the field-analysis parser at this stage.**
- Binary `polyMesh` support does not imply binary field-value support.
- An earlier diagnostic incorrectly suggested that using the Desktop/native reader would solve `binary-format`; this was corrected.
- The actionable remedy now accurately tells the user to use/produce an ASCII field for that field/time (and reload it) until binary field-value decoding is implemented.
- Regression prevents reintroducing the false “native routing failed” instruction.

### Iso-surface / pointField diagnostic reconciliation
- Face-associated surface fields remain intentionally excluded from volumetric iso-surface reconstruction.
- Iso-surface now reports `iso-surface-association-incompatible` and directs the user to a volume/cell or point scalar field.
- Invalid and out-of-range iso values receive dedicated corrective guidance.
- pointField interior Slice/Iso reconstruction remains covered numerically.
- Two regressions still expected the old explanatory sentence after the product moved to structured diagnostics; both tests were updated to assert the stronger actionable contract instead of restoring obsolete wording.

### Coupling Audit / Vector Fields
- Coupling Audit now explains when no case/root residual evidence exists and when the loaded evidence is insufficient.
- Generic Vector Fields exposes missing X/Y/Z groups, invalid selection/alignment and post-creation refresh failures to the user instead of relying only on console warnings.

### Test-suite audit findings
- Current suite: **50 `desktop/tests/*.test.cjs` files**.
- A new suite-manifest regression enumerates every test file and every workflow test command and requires:
  - every test file to execute exactly once,
  - no test file to be omitted,
  - no duplicate workflow execution,
  - no workflow reference to a nonexistent test.
- This closes the previously observed duplicated Flow Analysis execution and guards against future hidden/unexecuted test files.
- Audit found that several older UI/wiring tests relied heavily on `source.includes(...)`. Those checks remain useful for structural contracts, but critical runtime behavior is now additionally covered by:
  - real B13 integration,
  - executed parser/analysis functions,
  - executed global diagnostic rendering,
  - native portable smoke,
  - installed-app smoke.
- Intermediate CI failures during this audit exposed stale test expectations rather than product regressions; the stale expectations were reconciled only after verifying the newer behavior.

### Final validation
- Tested product head: `4046e498627b5e6d14cc4160f056ee35d6fa7515`.
- GitHub Actions run **#385 — SUCCESS**.
- Complete B13 real OpenFOAM regression: **SUCCESS**.
- Real B13 `alphat` Phase/Momentum parsing/statistics regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- pointField interior Slice/Iso regression: **SUCCESS**.
- Global actionable diagnostics regression: **SUCCESS**.
- CI suite manifest (50 tests, exactly once each): **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build + installed-app smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**. No release/tag was created or replaced.


## 2026-09-30 — FoamLens Desktop v1.4.2 published

### Publication
- GitHub Release: **FoamLens v1.4.2**.
- Tag: `v1.4.2`.
- Type: **normal release** (not draft, not prerelease).
- Published: **2026-09-30 09:25:48 UTC**.
- Release/tag commit: `7d4a14c1b4238d0c87dd4276219357d9bff6ebdc`.
- The release commit's parent is the fully tested product head `4046e498627b5e6d14cc4160f056ee35d6fa7515`; the child commit is documentation-only.

### Published Windows assets
- `FoamLens-Portable-v1.4.2.exe` — 72,975,495 bytes.
- `FoamLens-Portable-v1.4.2.exe.sha256` — 96 bytes.
- `FoamLens-Setup-v1.4.2.exe` — 67,864,788 bytes.

### Release validation basis
- GitHub Actions run **#385 — SUCCESS** on the tested product head.
- Complete real B13 OpenFOAM regression: **SUCCESS**.
- Real B13 `alphat` Phase/Momentum parsing/statistics: **SUCCESS**.
- Global actionable diagnostics contract: **SUCCESS**.
- 50-test CI manifest, each test exactly once: **SUCCESS**.
- 3D Field View, pointField Slice/Iso, Solver Logs, portable EXE smoke, installer build and installed-app smoke: **SUCCESS**.

### Post-publication rule
- The `v1.4.2` tag is immutable for this release and is not moved by later documentation-only commits.
- Future product changes must advance to a new version rather than replacing the published v1.4.2 binary assets.


## 2026-09-30 — FoamLens Desktop v1.4.3 Field View / performance development candidate

### User-observed defects and requirements
- Real v1.4.2 Field View testing exposed several usability and visualization issues:
  - thin rectangular/vertical/horizontal lines could cross the application UI;
  - 3D navigation lacked explicit orbit/pan/zoom and standard-view controls;
  - no interactive XYZ orientation gizmo was available;
  - the temperature legend could display visually indistinguishable values such as `1500 / 1500 / 1500` even when the underlying range was nonzero;
  - changing physical time could make visual controls feel blocked while a native field was being parsed;
  - temporal navigation needed cache/prefetch rather than repeated cold reads;
  - synchronized 3D analysis needed independent case/region/field/component selections and more than two simultaneous views;
  - the synchronized 3D layout needed video export.

### Cross-application canvas overlay root cause
- The base frontend applied `canvas{position:absolute;inset:0;width:100%;height:100%}` globally.
- Any analysis or 3D canvas that did not explicitly override that rule could therefore be positioned against the wrong containing block and visually cross unrelated UI, including the sidebar.
- The misleading `Physical time [s]` text seen in the overlay came from a 2D plot canvas, not from a Field View control.
- Structural fix: absolute full-area positioning is now scoped only to the primary 2D chart canvas:
  - `.chartwrap > canvas#canvas{position:absolute;inset:0;width:100%;height:100%}`
- Product commit: `e42ddcf112be2409a4ea75a6ab3a152a7be939b6`.

### Non-blocking native OpenFOAM field parsing
- Async file reads alone did not keep Field View responsive because CPU-heavy parsing resumed on the WinForms/WebView UI synchronization context.
- `HandleOpenFoamFieldAsync` now dispatches parsing and ASCII boundary decoding through a cancellable `Task.Run` worker and uses `ConfigureAwait(false)` inside that worker.
- Camera, opacity and other visual controls can therefore continue receiving UI events while a new field timestep is parsed.
- Regression explicitly requires the worker dispatch and cancellation token.
- Product commit: `5e9a50325372b1223ad6d754fbde269e53323061`.

### 3D navigation and orientation
- Field View now exposes explicit:
  - Orbit;
  - Pan;
  - Zoom;
  - Fit;
  - Reset;
  - Front / Back / Left / Right / Top / Bottom / Isometric views.
- An interactive XYZ gizmo is rendered inside the viewport, follows camera orientation and allows X/Y/Z click-to-view navigation.
- Middle/right drag remains a pan fallback; wheel zoom and double-click Fit are supported.
- Product commit: `be886d64c0bd4a2eb213f5651841660d2d160228`.
- Navigation regression: `feb046533ab9e21f16bacf5ffc4a34e60b67813b`.

### Intelligent scientific color ranges
- The former single `Lock color range` control was replaced by explicit modes:
  - Smart / current frame;
  - Global / all physical times;
  - Manual.
- Legend/statistics now expose Min, Max, mean and Δ.
- Numeric formatting increases precision automatically when a small field span sits on top of a large absolute value.
- Numerically uniform fields are represented explicitly as a uniform field rather than a misleading full gradient.
- Slice and iso-surface rendering use the same selected scientific range contract as the main surface.
- Product commits:
  - `b745377468b2fe97046dc8e248ae6924dc086036`
  - `b4a33c1f2b21bcc1c4f1083be37e2389bab9390f`
  - `bef20ee832df22311e8b8a87d974e8d3e4cb5292`.

### One bounded field cache + temporal prefetch
- Audit found that the base frontend already retained parsed fields in `pmFieldCache`, but that cache had no memory bound.
- A second Field View-only retention cache would have made a visible 512 MB budget misleading, so the architecture was consolidated instead.
- The shared OpenFOAM field cache is now bounded and LRU-evicted with:
  - tracked retained bytes;
  - configurable limit (256 MB / 512 MB / 1 GB / 2 GB from Field View);
  - recency touch on reads;
  - explicit trim/stat/clear helpers.
- Field View keeps only in-flight request deduplication and prefetches neighboring frames in the order next, next+1, previous.
- A transient implementation error that made the cache clear helper recursive was detected during the same audit and corrected before the final candidate.
- Product commits:
  - `ff367366ece31fff818c6568cdea56656d6e3e80`
  - correction `aa3ad831d3de6e64bf4aa3720b58514a28bae15f`
  - shared-cache Field View integration `684b18571b41693bc357df607bf54d260708058e`.

### Independent and multi-view 3D analysis
- Synchronized comparison no longer assumes “same field in a second case”.
- View 2 can independently select case, region, field and component; the same case may be selected to compare two different variables.
- Additional synchronized Views 3 and 4 can be added, for up to four simultaneous 3D viewports.
- Physical time and camera orientation remain synchronized; each viewport may represent a different quantity.
- Shared color ranges and strict signed 3D differences are only applied when the two relevant views represent the same field/component/association/dimensions.
- View 2 now uses the same generic field loader as Field View so cell-, point- and internal-face-associated fields are handled according to their real association instead of exposing options that silently required a volume field.
- Strict 3D difference remains deliberately limited to compatible cell-associated volume fields.
- Product commits:
  - independent View 2: `58efbe93db56bfbd571e74b4249f23a81c2d8145`
  - Views 3/4: `0d4eecc16d32d8625a6dd726a68bbc0fcdb04c76`
  - association-aware View 2: `18d476dec12dd41aea944c5640b1848ef358738e`.

### Multi-view animation / video export
- New module: `v14-animation-export.js`.
- Export controls include:
  - start/end physical time;
  - frame step;
  - 24/30/60 FPS;
  - 720p / 1080p / 1440p / 4K;
  - Auto (MP4 when supported), MP4 or WebM.
- Export preloads the requested physical-time frames and calculates an independent global color range for every visible 3D viewport before recording.
- Visible synchronized viewports are composited into one output video with view labels, physical time and range information.
- Video export uses the browser/WebView `MediaRecorder` + canvas `captureStream` capability and falls back to a supported encoded MIME type.
- Product commits:
  - animation export: `84376d18dbf4f00113dde7f8fc954c2a460e73ad`
  - fixed per-view video-range plumbing: `80d378d7b041b6833f1e19b59e2567ec0099fff8`
  - comparison descriptors/ranges: `3fe4410506c0e2dbf632e2fe6fae4d6af6ff4e1f`.
- Boundary: CI validates syntax/wiring and application packaging, but actual user-side codec availability still depends on the installed WebView2 runtime; the exporter reports when the requested encoding is unavailable.

### v1.4.3 development identity / CI
- Desktop project, assembly/file versions, runtime-bundle isolation, Field View identity, frontend export provenance and documentation were aligned to `v1.4.3`.
- Public release remains `v1.4.2`; no `v1.4.3` tag or GitHub Release was created.
- CI branch matching was generalized to `development/**` so current and future development branches receive the full Windows build without publishing.
- Intermediate CI findings were corrected rather than ignored:
  - run #387 exposed stale v1.4.2 version-test expectations;
  - runs #393/#394 exposed the old Field View cache-test expectation after cache consolidation.
- Those were stale regression expectations, not reasons to restore the obsolete implementation.

### Final development-candidate validation
- Tested product head: `f3afd81a31abf02544f334c1179acf5accf0573c`.
- GitHub Actions run **#397 — SUCCESS**.
- Real OpenFOAM QuickCup/B13 regression: **SUCCESS**.
- Frontend JavaScript validation: **SUCCESS**.
- Version consistency: **SUCCESS**.
- Native OpenFOAM field streaming / off-UI-thread regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- Decomposed Field View regression: **SUCCESS**.
- Iso-surface and 3D probe regressions: **SUCCESS**.
- Strict 3D difference / multi-view regression: **SUCCESS**.
- CI suite manifest: **SUCCESS**.
- Bilingual/overflow audits: **SUCCESS**.
- Portable Windows executable build + smoke: **SUCCESS**.
- Installer build + installed-application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11091020217`.
- Artifact size: 135,282,594 bytes.
- Artifact digest: `sha256:4e59fbed846d4ef38a367463b460e8a8d4cb67a9addc57ca25c93412ee41d1a6`.
- GitHub Release publication: **SKIPPED**. v1.4.3 remains a development candidate for real user-side visual/video testing.

### Candidate rule
- The validated product head above must remain identifiable even if documentation-only commits follow it.
- Any product-code change after `f3afd81a31abf02544f334c1179acf5accf0573c` requires a new full CI candidate before it is treated as the v1.4.3 test build.


## 2026-09-30 — v1.4.3 packaged-runtime smoke strengthened

### Why the runtime smoke was expanded
- The earlier v1.4.3 candidate (#397) proved product regressions, B13 integration, packaging and installer startup, but the Windows smoke only verified that Field View mounted.
- New runtime checks now execute inside the packaged WebView2 application rather than only inspecting source strings.

### Runtime 3D UI checks
- The packaged EXE now verifies at runtime that these controls/APIs actually mount:
  - Orbit / Pan / Zoom / Fit / Reset;
  - XYZ orientation gizmo;
  - Current / Global / Manual color-range modes;
  - comparison controls;
  - animation/video panel.
- The smoke programmatically presses `+ Add 3D view` twice and verifies synchronized Views 3 and 4 create their viewport, canvas and controls without duplicate DOM IDs.
- It verifies the original 2D chart canvas remains `position:absolute`, while the Field View canvas is not globally forced absolute. This directly guards the cross-application canvas-overlay defect.
- It invokes standard camera/pan/orbit UI controls inside the real WebView2 runtime.
- Run #399 confirmed this complete 3D runtime UI block passed in the packaged EXE.

### Real WebView2 video primitive smoke
- Initial run #399 failed after the 3D checks because the test harness returned an unresolved JavaScript Promise directly through `ExecuteScriptAsync`; WebView2 serialized the Promise object as `{}`.
- This was a smoke-harness defect, not evidence that video encoding failed.
- The harness was corrected to:
  - launch the async recorder inside WebView2;
  - store the resolved result in `window.__foamLensVideoSmokeResult`;
  - have C# poll that result with an explicit 8-second deadline;
  - require a non-empty encoded Blob.
- The smoke exercises the same browser primitives used by FoamLens export: `HTMLCanvasElement.captureStream` + `MediaRecorder`, with MP4/WebM capability negotiation.
- Product behavior was not weakened to make the test pass.

### New validated candidate
- Tested head: `c56e5e951f512b696f5a73cd8920be742bca33f4`.
- GitHub Actions run **#401 — SUCCESS**.
- Real QuickCup/B13 regression job: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Packaged portable EXE runtime smoke: **SUCCESS**, including:
  - v1.4.3 3D controls/APIs;
  - View 3 + View 4 runtime creation;
  - canvas layout isolation;
  - scientific color-range modes;
  - actual WebView2 canvas-video encoding producing a non-empty Blob.
- Installer build: **SUCCESS**.
- Installed-app runtime smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11091436790`.
- Artifact size: 135,289,646 bytes.
- Artifact digest: `sha256:dc64e7ae95b975f651f5efac2df062b56d16cfd36a4d00696f4cfe7300d95582`.
- GitHub Release publication remains **SKIPPED**; v1.4.2 is still the public stable release.

### Important limitation still being closed
- B13 is currently validated through the dedicated real OpenFOAM integration job, while the packaged Windows smoke uses mounted UI plus a synthetic recording canvas.
- The next CI hardening target is loading the private B13 fixture into the packaged WebView2 application during smoke, if this can be done through a smoke-only bridge without introducing fixture-specific behavior into the product UI or scientific logic.


## 2026-09-30 — B13 rendered inside packaged Windows FoamLens

### Why a second real-case path was needed
- The existing QuickCup integration job already validated the real B13 files on Linux, but it did not prove that the packaged Windows application could traverse the same Smart Import -> case metadata -> Field View -> native field/mesh bridge -> WebGL path.
- A smoke-only, fixture-agnostic runtime helper was therefore injected only when the executable starts with `--smoke-test`.
- Normal FoamLens runs do not expose this helper and contain no B13-specific scientific logic.

### Smoke-only packaged real-case path
- The runtime helper receives native file references for any OpenFOAM case and uses the real FoamLens functions:
  - `runProjectScan(files)`;
  - Smart Import candidate creation;
  - `importSelectedAsCases()`;
  - Data / Field View navigation;
  - normal region/field selectors;
  - `fvLoadSelection()`;
  - normal native mesh/field parsing and WebGL rendering.
- C# then requires the rendered frame to report:
  - a 3D-ready case;
  - nonzero mesh cells;
  - nonzero field values;
  - a finite field range;
  - nonzero rendered surface vertices;
  - an active WebGL context;
  - `gl.getError() == 0`;
  - the requested region/field when the smoke environment specifies them.
- CI requests `region=metal` and `field=T`; those names exist only in workflow fixture configuration, not in FoamLens product selection logic.
- Product/runtime-helper commit: `b60948f8bdae626bb77cca38c2e6c9d11189c880`.

### Windows path incompatibility discovered
- A direct Windows checkout of QuickCup failed before FoamLens could start because OpenFOAM output contains filenames legal on Linux but impossible on NTFS, notably `phaseChangeSource:alpha1`.
- This is not confined to an unrelated case: B13 itself contains `phaseChangeSource:alpha1` at many physical times.
- QuickCup/thesis files were not renamed or modified.

### Windows-safe real fixture staging
- The Linux real-fixture job now creates a temporary Windows-safe B13 runtime copy.
- It omits only path components that Windows cannot represent (invalid NTFS characters, trailing dot/space, reserved device names) and rejects case-insensitive path collisions.
- Required inputs are asserted after staging, including:
  - `constant/metal/polyMesh/points`;
  - `constant/metal/polyMesh/faces`;
  - `constant/metal/polyMesh/owner`;
  - `0/metal/T`.
- Run #407 staging result:
  - **4,584 files copied byte-for-byte**;
  - **101 NTFS-impossible paths omitted**;
  - omitted examples are the `phaseChangeSource:alpha1` field at successive physical times.
- The staged B13 artifact is uploaded from Linux and downloaded by Windows; Windows no longer git-checks out the private QuickCup repository.
- CI staging commit: `487395afecceeea6962afcd5a1cf329d242f1b0b`.
- Final extracted-path correction for portable and installed smoke: `a407131baa9a8b837a55fccb0c1fec8bfb434f52`.

### Fully validated v1.4.3 candidate
- Tested product/CI head: `a407131baa9a8b837a55fccb0c1fec8bfb434f52`.
- GitHub Actions run **#407 — SUCCESS**.
- Linux real QuickCup/B13 integration: **SUCCESS**.
- Windows-safe B13 fixture preparation/upload/download: **SUCCESS**.
- Full Windows scientific/UI regression suite: **SUCCESS**.
- Portable EXE build: **SUCCESS**.
- Portable packaged-runtime smoke: **SUCCESS**, including:
  - runtime multi-view controls;
  - View 3/4 creation;
  - canvas isolation;
  - WebView2 video encoding;
  - real Smart Import of staged B13;
  - real `metal/T` Field View load;
  - nonzero mesh/field/render geometry;
  - finite field range;
  - WebGL context with zero GL error.
- Installer build: **SUCCESS**.
- Installed-app smoke: **SUCCESS**, repeating the same real B13 packaged-runtime path.
- Final Windows artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11092386284`.
- Artifact size: 135,252,937 bytes.
- Artifact digest: `sha256:92463f2d32b49db87d36a6f1d86e1cf71dadf118db70646edcbb6b3ceafa72f8`.
- Temporary staged fixture artifact: `QuickCup-B13-Windows-runtime`, artifact id `11091897433`, one-day retention.
- GitHub Release publication remains **SKIPPED**. Public stable remains v1.4.2.

### Candidate rule
- `a407131baa9a8b837a55fccb0c1fec8bfb434f52` is now the strongest validated v1.4.3 product candidate.
- Any product-code or workflow behavior change after that head requires a new full validation run before replacing it as the candidate.


## 2026-09-30 — v1.4.3 late-time thermal visualization closed on real B13 packaged runtime

### Why this check was added
- User testing of v1.4.2 showed a Field View legend of `1500 / 1500 / 1500` even around `t = 9.8 s`, although the real simulation was known to have thermal evolution.
- Direct inspection of the B13 OpenFOAM fixture established:
  - `t = 0 s`: `internalField uniform 1500`;
  - `t = 9.8 s`: 6400 cell values, min `1417.57 K`, max `1481.90 K`, span `64.33 K`;
  - `t = 9.9 s`: min `1417.56 K`, max `1481.56 K`, span `64.00 K`.
- Therefore a `1500 / 1500 / 1500` legend is correct only for the initial uniform frame and incorrect for the late-time B13 field.

### Smoke contract strengthened
- The smoke-only OpenFOAM import helper can now request a specific physical time.
- The packaged runtime reports:
  - selected physical time;
  - field min/max;
  - field span;
  - rendered legend text;
  - cells/points/value count;
  - WebGL status/error;
  - active 3D plot title/info.
- CI now requests:
  - region: `metal`;
  - field: `T`;
  - physical time: `9.8 s`;
  - minimum acceptable field span: `1 K`.
- Portable and installed application smokes fail if the late B13 frame collapses back to an effectively uniform field.

### Final validation
- Tested head: `dd3348ce268db23ad330573b34aa62e06a035d40`.
- GitHub Actions run **#416 — SUCCESS**.
- Real QuickCup/B13 regression: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Portable packaged runtime smoke: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- WebView2 video primitive smoke:
  - MIME: `video/mp4;codecs=avc1`;
  - encoded blob non-empty.
- Portable B13 runtime evidence at `t = 9.8 s`:
  - case: `B13_prghPressure_airGapOF14`;
  - region: `metal`;
  - field: `T`;
  - association/storage: cell / volume;
  - cells: `6400`;
  - points: `13122`;
  - values: `6400`;
  - min: `1417.57 K`;
  - max: `1481.90 K`;
  - span: `64.33 K`;
  - WebGL error: `0`;
  - surface vertices: `78720`;
  - legend: `T [K] · 1,418 · 1,450 · 1,482 · current · Δ 64`;
  - active header: `3D OpenFOAM Field View · Mesh + transient fields`.
- Installed runtime returned the same numerical and rendering evidence.
- Visual screenshots confirm a visible late-time thermal gradient and no cross-application canvas overlay lines.

### Candidate artifact
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11112882822`.
- Artifact size: `135,326,030 bytes`.
- Artifact digest: `sha256:0c913f1afb2f5e1c970feb6ded50b94acb5e6aa336518de0847a410aded39bb6`.
- Artifact contains:
  - portable EXE;
  - portable SHA-256 file;
  - installer EXE;
  - portable B13 smoke screenshot;
  - installed B13 smoke screenshot;
  - portable runtime evidence log;
  - installed runtime evidence log.
- GitHub Release publication remains **SKIPPED**. Public stable remains v1.4.2 until explicit promotion of v1.4.3.

### Candidate rule
- Any product-code change after `dd3348ce268db23ad330573b34aa62e06a035d40` requires a new full candidate run before promotion.


## 2026-09-30 — FoamLens Desktop v1.4.4 Field Workspace candidate

### Scope closed in this candidate
- Field View is promoted from the Data sub-tabs to a first-class top-level application mode alongside Overview, Data, Analysis, Review and Live.
- The legacy Data `Field View` tab remains hidden in the new workflow; existing routes to `field3d` redirect into the top-level Field workspace.
- Field Workspace supports simultaneous 3D + 2D diagnostics instead of forcing the user to choose one or the other.
- Companion plot options include Spatial Profile, Time Series, Solver Logs or None.
- Spatial Profile can follow the 3D physical time while the 3D renderer remains mounted.
- `+ Add 3D View` is visible in the Field Workspace header.
- Up to four synchronized 3D viewports remain supported.
- Each 3D viewport retains independent case / region / field / component selectors.
- Visible synchronized 3D views remain eligible for the same animation/video export.

### Real 3D Case selector defect
- User testing showed the Case selector could visually change while the renderer stayed bound to the previous case.
- Root cause: the Case `onchange` path called `fvRefreshSelectors(false)`, which discarded the explicit user selection and reselected the active context case.
- The Case selector now routes through `fvHandleCaseChange()`.
- Case switching now invalidates stale frame, prefetch, global-range, mesh, field, vector, streamline, slice and Probe state before rebuilding the selected case.
- The handler preserves the explicitly selected case and verifies that both `fvState.caseId` and `fvCase().id` remain bound to it after loading.

### End-to-end multi-case selector smoke
- The QuickCup fixture branch contains one complete transient 3D runtime fixture (B13); the sibling V12/V13 directories do not contain the full generated 3D payload.
- CI therefore creates distinct smoke case identities backed by the same complete B13 payload. This tests selector/state mechanics without pretending that the incomplete sibling fixtures are complete CFD results.
- Portable and installed runtime smoke both import four 3D-ready case identities.
- The smoke changes the real `#fvCase` select value and dispatches a real bubbling `change` event.
- It waits for `fvState.caseId` and `fvCase().name` to change before continuing.
- Validated transition: `SmokeCase_A -> B13_prghPressure_airGapOF14`.
- Runtime evidence confirms:
  - `caseCount = 4`;
  - `readyCaseCount = 4`;
  - `caseSwitchChanged = true`;
  - switched case ID differs from initial case ID;
  - renderer case ID equals switched case ID;
  - final rendered case is `B13_prghPressure_airGapOF14`.

### Field Workspace runtime evidence
- Portable and installed smoke both confirm:
  - top-level `Field View` navigation is visible;
  - `Field Workspace` is the active application mode;
  - the 3D panel is mounted under `fw3DHost`;
  - Spatial Profile is mounted simultaneously under `fw2DHost`;
  - companion mode is `profile`;
  - `+ Add 3D View` is visible;
  - View 3 and View 4 can mount without duplicate DOM IDs;
  - the main 3D canvas is not affected by the old global absolute-canvas defect.
- Final smoke screenshot visually confirms the split workspace with 3D and Spatial Profile shown at the same time.

### Probe visibility
- Probe now exposes explicit ON/OFF state.
- Disabling Probe clears the WebGL marker rather than only changing the control label/cursor.
- A high-contrast overlay marker/reticle follows the picked point.
- Probe marker size is configurable: S / M / L.
- Runtime rendering updates the overlay position after camera redraws.

### Vector and streamline resolution
- Vectors and Streamlines now have independent collapsible control blocks beneath their ON/OFF toggles.
- Vector resolution options:
  - Adaptive;
  - 150;
  - 300;
  - 600;
  - 1200;
  - 2400 glyphs.
- Glyph size is independently adjustable.
- Vector sampling no longer relies only on a raw every-N-cells stride; it uses the spatial hash to distribute glyph samples across the domain and reports the actual glyph count.
- Synchronized View 2 uses the same vector-resolution and glyph-size controls instead of a hard-coded 280 glyphs.
- Streamline seed density can be raised up to 400 seeds and is independent from vector glyph density.
- Streamline controls remain separated from vector controls.

### Navigation cleanup
- Field View is now part of the base navigation model (`workspace/data/field/analysis/review/live`).
- The Workspace fallback only creates a Field navigation button if the base button is absent.
- Fallback click wiring is added only when that fallback button was actually created, preventing duplicate Field navigation listeners.

### Scientific regression retained
- B13 `metal/T` at `t = 9.8 s` remains the late-time thermal runtime reference.
- Portable and installed smoke both report:
  - 6400 cell values;
  - 13122 mesh points;
  - min `1417.57 K`;
  - max `1481.90 K`;
  - span `64.33 K`;
  - legend `1,418 / 1,450 / 1,482 · current · Δ 64`;
  - WebGL error `0`.
- The video primitive smoke again produced a non-empty MP4/H.264-compatible blob in WebView2.

### Final v1.4.4 candidate validation
- Tested head: `71ce31ed83b50b0c76896b8a5ef7abe7b445f5b0`.
- GitHub Actions run **#452 — SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Field View regression: **SUCCESS**.
- Probe regression: **SUCCESS**.
- 3D comparison/multi-view regression: **SUCCESS**.
- Portable packaged runtime smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.4`.
- Artifact id: `11122496658`.
- Artifact size: `135,161,390 bytes`.
- Artifact digest: `sha256:ea4c7a2d0f8453b0e94b6c931c8f90fd7bd893f49a85599897d71a8a1f631654`.
- GitHub Release publication remains **not performed** for v1.4.4 in this development branch.

### Candidate rule
- Any product-code change after `71ce31ed83b50b0c76896b8a5ef7abe7b445f5b0` requires a new full candidate run before promotion.


## 2026-09-30 — FoamLens Desktop v1.4.5 multi-view legend / Probe patch line

### Why v1.4.5 exists
- Public v1.4.4 was already tagged and published from commit `93b04a4c5cac5e591519eb0f49e1939ab85a437c`.
- Subsequent real-user testing of that release exposed two visible multi-view defects:
  - an added 3D viewport could render its field but show no local color scale/legend;
  - Probe could be enabled while the added viewport gave insufficient visual feedback, making it look as if Probe did nothing.
- The v1.4.4 tag/assets are not moved or replaced. These post-release fixes are promoted as v1.4.5.

### Per-viewport scientific legend
- View 2 and dynamically added Views 3/4 now own an independent `fcLegend` element inside their viewport.
- Legend rendering uses the field/component actually selected for that viewport, its dimensions/unit and its active display range.
- Non-uniform fields show min / midpoint / max plus Δ.
- Numerically uniform fields are explicitly labelled uniform instead of drawing a misleading gradient.
- Extra-view upload refreshes the local legend on every field/frame change.
- Comparison View 2 refreshes its legend on synchronized frame loads and visual-range changes.
- The legend is anchored to the viewport itself, so different variables/cases may display different scientifically meaningful scales simultaneously.

### Probe in synchronized / added 3D views
- Probe state is shared with the Field View Probe ON/OFF control, but every comparison viewport now installs its own click picking path.
- View 2 and Views 3/4 perform picking against their own mesh, association and field values rather than reusing the primary view's data.
- Each additional viewport owns a high-contrast `fcProbeMarker` overlay.
- Clicking geometry while Probe is ON stores a viewport-specific probe result, redraws its marker and updates the per-view statistics grid.
- Changing case / region / field / component clears the stale probe for that viewport.
- Probe OFF prevents comparison-view picking and keeps probe markers from being presented as active selections.

### Multi-view continuity retained from v1.4.4 development work
- Field View remains a first-class top-level application mode.
- 3D + Spatial Profile can remain mounted simultaneously.
- `+ Add 3D View` remains visible in Field Workspace.
- Up to four synchronized 3D viewports are supported with independent case / region / field / component.
- Visible synchronized views remain included in the same video export.
- Vector resolution / glyph size and streamline seed density remain independently adjustable.
- Safe 3D case switching continues to invalidate stale case work before binding the renderer to the newly selected case.

### Release discipline
- v1.4.4 remains the immutable historical release containing the behavior seen in the user's screenshot.
- v1.4.5 is the patch release line for the post-v1.4.4 multi-view legend / Probe fixes.
- Public release before promotion: v1.4.4.
- Development identity: v1.4.5 / frontend v51.


### Final v1.4.5 candidate validation
- Tested product head: `6bd6ed194ea5da284a9b14f39a5a67ce112415ee`.
- GitHub Actions run **#485 — SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Windows-safe multi-case runtime fixture preparation/upload/download: **SUCCESS**.
- Full Windows scientific/UI regression suite: **SUCCESS**.
- Field View regression: **SUCCESS**.
- 3D Probe regression: **SUCCESS**.
- 3D comparison / multi-view regression: **SUCCESS**.
- Portable EXE build: **SUCCESS**.
- Portable packaged-runtime smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- Development-branch Release publication: **SKIPPED**, as expected.

### Packaged-runtime evidence for the reported v1.4.4 defects
- The packaged WebView2 smoke enables synchronized View 2 through the public UI/runtime API.
- It selects a distinct comparison case and verifies that the selection persists in the actual rendered View 2 descriptor.
- It optionally switches View 2 to a field distinct from the primary viewport.
- It requires the secondary viewport's `#fcLegend` to:
  - be present;
  - not carry the hidden class;
  - have nonzero rendered width/height;
  - contain non-empty scientific legend text.
- It enables the shared Probe control, clicks multiple real positions in the View 2 canvas and requires:
  - a View 2 probe descriptor;
  - a finite selected value;
  - a visible `#fcProbeMarker` with nonzero dimensions;
  - updated selected-value statistics.
- A failure in either the local View 2 legend or the secondary Probe marker makes the packaged smoke fail.

### Candidate artifact
- Artifact: `FoamLens-Windows-v1.4.5`.
- Artifact id: `11130930049`.
- Artifact size: `135,195,504 bytes`.
- Artifact digest: `sha256:8b427192f8e21b9b1118b698880daf8cc54077dd6eeaaae9413a97ff51348ccc`.
- Multi-case runtime fixture artifact: `QuickCup-MultiCase-Windows-runtime`.
- Runtime fixture artifact id: `11129997074`.
- v1.4.4 remains unchanged and historical; promotion target is v1.4.5.


## 2026-10-02 — FoamLens post-v1.4.5 pending roadmap

### Roadmap policy
- This section intentionally records **pending / proposed work**, not completed product behavior.
- An item remains pending until product code, regressions and packaged-runtime evidence exist.
- Completed items should be moved into a dated validation section rather than silently removed from this roadmap.
- Current public release at the time this roadmap was written: **v1.4.5**.

### P0 — Scientific visualization / trust
- **Streamline seeding and integration controls**
  - add explicit seed modes: Plane / Line / Box-Volume / Patch;
  - expose seed density independently from vector glyph density;
  - add Forward / Backward / Both integration direction;
  - expose max integration length, max steps and integration step controls;
  - report actual streamline count and integration-point count;
  - support coloring streamlines by velocity magnitude or another compatible scalar field;
  - validate representative streamline paths against ParaView/VTK before calling the feature thesis-grade.
- **Vector glyph analysis controls**
  - keep Adaptive / fixed glyph-count resolution and glyph-size controls;
  - add normalized-length vs magnitude-proportional arrow modes;
  - allow region/ROI-based glyph sampling;
  - report requested vs actually rendered glyph count;
  - validate spatial sampling against the underlying vector field rather than only visual density.
- **Per-viewport visual independence**
  - allow every 3D viewport to own its own colormap, color-range mode, opacity, vector/streamline visibility, Slice/Iso settings and Probe state when desired;
  - add an explicit Sync visual settings toggle rather than implicitly sharing all visualization controls;
  - retain independent scientific legends for every viewport.
- **Scientific provenance in the viewport**
  - make field association, dimensions/units, physical time, region, case and parser/source provenance visible without opening the catalog;
  - expose when a frame is Exact / Nearest / Interpolated in multi-case synchronized views.

### P0 — Multi-view / case comparison
- **Camera synchronization groups**
  - add Link cameras ON/OFF;
  - allow one viewport to be rotated independently without breaking the others;
  - provide Re-sync camera and Fit all actions.
- **Time synchronization modes per comparison**
  - Exact / Nearest / Interpolated physical-time synchronization;
  - explicit per-view Δt badges when times are not exact;
  - prevent silent index-based equivalence.
- **Generalized 3D difference**
  - choose any two compatible visible views as A and B;
  - support signed difference, absolute difference and percent difference where scientifically valid;
  - keep strict association / dimensions / mesh-compatibility checks.
- **Multi-case matrix workflow**
  - quicker Case A / B / C / D assignment;
  - copy visual settings from one viewport to another;
  - swap views without rebuilding the workspace.

### P1 — 3D + 2D linked analysis
- **Interactive profile definition from the 3D view**
  - draw a line in 3D and immediately generate a Spatial Profile along it;
  - support axis-aligned and arbitrary lines;
  - show the sampled line/plane visibly inside the 3D viewport.
- **Probe-to-profile linking**
  - selecting a 3D Probe should optionally move a cursor/marker on the Spatial Profile;
  - selecting a point on a Spatial Profile should optionally highlight the corresponding 3D location.
- **Synchronized companion plots**
  - keep Spatial Profile / Time Series / Solver Logs simultaneously available beside 3D;
  - make the physical-time link explicit and reversible;
  - allow more than one 2D companion panel when screen space permits.
- **Cross-case profile comparison**
  - overlay profiles from multiple selected 3D cases/fields at the same physical time;
  - display difference / relative difference without extrapolating beyond common support.

### P1 — Animation / video
- **Camera-path / keyframe animation**
  - save camera keyframes and interpolate orbit / pan / zoom through the exported animation.
- **Scientific video overlays**
  - configurable case / field / region / time / legend / Δt labels;
  - optional watermark/provenance and thesis-safe title block.
- **Multi-view video layouts**
  - 1-up / 2-up / 2×2 templates;
  - optional 3D + Spatial Profile composition in the same video;
  - preserve an independent fixed global color range for each viewport across the full recording.
- **Export quality controls**
  - bitrate/quality presets;
  - frame-step and playback-speed controls;
  - explicit codec/fallback reporting for MP4/WebM.

### P1 — Performance / responsiveness
- **Progressive frame rendering**
  - update the visible viewport as soon as its required field is ready instead of waiting for hidden or secondary views.
- **Viewport-aware loading**
  - prioritize active/visible viewports;
  - lazy-load hidden secondary views;
  - cancel stale case/time/field requests aggressively.
- **GPU/resource reuse**
  - reuse mesh and WebGL buffers when only field values change;
  - avoid rebuilding equivalent geometry across synchronized views.
- **Cache telemetry**
  - show hit/miss/prefetch counts in addition to retained MB;
  - expose a clear-cache action;
  - distinguish mesh cache from field cache.
- **Playback prefetch policy**
  - adaptive prefetch depth based on current playback speed and measured parse time.

### P1 — Export / thesis workflow
- **Multi-panel thesis figure export**
  - export 3D + Spatial Profile / comparison views as one high-resolution figure;
  - consistent margins, labels, legends and physical-time caption.
- **Per-view export**
  - export an individual viewport without hiding the others first.
- **Reusable figure presets**
  - save camera, field, range, legend and layout presets for repeatable thesis figures.

### P2 — Workspace / usability
- **Persistent Field Workspace layouts**
  - save and restore viewport count, case/field assignments, companion plots, splitter positions and synchronization settings.
- **Per-view rename / labels**
  - user labels such as Baseline / Pressure BC / Fixed Value for presentations and exports.
- **Visual comparison status bar**
  - compact always-visible summary of linked camera, linked time, active Probe, vector glyph count and streamline count.
- **Keyboard/mouse discoverability**
  - viewport help overlay for orbit / pan / zoom / Probe shortcuts.
- **Resizable multi-view panels**
  - drag splitters between 3D viewports and companion plots instead of fixed equal columns.

### Recommended next implementation order
1. Streamline seeding/integration controls + ParaView validation.
2. Per-viewport visual settings and camera-link toggle.
3. Interactive 3D-defined Spatial Profile.
4. Generalized A/B 3D difference and explicit time-sync modes.
5. Multi-panel thesis/video export.
6. Performance pass with viewport-aware loading and GPU-buffer reuse.

### Already closed before this roadmap
- top-level Field Workspace;
- simultaneous 3D + Spatial Profile workflow;
- visible Add 3D View and up to four synchronized views;
- safe 3D case switching;
- independent added-view legends;
- Probe marker/picking in added 3D views;
- adjustable vector glyph resolution / size;
- adjustable streamline seed density;
- synchronized multi-view video export;
- late-time B13 thermal-range validation;
- packaged portable + installed runtime evidence for v1.4.5.

## 2026-10-03 — v1.4.6 visible-version validation repaired and completed

- Development branch: `development/v1.4.6-visible-version`.
- Product change already present on the branch: persistent visible FoamLens Desktop v1.4.6 identity across the desktop UI/runtime.
- Previous Windows builds on 2026-10-02 failed after the real QuickCup regression had already passed because `desktop/tests/native-performance.test.cjs` still expected the historical runtime-smoke text `FoamLens v1.4.5 3D runtime UI smoke passed` while `Program.cs` correctly emitted the v1.4.6 identity.
- Fix commit: `a80ffd51d7a13c3dfc12e28df863aea6df917d09` — `test: align native runtime smoke with v1.4.6`.
- The fix changed only the stale regression expectation/name/error text; production runtime behavior was not altered.
- GitHub Actions run **#494** (`37104141077`) completed **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Native background progress/cancellation regression: **SUCCESS**; this was the step that had blocked the previous v1.4.6 builds.
- 3D Field View, point-field reconstruction, decomposed meshes, dynamic mesh, iso-surfaces, 3D Probe, explicit surface fields, strict 3D difference, Smart Import, dual Time-Series Focus, convergence, momentum, energy, experimental validation, contextual UI, diagnostics and bilingual/overflow regressions: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke with real OpenFOAM fixture: **SUCCESS**.
- Windows installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows build artifact upload: **SUCCESS**.
- Release publication: **SKIPPED**, expected for a development-branch push.
- Artifact: `FoamLens-Windows-v1.4.6`, id `11267431426`, size `135,196,674 bytes`, digest `sha256:63089cb91f640ca78ea7cb7c19217947bb2500251d1c97b547c84a8ed652d015`.
- Multi-case runtime fixture artifact: `QuickCup-MultiCase-Windows-runtime`, id `11267780761`, size `326,073,834 bytes`, digest `sha256:32d37d99429fa308cdfc410d08866d6419fbe5f6ccbe152a84039d6fabffdaa7`.
- Public release remains **v1.4.5**; v1.4.6 is validated and ready for promotion when explicitly requested.


## 2026-10-03 — Compact Word-style ribbon navigation validated

- Development branch: \`development/v1.4.7-ribbon-navigation\`.
- Validated product head: \`36bc401b0a130776cc8629ae5e479406992b5893\`.
- Base product identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no release-version promotion was performed.

### UI organization
- Added \`desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js\`.
- Replaced the visible legacy top mode bar/tool cluster with a compact Word-style ribbon only after the ribbon mounts successfully.
- Ribbon tabs:
  - Home;
  - Data;
  - 3D / Field;
  - Plots;
  - Analysis;
  - Compare;
  - Export;
  - View.
- Major actions are icon-first with small text labels beneath the icons rather than text-heavy buttons.
- The implementation exposes 54 ribbon actions while preserving the existing scientific/runtime handlers instead of duplicating their logic.
- Project / Case / Region context and workspace save/open controls remain visible in the ribbon context strip.
- Ribbon tabs navigate directly to their corresponding workspace where appropriate.
- Legacy \`modeNavBar\` and the old top tool row are hidden only after successful ribbon installation.

### Existing controls reused rather than replaced
- Data import: Add files / Add folder.
- Data views: Time Series / Spatial Profiles / Solver Logs / Catalog.
- Field Workspace: Add 3D View / Configure views / Split / 3D focus / Plot focus.
- Scientific inspection: Probe / Slice / Vectors / Streamlines.
- Camera: Fit / Reset.
- Analysis: General / Coupling / Front tracking / Difference / Field Mapping / Phase Change-Momentum.
- 3D comparison: Compare 3D / Add view / Configure / Difference.
- Export: PNG / SVG / CSV / Thesis Figure / Video.
- View: sidebar / fit / theme / language.

### Cases menu integration
- The existing Case visibility panel is re-homed under the ribbon instead of being left inside the now-hidden legacy toolbar.
- Ribbon action click propagation is contained so the legacy document-level outside-click handler does not immediately close the Case menu.
- Packaged runtime smoke verified:
  - \`casePanelOpen = true\`;
  - \`casePanelParent = flRibbon\`.

### Regression / smoke issues found during validation
- Run #499 exposed a stale source-audit assumption: the test searched for fully materialized ribbon tab IDs even though the module generates them dynamically. The test was corrected to audit the stable tab definitions / ID builders.
- Run #501 reached packaged runtime and proved the ribbon runtime smoke itself passed, but a historical Field View smoke still required the legacy \`modeField\` navigation button to be visible.
- Runs #504/#505 confirmed:
  - ribbon runtime smoke passed;
  - Cases menu mounted/opened correctly;
  - \`fieldRibbonVisible = true\`;
  - the remaining failure was only the historical legacy-navigation assertion.
- The final smoke now validates the visible ribbon Field tab and checks the hidden state on the legacy navigation container (\`modeNavBar\`) instead of querying the hidden child button's own computed \`display\`.

### Automated coverage
- Added \`desktop/tests/ribbon-ui.test.cjs\`.
- Added the ribbon audit to \`.github/workflows/build-foamlens-desktop.yml\`.
- Source audit result: 8 ribbon tabs / 54 actions, with all required existing-control targets present.
- WebView2 startup smoke verifies:
  - ribbon mounted;
  - all expected tabs/actions exist;
  - icon / small-label hierarchy exists;
  - Field tab activates the Field workspace;
  - legacy top navigation/tool row is hidden;
  - Project / Case / Region context is preserved;
  - Cases menu is re-homed and opens from the ribbon.

### Final validation
- GitHub Actions run **#506** (\`37106117480\`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full scientific/UI regression suite: **SUCCESS**.
- 3D Field View, pointField reconstruction, decomposed meshes, dynamic mesh, iso-surfaces, Probe, explicit surface fields and strict 3D difference: **SUCCESS**.
- Ribbon source audit: **SUCCESS**.
- Bilingual / overflow audits: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- The packaged smoke reports the new \`3D / Field\` ribbon navigation visible while Field Workspace, B13 multi-case switching, local legends and synchronized View 2 Probe remain functional.
- Portable checksum creation: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Candidate artifacts
- Windows build artifact: \`FoamLens-Windows-v1.4.6\`.
- Artifact id: \`11267549547\`.
- Size: \`135,241,030 bytes\`.
- Digest: \`sha256:3bfda8cfaebe01e6808861cbf675b5d8f069cf8f2fde81e5bf514154d505d975\`.
- Multi-case runtime fixture: \`QuickCup-MultiCase-Windows-runtime\`.
- Fixture artifact id: \`11268047374\`.
- Size: \`326,073,834 bytes\`.
- Digest: \`sha256:b7e56eb16b0c5138894c9ae12ec02055be4be02d0ebaaa2bfcffe2389ba5bc6c\`.

### Promotion state
- No merge to \`main\`.
- No public release created.
- Public release remains **v1.4.5**.
- Ribbon branch is validated and ready for user review / later promotion.

## 2026-10-03 — v1.4.8 scientific workspace: advanced streamlines, independent views and 3D-defined profiles

- Development branch: `development/v1.4.8-scientific-workspace`.
- Validated product head: `aee2581127c3771b93b4c7fda3177009dd25c652`.
- Base executable/version identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no release-version promotion was performed.
- This line implements the next three prioritized scientific-workspace improvements after the ribbon validation.

### 1. Advanced streamline controls

#### Density bug resolved
- The UI had advertised up to 400 streamline seeds, but `fvSeedPlane()` internally clamped the request to 64.
- The seed-count contract is now 1–400 and the requested Plane/Line/Box count is honored exactly.
- Regression evidence:
  - Plane request 100 -> 100 seeds;
  - Plane request 400 -> 400 seeds;
  - Line request 73 -> 73 seeds;
  - Box request 125 -> 125 seeds.
- The packaged real-case smoke also reports `streamlineSeed400 = 400`.

#### New seeding modes
- Plane.
- Line.
- Box / Volume.
- Boundary patch.
- Boundary-patch mode seeds from actual OpenFOAM boundary faces, ignores processor patches and nudges the seed toward the owner-cell center to avoid immediate integration outside the domain.

#### Integration controls
- Forward / Backward / Both direction.
- Integration step expressed as a percentage of domain diagonal.
- Maximum integration steps per direction.
- Maximum physical path length expressed as a percentage of domain diagonal.
- Streamline metadata now reports actual seed count, generated streamline count and integration-point count.

#### Integration regression
- Uniform-field regression verifies forward and backward propagation.
- Maximum path length is enforced from accumulated geometric distance.
- Both-direction integration produces the combined two-sided path rather than silently behaving as a forward-only trace.
- Synchronized View 2 now uses the same advanced streamline settings rather than the previous Plane-only defaults.

### 2. Independent multi-view cameras and visual settings

#### Camera control
- Added `Link cameras` ON/OFF.
- Added `Re-sync`.
- Added `Fit all`.
- When cameras are linked, View 2 / additional views continue to derive camera orientation and relative distance from the primary view.
- When cameras are unlinked, each comparison viewport owns its own camera state and supports independent orbit, pan, wheel zoom and fit.

#### Visual synchronization
- Added `Sync visual settings` ON/OFF.
- With sync enabled, comparison views retain the shared visual behavior.
- With sync disabled, View 2 can independently control:
  - colormap;
  - opacity;
  - surface visibility;
  - mesh edges;
  - Slice;
  - Iso;
  - Vectors;
  - Streamlines.
- Views 3/4 can independently control:
  - colormap;
  - opacity;
  - surface visibility;
  - mesh edges;
  - Slice;
  - Iso.
- Independent visual mode also prevents the comparison view from forcing a shared display range onto the primary viewport.

#### Runtime evidence
- The packaged WebView2 smoke disables camera linking, zooms View 2 and verifies:
  - `independentCameraChanged = true`;
  - `primaryCameraUnaffected = true`.
- The same smoke disables visual synchronization, applies View 2 opacity independently and verifies:
  - `independentVisualApplied = true`;
  - `linkedCameras = false`;
  - `syncedVisuals = false`.
- Existing View 2 local legend and Probe-marker runtime checks continue to pass.

### 3. Spatial Profile defined directly from the 3D geometry

#### Interactive workflow
- Added `Draw profile` to Field Workspace and the 3D/Field ribbon.
- The user selects point A and point B directly on rendered 3D geometry.
- Picking reuses the same rendered-geometry ray-casting path as the existing Probe tool rather than estimating coordinates from screen position.
- A high-contrast A→B overlay is rendered on the 3D viewport and follows camera redraws.
- Line sampling is configurable from 20 to 500 samples; default is 160.
- Added `Clear line`.

#### Native Spatial Profile integration
- The A→B result is inserted into FoamLens as a normal Spatial Profile series rather than a separate ad-hoc plot.
- Generated series metadata includes:
  - `datasetType = profile`;
  - `profileAxis = s`;
  - `profileLine = 3D A→B`;
  - `profileCoordUnit = m`;
  - `derivedKind = field3d_line_profile`;
  - saved point A / point B / sample count.
- Sampling reuses `fwSampleFieldAtPoint()` and the currently loaded 3D field.
- The same derived profile is refreshed when the active 3D frame changes.

#### Real QuickCup runtime evidence
- B13 real-case smoke at the established late-time reference generated:
  - 160 requested profile samples;
  - 160 finite samples;
  - `profile3DDerivedKind = field3d_line_profile`;
  - `profile3DError = ""`;
  - A→B length = `0.05586143571373727 m`.
- The companion remains the normal Spatial Profile workflow.

### Ribbon integration
- 3D / Field ribbon now exposes:
  - Profile line;
  - Link cameras;
  - Re-sync;
  - Visual sync;
  - Fit all.
- Active state is reflected for Profile line, Link cameras and Visual sync.

### Regression history
- Run #507 validated the advanced-streamline implementation independently: **SUCCESS**.
- Runs #508–#513 exposed stale exact-source assertions in the historical comparison test after camera/legend signatures changed; real QuickCup regression continued to pass. Those tests were updated to validate linked-or-independent camera behavior and palette-aware per-viewport legends.
- Run #514 then completed the full scientific/UI suite, portable smoke, installer smoke and artifact upload successfully.
- Run #518 intentionally strengthened the packaged smoke for independent camera/visual behavior and initially failed because the smoke attempted to access encapsulated `fvState` from global WebView2 scope. Product behavior was not the failing condition.
- The comparison runtime API now exposes primary and comparison view state through `getViewStates()`, and the smoke validates through that public API instead of breaking module encapsulation.

### Final validation
- GitHub Actions run **#520** (`37108477817`): **SUCCESS**.
- Tested product head: `aee2581127c3771b93b4c7fda3177009dd25c652`.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full scientific/UI regression suite: **SUCCESS**.
- 3D Difference regression after independent-view changes: **SUCCESS**.
- Field View / pointField / decomposed mesh / dynamic mesh / iso-surface / Probe / surface-field regressions: **SUCCESS**.
- Advanced streamline regression: **SUCCESS**.
- A→B Spatial Profile regression: **SUCCESS**.
- Ribbon / bilingual / overflow regressions: **SUCCESS**.
- Portable Windows build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- Portable checksum: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Run #520 packaged evidence
- Real B13 reference remained:
  - 6400 cells;
  - 13122 points;
  - `T` at `t = 9.8 s`;
  - min `1417.57 K`;
  - max `1481.90 K`;
  - span `64.33 K`;
  - WebGL error `0`.
- Advanced streamline controls mounted: true.
- 400 requested Plane seeds -> 400 actual seeds.
- 3D A→B profile: 160 points / 160 finite values / `0.05586143571373727 m`.
- Independent View 2 camera changed while primary camera remained unchanged.
- Independent View 2 visual settings applied successfully.
- View 2 local legend remained visible and Probe marker remained functional.

### Candidate artifacts
- Windows build artifact: `FoamLens-Windows-v1.4.6`.
- Artifact id: `11268294037`.
- Size: `135,247,453 bytes`.
- Digest: `sha256:6680f3d074c517faf2d05fff304c4afda69f22bd3cebb4aab2aef5e6cb1dba22`.
- Multi-case runtime fixture: `QuickCup-MultiCase-Windows-runtime`.
- Fixture artifact id: `11269275359`.
- Size: `326,073,834 bytes`.
- Digest: `sha256:24f48cfa5abb90851ba7b9bc3c241fb025a988d6d3078e4cbf7dcd31bda2e442`.

### Scientific validation boundary
- The streamline implementation is covered by analytical/unit regressions, full application regressions and real QuickCup packaged-runtime smoke.
- Direct path-by-path comparison of representative FoamLens streamlines against ParaView/VTK has **not yet been performed**.
- Therefore this work should not yet be described as ParaView-validated or thesis-grade streamline equivalence until that cross-tool validation is completed.

### Promotion state
- No merge to `main`.
- No public release created.
- Public release remains **v1.4.5**.
- The `development/v1.4.8-scientific-workspace` product head is validated and ready for user review / later promotion.

## 2026-10-03 — v1.4.9 scientific compare, thesis export and progressive performance validated

- Development branch: \`development/v1.4.9-compare-export-performance\`.
- Validated product head: \`dd20752a957bf196728dce0922921b37f48655e8\`.
- Base executable/version identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no public version bump or release promotion was performed.
- This line implements the next three prioritized blocks after the v1.4.8 scientific workspace: advanced 3D comparison, thesis/paper multi-panel export, and progressive performance/cache behavior.

### 1. Scientific 3D comparison

#### Physical-time synchronization
- View 2 / comparison views now support:
  - \`Exact\`;
  - \`Nearest\`;
  - \`Interpolated\`.
- Added \`fcTimeBracket()\`, \`fcResolveTime()\`, \`fcInterpolateValues()\` and synchronized scalar/vector loaders.
- Interpolated frames retain the requested physical target time and report the two source times plus interpolation weight.
- Per-viewport time badges are now visible for:
  - A / primary;
  - B / View 2;
  - C / View 3;
  - D / View 4;
  - Difference.
- Nearest mode displays \`Δt\`; Interpolated mode displays its lower↔upper source times.

#### Interpolation safety
- FoamLens refuses temporal interpolation instead of fabricating a result when the two bracketing frames are not scientifically compatible.
- Interpolation is rejected if:
  - field association/storage changes;
  - field dimensions change;
  - field array sizes differ;
  - meshes are not equivalent under the existing strict mesh-equivalence check.
- Vector fields use the same synchronization model. Bracketing vector frames are loaded against compatible meshes and each vector component is interpolated independently.
- Decomposed OpenFOAM vector fields continue to use the existing partition reconstruction path before interpolation.

#### Generalized 3D Difference
- Added Difference modes:
  - Signed: \`A − B\`;
  - Absolute: \`|A − B|\`;
  - Percent of primary A: \`100·(A − B)/max(|A|, ε)\`.
- Added configurable percent epsilon \`ε\` to protect near-zero denominators.
- Signed and Percent use a symmetric difference range; Absolute uses a nonnegative range.
- Difference labels now explicitly identify Signed / Absolute / Percent instead of always describing the viewport as signed.
- Difference colormap is mode-aware:
  - Signed / Percent: diverging cool-warm;
  - Absolute: sequential Turbo.

#### Comparison workflow
- Added \`Swap A/B\`.
- Added \`Copy A → B settings\`.
- Copy A→B transfers compatible region / field / component selections and, when visual sync is disabled, primary visual settings into View 2.
- Swap A/B preserves the physical-time reference, changes the primary and comparison cases deterministically, and avoids the former asynchronous component-selection race.
- Ribbon Compare now exposes both workflows directly.

#### Runtime evidence
- WebView2 startup smoke verified:
  - \`syncModes = ["nearest","exact","interpolate"]\`;
  - \`differenceModes = ["signed","absolute","percent"]\`;
  - interpolation smoke at target \`0.25\` between times \`0\` and \`1\` returned \`weight = 0.25\`, \`interpolated = true\`, \`Δt = 0\`;
  - percent-difference smoke for A=10 / B=8 returned \`20\`;
  - View 3 / View 4 time badges mounted.
- Real multi-case packaged smoke executed the public comparison workflows and verified:
  - \`copySettingsApplied = true\`;
  - \`swapApplied = true\`;
  - \`swapRestored = true\`.
- Existing independent-camera, independent-visual, local-legend and Probe-marker smokes continue to pass.

### 2. Thesis / paper multi-panel export

- Added \`desktop/src/FoamLensDesktop/frontend/v16-multipanel-export.js\`.
- Public runtime API: \`window.FoamLensMultiPanelExport\`.
- Automatically discovers available scientific panels from:
  - primary 3D Field View;
  - View 2 / View 3 / View 4;
  - 3D Difference;
  - current 2D plot / Spatial Profile.
- Supports up to four panels in one composition.
- Layout presets:
  - Auto;
  - 1-up;
  - 2-up;
  - 2×2;
  - 3D + Profile.
- Output presets:
  - Thesis \`2400×1600\`;
  - Thesis Hi-Res \`3200×2000\`;
  - Paper \`2400×1800\`;
  - Presentation \`1920×1080\`.
- Multi-panel figures include:
  - A/B/C/D panel labels;
  - case / field / component / time annotations;
  - per-panel scientific range bar and min/max where applicable;
  - optional custom figure title.
- The current plot / Spatial Profile reuses the existing high-resolution export-composition path when available.
- Separate-panel export now uses the same annotated scientific-composition path rather than exporting an unlabeled raw canvas.
- Export is available from the Ribbon \`Export → Multi-panel\`.

#### Runtime evidence
- Packaged and installed WebView2 smoke composed a real two-panel figure from Primary + View 2.
- Verified:
  - \`multiPanelSourceCount = 2\`;
  - width \`2400\`;
  - height \`1600\`;
  - total \`3,840,000\` output pixels.

#### Export boundary
- The final composition canvas is high-resolution.
- 2D plots can be re-rendered through FoamLens's high-resolution plot export path.
- 3D panels are currently sampled from the viewport's existing WebGL canvas. This work does **not** yet provide an arbitrary-resolution offscreen 3D rerender, so the source raster resolution of each 3D panel remains bounded by its rendered viewport.

### 3. Progressive performance, cache telemetry and viewport-aware loading

#### Progressive frame presentation
- Field View now presents the main surface, statistics, legend and time/status first.
- FoamLens then yields through \`requestAnimationFrame\` so the browser can paint before constructing heavier derived geometry.
- Slice / Iso are built after that paint opportunity.
- Streamlines and prefetch continue after the main frame presentation.
- The existing frame sequence guard is re-checked after the yield, so stale frame work is still cancelled.

#### Adaptive prefetch
- Added \`desktop/src/FoamLensDesktop/frontend/v16-progressive-performance.js\`.
- Prefetch detects navigation direction instead of always loading a fixed neighboring pattern.
- Prefetch depth adapts to observed frame latency:
  - slower frame history → more frames ahead;
  - faster frame history → smaller look-ahead.
- One frame behind the current navigation direction remains eligible for quick reversal.
- Prefetch uses the existing field cache (\`fvLoadFieldSetCached\`) rather than maintaining a duplicate cache.
- Idle scheduling uses \`requestIdleCallback\` where available, with a non-blocking fallback.
- Prefetch is cancelled when Field Workspace is hidden or when the document becomes hidden.

#### Viewport-aware loading
- Visible additional 3D comparison viewports are refreshed concurrently.
- Off-screen additional views are deferred to idle work.
- Video export deliberately bypasses that optimization and uses the exhaustive original refresh path so exported frames are complete.

#### Telemetry
- Added a \`Performance / cache\` panel and Ribbon \`View → Performance\`.
- Telemetry includes:
  - last frame time;
  - average frame time;
  - prefetch hit rate;
  - mesh reuse / mesh build counts;
  - field-cache entries / memory;
  - deferred viewport count.
- Existing GPU/mesh buffers continue to be reused when the mesh remains unchanged; the new work exposes and measures that reuse rather than claiming a separate GPU architecture.

#### Real-case runtime evidence
- Run #539 packaged smoke on the B13-derived runtime fixture reported:
  - \`performancePanelMounted = true\`;
  - \`performanceLoads = 6\`;
  - \`performanceCacheEntries = 4\`;
  - portable \`performanceLastMs ≈ 507.7 ms\`;
  - portable \`performanceAvgMs ≈ 2085.35 ms\`.
- Installed smoke reported approximately:
  - \`performanceLoads = 6\`;
  - \`performanceCacheEntries = 4\`;
  - \`performanceLastMs ≈ 520.9 ms\`;
  - \`performanceAvgMs ≈ 2017.45 ms\`.
- These numbers are runtime telemetry from the smoke sequence, **not** a controlled before/after benchmark and must not be presented as a measured percentage speedup.

### Ribbon integration
- Compare:
  - Swap A/B;
  - Copy A→B.
- Export:
  - Multi-panel.
- View:
  - Performance.

### Automated coverage
- Updated \`desktop/tests/field-compare.test.cjs\` to cover:
  - exact / nearest / interpolated physical-time resolution;
  - interpolation bracketing and weights;
  - rejection outside the available time range;
  - safe scalar and vector interpolation guards;
  - signed / absolute / percent differences;
  - epsilon protection;
  - mode-specific ranges / palettes;
  - per-viewport time badges;
  - Swap A/B and Copy A→B workflow exposure.
- Added \`desktop/tests/multipanel-performance.test.cjs\` covering:
  - multipanel source discovery and composition;
  - Thesis / Paper / Presentation presets;
  - 1-up / 2-up / 2×2 / 3D+Profile layouts;
  - scientific labels / ranges;
  - annotated individual-panel export;
  - progressive rendering yield ordering;
  - stale-frame cancellation;
  - direction-aware adaptive prefetch;
  - cache telemetry;
  - viewport-aware loading;
  - exhaustive video-export exception;
  - ribbon discoverability.
- Workflow now runs **60** scientific/UI regression steps before packaging.

### Regression / validation history
- Early runs #522–#529 were development checkpoints while implementation and exact-source tests were changing.
- Run #529 reached the strict 3D Difference test; the remaining failure was a stale assertion requiring \`coolwarm\` for every Difference mode. The product had intentionally become mode-aware, using Turbo for Absolute and cool-warm for Signed/Percent.
- The regression was updated to require the mode-aware behavior rather than the obsolete fixed palette.
- Run #532 then completed the full 60-test suite, portable smoke, installer smoke and artifact upload successfully with interpolation, multipanel and performance runtime checks.
- Run #538 completed successfully after final comparison-label and annotated-export refinements.
- Run #539 strengthened the packaged runtime smoke again by actually executing Copy A→B, Swap A/B, and Swap back to the original state. All three operations passed in the portable and installed application.

### Final validation
- GitHub Actions run **#539** (\`37110806229\`): **SUCCESS**.
- Validated product head: \`dd20752a957bf196728dce0922921b37f48655e8\`.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full 60-test scientific/UI suite: **SUCCESS**.
- Strict 3D Difference: **SUCCESS**.
- Interpolation / percent-difference runtime math: **SUCCESS**.
- Multi-panel composition runtime smoke: **SUCCESS**.
- Progressive-performance telemetry runtime smoke: **SUCCESS**.
- Copy A→B runtime smoke: **SUCCESS**.
- Swap A/B + restore runtime smoke: **SUCCESS**.
- Existing Field View / Probe / multi-view / streamlines / 3D-profile regressions: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- Portable checksum: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Candidate artifacts
- Windows build artifact: \`FoamLens-Windows-v1.4.6\`.
- Artifact id: \`11270101823\`.
- Size: \`135,272,548 bytes\`.
- Digest: \`sha256:7d6d7ef5d793a335f805f53939251fe3a4a2c88cc5d425b9785a72e04ec490ef\`.
- Multi-case runtime fixture: \`QuickCup-MultiCase-Windows-runtime\`.
- Fixture artifact id: \`11269927034\`.
- Size: \`326,073,834 bytes\`.
- Digest: \`sha256:b1cc5153349936ba6fb65d9a189637d7f1dc1ab1e8bd73e1cc1ca61a53ea22ed\`.

### Remaining scientific / performance boundaries
- Streamline path-by-path comparison against ParaView/VTK remains pending; the streamline module should not yet be described as ParaView-equivalent.
- Progressive-performance mechanisms are active and instrumented, but no controlled before/after benchmark has been run, so no quantitative speedup claim is warranted.
- High-resolution multipanel composition does not yet rerender WebGL 3D scenes offscreen at arbitrary export resolution.

### Promotion state
- No merge to \`main\`.
- No public release created.
- Public release remains **v1.4.5**.
- \`development/v1.4.9-compare-export-performance\` is validated and ready for user review / later promotion.

## 2026-10-03 — FoamLens Desktop v1.4.9 public release published

- Release tag: `v1.4.9`.
- Release name: **FoamLens v1.4.9**.
- GitHub release id: `402430264`.
- Published at: `2026-10-03T09:15:07Z`.
- Release commit / tag source: `597d8d2a9d6fa35a1745e1ee713fb72f7faddf47`.
- Promotion method: clean non-forced fast-forward of `main` after rebuilding the release commit on top of the previous `main` head so the main-only roadmap/audit history was preserved.
- Pull request #6 is closed as merged at the same release commit.
- GitHub Actions run **#542** (`37112111383`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full 60-test scientific/UI regression suite: **SUCCESS**.
- Portable Windows executable build and packaged runtime smoke: **SUCCESS**.
- Installer build and installed-application runtime smoke: **SUCCESS**.
- Publish GitHub Release step: **SUCCESS**.

### Public release assets
- `FoamLens-Portable-v1.4.9.exe`
  - asset id: `607513824`
  - size: `73,101,447 bytes`
  - digest: `sha256:b81626968d6c9a4e9868c7cd9621c99e90ba82a9ca3ab381cccf5ba4d7c6bb8e`
- `FoamLens-Portable-v1.4.9.exe.sha256`
  - asset id: `607513823`
  - size: `96 bytes`
  - digest: `sha256:60351c726c897136f7b6df2b870f30a508f4dfd50a9a5c8f69aacc9f9667aaef`
- `FoamLens-Setup-v1.4.9.exe`
  - asset id: `607513821`
  - size: `67,928,528 bytes`
  - digest: `sha256:444c6d616bafe5a87b3efc21ee62de9945881b3f9ebda06b4ad8df0fd89ca80c`

### Actions artifact
- `FoamLens-Windows-v1.4.9`
  - artifact id: `11270470033`
  - size: `135,272,702 bytes`
  - digest: `sha256:80cca9523ef6c3f1208766e276b618b1bcde1c9bb122cf54c35e658913de9b22`

### State
- **v1.4.9 is now the current public FoamLens Desktop release.**
- Release is not marked draft or prerelease.

## 2026-10-05 — v1.5.0 validation/export/performance boundaries closed

- Development branch: \`development/v1.5.0-validation-export-benchmark\`.
- Validated product head: \`01845b0bce089c910dfd054c380724ab1638f6cf\`.
- Public release remains **FoamLens Desktop v1.4.9**. No version bump, merge to \`main\`, or public release was performed.
- This development line closes the three scientific / export / performance boundaries left explicitly open after v1.4.9:
  1. independent streamline geometry validation against VTK;
  2. true high-resolution WebGL 3D rerendering for multipanel export;
  3. controlled baseline-vs-optimized performance benchmarking.

### 1. Independent streamline validation against VTK

#### Reference implementation
- Added \`desktop/tests/streamline-vtk-reference-input.cjs\` to generate deterministic B13 streamline inputs directly from the real OpenFOAM mesh and \`U\` field.
- Added \`desktop/tests/vtk_streamline_reference.py\` using:
  - VTK 9.7.1;
  - \`vtkOpenFOAMReader\`;
  - \`vtkCellDataToPointData\`;
  - \`vtkStreamTracer\`;
  - Runge-Kutta 2;
  - the same fixed integration step and directional propagation budget used by FoamLens.
- The workflow installs VTK independently and produces a retained \`FoamLens-VTK-streamline-validation\` artifact.

#### FoamLens sampling refinement
- Field View now exposes mesh-aware vector interpolation for streamline integration:
  - cell→point vector reconstruction;
  - tetrahedral local interpolation;
  - explicit containing-cell lookup;
  - reusable mesh vector sampler.
- Streamline integration keeps the existing RK2 trajectory integration but can now consume the mesh-aware sampler instead of the older nearest/IDW-only path.

#### VTK Both-direction topology correction
- Diagnostic runs #614–#623 showed that VTK \`IntegrationDirection=Both\` returns **two output polyline cells per seed** (forward and backward), while FoamLens exposes one combined bidirectional polyline.
- The initial validator was therefore comparing one FoamLens combined path against one VTK directional branch and produced misleading Hausdorff errors despite near-identical path lengths.
- Run #624 corrects the comparison without relaxing thresholds:
  - raw VTK output: 16 lines for 8 seeds;
  - VTK forward/backward branches are paired by seed and combined into 8 bidirectional paths;
  - VTK maximum propagation uses the same effective per-direction fixed-step budget as FoamLens;
  - FoamLens path i is compared directly against the reconstructed VTK path for the same seed.

#### B13 validation result
- Case: real B13-derived OpenFOAM fixture.
- Region: \`metal\`.
- Field: \`U\`.
- Physical time: \`9.8 s\`.
- Compared deterministic seed paths: **8**.
- Effective propagation per direction: \`0.022748468080290594 m\`.
- VTK raw lines: **16**.
- Reconstructed VTK bidirectional lines: **8**.
- Metrics normalized by domain diagonal:
  - mean RMS distance: \`0.001079412105434675\`;
  - worst RMS distance: \`0.005370900274556226\`;
  - worst Hausdorff distance: \`0.012707557766339842\`;
  - mean relative path-length difference: \`1.4196553839305338e-08\`.
- Validation thresholds remained:
  - mean RMS / diagonal ≤ \`0.06\`;
  - worst RMS / diagonal ≤ \`0.10\`;
  - worst Hausdorff / diagonal ≤ \`0.16\`;
  - mean relative length difference ≤ \`0.35\`.
- Result: **PASS**.
- This closes the previous “not independently VTK-validated” boundary for the representative B13 validation configuration. It should still not be generalized to every possible ParaView integration/interpolation setting without matching those settings explicitly.

### 2. True high-resolution 3D multipanel rendering

- Primary Field View renderer now accepts an explicit render size.
- View 2, Difference, and extra comparison views also accept explicit render sizes.
- Public runtime APIs:
  - \`FoamLensFieldView.renderAtSize(width,height)\`;
  - \`FoamLensFieldCompare.renderAtSize(key,width,height)\`.
- \`v16-multipanel-export.js\` now rerenders WebGL 3D sources at the target panel pixel dimensions before composition instead of scaling the existing low-resolution viewport raster.
- After each export render, the original viewport pixel dimensions are restored in a \`finally\` path.

#### Runtime evidence
- Portable packaged smoke requested a primary 3D rerender at **1800×1200**.
- Installed-app smoke repeated the same operation.
- Both reported:
  - \`hiRes3DWidth = 1800\`;
  - \`hiRes3DHeight = 1200\`;
  - \`highResRerendered = true\`;
  - \`primaryRestored = true\`.
- The resulting two-panel scientific composition remained **2400×1600 = 3,840,000 pixels**.
- Existing case/field labels, legend, Probe and independent-view behavior continued to pass after the high-resolution render/restore cycle.

### 3. Controlled performance A/B benchmark

#### Benchmark method
- Added explicit runtime modes:
  - \`baseline\`;
  - \`optimized\`.
- Baseline disables the optimizations being measured:
  - progressive browser-paint yield;
  - adaptive field prefetch;
  - viewport-aware deferred comparison-view loading.
- Optimized mode enables those behaviors.
- Each pass:
  - uses the same stored field-frame sequence;
  - clears FoamLens field cache / inflight state;
  - resets pass telemetry.
- Two rounds alternate execution order:
  - round 1: baseline → optimized;
  - round 2: optimized → baseline.
- Packaged smoke uses 3 frames × 2 rounds = **6 baseline samples + 6 optimized samples**.
- Report schema: \`foamlens-performance-ab-v1\`.
- The smoke requires finite metrics but does **not** require a positive speedup; measured results are reported as observed.

#### Portable Windows smoke result
- Baseline mean: \`725.5666666667288 ms\`.
- Optimized mean: \`671.3166666666511 ms\`.
- Baseline median: \`673.5000000001164 ms\`.
- Optimized median: \`652.1999999999534 ms\`.
- Baseline p95: \`911.5 ms\`.
- Optimized p95: \`744.6999999999534 ms\`.
- Speedup factor: \`1.0808113408973592×\`.
- Mean-time reduction: **7.476914595498646%**.

#### Installed-app smoke result
- Baseline mean: \`740.4166666666279 ms\`.
- Optimized mean: \`677.75 ms\`.
- Baseline median: \`725.75 ms\`.
- Optimized median: \`671.8999999999069 ms\`.
- Baseline p95: \`1005 ms\`.
- Optimized p95: \`776.3000000000466 ms\`.
- Speedup factor: \`1.0924628058526415×\`.
- Mean-time reduction: **8.46370287000083%**.

#### Interpretation boundary
- The benchmark demonstrates a repeatable improvement under the B13 smoke workload on GitHub-hosted Windows runners.
- These percentages are **not** claimed as universal application speedups; different hardware, cases, fields, viewport layouts and cache states may produce different results.

### Automated / runtime validation
- GitHub Actions run **#624** (\`37296824298\`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline comparison: **SUCCESS**.
- Full 60-test scientific/UI regression suite: **SUCCESS**.
- Multi-panel / progressive-performance regression: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable smoke including benchmark and high-resolution WebGL rerender: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application smoke including benchmark and high-resolution WebGL rerender: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Validation artifacts
- \`FoamLens-VTK-streamline-validation\`
  - artifact id: \`11340285640\`;
  - size: \`30,899 bytes\`;
  - digest: \`sha256:4701a1c0944fa53b63cbdaadb5a53ae2d447ab54f2acd745dd949fc10d334342\`.
- \`QuickCup-MultiCase-Windows-runtime\`
  - artifact id: \`11340725615\`;
  - size: \`326,074,466 bytes\`;
  - digest: \`sha256:cebe5547d1b2bf4664505180915c7b67fe496d21a726a4accf5107fe3a19cc2e\`.
- \`FoamLens-Windows-v1.4.9\`
  - artifact id: \`11340051662\`;
  - size: \`135,280,604 bytes\`;
  - digest: \`sha256:739c8fcfef7dfe3efd349fb24c827a21c73ddb73f3c91bc5244661e8187364a0\`.

### State
- The three previously explicit boundaries are now closed on this development branch:
  - representative B13 streamline geometry independently validated against VTK;
  - 3D WebGL export rerendered at requested high-resolution pixel dimensions;
  - controlled before/after performance benchmark executed and measured.
- No merge to \`main\`.
- No new public release.
- Public FoamLens release remains **v1.4.9**.

## 2026-10-05 — persistent workspace UX validated

- Development branch: `development/v1.5.0-validation-export-benchmark`.
- Validated product head: `a97d26f33c01c34eafba2d4ab3c6f931798452df`.
- Public release remains **FoamLens Desktop v1.4.9**. No merge to `main` and no public release were performed.

### Persistent Field Workspace
- Added `v17-workspace-ux.js`.
- FoamLens now stores/restores locally:
  - Split / 3D focus / Plot focus layout;
  - companion plot selection;
  - physical-time follow toggle;
  - comparison enabled state and visible comparison-view count;
  - Difference enabled state and time-sync mode;
  - linked/independent camera state;
  - linked/independent visual-settings state;
  - per-view display names A–D;
  - draggable panel sizes.
- Added Reset layout, which restores the predictable Split + Spatial Profile + linked-camera/visual defaults without modifying OpenFOAM data.

### Per-view names / provenance preservation
- Views A–D may be renamed for presentation use.
- Presentation labels are prepended to, rather than substituted for, the scientific case / field / time labels.
- The implementation keeps the original scientific label in dedicated dataset attributes before applying an alias, preventing repeated refreshes from progressively stripping provenance.

### Comparison status strip
- Added an always-visible comparison summary while Compare 3D is active.
- It reports:
  - A and B case/time context;
  - Exact / Nearest / Interpolated time state and Δt where relevant;
  - same/different physical quantity compatibility;
  - linked/independent cameras;
  - linked/independent visual settings;
  - Difference mode;
  - selected synchronization mode.

### Contextual help / discoverability
- Added `v18-context-help-resize.js`.
- Added Ribbon **View → Help** plus the `?` keyboard shortcut.
- Contextual help covers:
  - Field Workspace;
  - 3D Compare;
  - Scientific Export;
  - View & Layout.
- Escape closes the overlay.
- Help explicitly documents Exact / Nearest / Interpolated sync, comparison status, high-resolution 3D export, view-name semantics and splitter behavior.

### Resizable workspace panels
- Added two draggable vertical splitters:
  - 3D ↔ companion plot;
  - companion plot ↔ controls.
- Minimum widths protect scientific readability:
  - 3D: 280 px;
  - companion plot: 280 px;
  - controls: 260 px.
- Splitter sizes persist in the same Field Workspace state.
- At responsive widths ≤1100 px, splitters are disabled and the workspace stacks vertically instead of forcing desktop dimensions.

### Ribbon integration
- View tab now exposes:
  - View names;
  - Reset layout;
  - Help.
- Existing Performance / Fit / Sidebar / appearance controls remain intact.

### Automated/runtime validation
- Added `desktop/tests/workspace-ux.test.cjs`.
- Added `desktop/tests/context-help-resize.test.cjs`.
- CI suite increased from 60 to **62** tests and the manifest verifies each test runs exactly once.
- Packaged WebView2 runtime smoke now requires:
  - `uxViewNamesPanel`;
  - `uxComparisonStatus`;
  - `uxSplitterA`;
  - `uxSplitterB`;
  - `hrHelpOverlay`;
  - live `FoamLensWorkspaceUx`, `FoamLensWorkspaceResize` and `FoamLensContextHelp` APIs;
  - exactly two workspace splitters.
- GitHub Actions run **#651** (`37303650253`): **SUCCESS**.
- Real QuickCup/B13 regression: **SUCCESS**.
- Independent VTK streamline validation: **SUCCESS**.
- Full 62-test scientific/UI suite: **SUCCESS**.
- Portable build and packaged WebView2 smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Validation artifacts
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11343186219`;
  - size: `30,899 bytes`;
  - digest: `sha256:725152631b566d559106d48e687148fb8603f1b0287b64d208db06da510bc8f8`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11342128295`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:9a0dfe979e3c9d615b09868762c28e037b80157f715bc9819ed20f7f5ca414af`.
- `FoamLens-Windows-v1.4.9`
  - artifact id: `11342907254`;
  - size: `135,286,428 bytes`;
  - digest: `sha256:42e8184b4e26cc7ddff820415d104c24cb5bf46c6524158d49921f3d50e1ef0c`.

### State
- The P2 Workspace / usability items recorded in the original post-v1.4.5 roadmap are now materially closed:
  - persistent layout;
  - per-view naming;
  - compact comparison status;
  - interaction/help discoverability;
  - resizable Field Workspace panels.
- The next incomplete P0 block is vector-glyph analysis: normalized/proportional length, ROI sampling and quantitative sampling validation.

## 2026-10-05 — Infrastructure / cloud audit

Added `docs/INFRASTRUCTURE_AUDIT.md`.

FoamLens remains intentionally local-first for scientific case data. No Google/Supabase backend is required for core analysis. Current infrastructure priorities are automatic updates, version/license reconciliation, shared About migration and preservation of current-HEAD CI validation. Any future cloud feature must be opt-in and must not silently upload OpenFOAM case data.

## 2026-10-05 — Michel's Lab parent/child governance contract

Added the repository-level Michel's Lab governance declaration:

- `.michelslab/project.yml` identifies `realmichelduarte/Michel-Software-Standards` as the shared standards authority.
- `MICHELS_LAB_PROJECT.md` documents the human-readable reporting contract.
- App-specific implementation evidence remains in this repository.
- Reusable/cross-app decisions are promoted to the master standards repository.
- The master repository polls child status centrally; this repository receives no credential that can write to the master.
- Secret values remain prohibited from both repositories.

## 2026-10-05 — v1.5.0 vector analysis + scientific provenance development

- Development branch: `development/v1.5.0-vector-provenance`.
- Base: current public `main` after FoamLens Desktop v1.4.9 publication.
- This block addresses remaining roadmap items under **Vector glyph analysis controls** and **Scientific provenance in the viewport**.

### Implemented
- Added isolated frontend module: `desktop/src/FoamLensDesktop/frontend/v17-vector-analysis.js`.
- Added vector arrow-length semantics:
  - `Magnitude-proportional`;
  - `Normalized / equal length`.
- Added normalized ROI-box sampling controls for X/Y/Z.
- ROI sampling filters candidate cell centers before glyph selection; cells outside the ROI are not eligible.
- Vector metadata now reports:
  - actual glyph count;
  - requested glyph count;
  - eligible ROI-cell count;
  - length mode;
  - ROI bounds;
  - sampled mean magnitude / ROI-field mean magnitude;
  - sampled magnitude-range coverage.
- Added scientific provenance overlay to the primary 3D viewport.
- Added provenance overlays to synchronized View 2 / View 3 / View 4.
- Provenance exposes case, region, field, association, unit when available, physical time, dimensions, synchronization context for comparison views, parser/reconstruction context and source identity.
- Existing v1.4.9 Field View engine remains intact; v17 extends the already-validated module rather than rewriting v14.

### Regression coverage
- Added `desktop/tests/vector-analysis.test.cjs`.
- Workflow now executes the vector-analysis regression exactly once.
- The existing CI manifest will require the new test to remain wired because it checks every `.test.cjs` file against the workflow.

### Direct validation on repository content
- v17 JavaScript syntax validation: **PASS**.
- ROI test with normalized X bounds `0.5–1.0`: selected only cells inside the requested ROI.
- Normalized-length test: two different vector magnitudes produced equal glyph shaft lengths.
- Magnitude-proportional test: the larger vector produced a longer glyph shaft.
- Comparison provenance tokens for A/B/C/D are present.
- Workflow reference count for `vector-analysis.test.cjs`: exactly **1**.

### Validation status
- Latest full CI head: `b6bc2a5e0b10c0df057b0b6a23e4462e8b67e4ae`.
- GitHub Actions run **#664** (`37371845965`) was queued at the time of this log entry.
- This block is **implemented but not yet marked fully validated** until the complete QuickCup + Windows packaging workflow passes.
- No merge to `main`.
- No release created.

## 2026-10-05 — v1.5.0 unified integration candidate

- Integration branch: `integration/v1.5.0-unified`.
- Base block: validated VTK streamline / high-resolution export / controlled performance benchmark / workspace UX branch.
- Integrated block: vector glyph ROI + normalized/proportional length semantics + quantitative sampling metrics + scientific provenance overlays + Michel's Lab governance/infrastructure declarations.
- CI workflow now retains independent VTK validation and also runs `vector-analysis.test.cjs` exactly once.
- No merge to `main` and no public release at this stage; full unified CI validation is required first.

## 2026-10-05 — v1.5.0 CI version-transition incident

The Michel's Lab master governance audit surfaced FoamLens CI as red during the Desktop v1.5.0 release transition.

Evidence:
- failed Windows build runs stopped at `desktop/tests/version-consistency.test.cjs`;
- the failing assertion still expected Desktop `1.4.9` while release work had already advanced the project to `1.5.0`;
- the current default-branch version-consistency test now expects Desktop `1.5.0` and the README identifies Desktop v1.5.0 / frontend v51;
- a newer v1.5.0 workflow run completed successfully;
- the final main-branch publication workflow was still running at the time of this audit note.

Impact:
- the earlier red runs represent an intermediate release-transition mismatch, not evidence that the scientific regression suite itself failed;
- no additional conflicting code patch was applied while the v1.5.0 publication pipeline was active.

Status: **fix present / final main publication validation pending**.



## 2026-10-05 — FoamLens Desktop v1.5.0 public release closed

- Public tag: `v1.5.0`.
- Release name: **FoamLens v1.5.0**.
- GitHub release id: `404110768`.
- Published at: `2026-10-05T21:39:43Z`.
- Main release commit: `d0dcee996b7d0b9068a0475824a243256b103f8d`.
- Promotion PR: **#10**, merged successfully.
- Final publication workflow: GitHub Actions run **#674** (`37376581634`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Full scientific/UI regression suite including vector ROI/provenance, Field Workspace, Probe, synchronized multi-view, strict 3D differences, export and bilingual UI: **SUCCESS**.
- Portable Windows build and packaged smoke test: **SUCCESS**.
- Installer build and installed-application smoke test: **SUCCESS**.
- GitHub Release publication: **SUCCESS**.

### Public release assets
- `FoamLens-Portable-v1.5.0.exe`
  - asset id: `613670549`;
  - size: `73,129,095 bytes`;
  - digest: `sha256:206b583411204a51aa06d291a1ab4583d6846d01966c29c05dc9d8f7d33bd844`.
- `FoamLens-Portable-v1.5.0.exe.sha256`
  - asset id: `613670551`;
  - size: `96 bytes`;
  - digest: `sha256:f0992a3e0b6a90afe7edb2e3dd66b3ade072195d8258aea8f9886344e6686731`.
- `FoamLens-Setup-v1.5.0.exe`
  - asset id: `613670548`;
  - size: `67,953,164 bytes`;
  - digest: `sha256:8d201b50859533e851c78c14df2c29616c194dbf09a1989c0a4d385af0525ca7`.

### Final Actions evidence
- Windows artifact: `FoamLens-Windows-v1.5.0`.
  - artifact id: `11371754114`;
  - size: `135,303,440 bytes`;
  - digest: `sha256:4feb96d752e6464c1385900218ad979dcf04cf84357592958453daa7c79ad076`.
- VTK evidence artifact id: `11371333301`.
- Multi-case runtime fixture artifact id: `11371283366`.

### State
- **FoamLens Desktop v1.5.0 is the current public release.**
- The earlier release-transition note that said final publication validation was pending is superseded by run #674.
- There are no open GitHub issues at release closure.
