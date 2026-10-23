'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {graft,diagnostics}=require('./granada_g18b_css_origins.cjs');
function sample({width=70.390625,inlineImportant=false,mediaActive=true,compact=true}={}){
 const selector='body.flRibbonReady.appMode-field #appShell.app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay';
 const styles=Object.fromEntries([
  ['gfwG7Style','68px','100%'],
  ['flG12WideFieldRibbonStyle','112px','none'],
  ['flG16WidePlayCascadeGuard','112px','none']
 ].map(([key,min,max])=>[key,{id:key,sheet:{cssRules:[{
  conditionText:'(min-width:1025px) and (max-width:1250px)',cssRules:[{
   selectorText:selector,style:{getPropertyValue:key=>key==='min-width'?min:key==='max-width'?max:'',
    getPropertyPriority:key=>key==='min-width'?'important':''}
  }]
 }]}}]));
 const el={clientWidth:Math.floor(width)-2,scrollWidth:Math.floor(width)-2,
  getBoundingClientRect:()=>({width,height:30}),
  matches:x=>x===selector,
  getAttribute:x=>x==='style'?'color:inherit':null,
  style:{getPropertyValue:k=>k==='min-width'?(inlineImportant?'68px':''):'',
   getPropertyPriority:k=>k==='min-width'&&inlineImportant?'important':''}
 };
 const app={classList:{contains:()=>compact}};
 const body={classList:{contains:k=>k==='flRibbonReady'||k==='appMode-field'}};
 const document={
  documentElement:{clientWidth:1140},body,
  getElementById:id=>id==='fwTimePlay'?el:id==='appShell'?app:styles[id]||null
 };
 const ctx={document,innerWidth:1140,outerWidth:1150,visualViewport:{width:1140},devicePixelRatio:1,
  getComputedStyle:()=>({minWidth:width<100?'68px':'112px',maxWidth:'none',width:width+'px'}),
  matchMedia:()=>({matches:mediaActive})};
 const val=vm.runInNewContext('(function(){'+diagnostics+';return g18CssCascadeProbe})()',ctx,{timeout:900});
 return val;
}
test('G18b captures real original Play bad width and distinguishes G7/G12/G16 rule origins',()=>{
 const d=sample();assert.equal(d.result,'PLAY_WIDTH_FAIL');
 assert.equal(d.originalPlay.width,70.390625);
 assert.equal(d.originalPlay.computedMinWidth,'68px');
 assert.equal(d.g7.rules.length,1);assert.equal(d.g16.rules.length,1);
 assert.equal(d.g16.rules[0].minWidth,'112px');
 assert.equal(d.g16.rules[0].selectorMatches,true);
 assert.equal(d.g16.rules[0].ruleActive,true);
 assert.equal(d.originalSelectorMatches,true);assert.equal(d.readOnly,true);
});
test('record original inline-important priority independently from stylesheet declarations',()=>{
 const d=sample({inlineImportant:true});assert.equal(d.originalPlay.inlineMinWidth,'68px');
 assert.equal(d.originalPlay.inlineMinWidthPriority,'important');
 assert.equal(d.g16.rules[0].minWidthImportant,true);
});
test('identify when CSS media mismatch prevents guarded original source rule applying',()=>{
 const d=sample({mediaActive:false});assert.equal(d.g16.rules[0].ruleActive,false);
});
test('passing original Play remains separately measured instead of diagnosing a failure that never occurred',()=>{
 const d=sample({width:112});assert.equal(d.result,'PLAY_WIDTH_PASS');
 assert.equal(d.originalPlay.width,112);
});
test('native graft preserves original G16 forced and Play independent gates without altering boolean',()=>{
 const src=['                      const playMetrics=playButton?getComputedStyle(playButton):null;',
  '                        g16ForcedCompactReplayPass,g16ForcedCompactReplay,'].join('\n');
 const out=graft(src);assert(out.includes('g18CssCascadeProbe,'));
 assert(out.includes('g16ForcedCompactReplayPass,g16ForcedCompactReplay,'));
 assert.throws(()=>graft(out),/already injected|cannot graft/);
 assert.throws(()=>graft(src.replace('g16ForcedCompactReplayPass,','')),/cannot graft/);
});
test('does not modify original solver, styles or UI and does not claim physical DPI/approval',()=>{
 const deny=['.click(','.dispatchEvent(','.setAttribute(','.style.setProperty(','.classList.add(','.classList.remove(','localStorage','fetch(','writeFileSync'];
 for(const x of deny)assert(!diagnostics.includes(x),x);
 assert(diagnostics.includes('physicsChanged:false'));
 assert(diagnostics.includes('readOnly:true'));
 assert(diagnostics.includes('signoffApproved:false'));
});
