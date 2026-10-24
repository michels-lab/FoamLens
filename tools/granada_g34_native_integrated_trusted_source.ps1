# G34 disposable original Windows 1.8.10 real-product residue execution reproduction.
param([Parameter(Mandatory)][string]$Portable,
      [Parameter(Mandatory)][string]$Installer,
      [Parameter(Mandatory)][string]$WitnessDll,
      [Parameter(Mandatory)][string]$MainSha,
      [Parameter(Mandatory)][string]$Report)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Need([bool]$ok,[string]$reason){if(-not $ok){throw $reason}}
function Native([string]$path,[string[]]$options,[string]$stage,[int]$timeout=300000){
 Write-Host "G34 original Windows native: $stage"
 $p=Start-Process -FilePath $path -ArgumentList $options -PassThru
 try {
  if(-not $p.WaitForExit($timeout)){try{$p.Kill($true)}catch{};throw "G34 $stage timed out"}
  Need ($p.ExitCode -eq 0) "G34 $stage exited with a failure"
 }finally{$p.Dispose()}
}
function Smoke([string]$exe,[string]$stage){
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 $start=[DateTime]::UtcNow.AddSeconds(-5)
 Native $exe @('--smoke-test') $stage 360000
 Need (Test-Path -LiteralPath $log) 'G34 real original smoke log absent'
 Need ((Get-Item -LiteralPath $log).LastWriteTimeUtc -gt $start) 'G34 original smoke log stale'
 Need (@(Get-Content -LiteralPath $log -Tail 120 | Where-Object {$_ -like '*FoamLens Windows smoke test passed.*'}).Count -gt 0) 'G34 original WebView2 smoke not passed'
}
function Witness([string]$mode){
 $expected= switch($mode){
  'absent' {'absent'}
  'portable' {'absent'}
  'installed' {'absent'}
  'clear' {'clear'}
  default {throw 'G34 witness invalid test step'}
 }
 & dotnet $script:realWitness $script:realAppRoot $script:realUserProfile $script:markerKey $expected
 Need ($LASTEXITCODE -eq 0) "G34 original same-origin Chromium witness FAILED at $mode"
}
Need ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_OS -eq 'Windows' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted') 'G34 refuses personal Windows machine'
Need ($MainSha -match '^[a-f0-9]{40}$') 'G34 original-main SHA invalid'
$portableExe=(Resolve-Path -LiteralPath $Portable).Path
$originalInstaller=(Resolve-Path -LiteralPath $Installer).Path
$realWitness=(Resolve-Path -LiteralPath $WitnessDll).Path
Need ((Split-Path -Leaf $portableExe) -ceq 'FoamLens.exe') 'G34 requires original Portable'
Need ((Split-Path -Leaf $originalInstaller) -ceq 'FoamLens-Setup-v1.8.10.exe') 'G34 requires original Inno installer'
Need ((Split-Path -Leaf $realWitness) -ceq 'FoamLensG33LocalOriginWitness.dll') 'G34 requires real Chromium witness'
$root=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop'
$realAppRoot=Join-Path $root '1.8.10\app'
$realUserProfile=Join-Path $root 'WebView2'
$markerKey='foamlens:g33:' + [guid]::NewGuid().ToString('N')
$portableValue=[guid]::NewGuid().ToString('N')
$installedValue=[guid]::NewGuid().ToString('N')
$markerScript=Join-Path $realAppRoot 'v99-g34-benign-residue.js'
$readback=Join-Path $realAppRoot 'g34-readback-only.html'
$installation=Join-Path $env:GITHUB_WORKSPACE 'g34-original-installed-FoamLens'
$installedExe=Join-Path $installation 'FoamLens.exe'
$uninstaller=Join-Path $installation 'unins000.exe'
$installed=$false
$reportPath=[IO.Path]::GetFullPath($Report)
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
Need ($reportPath.StartsWith($workspace+'\', [StringComparison]::OrdinalIgnoreCase)) 'G34 evidence report must be inside disposable workspace'
Need (-not(Test-Path -LiteralPath $markerScript)) 'G34 marker already exists; refuse overwrite'
Need (-not(Test-Path -LiteralPath $installation)) 'G34 installation path already exists'
try {
 $bundle=Join-Path $env:GITHUB_WORKSPACE 'product\desktop\src\FoamLensDesktop\AppBundle.zip'
 Need (Test-Path -LiteralPath $bundle) 'G34 original attached bundle missing'
 Add-Type -AssemblyName System.IO.Compression
 $zip=[IO.Compression.ZipFile]::OpenRead($bundle)
 try{
  Need (@($zip.Entries | Where-Object {$_.FullName -ieq 'v99-g34-benign-residue.js'}).Count -eq 0) 'G34 marker unexpectedly belongs to original product'
  Need (@($zip.Entries | Where-Object {$_.FullName -ieq 'index.html'}).Count -eq 1) 'G34 original frontend not attached'
 }finally{$zip.Dispose()}
 Smoke $portableExe 'Portable first clean original startup'
 Need (Test-Path -LiteralPath (Join-Path $realAppRoot 'index.html')) 'G34 native original frontend not materialized'
 Witness 'absent'
 # QA benign synthetic metadata only; no network, private case, or user data.
 [IO.File]::WriteAllText($markerScript, "window.localStorage.setItem('$markerKey','$portableValue');",[Text.Encoding]::UTF8)
 Smoke $portableExe 'Portable restart with stale extra unbundled local module'
 Need (Test-Path -LiteralPath $markerScript) 'G34 test marker unexpectedly deleted instead of ignored'
 Witness 'portable'
 $innoDir='/DIR="' + $installation + '"'
 Native $originalInstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$innoDir) 'genuine original Inno installation'
 $installed=$true
 Need (Test-Path -LiteralPath $installedExe) 'G34 installed product exe absent'
 Need ((Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $portableExe -Algorithm SHA256).Hash) 'G34 installed exe differs from original Portable'
 [IO.File]::WriteAllText($markerScript, "window.localStorage.setItem('$markerKey','$installedValue');",[Text.Encoding]::UTF8)
 Smoke $installedExe 'Installed original startup with stale extra unbundled local module'
 Need (Test-Path -LiteralPath $markerScript) 'G34 test marker unexpectedly deleted instead of ignored in installed'
 Witness 'installed'
 Remove-Item -LiteralPath $markerScript -Force
 Witness 'clear'
 Smoke $portableExe 'Portable after controlled removal of ONLY test marker'
 Witness 'absent'
 Need (Test-Path -LiteralPath $uninstaller) 'G34 original Inno uninstaller unavailable'
 Native $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'genuine original uninstall' 150000
 $installed=$false
 Need (-not(Test-Path -LiteralPath $installedExe)) 'G34 real original Inno uninstall incomplete'
 New-Item -ItemType Directory -Path (Split-Path -Parent $reportPath) -Force | Out-Null
 @{
  schema='foamlens/granada-g34-native-stale-script-repro/1'
  originalMainSha=$MainSha.ToLowerInvariant()
  originalVersion='1.8.10'
  originalSourceWasNotModified=$true
  seededScriptShippedInOfficialBundle=$false
  unbundledScriptBlockedInPatchedPortableWebView2=$true
  unbundledScriptBlockedInPatchedInstalledWebView2=$true
  originalBothDistributionBinariesMatch=$true
  originalCleanRestartNoLongerExecutesMarker=$true
  syntheticMarkerDeleted=$true
  privateCaseRead=$false
  productionHostMergeCompleted=$false
  physicalDeviceReleaseAcceptance=$false
  releaseReady=$false
 }|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host 'G34 PATCHED-CANDIDATE PASS: real native Windows Installed+Portable both ignored unbundled local JavaScript while official original WebView2 smoke passed. Main host still not merged.'
}finally{
 if(Test-Path -LiteralPath $markerScript){Remove-Item -LiteralPath $markerScript -Force -ErrorAction SilentlyContinue}
 if(Test-Path -LiteralPath $readback){Remove-Item -LiteralPath $readback -Force -ErrorAction SilentlyContinue}
 if($installed -and (Test-Path -LiteralPath $uninstaller)){
  try{Native $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'test cleanup Inno uninstall' 150000}
  catch{Write-Warning 'G34 disposable cleanup error; hosted Windows VM is discarded'}
 }
}
