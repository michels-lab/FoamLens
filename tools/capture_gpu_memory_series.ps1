param(
  [int]$RootProcessId=0,
  [ValidateRange(1,120)][int]$Samples=5,
  [ValidateRange(0,60)][int]$IntervalSeconds=2,
  [string]$OutputPath=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'measure_gpu_process_memory.ps1')

function Get-FoamGpuSeriesSummary {
  param([object[]]$Readings)
  $valid = @($Readings | Where-Object {
    $_.status -eq 'counter-sampled' -and $null -ne $_.dedicatedBytes
  })
  $first=$null;$last=$null;$peak=$null;$change=$null
  $topologyStable=$false;$coverageComplete=$false
  $reason='missing or unverifiable WebView2 process attribution'
  if($valid.Count -gt 0){
    $first=[long]$valid[0].dedicatedBytes
    $last=[long]$valid[-1].dedicatedBytes
    $peak=[long]($valid | Measure-Object -Property dedicatedBytes -Maximum).Maximum
  }
  if($valid.Count -eq $Readings.Count -and $Readings.Count -ge 2){
    $signatures=@()
    $complete=$true
    foreach($reading in $Readings){
      $evidence=$reading.PSObject.Properties['evidence']?.Value
      if($null -eq $evidence -or $null -eq $evidence.PSObject.Properties['webViewPidCount'] -or
        $null -eq $evidence.PSObject.Properties['processes'] -or
        $null -eq $evidence.PSObject.Properties['observedProcessCount']){
        $complete=$false;break
      }
      $processes=@($evidence.processes)
      $expected=[int]$evidence.webViewPidCount
      if($expected -le 0 -or $processes.Count -ne $expected -or
        [int]$evidence.observedProcessCount -ne $expected){
        $complete=$false;break
      }
      $ids=@($processes | ForEach-Object {[int]$_.processId} | Sort-Object -Unique)
      if($ids.Count -ne $expected){$complete=$false;break}
      $signatures+=($ids -join ',')
    }
    $coverageComplete=$complete
    if($complete -and (@($signatures | Sort-Object -Unique)).Count -eq 1){
      $topologyStable=$true
      $change=$last-$first
      $reason='same complete WebView2 process set for every observed reading'
    }elseif(-not $complete){
      $reason='one or more WebView2 GPU process counters were missing or unattributed'
    }else{
      $reason='WebView2 GPU process identity changed during capture'
    }
  }elseif($valid.Count -lt $Readings.Count){
    $reason='one or more GPU memory counter samples are unavailable'
  }else{
    $reason='at least two complete readings are required for a delta'
  }
  return [pscustomobject]@{
    status=if($valid.Count -eq $Readings.Count -and $valid.Count -gt 0){'counter-sampled'}else{'incomplete'}
    samples=$Readings.Count;validSamples=$valid.Count;firstDedicatedBytes=$first
    lastDedicatedBytes=$last;peakDedicatedBytes=$peak;deltaDedicatedBytes=$change
    topologyStable=$topologyStable;coverageComplete=$coverageComplete;deltaEligibility=$reason
    note='Windows GPU Process Memory time-series, NOT total adapter VRAM; delta requires complete stable WebView2 PID set'
  }
}

function Capture-FoamGpuSeries {
  param([int]$HostId,[int]$Count,[int]$PeriodSeconds)
  if($HostId -le 0){throw 'An actual FoamLens.exe PID is required'}
  if($Count -lt 1 -or $Count -gt 120){throw 'Samples must be between 1 and 120'}
  if($PeriodSeconds -lt 0 -or $PeriodSeconds -gt 60){throw 'IntervalSeconds must be between 0 and 60'}
  $result=@()
  for($i=0;$i -lt $Count;$i++){
    $when=(Get-Date).ToUniversalTime().ToString('o')
    $reading=Get-FoamGpuMemoryEvidence -HostId $HostId
    $result+= [pscustomobject]@{timestampUtc=$when;index=$i;status=$reading.status;
      dedicatedBytes=$reading.dedicatedBytes;sharedBytes=$reading.sharedBytes;
      evidence=$reading}
    if($i -lt $Count-1 -and $PeriodSeconds -gt 0){Start-Sleep -Seconds $PeriodSeconds}
  }
  return [pscustomobject]@{
    schema='foamlens-windows-gpu-process-memory-series-v1';hostPid=$HostId
    scope='verified WebView2 descendants via Windows performance counters; NOT graphics-driver total VRAM'
    summary=(Get-FoamGpuSeriesSummary -Readings $result);readings=$result
  }
}

if($MyInvocation.InvocationName -ne '.'){
  if($RootProcessId -le 0){throw 'Supply -RootProcessId of an actual running FoamLens.exe'}
  $report=Capture-FoamGpuSeries -HostId $RootProcessId -Count $Samples -PeriodSeconds $IntervalSeconds
  $json=$report | ConvertTo-Json -Depth 10
  if(-not [string]::IsNullOrWhiteSpace($OutputPath)){
    $full=[IO.Path]::GetFullPath($OutputPath)
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($full)) | Out-Null
    [IO.File]::WriteAllText($full,$json,[Text.Encoding]::UTF8)
  }
  $json
}
