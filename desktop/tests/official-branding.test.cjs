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
const michelsLabLockup=path.join(assets,'michels-lab','official-lockup.png');
const gitBlob=p=>child.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();
assert.strictEqual(gitBlob(path.join(assets,'official-app-icon.svg')),'9dbfa5e8fd42aaf78e6fe88e81d27a35a124a62e','Official app icon drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-mark.svg')),'6e66864f5017b21964a6a8a1e2ec3546c4f3fb6a','Official mark drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(path.join(assets,'official-lockup.svg')),'88ec88d3bb3fa2d8c5d7d7dbe0817ccddc6b47dc','Official lockup drifted from the Michel\'s Lab canonical blob.');
assert.strictEqual(gitBlob(portraitAsset),'18fe1a68722850c3d8f918dc0799f46ffeb6dbaf','Canonical Michel Duarte About portrait is not the immutable master upload.');
assert.strictEqual(gitBlob(michelsLabLockup),'7fd48093968b31ddacd3098f5b15d962de580652','Michel\'s Lab parent-brand lockup does not match the restored canonical master source.');

for(const file of ['official-app-icon.svg','official-mark.svg','official-lockup.svg']){
  assert(project.includes('frontend\\assets\\branding\\'+file),'Desktop project does not embed '+file+'.');
  assert(program.includes('FoamLensDesktop.Branding.'+file),'Desktop host does not materialize '+file+'.');
}
assert(index.includes('href="assets/branding/official-app-icon.svg"'),'Favicon does not use the official app icon.');
assert(index.includes('id="launchOfficialLogo"')&&index.includes('src="assets/branding/official-mark.svg"'),'Launch must use the canonical mark, not a duplicate dark-lettered lockup.');
const launch=index.slice(index.indexOf('<section id="launchScreen"'),index.indexOf('<div class="app" id="appShell">'));
assert(launch.includes('class="launchIdentity"')&&launch.includes('id="launchTitle">FoamLens</h1>'),'Launch mark and product name must share one intentional visual hierarchy.');
assert(!launch.includes('src="assets/branding/official-lockup.svg"'),'Do not repeat lockup text plus a giant product title.');
assert((launch.match(/<h1\b/g)||[]).length===1,'Launch must contain a single product-name heading.');
assert(!index.includes('.launchMark{width:248px!important'),'Stale !important launch width still overrides branding layout.');
assert(index.includes('repeating-radial-gradient(ellipse at 81% 13%'),'Launch must integrate layered field contours into its composition.');
assert(program.includes('FoamLens visual launch contract passed (computed WebView2 dark/light)'),'Packaged smoke is not validating computed launch design in both themes.');
assert(program.includes('FoamLens rendered launch brand geometry/contrast is invalid'),'Visual smoke must reject legibility/geometry regressions.');
assert(program.includes('FOAMLENS_SMOKE_LAUNCH_SCREENSHOT')&&program.includes('FoamLens rendered launch screenshot captured for visual review'),'Portable/installed smoke must capture actual branded launch PNGs.');
for(const path of ['FoamLens-Portable-launch.png','FoamLens-Installed-launch.png'])assert(workflow.includes(path),'Workflow does not preserve launch screenshot artifact: '+path);
assert(program.includes("texts.every(v=>v>=4.5)")&&program.includes("document.querySelectorAll('#launchScreen h1').length===1"),'Visual smoke must check contrast and duplicate product identity.');

