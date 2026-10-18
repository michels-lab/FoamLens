param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [Parameter(Mandatory=$true)][string]$TestRoot
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
# Real Inno Setup /CURRENTUSER install/uninstall, not a simulated checkbox.
$setup=(Resolve-Path -LiteralPath $Installer).Path
$root=[IO.Path]::GetFullPath($TestRoot)
$desktop=[Environment]::GetFolderPath('DesktopDirectory')
if ([string]::IsNullOrWhiteSpace($desktop)) { throw 'Current-user desktop path unavailable' }
$link=Join-Path $desktop 'FoamLens.lnk'
if (Test-Path -LiteralPath $link) { throw "Refusing to replace existing user desktop shortcut: $link" }
$expectedGuide=(Resolve-Path -LiteralPath 'desktop/installer/TaskbarPinning.txt').Path
$installerSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot '../desktop/installer/FoamLens.iss') -Raw
# Taskbar assistance belongs on the final Setup page, unchecked by default.
if($installerSource -notmatch '(?m)^Filename: "\{sys\}\\notepad\.exe";[^\r\n]*Flags: (?=[^\r\n]*\bpostinstall\b)(?=[^\r\n]*\bskipifsilent\b)(?=[^\r\n]*\bunchecked\b)[^\r\n]*$'){
  throw 'Taskbar guide must be an unchecked, skipifsilent postinstall final-page action'
}
if($installerSource -match '(?m)^Name: "taskbarhelp";|^Filename: "\{sys\}\\notepad\.exe";[^\r\n]*Tasks: taskbarhelp'){
  throw 'Taskbar guide must not depend on a prior Tasks-page selection'
}
if($installerSource -notmatch 'Description: "Show how to pin FoamLens to the taskbar"'){
  throw 'Final-page taskbar help must use an explicit user-facing instruction label'
}

function Invoke-FoamSetup([string]$exe,[string]$destination,[bool]$withShortcut) {
  $dirArg='/DIR="' + $destination + '"'
  $args=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER',$dirArg)
  if($withShortcut){$args+='/TASKS=desktopicon'}else{$args+='/MERGETASKS=!desktopicon'}
  $proc=Start-Process -FilePath $exe -ArgumentList $args -PassThru
  if(-not $proc.WaitForExit(90000)){
    try{$proc.Kill($true)}catch{}
    throw 'Inno Setup installer choice test timed out'
  }
  if($proc.ExitCode -ne 0){throw "Inno Setup returned $($proc.ExitCode); shortcut selected=$withShortcut"}
}
function Invoke-FoamUninstall([string]$destination) {
  $uninstaller=Join-Path $destination 'unins000.exe'
  if(-not (Test-Path -LiteralPath $uninstaller)){throw 'Actual installed uninstaller missing'}
  $proc=Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -PassThru
  if(-not $proc.WaitForExit(90000)){
    try{$proc.Kill($true)}catch{}
    throw 'Uninstaller shortcut test timed out'
  }
  if($proc.ExitCode -ne 0){throw "Uninstaller returned $($proc.ExitCode)"}
}
$dir=Join-Path $root 'with shortcut'
try{
  if(Test-Path -LiteralPath $dir){Remove-Item -LiteralPath $dir -Force -Recurse}
  Invoke-FoamSetup $setup $dir $true
  $exe=Join-Path $dir 'FoamLens.exe'
  $help=Join-Path $dir 'TaskbarPinning.txt'
  if(-not (Test-Path -LiteralPath $exe)){throw 'Installed FoamLens.exe missing'}
  if(-not (Test-Path -LiteralPath $help)){throw 'Installed taskbar guide missing'}
  if((Get-FileHash -LiteralPath $expectedGuide -Algorithm SHA256).Hash -ne
     (Get-FileHash -LiteralPath $help -Algorithm SHA256).Hash){
    throw 'Installed taskbar guidance differs from source'
  }
  if(-not (Test-Path -LiteralPath $link)){throw 'Opt-in desktopicon task did not create shortcut'}
  $shortcut=(New-Object -ComObject WScript.Shell).CreateShortcut($link)
  if([IO.Path]::GetFullPath($shortcut.TargetPath) -ne [IO.Path]::GetFullPath($exe)){
    throw "Desktop shortcut target incorrect: $($shortcut.TargetPath)"
  }
  Invoke-FoamUninstall $dir
  if(Test-Path -LiteralPath $link){throw 'Uninstaller left its desktop shortcut behind'}
  Write-Host 'Inno Setup explicit desktopicon opt-in and uninstall cleanup PASS'
}finally{
  $uninstaller=Join-Path $dir 'unins000.exe'
  if(Test-Path -LiteralPath $uninstaller){
    try{Invoke-FoamUninstall $dir}catch{Write-Warning $_.Exception.Message}
  }
  if(Test-Path -LiteralPath $dir){Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue}
}

$optOutDir=Join-Path $root 'without optional tasks'
try{
  if(Test-Path -LiteralPath $optOutDir){Remove-Item -LiteralPath $optOutDir -Force -Recurse}
  Invoke-FoamSetup $setup $optOutDir $false
  if(-not (Test-Path -LiteralPath (Join-Path $optOutDir 'FoamLens.exe'))){
    throw 'Opt-out install did not deploy FoamLens.exe'
  }
  if(-not (Test-Path -LiteralPath (Join-Path $optOutDir 'TaskbarPinning.txt'))){
    throw 'Opt-out install lost the optional taskbar guidance file'
  }
  if(Test-Path -LiteralPath $link){
    throw 'Explicit !desktopicon opt-out still created a desktop shortcut'
  }
  Invoke-FoamUninstall $optOutDir
  Write-Host 'Inno Setup optional-task opt-out and uninstall PASS'
}finally{
  if(Test-Path -LiteralPath (Join-Path $optOutDir 'unins000.exe')){
    try{Invoke-FoamUninstall $optOutDir}catch{Write-Warning $_.Exception.Message}
  }
  if(Test-Path -LiteralPath $optOutDir){Remove-Item -LiteralPath $optOutDir -Recurse -Force -ErrorAction SilentlyContinue}
}
Write-Host 'Real FoamLens installer optional shortcut choices and cleanup PASS'
