# Capture GPU process-memory telemetry only AFTER the actual packaged app
# reports that it has imported and rendered real OpenFOAM physical regions.
# This is a process-counter observation, NOT total adapter/driver VRAM.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][int]$RootProcessId,
  [Parameter(Mandatory=$true)][ValidateSet('portable','installed')][string]$Variant,
  [Parameter(Mandatory=$true)][string]$SourceSha,
  [Parameter(Mandatory=$true)][string]$ReadyFile,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

function Assert-FoamLoadedGpuMarker {
  param($Marker,[int]$HostProcess,[string]$Commit)
  if($null -eq $Marker -or $Marker.schema -ne 'foamlens-loaded-openfoam-gpu-ready-v1'){
    throw 'Loaded GPU evidence marker schema mismatch'
  }
  if([int]$Marker.hostPid -ne $HostProcess -or $HostProcess -le 0){
    throw 'Loaded GPU evidence is from a different executable PID'
  }
  if([string]$Marker.sourceSha -ne $Commit -or $Commit -notmatch '^[0-9a-fA-F]{40}$'){
    throw 'Loaded GPU marker source SHA does not match candidate checkout'
  }
  if([string]$Marker.phase -ne 'real OpenFOAM physical region data loaded and rendered'){
    throw 'Loaded GPU evidence missing actual rendered OpenFOAM phase'
  }
  if([string]::IsNullOrWhiteSpace([string]$Marker.caseRoot)){
    throw 'Loaded GPU evidence does not identify the opened physical case'
  }
}

if($MyInvocation.InvocationName -ne '.'){
  if($RootProcessId -le 0){throw 'RootProcessId must be the real running FoamLens.exe PID'}
  $fullReady=[IO.Path]::GetFullPath($ReadyFile)
  $ack=$fullReady+'.ack'
  $fullOutput=[IO.Path]::GetFullPath($OutputPath)
  $deadline=(Get-Date).AddSeconds(255)
  $p=$null
  while(-not (Test-Path -LiteralPath $fullReady)){
    if((Get-Date) -ge $deadline){throw 'Real OpenFOAM field was not ready for loaded GPU capture before deadline'}
    try {
      $p=[Diagnostics.Process]::GetProcessById($RootProcessId)
      if($p.HasExited){throw 'FoamLens exited before loaded OpenFOAM GPU sampling'}
    } catch {
      throw "FoamLens executable no longer available while waiting for rendered case: $_"
    } finally {
      if($null -ne $p){$p.Dispose();$p=$null}
    }
    Start-Sleep -Milliseconds 300
  }

  $ackStatus='failed'
  try {
    $marker=Get-Content -LiteralPath $fullReady -Raw | ConvertFrom-Json
    Assert-FoamLoadedGpuMarker -Marker $marker -HostProcess $RootProcessId -Commit $SourceSha
    $temporary=$fullOutput+'.series.json'
    $folder=[IO.Path]::GetDirectoryName($fullOutput)
    [IO.Directory]::CreateDirectory($folder) | Out-Null
    try {
      $null = & (Join-Path $PSScriptRoot 'capture_gpu_memory_series.ps1') -RootProcessId $RootProcessId -Samples 3 -IntervalSeconds 1 -OutputPath $temporary
      $series=Get-Content -LiteralPath $temporary -Raw | ConvertFrom-Json
      if($series.schema -ne 'foamlens-windows-gpu-process-memory-series-v1' -or [int]$series.hostPid -ne $RootProcessId){
        throw 'Loaded GPU time-series provenance mismatch'
      }
      $report=[pscustomobject]@{
        schema='foamlens-packaged-loaded-openfoam-gpu-v1'
        variant=$Variant;sourceSha=$SourceSha;hostPid=$RootProcessId
        recordedUtc=(Get-Date).ToUniversalTime().ToString('o')
        readyObservedUtc=$marker.observedUtc
        caseRoot=$marker.caseRoot;phase=$marker.phase
        status=if([int]$series.summary.validSamples -gt 0){'counter-sampled'}else{'unavailable'}
        scope='real loaded OpenFOAM QuickCup region scene, verified WebView2 process GPU counters; NOT adapter total VRAM'
        series=$series
      }
      [IO.File]::WriteAllText($fullOutput,($report | ConvertTo-Json -Depth 15),[Text.Encoding]::UTF8)
      $ackStatus='sampled'
      Write-Host "Loaded OpenFOAM GPU counter evidence saved: $fullOutput ($($report.status))"
    } finally {
      if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}
    }
  } finally {
    [IO.File]::WriteAllText($ack,$ackStatus,[Text.Encoding]::UTF8)
  }
}
