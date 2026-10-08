'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const installer=fs.readFileSync(path.join(root,'installer','FoamLens.iss'),'utf8');
const workflow=fs.readFileSync(path.join(root,'..','.github','workflows','build-foamlens-desktop.yml'),'utf8');
const rootLicense=fs.readFileSync(path.join(root,'..','LICENSE'),'utf8');

assert(index.includes('<title>FoamLens v51 — by Michel Duarte</title>'),'Frontend title is not v51.');
assert(index.includes('<span>Version</span><b>v51</b>'),'About/version dialog does not expose frontend v51.');
assert(index.includes("productVersion:'v51'"),'Workspace productVersion is not v51.');
assert(!index.includes('v51 development'),'Release UI still reports a frontend development build.');
assert(!index.includes('release candidate build'),'Release UI still reports a release candidate.');
assert(!index.includes("productVersion:'v51-development'"),'Workspace payload still reports a development version.');
assert(/<Version>1.8.0<\/Version>/.test(project),'Desktop project version is not 1.8.0.');
assert(/<AssemblyVersion>1.8.0\.0<\/AssemblyVersion>/.test(project),'AssemblyVersion is not 1.8.0.0.');
assert(/<FileVersion>1.8.0\.0<\/FileVersion>/.test(project),'FileVersion is not 1.8.0.0.');
assert(readme.includes('The current public release is **FoamLens Desktop v1.8.0 with frontend v51**'),'Desktop README does not identify v1.8.0 as the current public release.');
assert(readme.includes('# FoamLens Desktop v1.8.0'),'Desktop README does not identify the v1.8.0 release.');
assert(rootLicense.startsWith('FoamLens — Proprietary Software License'),'Root license still carries a legacy product identity.');
assert(rootLicense.includes("Michel Armando Duarte Flores / Michel's Lab"),'Root license does not carry the current FoamLens/Michel\'s Lab ownership identity.');
assert(!rootLicense.includes('OpenFOAM PostPlotter'),'Legacy OpenFOAM PostPlotter naming remains in the active root license.');

const fieldView=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
assert(fieldView.includes("typeof flDesktopVersion==='function'?flDesktopVersion():'—'"),'Field View version dialog does not derive Desktop identity from the shared version helper.');
assert(program.includes('"FoamLens", "Desktop", DesktopVersionText, "app"'),'Desktop app bundle root is not derived from assembly version metadata.');
assert(program.includes('private static string DesktopVersionText'),'Desktop host does not expose one shared assembly-version source for runtime paths/UI.');
assert(!program.includes('"FoamLens", "Desktop", "1.8.0", "app"'),'Desktop app bundle root is still pinned to v1.8.0.');
assert(index.includes("function flDesktopVersion(){return document.documentElement.dataset.foamLensDesktopVersion||'1.8.0'}"),'Frontend Desktop version helper is not aligned with the current public version/fallback.');
assert(!/<html[^>]*\sdata-desktop-version(?:\s|=|>)/i.test(index),'The root HTML element must never carry the visible data-desktop-version label attribute.');
assert(program.includes('GetName().Version?.ToString(3)')&&program.includes('data-foamlens-desktop-version'), 'Desktop host does not bind the packaged frontend to isolated assembly-version metadata.');
assert(!program.includes('$"<html lang=\"en\" data-desktop-version='),'Desktop host still puts the presentation label attribute on the root HTML element.');
assert(program.includes('Regex.IsMatch(html, @"<html[^>]*\\sdata-desktop-version'),
  'Desktop host materialization no longer rejects destructive root data-desktop-version collisions.');
assert(!program.includes('html = html.Replace("1.4.9", "1.8.0", StringComparison.Ordinal);'),'Desktop host still depends on the historical 1.4.9→1.8.0 string replacement.');
assert(!/\?\?\s*["']v?\d+\.\d+\.\d+(?:\.\d+)?["']/.test(program),
  'Desktop host must not fall back to a real release version when assembly metadata is unavailable.');
assert(program.includes('FoamLens assembly version metadata is unavailable.'),
  'Desktop host must fail clearly instead of impersonating a historical release version.');
assert(!index.includes('FoamLens · v39')&&!index.includes('Desktop v1.3.2'), 'About still contains stale version literals.');
assert(installer.includes('#define MyAppVersion "1.8.0"'),'Installer fallback version is not v1.8.0.');
assert(workflow.includes('# FoamLens CI — release validation'),'CI workflow does not use the version-agnostic release-validation identity.');
assert(!/FoamLens CI — v\d+\.\d+\.\d+ release validation/.test(workflow),'CI workflow identity is still pinned to a product version.');
assert(workflow.includes('FoamLens-Windows-v${{ steps.ver.outputs.version }}'),'CI artifact version is not derived from the project version.');
assert(workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main' && startsWith(github.event.head_commit.message, 'release:')"),'Main must support explicit chat-driven releases through a release: commit.');
assert(!workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main' }}"),'Ordinary main builds must not publish without explicit release intent.');
assert(workflow.includes("startsWith(github.ref, 'refs/tags/')"),'Tagged builds must retain the explicit public-release path.');
assert(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.publish == true"),'Manual release publication must require workflow_dispatch with publish=true.');
assert(workflow.includes("CHANGELOG.md")&&workflow.includes("--notes-file artifacts/release-notes.md")&&workflow.includes("visual_release_gate.py"),'GitHub release must use changelog notes and verified UI screenshot evidence.');
assert(index.includes("function flBuildIdentity(){return 'FoamLens v51 / Desktop v'+flDesktopVersion()}"),'Global export provenance identity is not derived from the Desktop version helper.');
assert((index.match(/data-desktop-version/g)||[]).length>=3,'Desktop version is not visibly surfaced in launch/sidebar/footer.');
assert(index.includes("document.title='FoamLens v51 · '+label+' — by Michel Duarte'"),'Window title does not expose the Desktop version.');
assert(index.includes('.desktopVersionBadge{'),'Desktop version badge styling is missing.');

const frontendDir=path.join(root,'src','FoamLensDesktop','frontend');
let provenanceUses=0;
for(const name of fs.readdirSync(frontendDir).filter(x=>/\.(?:js|html)$/i.test(x))){
  const source=fs.readFileSync(path.join(frontendDir,name),'utf8');
  for(const line of source.split(/\r?\n/).filter(x=>/generatedBy\s*:/.test(x))){
    provenanceUses++;
    assert(!/v51-development|Desktop v1\.3\.|Desktop v1\.4\.1/i.test(line),
      'Stale generatedBy provenance in '+name+': '+line.trim());
  }
}
assert(provenanceUses>=5,'Expected versioned export provenance was not found.');
console.log('Version consistency passed: Desktop v1.8.0 / frontend v51 with explicit tag, manual, or release:-commit publication and release-normalized build identity.');
