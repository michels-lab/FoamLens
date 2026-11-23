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

test('single case: A displays real metal and mold without opening B',()=>{
 const scene={choices:new Map()},selection={value:'metal'};
 const choice=isolate(field,'function fvRegionChoice(c,region){','function fvRegionPrimaryVisible()',[
  'fvRegionEnsureCase','fvRegionScene','fvFieldGroups','document'],[
  ()=>{},scene,()=>[{name:'T',kind:'scalar'}],{getElementById:id=>id==='fvRegion'?selection:{value:'T'}}]);
 const c={id:'case',regions:['metal','mold']};
 assert.equal(choice(c,'metal').visible,true);
 assert.equal(choice(c,'mold').visible,true,'A must show the original mold by default');
 selection.value='mold';
 assert.equal(choice(c,'metal').visible,true,'Active probe region must not hide original metal');
 assert.equal(choice(c,'mold').visible,true);
 const overlay=choice(c,'metal');overlay.visible=false;overlay.visibilityExplicit=true;
 assert.equal(choice(c,'metal').visible,false,'An explicit user hide must remain applied');
 selection.value='metal';
 assert.equal(choice(c,'mold').visible,true,'Changing the active field region must retain the mold');
 assert.equal(choice(c,'metal').visible,false,'User-hidden metal stays hidden');
});

