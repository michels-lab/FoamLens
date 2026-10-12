param([string]$OutputPath='')
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

function Format-FoamGpuHardwareInventory {
  param([object]$OperatingSystem,[object[]]$Adapters)
  $entries=@()
  foreach($adapter in $Adapters){
    if([string]::IsNullOrWhiteSpace([string]$adapter.Name)){continue}
    $entries+= [pscustomobject]@{
      name=[string]$adapter.Name
      driverVersion=[string]$adapter.DriverVersion
      driverDate=if($null -ne $adapter.DriverDate){[string]$adapter.DriverDate}else{$null}
      pnpDeviceId=[string]$adapter.PNPDeviceID
      status=[string]$adapter.Status
    }
  }
  $entries=@($entries | Sort-Object -Property name,pnpDeviceId)
  $usable=$entries.Count -gt 0 -and $null -ne $OperatingSystem
  return [pscustomobject]@{
    schema='foamlens-windows-gpu-adapter-inventory-v1'
    status=if($usable){'reported'}else{'unavailable'}
    osName=if($null -ne $OperatingSystem){[string]$OperatingSystem.Caption}else{$null}
    osBuild=if($null -ne $OperatingSystem){[string]$OperatingSystem.BuildNumber}else{$null}
    osVersion=if($null -ne $OperatingSystem){[string]$OperatingSystem.Version}else{$null}
    adapters=$entries
    adapterCount=$entries.Count
    selectedForFoamLens=$null
    measuredDedicatedVramBytes=$null
    scope='Windows WMI inventory only; does not identify active FoamLens GPU or measure driver VRAM'
  }
}
function Get-FoamGpuHardwareInventory {
  try{
    $os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $adapters=@(Get-CimInstance Win32_VideoController -ErrorAction Stop)
    return Format-FoamGpuHardwareInventory -OperatingSystem $os -Adapters $adapters
  }catch{
    return [pscustomobject]@{
      schema='foamlens-windows-gpu-adapter-inventory-v1'
      status='unavailable';reason=$_.Exception.Message
      osName=$null;osBuild=$null;osVersion=$null
      adapters=@();adapterCount=0;selectedForFoamLens=$null
      measuredDedicatedVramBytes=$null
      scope='Windows WMI inventory unavailable; no hardware VRAM measurement performed'
    }
  }
}
if($MyInvocation.InvocationName -ne '.'){
  $result=Get-FoamGpuHardwareInventory
  $json=$result | ConvertTo-Json -Depth 8
  if(-not [string]::IsNullOrWhiteSpace($OutputPath)){
    $full=[IO.Path]::GetFullPath($OutputPath)
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($full)) | Out-Null
    [IO.File]::WriteAllText($full,$json,[Text.Encoding]::UTF8)
  }
  $json
}
