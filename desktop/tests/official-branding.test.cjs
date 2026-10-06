'use strict';

const fs=require('fs');
const path=require('path');
const child=require('child_process');
const assert=require('assert');

const root=path.join(__dirname,'..');
const frontend=path.join(root,'src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const workflow=fs.readFileSync(path.join(root,'..','.github','workflows','build-foamlens-desktop.yml'),'utf8');
const assets=path.join(frontend,'assets','branding');
const gitBlob=p=>child.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

assert.strictEqual(gitBlob(path.join(assets,'official-app-icon.svg')),'9dbfa5e8fd42aaf78e6fe88e81d27a35a124a62e','Official app icon drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-mark.svg')),'6e66864f5017b21964a6a8a1e2ec3546c4f3fb6a','Official mark drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-lockup.svg')),'88ec88d3bb3fa2d8c5d7d7dbe0817ccddc6b47dc','Official lockup drifted from the Michel\'s Lab canonical blob.');

for(const file of ['official-app-icon.svg','official-mark.svg','official-lockup.svg']){
  assert(project.includes('frontend\\assets\\branding\\'+file),'Desktop project does not embed '+file+'.');
  assert(program.includes('FoamLensDesktop.Branding.'+file),'Desktop host does not materialize '+file+'.');
}
assert(index.includes('href="assets/branding/official-app-icon.svg"'),'Favicon does not use the official app icon.');
assert(index.includes('id="launchOfficialLogo"')&&index.includes('src="assets/branding/official-lockup.svg"'),'Launch screen does not use the official lockup.');
assert(index.includes('id="sidebarOfficialLogo"')&&index.includes('src="assets/branding/official-mark.svg"'),'Sidebar does not use the official mark.');
assert(index.includes('id="aboutOfficialLogo"'),'About does not use the official lockup.');
assert(!index.includes('class="foamLensLogoSvg"'),'Legacy competing inline FoamLens logo remains active.');
assert(program.includes("['launchOfficialLogo','sidebarOfficialLogo','aboutOfficialLogo']"),'Packaged smoke does not validate rendered official branding.');
assert(workflow.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/assets bundle_tmp/assets -Recurse -Force'),'Desktop bundle does not vendor frontend brand assets.');
assert((workflow.match(/node desktop\/tests\/official-branding\.test\.cjs/g)||[]).length===1,'Official branding regression must run exactly once in CI.');

console.log('Official FoamLens branding passed: canonical SVGs, launch/sidebar/About, favicon, embedded runtime assets and CI ownership are wired.');
