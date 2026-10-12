$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'measure_gpu_process_memory.ps1')

function Assert-True([bool]$condition,[string]$message){
  if(-not $condition){throw "GPU memory evidence regression: $message"}
}
function Sample([int]$processId,[string]$counter,[double]$value,[string]$luid='0x123'){
  [pscustomobject]@{
    Path=("\testhost\gpu process memory(pid_{0}_luid_{1}_phys_0)\{2}" -f $processId,$luid,$counter)
    CookedValue=$value
  }
}
$processes=@(
  [pscustomobject]@{ProcessId=100;ParentProcessId=5;Name='FoamLens.exe'},
  [pscustomobject]@{ProcessId=200;ParentProcessId=100;Name='msedgewebview2.exe'},
  [pscustomobject]@{ProcessId=201;ParentProcessId=200;Name='msedgewebview2.exe'},
  [pscustomobject]@{ProcessId=202;ParentProcessId=100;Name='helper.exe'},
  [pscustomobject]@{ProcessId=900;ParentProcessId=99;Name='msedgewebview2.exe'}
)
$counter=@(
  (Sample 200 'Dedicated Usage' 123),
  (Sample 200 'Shared Usage' 45),
  (Sample 201 'Dedicated Usage' 67),
  (Sample 201 'Shared Usage' 22),
  (Sample 202 'Dedicated Usage' 80),
  (Sample 900 'Dedicated Usage' 999999)
)
$report=Measure-FoamGpuCounterSamples -HostId 100 -ProcessRows $processes -CounterRows $counter
Assert-True ($report.status -eq 'counter-sampled') 'Expected valid descendant-only counter evidence'
Assert-True ($report.webViewPidCount -eq 2) 'Must include only the two WebView2 child PIDs'
Assert-True ($report.observedProcessCount -eq 2) 'Must not attribute other GPU users or generic helpers'
Assert-True ($report.dedicatedBytes -eq 190) 'Dedicated counter sum must exclude foreign processes'
Assert-True ($report.sharedBytes -eq 67) 'Shared counter sum must use only verified children'
Assert-True ($report.processes.Count -eq 2) 'Expected independently reported process rows'
Assert-True ($report.metric -match 'NOT graphics-driver total VRAM') 'Must never label counters as total hardware VRAM'
$duplicate=@($counter)+(Sample 200 'Dedicated Usage' 123)
$dedup=Measure-FoamGpuCounterSamples -HostId 100 -ProcessRows $processes -CounterRows $duplicate
Assert-True ($dedup.dedicatedBytes -eq 190) 'Repeated identical instance paths must not double count'
$invalid=@((Sample 200 'Dedicated Usage' ([double]::NaN)),$counter[1])
$bad=Measure-FoamGpuCounterSamples -HostId 100 -ProcessRows $processes -CounterRows $invalid
Assert-True ($bad.status -eq 'unavailable') 'Missing valid dedicated count must remain unavailable'
Assert-True ($null -eq $bad.dedicatedBytes) 'Missing measurements must NOT mean zero bytes'
$none=Measure-FoamGpuCounterSamples -HostId 100 -ProcessRows $processes -CounterRows @()
Assert-True ($none.status -eq 'unavailable') 'No Windows GPU counters must remain unavailable'
$foreign=Measure-FoamGpuCounterSamples -HostId 100 -ProcessRows $processes -CounterRows @((Sample 900 'Dedicated Usage' 3456))
Assert-True ($foreign.status -eq 'unavailable') 'Unrelated browser GPU processes cannot be attributed'
$badPid=Get-FoamGpuMemoryEvidence -HostId 99999999
Assert-True ($badPid.status -eq 'unavailable') 'Absent FoamLens host must fail closed'
Write-Host 'Windows GPU process-memory telemetry tests PASS: attribution, cross-app isolation, duplicate rejection, no-fabricated-zero, unavailable fallback'
