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
assert(index.includes('<span>Version</span><b>v51</b><div>Desktop v1.3.2</div>'),'About/version dialog is not v51 / Desktop v1.3.2.');
assert(index.includes("productVersion:'v51'"),'Workspace productVersion is not v51.');
assert(!index.includes('v51 development'),'Release UI still reports a development build.');
assert(!index.includes('release candidate build'),'Release UI still reports a release candidate.');
assert(!index.includes("productVersion:'v51-development'"),'Workspace payload still reports a development version.');
assert(/<Version>1\.4\.1<\/Version>/.test(project),'Development Desktop project version is not 1.4.1.');
assert(/<AssemblyVersion>1\.4\.1\.0<\/AssemblyVersion>/.test(project),'Development AssemblyVersion is not 1.4.1.0.');
assert(/<FileVersion>1\.4\.1\.0<\/FileVersion>/.test(project),'Development FileVersion is not 1.4.1.0.');
assert(readme.includes('# FoamLens Desktop v1.4.1'),'Desktop README is not v1.4.1.');
assert(readme.includes('current release is **FoamLens Desktop v1.4.1 with frontend v51**'),'Desktop README does not describe v1.4.1/v51 as the current release.');

const fieldView=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
assert(fieldView.includes("Desktop v1.4.1"),'Field View module does not expose the v1.4.1 build identity.');
assert(program.includes('"FoamLens", "Desktop", "1.4.1", "app"'),'Desktop app bundle root is not isolated for v1.4.1.');
console.log('Version consistency passed: Desktop v1.4.1 / frontend v51.');
