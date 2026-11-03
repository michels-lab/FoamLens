'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
const policy=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/ExternalNavigationPolicy.cs'),'utf8');
test('the ORIGINAL WebView2 popup handler is never an unrestricted native Windows ShellExecute',()=>{
 const start=src.indexOf('CoreWebView2.NewWindowRequested +=');
 const end=src.indexOf('CoreWebView2.ProcessFailed +=',start);
 assert(start>0&&end>start);
 const block=src.slice(start,end);
 assert(block.includes('e.Handled = true;'));
 assert(block.includes('if (!ExternalNavigationPolicy.IsInternalNavigation(e.Uri))'));
 assert(block.includes('e.Cancel = true;'));
 assert(!block.includes('uri.Scheme is "http" or "https"'), 'old handler did not cancel unsafe schemes');
});
test('all Process.Start native browser calls pass the production HTTP(S) policy, even from bridge/update',()=>{
 const start=src.indexOf('private static bool OpenExternal(');
 assert(start>0);
 const end=src.indexOf('private static void Log(',start);
 assert(end>start);
 const body=src.slice(start,end);
 assert(body.includes('ExternalNavigationPolicy.TryExternalHttpUrl(uri, out var externalUrl)'));
 assert(body.includes('Process.Start(new ProcessStartInfo(externalUrl) { UseShellExecute = true })'));
 assert(!/ProcessStartInfo\(uri\)/.test(body));
 const bridge=src.slice(src.indexOf('private void HandleOpenExternal('),src.indexOf('private void HandleCancelOperation('));
 assert(bridge.includes('ExternalNavigationPolicy.TryExternalHttpUrl(uri, out var externalUrl)'));
 assert(bridge.includes('if (!OpenExternal(externalUrl))'));
});
test('internal-origin restriction is origin-specific not just a hostname string match',()=>{
 for(const s of ['Uri.UriSchemeHttps','uri.Port == 443','string.IsNullOrEmpty(uri.UserInfo)','uri.Host.Equals(LocalHost','Uri.UriSchemeHttp','uri.IsLoopback'])
  assert(policy.includes(s),s);
 assert(!policy.includes('Process.Start'));
 assert(policy.includes('".local"'));
});
test('no package/runtime dependency, extra secret or app-specific scientific code is introduced',()=>{
 const project=fs.readFileSync(path.join(root,'tools/granada_g25_external_navigation_harness/G25ExternalNavigationHarness.csproj'),'utf8');
 assert(project.includes('ExternalNavigationPolicy.cs'));
 assert(project.includes('<TargetFramework>net8.0</TargetFramework>'));
 assert(!project.includes('PackageReference'));
 assert(!policy.includes('OpenFOAM')&&!policy.includes('QuickCup')&&!policy.includes('HttpClient'));
});
