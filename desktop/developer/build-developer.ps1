param(
    [switch]$SkipInstaller
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Set-Location $root
$proj='desktop/src/FoamLensDesktop/FoamLensDesktop.csproj'
$projectFolder='desktop/src/FoamLensDesktop'
$bundle=Join-Path $projectFolder 'AppBundle.zip'
if(-not (Test-Path $bundle)){
  $tmp=Join-Path ([System.IO.Path]::GetTempPath()) ('FoamLensDeveloperBundle-'+[guid]::NewGuid().ToString('N'))
  try {
    New-Item -ItemType Directory -Force $tmp | Out-Null
    Copy-Item (Join-Path $projectFolder 'frontend/index.html') (Join-Path $tmp 'index.html')
    Copy-Item (Join-Path $projectFolder 'frontend/v*-*.js') $tmp
    Copy-Item (Join-Path $projectFolder 'frontend/assets') $tmp -Recurse
    Copy-Item 'desktop/LICENSE.txt' $tmp
    Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $bundle -CompressionLevel Optimal -Force
  } finally { if(Test-Path $tmp){Remove-Item $tmp -Recurse -Force} }
}
$publish='desktop/artifacts/developer-publish'
$msb='obj/developer/'
dotnet restore $proj -r win-x64 -p:FoamLensDeveloper=true -p:MSBuildProjectExtensionsPath=$msb -p:BaseIntermediateOutputPath=$msb
if($LASTEXITCODE -ne 0){throw 'Developer restore failed'}
dotnet publish $proj -r win-x64 -c Release --self-contained true --no-restore -p:FoamLensDeveloper=true -p:MSBuildProjectExtensionsPath=$msb -p:BaseIntermediateOutputPath=$msb -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $publish
if($LASTEXITCODE -ne 0){throw 'Developer publish failed'}
$exe=Join-Path $publish 'FoamLensDeveloper.exe'
if(-not (Test-Path $exe)){throw 'Missing Developer EXE'}
& $exe --developer-audit-self-test
if($LASTEXITCODE -ne 0){throw 'Developer audit resource self-test failed'}
Write-Host "Developer-only EXE: $exe"
if(-not $SkipInstaller){
  $iscc=(Get-Command ISCC.exe -ErrorAction SilentlyContinue)?.Source
  if(-not $iscc) {
    foreach($guess in @('C:\Program Files (x86)\Inno Setup 6\ISCC.exe','C:\Program Files\Inno Setup 6\ISCC.exe')){
      if(Test-Path $guess){$iscc=$guess;break}
    }
  }
  if(-not $iscc){Write-Warning 'Inno Setup 6 unavailable; Developer EXE built, installer skipped.'}
  else {
    & $iscc 'desktop/installer/FoamLensDeveloper.iss'
    if($LASTEXITCODE -ne 0){throw 'Developer Setup build failed'}
    Write-Host 'Developer Setup created under desktop/artifacts/developer/'
  }
}
Write-Host 'No Developer binary is published or uploaded automatically.'
