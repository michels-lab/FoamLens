# G37: original Windows FoamLens exact-source real QuickCup B13 repeated Field Play.
# Synthetic metadata report only; B13 and real screenshot files never uploaded.
param([Parameter(Mandatory)][string]$Portable,
      [Parameter(Mandatory)][string]$Installer,
      [Parameter(Mandatory)][string]$CaseRoot,
      [Parameter(Mandatory)][string]$SourceSha,
      [Parameter(Mandatory)][string]$Report)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Need([bool]$ok,[string]$reason){if(-not $ok){throw "G37 $reason"}}
Need (($env:GITHUB_ACTIONS -eq 'true') -and ($env:RUNNER_OS -eq 'Windows') -and ($env:RUNNER_ENVIRONMENT -eq 'github-hosted')) 'refuses user machines'
Need ($SourceSha -match '^[a-f0-9]{40}$') 'exact original Git source SHA required'
$exe=(Resolve-Path -LiteralPath $Portable).Path
$installerExe=(Resolve-Path -LiteralPath $Installer).Path
$fixture=(Resolve-Path -LiteralPath $CaseRoot).Path
Need ((Split-Path -Leaf $exe) -ceq 'FoamLens.exe') 'actual original Portable EXE required'
Need ((Split-Path -Leaf $installerExe) -ceq 'FoamLens-Setup-v1.8.10.exe') 'actual Inno original Setup required'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\')
$reportPath=[IO.Path]::GetFullPath($Report)
Need ($reportPath.StartsWith($workspace+'\', [StringComparison]::OrdinalIgnoreCase)) 'private evidence must remain hosted'
foreach($n in @('SmokeCase_A','SmokeCase_B','SmokeCase_C','SmokeCase_Asymmetric','B13_prghPressure_airGapOF14')){
 Need (Test-Path -LiteralPath (Join-Path $fixture $n)) "missing measured original case $n"
}
foreach($r in @('metal','mold')){
 Need (Test-Path -LiteralPath (Join-Path $fixture ("B13_prghPressure_airGapOF14/9.8/$r/T"))) "missing actual B13 9.8s $r T"
}
$reportDir=Split-Path -Parent $reportPath
$captures=Join-Path $workspace 'g37-private-raw-WebView2'
$installedDir=Join-Path $workspace 'g37-actual-inno-installed'
$installedExe=Join-Path $installedDir 'FoamLens.exe'
$uninstall=Join-Path $installedDir 'unins000.exe'
$log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
$script:attempts=@()
$script:installed=$false
$script:failureEvidence=$null
$success=$false
$reason='none'
$env:FOAMLENS_SMOKE_OPENFOAM_CASE=$fixture
$env:FOAMLENS_SMOKE_MIN_CASES='4'
$env:FOAMLENS_SMOKE_INITIAL_CASE='SmokeCase_A'
$env:FOAMLENS_SMOKE_SWITCH_CASE='B13_prghPressure_airGapOF14'
$env:FOAMLENS_SMOKE_REGION='metal'
$env:FOAMLENS_SMOKE_EXPECT_REGIONS='metal;mold'
$env:FOAMLENS_SMOKE_ASYMMETRIC_CASE='SmokeCase_Asymmetric'
$env:FOAMLENS_SMOKE_FIELD='T'
$env:FOAMLENS_SMOKE_TIME='9.8'
$env:FOAMLENS_SMOKE_MIN_FIELD_SPAN='1'
$env:FOAMLENS_SMOKE_SOURCE_SHA=$SourceSha
Remove-Item Env:FOAMLENS_SMOKE_GPU_READY_FILE -ErrorAction SilentlyContinue

# Failure-only, whitelist-based native evidence. Never upload raw logs, WebView2 profiles,
# screenshots, local case paths or science values. This is NOT a release pass gate.
function Safe-FailureEvidence([string]$nativeLog,[string]$mode,[int]$n,[int]$exitCode){
 $d=[ordered]@{
  mode=$mode; cycle=$n; exitCode=$exitCode
  fieldLayoutFailure=$false
  realQuickCupCompleted=$nativeLog.Contains('FoamLens real OpenFOAM packaged runtime smoke passed:')
  secondViewCompleted=$nativeLog.Contains('FoamLens synchronized View 2 legend/Probe smoke passed:')
  fullNativeSmokeCompleted=$nativeLog.Contains('FoamLens Windows smoke test passed.')
  stage='unknown-native-exit'
 }
 $field=[regex]::Matches($nativeLog,
   'Real Field toolbar/canvas geometry or physical region evidence failed in (?<view>wide|compact): (?<state>\{[^\r\n]*\})')
 if($field.Count -gt 0){
  $last=$field[$field.Count-1]
  $d.fieldLayoutFailure=$true
  $d.stage='field-layout'
  $d.viewport=$last.Groups['view'].Value
  $d.fieldContractJsonParseable=$false
  try{
   $state=ConvertFrom-Json -InputObject $last.Groups['state'].Value -AsHashtable -ErrorAction Stop
   $d.fieldContractJsonParseable=$true
   $flags=[ordered]@{}
   foreach($key in @('ok','cameraDocked','distinctCameras','cameraNamesReadable','fieldNavHidden',
     'playNotCollapsed','cachePopoverValid','regionLegendMeasured','independentRegionPalette',
     'clockMatchesRealFrame','physicalFrameMatches','displayedTimeMatches',
     'clockAriaMatches','clockVisible',
     'playMinWidthAtLeast100','playLabelReady','playPauseLabel','playLoopAriaReady',
     'playTransportContainsPlay','playCompactClassAtWide',
     'playG12StylesheetPresent','playG16StylesheetPresent','playG7StylesheetPresent')){
    if($state.Contains($key)){$flags[$key]=($state[$key] -eq $true)}
   }
   $d.fieldChecks=$flags
   $measure=[ordered]@{}
   foreach($key in @('viewport','canvasWidth','canvasHeight','toolbarHeight','toolbarWidth',
     'toolbarLeft','toolbarRight','toolbarCanvasOverlap','shelfScrollLeft','shelfScrollWidth',
     'shelfClientWidth','clockWidth','clockHeight',
     'playWidth','playHeight','playLeft','playRight','playClientWidth',
     'playScrollWidth','playComputedWidth')){
    if($state.Contains($key) -and $null -ne $state[$key] -and
       $state[$key] -is [ValueType] -and [double]::IsFinite([double]$state[$key])){
      $measure[$key]=[math]::Round([double]$state[$key],2)
    }
   }
   $d.nonScientificPixelMeasures=$measure
  }catch{$d.fieldContractJsonParseable=$false}
 }elseif($nativeLog.Contains('WebView2') -or $nativeLog.Contains('CoreWebView2')){
  $d.stage='webview2-or-host'
 }elseif($nativeLog.Contains('FoamLens real OpenFOAM packaged runtime smoke')){
  $d.stage='scientific-case-or-later'
 }
 $g56=[regex]::Matches($nativeLog,'G56 SAFE FAIL stage=(?<phase>[a-z-]+) code=(?<reason>[a-z-]+)')
 if($g56.Count){
  $lastG56=$g56[$g56.Count-1]
  $d.stage='b13-timeseries-numerical'
  $d.g56Stage=$lastG56.Groups['phase'].Value
  $d.g56Code=$lastG56.Groups['reason'].Value
 }
 return $d
}

function Native-Smoke([string]$app,[string]$variant,[int]$n){
 $folder=Join-Path $captures "$variant-$n"
 New-Item -ItemType Directory -Path $folder -Force | Out-Null
 $env:FOAMLENS_SMOKE_SCREENSHOT=Join-Path $folder 'native-smoke.png'
 $env:FOAMLENS_SMOKE_LAUNCH_SCREENSHOT=Join-Path $folder 'native-launch.png'
 $env:FOAMLENS_BRAND_EVIDENCE_DIR=Join-Path $folder 'screens'
 $doG56=($variant -eq 'portable' -and $n -eq 1)
 if($doG56){$env:FOAMLENS_SMOKE_TIMESERIES_B13='1'}else{Remove-Item Env:FOAMLENS_SMOKE_TIMESERIES_B13 -ErrorAction SilentlyContinue}
 if(Test-Path -LiteralPath $log){Remove-Item -LiteralPath $log -Force}
 Write-Host "G37 GENUINE PRIVATE B13 native $variant attempt $n/3: 1140+640px Field Play and real metal/mold"
 $p=Start-Process -FilePath $app -ArgumentList @('--smoke-test') -PassThru
 try{
  if(-not $p.WaitForExit(300000)){try{$p.Kill($true)}catch{};throw "$variant/$n original smoke timed out"}
  if($p.ExitCode -ne 0){
   $rawFailure=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
   $script:failureEvidence=Safe-FailureEvidence $rawFailure $variant $n ([int]$p.ExitCode)
   Write-Host ("G37 SANITIZED FAILURE (no private scientific values): " +
     ($script:failureEvidence|ConvertTo-Json -Depth 5 -Compress))
  }
  Need ($p.ExitCode -eq 0) "$variant/$n real OpenFOAM/Play original product FAILED"
 }finally{$p.Dispose();Remove-Item Env:FOAMLENS_SMOKE_TIMESERIES_B13 -ErrorAction SilentlyContinue}
 Need (Test-Path -LiteralPath $log) "$variant/$n original native logfile missing"
 $raw=[IO.File]::ReadAllText($log)
 Need ($raw.Contains('FoamLens real OpenFOAM packaged runtime smoke passed:')) "$variant/$n real B13 scientific case not validated"
 Need ($raw.Contains('FoamLens synchronized View 2 legend/Probe smoke passed:')) "$variant/$n measured B13 second Field/Probe view missing"
 Need ($raw.Contains('FoamLens Windows smoke test passed.')) "$variant/$n original 1140/640 native Field Play check failed"
 if($doG56){Need ($raw.Contains('FoamLens original B13 two-region Time Series numeric smoke passed:')) "$variant/$n real B13 original two-region numerical histories failed"}
 Need ([regex]::Matches($raw,'FoamLens real OpenFOAM packaged runtime smoke passed:').Count -eq 1) "$variant/$n recycled/ambiguous source physics log"
 foreach($png in @('field-wide.png','field-compact.png')){
  $picture=Join-Path $env:FOAMLENS_BRAND_EVIDENCE_DIR $png
  Need ((Test-Path -LiteralPath $picture) -and (Get-Item -LiteralPath $picture).Length -gt 10000) "$variant/$n real native $png absent"
 }
 $script:attempts+=@{
  mode=$variant
  cycle=$n
  originalProductNativeExit=$true
  measuredB13MetalAndMoldOriginalSource=$true
  originalB13TwoRegionTimeSeriesNumbersVerified=$doG56
  realFieldPlayWide1140AndCompact640=$true
  bothOriginalWebView2FieldPng=$true
 }
}
function Run-Inno([string]$path,[string[]]$installOptions,[string]$label){
 Write-Host "G37 actual original Inno $label"
 $p=Start-Process -FilePath $path -ArgumentList $installOptions -PassThru
 try{
  if(-not $p.WaitForExit(120000)){try{$p.Kill($true)}catch{};throw "$label timed out"}
  Need ($p.ExitCode -eq 0) "$label returned nonzero"
 }finally{$p.Dispose()}
}
try{
 Need (-not(Test-Path -LiteralPath $captures)) 'preexisting evidence directory, refuses overwrite'
 Need (-not(Test-Path -LiteralPath $installedDir)) 'preexisting Inno installation, refuses overwrite'
 New-Item -ItemType Directory -Path $captures -Force|Out-Null
 $installOptions=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',('/DIR="'+$installedDir+'"'))
 Run-Inno $installerExe $installOptions 'Setup'
 Need (Test-Path -LiteralPath $installedExe) 'native installed binary missing'
 $script:installed=$true
 Need ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $installedExe -Algorithm SHA256).Hash) 'installed binary not identical to Portable'
 # Inno is installed BEFORE any native FoamLens instance, avoiding residual WebView2
 # child process/installer file-lock contention after repeated Portable startup.
 # Then alternate both genuinely identical distribution binaries on same physical B13,
 # retaining three fresh starts for each without changing actual app behavior.
 foreach($n in 1..3){
  Native-Smoke $exe 'portable' $n
  Native-Smoke $installedExe 'installed' $n
 }
 Run-Inno $uninstall @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'Uninstall'
 $script:installed=$false
 Need (-not(Test-Path -LiteralPath $installedExe)) 'native installed binary left after uninstall'
 Need ($script:attempts.Count -eq 6) 'six fresh real native original B13 Field/Play cases required'
 Need (@($script:attempts|Where-Object {$_.originalB13TwoRegionTimeSeriesNumbersVerified -eq $true}).Count -eq 1) 'original B13 two-region numeric evidence required'
 $success=$true
 Write-Host 'G37 PASS actual real B13 native 3 Portable+3 Installed, original 1140/640 Play and metal/mold'
}catch{
 $reason='native-or-physics-gate-failure'
 Write-Warning "G37 native stress FAIL: $($_.Exception.Message)"
}finally{
 if($script:installed -and (Test-Path -LiteralPath $uninstall)){
  try{Run-Inno $uninstall @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') 'cleanup'}catch{Write-Warning 'G37 disposable cleanup failed'}
 }
 New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
 @{
  schema='foamlens/granada-g37-actual-b13-stress/1'
  sourceSha=$SourceSha.ToLowerInvariant()
  originalProductSourceUntouched=$true
  expectedPortableStarts=3
  expectedInstalledStarts=3
  completedAttempts=@($script:attempts)
  realNativeB13SixCycleGatePassed=$success
  originalInnoInstalledAndUninstalled=$success
  publishedRealCaseFilesOrImages=$false
  physicalWindowsDpiAcceptance=$false
  humanVisual36Accepted=$false
  originalProductReleaseReady=$false
  failureKind=$reason
  sanitizedFailure=$script:failureEvidence
 } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
 if(Test-Path -LiteralPath $captures){Remove-Item -LiteralPath $captures -Recurse -Force -ErrorAction SilentlyContinue}
}
if(-not $success){throw 'G37 original Windows private B13 6-cycle Field Play native acceptance FAILED'}
