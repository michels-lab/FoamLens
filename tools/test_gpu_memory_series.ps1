$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'capture_gpu_memory_series.ps1')

function Assert-Sampled([bool]$condition,[string]$message){
  if(-not $condition){throw "GPU time-series regression: $message"}
}
function VerifiedWebView([int[]]$pids,[int]$expected=$pids.Count){
  [pscustomobject]@{
    webViewPidCount=$expected;observedProcessCount=$pids.Count
    processes=@($pids | ForEach-Object {[pscustomobject]@{processId=$_;dedicatedBytes=1}})
  }
}
function Measured([long]$dedicated,[int[]]$pids=@(200,201)){
  [pscustomobject]@{status='counter-sampled';dedicatedBytes=$dedicated;sharedBytes=[long]5
    evidence=(VerifiedWebView -pids $pids)}
}
$good=@((Measured 100),(Measured 150),(Measured 120))
$sum=Get-FoamGpuSeriesSummary -Readings $good
Assert-Sampled ($sum.status -eq 'counter-sampled') 'All valid counter readings must have sampled status'
Assert-Sampled ($sum.peakDedicatedBytes -eq 150) 'Peak is an observed counter, not the final sample'
Assert-Sampled ($sum.deltaDedicatedBytes -eq 20) 'Delta must use the first and last valid sample'
Assert-Sampled ($sum.samples -eq 3 -and $sum.validSamples -eq 3) 'Counts must be explicit'
Assert-Sampled ($sum.topologyStable -and $sum.coverageComplete) 'Stable WebView2 PID ownership is required for a delta'
$rotated=@((Measured 100),(Measured 150 @(200,202)),(Measured 120))
$changed=Get-FoamGpuSeriesSummary -Readings $rotated
Assert-Sampled (-not $changed.topologyStable) 'A recycled WebView2 process must invalidate topology'
Assert-Sampled ($null -eq $changed.deltaDedicatedBytes) 'Process restart cannot be mistaken for a memory leak'
Assert-Sampled ($changed.peakDedicatedBytes -eq 150) 'Still preserve observed peak despite changing process set'
$unknown=@(
  [pscustomobject]@{status='counter-sampled';dedicatedBytes=[long]100},
  [pscustomobject]@{status='counter-sampled';dedicatedBytes=[long]200}
)
$missingProvenance=Get-FoamGpuSeriesSummary -Readings $unknown
Assert-Sampled ($null -eq $missingProvenance.deltaDedicatedBytes) 'Unattributed data cannot produce a fake delta'
Assert-Sampled (-not $missingProvenance.coverageComplete) 'Missing process identity must be explicit'
$partialCoverage=@((Measured 100),[pscustomobject]@{
  status='counter-sampled';dedicatedBytes=[long]120
  evidence=(VerifiedWebView -pids @(200) -expected 2)
},(Measured 150))
$partialCounter=Get-FoamGpuSeriesSummary -Readings $partialCoverage
Assert-Sampled ($null -eq $partialCounter.deltaDedicatedBytes) 'Incomplete WebView2 child coverage invalidates delta'
Assert-Sampled (-not $partialCounter.coverageComplete) 'Missing child counter must be visible in summary'
$missing=@($good[0],[pscustomobject]@{status='unavailable';dedicatedBytes=$null;sharedBytes=$null},$good[2])
$partial=Get-FoamGpuSeriesSummary -Readings $missing
Assert-Sampled ($partial.status -eq 'incomplete') 'A missing reading must invalidate complete timeseries'
Assert-Sampled ($partial.validSamples -eq 2) 'Only real readings contribute to validity count'
Assert-Sampled ($null -eq $partial.deltaDedicatedBytes) 'Missing middle values must not fabricate memory growth'
$empty=Get-FoamGpuSeriesSummary -Readings @()
Assert-Sampled ($empty.status -eq 'incomplete' -and $null -eq $empty.peakDedicatedBytes) 'No samples must not become zero VRAM'
$script:index=0
function Get-FoamGpuMemoryEvidence {
  param([int]$HostId)
  $script:index++
  return [pscustomobject]@{
    status='counter-sampled';dedicatedBytes=[long](100+$script:index*10);
    sharedBytes=[long]2;hostPid=$HostId;webViewPidCount=2;observedProcessCount=2;
    processes=@([pscustomobject]@{processId=300},[pscustomobject]@{processId=301})
  }
}
$capture=Capture-FoamGpuSeries -HostId 321 -Count 3 -PeriodSeconds 0
Assert-Sampled ($capture.schema -eq 'foamlens-windows-gpu-process-memory-series-v1') 'Schema required'
Assert-Sampled ($capture.readings.Count -eq 3) 'Exact requested sample count'
Assert-Sampled ($capture.summary.deltaDedicatedBytes -eq 20) 'Timestamped captured evidence must retain actual delta'
Assert-Sampled ($capture.summary.topologyStable) 'Synthetic captured samples must all belong to the same WebView2 process group'
Assert-Sampled ($capture.readings[0].timestampUtc -match '^\d{4}-') 'Timestamp must be an actual ISO UTC value'
Assert-Sampled ($capture.scope -match 'NOT graphics-driver total VRAM') 'No claim of hardware total VRAM'
Write-Host 'GPU memory series regression PASS: sample timestamps, observed peak/delta, missing-counter null and bounded counts'
