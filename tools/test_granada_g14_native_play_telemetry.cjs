'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {graft,playCondition}=require('./granada_g14_native_play_telemetry.cjs');
const original=fs.readFileSync(path.resolve(__dirname,'../desktop/src/FoamLensDesktop/Program.cs'),'utf8');
function simulate({width=112,scrollWidth=107,text='▶ Play',aria='Play loop',height=32,loaded=true}={}){
 const source=graft(original);
 const found=source.match(/const playMetrics=([\s\S]*?)const cache=document\.getElementById\('flRibbonCacheAdvanced'\);/);
 assert(found,'grafted snippet missing');
 const program=found[0].replace("const cache=document.getElementById('flRibbonCacheAdvanced');",'');
 const element={clientWidth:width,scrollWidth,clientHeight:height,scrollHeight:height,offsetWidth:width,textContent:text,
  attrs:{'aria-label':aria,title:'Original Play'},getAttribute(k){return this.attrs[k]||null},
  getBoundingClientRect(){return{x:100,y:75,left:100,right:100+width,top:75,bottom:75+height,width,height}},
  contains(){return true}};
 const transport={clientWidth:660,scrollWidth:660,contains:x=>x===element,getBoundingClientRect:()=>({left:20,right:740,width:720,height:40})};
 const group={contains:x=>x===transport,getBoundingClientRect:()=>({left:20,right:1120,width:1100,height:60})};
 const panel={contains:x=>x===group,clientWidth:1140,scrollWidth:1140,getBoundingClientRect:()=>({left:0,right:1140,width:1140,height:90})};
 const map={fwTimePlay:element,fwTimeTransport:transport,flRibbonTimeGroup:group,'flRibbonPanel-field':panel,
  flG12WideFieldRibbonStyle:loaded?{}:null,flG13CameraAccessStyle:{}};
 const native=width>=100&&height>=28&&scrollWidth<=width+2&&/Play|Reproducir/.test(text)&&/(loop|bucle)/i.test(aria);
 const result=vm.runInNewContext("(function(){const playButton=element,playRect=element.getBoundingClientRect(),playNotCollapsed=native,clock={textContent:'t = 9.8 s'};"+program+";return playNativeTelemetry})()",
  {element,native,innerWidth:1140,innerHeight:820,devicePixelRatio:1,
   document:{getElementById:k=>map[k],fonts:{status:'loaded'}},
   getComputedStyle:e=>({display:'inline-flex',boxSizing:'border-box',width:width+'px',minWidth:'112px',maxWidth:'none',
    height:height+'px',minHeight:'32px',flex:'0 0 auto',fontSize:'11px',fontFamily:'Arial',
    fontWeight:'700',lineHeight:'normal',paddingLeft:'10px',paddingRight:'10px',
    overflowX:'visible',overflowY:'visible',whiteSpace:'nowrap',wordBreak:'normal'})});
 return{result,native};
}
test('G14 injects passive measurements without changing original native Play threshold',()=>{
 const after=graft(original);
 assert(after.includes(playCondition));
 assert(after.includes('playNotCollapsed&&cachePopoverValid'));
 assert(after.includes('playNotCollapsed,cachePopoverValid,'));
 assert(after.includes('playNativeTelemetry,'));
 assert(!after.includes('||cachePopoverValid'));
 assert(!after.includes('playNotCollapsed=true'));
 assert.equal(after.split(playCondition).length,2);
});
test('valid Play yields all six independent contract booleans true',()=>{
 const x=simulate();assert.equal(x.native,true);assert.equal(x.result.result,'PASS');
 assert(Object.values(x.result.checks).every(Boolean));
 assert.equal(x.result.play.computed.minWidth,'112px');
 assert.equal(x.result.originalTree.transportContainsPlay,true);
 assert.equal(x.result.originalTree.ribbonContainsGroup,true);
 assert.equal(x.result.fontLoadStatus,'loaded');
});
test('text overflow fails only textFitsClient while preserving original assertion',()=>{
 const x=simulate({width:112,scrollWidth:143});assert.equal(x.native,false);
 assert.equal(x.result.checks.textFitsClient,false);
 assert.equal(x.result.checks.rectWidthAtLeast100,true);
 assert.equal(x.result.result,'FAIL');
 assert.equal(x.result.play.scrollWidth,143);
});
test('collapsed actual bounding width fails without falsely attributing to font',()=>{
 const x=simulate({width:94,scrollWidth:91});assert.equal(x.native,false);
 assert.equal(x.result.checks.rectWidthAtLeast100,false);
 assert.equal(x.result.checks.textFitsClient,true);
});
test('height, source text and original aria each independently reveal failures',()=>{
 for(const [opts,key] of [
  [{height:23},'rectHeightAtLeast28'],[{text:'❚❚ Pause'},'labelPresent'],
  [{aria:'Unlabelled control'},'loopAccessible']]){
  const x=simulate(opts);assert.equal(x.native,false,key);
  assert.equal(x.result.checks[key],false);
  assert.equal(x.result.result,'FAIL');
 }
});
test('missing G12 style is diagnostic evidence, never silent automatic repair',()=>{
 const x=simulate({loaded:false});assert.equal(x.result.stylesheet.g12Present,false);
 assert.equal(x.result.humanApproved,false);
 assert.equal(x.result.physicalOsDpiVerified,false);
});
test('graft fails closed when source contains injected code or original native criteria drift',()=>{
 const once=graft(original);
 assert.throws(()=>graft(once),/already injected|requires exactly one occurrence/);
 assert.throws(()=>graft(original.replace(playCondition,'const playNotCollapsed=true;')),/native Play assertion/);
 assert.throws(()=>graft(original.replace("playNotCollapsed,cachePopoverValid,","playNotCollapsed,")),/state report/);
});
test('G14 never edits user modules, physics equations, or original source in this branch',()=>{
 const script=fs.readFileSync(path.resolve(__dirname,'granada_g14_native_play_telemetry.cjs'),'utf8');
 const forbidden=['.click(','.dispatchEvent(','.setAttribute(', 'localStorage.setItem','Play.play','window.FoamLensFieldWorkspace.','setTimeout('];
 for(const keyword of forbidden)assert(!script.includes(keyword),keyword);
 assert(script.includes('fs.writeFileSync(program,graft(source)'));
 assert(script.includes("const program=path.resolve('desktop/src/FoamLensDesktop/Program.cs')"));
});
