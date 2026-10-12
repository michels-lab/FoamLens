param(
  [Parameter(Mandatory=$true)][int]$RootProcessId,
  [Parameter(Mandatory=$true)][ValidateSet('portable','installed')][string]$Variant,
  [Parameter(Mandatory=$true)][string]$SourceSha,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'measure_gpu_process_memory.ps1')

function New-FoamPackagedGpuEvidence {
  param([int]$HostId,[string]$Kind,[string]$Sha,[object]$Reading)
  return [pscustomobject]@{
    schema='foamlens-packaged-gpu-counter-snapshot-v1'
    sourceSha=$Sha
    runtimeVariant=$Kind
    capturedUtc=(Get-Date).ToUniversalTime().ToString('o')
    stage='initial-launch-observation; NOT after full OpenFOAM case loading'
    status=$Reading.status
    foamLensHostPid=$HostId
    dedicatedBytes=$Reading.dedicatedBytes
    sharedBytes=$Reading.sharedBytes
    counterEvidence=$Reading
    scope='actual packaged FoamLens.exe Windows process counter, if available; NOT total driver VRAM'
  }
}

try{
  $reading=Get-FoamGpuMemoryEvidence -HostId $RootProcessId
}catch{
  $reading=[pscustomobject]@{
    status='unavailable';hostPid=$RootProcessId
    dedicatedBytes=$null;sharedBytes=$null
    reason=('Diagnostic capture failed: '+$_.Exception.Message)
  }
}
$report=New-FoamPackagedGpuEvidence -HostId $RootProcessId -Kind $Variant -Sha $SourceSha -Reading $reading
$full=[IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($full)) | Out-Null
[IO.File]::WriteAllText($full,($report | ConvertTo-Json -Depth 10),[Text.Encoding]::UTF8)
Write-Host ("FoamLens packaged GPU diagnostic: variant={0}; status={1}; source={2}; output={3}" -f $Variant,$reading.status,$SourceSha,$full)
