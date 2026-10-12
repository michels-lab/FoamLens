# FoamLENS Windows installer choices — acceptance evidence 2026-10-12

Already in setup: initial welcome screen, full product-specific license with user acceptance requirement, unchecked desktop icon and an optional user-directed taskbar pinning guide. Silent CI install does not replace visual testing of the wizard.

New behavioral test in Windows Actions:
- Execute the real candidate Inno Setup as current user with /TASKS=desktopicon and verify its actual Windows .lnk exists and points to the installed FoamLens.exe.
- Verify the installed taskbar guide matches project source SHA-256.
- Uninstall via the installed uninstaller and verify removal of its own desktop shortcut.
- Install again with /MERGETASKS=!desktopicon; verify no desktop shortcut despite the app and guide being installed, and uninstall.
- Never modify existing user shortcuts or force pins to the taskbar. Separate native screenshot/wizard acceptance remains open.

The unchanged Setup LicenseFile and normal Welcome functionality continue to be checked in windows-icon regression; interactive clicking through the license still requires a separate GUI/wizard observation. No release authorized.
