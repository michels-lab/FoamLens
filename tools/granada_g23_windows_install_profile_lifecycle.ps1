# G23 QA only: real original-main Windows packaging and user-profile persistence.
# This script intentionally runs ONLY on a fresh GitHub-hosted runner. It does not
# remove real FoamLens user data or modify any local workstation profile.
param(
 [Parameter(Mandatory)][string]$Installer,
 [Parameter(Mandatory)][string]$Portable,
 [Parameter(Mandatory)][string]$TestRoot,
 [Parameter(Mandatory)][string]$OriginalMainSha,
 [Parameter(Mandatory)][string]$Report
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Require([bool]$condition,[string]$message){if(-not $condition){throw $message}}
function Hash([string]$p){return (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()}
function Start-Inno([string]$setup,[string]$dir){
  $arg='/DIR="' + $dir + '"'
  $p=Start-Process -FilePath $setup -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$arg) -PassThru
  if(-not $p.WaitForExit(120000)){try{$p.Kill($true)}catch{};throw 'Actual silent Inno installation timed out'}
  Require ($p.ExitCode -eq 0) "Real Inno installer failed, exit $($p.ExitCode)"
  $app=Join-Path $dir 'FoamLens.exe'
  Require (Test-Path -LiteralPath $app) 'Actual installed FoamLens.exe is missing'
  return $app
}
function Native-Smoke([string]$exe,[string]$label){
  $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
  $begin=[DateTime]::UtcNow.AddSeconds(-3)
  $proc=Start-Process -FilePath $exe -ArgumentList '--smoke-test' -PassThru
  if(-not $proc.WaitForExit(300000)){try{$proc.Kill($true)}catch{};throw "$label: actual WebView2 smoke timed out"}
  Require ($proc.ExitCode -eq 0) "$label: actual FoamLens WebView2 smoke failed"
  Require (Test-Path -LiteralPath $log) "$label: real native smoke did not produce a log"
  Require ((Get-Item -LiteralPath $log).LastWriteTimeUtc -ge $begin) "$label: native smoke marker is stale"
  Require (Select-String -LiteralPath $log -SimpleMatch 'Windows smoke test passed' -Quiet) "$label: native smoke marker missing"
  Write-Host "$label: original Windows executable launched and passed actual WebView2 smoke"
}
function Verify-Sentinels([hashtable]$markers){
  foreach($file in $markers.Keys){
    Require (Test-Path -LiteralPath $file) 'Installer removed original synthetic user-owned state'
    Require ((Hash $file) -eq $markers[$file]) 'Installer changed synthetic user-owned state bytes'
  }
}
# Fail BEFORE ANY INSTALL against a workstation or unsafe/root path.
Require ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted') 'G23 may only alter a disposable GitHub-hosted Windows runner'
Require ($env:RUNNER_OS -eq 'Windows') 'G23 native installer must run on Windows'
Require (-not [string]::IsNullOrWhiteSpace($env:GITHUB_WORKSPACE)) 'No GitHub Actions workspace'
Require ($OriginalMainSha -match '^[a-fA-F0-9]{40}$') 'No exact canonical main product SHA'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$root=[IO.Path]::GetFullPath($TestRoot).TrimEnd('\')
Require ($root.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'Refusing to operate outside disposable GitHub workspace'
Require ($root -ne $workspace -and -not (Test-Path -LiteralPath $root)) 'Refusing to overwrite or reuse any prior installer test root'
$setup=(Resolve-Path -LiteralPath $Installer).Path
$portable=(Resolve-Path -LiteralPath $Portable).Path
Require ($setup -match 'FoamLens-Setup-v\d+\.\d+\.\d+\.exe$') 'Not an official named original Setup binary'
Require ([IO.Path]::GetFileName($portable) -eq 'FoamLens.exe') 'Not the actual original-main portable binary'
$reportFile=[IO.Path]::GetFullPath($Report)
Require ($reportFile.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'Do not export test report outside the disposable workspace'
$profileDir=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop'
$wvDir=Join-Path $profileDir 'WebView2'
$developerDir=Join-Path $env:LOCALAPPDATA 'FoamLensDeveloper\Desktop'
$desktop=[Environment]::GetFolderPath('DesktopDirectory')
$desktopLink=Join-Path $desktop 'FoamLens.lnk'
Require (-not (Test-Path -LiteralPath $desktopLink)) 'Refusing to overwrite existing user shortcut even on a runner'
New-Item -ItemType Directory -Path $root -Force | Out-Null
$installedDir=Join-Path $root 'Install same version ñ 日本'
$portableDir=Join-Path $root 'Portable USB ruta española 日本'
$outside=Join-Path $root 'External user work not owned by Setup.txt'
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null
# Never generate credentials or realistic research values. Synthetic sentinel only.
$stamp='foamlens-g23-'+[guid]::NewGuid().ToString('N')
$markers=@{}
$owned=@()
$uninstalled=$false
try{
  Set-Content -LiteralPath $outside -Encoding utf8 -Value "unrelated user work $stamp"
  $markers[$outside]=Hash $outside
  $relocated=Join-Path $portableDir 'FoamLens.exe'
  Copy-Item -LiteralPath $portable -Destination $relocated -ErrorAction Stop
  Require ((Hash $portable) -eq (Hash $relocated)) 'Portable changed in USB-like relocation'
  Native-Smoke $relocated 'Portable from Unicode/spaces path'
  $installed=Start-Inno $setup $installedDir
  Require ((Hash $installed) -eq (Hash $portable)) 'Installed EXE is not the exact original-main portable bytes'
  Native-Smoke $installed 'First actual Installed run'
  foreach($d in @($profileDir,$wvDir,$developerDir)){New-Item -ItemType Directory -Force -Path $d | Out-Null}
  foreach($pair in @(@($profileDir,'original-user-notes'),@($wvDir,'webview-profile'),@($developerDir,'separate-developer-profile'))){
    $file=Join-Path ([string]$pair[0]) "$stamp-$($pair[1]).json"
    Require (-not(Test-Path -LiteralPath $file)) 'Refusing to overwrite existing user research or settings'
    [IO.File]::WriteAllText($file,('{"source":"synthetic-G23","token":"'+$stamp+'","label":"'+$pair[1]+'"}'),[Text.UTF8Encoding]::new($false))
    $owned+=,$file
    $markers[$file]=Hash $file
  }
  $reinstalled=Start-Inno $setup $installedDir
  Require ((Hash $reinstalled) -eq (Hash $portable)) 'Reinstallation replaced executable with wrong official bytes'
  Verify-Sentinels $markers
  Native-Smoke $reinstalled 'Reinstall with existing user profile'
  Verify-Sentinels $markers
  Require (-not(Test-Path -LiteralPath $desktopLink)) 'Opted-out desktop shortcut appeared after reinstall'
  $uninstaller=Join-Path $installedDir 'unins000.exe'
  Require (Test-Path -LiteralPath $uninstaller) 'Real Inno uninstall executable missing'
  $p=Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -PassThru
  if(-not $p.WaitForExit(120000)){try{$p.Kill($true)}catch{};throw 'Inno uninstall timed out'}
  Require ($p.ExitCode -eq 0) "Real Inno uninstall failed, exit $($p.ExitCode)"
  $uninstalled=$true
  Require (-not(Test-Path -LiteralPath $installed)) 'Uninstaller left original app executable in place'
  Verify-Sentinels $markers
  Require (Test-Path -LiteralPath $relocated) 'Installer/uninstaller removed the independent USB-like Portable app'
  Require (-not(Test-Path -LiteralPath $desktopLink)) 'Uninstaller recreated a forbidden desktop shortcut'
  Native-Smoke $relocated 'Relocated Portable still works after uninstall'
  Verify-Sentinels $markers
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportFile) | Out-Null
  @{
    schema='foamlens/granada-g23-profile-lifecycle/1'
    originalMainSha=$OriginalMainSha
    originalSetupSHA256=(Hash $setup)
    originalPortableSHA256=(Hash $portable)
    installedBytesMatchPortable=$true
    innoInstall=2
    innoUninstall=1
    portableNativeStarts=2
    installedNativeStarts=2
    syntheticProfileSentinelsPreserved=3
    unrelatedExternalFilePreserved=$true
    actualWebView2LocalStorageRoundTripTested=$false
    crossVersionUpgradeTested=$false
    sourceAccuracyIndependentlyCertified=$false
    signedStableReleaseApproved=$false
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportFile -Encoding utf8
  Write-Host 'G23 PASS: real reinstall/uninstall/Unicode Portable; synthetic profile and independent user files untouched'
}finally{
  # Only remove files G23 uniquely created; never recursively delete AppData or WebView2.
  foreach($file in $owned){Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue}
  if(-not $uninstalled){
    $uninstaller=Join-Path $installedDir 'unins000.exe'
    if(Test-Path -LiteralPath $uninstaller){
      try{Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -Wait -ErrorAction Stop}catch{Write-Warning 'CI cleanup must not hide original failure'}
    }
  }
}
