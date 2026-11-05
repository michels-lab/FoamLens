'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const plotSurfaces=fs.readFileSync(path.join(root,'v14-zy-plot-surfaces.js'),'utf8');
const field=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');

new Function(ux);new Function(plotSurfaces);new Function(field);new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('Field Workspace persists v2 view state instead of obsolete permanent split state',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.ux.v2",'schema:2','view:','companion:',
    'compareEnabled:','viewCount:','differenceEnabled:','syncMode:',
    'camerasLinked:','visualsSynced:','inspector:','names'
  ])assert(ux.includes(token),'Missing persistent workspace token: '+token);
  assert(!ux.includes("foamlens.fieldWorkspace.ux.v1"),'Old workspace state schema is still active.');
});

test('saved workspace state restores active Field tab and optional Split companion',()=>{
  for(const token of [
    "set('fwCompanion',saved.companion)",
    "FoamLensFieldWorkspace?.setView?.('3d')",
    "setInspector?.(!!saved.inspector)",
    "check('fcLinkCameras',saved.camerasLinked)",
    "check('fcSyncVisuals',saved.visualsSynced)",
    "set('fcSync',saved.syncMode)",
    "check('fcDifference',saved.differenceEnabled)",
    "while(2+fcExtraViews.length<target)fcExtraAdd()"
  ])assert(ux.includes(token),'Missing restore token: '+token);
});

test('layout reset returns to a single 3D view',()=>{
  for(const token of [
    'localStorage.removeItem(uxWorkspaceKey)',
    "set('fwCompanion','profile')",
    "FoamLensFieldWorkspace?.setView?.('3d')",
    "FoamLensFieldWorkspace?.setInspector?.(false)",
    "check('fcLinkCameras',true)",
    "check('fcSyncVisuals',true)",
    "check('fcDifference',false)"
  ])assert(ux.includes(token),'Missing v1.6 reset token: '+token);
  assert(!ux.includes("set('fwLayout','split')"),'Reset still forces Split.');
});

test('Field navigation offers only 3D; Data owns profiles, histories and logs',()=>{
  for(const token of ['id="fwViewTabs"','data-fw-view="3d"',"fwActivateView('3d')","view='3d';fwState.view=view;"])
    assert(field.includes(token),'Missing 3D-only view contract: '+token);
  for(const view of ['profile','timeseries','log','split'])
    assert(!field.includes('data-fw-view="'+view+'"'),'Data plot view leaked into Field: '+view);
});

test('3D Field DOM is adopted once and never restored to Data on section switch',()=>{
  for(const token of [
    'function fwAdoptFieldNode',
    "node.dataset.fwOwner='field'",
    "fwAdoptFieldNode('fieldViewPanel','fw3DHost')",
    "fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"
  ])assert(field.includes(token),'Missing permanent Field ownership token: '+token);
  const start=field.indexOf('function fwLeave()'),end=field.indexOf('function fwInstall()',start),leave=field.slice(start,end);
  assert(start>=0&&end>start,'fwLeave block missing.');
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewPanel'))"),
    'Field View panel is still restored into legacy Data ownership on leave.');
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewControls'))"),
    'Field View controls are still restored into legacy Data ownership on leave.');
});

test('Field plot controls and the 2D viewport have permanent owners',()=>{
  for(const token of [
    'function fwOwnCompanionControls',
    "fwAdoptFieldNode(id,'fw2DControlsHost')",
    "'playbackGlobal','timeSeriesControls','profileControls','logControls'",
    'function fwEnsureCompanionSurface',
    'function fwActivateCompanionSurface'
  ])assert(field.includes(token),'Missing permanent Field plot ownership token: '+token);
  assert(!field.includes('fwRestoreCompanionNodes'),'Field still contains the legacy shared-chart restore bridge.');
  assert(!field.includes('appendChild(chart)'),'Field still moves the shared chart into fw2DHost.');
  assert(plotSurfaces.includes("['analysis',{view:'timeseries'"),'Analysis does not own a stable 2D surface state.');
  assert(plotSurfaces.includes("['field',{view:'profile'"),'Field does not own a stable 2D surface state.');
  assert(plotSurfaces.includes("flPlotSurfaceEnsure('analysis',document.getElementById('chartViewport'))"),
    'Analysis stable surface is not created in the shared 2D workspace.');
});

