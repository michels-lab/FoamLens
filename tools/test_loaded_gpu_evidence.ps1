$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$sha='0123456789abcdef0123456789abcdef01234567'
. (Join-Path $PSScriptRoot 'capture_loaded_gpu_evidence.ps1') -RootProcessId 123 -Variant portable -SourceSha $sha -ReadyFile 'unused-marker' -OutputPath 'unused-output'

function Assert-Throws([scriptblock]$Action,[string]$Message){
  $caught=$false
  try{& $Action}catch{$caught=$true}
  if(-not $caught){throw "Loaded GPU marker regression: $Message"}
}
$ok=[pscustomobject]@{
  schema='foamlens-loaded-openfoam-gpu-ready-v1'
  hostPid=123;sourceSha=$sha;caseRoot='C:\fixture\OpenFOAM'
  observedUtc='2026-10-12T00:00:00Z'
  phase='real OpenFOAM physical region data loaded and rendered'
}
Assert-FoamLoadedGpuMarker -Marker $ok -HostProcess 123 -Commit $sha
Assert-Throws {Assert-FoamLoadedGpuMarker -Marker $ok -HostProcess 124 -Commit $sha} 'wrong host PID accepted'
Assert-Throws {Assert-FoamLoadedGpuMarker -Marker $ok -HostProcess 123 -Commit ('f'*40)} 'wrong source SHA accepted'
Assert-Throws {Assert-FoamLoadedGpuMarker -Marker $ok -HostProcess 123 -Commit 'not-a-commit'} 'invalid commit hash accepted'
Assert-Throws {Assert-FoamLoadedGpuMarker -Marker ($ok|Select-Object * -ExcludeProperty caseRoot) -HostProcess 123 -Commit $sha} 'missing case identity accepted'
$unrendered=[pscustomobject]@{schema=$ok.schema;hostPid=123;sourceSha=$sha;caseRoot=$ok.caseRoot;phase='startup'}
Assert-Throws {Assert-FoamLoadedGpuMarker -Marker $unrendered -HostProcess 123 -Commit $sha} 'unrendered startup accepted'
Write-Host 'Loaded GPU evidence handshake identity/provenance tests PASS'
