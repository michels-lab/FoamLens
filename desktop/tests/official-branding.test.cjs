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
const portraitAsset=path.join(assets,'michel-duarte-avatar.jpg');
const michelsLabLockup=path.join(assets,'michels-lab-lockup.png');
const gitBlob=p=>child.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

assert.strictEqual(gitBlob(path.join(assets,'official-app-icon.svg')),'9dbfa5e8fd42aaf78e6fe88e81d27a35a124a62e','Official app icon drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-mark.svg')),'6e66864f5017b21964a6a8a1e2ec3546c4f3fb6a','Official mark drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-lockup.svg')),'88ec88d3bb3fa2d8c5d7d7dbe0817ccddc6b47dc','Official lockup drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(portraitAsset),'be4d18572bec28d53783cd4db05cb6cd289a7916','Canonical Michel Duarte About portrait drifted from the Michel\'s Lab asset registry.');
assert.strictEqual(gitBlob(michelsLabLockup),'7819ef5c7d1a5c338c67c9bbd517e5448724a5cf','Official Michel\'s Lab parent-brand lockup drifted from the canonical asset.');

for(const file of ['official-app-icon.svg','official-mark.svg','official-lockup.svg']){
  assert(project.includes('frontend\\assets\\branding\\'+file),'Desktop project does not embed '+file+'.');
  assert(program.includes('FoamLensDesktop.Branding.'+file),'Desktop host does not materialize '+file+'.');
}
assert(index.includes('href="assets/branding/official-app-icon.svg"'),'Favicon does not use the official app icon.');
assert(index.includes('id="launchOfficialLogo"')&&index.includes('src="assets/branding/official-lockup.svg"'),'Launch screen does not use the official lockup.');
assert(index.includes('id="sidebarOfficialLogo"')&&index.includes('src="assets/branding/official-mark.svg"'),'Sidebar does not use the official mark.');
assert(index.includes('id="aboutOfficialLogo"'),'About does not use the official lockup.');
assert(index.includes('id="aboutPortraitImg" class="aboutPortraitImg" src="assets/branding/michel-duarte-avatar.jpg"'),'About does not use the canonical Michel Duarte portrait.');
assert(index.includes('id="aboutMichelsLabLogo" class="aboutMichelsLabLogo" src="assets/branding/michels-lab-lockup.png"'),'About does not show the official Michel\'s Lab parent-brand lockup.');
const productPos=index.indexOf('id="aboutOfficialLogo"'),authorPos=index.indexOf('id="aboutPortraitImg"'),studioPos=index.indexOf('id="aboutMichelsLabLogo"'),socialPos=index.indexOf('class="aboutSocials"');
assert(productPos>=0&&authorPos>productPos&&studioPos>authorPos&&socialPos>studioPos,'About hierarchy is not Product → Author → Michel\'s Lab → Social.');
for(const href of [
  'https://www.instagram.com/realmichelduarte/',
  'https://www.facebook.com/realmichelduarte',
  'https://www.linkedin.com/in/realmichelduart/',
  'https://github.com/realmichelduarte',
  'mailto:realmichelduarte@gmail.com'
])assert(index.includes('href="'+href+'"'),'About social URL drifted from canonical developer profile: '+href);
assert(!index.includes('FoamLens · v39'),'Stale About frontend version v39 remains.');
assert(!index.includes('Desktop v1.3.2'),'Stale About Desktop version remains.');
assert(!index.includes('class="foamLensLogoSvg"'),'Legacy competing inline FoamLens logo remains active.');
assert(program.includes("['launchOfficialLogo','sidebarOfficialLogo','aboutOfficialLogo','aboutPortraitImg','aboutMichelsLabLogo']"),'Packaged smoke does not validate rendered official branding.');
assert(program.includes("document.getElementById('launchTitle')")&&program.includes("launchDeadline.Elapsed < TimeSpan.FromSeconds(10)")&&program.includes("titleVisible"),
  'Packaged smoke does not wait for a visibly rendered FoamLens launch surface.');
assert(program.includes('CoreWebView2NavigationStartingEventArgs')&&program.includes('smokeNavigationId = e.NavigationId')&&program.includes('e.NavigationId == smokeNavigationId.Value'),
  'Packaged smoke is not bound to the NavigationId of the requested FoamLens document.');
assert(program.includes('NavigationStarting += OnSmokeNavigationStarting')&&program.includes('NavigationStarting -= OnSmokeNavigationStarting'),
  'Packaged smoke does not own its NavigationStarting handler lifecycle.');
assert(program.includes('bodyTextHasFoamLens')&&program.includes('bodyClasses')&&program.includes('titleWidth')&&program.includes('titleHeight'),
  'Packaged launch smoke does not preserve useful blank-screen diagnostics.');
assert(workflow.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/assets bundle_tmp/assets -Recurse -Force'),'Desktop bundle does not vendor frontend brand assets.');
assert(workflow.includes('Verify embedded frontend bundle integrity')&&workflow.includes('AppBundle index hash mismatch'),
  'CI does not verify the embedded AppBundle index against the source frontend.');
for(const asset of ['michel-duarte-avatar.jpg','michels-lab-lockup.png','official-lockup.svg'])
  assert(workflow.includes(asset),'CI AppBundle integrity check does not require '+asset+'.');
assert((workflow.match(/node desktop\/tests\/official-branding\.test\.cjs/g)||[]).length===1,'Official branding regression must run exactly once in CI.');

console.log('Official FoamLens branding passed: canonical SVGs, launch/sidebar/About, favicon, embedded runtime assets and CI ownership are wired.');
