# G20: real PRIVATE B13 field replay on exact original FoamLens MAIN binaries.
# QA-only script. Never publishes a release or uploads measured CFD inputs.
param(
 [Parameter(Mandatory)][string]$ProductDir,
 [Parameter(Mandatory)][string]$CaseDir,
 [Parameter(Mandatory)][string]$MainSha,
 [Parameter(Mandatory)][string]$Report
)
$ErrorActionPreference='Stop'
$case=(Resolve-Path $CaseDir).Path
$product=(Resolve-Path $ProductDir).Path
$reportPath=[IO.Path]::GetFullPath($Report)
function Check-Exit([string]$label) {
 if($LASTEXITCODE -ne 0){throw "$label FAILED ($LASTEXITCODE)"}
}
function Native-Repeat([string]$variant,[string]$exe) {
 $root=Join-Path (Get-Location) 'artifacts'
 $log=Join-Path $env:LOCALAPPDATA 'FoamLens\Desktop\foamlens-desktop.log'
 for($i=1;$i -le 2;$i++){
  if(Test-Path $log){Remove-Item $log -Force}
  $env:FOAMLENS_SMOKE_SCREENSHOT=Join-Path $root "g20-$variant-$i.png"
  $env:FOAMLENS_SMOKE_LAUNCH_SCREENSHOT=Join-Path $root "g20-$variant-launch-$i.png"
  $p=Start-Process -FilePath $exe -ArgumentList '--smoke-test' -PassThru
  if(-not $p.WaitForExit(300000)){try{$p.Kill($true)}catch{};throw "$variant native timeout at repetition $i"}
  if($p.ExitCode -ne 0 -or -not(Test-Path $log)){throw "$variant native B13 real-source failure at repetition $i"}
  foreach($mark in @('real OpenFOAM packaged runtime smoke passed','Windows smoke test passed')){
   if(-not(Select-String -Path $log -SimpleMatch $mark -Quiet)){throw "$variant real-source native run $i lacks original $mark"}
  }
  Write-Host "Original B13 native $variant start $i: physical fixture OpenFOAM marker + WebView2 smoke PASS"
 }
}
Push-Location $product
try {
 $start=(git rev-parse HEAD).Trim()
 $live=((git ls-remote origin refs/heads/main).Trim() -split '\s+')[0]
 if($start -ne $MainSha -or $live -ne $MainSha){throw 'Candidate not exact current official main'}
 foreach($p in @('desktop/src/FoamLensDesktop/Program.cs','desktop/src/FoamLensDesktop/UpdateAssetIntegrity.cs','desktop/installer/FoamLens.iss')){
  if((git hash-object $p).Trim() -ne (git rev-parse ("HEAD:"+$p)).Trim()){throw "Changed official original main product file $p"}
 }
 node desktop/tests/field-view.test.cjs;Check-Exit 'real Field source tests'
 node desktop/tests/field-loop-playback.test.cjs;Check-Exit 'real Play controls'
 node desktop/tests/multiregion-release-contract.test.cjs;Check-Exit 'physical region contracts'
 node tools/test_repository_boundaries.cjs;Check-Exit 'FoamLens-only code'
 $bundle='desktop/src/FoamLensDesktop/AppBundle.zip'
 if(Test-Path $bundle){Remove-Item $bundle -Force}
 New-Item -ItemType Directory -Force g20-bundle | Out-Null
 Copy-Item desktop/src/FoamLensDesktop/frontend/index.html g20-bundle/index.html
 Copy-Item desktop/src/FoamLensDesktop/frontend/v*-*.js g20-bundle/
 Copy-Item desktop/src/FoamLensDesktop/frontend/assets g20-bundle/assets -Recurse -Force
 Copy-Item desktop/LICENSE.txt g20-bundle/LICENSE.txt
 Compress-Archive -Path g20-bundle/* -DestinationPath $bundle -CompressionLevel Optimal
 Expand-Archive $bundle -DestinationPath g20-verify -Force
 if((Get-FileHash g20-verify/index.html -Algorithm SHA256).Hash -ne (Get-FileHash desktop/src/FoamLensDesktop/frontend/index.html -Algorithm SHA256).Hash){throw 'Official frontend bundle original source hash mismatch'}
 dotnet publish desktop/src/FoamLensDesktop/FoamLensDesktop.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o artifacts/g20-publish
 Check-Exit 'current main binary build'
 $exe=(Resolve-Path artifacts/g20-publish/FoamLens.exe).Path
 $env:FOAMLENS_SMOKE_SOURCE_SHA=$MainSha
 $env:FOAMLENS_SMOKE_OPENFOAM_CASE=$case
 $env:FOAMLENS_SMOKE_MIN_CASES='4'
 $env:FOAMLENS_SMOKE_INITIAL_CASE='SmokeCase_A'
 $env:FOAMLENS_SMOKE_SWITCH_CASE='B13_prghPressure_airGapOF14'
 $env:FOAMLENS_SMOKE_REGION='metal'
 $env:FOAMLENS_SMOKE_EXPECT_REGIONS='metal;mold'
 $env:FOAMLENS_SMOKE_ASYMMETRIC_CASE='SmokeCase_Asymmetric'
 $env:FOAMLENS_SMOKE_FIELD='T'
 $env:FOAMLENS_SMOKE_TIME='9.8'
 $env:FOAMLENS_SMOKE_MIN_FIELD_SPAN='1'
 Native-Repeat 'Portable' $exe
 choco install innosetup --yes --no-progress
 Check-Exit 'Inno installation'
 [xml]$proj=Get-Content desktop/src/FoamLensDesktop/FoamLensDesktop.csproj
 $v=([string]$proj.Project.PropertyGroup.Version).Trim()
 if($v -notmatch '^\d+\.\d+\.\d+$'){throw 'Original main semantic version absent'}
 $iscc=Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Inno Setup 6\ISCC.exe'
 & $iscc "/DMyAppVersion=$v" "/DPublishDir=$((Resolve-Path artifacts/g20-publish).Path)" desktop/installer/FoamLens.iss
 Check-Exit 'real original Inno Setup'
 $setup=(Resolve-Path "desktop/artifacts/FoamLens-Setup-v$v.exe").Path
 $dest=Join-Path (Get-Location) 'artifacts/g20-installed'
 $args=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/MERGETASKS=!desktopicon',('/DIR='+$dest))
 $p=Start-Process -FilePath $setup -ArgumentList $args -PassThru
 if(-not $p.WaitForExit(90000)){try{$p.Kill($true)}catch{};throw 'Real Inno setup install timeout'}
 if($p.ExitCode -ne 0){throw 'Real Inno setup installation failed'}
 $installed=Join-Path $dest 'FoamLens.exe'
 if(-not(Test-Path $installed)){throw 'Real installed original app absent'}
 Native-Repeat 'Installed' $installed
 $remote=((git ls-remote origin refs/heads/main).Trim() -split '\s+')[0]
 if($remote -ne $MainSha -or (git rev-parse HEAD).Trim() -ne $MainSha){throw 'Official main changed while running real fixture'}
 $signatures=@()
 foreach($file in @($exe,$setup)){
  $signatures+=@{filename=[IO.Path]::GetFileName($file);sha256=(Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant();signature=(Get-AuthenticodeSignature $file).Status.ToString()}
 }
 $summary=@{schema='foamlens/granada-g20-exact-main-private-b13/1';originalMainSha=$MainSha;
  realMeasuredB13Imported=$true;sourceCaseIdentities=5;independentPhysicalSimulations=1;
  nativeSmokes=@{Portable=2;Installed=2};signatures=$signatures;
  originalPlayAndSevenCamerasFullGate=$false;physicalDpiAccepted=$false;ownerReviewAccepted=$false;
  numericalAccuracyIndependentlyCertified=$false;releaseReady=$false;releasePublished=$false}
 $summary | ConvertTo-Json -Depth 6 | Set-Content $reportPath -Encoding UTF8
 Write-Host 'G20 COMPLETE: real physical B13 on exact main smoke only; NO official release approval'
} finally {Pop-Location}