assert(index.includes('id="sidebarOfficialLogo"')&&index.includes('src="assets/branding/official-mark.svg"'),'Sidebar does not use the official mark.');
assert(index.includes('id="aboutOfficialLogo"'),'About does not use the official lockup.');
assert(index.includes('id="aboutPortraitImg" class="aboutPortraitImg" src="assets/branding/michel-duarte-avatar.jpg"'),'About does not use the canonical Michel Duarte portrait.');
assert(index.includes('id="aboutMichelsLabLogo" class="aboutMichelsLabLogo" src="assets/branding/michels-lab/official-lockup.png"'),'About does not show the official Michel\'s Lab parent-brand lockup.');
const productPos=index.indexOf('id="aboutOfficialLogo"'),authorPos=index.indexOf('id="aboutPortraitImg"'),studioPos=index.indexOf('id="aboutMichelsLabLogo"'),socialPos=index.indexOf('class="aboutSocials"');
assert(productPos>=0&&studioPos>productPos&&authorPos>studioPos&&socialPos>authorPos,'About must display FoamLens + Michel\'s Lab side by side, then Author and visible Social links.');
const aboutSurface=index.slice(index.indexOf('<div class="aboutOverlay" id="aboutDeveloperOverlay"'),index.indexOf('<div class="legalOverlay"'));
assert(aboutSurface.includes('class="aboutBrandPair"')&&aboutSurface.includes('id="aboutBrandTag">TOOLS WITH IDENTITY.'),'About logo pair and studio slogan must share the first screen.');
assert(index.includes('.aboutStudioUnit .aboutBrandTag{font-size:12px;font-weight:700;line-height:1.5;'),'About slogan must be legible in the responsive logo pair.');
assert(index.includes('.aboutIcon{width:34px;height:34px'),'All five About social icons must be independently readable.');
assert(!index.includes('.aboutProductMark{display:none}'),'Responsive About layout must not hide product identity.');
for(const href of [
  'https://www.instagram.com/realmichelduarte/',
  'https://www.facebook.com/realmichelduarte',
  'https://www.linkedin.com/in/realmichelduart/',
  'https://github.com/realmichelduarte',
  'mailto:realmichelduarte@gmail.com'
])assert(index.includes('href="'+href+'"'),'About social URL drifted from canonical developer profile: '+href);
assert(index.includes('TOOLS WITH IDENTITY.'),'About does not use the official Michel\'s Lab studio slogan.');
assert(!index.includes('aboutIcon ig">◎')&&!index.includes('aboutIcon gh">⌘'),'About still uses ambiguous Instagram/GitHub placeholders.');
assert(/class="aboutIcon ig"[^>]*><svg[^>]*viewBox="0 0 24 24"/.test(index),'Instagram lacks a recognizable scalable icon.');
assert(/class="aboutIcon gh"[^>]*><svg[^>]*viewBox="0 0 24 24"/.test(index),'GitHub lacks a recognizable scalable icon.');
assert(!index.includes('FoamLens · v39'),'Stale About frontend version v39 remains.');
assert(!index.includes('Desktop v1.3.2'),'Stale About Desktop version remains.');
assert(!index.includes('class="foamLensLogoSvg"'),'Legacy competing inline FoamLens logo remains active.');
assert(program.includes("['launchOfficialLogo','sidebarOfficialLogo','aboutOfficialLogo','aboutPortraitImg','aboutMichelsLabLogo']"),'Packaged smoke does not validate rendered official branding.');
assert(program.includes('brandingDeadline.Elapsed < TimeSpan.FromSeconds(10)')&&program.includes('brandingStateJson')&&program.includes('naturalWidth')&&program.includes('naturalHeight'),
  'Packaged branding smoke does not wait for decoded assets with per-image diagnostics.');
const materializedAssetRequiredByHost=asset=>{
  const segments=asset.split('/');
  const pathCombine='Path.Combine("assets", "branding", '+segments.map(segment=>'"'+segment+'"').join(', ')+')';
  return program.includes(asset)||program.includes(pathCombine);
};
for(const asset of ['official-lockup.svg','official-mark.svg','michel-duarte-avatar.jpg','michels-lab/official-lockup.png'])
  assert(materializedAssetRequiredByHost(asset),'Materialized frontend validation does not require '+asset+'.');
assert(program.includes("document.getElementById('launchTitle')")&&program.includes("launchDeadline.Elapsed < TimeSpan.FromSeconds(10)")&&program.includes("titleVisible"),
  'Packaged smoke does not wait for a visibly rendered FoamLens launch surface.');
assert(program.includes('CoreWebView2NavigationStartingEventArgs')&&program.includes('smokeNavigationId = e.NavigationId')&&program.includes('e.NavigationId == smokeNavigationId.Value'),
  'Packaged smoke is not bound to the NavigationId of the requested FoamLens document.');
assert(program.includes('NavigationStarting += OnSmokeNavigationStarting')&&program.includes('NavigationStarting -= OnSmokeNavigationStarting'),
  'Packaged smoke does not own its NavigationStarting handler lifecycle.');
assert(program.includes('bodyTextHasFoamLens')&&program.includes('bodyClasses')&&program.includes('titleWidth')&&program.includes('titleHeight'),
  'Packaged launch smoke does not preserve useful blank-screen diagnostics.');
assert(program.includes('SetVirtualHostNameToFolderMapping(')&&program.includes('"foamlens.local", AppRoot, CoreWebView2HostResourceAccessKind.Allow'),
  'Desktop host does not use the stable local virtual-host mapping.');
assert(!program.includes('InlineRasterBrandAsset(')&&!program.includes('Convert.ToBase64String(bytes)'),
  'Desktop host must not rewrite or inline immutable canonical About assets.');
assert(!index.includes('src="data:image/jpeg;base64,'),
  'About must reference the canonical portrait file instead of embedding a data URI.');
