# G29 QA ONLY: actual original Windows v1.8.9 -> exact-main v1.8.10 storage upgrade.
# Never runs on a user's computer, touches real personal data or publishes binaries.
param(
 [Parameter(Mandatory)][string]$OldExe,
 [Parameter(Mandatory)][string]$NewExe,
 [Parameter(Mandatory)][string]$OldInstaller,
 [Parameter(Mandatory)][string]$NewInstaller,
 [Parameter(Mandatory)][string]$ProbeDll,
 [Parameter(Mandatory)][string]$OldSha,
 [Parameter(Mandatory)][string]$MainSha,
 [Parameter(Mandatory)][string]$WorkDir,
 [Parameter(Mandatory)][string]$Report
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Require([bool]$yes,[string]$message) { if(-not $yes){throw $message} }
function Start-And-Wait([string]$file,[string[]]$arguments,[int]$ms,[string]$stage) {
 $p=Start-Process -FilePath $file -ArgumentList $arguments -PassThru
 try {
   if(-not $p.WaitForExit($ms)) {try{$p.Kill($true)}catch{};throw "G29 $stage timed out"}
   Require ($p.ExitCode -eq 0) "G29 $stage returned nonzero native exit code"
 } finally { $p.Dispose() }
}
function NativeSmoke([string]$exe,[string]$stage,[string]$version) {
 Write-Host "G29 real original Windows WebView2 startup: stage=$stage version=$version"
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 $before=[DateTime]::UtcNow.AddSeconds(-5)
 Start-And-Wait $exe @('--smoke-test') 300000 $stage
 Require (Test-Path -LiteralPath $log) "G29 $stage original smoke log missing"
 Require ((Get-Item -LiteralPath $log).LastWriteTimeUtc -ge $before) "G29 $stage original log stale"
 Require (@(Get-Content -LiteralPath $log -Tail 120 | Where-Object {$_ -like '*FoamLens Windows smoke test passed.*'}).Count -gt 0) "G29 $stage original WebView2 success marker missing"
 $front=Join-Path $env:LOCALAPPDATA "FoamLens\Desktop\$version\app\index.html"
 Require ((Test-Path -LiteralPath $front) -and (Get-Item -LiteralPath $front).Length -gt 100000) "G29 $stage original frontend not materialized"
}
function Probe([string]$mode,[string]$app,[string]$originHost='foamlens.local',[string]$useToken='') {
 if($useToken -eq ''){$useToken=$script:token}
 & dotnet $script:probe $mode $script:browserProfile $app $useToken $originHost
 Require ($LASTEXITCODE -eq 0) "G29 genuine WebView2 storage failed mode=$mode host=$originHost"
}
function Install([string]$installer,[string]$stage) {
 Write-Host "G29 actual Inno installer: $stage"
 $destination='/DIR="' + $script:installDir + '"'
 Start-And-Wait $installer @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',$destination) 180000 $stage
 Require (Test-Path -LiteralPath (Join-Path $script:installDir 'FoamLens.exe')) "G29 installed executable missing: $stage"
}
function Uninstall() {
 $uninstaller=Join-Path $script:installDir 'unins000.exe'
 Require (Test-Path -LiteralPath $uninstaller) 'G29 actual Inno uninstaller missing'
 Start-And-Wait $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 120000 'Inno uninstall'
 Require (-not(Test-Path -LiteralPath (Join-Path $script:installDir 'FoamLens.exe'))) 'G29 real uninstall left installed executable'
}
# Hard fail BEFORE app or browser access on anything except disposable Actions Windows.
Require ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted' -and $env:RUNNER_OS -eq 'Windows') 'G29 requires disposable GitHub-hosted Windows runner'
Require ($OldSha -match '^[a-f0-9]{40}$' -and $MainSha -match '^[a-f0-9]{40}$' -and $OldSha -ne $MainSha) 'G29 source commits must represent two distinct originals'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$base=[IO.Path]::GetFullPath($WorkDir).TrimEnd('\')
$reportFile=[IO.Path]::GetFullPath($Report)
Require ($base.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase) -and -not(Test-Path -LiteralPath $base)) 'G29 refuses existing or external working location'
Require ($reportFile.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'G29 refuses external evidence path'
$old=(Resolve-Path -LiteralPath $OldExe).Path
$new=(Resolve-Path -LiteralPath $NewExe).Path
$oldSetup=(Resolve-Path -LiteralPath $OldInstaller).Path
$newSetup=(Resolve-Path -LiteralPath $NewInstaller).Path
$probe=(Resolve-Path -LiteralPath $ProbeDll).Path
Require ((Split-Path -Leaf $old) -ceq 'FoamLens.exe' -and (Split-Path -Leaf $new) -ceq 'FoamLens.exe') 'G29 requires genuine original product binaries'
Require ((Split-Path -Leaf $oldSetup) -ceq 'FoamLens-Setup-v1.8.9.exe' -and (Split-Path -Leaf $newSetup) -ceq 'FoamLens-Setup-v1.8.10.exe') 'G29 two actual original Inno versions missing'
Require ((Split-Path -Leaf $probe) -ceq 'FoamLensG24StorageProbe.dll') 'G29 requires immutable prior genuine WebView2 probe'
$browserProfile=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\WebView2'
$oldFront=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\1.8.9\app'
$newFront=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\1.8.10\app'
$token='G29-cross-version-'+[guid]::NewGuid().ToString('N')
$installDir=Join-Path $base 'FoamLens instalación ñ'
$sentinel=Join-Path $base 'unrelated-work-must-survive.txt'
$browserWritten=$false
$installed=$false
New-Item -ItemType Directory -Path $base -Force | Out-Null
try {
 [IO.File]::WriteAllText($sentinel, 'synthetic unrelated file; G29 '+$OldSha.Substring(0,10))
 $sentinelHash=(Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash
 # Make old original installed v1.8.9 the producer, not a fake browser or synthetic frontend.
 Install $oldSetup 'original v1.8.9 install'
 $installed=$true
 $installedExe=Join-Path $installDir 'FoamLens.exe'
 Require ((Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $old -Algorithm SHA256).Hash) 'G29 actual v1.8.9 installed binary differs from its own Portable'
 NativeSmoke $installedExe 'original old Installed first startup' '1.8.9'
 Probe 'absent' $oldFront
 Probe 'write' $oldFront
 $browserWritten=$true
 NativeSmoke $installedExe 'original old Installed restart' '1.8.9'
 Probe 'verify' $oldFront
 # Prove correct old origin/profile and detect a wrong token; negative MUST fail.
 & dotnet $probe 'verify' $browserProfile $oldFront ($token+'-WRONG') 'foamlens.local'
 Require ($LASTEXITCODE -ne 0) 'G29 negative tampered-token browser readback was incorrectly accepted'
 # Real Inno same AppId and physical installation directory: direct installed-to-installed upgrade.
 Install $newSetup 'in-place genuine 1.8.9 to exact-main 1.8.10 upgrade'
 Require ((Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $new -Algorithm SHA256).Hash) 'G29 actual upgraded installed executable differs from exact original main'
 NativeSmoke $installedExe 'real upgraded Installed 1.8.10 startup' '1.8.10'
 Require ((Test-Path -LiteralPath (Join-Path $oldFront 'index.html')) -and (Test-Path -LiteralPath (Join-Path $newFront 'index.html'))) 'G29 originals did not retain both version-specific frontends'
 Probe 'verify' $newFront
 NativeSmoke $new 'exact-main Portable after original installed version upgrade' '1.8.10'
 Probe 'verify' $newFront
 # Browser readback must depend on secure origin and actual original profile, not physical frontend path.
 Probe 'verify' $oldFront
 & dotnet $probe 'absent' $browserProfile $newFront $token 'isolation.foamlens.local'
 Require ($LASTEXITCODE -eq 0) 'G29 browser origin isolation failed'
 $developer=Join-Path $env:LOCALAPPDATA 'FoamLensDeveloper\Desktop\WebView2'
 & dotnet $probe 'absent' $developer $newFront $token 'foamlens.local'
 Require ($LASTEXITCODE -eq 0) 'G29 Developer separate profile leaked production browser data'
 Uninstall
 $installed=$false
 NativeSmoke $new 'exact-main Portable after real uninstall' '1.8.10'
 Probe 'verify' $newFront
 Probe 'clear' $newFront
 $browserWritten=$false
 Probe 'absent' $newFront
 Require ((Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash -eq $sentinelHash) 'G29 install/upgrade/uninstall changed unrelated file'
 New-Item -ItemType Directory -Path (Split-Path -Parent $reportFile) -Force | Out-Null
 @{
    schema='foamlens/g29-real-cross-version-windows-webview2/1'
    oldOriginalRef='v1.8.9'
    oldOriginalSha=$OldSha
    newOriginalVersion='1.8.10'
    newOriginalSha=$MainSha
    genuineOldNewNativeInstallers=2
    actualInstalledToInstalledUpgrade=$true
    independentBrowserProcessReadback=$true
    realLocalStoragePreserved=$true
    realIndexedDbPreserved=$true
    originIsolationVerified=$true
    developerProfileIsolationVerified=$true
    tamperedTokenRejected=$true
    newPortableAfterUninstallVerified=$true
    preservedUnrelatedFileSha256=$true
    syntheticBrowserKeysCleaned=$true
    userSettingsSchemaMigrationProven=$false
    physicalDpiAndRealUserDataProven=$false
    officialAuthenticodeSigned=$false
    independentlyNumericalScienceProven=$false
    releaseReady=$false
 } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportFile -Encoding utf8
 Write-Host 'G29 PASS: original installed 1.8.9 -> original current-main 1.8.10; real WebView2 LS+IDB preserved, isolated and cleaned'
} finally {
 if($browserWritten -and (Test-Path -LiteralPath (Join-Path $newFront 'index.html'))) {
   try { Probe 'clear' $newFront } catch { Write-Warning 'G29 synthetic cleanup failed; disposable runner will be destroyed' }
 } elseif($browserWritten -and (Test-Path -LiteralPath (Join-Path $oldFront 'index.html'))) {
   try { Probe 'clear' $oldFront } catch { Write-Warning 'G29 synthetic cleanup failed; disposable runner will be destroyed' }
 }
 if($installed -and (Test-Path -LiteralPath (Join-Path $installDir 'unins000.exe'))) {
   try { Uninstall } catch { Write-Warning 'G29 local test-only uninstaller cleanup failed' }
 }
 # Never remove the WebView2 profile; CI's disposable runner is discarded.
}
