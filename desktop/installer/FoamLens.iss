#ifndef MyAppVersion
  #define MyAppVersion "1.8.2"
#endif
#ifndef PublishDir
  #define PublishDir "..\artifacts\publish"
#endif
[Setup]
AppId={{D60D5F20-3D55-4C0E-B8C5-4B7F0A5C9E21}
AppName=FoamLens
AppVersion={#MyAppVersion}
AppPublisher=Michel's Lab
DefaultDirName={autopf}\FoamLens
DefaultGroupName=FoamLens
DisableProgramGroupPage=yes
OutputDir=..\artifacts
OutputBaseFilename=FoamLens-Setup-v{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
LicenseFile=..\LICENSE.txt
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=..\src\FoamLensDesktop\Assets\FoamLens.ico
UninstallDisplayIcon={app}\FoamLens.exe

[Files]
Source: "TaskbarPinning.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PublishDir}\FoamLens.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\FoamLens"; Filename: "{app}\FoamLens.exe"; IconFilename: "{app}\FoamLens.exe"
Name: "{autodesktop}\FoamLens"; Filename: "{app}\FoamLens.exe"; IconFilename: "{app}\FoamLens.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Optional shortcuts and guidance:"; Flags: unchecked
Name: "taskbarhelp"; Description: "Show how to pin FoamLens to the Windows taskbar after installation"; GroupDescription: "Optional shortcuts and guidance:"; Flags: unchecked

[Run]
; Windows does not expose a supported unattended taskbar pinning API.
; Taskbar guidance is shown only if explicitly chosen on the Tasks page.
Filename: "{app}\FoamLens.exe"; Description: "Launch FoamLens"; Flags: nowait postinstall skipifsilent
Filename: "{sys}\notepad.exe"; Parameters: """{app}\TaskbarPinning.txt"""; Description: "Show FoamLens taskbar pinning instructions"; Flags: nowait postinstall skipifsilent; Tasks: taskbarhelp
