param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [Parameter(Mandatory=$true)][string]$Screenshot
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
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
  $pattern=$item.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $pattern.Invoke()
}
function Select-Item([System.Windows.Automation.AutomationElement]$item){
  $pattern=$item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
  $pattern.Select()
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
  if($null -eq $accept -or $null -eq $decline -or $null -eq $next){
    $names=(Get-WizardItems $window | ForEach-Object {$_.Current.Name}) -join ' | '
    throw "Required native license accept/decline controls missing: $names"
  }
  if($next.Current.IsEnabled){throw 'License wizard permits installation without affirmative acceptance'}
  $bounds=$window.Current.BoundingRectangle
  $width=[Math]::Ceiling($bounds.Width)
  $height=[Math]::Ceiling($bounds.Height)
  if($width -lt 350 -or $height -lt 240){throw "Unrealistic wizard screenshot size: $width x $height"}
  $bmp=New-Object System.Drawing.Bitmap $width,$height
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
