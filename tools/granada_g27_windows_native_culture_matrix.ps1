param(
 [Parameter(Mandatory)][string]$Portable,
 [Parameter(Mandatory)][string]$Installed,
 [Parameter(Mandatory)][string]$CultureProbe,
 [Parameter(Mandatory)][string]$OriginalMainSha,
 [Parameter(Mandatory)][string]$Output
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
function Guard([bool]$yes,[string]$message){if(-not $yes){throw $message}}
Guard ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted' -and $env:RUNNER_OS -eq 'Windows') 'G27 may change regional Windows settings only in a disposable GitHub-hosted runner'
Guard ($OriginalMainSha -match '^[a-f0-9]{40}$') 'G27 original main SHA absent'
Guard (-not [string]::IsNullOrWhiteSpace($env:GITHUB_WORKSPACE)) 'Missing disposable workspace'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$outputFile=[IO.Path]::GetFullPath($Output)
Guard ($outputFile.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase)) 'Evidence cannot leave disposable workspace'
$exe=(Resolve-Path -LiteralPath $Portable).Path
$installedExe=(Resolve-Path -LiteralPath $Installed).Path
$probe=(Resolve-Path -LiteralPath $CultureProbe).Path
Guard ([IO.Path]::GetFileName($exe) -ceq 'FoamLens.exe') 'Not the actual original FoamLens portable'
Guard ([IO.Path]::GetFileName($installedExe) -ceq 'FoamLens.exe') 'Not the actual original installed FoamLens'
Guard ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash) 'Installed versus Portable exact original binary mismatch'
Guard ([IO.Path]::GetFileName($probe) -ceq 'GranadaG27CultureProbe.exe') 'Independent native .NET locale witness not found'

$originalCulture=[Globalization.CultureInfo]::GetCultureInfo((Get-Culture).Name)
$localeEvidence=@()
$localeNames=@('en-US','es-MX','fr-FR','de-DE')
$log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
try {
 foreach($name in $localeNames){
  Set-Culture -CultureInfo ([Globalization.CultureInfo]::GetCultureInfo($name))
  if($null -eq $LASTEXITCODE) { } # PowerShell cmdlet success is handled by ErrorActionPreference.
  # A separate compiled .NET8 process must actually observe the requested OS user
  # culture. A Set-Culture call alone is NOT proof that the desktop child uses it.
  $witnessLines=@(& $probe $name)
  Guard ($LASTEXITCODE -eq 0) "Independent native culture witness rejected actual locale $name"
  Guard ($witnessLines.Count -eq 1) "Culture witness response ambiguous for $name"
  $witness=$witnessLines[0] | ConvertFrom-Json
  Guard ($witness.schema -eq 'foamlens/granada-g27-native-culture-witness/1') 'Wrong executable or forged witness'
  Guard ($witness.observedCulture -eq $name -and $witness.invariantDecimalNumbersParsed -eq $true) 'Locale is not real or science tokens not invariant'
  foreach($kind in @('portable','installed')){
   $file=if($kind -eq 'portable'){$exe}else{$installedExe}
   $startTime=[DateTime]::UtcNow.AddSeconds(-3)
   $env:FOAMLENS_SMOKE_SOURCE_SHA=$OriginalMainSha
   $p=Start-Process -FilePath $file -ArgumentList @('--smoke-test') -PassThru
   if(-not $p.WaitForExit(300000)){try{$p.Kill($true)}catch{};throw "$($name)/$($kind): real WebView2 native timeout"}
   Guard ($p.ExitCode -eq 0) "$($name)/$($kind): original scientific-parser/WebView2 smoke failed"
   Guard (Test-Path -LiteralPath $log) "$($name)/$($kind): original native smoke log missing"
   Guard ((Get-Item -LiteralPath $log).LastWriteTimeUtc -ge $startTime) "$($name)/$($kind): stale original smoke log"
   Guard (Select-String -LiteralPath $log -SimpleMatch 'Windows smoke test passed' -Quiet) "$($name)/$($kind): original native success log marker absent"
   # The original MAIN RunSmokeTestAsync executes BOTH original
   # RunBinaryMeshParserSelfTest and RunFoamLogParserSelfTestAsync before it can pass.
   $localeEvidence+=@{culture=$name;distribution=$kind;genuineWindowsSmokePassed=$true;
     productionMeshAndFoamLogSelfTestsCompleted=$true}
   Write-Host "G27 actual original native $($kind) WebView2 scientific parse PASS under $($name) decimal $($witness.decimalSeparator)"
  }
 }
} finally {
 # Revert this runner's original user culture even if a native scientific test fails.
 Set-Culture -CultureInfo $originalCulture
 Remove-Item Env:FOAMLENS_SMOKE_SOURCE_SHA -ErrorAction SilentlyContinue
}
Guard ($localeEvidence.Count -eq 8) 'Missing one or more of four real cultures by two native editions'
$last=(Get-Culture).Name
Guard ($last -eq $originalCulture.Name) 'G27 did not restore original Windows regional setting'
$folder=Split-Path -Parent $outputFile
New-Item -ItemType Directory -Force -Path $folder | Out-Null
@{
 schema='foamlens/granada-g27-native-culture-matrix/1'
 originalMainSha=$OriginalMainSha
 actualPortableSHA256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
 actualInstalledSHA256=(Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash.ToLowerInvariant()
 actualIndependentCultures=4
 nativeWinFormsWebView2Starts=8
 nativeNumberParsingVerifiedViaOriginalSmoke=$true
 originalCultureRestored=$true
 cases=$localeEvidence
 realQuickCupNumericsValidated=$false
 full36NativeScreensCaptured=$false
 physicalMonitorDpiValidated=$false
 trustedSignatureValidated=$false
 releasePublished=$false
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outputFile -Encoding utf8
Write-Host 'G27 complete: eight actual original MAIN WinForms scientific-parser + WebView2 starts over 4 real Windows user locales; no release'
