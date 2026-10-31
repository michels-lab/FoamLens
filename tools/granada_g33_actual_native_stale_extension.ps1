# G49 disposable current original Windows WebView2 residue NON-execution verification.
param([Parameter(Mandatory)][string]$Portable,
      [Parameter(Mandatory)][string]$Installer,
      [Parameter(Mandatory)][string]$WitnessDll,
      [Parameter(Mandatory)][string]$MainSha,
      [Parameter(Mandatory)][string]$Report)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Need([bool]$ok,[string]$reason){if(-not $ok){throw $reason}}
function Native([string]$path,[string[]]$options,[string]$stage,[int]$timeout=300000){
 Write-Host "G33 original Windows native: $stage"
 $p=Start-Process -FilePath $path -ArgumentList $options -PassThru
 try {
  if(-not $p.WaitForExit($timeout)){try{$p.Kill($true)}catch{};throw "G33 $stage timed out"}
  Need ($p.ExitCode -eq 0) "G33 $stage exited with a failure"
 }finally{$p.Dispose()}
}
function Smoke([string]$exe,[string]$stage){
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 $start=[DateTime]::UtcNow.AddSeconds(-5)
 Native $exe @('--smoke-test') $stage 360000
 Need (Test-Path -LiteralPath $log) 'G33 real original smoke log absent'
 Need ((Get-Item -LiteralPath $log).LastWriteTimeUtc -gt $start) 'G33 original smoke log stale'
 Need (@(Get-Content -LiteralPath $log -Tail 120 | Where-Object {$_ -like '*FoamLens Windows smoke test passed.*'}).Count -gt 0) 'G33 original WebView2 smoke not passed'
}
function Witness([string]$mode){
 $expected= switch($mode){
  'absent' {'absent'}
  'portable' {$script:portableValue}
  'installed' {$script:installedValue}
  'clear' {'clear'}
  default {throw 'G33 witness invalid test step'}
 }
 & dotnet $script:realWitness $script:realAppRoot $script:realUserProfile $script:markerKey $expected
 Need ($LASTEXITCODE -eq 0) "G33 original same-origin Chromium witness FAILED at $mode"
}
Need ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_OS -eq 'Windows' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted') 'G33 refuses personal Windows machine'
Need ($MainSha -match '^[a-f0-9]{40}$') 'G33 original-main SHA invalid'
$portableExe=(Resolve-Path -LiteralPath $Portable).Path
$originalInstaller=(Resolve-Path -LiteralPath $Installer).Path
$realWitness=(Resolve-Path -LiteralPath $WitnessDll).Path
Need ((Split-Path -Leaf $portableExe) -ceq 'FoamLens.exe') 'G33 requires original Portable'
Need ((Split-Path -Leaf $originalInstaller) -ceq 'FoamLens-Setup-v1.8.10.exe') 'G33 requires original Inno installer'
Need ((Split-Path -Leaf $realWitness) -ceq 'FoamLensG33LocalOriginWitness.dll') 'G33 requires real Chromium witness'
$root=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop'
$realAppRoot=Join-Path $root '1.8.10\app'
$realUserProfile=Join-Path $root 'WebView2'
$markerKey='foamlens:g33:' + [guid]::NewGuid().ToString('N')
$portableValue=[guid]::NewGuid().ToString('N')
$installedValue=[guid]::NewGuid().ToString('N')
$markerScript=Join-Path $realAppRoot 'v99-g33-benign-residue.js'
$readback=Join-Path $realAppRoot 'g33-readback-only.html'
$installation=Join-Path $env:GITHUB_WORKSPACE 'g33-original-installed-FoamLens'
$installedExe=Join-Path $installation 'FoamLens.exe'
$uninstaller=Join-Path $installation 'unins000.exe'
$installed=$false
$reportPath=[IO.Path]::GetFullPath($Report)
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
Need ($reportPath.StartsWith($workspace+'\', [StringComparison]::OrdinalIgnoreCase)) 'G33 evidence report must be inside disposable workspace'
Need (-not(Test-Path -LiteralPath $markerScript)) 'G33 marker already exists; refuse overwrite'
Need (-not(Test-Path -LiteralPath $installation)) 'G33 installation path already exists'
try {
 $bundle=Join-Path $env:GITHUB_WORKSPACE 'product\desktop\src\FoamLensDesktop\AppBundle.zip'
 Need (Test-Path -LiteralPath $bundle) 'G33 original attached bundle missing'
 Add-Type -AssemblyName System.IO.Compression
 $zip=[IO.Compression.ZipFile]::OpenRead($bundle)
 try{
  Need (@($zip.Entries | Where-Object {$_.FullName -ieq 'v99-g33-benign-residue.js'}).Count -eq 0) 'G33 marker unexpectedly belongs to original product'
  Need (@($zip.Entries | Where-Object {$_.FullName -ieq 'index.html'}).Count -eq 1) 'G33 original frontend not attached'
 }finally{$zip.Dispose()}
 Smoke $portableExe 'Portable first clean original startup'
 Need (Test-Path -LiteralPath (Join-Path $realAppRoot 'index.html')) 'G33 native original frontend not materialized'
 Witness 'absent'
 # QA benign synthetic metadata only; no network, private case, or user data.
 [IO.File]::WriteAllText($markerScript, "window.localStorage.setItem('$markerKey','$portableValue');",[Text.Encoding]::UTF8)
 Smoke $portableExe 'Portable restart with stale extra unbundled local module'
 Witness 'absent'
 $innoDir='/DIR="' + $installation + '"'
 Native $originalInstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$innoDir) 'genuine original Inno installation'
 $installed=$true
 Need (Test-Path -LiteralPath $installedExe) 'G33 installed product exe absent'
 Need ((Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $portableExe -Algorithm SHA256).Hash) 'G33 installed exe differs from original Portable'
 [IO.File]::WriteAllText($markerScript, "window.localStorage.setItem('$markerKey','$installedValue');",[Text.Encoding]::UTF8)
 Smoke $installedExe 'Installed original startup with stale extra unbundled local module'
 Witness 'absent'
 Remove-Item -LiteralPath $markerScript -Force
 Witness 'clear'
 Smoke $portableExe 'Portable after controlled removal of ONLY test marker'
 Witness 'absent'
 Need (Test-Path -LiteralPath $uninstaller) 'G33 original Inno uninstaller unavailable'
 Native $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'genuine original uninstall' 150000
 $installed=$false
 Need (-not(Test-Path -LiteralPath $installedExe)) 'G33 real original Inno uninstall incomplete'
 New-Item -ItemType Directory -Path (Split-Path -Parent $reportPath) -Force | Out-Null
 @{
  schema='foamlens/granada-g49-native-stale-script-block/2'
  originalMainSha=$MainSha.ToLowerInvariant()
  originalVersion='1.8.10'
  originalSourceWasNotModified=$true
  seededScriptShippedInOfficialBundle=$false
  unbundledScriptRanInOriginalPortableWebView2=$false
  unbundledScriptRanInOriginalInstalledWebView2=$false
  originalBothDistributionBinariesMatch=$true
  originalCleanRestartNoLongerExecutesMarker=$true
  syntheticMarkerDeleted=$true
  privateCaseRead=$false
  trustedEmbeddedSourceVerified=$true
  physicalDeviceReleaseAcceptance=$false
  releaseReady=$false
 }|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host 'G49 native provenance PASS: extra local JS did NOT execute in either original Windows Installed or Portable WebView2, trusted-bundle source verified and benign marker cleared. No release acceptance implied.'
}finally{
 if(Test-Path -LiteralPath $markerScript){Remove-Item -LiteralPath $markerScript -Force -ErrorAction SilentlyContinue}
 if(Test-Path -LiteralPath $readback){Remove-Item -LiteralPath $readback -Force -ErrorAction SilentlyContinue}
 if($installed -and (Test-Path -LiteralPath $uninstaller)){
  try{Native $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'test cleanup Inno uninstall' 150000}
  catch{Write-Warning 'G33 disposable cleanup error; hosted Windows VM is discarded'}
 }
}
