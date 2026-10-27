'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop');
const original=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const helper=fs.readFileSync(path.join(root,'UpdateAssetIntegrity.cs'),'utf8');

test('original updater still requires a newer release and explicit user approval before launch',()=>{
 for(const s of ['release.Version.CompareTo(current) <= 0','if (answer != DialogResult.Yes) return;',
  'DownloadVerifyAndLaunchUpdateAsync(release)','Process.Start(new ProcessStartInfo(installerPath)',
  'SHA256.HashDataAsync(installerStream)'])assert(original.includes(s),s);
});
test('original updater verifies exact installer and checksum URL identity BEFORE any download',()=>{
 const expected=['RequireOfficialReleaseAsset(','release.InstallerUrl!, release.Tag, release.InstallerName',
  'release.ChecksumUrl!, release.Tag, release.InstallerName + ".sha256"',
  'DownloadUpdateFileAsync(officialInstallerUrl.AbsoluteUri, installerPath)',
  'DownloadUpdateFileAsync(officialChecksumUrl.AbsoluteUri, checksumPath)'];
 for(const s of expected)assert(original.includes(s),s);
 assert(original.indexOf('RequireOfficialReleaseAsset(')<original.indexOf('DownloadUpdateFileAsync(officialInstallerUrl.AbsoluteUri'));
});
test('checksum file bound to single exact expected installer hash and bounded size',()=>{
 for(const s of ['checksumInfo.Length is < 64 or > 4096','RequireExactSha256(checksumText, release.InstallerName)',
  'string.Equals(expectedHash, actualHash, StringComparison.OrdinalIgnoreCase)'])assert(original.includes(s),s);
 assert(!original.includes('checksumText.Contains(release.InstallerName, StringComparison.OrdinalIgnoreCase)'));
 assert(!original.includes('Regex.Match(checksumText, @"\\b[a-fA-F0-9]{64}\\b")'));
});
test('checksum parser rejects multi-line manifests and ignores no comment-based filename trick',()=>{
 for(const s of ['rows.Length != 1','StringComparison.Ordinal','IsSafeSingleFilename','HashOnly','HashWithFilename'])assert(helper.includes(s),s);
 assert(!helper.includes('StartsWith("SHA256"'));
});
test('asset URL rejects unofficial hosting and path mismatch',()=>{
 for(const s of ['Uri.UriSchemeHttps','uri.IsDefaultPort','"github.com"',
  'segments.Length != 6','segments[0] != "michels-lab"','segments[1] != "FoamLens"',
  'segments[4] != tag','segments[5] != expectedAssetName'])assert(helper.includes(s),s);
});
test('Developer and Store updater restrictions remain original',()=>{
 for(const s of ['if (DeveloperEdition)','if (StoreDistributionChannel)','Developer builds are updated only by private recompilation'])assert(original.includes(s),s);
});