assert(index.includes('michels-lab/official-lockup.png'),
  'About must reference the canonical Michel\'s Lab parent-brand path.');
assert(!program.includes('AddWebResourceRequestedFilter('),
  'Desktop host still carries the temporary WebResourceRequested local-origin experiment.');
assert(program.includes('data-foamlens-desktop-version')&&!program.includes('$"<html lang=\"en\" data-desktop-version='),
  'Desktop host does not isolate runtime version state from visible version-label attributes.');
assert(index.includes("dataset.foamLensDesktopVersion")&&!/<html[^>]*\\sdata-desktop-version(?:\\s|=|>)/i.test(index),
  'Frontend version storage can still collide with visible data-desktop-version labels.');
assert(workflow.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/assets bundle_tmp/assets -Recurse -Force'),'Desktop bundle does not vendor frontend brand assets.');
assert(workflow.includes('Verify embedded frontend bundle integrity')&&workflow.includes('AppBundle index hash mismatch'),
  'CI does not verify the embedded AppBundle index against the source frontend.');
for(const asset of ['michel-duarte-avatar.jpg','michels-lab/official-lockup.png','official-lockup.svg'])
  assert(workflow.includes(asset),'CI AppBundle integrity check does not require '+asset+'.');
assert((workflow.match(/node desktop\/tests\/official-branding\.test\.cjs/g)||[]).length===1,'Official branding regression must run exactly once in CI.');

console.log('Official FoamLens branding passed: canonical SVGs, launch/sidebar/About, favicon, embedded runtime assets and CI ownership are wired.');

assert(index.includes("brandTag:'TOOLS WITH IDENTITY.'"),'Localized About copy must never overwrite the canonical Michel\'s Lab slogan.');
assert(!index.includes("brandTag:'Ideas · Apps"),'Legacy Michel\'s Lab slogan still overrides About at runtime.');
assert(!index.includes('.aboutMarkBox{width:min(100%,290px)!important')&&!index.includes('.aboutMarkBox{background:none!important'),'Old global About logo CSS must not override the canonical mark geometry.');
assert(index.includes('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#d4e5f7;line-height:1.65'),'About studio slogan must remain readable and not render as tiny type.');
assert(index.includes('id="aboutOfficialLogo"')&&index.includes('id="aboutOfficialLogo" class="officialBrandAsset aboutOfficialLockup" src="assets/branding/official-mark.svg"'),'About dark-on-dark lockup must use legible official mark.');
assert(program.includes('CaptureRenderedBrandEvidenceAsync()')&&program.includes('about-wide-bottom.png')===false,'About rendered smoke contract unexpectedly changed.');
assert(program.includes('about-{size.Name}-bottom.png')&&program.includes('Emulation.setDeviceMetricsOverride'),'About must be captured in real wide and compact WebView2 layouts.');
assert(workflow.includes('Verify automated screenshot and exact-artifact integrity')&&workflow.includes('visual_release_gate.py'),'Every release must verify the real UI screenshot manifest and exact installer SHA before publication.');
assert(workflow.includes('visual_release_gate.py')&&workflow.includes('make_visual_evidence.py'),'A release must use the manifest-backed rendered UI validator.');
assert(workflow.indexOf('      - name: Publish GitHub Release')===-1,'Unsafe automatic publish inside build job survived.');

// Persistent shell, compact Field and native reader lifecycle acceptance.
assert(index.includes('id="globalOfficialLogo"')&&index.includes('class="flGlobalProductName">FoamLens</strong>'),'Persistent FoamLens name/mark is missing from the global shell.');
const globalHeader=index.slice(index.indexOf('<header class="top">'),index.indexOf('</header>'));
assert(globalHeader.includes('id="aboutDeveloperBtn"')&&globalHeader.includes('id="flGlobalUpdates"'),'About and Updates must remain visible outside Home.');
assert(!index.includes('<button class="btn soft" id="aboutDeveloperBtn">About</button>'),'Hidden Home-only About control has returned.');
assert(program.includes('socialsVisibleWithoutScroll:links.every(inInitialViewport)')&&program.includes('pairedIdentityVisible:[portrait,product,studio].every(inInitialViewport)'),'About initial-viewport geometry acceptance is missing.');
assert(index.includes('lastProgressAt=Date.now()')&&index.includes('clearInterval(fieldFeedback)')&&index.includes('popAppActivity()'),'OpenFOAM field load feedback must terminate cleanly.');
assert(program.includes("'aboutDeveloperBtn','flGlobalUpdates'")&&!program.includes("['flRaCheckUpdates']"),'Runtime smoke must check permanent Updates instead of obsolete Home ribbon action.');
