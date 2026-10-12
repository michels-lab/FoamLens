param(
  [int]$RootProcessId=0,
  [ValidateRange(1,120)][int]$Samples=5,
  [ValidateRange(0,60)][int]$IntervalSeconds=2,
  [string]$CaseLabel='',
  [string]$OutputPath=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'measure_gpu_process_memory.ps1')

function Get-FoamGpuHardwareProvenance {
  # Never include computer name, Windows user name, hardware serial or device ID.
  # Software adapters and missing WMI data must not be reported as discrete GPU.
  $osInfo=$null;$adapters=@();$notes=@()
  try{
    $os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    if($os){
      $osInfo=[pscustomobject]@{
        caption=[string]$os.Caption;version=[string]$os.Version;build=[string]$os.BuildNumber
      }
    }
  }catch{$notes+=('OS metadata unavailable: '+$_.Exception.Message)}
  try{
    $video=@(Get-CimInstance Win32_VideoController -ErrorAction Stop)
    $adapters=@($video | Where-Object {$null -ne $_} | ForEach-Object {
      [pscustomobject]@{name=[string]$_.Name;driverVersion=[string]$_.DriverVersion}
    })
  }catch{$notes+=('Display adapter metadata unavailable: '+$_.Exception.Message)}
  return [pscustomobject]@{
    status=if($osInfo -and $adapters.Count -gt 0){'reported'}else{'incomplete'}
    windows=$osInfo;displayAdapters=$adapters;notes=@($notes)
    scope='Unverified display-adapter inventory: software/virtual adapters may be present, no device serials'
  }
}

function Get-FoamGpuSeriesSummary {
  param([object[]]$Readings)
  $valid = @($Readings | Where-Object {
    $_.status -eq 'counter-sampled' -and $null -ne $_.dedicatedBytes
  })
  $first=$null;$last=$null;$peak=$null;$change=$null
  if($valid.Count -gt 0){
    $first=[long]$valid[0].dedicatedBytes
    $last=[long]$valid[-1].dedicatedBytes
    $peak=[long]($valid | Measure-Object -Property dedicatedBytes -Maximum).Maximum
    if($valid.Count -eq $Readings.Count -and $Readings.Count -ge 2){$change=$last-$first}
  }
  return [pscustomobject]@{
    status=if($valid.Count -eq $Readings.Count -and $valid.Count -gt 0){'counter-sampled'}else{'incomplete'}
    samples=$Readings.Count;validSamples=$valid.Count;firstDedicatedBytes=$first
    lastDedicatedBytes=$last;peakDedicatedBytes=$peak;deltaDedicatedBytes=$change
    note='Windows GPU Process Memory time-series, NOT total adapter VRAM; delta only if every reading valid'
  }
}

function Capture-FoamGpuSeries {
  param([int]$HostId,[int]$Count,[int]$PeriodSeconds,[string]$Label='')
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
    caseLabel=$Label;hardware=(Get-FoamGpuHardwareProvenance)
    scope='verified WebView2 descendants via Windows performance counters; NOT graphics-driver total VRAM'
    knownCounterCaveat='Microsoft KB4490156: some Windows GPU Process Memory counters are inaccurate; corroborate with WPR/WPA'
    summary=(Get-FoamGpuSeriesSummary -Readings $result);readings=$result
  }
}

if($MyInvocation.InvocationName -ne '.'){
  if($RootProcessId -le 0){throw 'Supply -RootProcessId of an actual running FoamLens.exe'}
  $report=Capture-FoamGpuSeries -HostId $RootProcessId -Count $Samples -PeriodSeconds $IntervalSeconds -Label $CaseLabel
  $json=$report | ConvertTo-Json -Depth 10
  if(-not [string]::IsNullOrWhiteSpace($OutputPath)){
    $full=[IO.Path]::GetFullPath($OutputPath)
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($full)) | Out-Null
    [IO.File]::WriteAllText($full,$json,[Text.Encoding]::UTF8)
  }
  $json
}
