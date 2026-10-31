'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(__dirname,'granada_g24_webview2_storage_probe/Program.cs'),'utf8');
const project=fs.readFileSync(path.join(__dirname,'granada_g24_webview2_storage_probe/FoamLensG24StorageProbe.csproj'),'utf8');
const driver=fs.readFileSync(path.join(__dirname,'granada_g24_real_webview2_lifecycle.ps1'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/granada-g24-real-webview2-persistence.yml'),'utf8');
const host=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
test('uses genuine original FoamLens WebView2 origin and USERDATA folder, no separate fake app URL',()=>{
 assert(host.includes('"foamlens.local", AppRoot, CoreWebView2HostResourceAccessKind.Allow'));
 assert(host.includes('ProductDataFolder, "Desktop", "WebView2"'));
 assert(code.includes('"https://" + _host + "/index.html?desktop=1"'));
 assert(code.includes('CoreWebView2Environment.CreateAsync(null, _profile)'));
 assert(code.includes('SetVirtualHostNameToFolderMapping(_host, _app'));
 assert(code.includes('document.readyState'));
 assert(code.includes('title'));
});
test('IndexedDB and localStorage data are measured from REAL browser requests and completed writes',()=>{
 for(const k of ['localStorage.setItem(key,opt.token)','indexedDB.open(databaseName,1)',"tx.objectStore('sentinels').put(opt.token,'g24')",
  'tx.oncomplete=()=>resolve(true)','tx.onerror','tx.onabort','indexedDB.databases()','indexedDB.deleteDatabase(databaseName)',
  "return {ok:local===expected && actual===expected"])
   assert(code.includes(k),k);
 assert(!code.includes('MockWebView2')&&!code.includes('fakeIndexedDb')&&!code.includes('MemoryStorage'));
});
test('native cross-process runs attest original main, physical installer and storage isolation before success',()=>{
 for(const k of ["NativeApp $original 'first original Portable","Probe 'write' $webviewProfile $appRoot 'foamlens.local'",
 "NativeApp $original 'original Portable restart","Probe 'verify' $webviewProfile $appRoot 'foamlens.local'",
 "Probe 'verify' $webviewProfile $relocated 'foamlens.local'",
 "Probe 'absent' $webviewProfile $relocated 'isolation.foamlens.local'",
 "Probe 'absent' $devProfile $appRoot 'foamlens.local'",
 "NativeApp $installed 'genuine installed",
 "same-version Inno reinstall","NativeUninstall $folder",
 "NativeApp $original 'original Portable after uninstall'",
 "Probe 'clear' $webviewProfile $appRoot 'foamlens.local'",
 "crossVersionUpgradeVerified=$false"])
 assert(driver.includes(k),k);
});
test('refuse real nonrunner user profile operations; never recursively delete browser profiles',()=>{
 assert(code.includes('RUNNER_ENVIRONMENT')&&code.includes('github-hosted'));
 assert(driver.includes("$env:RUNNER_ENVIRONMENT -eq 'github-hosted'"));
 assert(driver.includes("Refuse existing/outside-workspace test destination"));
 assert(driver.includes("Refuse existing desktop shortcut"));
 assert(!/Remove-Item[^\\r\\n]*(?:AppData|webviewProfile|storageRoot|devProfile)/i.test(driver));
 assert(!driver.includes('Remove-Item -Recurse'));
 assert(!driver.includes('GITHUB_TOKEN'));
 assert(driver.includes('cleanedOnlyTestKeysAndDatabase=$true'));
});
test('the real Windows test harness uses exactly the original WebView2 NuGet SDK version',()=>{
 const original=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/FoamLensDesktop.csproj'),'utf8');
 const version=original.match(/PackageReference Include="Microsoft.Web.WebView2" Version="([^"]+)"/);
 assert(version);
 assert(project.includes('PackageReference Include="Microsoft.Web.WebView2" Version="'+version[1]+'"'));
 assert(project.includes('<UseWindowsForms>true</UseWindowsForms>'));
});
test('CI isolates original main product from QA additions and uploads sanitized report only',()=>{
 assert(workflow.includes('ref: main'));
 assert(workflow.includes('path: qa')&&workflow.includes('path: product'));
 assert(workflow.includes('persist-credentials: false'));
 assert(workflow.includes('node --test qa/tools/granada_g24_storage_persistence.test.cjs'));
 assert(workflow.includes('granada_g24_real_webview2_lifecycle.ps1'));
 assert(workflow.includes('g24-evidence/report.json'));
 assert(!workflow.includes('gh release create'));
 assert(!workflow.includes('QUICKCUP_FIXTURE_TOKEN'));
 assert(!workflow.includes('WINDOWS_CERT_PASSWORD'));
 assert(!workflow.includes('upload-artifact@v4\\n        with:\\n          name: binary'));
});

test('real asynchronous IndexedDB proof arrives over secure nonce-bound WebView2 native message, not unresolved ExecuteScript Promise',()=>{
 for(const marker of ['WebMessageReceived += OnNativeStorageProof',
 'WebMessageReceived -= OnNativeStorageProof',
 'CoreWebView2WebMessageReceivedEventArgs',
 'message.TryGetWebMessageAsString()',
 'completed.Task.WaitAsync(TimeSpan.FromSeconds(48))',
 'window.chrome.webview.postMessage',
 "foamlens/g24-native-storage-proof/1",
 'nonce.GetString() != _token',
 'from.Scheme != Uri.UriSchemeHttps',
 'from.Port != 443',
 'completed.TrySetResult(result.Clone())'])
 assert(code.includes(marker),'G24 authentic asynchronous message requirement missing: '+marker);
 assert(!code.includes('JsonDocument.Parse(output)'),'Unresolved JS Promise may serialize to null in WebView2');
 assert(!code.includes('var output = await _view.CoreWebView2.ExecuteScriptAsync(script)'),'Do not treat promises as synchronous browser results');
});