test('Field Inspector is the contextual sidebar rather than a floating drawer',()=>{
  for(const token of [
    'function fwMountContextSidebar',
    "const sidebar=document.querySelector('.sidebar')",
    "sidebar.prepend(drawer)",
    "drawer.classList.add('fwSidebarContext')",
    ".sidebar>.fwControlsDrawer.fwSidebarContext{position:static",
    "fwMountContextSidebar();fwSetInspector(true)"
  ])assert(field.includes(token),'Missing contextual Field sidebar token: '+token);
  assert(!field.includes('grid-template-columns:minmax(0,1fr) 340px'),
    '3D focus still reserves a permanent controls column.');
});

test('Inspector hides 3D controls outside 3D/Split and hides plot controls in pure 3D',()=>{
  for(const token of [
    'id="fw3DControlGroup"',
    "group3D.style.display=(view==='3d'||view==='split')?'':'none'",
    "group2D.style.display=(view==='3d')?'none':''"
  ])assert(field.includes(token),'Missing Inspector scope token: '+token);
});

test('Field layout changes coalesce 2D/3D rendering instead of redrawing both unconditionally',()=>{
  for(const token of [
    'function fwScheduleRender({threeD=false,twoD=false}={})',
    'fwRenderFrame=requestAnimationFrame',
    "if(do3D&&fwState.layout!=='plot')try{fvRender()}catch{}",
    "if(do2D&&fwState.layout!=='3d')try{draw()}catch{}",
    "fwScheduleRender({threeD:fwState.layout!=='plot',twoD:fwState.layout!=='3d'})"
  ])assert(field.includes(token),'Missing render-coalescing token: '+token);
});

test('one global Field time transport replaces visible per-view primary playback',()=>{
  for(const token of [
    'id="fwTimeTransport"','id="fwTimePlay"','id="fwTimeSlider"',
    'id="fwTimeSpeed"','fwTimePlay','fwTimeStop','fwTimeLoadIndex',
    'body.appMode-field .fvTimeline',
    'body.appMode-field #profileTimeline',
    'body.appMode-field #playbackGlobal'
  ])assert(field.includes(token),'Missing unified time transport token: '+token);
});

test('views A through D keep presentation names without replacing scientific labels',()=>{
  for(const token of [
    "const uxDefaultNames={1:'A',2:'B',3:'C',4:'D'}",
    "'uxViewName'+i","'uxViewNameRow'+i",
    'maxlength="28"','uxSetViewName','uxDecorateOne',
    'el.dataset.uxBase=base','el.dataset.uxRendered=rendered'
  ])assert(ux.includes(token),'Missing safe view-name token: '+token);
});

test('comparison status remains synchronized after the workspace refactor',()=>{
  for(const token of [
    'uxComparisonStatus','fcSameQuantity','fcCamerasLinked','fcVisualsSynced',
    "document.getElementById('fcDifferenceMode')",
    "document.getElementById('fcSync')","sync?.interpolated"
  ])assert(ux.includes(token),'Missing comparison-status token: '+token);
});

