# FoamLENS Windows Setup — optional shortcut choices (2026-10-12)

The interactive Inno Setup wizard offers two independent, **unchecked by default** options on the Tasks page:

- **Create a desktop shortcut**: installs a normal user-visible Windows shortcut when explicitly selected.
- **Show how to pin FoamLens to the Windows taskbar after installation**: opens the bundled `TaskbarPinning.txt` instructions on the post-install Finish page when explicitly selected.

Modern Windows taskbar pins are user-controlled, and no supported unattended Inno Setup API can guarantee a pin on Windows 10/11 or on managed devices. Selecting taskbar guidance **does not claim automatic pinning** and will not modify existing pins. No browser or installer shortcut programmatically touches users' taskbar layout.

The actual Setup task regression tests both opt-in `/TASKS=desktopicon,taskbarhelp` and opt-out `/MERGETASKS=!desktopicon,!taskbarhelp` installation choices, verifies installed guide byte-for-byte, the desktop shortcut's real EXE target and removal on uninstall. The interactive Welcome/EULA screenshot, live installer smoke and direct Windows portable/installed scientific smoke remain release gates.

This is an installer UX correction, not a release or permission to bypass exact-binary visual/CI evidence.
