'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','..');
const identity=JSON.parse(fs.readFileSync(path.join(root,'store','partner-center.json'),'utf8'));
const manifest=fs.readFileSync(path.join(root,'store','AppxManifest.template.xml'),'utf8');
const program=fs.readFileSync(path.join(root,'desktop','src','FoamLensDesktop','Program.cs'),'utf8');
const project=fs.readFileSync(path.join(root,'desktop','src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const updater=fs.readFileSync(path.join(root,'desktop','src','FoamLensDesktop','frontend','v19-auto-update.js'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github','workflows','build-store-msix.yml'),'utf8');
assert.deepStrictEqual(identity,{
  packageIdentityName:'MichelDuarte.FoamLens',
  publisher:'CN=D2024BFC-8238-4063-A8DD-A91208327224',
  publisherDisplayName:'Michel Duarte',
  displayName:'FoamLens',
  storeId:'9P0PTHSQ89LL'
});
for(const token of ['{{PACKAGE_IDENTITY_NAME}}','{{PUBLISHER}}','{{PUBLISHER_DISPLAY_NAME}}','{{DISPLAY_NAME}}','{{VERSION}}'])assert(manifest.includes(token),'Store manifest missing '+token);
assert(manifest.includes('Executable="FoamLens.exe"'));
assert(manifest.includes('EntryPoint="Windows.FullTrustApplication"'));
assert(manifest.includes('<rescap:Capability Name="runFullTrust" />'));
assert(project.includes("Condition=\"'$(FoamLensStoreChannel)' == 'true'\""));
assert(project.includes('FOAMLENS_STORE'));
assert(program.includes('private const bool StoreDistributionChannel = true;'));
assert(program.includes('StoreDistributionChannel ? "&store=1" : ""'));
assert(/if\s*\(!StoreDistributionChannel\)\s*_ = CheckForUpdatesAsync\(userInitiated: false\);/.test(program),\n  'Store package does not suppress startup GitHub update checks.');
assert(program.includes('This edition is installed and updated through Microsoft Store.'));
assert(updater.includes("const auStoreChannel=new URLSearchParams(location.search).get('store')==='1';"));
assert(updater.includes("channel:'store'"));
assert(updater.includes("channel:'github'"));
assert(workflow.includes('-p:FoamLensStoreChannel=true'));
assert(workflow.includes('makeappx'));
assert(workflow.includes('FoamLens-Store-v'+'$'+'{{ steps.ver.outputs.version }}-x64.msix'));
assert(!workflow.includes('gh release create'));
assert(workflow.includes('Microsoft Store signs accepted Store packages'));
console.log('Microsoft Store MSIX contract passed: Partner Center identity, Store-only updater behavior and package workflow are pinned.');
