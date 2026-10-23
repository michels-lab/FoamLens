# FoamLens GRANADA G14: test-only repeated genuine packaged B13 startup.
# Runs the SAME verified Portable/Installed EXE repeatedly; captures the exact
# read-only original native Play condition and physics evidence on EVERY launch.
# No UI patches, no RC/release, no weakening of the original smoke-test.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$Portable,
 [Parameter(Mandatory=$true)][string]$Installed,
 [Parameter(Mandatory=$true)][string]$CaseRoot,
 [Parameter(Mandatory=$true)][string]$EvidenceRoot,
 [ValidateRange(1,8)][int]$RepeatCount=2
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$sha=(& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[0-9a-f]{40}$') { throw 'G14 exact source SHA unavailable' }
$cases=(Resolve-Path -LiteralPath $CaseRoot).Path
$caseManifest=Join-Path $cases 'granada_b13_manifest.json'
if (-not (Test-Path -LiteralPath $caseManifest)) { throw 'Original B13 source manifest unavailable' }
$manifest=Get-Content $caseManifest -Raw | ConvertFrom-Json
if ($manifest.schema -ne 'FoamLens-Granada-Real-OpenFOAM-B13-v1' -or $manifest.case_names.Count -ne 5) {
 throw 'Real QuickCup B13 five physical case provenance is required'
}
$root=[IO.Path]::GetFullPath($EvidenceRoot)
if (Test-Path -LiteralPath $root) { throw 'Do not overwrite prior G14 repeat evidence' }
New-Item -ItemType Directory -Path $root -Force | Out-Null
$logs=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
$results=New-Object System.Collections.Generic.List[object]
$previous=@{}
$envNames=@(
 'FOAMLENS_BRAND_EVIDENCE_DIR','FOAMLENS_SMOKE_LAUNCH_SCREENSHOT',
 'FOAMLENS_SMOKE_SCREENSHOT','FOAMLENS_SMOKE_SOURCE_SHA',
 'FOAMLENS_GRANADA_G5_NATIVE','FOAMLENS_SMOKE_OPENFOAM_CASE',
 'FOAMLENS_SMOKE_MIN_CASES','FOAMLENS_SMOKE_INITIAL_CASE',
 'FOAMLENS_SMOKE_SWITCH_CASE','FOAMLENS_SMOKE_REGION',
 'FOAMLENS_SMOKE_EXPECT_REGIONS','FOAMLENS_SMOKE_ASYMMETRIC_CASE',
 'FOAMLENS_SMOKE_FIELD','FOAMLENS_SMOKE_TIME','FOAMLENS_SMOKE_MIN_FIELD_SPAN'
)
foreach ($name in $envNames) { $previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
try {
 foreach ($pair in @(@{Variant='portable';Executable=$Portable},@{Variant='installed';Executable=$Installed})) {
  $binary=(Resolve-Path -LiteralPath $pair.Executable).Path
  $binarySha=(Get-FileHash $binary -Algorithm SHA256).Hash.ToLowerInvariant()
  foreach ($repeat in 1..$RepeatCount) {
   $folder=Join-Path $root ($pair.Variant+'-run-'+$repeat)
   New-Item -ItemType Directory -Path $folder -Force | Out-Null
   $env:FOAMLENS_BRAND_EVIDENCE_DIR=$folder
   $env:FOAMLENS_SMOKE_LAUNCH_SCREENSHOT=Join-Path $folder 'launch.png'
   $env:FOAMLENS_SMOKE_SCREENSHOT=Join-Path $folder 'smoke.png'
   $env:FOAMLENS_SMOKE_SOURCE_SHA=$sha
   $env:FOAMLENS_GRANADA_G5_NATIVE='1'
   $env:FOAMLENS_SMOKE_OPENFOAM_CASE=$cases
   $env:FOAMLENS_SMOKE_MIN_CASES='4'
   $env:FOAMLENS_SMOKE_INITIAL_CASE='SmokeCase_A'
   $env:FOAMLENS_SMOKE_SWITCH_CASE='B13_prghPressure_airGapOF14'
   $env:FOAMLENS_SMOKE_REGION='metal'
   $env:FOAMLENS_SMOKE_EXPECT_REGIONS='metal;mold'
   $env:FOAMLENS_SMOKE_ASYMMETRIC_CASE='SmokeCase_Asymmetric'
   $env:FOAMLENS_SMOKE_FIELD='T'
   $env:FOAMLENS_SMOKE_TIME='9.8'
   $env:FOAMLENS_SMOKE_MIN_FIELD_SPAN='1'
   if (Test-Path -LiteralPath $logs) { Remove-Item -LiteralPath $logs -Force }
   $proc=Start-Process -FilePath $binary -ArgumentList '--smoke-test' -PassThru
   $finished=$proc.WaitForExit(480000)
   if (-not $finished) { try { $proc.Kill($true) } catch {} }
   $copied=Join-Path $folder 'native-original-play.log'
   if (Test-Path -LiteralPath $logs) { Copy-Item -LiteralPath $logs -Destination $copied -Force }
   $content=if(Test-Path $copied){Get-Content $copied -Raw}else{''}
   $wide=@($content -split '\r?\n' | Where-Object {$_ -match 'FoamLens real Data/Field screenshot geometry passed: field=' -and $_ -match '"viewport":1140' -and $_ -match 'playNativeTelemetry'}).Count
   $compact=@($content -split '\r?\n' | Where-Object {$_ -match 'FoamLens real Data/Field screenshot geometry passed: field=' -and $_ -match '"viewport":640' -and $_ -match 'playNativeTelemetry'}).Count
   $fail=($content.Contains('Real Field toolbar/canvas geometry or physical region evidence failed') -or
          $content.Contains('"playNotCollapsed":false'))
   # The original executable exit code is NOT sufficient scientific proof.
   # Re-run the existing source-owned OpenFOAM B13 + actual multiregion PNG
   # validator on EVERY new installed/portable restart, not just the first.
   $physicsGateReport=Join-Path $folder 'native-original-b13-physics-gate.json'
   $fieldOriginalPng=Join-Path $folder 'field-real-multiregion.png'
   $physicsGatePass=$false
   if ((Test-Path -LiteralPath $copied) -and (Test-Path -LiteralPath $fieldOriginalPng)) {
    & python tools/granada_real_case_native_gate.py --log $copied --fixture-manifest $caseManifest --field-screenshot $fieldOriginalPng --output $physicsGateReport
    $physicsGatePass=($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $physicsGateReport))
   } else {
    Write-Host "G14 original B13 proof missing on $($pair.Variant) launch $repeat: physical source log or Field PNG absent"
   }
   $good=$finished -and $proc.ExitCode -eq 0 -and $wide -ge 1 -and $compact -ge 1 -and -not $fail -and $physicsGatePass
   $results.Add([pscustomobject]@{
    variant=$pair.Variant;startup=$repeat;source_sha=$sha;binary_sha256=$binarySha;
    real_case='QuickCup B13 metal+mold';expected_physical_time_s=9.8;
    native_exit_code=if($finished){$proc.ExitCode}else{$null};
    wide_1140_measured=$wide -ge 1;compact_640_measured=$compact -ge 1;
    source_bound_b13_field_png_verified=$physicsGatePass;
    field_png_sha256=if($physicsGatePass){(Get-FileHash $fieldOriginalPng -Algorithm SHA256).Hash.ToLowerInvariant()}else{$null};
    real_play_and_physics_pass=$good;human_visual_approved=$false;
    os_physical_dpi_approved=$false
   })
   $summary=Join-Path $root 'granada-g14-packaged-repeat-summary.json'
   [pscustomobject]@{
    schema='foamlens/granada-g14-packaged-play-repetition/1';
    source_sha=$sha;startup_per_variant=$RepeatCount;
    statuses=@($results.ToArray());all_passed=$false;
    release_authorized=$false;human_approved=$false
   } | ConvertTo-Json -Depth 7 | Set-Content $summary -Encoding UTF8
   if (-not $good) {
    Write-Host "G14 real packaged Play FAIL variant=$($pair.Variant) startup=$repeat. Original failure PNG and complete log retained in $folder"
    throw "Original Field/Play/Camera/metal-mold native contract failed on G14 repeat $($pair.Variant) #$repeat"
   }
   Write-Host "G14 genuine packaged B13 PASS variant=$($pair.Variant) startup=$repeat original native Play/Camera/physics 1140+640"
  }
 }
 $summary=Join-Path $root 'granada-g14-packaged-repeat-summary.json'
 [pscustomobject]@{
  schema='foamlens/granada-g14-packaged-play-repetition/1';
  source_sha=$sha;startup_per_variant=$RepeatCount;
  statuses=@($results.ToArray());all_passed=$true;
  release_authorized=$false;human_approved=$false
 } | ConvertTo-Json -Depth 7 | Set-Content $summary -Encoding UTF8
} finally {
 foreach($name in $envNames) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
}
