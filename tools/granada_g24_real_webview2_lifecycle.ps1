# G24: real original FoamLens WebView2 localStorage + IndexedDB persistence,
# across ACTUAL application restarts, same-version Inno reinstall/uninstall,
# origin/profile isolation and frontend path relocation. QA runner only.
param(
 [Parameter(Mandatory)][string]$Portable,
 [Parameter(Mandatory)][string]$Installer,
 [Parameter(Mandatory)][string]$ProbeDll,
 [Parameter(Mandatory)][string]$Version,
 [Parameter(Mandatory)][string]$OriginalMainSha,
 [Parameter(Mandatory)][string]$Root,
 [Parameter(Mandatory)][string]$Report
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Require([bool]$pass,[string]$reason){if(-not $pass){throw $reason}}
function Execute([string]$label,[string]$program,[string[]]$args,[int]$ms=90000){
 $p=Start-Process -FilePath $program -ArgumentList $args -PassThru -Wait:$false
 if(-not $p.WaitForExit($ms)){try{$p.Kill($true)}catch{};throw "$label timed out"}
 Require ($p.ExitCode -eq 0) "$label process exited nonzero, code $($p.ExitCode)"
}
function NativeApp([string]$app,[string]$name){
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 if(Test-Path -LiteralPath $log){Remove-Item -LiteralPath $log -Force}
 Execute $name $app @('--smoke-test') 300000
 Require (Test-Path -LiteralPath $log) 'Original FoamLens real WebView2 smoke log absent'
 Require (Select-String -LiteralPath $log -SimpleMatch 'Windows smoke test passed' -Quiet) 'Original FoamLens real smoke success marker missing'
 Write-Host ('G24 original application WebView2 pass at '+$name)
}
function Probe([string]$mode,[string]$profile,[string]$app,[string]$host,[bool]$expectPass=$true){
 $args=@($probe,$mode,$profile,$app,$token,$host)
 # Use a .NET process in every stage; no in-process fake localStorage, no DOM injection into original app source.
 & dotnet $probe $mode $profile $app $token $host
 $actual=$LASTEXITCODE
 if($expectPass){Require ($actual -eq 0) "Real WebView2 persistence $mode/$host returned failure"}
 else{Require ($actual -ne 0) 'Invalid expected token was accepted by native browser'}
}
function NativeUninstall([string]$folder){
 $uninstall=Join-Path $folder 'unins000.exe'
 Require (Test-Path -LiteralPath $uninstall) 'Official Inno uninstaller unavailable'
 Execute 'Inno original uninstall' $uninstall @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 120000
}
# Stay wholly on disposable GitHub-hosted Windows. Never run against owner's profile.
Require ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted' -and $env:RUNNER_OS -eq 'Windows') 'G24 requires a disposable GitHub-hosted Windows runner'
Require ($OriginalMainSha -match '^[0-9a-fA-F]{40}$' -and $Version -match '^\d+\.\d+\.\d+$') 'G24 original product identity invalid'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$base=[IO.Path]::GetFullPath($Root).TrimEnd('\')
Require ($base.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase) -and -not(Test-Path -LiteralPath $base)) 'Refuse existing/outside-workspace test destination'
$original=(Resolve-Path -LiteralPath $Portable).Path
$setup=(Resolve-Path -LiteralPath $Installer).Path
$probe=(Resolve-Path -LiteralPath $ProbeDll).Path
Require ([IO.Path]::GetFileName($original) -ceq 'FoamLens.exe') 'G24 needs actual original product exe'
Require ([IO.Path]::GetFileName($setup) -ceq "FoamLens-Setup-v$Version.exe") 'G24 needs same original installer version'
Require ([IO.Path]::GetFileName($probe) -ceq 'FoamLensG24StorageProbe.dll') 'Not original G24 isolated Windows QA harness'
$storageRoot=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop'
$webviewProfile=Join-Path $storageRoot 'WebView2'
$devProfile=Join-Path $env:LOCALAPPDATA 'FoamLensDeveloper\Desktop\WebView2'
$appRoot=Join-Path $storageRoot "$Version\app"
$oldUserIndex=Join-Path $appRoot 'index.html'
$stamp=[guid]::NewGuid().ToString('N')
$token='G24-disposable-validation-'+$stamp
$folder=Join-Path $base 'Installer oficial ruta ñ'
$relocated=Join-Path $base 'Relocated original frontend 日本'
$external=Join-Path $base 'Not-setup-owned-data.txt'
$reportFile=[IO.Path]::GetFullPath($Report)
Require ($reportFile.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'No reports outside runner workspace'
Require (-not (Test-Path -LiteralPath (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'FoamLens.lnk'))) 'Refuse existing desktop shortcut'
New-Item -ItemType Directory -Path $base -Force | Out-Null
$installComplete=$false
$sentinelPresent=$false
try {
  [IO.File]::WriteAllText($external,'unique synthetic work '+$stamp)
  $sentinelHash=(Get-FileHash -LiteralPath $external -Algorithm SHA256).Hash
  NativeApp $original 'first original Portable to materialize exact actual frontend'
  Require (Test-Path -LiteralPath $oldUserIndex) 'Actual original FoamLens app bundle has not been extracted'
  Require ((Get-Item -LiteralPath $oldUserIndex).Length -gt 100000) 'Original frontend is not complete'
  # Before writing any sentinel, prove it is absent in this freshly allocated runner.
  Probe 'absent' $webviewProfile $appRoot 'foamlens.local'
  Probe 'write' $webviewProfile $appRoot 'foamlens.local'
  $sentinelPresent=$true
  # A different REAL WebView2 process and a real original app process must preserve both APIs.
  NativeApp $original 'original Portable restart with WebView2 data already present'
  Probe 'verify' $webviewProfile $appRoot 'foamlens.local'
  # A different folder mapped to SAME original secure FoamLens origin must see exactly same IDB/LS.
  Copy-Item -LiteralPath $appRoot -Destination $relocated -Recurse -Force
  Probe 'verify' $webviewProfile $relocated 'foamlens.local'
  # Origin and Developer userdata stay isolated even with the same physical frontend.
  Probe 'absent' $webviewProfile $relocated 'isolation.foamlens.local'
  Probe 'absent' $devProfile $appRoot 'foamlens.local'
  $destArg='/DIR="' + $folder + '"'
  Execute 'official Inno installation' $setup @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$destArg) 120000
  $installed=Join-Path $folder 'FoamLens.exe'
  Require (Test-Path -LiteralPath $installed) 'Official installed FoamLens.exe missing'
  Require ((Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash) 'Native installed executable mismatched original Portable bytes'
  NativeApp $installed 'genuine installed FoamLens WebView2 profile'
  Probe 'verify' $webviewProfile $appRoot 'foamlens.local'
  # Reinstall same real version while retaining exactly same original WebView2 userData.
  Execute 'same-version Inno reinstall' $setup @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$destArg) 120000
  NativeApp $installed 'genuine reinstalled FoamLens'
  Probe 'verify' $webviewProfile $appRoot 'foamlens.local'
  NativeUninstall $folder
  $installComplete=$true
  Require (-not(Test-Path -LiteralPath $installed)) 'Real uninstaller did not remove installed executable'
  Require (Test-Path -LiteralPath $oldUserIndex) 'Official uninstall removed original FoamLens frontend'
  Require ((Get-FileHash -LiteralPath $external -Algorithm SHA256).Hash -eq $sentinelHash) 'User work modified by install or uninstall'
  NativeApp $original 'original Portable after uninstall'
  Probe 'verify' $webviewProfile $appRoot 'foamlens.local'
  Probe 'verify' $webviewProfile $relocated 'foamlens.local'
  # Explicitly prove cleanup removes only OUR synthetic storage and not app-specific real data.
  Probe 'clear' $webviewProfile $appRoot 'foamlens.local'
  $sentinelPresent=$false
  Probe 'absent' $webviewProfile $appRoot 'foamlens.local'
  Probe 'absent' $webviewProfile $relocated 'foamlens.local'
  Require ((Get-FileHash -LiteralPath $external -Algorithm SHA256).Hash -eq $sentinelHash) 'Cleanup modified unrelated user file'
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportFile) | Out-Null
  @{
    schema='foamlens/granada-g24-native-webview2-storage/1'
    originalProductMainSha=$OriginalMainSha
    originalAppVersion=$Version
    platform='real disposable GitHub-hosted Windows WebView2'
    realFoamLensOrigin='https://foamlens.local'
    genuineAppNativePortableStarts=3
    genuineAppNativeInstalledStarts=2
    realInnoInstalls=2
    realInnoUninstalls=1
    isolatedRealBrowserProcesses=$true
    realLocalStoragePreserved=$true
    realIndexedDbTransactionPreserved=$true
    sameOriginPhysicalFrontendRelocationPreserved=$true
    differentOriginIsolationProven=$true
    developerUserDataIsolationProven=$true
    cleanedOnlyTestKeysAndDatabase=$true
    crossVersionUpgradeVerified=$false
    independentNumericalScienceProven=$false
    actualPublisherSignatureVerified=$false
    physicalDpiOwnerAcceptance=$false
    finalReleaseReady=$false
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportFile -Encoding utf8
  Write-Host 'G24 PASS: REAL localStorage+IndexedDB across original FoamLens native Windows app, relocation, reinstall, uninstall, isolation, cleanup'
}
finally {
  if($sentinelPresent -and (Test-Path -LiteralPath $oldUserIndex)){
    try{Probe 'clear' $webviewProfile $appRoot 'foamlens.local'}catch{Write-Warning 'G24 isolated synthetic browser cleanup failed; hosted runner will be discarded'}
  }
  if(-not $installComplete -and (Test-Path -LiteralPath (Join-Path $folder 'unins000.exe'))){
    try{NativeUninstall $folder}catch{Write-Warning 'G24 native cleanup did not complete'}
  }
  # NEVER delete WebView2 userdata or the original installed frontend; test runner is disposable.
}
