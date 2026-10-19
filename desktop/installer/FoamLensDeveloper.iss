#ifndef MyAppVersion
  #define MyAppVersion "1.8.10"
#endif
#ifndef PublishDir
  #define PublishDir "..\artifacts\developer-publish"
#endif

; Developer twin has its OWN AppId, application folder, shortcuts and uninstall.
; Do not publish the resulting Setup or Portable binaries in public GitHub Releases.
[Setup]
AppId={{F3C6C17D-2CF0-4A29-8CDE-7A19DDF8D6E4}
AppName=FoamLens Developer
AppVersion={#MyAppVersion}
AppPublisher=Michel's Lab
DefaultDirName={autopf}\FoamLens Developer
DefaultGroupName=FoamLens Developer
DisableProgramGroupPage=yes
OutputDir=..\artifacts\developer
OutputBaseFilename=FoamLensDeveloper-Setup-v{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
LicenseFile=..\LICENSE.txt
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=..\src\FoamLensDesktop\Assets\FoamLens.ico
UninstallDisplayIcon={app}\FoamLensDeveloper.exe

[Files]
Source: "{#PublishDir}\FoamLensDeveloper.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\FoamLens Developer"; Filename: "{app}\FoamLensDeveloper.exe"; IconFilename: "{app}\FoamLensDeveloper.exe"
Name: "{autodesktop}\FoamLens Developer"; Filename: "{app}\FoamLensDeveloper.exe"; IconFilename: "{app}\FoamLensDeveloper.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut for FoamLens Developer"; GroupDescription: "Optional shortcuts:"; Flags: unchecked

[Run]
Filename: "{app}\FoamLensDeveloper.exe"; Description: "Launch FoamLens Developer"; Flags: nowait postinstall skipifsilent
