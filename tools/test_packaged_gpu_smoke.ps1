$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$testFile=Join-Path $env:TEMP ('foamlens-gpu-smoke-'+[Guid]::NewGuid().ToString('N')+'.json')
try{
  & (Join-Path $PSScriptRoot 'capture_packaged_gpu_smoke.ps1') -RootProcessId 99999999 -Variant portable -SourceSha 'fixture-source-sha' -OutputPath $testFile
  if(-not (Test-Path -LiteralPath $testFile)){throw 'GPU diagnostic JSON not written'}
  $result=Get-Content -LiteralPath $testFile -Raw | ConvertFrom-Json
  if($result.schema -ne 'foamlens-packaged-gpu-counter-snapshot-v1'){throw 'Wrong provenance schema'}
  if($result.status -ne 'unavailable'){throw 'An invalid host must not produce sampled evidence'}
  if($null -ne $result.dedicatedBytes -or $null -ne $result.sharedBytes){throw 'Unavailable driver counters must be JSON null'}
  if($result.runtimeVariant -ne 'portable' -or $result.sourceSha -ne 'fixture-source-sha'){throw 'Snapshot must retain exact variant/source provenance'}
  if($result.scope -notmatch 'NOT total driver VRAM'){throw 'GPU accounting units overstated'}
  if($result.stage -notmatch 'initial-launch-observation'){throw 'Must label the evidence as startup, not loaded simulation'}
  Write-Host 'Packaged Windows GPU evidence guard PASS: unavailable/null, source, runtime, stage, no hardware VRAM invention'
}finally{
  Remove-Item -LiteralPath $testFile -Force -ErrorAction SilentlyContinue
}
