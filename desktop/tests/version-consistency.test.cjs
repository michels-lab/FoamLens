'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');

assert(index.includes('<title>FoamLens v51 — by Michel Duarte</title>'),'Frontend title is not v51.');
assert(index.includes('<span>Version</span><b>v51</b><div>Desktop v1.3.2</div>'),'About/version dialog is not v51 / Desktop v1.3.2.');
assert(index.includes("productVersion:'v51'"),'Workspace productVersion is not v51.');
assert(!index.includes('v51 development'),'Release UI still reports a development build.');
assert(!index.includes('release candidate build'),'Release UI still reports a release candidate.');
assert(!index.includes("productVersion:'v51-development'"),'Workspace payload still reports a development version.');
assert(/<Version>1\.3\.2<\/Version>/.test(project),'Desktop project version is not 1.3.2.');
assert(/<AssemblyVersion>1\.3\.2\.0<\/AssemblyVersion>/.test(project),'AssemblyVersion is not 1.3.2.0.');
assert(/<FileVersion>1\.3\.2\.0<\/FileVersion>/.test(project),'FileVersion is not 1.3.2.0.');
assert(readme.includes('# FoamLens Desktop v1.3.2'),'Desktop README is not v1.3.2.');
assert(readme.includes('current release is **FoamLens Desktop v1.3.2 with frontend v51**'),'Desktop README does not describe v1.3.2/v51 as the current release.');

console.log('Release version consistency regression passed: frontend v51 / Desktop v1.3.2.');