console.log('FoamLens v1.6 persistent workspace UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

test('3D cases are selectable in the sidebar and comparison stays opt-in',()=>{
  const w=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
  assert(w.includes('fwPromoteViewCaseSelectors')&&w.includes("getElementById('fvCase')?.closest('.row2')")&&w.includes("getElementById('fcCase')?.closest('.row2')"),'Independent A/B case selectors not promoted');
  assert(w.includes("compare?.classList.toggle('hidden',!enabled)"),'View B selector must hide until comparison');
  assert(w.includes('compareUserRequested:false')&&w.includes('if(!fwState.compareUserRequested)'),'No implicit comparison on Field entry');
});

test('Field 3D components are relocated out of Data before initial entry',()=>{
  const src=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
  const block=src.slice(src.indexOf('function fwInstall(){'),src.indexOf('let fwPrevSetDataView='));
  assert(block.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"),'Data cannot contain initial 3D controls');
  assert(block.includes("fwAdoptFieldNode('fieldViewPanel','fw3DHost')"),'Data cannot host initial 3D viewport');
});
test('Data has a real Ribbon route for profiles, time series, logs and comparing curves',()=>{
  for(const id of ['flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'])
    assert(ribbon.includes(id),'Missing Data toolbar action: '+id);
  assert(ribbon.includes('function flRibbonOpenDataView(view)'),'2D workspace mode handler is absent');
});
test('Global top chrome is stable across sidebar resizing',()=>{
  assert(ribbon.includes('flRibbonInstallChromeMeasurement')&&ribbon.includes("body.flRibbonReady .sidebar{margin-top"),
    'Header and toolbar must be independent of the sidebar track');
});

test('Field toolbar uses genuine OpenFOAM physical time; absent timestamps never become t=0',()=>{
  const extract=(start,end)=>{
    const a=field.indexOf(start),b=field.indexOf(end,a);
    assert(a>=0&&b>a,'missing production function: '+start);
    return field.slice(a,b)
  };
  const physics=new Function('window',extract('function fwMeasuredNumber(raw)','function fwAdoptFieldNode')+
    ';return{fwMeasuredNumber,fwPhysicalTime,fwPhysicalTimes};')({});
  assert(Number.isNaN(physics.fwMeasuredNumber(null)));
  assert(Number.isNaN(physics.fwMeasuredNumber(false)));
  assert.equal(physics.fwMeasuredNumber('0'),0);
  const source=extract('function fwTimeTimes()','function fwRefreshGlobalTime()');
  const api=(mode,input='',frameTime=null)=>new Function(
    'fwTimeMode','fwPhysicalTimes','fwPhysicalTime','profileAvailableTimes','logAvailableTimes',
    'fvCurrentFieldGroup','profilePlaybackUsesGlobalClock','profilePlaybackClockTime','document','fvState',
    source+';return{fwTimeTimes,fwTimeCurrent};')(
      ()=>mode,physics.fwPhysicalTimes,physics.fwPhysicalTime,
      ()=>[null,'',false,'0','9.8'],()=>[null,'',false,9.8],
      ()=>({times:[null,'',false,0,9.8]}),()=>true,null,{getElementById:()=>({value:input})},
      {time:frameTime});
  assert.deepStrictEqual(api('3d').fwTimeTimes(),[0,9.8]);
  assert.deepStrictEqual(api('log').fwTimeTimes(),[9.8]);
  assert(Number.isNaN(api('3d').fwTimeCurrent()));
  assert(Number.isNaN(api('profile').fwTimeCurrent()));
  assert(Number.isNaN(api('log').fwTimeCurrent()));
  assert.strictEqual(api('3d','',0).fwTimeCurrent(),0);
  assert.strictEqual(api('profile','0').fwTimeCurrent(),0);
  assert.strictEqual(api('3d','','9.8').fwTimeCurrent(),9.8);
});

test('Field probes reject missing values and preserve genuine zero',()=>{
  const p=field.indexOf('function fwProbeChoices()'),q=field.indexOf('function fwNearestFlatIndex(',p);
  assert(p>=0&&q>p,'missing production probe-choice source');
  const helper=new Function('window',field.slice(field.indexOf('function fwMeasuredNumber(raw)'),field.indexOf('function fwPhysicalTime(raw)'))+';return fwMeasuredNumber;')({});
  const probe=value=>new Function('window','fvState','fvCase','fwMeasuredNumber',
    field.slice(p,q)+';return fwProbeChoices();')(
      {FoamLensFieldProbe:{getLast:()=>({point:[0,0,0],value,geometryOnly:false})},
       FoamLensFieldCompare:{getProbeDescriptors:()=>[]}},
      {caseId:1,region:'metal',fieldName:'T'},()=>({name:'Measured'}),helper);
  assert.deepStrictEqual(probe(null),[]);
  assert.deepStrictEqual(probe(false),[]);
  assert.equal(probe(0).length,1);
  assert.equal(probe('0').length,1);
  const sample=field.slice(field.indexOf('function fwSampleFieldAtPoint('),field.indexOf('function fwProfileSeriesAll()'));
  const picked=new Function('fwMeasuredNumber','fwNearestFlatIndex','fwFaceCentroid','fvInsideBounds',sample+
    ';return fwSampleFieldAtPoint;')(helper,()=>({index:0,d2:0}),()=>null,()=>true);
  const mesh={points:[0,0,0],pointCount:1,boundsMin:[0,0,0],boundsMax:[1,1,1]};
  assert(Number.isNaN(picked({mesh,fieldValues:[null],storage:'point'},[0,0,0]).value));
  assert.strictEqual(picked({mesh,fieldValues:[0],storage:'point'},[0,0,0]).value,0);
});

test('Field clock readout reflects only loaded physical frames, not the nearest available tick',()=>{
  const start=field.indexOf('function fwRefreshGlobalTime(){');
  const end=field.indexOf('async function fwTimeLoadIndex(',start);
  assert(start>=0&&end>start,'Missing production global time bar implementation');
  const run=(times,current)=>{
    const attrs={},slider={max:'',value:'',disabled:false,setAttribute:(key,value)=>{attrs[key]=value}};
    const readout={textContent:''},play={disabled:false};
    const nodes={fwTimeSlider:slider,fwTimeReadout:readout,fwTimePlay:play};
    new Function('fwTimeTimes','fwTimeCurrent','document','fvFmt','fwUi',field.slice(start,end)+';fwRefreshGlobalTime()')(
      ()=>times,()=>current,{getElementById:key=>nodes[key]},String,(en)=>en);
    return {slider,readout,play,attrs};
  };
  const missing=run([0,9.8],NaN);
  assert.equal(missing.readout.textContent,'t = —');
  assert.equal(missing.slider.value,'0');
  assert.equal(missing.slider.disabled,false,'Timeline remains navigable when no frame was loaded');
  assert.equal(missing.attrs['aria-valuetext'],'No measured frame loaded');
  assert.equal(run([0,9.8],0).readout.textContent,'t = 0 s','Measured zero must remain visible');
  const interp=run([0,10],9.8);
  assert.equal(interp.readout.textContent,'t = 9.8 s','Do not mislabel interpolated time as the nearest t=10');
  assert.equal(interp.slider.value,'1');
  assert.equal(run([],9.8).readout.textContent,'t = —','No available field-time samples');
  assert.equal(run([3],3).play.disabled,true);
});

test('Field 3D time-series statistics do not turn missing/reversed range limits into measured zero',()=>{
  const begin=field.indexOf('function fwFieldTsMetric('),end=field.indexOf('function fwFieldTsStatLabel(',begin);
  assert(begin>=0&&end>begin,'Missing actual Field 3D history metric function');
  const parse=new Function(field.slice(field.indexOf('function fwMeasuredNumber('),field.indexOf('function fwPhysicalTime('))+';return fwMeasuredNumber')();
  const metric=new Function('fwMeasuredNumber',field.slice(begin,end)+';return fwFieldTsMetric')(parse);
  const measured={valid:true,min:0,max:10,mean:5};
  assert.equal(metric(measured,'min'),0);
  assert.equal(metric(measured,'max'),10);
  assert.equal(metric(measured,'mean'),5);
  assert.equal(metric(measured,'delta'),10);
  for(const value of [null,'',false,undefined,NaN,Infinity]){
    for(const stat of ['min','max','mean','delta']){
      assert(Number.isNaN(metric({...measured,min:value},stat)),String(value)+' is not a physical min');
      assert(Number.isNaN(metric({...measured,max:value},stat)),String(value)+' is not a physical max');
    }
    assert(Number.isNaN(metric({...measured,mean:value},'mean')));
  }
  assert(Number.isNaN(metric({...measured,min:12},'delta')),'Reversed bounds cannot be physical');
  assert.equal(metric({valid:true,min:'0',max:'1e1',mean:'5'},'delta'),10);
});




test('Field companion profile time changes only in an active split, never in hidden Data state',()=>{
  const begin=field.indexOf('function fwSyncCompanionTime(');
  const end=field.indexOf('function fwUpdateViewCount(',begin);
  assert(begin>0&&end>begin,'Original Field time sync function must be present');
  const numberStart=field.indexOf('function fwPhysicalTime(');
  const numberEnd=field.indexOf('function fwPhysicalTimes(',numberStart);
  assert(numberStart>=0&&numberEnd>numberStart);
  const fwPhysicalTime=new Function('window',field.slice(numberStart,numberEnd)+
    ';return fwPhysicalTime;')({});
  const changes=[],badges=[];
  const state={active:true,layout:'3d',syncTime:true,companion:'profile'};
  const factory=new Function('fwState','fwPhysicalTime','profileOptionsBase',
    'applyProfileTimeValue','fwUpdateTimeBadge','console',
    'logContextOptionsBase','fwPhysicalTimes','logAvailableTimes','nearestValue','syncLogTimeNavigator',
    field.slice(begin,end)+';return fwSyncCompanionTime;');
  const sync=factory(state,fwPhysicalTime,()=>[{name:'original OpenFOAM profile'}],
    (t,opts)=>changes.push({t,opts}),()=>badges.push('updated'),{warn(){}},
    ()=>[],()=>[],()=>[],()=>null,()=>{});
  sync(9.8);
  assert.equal(changes.length,0,'3D-only playback must not mutate Data profile');
  assert.equal(badges.length,0,'Hidden Field plots must not update stale badges');
  state.layout='split';sync(9.8);
  assert.deepStrictEqual(changes,[{t:9.8,opts:{renderListToo:false}}],
    'Opening the visible split follows the real loaded physical frame once');
  assert.equal(badges.length,1);
  sync(null);sync('');sync(false);sync(NaN);
  assert.equal(changes.length,1,'Blank or unavailable frame times never become t=0');
  sync(0);
  assert.equal(changes.length,2,'Real measured t=0 remains valid');
  assert.equal(changes.at(-1).t,0);
  state.syncTime=false;sync(20);
  assert.equal(changes.length,2,'Unchecked time sync freezes independent profile selection');
  state.syncTime=true;state.active=false;sync(30);
  assert.equal(changes.length,2,'Inactive Field cannot mutate any profile');
  assert(field.includes('id="fwProfileTimeSync"')&&
    field.includes("fwState.syncTime=!!e.target.checked")&&
    field.includes("if(fwState.syncTime)fwSyncCompanionTime(fvState?.time)"),
    'Original Field header must expose a real wired sync toggle');
  assert(field.includes('if(!fvLoadFrame.__fwPatched)fwSyncCompanionTime(time)'),
    'Patched 3D frame loader must not replay the same profile sync twice');
});

test('Field 3D + Profile reuses original plot surface and restores Data without leaking history controls',()=>{
  const begin=field.indexOf('function fwSyncProfileCompanionButton(){');
  const end=field.indexOf('function fwSetInspector(',begin);
  assert(begin>0&&end>begin,'Production profile companion and original layout owner required');
  assert(field.includes('id="fwToggle3DProfile"'));
  const mainCard=field.slice(field.indexOf('<div class="fwGrid layout-3d"'),
    field.indexOf('</main>',field.indexOf('<div class="fwGrid layout-3d"')));
  const hiddenWorkspaceBar=field.slice(field.indexOf('id="fwViewTabs"'),
    field.indexOf('<div class="fwGrid layout-3d"'));
  assert(mainCard.includes('id="fwToggle3DProfile"'),
    'Profile companion action must be in the always-visible 3D card header');
  assert(!hiddenWorkspaceBar.includes('id="fwToggle3DProfile"'),
    'Ribbon hides fwWorkspaceBar: never mount the only companion action there');
  assert(ribbon.includes('body.flRibbonReady.appMode-field .fwWorkspaceBar{display:none!important'),
    'The test must exercise the actual Ribbon-hides-toolbar contract');
  assert(!field.includes('data-fw-view="split"'),'Field must retain original single 3D navigation tab');
  const classes=new Set(['layout-3d']),attrs={};
  const original={id:'dataOwner'},fieldHost={id:'fw2DControlsHost'};
  const profile={id:'profileControls',parentNode:original,nextSibling:null,dataset:{}};
  const history={id:'timeSeriesControls',parentNode:original};
  const generator={id:'fwBuildFieldHistories',parentNode:history};
  const group={style:{display:'none'}};
  const sync={checked:true};
  const button={attributes:attrs,textContent:'',setAttribute:(k,v)=>{attrs[k]=v}};
  const grid={classList:{toggle:(k,on)=>{if(on)classes.add(k);else classes.delete(k)}}};
  const host={},nodes={fwToggle3DProfile:button,fwProfileTimeSync:sync,fw2DHost:host,fwGrid:grid,
    profileControls:profile,timeSeriesControls:history,
    fwBuildFieldHistories:generator,fw2DControlsHost:fieldHost,fw2DControlGroup:group};
  const document={getElementById:id=>nodes[id]||null};
  const fwState={active:true,layout:'3d',view:'3d',companion:'profile',syncTime:true};
  const fwDataControlOrigins=new Map();
  const evidence={moves:[],renders:[],companions:[],synchronized:[]};
  const factory=new Function('document','fwState','fwDataControlOrigins','evidence','original',
    'let currentDataView="timeseries",active="data";'+
    'const snapshots={data:"timeseries",field:"profile"};'+
    'const manager={ensure:(key,into)=>key==="field"&&into?{}:null,'+
    'active:()=>active,activate:(key)=>{snapshots[active]=currentDataView;active=key;'+
    'currentDataView=snapshots[key];return true}};'+
    'const window={FoamLensPlotSurfaces:manager};'+
    'const fwUi=(en)=>en;'+
    'const fwScheduleRender=r=>evidence.renders.push(r);'+
    'const fvState={time:9.8};'+
    'const fwSyncCompanionTime=t=>evidence.synchronized.push(t);'+
    'const fwSetCompanion=m=>{fwState.companion=m;evidence.companions.push(m)};'+
    'const fwPrevSetDataView=m=>{currentDataView=m};'+
    'const fwAdoptFieldNode=(id,target)=>{const node=document.getElementById(id);'+
      'if(node){node.parentNode=document.getElementById(target);evidence.moves.push(id);return node}return null};'+
    'const fwReturnCompanionControlsToData=()=>{const node=document.getElementById("profileControls");'+
      'if(node&&fwDataControlOrigins.has("profileControls"))node.parentNode=original};'+
    'const console={warn(){}};'+field.slice(begin,end)+
    ';return{toggle:fwToggleProfileCompanion,view:()=>currentDataView,'+
    'active:()=>active,snapshots,button:fwSyncProfileCompanionButton};'
  );
  const api=factory(document,fwState,fwDataControlOrigins,evidence,original);
  assert.equal(api.view(),'timeseries');
  assert.equal(api.toggle(true),true);
  assert.equal(fwState.view,'3d','Field keeps its original 3D navigation owner');
  assert.equal(fwState.layout,'split','User sees actual side-by-side grid');
  assert(classes.has('layout-split')&&!classes.has('layout-3d'));
  assert.equal(api.active(),'field','Original Field plot surface owns visible profile');
  assert.equal(api.view(),'profile');
  assert.equal(api.snapshots.data,'timeseries','Original Data plot selection must be retained');
  assert.equal(profile.parentNode,fieldHost,'Only original profile selectors are borrowed');
  assert.equal(history.parentNode,original,'Original Time Series Build/Cancel remains Data-owned');
  assert.equal(generator.parentNode,history);
  assert.equal(attrs['aria-pressed'],'true');
  assert.equal(evidence.companions.at(-1),'profile');
  assert.deepStrictEqual(evidence.synchronized,[9.8],
    'Opening Field split must sync the already loaded original 3D frame');
  assert.equal(sync.checked,true,'Sync checkbox must reflect preserved user choice');
  assert(evidence.renders.some(x=>x.threeD&&x.twoD),'Both original render paths are scheduled');
  assert.equal(api.toggle(false),true);
  assert.equal(fwState.layout,'3d');
  assert.equal(api.active(),'data');
  assert.equal(api.view(),'timeseries','Data returns to exactly its previous plot selection');
  assert.equal(profile.parentNode,original,'Profile selectors return to their original owner');
  assert.equal(attrs['aria-pressed'],'false');
  assert.equal(api.toggle(false),true,'Idempotent close must not re-activate the plot');
  fwState.active=false;
  assert.equal(api.toggle(true),false,'Unopened Field cannot borrow plot controls');
  fwState.active=true;
  delete nodes.fw2DControlsHost;
  assert.equal(api.toggle(true),false,'Missing profile control host must abort before surface ownership');
  assert.equal(api.active(),'data','Failed preflight must not steal the Data surface');
});
