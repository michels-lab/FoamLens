# GRANADA: internal actual Setup + Portable validation against measured QuickCup B13.
# Does not push, tag, upload software, or publish any release/RC.
[CmdletBinding()]
param([string]$CaseRoot='quickcup-runtime-fixture',
      [string]$OutputRoot='artifacts/granada-installed-portable',
      [string]$Version='1.8.10')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$sha=(& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[0-9a-f]{40}$') { throw 'Source SHA unavailable' }
$caseDir=(Resolve-Path -LiteralPath $CaseRoot).Path
$caseManifest=Join-Path $caseDir 'granada_b13_manifest.json'
if (-not (Test-Path $caseManifest)) { throw 'Real B13 private fixture missing' }
$info=Get-Content -LiteralPath $caseManifest -Raw | ConvertFrom-Json
if ($info.schema -ne 'FoamLens-Granada-Real-OpenFOAM-B13-v1' -or $info.case_names.Count -ne 5) {
    throw 'Original measured metal/mold source provenance incorrect'
}
$root=[IO.Path]::GetFullPath($OutputRoot)
if (Test-Path $root) { throw 'Never overwrite previous Granada packaged evidence' }
$private=Join-Path $root 'temporary-build'
$pub=Join-Path $private 'publish'
$evidence=Join-Path $root 'evidence'
$visual=Join-Path $evidence 'visual'
New-Item -ItemType Directory -Path $pub,$visual -Force | Out-Null
$project='desktop/src/FoamLensDesktop/FoamLensDesktop.csproj'
$portable=Join-Path $pub 'FoamLens.exe'
$setup=Join-Path $private ('FoamLens-Setup-v'+$Version+'.exe')
$installDir=Join-Path $private 'installed'
$installedExe=Join-Path $installDir 'FoamLens.exe'
$log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'

function Assert-Command([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw ($Step+' exited '+$LASTEXITCODE) }
}
function Test-RealB13InRunningExe([string]$Variant,[string]$Binary) {
    if (-not (Test-Path -LiteralPath $Binary)) { throw "$Variant real executable missing" }
    $capture=Join-Path $visual $Variant
    New-Item -ItemType Directory -Force -Path $capture | Out-Null
    $env:FOAMLENS_BRAND_EVIDENCE_DIR=$capture
    $env:FOAMLENS_SMOKE_LAUNCH_SCREENSHOT=Join-Path $evidence ($Variant+'-launch.png')
    $env:FOAMLENS_SMOKE_SCREENSHOT=Join-Path $evidence ($Variant+'-smoke.png')
    $env:FOAMLENS_SMOKE_SOURCE_SHA=$sha
    $env:FOAMLENS_GRANADA_G5_NATIVE='1'
    $env:FOAMLENS_SMOKE_OPENFOAM_CASE=$caseDir
    $env:FOAMLENS_SMOKE_MIN_CASES='4'
    $env:FOAMLENS_SMOKE_INITIAL_CASE='SmokeCase_A'
    $env:FOAMLENS_SMOKE_SWITCH_CASE='B13_prghPressure_airGapOF14'
    $env:FOAMLENS_SMOKE_REGION='metal'
    $env:FOAMLENS_SMOKE_EXPECT_REGIONS='metal;mold'
    $env:FOAMLENS_SMOKE_ASYMMETRIC_CASE='SmokeCase_Asymmetric'
    $env:FOAMLENS_SMOKE_FIELD='T'
    $env:FOAMLENS_SMOKE_TIME='9.8'
    $env:FOAMLENS_SMOKE_MIN_FIELD_SPAN='1'
    if (Test-Path -LiteralPath $log) { Remove-Item -LiteralPath $log -Force }
    $proc=Start-Process -FilePath $Binary -ArgumentList '--smoke-test' -PassThru
    if (-not $proc.WaitForExit(480000)) {
        try { $proc.Kill($true) } catch {}
        throw "$Variant native real-case smoke timed out"
    }
    if ($proc.ExitCode -ne 0) {
        if (Test-Path $log) { Get-Content $log | Select-Object -Last 90 }
        throw "$Variant native real B13 smoke exit code $($proc.ExitCode)"
    }
    if (-not (Test-Path $log)) { throw "$Variant never wrote native smoke log" }
    $saved=Join-Path $evidence ($Variant+'-real-b13.log')
    Copy-Item $log $saved -Force
    & python tools/granada_real_case_native_gate.py --log $saved --fixture-manifest $caseManifest --field-screenshot (Join-Path $capture 'field-real-multiregion.png') --output (Join-Path $evidence ($Variant+'-real-b13-gate.json'))
    Assert-Command "$Variant real metal/mold, View B physical XYZ and PNG proof"
}
Write-Host 'GRANADA internal testing: release candidates are forbidden; no publication.'
& dotnet restore $project -r win-x64
Assert-Command 'dotnet restore'
& dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o $pub
Assert-Command 'actual self-contained portable'
Test-RealB13InRunningExe -Variant portable -Binary $portable

$programs32=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$inno=Join-Path $programs32 'Inno Setup 6\ISCC.exe'
if (-not (Test-Path $inno)) { throw 'Real Inno Setup compiler missing' }
& $inno ('/DMyAppVersion='+$Version) ('/DPublishDir='+$pub) 'desktop/installer/FoamLens.iss'
Assert-Command 'actual installer build'
$innoOutput=Join-Path 'desktop/artifacts' ('FoamLens-Setup-v'+$Version+'.exe')
if (-not (Test-Path $innoOutput)) { throw 'Actual installer missing' }
Copy-Item $innoOutput $setup -Force
$installArgs=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',
    '/CURRENTUSER','/MERGETASKS=!desktopicon',('/DIR="'+$installDir+'"'))
