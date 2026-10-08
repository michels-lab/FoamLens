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
assert(icon.length>12000,'FoamLens.ico is missing its multi-resolution lossless PNG-derived layers.');
assert.strictEqual(icon[0],0);assert.strictEqual(icon[1],0);assert.strictEqual(icon[2],1);assert.strictEqual(icon[3],0);
const count=icon.readUInt16LE(4);assert.strictEqual(count,7,'Official FoamLens.ico must contain seven raster sizes.');
const sizes=[];for(let i=0;i<count;i++){const w=icon[6+i*16]||256,h=icon[7+i*16]||256;assert.strictEqual(w,h,'ICO entries must be square.');sizes.push(w)}
assert.deepStrictEqual(sizes,[16,24,32,48,64,128,256],'Official FoamLens.ico sizes are incomplete.');
let prevEnd=6+16*count;
for(let i=0;i<count;i++){
  const start=icon.readUInt32LE(6+i*16+12),len=icon.readUInt32LE(6+i*16+8);
  assert(start>=prevEnd&&start+len<=icon.length,'Overlapping/out-of-range ICO frame '+i);
  assert(icon.subarray(start,start+8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Frame '+i+' must be a lossless PNG.');
  assert.strictEqual(icon.readUInt32BE(start+16),sizes[i],'ICO frame width mismatch.');
  assert.strictEqual(icon.readUInt32BE(start+20),sizes[i],'ICO frame height mismatch.');
  prevEnd=start+len;
}
assert.strictEqual(prevEnd,icon.length,'ICO contains undocumented embedded data.');
const vector=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','assets','branding','official-app-icon.svg'),'utf8');
assert(!/A360|A280|M190 275|M190 750|M95 78|M95 418/.test(vector),'Windows ICO SVG source still has owner-rejected bracket arcs.');
const generator=fs.readFileSync(path.join(root,'..','tools','generate_windows_icon.py'),'utf8');
assert(generator.includes('assert_arc_free(markup)')&&generator.includes('resvg_py.svg_to_bytes'),'Windows icon is not reproducibly derived from the canonical SVG.');
const windowsWorkflow=fs.readFileSync(path.join(root,'..','.github','workflows','build-foamlens-desktop.yml'),'utf8');
assert(windowsWorkflow.includes('python tools/generate_windows_icon.py --check'),
  'Active Windows installer release CI must verify native icon/source parity.');
const storeWorkflow=fs.readFileSync(path.join(root,'..','.github','workflows','build-store-msix.yml'),'utf8');
const storePaused=!storeWorkflow.includes('\n  push:')&&
  storeWorkflow.includes("github.event_name == 'owner-explicitly-resumed-microsoft-store-builds'");
if(!storePaused){
  assert(storeWorkflow.includes('python tools/generate_windows_icon.py --check'),
    'Active Microsoft Store CI must verify source/icon parity.');
} else {
  assert(storeWorkflow.includes('workflow_dispatch:'),
    'Paused Microsoft Store workflow must retain explicit owner-resumption controls.');
}

console.log('Windows native icon regression passed: EXE, window/taskbar, installer and shortcuts use FoamLens.ico.');
