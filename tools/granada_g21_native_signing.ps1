param(
 [Parameter(Mandatory=$true)][string]$Portable,
 [Parameter(Mandatory=$true)][string]$Setup,
 [Parameter(Mandatory=$true)][string]$Output,
 [Parameter(Mandatory=$true)][string]$SourceSha,
 [Parameter(Mandatory=$true)][string]$Version
)
$ErrorActionPreference='Stop'
if($SourceSha -notmatch '^[a-f0-9]{40}$'){throw 'No immutable source SHA'}
if($Version -notmatch '^\d+\.\d+\.\d+$'){throw 'Invalid stable release version'}
$certs=@()
$results=@{}
foreach($entry in @(@('portable',$Portable),@('setup',$Setup))) {
 $key=[string]$entry[0]
 $file=(Resolve-Path -LiteralPath ([string]$entry[1]) -ErrorAction Stop).Path
 $name=[IO.Path]::GetFileName($file)
 $expected='FoamLens-'+$(if($key -eq 'portable'){'Portable'}else{'Setup'})+'-v'+$Version+'.exe'
 if($name -cne $expected){throw "Wrong official $key release identity: $name"}
 $signature=Get-AuthenticodeSignature -LiteralPath $file
 if($signature.Status -ne 'Valid'){throw "$key rejected: Authenticode $($signature.Status)"}
 if($null -eq $signature.SignerCertificate){throw "$key rejected: missing signer certificate"}
 $thumb=([string]$signature.SignerCertificate.Thumbprint).ToLowerInvariant()
 if($thumb -notmatch '^[a-f0-9]{40}$'){throw "Unexpected $key publisher certificate"}
 $utc=[DateTime]::UtcNow
 if($signature.SignerCertificate.NotBefore.ToUniversalTime() -gt $utc -or $signature.SignerCertificate.NotAfter.ToUniversalTime() -lt $utc){
  throw "$key: certificate outside validity interval"
 }
 $hash=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
 $sidecar=$file+'.sha256'
 if(-not(Test-Path -LiteralPath $sidecar)){throw "$key missing official SHA-256 sidecar"}
 $expectedSidecar=$hash+'  '+$name
 $actualSidecar=(Get-Content -LiteralPath $sidecar -Raw).Trim()
 if($actualSidecar -cne $expectedSidecar){throw "$key sidecar does not describe actual signed bytes"}
 $certs+=,$thumb
 $results[$key]=@{
  filename=$name
  sha256=$hash
  authenticodeStatus='Valid'
  signerThumbprint=$thumb
 }
}
if($certs[0] -cne $certs[1]){throw 'Installer and Portable signed by different publisher identities'}
$directory=Split-Path -Parent $Output
if($directory){New-Item -ItemType Directory -Path $directory -Force | Out-Null}
@{
 schema='foamlens/granada-g21-native-authenticode/1'
 sourceSha=$SourceSha
 version=$Version
 nativeAuthenticodeVerified=$true
 signerThumbprint=$certs[0]
 assets=$results
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $Output -Encoding utf8
Write-Host 'G21 real Windows Authenticode status Valid on both original exact-source Setup and Portable'