$p=Start-Process -FilePath $setup -ArgumentList $installArgs -PassThru
if (-not $p.WaitForExit(90000)) { try { $p.Kill($true) } catch {};throw 'Installer timeout' }
if ($p.ExitCode -ne 0 -or -not (Test-Path $installedExe)) { throw 'Real setup install failed' }
$uninstaller=Join-Path $installDir 'unins000.exe'
if (-not (Test-Path $uninstaller)) { throw 'No genuine Windows uninstall helper' }
$desktopShortcut=Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'FoamLens.lnk'
if (Test-Path $desktopShortcut) { throw 'Unchecked desktop shortcut was incorrectly created' }
if ((Get-FileHash $installedExe -Algorithm SHA256).Hash -ne (Get-FileHash $portable -Algorithm SHA256).Hash) {
    throw 'Installed EXE differs from exact portable payload'
}
Test-RealB13InRunningExe -Variant installed -Binary $installedExe

$manifest=Join-Path $visual 'manifest.json'
& python tools/make_visual_evidence.py --evidence-dir (Join-Path $visual 'installed') --portable-evidence-dir (Join-Path $visual 'portable') --artifact $setup --portable-artifact $portable --source-sha $sha --platform windows --output $manifest --require-multiregion
Assert-Command 'original 2-viewport live screenshot manifest'
$complete=Join-Path $visual 'granada-g5-all-native-manifest.json'
& python tools/granada_g5_append_native_captures.py --manifest $manifest --setup $setup --portable $portable --output $complete
Assert-Command '20 additional WebView2 workspace screenshots must exist for both REAL variants'
& python tools/visual_release_gate.py --manifest $complete --source-sha $sha --platforms windows --surfaces home,about,data,field,time-series,field-compare,analysis,review,live --capture-only --require-portable --require-multiregion --artifact $setup --portable-artifact $portable
Assert-Command 'Setup/Portable real screenshots and exact binary bindings'
& python tools/granada_packaged_parity_gate.py --portable (Join-Path $evidence 'portable-real-b13-gate.json') --installed (Join-Path $evidence 'installed-real-b13-gate.json') --visual-manifest $complete --source-sha $sha --setup $setup --portable-exe $portable --installed-exe $installedExe --output (Join-Path $evidence 'installed-portable-parity.json')
Assert-Command 'actual installed vs portable B13 scientific and SHA parity'

# G5 remains incomplete until the OTHER five workspace tabs have actual captures.
# Preserve supplemental About scrolled captures in the full science manifest, but
# do not count them as DUPLICATE About workspace tabs in the strict G5 grid.
$g5Manifest=Join-Path $visual 'granada-g5-manifest.json'
& python tools/granada_prepare_g5_review_manifest.py --input $complete --output $g5Manifest
Assert-Command 'strict original G5 one-tab-one-viewport source preparation'
& node tools/granada_visual_review.cjs --manifest $g5Manifest --output (Join-Path $evidence 'granada-g5-review.html') --json (Join-Path $evidence 'granada-g5-review.json') --sha $sha --setup $setup --portable $portable --strict
Assert-Command 'G5 full 36 real captures, awaiting human review'
$g5=Get-Content (Join-Path $evidence 'granada-g5-review.json') -Raw | ConvertFrom-Json
if ($g5.captured_slots -ne 36 -or $g5.required_slots -ne 36 -or
    $g5.status -ne 'REQUIRES_HUMAN_REVIEW' -or $g5.human_approved -ne $false) {
    throw 'Granada G5 failed to capture ALL native tabs or falsely self-approved the visuals'
}

& ./tools/test_installer_wizard_eula.ps1 -Installer $setup -Screenshot (Join-Path $evidence 'installer-eula.png')
if (-not $?) { throw 'Original installer EULA wizard failed' }
& ./tools/test_installer_shortcuts.ps1 -Installer $setup -TestRoot (Join-Path $private 'shortcut-smoke')
if (-not $?) { throw 'Original Windows shortcut selector failed' }
$u=Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -PassThru
if (-not $u.WaitForExit(90000)) { try { $u.Kill($true) } catch {};throw 'Uninstall timeout' }
if ($u.ExitCode -ne 0 -or (Test-Path $installedExe)) { throw 'Native app uninstall failed or EXE remains' }
Write-Host ('GRANADA INTERNAL Setup+Portable real B13 PASS at source SHA '+$sha)
Write-Host 'No RC, no tag, no public binary, no release. All 36 real G5 screenshots captured; visual approval and physical OS DPI still require QA.'
