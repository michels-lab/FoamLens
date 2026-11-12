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

test('explicit multi-region actions operate inside A or B; a second viewport is never created by a region checkbox',()=>{
 const start=compare.indexOf('function fcApplyRegionVisibility(ctx,mode){');
 const end=compare.indexOf('function fcPhysicalMenu(view){',start);
 assert(start>0&&end>start,'the production per-viewport overlay action exists');
 const regions=['metal','mold','sand'];
 const c={id:'QuickCup',regions};
 const a=new Map(regions.map(region=>[region,{visible:region==='metal',visibilityExplicit:false}]));
 const b=new Map(regions.map(region=>[region,{visible:region==='mold',visibilityExplicit:false}]));
 const state={};
 let redrawA=0,redrawB=0;
 const apply=new Function('fvRegionNames','fvRegionChoice','fcPhysicalChoiceList','fcPhysicalFor','fvRegionApplyVisibility','fcPhysicalMenu','fcPhysicalReload',
   compare.slice(start,end)+';return fcApplyRegionVisibility')(
   source=>source.regions,(source,region)=>a.get(region),
   ()=>{},()=>({choices:b}),()=>{redrawA++},()=>{},()=>{redrawB++});
 assert.equal(apply({view:'A',c,primary:'metal'},'all'),true);
 assert.deepEqual([...a.values()].map(x=>x.visible),[true,true,true],'A shows 3 real regions on the SAME canvas');
 assert.deepEqual([...b.values()].map(x=>x.visible),[false,true,false],'B stays independent');
 assert([...a.values()].every(x=>x.visibilityExplicit),'checkbox selections survive asynchronous scene refresh');
 assert.equal(apply({view:'A',c,primary:'metal'},'primary'),true);
 assert.deepEqual([...a.values()].map(x=>x.visible),[true,false,false],'A returns to selected metal only');
 assert.equal(apply({view:'B',c,state,primary:'mold'},'all'),true);
 assert.deepEqual([...b.values()].map(x=>x.visible),[true,true,true],'B can independently overlay its own regions');
 assert.deepEqual([...a.values()].map(x=>x.visible),[true,false,false],'B action must not change A');
 assert.equal(redrawA,2);assert.equal(redrawB,1);
 assert.equal(apply({view:'A',c,primary:'metal'},'unknown'),false,'invalid action must not change the scene');
});

test('physical-region menu exposes explicit bulk controls and correct region-specific field catalog',()=>{
 assert(compare.includes('data-fc-region-all')&&compare.includes('data-fc-region-primary'));
 assert(compare.includes("fcApplyRegionVisibility(ctx,'all')")&&compare.includes("fcApplyRegionVisibility(ctx,'primary')"));
 assert(compare.includes("const region=row.dataset.fcRegion,ch=choice(region),groups=catalog.find(entry=>entry.region===region)?.groups||[];"),
   'each row must resolve its own region groups before field changes');
 assert(compare.includes('fcReconcilePhysicalChoice(ch,groups,e.target.value)'),
   'changing mold field must never accidentally use the unrelated metal field catalog');
 assert(compare.includes("if(view==='A'){fvRegionApplyVisibility(ctx.c);fcPhysicalMenu('A')}"),
   'multi-region change in A must load overlays into A, not create B');
});

test('real Windows-native multi-region fixture opts in to both measured regions (selected-only remains the app default)',()=>{
 const program=fs.readFileSync(path.join(root,'..','Program.cs'),'utf8');
 assert(program.includes('const choice=fvRegionChoice(c,region);'));
 assert(program.includes('choice.visible=true;choice.visibilityExplicit=true;'),
   'native WebView2 smoke must declare manual multi-region visibility explicitly');
 assert(program.includes('await api.load(c,fvState.time);'),
   'native smoke must still require real OpenFOAM same-canvas GPU composition');
});

test('view A remembers real physical-region selections separately for each loaded case',()=>{
 const source=fs.readFileSync(path.join(root,'v14-field-view.js'),'utf8');
 const start=source.indexOf('function fvRegionEnsureCase(c){');
 const end=source.indexOf('function fvRegionPrimaryVisible()',start);
 assert(start>0&&end>start);
 const scene={caseId:null,choices:new Map(),savedByCase:new Map(),layers:new Map(),fitPending:false};
 const selection={value:'metal'};
 let clears=0;
 const f=new Function('fvRegionScene','fvRegionClearLayers','fvFieldGroups','document',
   source.slice(start,end)+';return {fvRegionEnsureCase,fvRegionChoice}')(
   scene,()=>{clears++},()=>[{name:'T',kind:'scalar'}],
   {getElementById:id=>id==='fvRegion'?selection:{value:'T'}});
 const first={id:'case-B3'},second={id:'case-C3'};
 assert.equal(f.fvRegionChoice(first,'mold').visible,false);
 const mold=f.fvRegionChoice(first,'mold');mold.visible=true;mold.visibilityExplicit=true;
 f.fvRegionChoice(first,'metal');
 selection.value='mold';
 assert.equal(f.fvRegionChoice(second,'metal').visible,false,'a new case must not inherit B3 metal');
 assert.equal(f.fvRegionChoice(second,'mold').visible,true,'C3 primary mold loads independently');
 const metal=f.fvRegionChoice(second,'metal');metal.visible=true;metal.visibilityExplicit=true;
 selection.value='metal';
 assert.equal(f.fvRegionChoice(first,'mold').visible,true,'B3 explicit mold overlay survives C3 visit');
 assert.equal(f.fvRegionChoice(first,'metal').visible,true);
 assert.notStrictEqual(f.fvRegionChoice(first,'mold'),mold,'A region selection is restored by value, not shared mutable state');
 selection.value='mold';
 assert.equal(f.fvRegionChoice(second,'metal').visible,true,'C3 explicit metal overlay also survives B3 visit');
 assert(clears>=3,'old GPU scene must be cleared each time the case changes');
});

test('changing a physical-region field/component uses the real primary control, never a fake overlay update',()=>{
 assert(compare.includes("const source=document.getElementById(fcViewSourceMap(view)?.[kind]);"));
 assert(compare.includes("source.value=value;source.dispatchEvent(new Event('change',{bubbles:true}))"));
 assert(compare.includes("if(forwardPrimary('Field',ch.field))return;"));
 assert(compare.includes("if(forwardPrimary('Component',ch.component))return;"));
 assert(compare.includes('fcReconcilePhysicalChoice(ch,groups,e.target.value)'));
 assert(compare.includes("if(view==='A')fvRegionLoadFrame(ctx.c,fvState.time).catch(console.error);else fcPhysicalReload(ctx)"),
   'secondary component changes must still redraw the secondary physical overlay');
});
