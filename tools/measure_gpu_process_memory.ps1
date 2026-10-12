param(
  [int]$RootProcessId = 0
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Windows GPU Process Memory counters are OS/accounting measurements, NOT
# application-owned total physical adapter VRAM or exact per-frame allocations.
# WebView2 uses separate browser/render/GPU processes. Attribute ONLY direct
# process descendants of an explicitly named FoamLens host PID.
function Get-FoamGpuProcessScope {
  param([int]$HostId,[object[]]$ProcessRows)
  $descendants = [System.Collections.Generic.HashSet[int]]::new()
  [void]$descendants.Add($HostId)
  $webview = [System.Collections.Generic.HashSet[int]]::new()
  for($round=0;$round -le $ProcessRows.Count;$round++){
    $change = $false
    foreach($p in $ProcessRows){
      $id = [int]$p.ProcessId
      if($descendants.Contains($id) -or -not $descendants.Contains([int]$p.ParentProcessId)){continue}
      [void]$descendants.Add($id)
      if([string]$p.Name -ieq 'msedgewebview2.exe'){[void]$webview.Add($id)}
      $change = $true
    }
    if(-not $change){break}
  }
  return [pscustomobject]@{
    hostPid = $HostId
    webViewPids = @($webview | Sort-Object)
    coverage = 'verified-process-descendants-only'
  }
}

function Measure-FoamGpuCounterSamples {
  param([int]$HostId,[object[]]$ProcessRows,[object[]]$CounterRows)
  $scope = Get-FoamGpuProcessScope -HostId $HostId -ProcessRows $ProcessRows
  $eligible = [System.Collections.Generic.HashSet[int]]::new()
  foreach($pidValue in $scope.webViewPids){[void]$eligible.Add([int]$pidValue)}
  $perPid = @{}
  $seenPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach($sample in $CounterRows){
    $path = [string]$sample.Path
    if($path -notmatch '(?i)gpu process memory\(pid_(\d+)_luid_[^)]+\)\\(dedicated usage|shared usage)$'){continue}
    $id = [int]$Matches[1]
    $metric = [string]$Matches[2]
    if(-not $eligible.Contains($id) -or -not $seenPaths.Add($path)){continue}
    $value = [double]$sample.CookedValue
    if([double]::IsNaN($value) -or [double]::IsInfinity($value) -or
      $value -lt 0 -or $value -gt [long]::MaxValue){continue}
    if(-not $perPid.ContainsKey($id)){
      $perPid[$id] = [pscustomobject]@{
        processId=$id; dedicatedBytes=[long]0; sharedBytes=[long]0;
        observedDedicated=$false; observedShared=$false
      }
    }
    if($metric -ieq 'Dedicated Usage'){
      $perPid[$id].dedicatedBytes += [long][math]::Round($value)
      $perPid[$id].observedDedicated = $true
    }else{
      $perPid[$id].sharedBytes += [long][math]::Round($value)
      $perPid[$id].observedShared = $true
    }
  }
  $children = @($perPid.Values | Where-Object {$_.observedDedicated} | Sort-Object processId)
  if(-not $children.Count){
    return [pscustomobject]@{
      status='unavailable'; hostPid=$HostId
      reason='No verified WebView2 descendant has a valid Dedicated Usage counter sample'
      coverage=$scope.coverage; webViewPidCount=$scope.webViewPids.Count
      dedicatedBytes=$null; sharedBytes=$null; processes=@()
      metric='Windows GPU Process Memory counters; NOT graphics-driver total VRAM'
    }
  }
  $dedicated = [long]0; $shared = [long]0
  foreach($child in $children){$dedicated += $child.dedicatedBytes;$shared += $child.sharedBytes}
  return [pscustomobject]@{
    status='counter-sampled'; hostPid=$HostId
    coverage=$scope.coverage; webViewPidCount=$scope.webViewPids.Count
    observedProcessCount=$children.Count
    dedicatedBytes=$dedicated; sharedBytes=$shared; processes=$children
    metric='Windows GPU Process Memory counters; NOT graphics-driver total VRAM'
  }
}

function Get-FoamGpuMemoryEvidence {
  param([int]$HostId)
  if($HostId -le 0){throw 'Supply an actual running FoamLens.exe PID; never infer the target process'}
  $hostProcess = Get-Process -Id $HostId -ErrorAction SilentlyContinue
  if(-not $hostProcess -or $hostProcess.ProcessName -ine 'FoamLens'){
    return [pscustomobject]@{
      status='unavailable'; hostPid=$HostId; reason='FoamLens.exe host PID not verified'
      dedicatedBytes=$null; sharedBytes=$null
      metric='Windows GPU Process Memory counters; NOT graphics-driver total VRAM'
    }
  }
  try{
    $processRows = @(Get-CimInstance Win32_Process -ErrorAction Stop |
      Select-Object ProcessId,ParentProcessId,Name)
    # Missing counters on software/hosted GPU are UNAVAILABLE, not zero MB.
    $counterSet = Get-Counter -Counter @(
      '\GPU Process Memory(*)\Dedicated Usage',
      '\GPU Process Memory(*)\Shared Usage'
    ) -ErrorAction Stop
    $counterRows = @($counterSet.CounterSamples | Select-Object Path,CookedValue)
    return Measure-FoamGpuCounterSamples -HostId $HostId -ProcessRows $processRows -CounterRows $counterRows
  }catch{
    return [pscustomobject]@{
      status='unavailable'; hostPid=$HostId
      reason=('OS GPU process counters not available: '+$_.Exception.Message)
      dedicatedBytes=$null; sharedBytes=$null
      metric='Windows GPU Process Memory counters; NOT graphics-driver total VRAM'
    }
  }
}

if($MyInvocation.InvocationName -ne '.'){
  if($RootProcessId -le 0){throw 'Usage: pwsh -File tools/measure_gpu_process_memory.ps1 -RootProcessId <actual FoamLens.exe PID>'}
  Get-FoamGpuMemoryEvidence -HostId $RootProcessId | ConvertTo-Json -Depth 6 -Compress
}
