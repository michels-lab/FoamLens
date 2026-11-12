'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const field=fs.readFileSync(path.join(root,'v14-field-view.js'),'utf8');
const compare=fs.readFileSync(path.join(root,'v14-z-field-compare.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
const layout=fs.readFileSync(path.join(root,'v24-field-f2-viewport-layout.js'),'utf8');

function isolate(source,head,tail,args,values){
 const a=source.indexOf(head),b=source.indexOf(tail,a+head.length);
 assert(a>=0&&b>a,'missing original source function '+head);
 return new Function(...args,source.slice(a,b)+'; return '+head.match(/function\s+(\w+)/)[1])(...values)
}

test('the real A viewport has the required ID for the same height/restore/reset controls as B',()=>{
 assert(field.includes('<div class="fvViewport" id="fvViewport">'));
 assert(layout.includes("fvViewport:'A',fcViewport:'B'"));
 assert(layout.includes("if(!pvViews[viewport.id]||viewport.dataset.pvReady==='yes')return;"));
 assert(layout.includes("toolbar.appendChild(div)"));
});

test('single case: selecting mold displays mold only, not the unrequested metal region',()=>{
 const scene={choices:new Map()},selection={value:'metal'};
 const choice=isolate(field,'function fvRegionChoice(c,region){','function fvRegionPrimaryVisible()',[
  'fvRegionEnsureCase','fvRegionScene','fvFieldGroups','document'],[
  ()=>{},scene,()=>[{name:'T',kind:'scalar'}],{getElementById:id=>id==='fvRegion'?selection:{value:'T'}}]);
 const c={id:'case',regions:['metal','mold']};
 assert.equal(choice(c,'metal').visible,true);
 assert.equal(choice(c,'mold').visible,false);
 selection.value='mold';
 assert.equal(choice(c,'metal').visible,false,'implicit old primary must disappear');
 assert.equal(choice(c,'mold').visible,true);
 const overlay=choice(c,'metal');overlay.visible=true;overlay.visibilityExplicit=true;
 assert.equal(choice(c,'metal').visible,true,'explicit overlay remains available');
 selection.value='metal';
 assert.equal(choice(c,'mold').visible,false,'unrequested mold must follow primary changes');
});

test('comparison regions also default to selected primary only, preserving explicit overlays',()=>{
 const state={};
 const scene={caseId:null,choices:new Map(),savedByCase:new Map(),layers:new Map()};
 const list=isolate(compare,'function fcPhysicalChoiceList(state,c,primary){','function fcPhysicalViewContext(',[
  'fcPhysicalFor','fcPhysicalRelease','fvRegionNames','fvFieldGroups','fcReconcilePhysicalChoice'],[
   ()=>scene,()=>{},()=>['metal','mold'],()=>[{name:'T',kind:'scalar'}],()=>{}]);
 const c={id:'case'};
 list(state,c,'mold');
 assert.equal(scene.choices.get('metal').visible,false);
 assert.equal(scene.choices.get('mold').visible,true);
 list(state,c,'metal');
 assert.equal(scene.choices.get('metal').visible,true);
 assert.equal(scene.choices.get('mold').visible,false);
 scene.choices.get('mold').visible=true;
 scene.choices.get('mold').visibilityExplicit=true;
 list(state,c,'metal');
 assert.equal(scene.choices.get('mold').visible,true);
});

test('an imported single case cannot restore an old B without a new user comparison action',()=>{
 assert(workspace.includes('fwState.compareUserRequested=false'),'the old comparison request must be cleared on Field exit for a sole case');
 assert(workspace.includes('if(!fwState.compareUserRequested){'),'Field entry must disable B absent an explicit current request');
 assert(workspace.includes("enabled.checked=true;enabled.dispatchEvent(new Event('change',{bubbles:true}))"),'B opens only on explicit Add view action');
 assert(workspace.includes('compareRegion.value=primaryRegion.value'),'an explicitly added B must start with A selected region');
 assert(compare.includes("compare.classList.toggle('hidden',!fcState.enabled)"),'compare scene stays hidden while disabled');
});
