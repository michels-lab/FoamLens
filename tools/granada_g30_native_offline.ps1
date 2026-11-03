# G30 native offline proof for the ORIGINAL main FoamLens product.
# Disposable GitHub-hosted Windows only. Never use on a real user's workstation.
param(
 [Parameter(Mandatory)][string]$Portable,
 [Parameter(Mandatory)][string]$Installer,
 [Parameter(Mandatory)][string]$ProbeDll,
 [Parameter(Mandatory)][string]$MainSha,
 [Parameter(Mandatory)][string]$WorkDir,
 [Parameter(Mandatory)][string]$Report
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Require([bool]$ok,[string]$reason){if(-not $ok){throw $reason}}
function Run-Process([string]$exe,[string[]]$arguments,[string]$stage,[int]$timeout=180000){
 $p=Start-Process -FilePath $exe -ArgumentList $arguments -PassThru
 try {
  if(-not $p.WaitForExit($timeout)){try{$p.Kill($true)}catch{};throw "G30 $stage timed out"}
  Require ($p.ExitCode -eq 0) "G30 $stage process returned nonzero"
 } finally {$p.Dispose()}
}
function NativeSmoke([string]$exe,[string]$stage) {
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 $start=[DateTime]::UtcNow.AddSeconds(-5)
 Write-Host "G30 ORIGINAL embedded WebView2 offline smoke: $stage"
 Run-Process $exe @('--smoke-test') $stage 300000
 Require (Test-Path -LiteralPath $log) "G30 $stage smoke log missing"
 Require ((Get-Item -LiteralPath $log).LastWriteTimeUtc -ge $start) "G30 $stage stale smoke"
 Require (@(Get-Content -LiteralPath $log -Tail 120 | Where-Object {$_ -like '*FoamLens Windows smoke test passed.*'}).Count -gt 0) "G30 $stage original real browser smoke did not pass"
 $app=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\1.8.10\app\index.html'
 Require ((Test-Path -LiteralPath $app) -and (Get-Item -LiteralPath $app).Length -gt 100000) "G30 $stage real original frontend missing"
}
function Network-Probe([string]$mode){
 Write-Host "G30 independent WebView2 network verification: $mode"
 & dotnet $script:networkProbe $mode $script:networkProbeProfile
 Require ($LASTEXITCODE -eq 0) "G30 real Chromium network $mode comparison FAILED"
}
function Firewall-Deny([string]$program,[string]$suffix){
 Require (Test-Path -LiteralPath $program) "G30 requested firewall program not found"
 $ruleName = "FoamLens-G30-disposable-$($script:tag)-$suffix"
 New-NetFirewallRule -Name $ruleName -DisplayName $ruleName -Direction Outbound -Action Block -Program $program -Enabled True -Profile Any -ErrorAction Stop | Out-Null
 $script:firewallNames.Add($ruleName)
 $rule=Get-NetFirewallRule -Name $ruleName -ErrorAction Stop
 $filter=$rule | Get-NetFirewallApplicationFilter
 Require ($rule.Action -eq 'Block' -and $rule.Enabled -eq 'True' -and $filter.Program -eq $program) "G30 Windows firewall rule not actually active for program"
 Write-Host "G30 native firewall rule confirmed for $suffix"
}
function Find-ChromiumPrograms {
 $roots=@(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\EdgeWebView\Application'),
  (Join-Path $env:ProgramFiles 'Microsoft\EdgeWebView\Application')
 )
 $paths=New-Object 'System.Collections.Generic.List[string]'
 foreach($folder in $roots) {
  if(Test-Path -LiteralPath $folder){
   foreach($file in @(Get-ChildItem -LiteralPath $folder -Filter 'msedgewebview2.exe' -File -Recurse -ErrorAction Stop)){
    if(-not($paths.Contains($file.FullName))){$paths.Add($file.FullName)}
   }
  }
 }
 # Runtime processes, if already active, reveal actual WebView2 host binary as well.
 foreach($process in @(Get-CimInstance -ClassName Win32_Process -Filter "Name='msedgewebview2.exe'" -ErrorAction SilentlyContinue)){
  if($process.ExecutablePath -and (Test-Path -LiteralPath $process.ExecutablePath) -and -not($paths.Contains($process.ExecutablePath))){
   $paths.Add($process.ExecutablePath)
  }
 }
 return @($paths.ToArray())
}
function Install-Original {
 $dest='/DIR="' + $script:installedDir + '"'
 Write-Host 'G30 original official Inno installation'
 Run-Process $script:originalInstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$dest) 'official native Inno install'
 Require (Test-Path -LiteralPath (Join-Path $script:installedDir 'FoamLens.exe')) 'G30 genuine installed product absent'
 $script:installed=$true
}
function Launch-OriginalNormal([string]$exe,[string]$stage){
 $process=Start-Process -FilePath $exe -PassThru
 $healthy=$false
 try {
  for($i=0;$i -lt 45;$i++){
   Start-Sleep -Seconds 1
   $process.Refresh()
   if($process.HasExited){throw "G30 $stage normal UI exited early"}
   if($process.MainWindowHandle -ne [IntPtr]::Zero -and $process.MainWindowTitle -like '*FoamLens*'){
    $healthy=$true
    break
   }
  }
  Require $healthy "G30 $stage real normal application window never became visible"
  # Stay alive long enough to exercise normal mode's automatic update CHECK under blocked Internet.
  Start-Sleep -Seconds 12
  $process.Refresh()
  Require (-not $process.HasExited) "G30 $stage original normal app exited during offline update check"
  Require ((Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\1.8.10\app\index.html'))) "G30 $stage original local app lost"
  Write-Host "G30 original normal UI alive offline: $stage"
 } finally {
   if(-not $process.HasExited){try{$process.Kill($true)}catch{}}
   $process.Dispose()
 }
}
Require ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted' -and $env:RUNNER_OS -eq 'Windows') 'G30 refuses non-disposable Windows machines'
Require ($MainSha -match '^[a-f0-9]{40}$') 'G30 original source SHA invalid'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$base=[IO.Path]::GetFullPath($WorkDir).TrimEnd('\')
$reportFile=[IO.Path]::GetFullPath($Report)
Require ($base.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase) -and -not(Test-Path -LiteralPath $base)) 'G30 refuses existing or outside-workspace staging directory'
Require ($reportFile.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'G30 refuses user-location output'
$originalPortable=(Resolve-Path -LiteralPath $Portable).Path
$originalInstaller=(Resolve-Path -LiteralPath $Installer).Path
$networkProbe=(Resolve-Path -LiteralPath $ProbeDll).Path
Require ((Split-Path -Leaf $originalPortable) -ceq 'FoamLens.exe') 'G30 requires original executable'
Require ((Split-Path -Leaf $originalInstaller) -ceq 'FoamLens-Setup-v1.8.10.exe') 'G30 requires official original installer'
Require ((Split-Path -Leaf $networkProbe) -ceq 'FoamLensG30BrowserNetworkProbe.dll') 'G30 requires isolated genuine Chromium network probe'
$tag=[guid]::NewGuid().ToString('N')
$installedDir=Join-Path $base 'Original installed FoamLens ñ'
$networkProbeProfile=Join-Path $base 'isolated-Chromium-network-probe'
$firewallNames=New-Object 'System.Collections.Generic.List[string]'
$installed=$false
New-Item -Path $base -ItemType Directory -Force | Out-Null
try {
 $profiles=@(Get-NetFirewallProfile -ErrorAction Stop | Where-Object {$_.Enabled -eq $true})
 Require ($profiles.Count -gt 0) 'G30 Windows Firewall disabled: cannot honestly prove offline'
 # Establish that genuine native Chromium CAN reach same-app official public endpoint before denial.
 Network-Probe 'online'
 $browserPrograms=@(Find-ChromiumPrograms)
 Require ($browserPrograms.Count -gt 0) 'G30 cannot locate genuine Windows WebView2 network executable'
 Install-Original
 $installedExe=Join-Path $installedDir 'FoamLens.exe'
 Require ((Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash -eq
   (Get-FileHash -LiteralPath $originalPortable -Algorithm SHA256).Hash) 'G30 actual installed binary differs from original Portable'
 Firewall-Deny $originalPortable 'portable'
 Firewall-Deny $installedExe 'installed'
 $i=0
 foreach($program in $browserPrograms){Firewall-Deny $program "chromium-$i";$i++}
 # This is the independent fail-closed measurement. Source rules alone do not establish offline.
 Network-Probe 'offline'
 NativeSmoke $originalPortable 'Portable offline cold'
 NativeSmoke $originalPortable 'Portable offline repeat'
 NativeSmoke $installedExe 'Installed offline cold'
 NativeSmoke $installedExe 'Installed offline repeat'
 Launch-OriginalNormal $installedExe 'Installed normal mode while auto-updater checks are blocked'
 Launch-OriginalNormal $originalPortable 'Portable normal mode while auto-updater checks are blocked'
 $uninstaller=Join-Path $installedDir 'unins000.exe'
 Require (Test-Path -LiteralPath $uninstaller) 'G30 genuine native uninstaller unavailable'
 Run-Process $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'genuine uninstall' 120000
 $installed=$false
 Require (-not (Test-Path -LiteralPath $installedExe)) 'G30 original uninstall left executable'
 NativeSmoke $originalPortable 'Portable offline after uninstall'
 Network-Probe 'offline'
 New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportFile) | Out-Null
 @{
   schema='foamlens/g30-actual-native-offline/1'
   originalMainSha=$MainSha
   version='1.8.10'
   originalProductBinariesUnmodified=$true
   originalInstallerPortableSha256Parity=$true
   actualFirewallEnforcementMeasuredWithRealChromium=$true
   realChromiumNetworkSucceededBeforeBlock=$true
   realChromiumNetworkFailedDuringBlock=$true
   nativePortableSmokeCount=3
   nativeInstalledSmokeCount=2
   normalInstalledApplicationRemainedVisible=$true
   normalPortableApplicationRemainedVisible=$true
   actualUninstallCompleted=$true
   publishedBinaryChanged=$false
   independentPhysicalUserDpiProven=$false
   fullOfflineCaseImportProven=$false
   independentScientificAccuracyProven=$false
   finalReleaseReady=$false
 } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportFile -Encoding utf8
 Write-Host 'G30 PASS actual original Windows Installed+Portable WebView2 under independently measured Chromium firewall block (offline)'
} finally {
 foreach($name in @($firewallNames.ToArray())){
  try{Remove-NetFirewallRule -Name $name -ErrorAction Stop} catch{Write-Warning 'G30 disposable firewall cleanup error; hosted runner will be discarded'}
 }
 if($installed -and (Test-Path -LiteralPath (Join-Path $installedDir 'unins000.exe'))){
  try {Run-Process (Join-Path $installedDir 'unins000.exe') @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'test cleanup uninstall' 120000}
  catch {Write-Warning 'G30 disposable original installer cleanup error'}
 }
}
