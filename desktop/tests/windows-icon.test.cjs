'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const project=fs.readFileSync(path.join(root,'src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const installer=fs.readFileSync(path.join(root,'installer','FoamLens.iss'),'utf8');
const iconPath=path.join(root,'src','FoamLensDesktop','Assets','FoamLens.ico');
const icon=fs.readFileSync(iconPath);

assert(project.includes('<ApplicationIcon>Assets\\FoamLens.ico</ApplicationIcon>'),'Desktop EXE is not configured with FoamLens.ico.');
assert(program.includes('System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath)'),'Window/taskbar icon is not loaded from the packaged executable.');
assert(installer.includes('SetupIconFile=..\\src\\FoamLensDesktop\\Assets\\FoamLens.ico'),'Installer does not use FoamLens.ico.');
assert((installer.match(/IconFilename: "\{app\}\\FoamLens\.exe"/g)||[]).length>=2,'Start-menu and desktop shortcuts must explicitly use the FoamLens executable icon.');
assert(icon.length>100000,'FoamLens.ico is unexpectedly small for the official multi-resolution derivative.');
assert.strictEqual(icon[0],0);assert.strictEqual(icon[1],0);assert.strictEqual(icon[2],1);assert.strictEqual(icon[3],0);
const count=icon.readUInt16LE(4);assert.strictEqual(count,7,'Official FoamLens.ico must contain seven raster sizes.');
const sizes=[];for(let i=0;i<count;i++){const w=icon[6+i*16]||256,h=icon[7+i*16]||256;assert.strictEqual(w,h,'ICO entries must be square.');sizes.push(w)}
assert.deepStrictEqual(sizes,[16,24,32,48,64,128,256],'Official FoamLens.ico sizes are incomplete.');

console.log('Windows native icon regression passed: EXE, window/taskbar, installer and shortcuts use FoamLens.ico.');
