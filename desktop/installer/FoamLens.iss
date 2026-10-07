#ifndef MyAppVersion
  #define MyAppVersion "1.6.1"
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
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=..\src\FoamLensDesktop\Assets\FoamLens.ico
UninstallDisplayIcon={app}\FoamLens.exe

[Files]
Source: "{#PublishDir}\FoamLens.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\FoamLens"; Filename: "{app}\FoamLens.exe"; IconFilename: "{app}\FoamLens.exe"
Name: "{autodesktop}\FoamLens"; Filename: "{app}\FoamLens.exe"; IconFilename: "{app}\FoamLens.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Run]
Filename: "{app}\FoamLens.exe"; Description: "Launch FoamLens"; Flags: nowait postinstall skipifsilent
