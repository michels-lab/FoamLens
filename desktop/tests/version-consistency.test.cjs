'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');

assert(index.includes('<title>FoamLens v51 — by Michel Duarte</title>'),'Frontend title is not v51 development.');
assert(index.includes('<b>v51 development</b>'),'About/version dialog is not marked v51 development.');
assert(index.includes('Desktop v1.3.0 development · not a published release'),'Development status is missing from About/version dialog.');
assert(index.includes("productVersion:'v51-development'"),'Workspace productVersion is not v51-development.');
assert(!index.includes('<span>Version</span><b>v50</b>'),'Visible version dialog still reports v50.');
assert(!index.includes("productVersion:'v50'"),'New workspace payload still reports v50.');
assert(/<Version>1\.3\.0<\/Version>/.test(project),'Desktop project version is not 1.3.0.');
assert(readme.includes('currently published stable release remains **FoamLens Desktop v1.2.0 with frontend v50**'),'Desktop README must preserve v1.2.0/v50 as the published stable release.');
assert(readme.includes('not a published release'),'Desktop README must mark v1.3.0 as development.');

console.log('Development version consistency regression passed: frontend v51 / Desktop v1.3.0 development; stable remains v1.2.0/v50.');
