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

assert(index.includes('<title>FoamLens v51 — by Michel Duarte</title>'),'Frontend title is not v51.');
assert(index.includes('<span>Version</span><b>v51</b>'),'About/version dialog does not expose frontend v51.');
assert(index.includes("productVersion:'v51'"),'Workspace productVersion is not v51.');
assert(!index.includes('v51 development'),'Release UI still reports a frontend development build.');
assert(!index.includes('release candidate build'),'Release UI still reports a release candidate.');
assert(!index.includes("productVersion:'v51-development'"),'Workspace payload still reports a development version.');
assert(/<Version>1.6.0<\/Version>/.test(project),'Desktop project version is not 1.6.0.');
assert(/<AssemblyVersion>1.6.0\.0<\/AssemblyVersion>/.test(project),'AssemblyVersion is not 1.6.0.0.');
assert(/<FileVersion>1.6.0\.0<\/FileVersion>/.test(project),'FileVersion is not 1.6.0.0.');
assert(readme.includes('The current public release is **FoamLens Desktop v1.6.0 with frontend v51**'),'Desktop README does not identify v1.6.0 as the current public release.');
assert(readme.includes('# FoamLens Desktop v1.6.0'),'Desktop README does not identify the v1.6.0 release.');

const fieldView=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
assert(fieldView.includes("Desktop v1.6.0"),'Field View module does not expose the v1.6.0 build identity.');
assert(program.includes('"FoamLens", "Desktop", "1.6.0", "app"'),'Desktop app bundle root is not isolated for v1.6.0.');
assert(program.includes('html = html.Replace("1.4.9", "1.6.0", StringComparison.Ordinal);'),'Desktop host does not normalize embedded frontend release identity to v1.6.0.');
assert(installer.includes('#define MyAppVersion "1.6.0"'),'Installer fallback version is not v1.6.0.');
assert(workflow.includes('# FoamLens CI — v1.6.0 release validation'),'CI workflow identity is not v1.6.0.');
assert(workflow.includes('FoamLens-Windows-v${{ steps.ver.outputs.version }}'),'CI artifact version is not derived from the project version.');
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
console.log('Version consistency passed: public Desktop v1.6.0 / frontend v51 with release-normalized build identity.');
