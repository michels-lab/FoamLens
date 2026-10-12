# FoamLENS Windows installer choices — acceptance evidence 2026-10-12

Already in setup: initial welcome screen, full product-specific license with user acceptance requirement, unchecked desktop icon and an optional user-directed taskbar pinning guide. Silent CI install does not replace visual testing of the wizard.

New behavioral test in Windows Actions:
- The normal actual Setup installation explicitly disables the desktop icon task and checks that no Windows desktop shortcut was created while the installed executable runs.
- A separate real Setup installation explicitly opts in with /TASKS=desktopicon; check the shortcut points to its exact FoamLens.exe, check the installed taskbar guide hash, then run its uninstaller and verify shortcut cleanup.
- Split the opt-in and opt-out checks across existing normal and independent installs to avoid Inno's same-AppId uninstall registry reuse during sequential same-directory tests.
- Never modify pre-existing desktop shortcuts or force an OS taskbar pin. Interactive EULA wizard acceptance remains a separate CI gate.

The product version and normal setup design are unchanged; no release authorized.
