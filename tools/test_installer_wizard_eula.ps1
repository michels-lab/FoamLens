param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [Parameter(Mandatory=$true)][string]$Screenshot
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
# Delphi/Inno Setup standard buttons sometimes expose a native HWND but no
# UIAutomation InvokePattern/SelectionItemPattern. Use native BM_CLICK instead
# of treating this as an EULA acceptance failure.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NativeFoamWizard {
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern IntPtr SendMessage(IntPtr hwnd, UInt32 msg, IntPtr wp, IntPtr lp);
}
'@
$setup=(Resolve-Path -LiteralPath $Installer).Path
$screenshotPath=[IO.Path]::GetFullPath($Screenshot)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($screenshotPath)) | Out-Null
$proc=$null
$root=[System.Windows.Automation.AutomationElement]::RootElement
function Get-WizardWindow {
  $windows=$root.FindAll([System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition)
  for($i=0;$i -lt $windows.Count;$i++){
    $candidate=$windows.Item($i)
    try{
      $name=$candidate.Current.Name
      if($name -match 'FoamLens' -and $name -match 'Setup|Installer|Installation'){
        return $candidate
      }
    }catch{}
  }
  return $null
}
function Get-WizardItems([System.Windows.Automation.AutomationElement]$wizard){
  $items=$wizard.FindAll([System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition)
  $found=@()
  for($i=0;$i -lt $items.Count;$i++){
    $item=$items.Item($i)
    try{
      if($item.Current.Name){$found+=,$item}
    }catch{}
  }
  return $found
}
function Get-NamedItem([object[]]$items,[string]$pattern){
  foreach($item in $items){if($item.Current.Name -match $pattern){return $item}}
  return $null
}
function Invoke-Item([System.Windows.Automation.AutomationElement]$item){
  try{
    $pattern=$item.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $pattern.Invoke()
    return
  }catch{
    Write-Host "UIAutomation InvokePattern unavailable for $($item.Current.Name); trying native control."
  }
  try{
    $legacy=$item.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern)
    $legacy.DoDefaultAction()
    return
  }catch{}
  $handle=$item.Current.NativeWindowHandle
  if($handle -eq 0){throw "No native HWND for wizard control $($item.Current.Name)"}
  [void][NativeFoamWizard]::SendMessage([IntPtr]$handle,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)
}
function Select-Item([System.Windows.Automation.AutomationElement]$item){
  try{
    $pattern=$item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
    $pattern.Select()
    return
  }catch{
    Write-Host "UIAutomation SelectionItemPattern unavailable for $($item.Current.Name); trying native radio click."
  }
  Invoke-Item $item
}
try{
  $proc=Start-Process -FilePath $setup -ArgumentList @('/SP-','/CURRENTUSER') -PassThru
  $window=$null
  for($i=0;$i -lt 70;$i++){
    Start-Sleep -Milliseconds 300
    $window=Get-WizardWindow
    if($null -ne $window){break}
  }
  if($null -eq $window){throw 'Interactive FoamLens Setup wizard not found on Windows desktop'}
  $accept=$null
  $decline=$null
  $next=$null
  for($page=0;$page -lt 4;$page++){
    $items=@(Get-WizardItems $window)
    $accept=Get-NamedItem $items '(?i)^I\s+accept\s+the\s+agreement'
    $decline=Get-NamedItem $items '(?i)^I\s+do\s+not\s+accept\s+the\s+agreement'
    $next=Get-NamedItem $items '(?i)^Next\s*>?$'
    if($null -ne $accept -and $null -ne $decline -and $null -ne $next){break}
    if($null -eq $next){throw 'Setup wizard has no accessible Next button'}
    if(-not $next.Current.IsEnabled){throw 'Setup Next unexpectedly disabled before license page'}
    Invoke-Item $next
    Start-Sleep -Milliseconds 650
  }
  Write-Host ("Reached Setup EULA page; accept="+($null -ne $accept)+", decline="+($null -ne $decline)+", next="+($null -ne $next))
  if($null -eq $accept -or $null -eq $decline -or $null -eq $next){
    $names=(Get-WizardItems $window | ForEach-Object {$_.Current.Name}) -join ' | '
    throw "Required native license accept/decline controls missing: $names"
  }
  if($next.Current.IsEnabled){throw 'License wizard permits installation without affirmative acceptance'}
  $bounds=$window.Current.BoundingRectangle
  $width=[Math]::Ceiling($bounds.Width)
  $height=[Math]::Ceiling($bounds.Height)
  if($width -lt 350 -or $height -lt 240){throw "Unrealistic wizard screenshot size: $width x $height"}
  Write-Host "Native wizard screenshot bounds: $width x $height, x=$([Math]::Floor($bounds.Left)), y=$([Math]::Floor($bounds.Top))"
  $bmp=[System.Drawing.Bitmap]::new([int]$width,[int]$height)
  $graphics=[System.Drawing.Graphics]::FromImage($bmp)
  try{
    $graphics.CopyFromScreen([int][Math]::Floor($bounds.Left),
      [int][Math]::Floor($bounds.Top),0,0,$bmp.Size)
    $bmp.Save($screenshotPath,[System.Drawing.Imaging.ImageFormat]::Png)
  }finally{
    $graphics.Dispose()
    $bmp.Dispose()
  }
  if((Get-Item -LiteralPath $screenshotPath).Length -lt 5000){
    throw 'License wizard screenshot missing or implausibly small'
  }
  Select-Item $accept
  Start-Sleep -Milliseconds 300
  if(-not $next.Current.IsEnabled){throw 'Setup Next remains disabled after license acceptance'}
  Select-Item $decline
  Start-Sleep -Milliseconds 300
  if($next.Current.IsEnabled){throw 'Setup Next is enabled after rejecting license agreement'}
  Write-Host "FoamLens native EULA wizard PASS: Next blocks before acceptance and after decline; enabled only on acceptance."
  Write-Host "Real wizard screenshot: $screenshotPath"
}finally{
  if($null -ne $proc){
    try{if(-not $proc.HasExited){$proc.Kill($true)}}catch{}
  }
}
