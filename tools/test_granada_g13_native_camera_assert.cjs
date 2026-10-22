'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {graft}=require('./granada_g13_native_camera_assert.cjs');
const pathToHost=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/Program.cs');
const src=fs.readFileSync(pathToHost,'utf8');
test('temporary G13 native gate installs next to original camera/physics checks',()=>{
 const patched=graft(src);
 assert(patched.includes("g13NativeCameraAudit?.result==='PASS'"));
 assert(patched.includes("g13NativeCameraAudit?.result==='NOT_APPLICABLE'"));
 assert(patched.includes('playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass;'));
 assert(patched.includes('g13NativeCameraPass,g13NativeCameraAudit,'));
 assert(patched.includes('physicalFrameMatches,displayedTimeMatches'));
 assert(patched.includes('clockMatchesRealFrame&&distinctCameras&&cameraNamesReadable&&fieldNavHidden&&'));
 assert(patched.length>src.length);
});
test('no false green, no duplicate bypass of G13 native camera gate',()=>{
 const patched=graft(src);
 assert.throws(()=>graft(patched),/already installed|anchor count/i);
 assert.throws(()=>graft(src.replace('playNotCollapsed&&cachePopoverValid;', 'playNotCollapsed;')), /anchor count/);
 assert.throws(()=>graft(src.replace('const cameraDocked=', 'const missingDock=')), /anchor count/);
});
test('test-only native change is measured after original source, not on product branch',()=>{
 const prefix=src.split('const cameraDocked=')[0];
 const patched=graft(src);
 assert(patched.startsWith(prefix));
 assert(!patched.includes('humanVisualApproved:true'));
 assert(!patched.includes('cachePopoverValid||'));
 assert(!patched.includes('playNotCollapsed||'));
});