test('B/C/D display all real regions on first load and preserve explicit hiding',()=>{
 const state={};
 const scene={caseId:null,choices:new Map(),savedByCase:new Map(),layers:new Map()};
 const list=isolate(compare,'function fcPhysicalChoiceList(state,c,primary){','function fcPhysicalViewContext(',[
  'fcPhysicalFor','fcPhysicalRelease','fvRegionNames','fvFieldGroups','fcReconcilePhysicalChoice'],[
   ()=>scene,()=>{},()=>['metal','mold'],()=>[{name:'T',kind:'scalar'}],()=>{}]);
 const c={id:'case'};
 list(state,c,'mold');
 assert.equal(scene.choices.get('metal').visible,true,'Metal remains visible beside mold');
 assert.equal(scene.choices.get('mold').visible,true);
 list(state,c,'metal');
 assert.equal(scene.choices.get('metal').visible,true);
 assert.equal(scene.choices.get('mold').visible,true,'Mold remains visible after changing primary');
 scene.choices.get('mold').visible=false;
 scene.choices.get('mold').visibilityExplicit=true;
 list(state,c,'metal');
 assert.equal(scene.choices.get('mold').visible,false,'Explicitly hidden mold stays hidden');
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

test('real Windows-native multi-region fixture explicitly verifies both measured regions',()=>{
 const program=fs.readFileSync(path.join(root,'..','Program.cs'),'utf8');
 assert(program.includes('const firstLoadRegions=expected.map(region=>{'));
 assert(program.includes('if(firstLoadRegions.some(x=>!x.visible))'),
   'real QuickCup smoke must verify default mold visibility, not force an override');
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
 assert.equal(f.fvRegionChoice(first,'mold').visible,true);
 const mold=f.fvRegionChoice(first,'mold');mold.visible=false;mold.visibilityExplicit=true;
 f.fvRegionChoice(first,'metal');
 selection.value='mold';
 assert.equal(f.fvRegionChoice(second,'metal').visible,true,'each imported case shows its original metal by default');
 assert.equal(f.fvRegionChoice(second,'mold').visible,true,'C3 primary mold loads independently');
 const metal=f.fvRegionChoice(second,'metal');metal.visible=false;metal.visibilityExplicit=true;
 selection.value='metal';
 assert.equal(f.fvRegionChoice(first,'mold').visible,false,'B3 explicit hidden mold survives C3 visit');
 assert.equal(f.fvRegionChoice(first,'metal').visible,true);
 assert.notStrictEqual(f.fvRegionChoice(first,'mold'),mold,'A region selection is restored by value, not shared mutable state');
 selection.value='mold';
 assert.equal(f.fvRegionChoice(second,'metal').visible,false,'C3 explicit hidden metal survives B3 visit');
 assert(clears>=3,'old GPU scene must be cleared each time the case changes');
});

test('changing a physical-region field/component uses the real primary control, never a fake overlay update',()=>{
 assert(compare.includes("const source=document.getElementById(fcViewSourceMap(view)?.[kind]);"));
 assert(compare.includes("source.dispatchEvent(new Event('change',{bubbles:true}))"));
 assert(compare.includes("exact.selected=true")&&compare.includes("if(kind==='Field'&&matches.length>1)"),
   'real primary control forwards exact association, not the first of duplicate field names');
 assert(compare.includes("if(forwardPrimary('Field',ch.field))return;"));
 assert(compare.includes("if(forwardPrimary('Component',ch.component))return;"));
 assert(compare.includes('fcReconcilePhysicalChoice(ch,groups,e.target.value)'));
 assert(compare.includes("if(view==='A')fvRegionLoadFrame(ctx.c,fvState.time).catch(console.error);else fcPhysicalReload(ctx)"),
   'secondary component changes must still redraw the secondary physical overlay');
});

test('native asymmetric on-disk smoke verifies mold geometry without altering first-load visibility',()=>{
 const program=fs.readFileSync(path.join(root,'..','Program.cs'),'utf8');
 const start=program.indexOf('if(options.asymmetricCase){');
 const end=program.indexOf('physicalScene.asymmetric=asymmetric',start);
 assert(start>=0&&end>start,'must retain packaged asymmetric OpenFOAM regression');
 const smoke=program.slice(start,end);
 const chosen=smoke.indexOf('const asymmetricMoldChoice=fvRegionChoice(c2,moldName);');
 const defaultCheck=smoke.indexOf('if(!asymmetricMoldChoice.visible)');
 const frame=smoke.indexOf('await fvLoadFrame(targetIndex);');
 assert(chosen>=0&&chosen<defaultCheck&&defaultCheck<frame,
   'asymmetric original mold must be visible by default before loading geometry fallback');
 assert(!smoke.includes('asymmetricMoldChoice.visible=true;'),
   'native smoke must not override the product default before testing it');
 assert(smoke.includes('layer.geometryOnly===true&&layer.sourceTime===null'),
  'missing source frame must still produce geometry-only without fake T');
 assert(smoke.includes('noScale&&notice&&api.gpuPayloadStats().regionCount===1'),
  'missing mold measurement must show an honest legend notice, not false measured color');
 const restore=smoke.indexOf('for(const region of expected){');
 const initial=smoke.indexOf('await selectSmokeCase(previous.caseName);');
 assert(initial>=0&&restore>initial&&smoke.includes('originalChoice.visible=true;originalChoice.visibilityExplicit=true;'),
  'return to the original case must preserve the originally explicit metal+mold smoke selection');
});

test('native View B WebView2 regression explicitly selects secondary OpenFOAM regions via real checkboxes',()=>{
 const program=fs.readFileSync(path.join(root,'..','Program.cs'),'utf8');
 const start=program.indexOf('window.__foamLensPhysicalViewBSmoke=null;');
 const end=program.indexOf('string viewBSmoke = "null";',start);
 assert(start>=0&&end>start,'native installed View B scientific smoke must exist');
 const script=program.slice(start,end);
 const first=script.indexOf('await api.fcRefreshFrame();');
 const regionRows=script.indexOf("document.querySelectorAll('#fcViewport [data-fc-region]')");
 const actual=script.indexOf("row.querySelector('[data-fc-visible]')");
 const changed=script.indexOf("toggle.dispatchEvent(new Event('change',{bubbles:true}))");
 const second=script.lastIndexOf('await api.fcRefreshFrame();');
 const evidence=script.indexOf('const desc=api.getPhysicalRegionDescriptors()');
 assert(first>=0&&first<regionRows&&regionRows<actual&&actual<changed&&changed<second&&second<evidence,
  'real View B checkboxes must be selected before measuring GPU overlays and XYZ bounds');
 assert(script.includes("if(String(row.dataset.fcRegion)===selectedB)continue;"),
  'B must keep its selected primary region and enable only real secondary regions');
 assert(script.includes('visible.length>=2&&secondary.some(r=>r.loaded)'),
  'native regression must still require real loaded multiple physical regions in B');
 assert(script.includes("['X:','Y:','Z:'].every(t=>desc.metricsText.includes(t))"),
  'native regression must preserve measured independent XYZ axes instead of mere two-view UI state');
});


test('Granada block 1: explicitly disabling B clears the request and preserves A-only layout',()=>{
 const start=workspace.indexOf('function fwComparisonExplicitlyRequested(){');
 const end=workspace.indexOf('const fwTimeState=',start);
 assert(start>=0&&end>start,'compare request lifecycle must be declared');
 const toggle={checked:true};
 const state={compareUserRequested:false};
 const compareState={enabled:true};
 let layoutUpdates=0;
 const actions=new Function('fwState','document','fcState','fcUpdateLayout',
   workspace.slice(start,end)+';return {fwComparisonExplicitlyRequested,fwComparisonDisabled}')(
   state,{getElementById:id=>id==='fcEnabled'?toggle:null},compareState,()=>{layoutUpdates++});
 actions.fwComparisonExplicitlyRequested();
 assert.equal(state.compareUserRequested,true);
 actions.fwComparisonDisabled();
 assert.equal(state.compareUserRequested,false);
 assert.equal(toggle.checked,false,'B checkbox must be off');
 assert.equal(compareState.enabled,false,'B renderer must be off');
 assert.equal(layoutUpdates,1,'the original viewport layout must refresh');
});

test('Granada block 1: manual disable and failed Add view cannot silently re-request B',()=>{
 assert(workspace.includes('if(e.target.checked)fwComparisonExplicitlyRequested();else fwComparisonDisabled()'),
   'unchecking Compare must clear the saved request instead of marking it as requested');
 const start=workspace.indexOf('function fwAdd3DView(){');
 const end=workspace.indexOf('// Adopt the real selectors',start);
 assert(start>=0&&end>start);
 const add=workspace.slice(start,end);
 assert(!add.startsWith('function fwAdd3DView(){'+String.fromCharCode(10)+'  fwComparisonExplicitlyRequested();'),
   'a failed Add request must not leave B requested');
 assert(add.includes('if(added)fwComparisonExplicitlyRequested()'),
   'C/D requests only count after the view is created');
 assert(/fwComparisonExplicitlyRequested\(\);\s*enabled\.checked=true/.test(add),
   'B request is recorded only as the compare checkbox is activated');
 assert(workspace.includes("document.getElementById('fcEnabled')?.checked)n=2+fcExtraViews.length"),
   'visible count must track the actual compare toggle, not stale renderer state');
});

test('Granada block 1: disabling B invalidates stale asynchronous B, C and D loads',()=>{
  const state={seq:14,enabled:true,renderer:{surfaceCount:2},differenceRenderer:null};
  const extra=[{id:3,seq:4},{id:4,seq:9}];
  const toggle={checked:false};
  const cancelled=[],clearedCanvas=[];
  const clear=isolate(compare,'function fcClearRenderer(){','function fcSetStatus(',[
    'fcState','fcExtraViews','document','fcExtraInvalidateFrame','fcUi',
    'fcPhysicalRelease','fcRender','fcUpdateLabels','fcUpdateStatsGrid',
    'fcBlankInvalidFieldViewport'
  ],[
    state,extra,{getElementById:id=>id==='fcEnabled'?toggle:null},
    (view,message)=>{view.seq++;cancelled.push({id:view.id,message})},
    en=>en,()=>{},()=>{},()=>{},()=>{},
    (canvas,renderer)=>clearedCanvas.push({canvas,renderer})
  ]);
  clear();
  assert.equal(state.seq,15,'old pending B request must become stale');
  assert.equal(state.mesh,null,'old B geometry must not remain');
  assert(Number.isNaN(state.time),'cleared B cannot claim a measured OpenFOAM time');
  assert.equal(state.sync,null,'cleared B cannot preserve an old synchronization marker');
  assert.equal(state.renderer.surfaceCount,0,'B renderer must no longer expose triangles');
  assert.deepEqual(cancelled.map(x=>x.id),[3,4],'C and D pending requests are invalidated');
  assert.deepEqual(extra.map(x=>x.seq),[5,10]);
  assert(cancelled.every(x=>x.message==='Comparison disabled.'));
  assert.equal(clearedCanvas.length,2,
    'Disabling B also clears both stale compare and difference canvas backbuffers');

  toggle.checked=true;
  clear();
  assert.equal(state.seq,16,'an invalid B frame also invalidates its own stale request');
  assert.equal(cancelled.length,2,'clearing an enabled B must not alter independent C/D');
  assert.equal(clearedCanvas.length,4,
    'Every invalidation of B and difference repaints their stale canvas, even while C/D remain active');
});

test('Granada block 1: re-enabling comparison reloads each real extra view after B',()=>{
  assert(compare.includes('const refresh=fcRefreshFrame()'));
  assert(compare.includes('Promise.resolve(refresh).then(()=>{'));
  assert(compare.includes('return fcRefreshExtras()'),
    'C/D must be refreshed with their original own selectors after B is enabled');
  const start=compare.indexOf('async function fcExtraRefreshFrame(');
  const end=compare.indexOf('async function fcRefreshExtras(',start);
  assert(start>=0&&end>start,'source-owned C/D asynchronous frame code exists');
  const actual=compare.slice(start,end);
  const sequence=actual.indexOf('if(seq!==state.seq)return;');
  const invalid=actual.indexOf('if(!data.ok){',sequence);
  const discard=actual.indexOf('fcExtraInvalidateFrame(state,fcUi(',invalid);
  const commit=actual.indexOf('state.time=sync.time',discard);
  assert(sequence>=0&&invalid>sequence&&discard>invalid&&commit>discard,
    'C/D must reject stale async responses first, then clear no-data physics before committing a newer frame');
});

test('Granada block 2: physical menus stay compact until explicitly expanded in each viewport',()=>{
  const expanded=isolate(compare,'function fcPhysicalMenuExpanded(holder,count){','function fcApplyPhysicalPalette(',[],[]);
  const A={dataset:{}},B={dataset:{}},C={dataset:{}},D={dataset:{}};
  assert.equal(expanded(A,1),false,'single-region view must not waste canvas space');
  assert.equal(expanded(A,2),false,'metal + mold must not force open a bulky editor');
  assert.equal(expanded(B,3),false,'B must fit beside A without unsolicited controls');
  assert.equal(expanded(C,2),false,'C has independent, compact defaults');
  assert.equal(expanded(D,2),false,'D has independent, compact defaults');
  A.dataset.fcRegionsExpanded='true';
  assert.equal(expanded(A,2),true,'A must still allow manual metal and mold editing');
  assert.equal(expanded(A,1),true,'manual expansion remains when the available catalog changes');
  assert.equal(expanded(B,2),false,'expanding A cannot expand B');
  B.dataset.fcRegionsExpanded='true';
  assert.equal(expanded(B,3),true,'B can independently expose its actual physical regions');
  A.dataset.fcRegionsExpanded='false';
  assert.equal(expanded(A,2),false,'manually closing A must be respected');
  assert.equal(expanded(B,2),true,'closing A may not close the B inspector');
  assert.equal(expanded(C,2),false,'C remains collapsed after interactions in A and B');
  assert(compare.includes('holder.dataset.fcRegionsExpanded=regionDetails.open'),
    'original details toggle must persist each viewport preference');
  assert(compare.includes('if(regionDetails.isConnected&&holder.contains(regionDetails))'),
    'stale detached details may not override the active viewport preference');
});

test('Granada block 2: palette of a secondary region recolors only that original view',()=>{
  const aScene={choices:new Map([['metal',{palette:'viridis'}],['mold',{palette:'viridis'}]]),
    layers:new Map([['mold',{fieldValues:[1,2],geometryOnly:false}]])};
  const bScene={choices:new Map([['metal',{palette:'viridis'}],['mold',{palette:'viridis'}]]),
    layers:new Map([['mold',{fieldValues:[3,4],geometryOnly:false}]])};
  const cScene={choices:new Map([['metal',{palette:'viridis'}],['mold',{palette:'turbo'}]]),
    layers:new Map([['mold',{geometryOnly:true,fieldValues:null}]])};
  const bState={scene:bScene},cState={scene:cScene};
  const recolors=[];const renders=[];let legends=0,lists=0;
  const palette=isolate(compare,'function fcApplyPhysicalPalette(ctx,region,palette){','function fcPhysicalMenu(view){',[
    'fvRegionScene','fcPhysicalFor','fvRegionChoice','fvRegionRecolorLayer','fvRegionUpdateLegend',
    'fvRegionRefreshList','fvRender','fcRender','fcExtraRender'
  ],[
    aScene,state=>state.scene,(_,region)=>aScene.choices.get(region),
    (layer,choice)=>{recolors.push({layer,palette:choice.palette});return !layer.geometryOnly},
    ()=>legends++,()=>lists++,()=>renders.push('A'),()=>renders.push('B'),state=>renders.push(state===cState?'C':'extra')
  ]);
  const c={id:'case'};
  assert.equal(palette({view:'B',c,primary:'metal',state:bState},'mold','coolwarm'),true);
  assert.equal(bScene.choices.get('mold').palette,'coolwarm');
  assert.equal(aScene.choices.get('mold').palette,'viridis','A settings must not change');
  assert.equal(cScene.choices.get('mold').palette,'turbo','C settings must not change');
  assert.deepEqual(renders,['B']);
  assert.equal(recolors.length,1,'one measured GPU overlay recolored');
  assert.equal(palette({view:'C',c,primary:'metal',state:cState},'mold','viridis'),true);
  assert.equal(cScene.choices.get('mold').palette,'viridis');
  assert.deepEqual(renders,['B','C']);
  assert.equal(recolors.length,2,'geometry-only overlay may re-render but not invent values');
  assert.equal(palette({view:'B',c,primary:'metal',state:bState},'metal','turbo'),false,
    'primary palette belongs to its original Field selector');
  assert.equal(palette({view:'B',c,primary:'metal',state:bState},'mold','invalid'),false,
    'invalid color maps must never reach the GPU');
  assert.equal(palette({view:'A',c,primary:'metal'},'mold','turbo'),true);
  assert.equal(aScene.choices.get('mold').palette,'turbo');
  assert.deepEqual(renders,['B','C','A']);
  assert.equal(legends,1);assert.equal(lists,1);
});

test('Granada block 2: the real region toolbar renders colormap controls and refreshes legends',()=>{
  assert(compare.includes('data-fc-region-palette'),'physical per-region palette selector must exist');
  assert(compare.includes("row.querySelector('[data-fc-region-palette]')?.addEventListener('change'"),
    'palettes must have a real bound change event');
  assert(compare.includes('ch.opacity,ch.palette'),'legend cache includes palette edits');
  assert(compare.includes("fcApplyPhysicalPalette(ctx,region,e.target.value)"));
  assert(compare.includes("fvRegionRecolorLayer(layer,choice)"),'update original source GPU colors');
  assert(compare.includes("fcPhysicalPrimaryPalette"),'primary color control must not conflict with its source selector');
});


test('Granada Field A: missing original case clears old OpenFOAM GPU pixels, axes, measurements and source state',()=>{
 const state={frameSeq:4,mesh:{cellCount:1},fieldValues:[900],fieldParsed:{},
   time:9.8,_fvFrameHold:0,_fvGroupHold:0,
   renderer:{gl:{COLOR_BUFFER_BIT:0x4000,DEPTH_BUFFER_BIT:0x100,
     viewport:(...a)=>rendered.push(['viewport',...a]),
     clearColor:(...a)=>rendered.push(['color',...a]),
     clear:v=>rendered.push(['clear',v])},surfaceCount:42,edgeCount:12}};
 const rendered=[],axes={innerHTML:'old XYZ',replaceChildren(){this.innerHTML=''}},
   dimensions={textContent:'old X/Y/Z',hidden:false},secondary={innerHTML:'old mold scale'},
   readout={textContent:'t = 9.8 s'},badge={textContent:'A · t=9.8 s'},
   legend={innerHTML:'old T scale'},association={textContent:'old volume'};
 const canvas={width:400,height:300,getBoundingClientRect:()=>({width:400,height:300})};
 const dom={getElementById:id=>({fvCanvas:canvas,fvPhysicalAxes:axes,
   fvMeshDimensions:dimensions,fvSecondaryScaleLegends:secondary,fvTimeReadout:readout,
   fcPrimaryTimeBadge:badge,fvLegend:legend,fvAssociation:association})[id]||null};
 const render=isolate(field,'function fvRender(exportSize=null){','function fvUpdateMeshBuffers(',[
   'fvState','document','window'
 ],[state,dom,{devicePixelRatio:1}]);
 const invalid=isolate(field,'function fvInvalidateUnavailableSelection(){','async function fvLoadSelection(){',[
   'fvState','fvRegionClearLayers','document','fvRender','flUi','fvSetStats'
 ],[state,()=>rendered.push(['release']),dom,render,(en)=>en,()=>rendered.push(['stats'])]);
 invalid();
 assert.equal(state.frameSeq,5);
 assert.strictEqual(state.mesh,null);assert.strictEqual(state.fieldValues,null);
 assert(Number.isNaN(state.time),'Missing A source may never display an old measured physical timestamp');
 assert.equal(state.renderer.surfaceCount,0,'Old primary A geometry cannot remain renderable');
 assert.deepEqual(rendered.filter(x=>x[0]==='clear'),[['clear',0x4100]]);
 assert.equal(axes.innerHTML,'');assert.equal(dimensions.textContent,'');
 assert.equal(dimensions.hidden,true);assert.equal(secondary.innerHTML,'');
 assert.equal(readout.textContent,'t = —');
 assert.equal(badge.textContent,'A · —','Old A time badge is not a measured frame');
 assert.equal(legend.innerHTML,'','Old scientific colorbar is discarded');
 assert.equal(association.textContent,'Association: —');
 assert.equal(rendered.filter(x=>x[0]==='stats').length,1);
 assert.equal(rendered.filter(x=>x[0]==='release').length,1);
 rendered.length=0;state._fvFrameHold=7;render();
 assert.equal(rendered.length,0,'Valid in-flight timestep must NOT flash an empty A canvas');
});

test('Granada Field A: load selection is awaitable and superseded failures cannot destroy a newer scene',async()=>{
 const readyCase={id:14,name:'B14'},status=[],invalidations=[];
 const state={frameSeq:0,mesh:null,fieldValues:null,caseId:null,region:'',time:NaN};
 let ready=true,load=null;
 const doc={getElementById:id=>id==='fvRegion'?{value:'metal'}:
   id==='fvLegend'?{innerHTML:''}:null};
 const loader=isolate(field,'async function fvLoadSelection(){','function fvSyncComponent(){',[
   'fvState','fvStopPlayback','fvRefreshSelectors','fvCase','fvAvailability','document',
   'fvCurrentFieldGroup','fvInvalidateUnavailableSelection','fvSetStatus','flUi',
   'fvSetStats','fvEsc','fvRender','fvLoadFrame','console'
 ],[
   state,()=>{},()=>{},()=>readyCase,()=>({ready,reason:'original source missing'}),
   doc,()=>({name:'T'}),
   ()=>{invalidations.push(state.frameSeq);state.frameSeq++;state.mesh=null;state.fieldValues=null;state.time=NaN},
   (txt,error)=>status.push({txt,error}),en=>en,()=>{},String,()=>{},
   ()=>{state.frameSeq++;return load},
   {error:()=>{}}
 ]);
 ready=false;
 const missing=loader();
 assert.equal(typeof missing?.then,'function','Field workspace startup requires an actual native Promise');
 assert.equal(await missing,false);assert.equal(invalidations.length,1);
 ready=true;
 let resolve1,reject1;load=new Promise((a,b)=>{resolve1=a;reject1=b});
 const p1=loader();
 assert.equal(typeof p1?.catch,'function','Native Field mounting attaches an error handler to this Promise');
 state.mesh={id:'B14'};state.fieldValues=[300];state.time=10;resolve1();
 assert.equal(await p1,true,'A may report ready only after the original measured frame commits');
 assert.equal(invalidations.length,1);
 load=Promise.reject(new Error('genuine OpenFOAM file missing'));
 const failed=await loader();
 assert.equal(failed,false);assert.equal(invalidations.length,2,
   'A current failed source invalidates stale geometry and sampled values');
 assert.equal(state.mesh,null);assert(Number.isNaN(state.time));
 let rejectOld;load=new Promise((resolve,reject)=>{rejectOld=reject});
 const stale=loader();state.frameSeq++;
 state.mesh={id:'newest'};state.fieldValues=[273];state.time=20;
 rejectOld(new Error('superseded old case failed'));assert.equal(await stale,false);
 assert.equal(invalidations.length,2,
   'An older failed A case may not erase newer committed physical data');
 assert.equal(state.mesh.id,'newest');assert.equal(state.time,20);
});
