'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');

assert(index.includes('<title>FoamLens v51 — by Michel Duarte</title>'),'Frontend title is not v51.');
assert(index.includes('<span>Version</span><b>v51</b>'),'About/version dialog does not expose frontend v51.');
assert(index.includes("productVersion:'v51'"),'Workspace productVersion is not v51.');
assert(!index.includes('v51 development'),'Release UI still reports a frontend development build.');
assert(!index.includes('release candidate build'),'Release UI still reports a release candidate.');
assert(!index.includes("productVersion:'v51-development'"),'Workspace payload still reports a development version.');
assert(/<Version>1.4.5<\/Version>/.test(project),'Desktop project version is not 1.4.5.');
assert(/<AssemblyVersion>1.4.5\.0<\/AssemblyVersion>/.test(project),'AssemblyVersion is not 1.4.5.0.');
assert(/<FileVersion>1.4.5\.0<\/FileVersion>/.test(project),'FileVersion is not 1.4.5.0.');
assert(readme.includes('The current public release is **FoamLens Desktop v1.4.4 with frontend v51**'),'Desktop README does not identify v1.4.3 as the current public release.');
assert(readme.includes('# FoamLens Desktop v1.4.5 development build'),'Desktop README does not identify the v1.4.5 development build.');

const fieldView=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
assert(fieldView.includes("Desktop v1.4.5"),'Field View module does not expose the v1.4.5 build identity.');
assert(program.includes('"FoamLens", "Desktop", "1.4.5", "app"'),'Desktop app bundle root is not isolated for v1.4.5.');
assert(index.includes("function flBuildIdentity(){return 'FoamLens v51 / Desktop v1.4.5'}"),'Global export provenance identity is not v1.4.5.');

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
console.log('Version consistency passed: public Desktop v1.4.4; development Desktop v1.4.5 / frontend v51.');
