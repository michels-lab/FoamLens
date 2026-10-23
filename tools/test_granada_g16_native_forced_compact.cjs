'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {graft,inserted}=require('./granada_g16_native_forced_compact.cjs');
function sample({viewport=1140,initial=false,width=112,minWidth='112px',maxWidth='none',text='▶ Play ↻',aria='Play continuously in a loop',client=110,scroll=110,throws=false}={}){
 const classes=new Set(initial?['gfwCompact']:[]);
 const original=classes.has('gfwCompact');
 const app={classList:{
  contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)}};
 const play={textContent:text,clientWidth:client,scrollWidth:scroll,
  getAttribute:s=>s==='aria-label'?aria:null,
  getBoundingClientRect:()=>({width,height:32})};
 const document={getElementById:s=>s==='appShell'?app:s==='fwTimePlay'?play:null};
 const context={innerWidth:viewport,document,Number,getComputedStyle:()=>{
   if(throws)throw Error('deliberate computed-style failure');
   return{minWidth,maxWidth};
 }};
 let out,err;
 try{out=vm.runInNewContext('(function(){'+inserted+';return{detail:g16ForcedCompactReplay,pass:g16ForcedCompactReplayPass}})()',context,{timeout:1000})}catch(e){err=e}
 return{out,err,restored:classes.has('gfwCompact')===original,nowCompact:classes.has('gfwCompact')};
}
test('forces true original compact CSS state at wide 1140px then returns to prior noncompact',()=>{
 const f=sample();assert(!f.err);assert.equal(f.out.pass,true);assert.equal(f.out.detail.result,'PASS');
 assert.equal(f.out.detail.replayClassPresent,true);
 assert.equal(f.out.detail.originalClassInitiallyPresent,false);
 assert.equal(f.out.detail.originalClassRestored,true);assert(f.restored);assert.equal(f.nowCompact,false);
 assert.equal(f.out.detail.computedMinWidth,'112px');
});
test('already-stale compact state stays present after exactly one forced CSS replay',()=>{
 const f=sample({initial:true});assert.equal(f.out.pass,true);assert(f.restored);
 assert.equal(f.nowCompact,true);assert.equal(f.out.detail.originalClassInitiallyPresent,true);
});
test('replays measured BAD original 68px min width and actual 70.390625px to FAIL closed',()=>{
 const f=sample({width:70.390625,minWidth:'68px',maxWidth:'100%',client:68,scroll:68});
 assert.equal(f.out.pass,false);assert.equal(f.out.detail.result,'FAIL');assert(f.restored);
});
test('independently refuses text overflow, bad aria and invalid height',()=>{
 for(const opts of [{scroll:145},{aria:'No loop'},{text:'Pause'}]){
  const f=sample(opts);assert.equal(f.out.pass,false);
  assert(f.restored);
 }
});
test('below original laptop breakpoint is NOT_APPLICABLE and class untouched',()=>{
 for(const viewport of [500,640,1024,1251,1920]){
  const f=sample({viewport});assert.equal(f.out.detail.result,'NOT_APPLICABLE');
  assert.equal(f.out.pass,true);assert(f.restored);
 }
});
test('CSS parser exception propagates and finally restores original WebView2 class',()=>{
 const f=sample({throws:true});assert(f.err);
 assert.match(String(f.err),/deliberate computed-style failure/);
 assert.equal(f.nowCompact,false);assert(f.restored);
});
test('graft is additive to native Play/Camera/Field and detects original-shape drift',()=>{
 const host=[
 "                      const playMetrics=playButton?getComputedStyle(playButton):null;",
 "                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass;",
 "                        g16NativePlayPass,g16NativePlayAudit,"
 ].join('\n');
 const out=graft(host);
 assert(out.includes('playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass&&g16ForcedCompactReplayPass;'));
 assert(out.includes('g16ForcedCompactReplayPass,g16ForcedCompactReplay,'));
 assert.throws(()=>graft(out),/already present|source drift/);
 assert.throws(()=>graft(host.replace('g16NativePlayPass;','true;')),/source drift/);
});
test('runtime synthetic test does not mutate source scientific data, install, or persisted state',()=>{
 for(const forbidden of ['localStorage','fetch(','.click(','.dispatchEvent(','.setAttribute(', 'postMessage(', 'setTimeout(', 'requestAnimationFrame('])
  assert(!inserted.includes(forbidden),forbidden);
 assert(inserted.includes("if(!hadCompact)app.classList.remove('gfwCompact');"));
 assert(inserted.includes('finally{'));
 assert(inserted.includes('physicsChanged:false'));
 assert(inserted.includes('humanApproved:false'));
});
