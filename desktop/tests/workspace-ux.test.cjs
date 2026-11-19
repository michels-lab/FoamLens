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


test('Granada: Field physical-time fallback only accepts real decimal/scientific measurements',()=>{
  const begin=field.indexOf('function fwMeasuredNumber(raw){');
  const end=field.indexOf('function fwPhysicalTimes(raw){',begin);
  assert(begin>=0&&end>begin,'Original Field physical-time parser not found');
  const code=field.slice(begin,end);
  const numeric=new Function('window',code+';return{fwMeasuredNumber,fwPhysicalTime}')({FoamLensRegionScene:null});
  for(const v of [null,undefined,'',false,true,'0x10','0b10','0o7','Infinity','NaN','  ',[],{}]){
    assert(Number.isNaN(numeric.fwMeasuredNumber(v)),'Invalid sample: '+String(v));
    assert(Number.isNaN(numeric.fwPhysicalTime(v)),'Invalid physical time: '+String(v));
  }
  assert.strictEqual(numeric.fwPhysicalTime('0'),0,'Real OpenFOAM zero remains valid');
  assert.strictEqual(numeric.fwPhysicalTime(' 9.8e-3 '),0.0098);
  assert.strictEqual(numeric.fwMeasuredNumber('-273.15'),-273.15);
  const sourceBound=new Function('window',code+';return fwPhysicalTime')({FoamLensRegionScene:{physicalTime:()=>12.5}});
  assert.strictEqual(sourceBound('raw'),12.5,'Native source-owned resolver stays authoritative');
});

test('Granada: navigating away preserves an explicitly requested same-case A/B comparison',()=>{
  const start=field.indexOf('function fwLeave(){');
  const end=field.indexOf('function fwInstall(){',start);
  assert(start>=0&&end>start,'Original Field exit handler must exist');
  const state={active:true,compareUserRequested:true,fieldTsSeq:0,layout:'3d',dataViewBeforeField:null};
  const stop={play:0,time:0,inspector:0,return:0};
  const leave=new Function('fwState','document','window','fvStopPlayback',
    'fwTimeStop','fwSetInspector','fwReturnCompanionControlsToData',
    'currentDataView','updateDatasetViewUI','console',
    field.slice(start,end)+';return fwLeave;')(
      state,{getElementById:()=>null},{FoamLensPlotSurfaces:{active:()=>null}},
      ()=>stop.play++,()=>stop.time++,()=>stop.inspector++,()=>stop.return++,
      'timeseries',()=>{}, {error:()=>{}});
  leave();
  assert.strictEqual(state.active,false);
  assert.strictEqual(state.compareUserRequested,true,
    'One imported OpenFOAM case is valid for A/B compare; leaving must not undo explicit choice');
  assert.deepStrictEqual(stop,{play:1,time:1,inspector:1,return:1},
    'Exit must still stop playback and restore real controls');
});

test('Granada: two-source spatial Time Series uses genuine decimal positions, not implicit zero',()=>{
  const begin=field.indexOf('function fwPhysicalTime(raw){');
  const end=field.indexOf('function fwPhysicalTimes(raw){',begin);
  const positionStart=field.indexOf('function fwProfileTsSelection(slot){');
  const positionEnd=field.indexOf('function fwRefreshProfileTsSlot(',positionStart);
  assert(begin>0&&end>begin&&positionStart>0&&positionEnd>positionStart);
  const time=new Function('window',field.slice(begin,end)+';return fwPhysicalTime')({FoamLensRegionScene:null});
  let raw='';
  const doc={getElementById:id=>id==='fwTsProfilePosition1'?{value:raw}:{value:'physical-source'}};
  const select=new Function('document','fwPhysicalTime',
    field.slice(positionStart,positionEnd)+';return fwProfileTsSelection')(doc,time);
  for(const bad of ['', ' ', '0x10','0b1','1e999','NaN','Infinity']){
    raw=bad;
    assert(Number.isNaN(select(1).position),'Invalid spatial coordinate may not be silently sampled: '+bad);
  }
  raw='0';assert.strictEqual(select(1).position,0,'Original coordinate zero is valid');
  raw='2e-2';assert.strictEqual(select(1).position,0.02,'Real 20 mm in meters is valid');
  const refresh=field.slice(field.indexOf('function fwRefreshProfileTsSlot('),
    field.indexOf('function fwRefreshProbeTsSlot('));
  assert(refresh.includes('position:preserve?fwMeasuredNumber(pos.value):NaN'),
    'Empty or reset selectors may not silently keep zero as a measured coordinate');
  assert(refresh.includes('fwProfilePositionBounds(filtered)'),
    'Domain must derive from measured spatial coordinates with stack-safe original bounds');
});

test('Granada: spatial Time Series clears stale sample position when profile source disappears',()=>{
  const start=field.indexOf('function fwRefreshProfileTsSlot('),end=field.indexOf('function fwRefreshProbeTsSlot(',start);
  assert(start>0&&end>start);
  let samples=[];
  const makeSelect=()=>{
    let html='',value='';
    return {get innerHTML(){return html},set innerHTML(x){
      html=String(x);const options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]);
      if(!options.includes(value))value=options[0]||'';
    },get value(){return value},set value(x){value=String(x)}}
  };
  const nodes=new Map(['fwTsProfileCase1','fwTsProfileSet1','fwTsProfileField1','fwTsProfileLine1']
    .map(id=>[id,makeSelect()]));
  const removed=[];
  const pos={value:'0.02',min:'0',max:'1',disabled:false,
    removeAttribute:name=>removed.push(name)};
  const meta={textContent:'old source'};
  nodes.set('fwTsProfilePosition1',pos);nodes.set('fwTsProfileMeta1',meta);
  const begin=field.indexOf('function fwMeasuredNumber(');
  const numericEnd=field.indexOf('function fwPhysicalTime(',begin);
  const number=new Function(field.slice(begin,numericEnd)+';return fwMeasuredNumber')();
  const refresh=new Function('document','fwProfileSeriesAll','fwMeasuredNumber','caseById',
    'fwUi','fvEsc','localizedFieldName','fvFmt',
    field.slice(start,end)+';return fwRefreshProfileTsSlot')(
      {getElementById:id=>nodes.get(id)||null},()=>samples,number,
      ()=>({name:'QuickCup'}),en=>en,String,x=>x.canonical,String);
  refresh(1);
  assert.equal(pos.value,'','Absent profile must not retain old physical coordinate');
  assert.strictEqual(pos.disabled,true);
  assert.deepStrictEqual(removed,['min','max']);
  samples=[{caseId:'1',caseName:'B3',profileOutputPath:'set',
    field:{canonical:'T',unit:'K'},profileLineKey:'line',profileLine:'Line 1',
    t:[0.02,0.03],profileCoordUnit:'m'}];
  refresh(1);
  assert.strictEqual(pos.disabled,false,'Valid measured spatial positions restore input');
  assert.strictEqual(Number(pos.min),0.02);
  assert.strictEqual(Number(pos.max),0.03);
  assert(Math.abs(Number(pos.value)-0.025)<1e-12);
});

test('Granada: physical profile bounds handle 300k original coordinates and reject absent values',()=>{
  const begin=field.indexOf('function fwProfilePositionBounds(rows){');
  const end=field.indexOf('function fwRefreshProfileTsSlot(',begin);
  assert(begin>0&&end>begin,'Original stack-safe coordinate domain function missing');
  const numberBegin=field.indexOf('function fwMeasuredNumber(raw){');
  const numberEnd=field.indexOf('function fwPhysicalTime(raw){',numberBegin);
  const measured=new Function(field.slice(numberBegin,numberEnd)+';return fwMeasuredNumber')();
  const bounds=new Function('fwMeasuredNumber',field.slice(begin,end)+
    ';return fwProfilePositionBounds')(measured);
  assert.deepStrictEqual(bounds([]),{min:NaN,max:NaN,count:0});
  const originals=new Float64Array(300000).fill(0.02);
  originals[0]=0;originals[299999]=0.03;
  assert.deepStrictEqual(bounds([{t:originals},{t:[null,'','0x10','0.01',false,NaN]}]),
    {min:0,max:0.03,count:300001});
  assert.deepStrictEqual(bounds([{t:[null,'',false,'0x10']}]),
    {min:NaN,max:NaN,count:0});
  assert.deepStrictEqual(bounds([{t:'0.02'},{t:1}]),
    {min:NaN,max:NaN,count:0},
    'Malformed textual/spurious source must not become character-by-character XYZ');
});

test('Field Inspector closes with Escape and returns keyboard focus',()=>{
  for(const token of [
    'aria-controls="fwControlsDrawer"',
    "e.key==='Escape'&&fwState.inspector",
    'e.preventDefault();e.stopPropagation();fwSetInspector(false,true)',
    "fwSetInspector(false,true)",
    "drawer?.contains(document.activeElement)",
    "if(!fwState.inspector&&returnFocus&&fwState.active)toggle?.focus()"
  ])assert(field.includes(token),'Missing accessible Inspector behavior: '+token);
});

test('Field workspace labels and playback readouts remain legible',()=>{
  const start=field.indexOf('style.textContent=');
  assert(start>=0,'Field workspace style sheet is missing');
  const style=field.slice(start,field.indexOf('`;',start));
  const undersized=[...style.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(([,size])=>Number(size)<11);
  assert.deepStrictEqual(undersized.map(match=>match[0]),[],'Field workspace has labels smaller than 11px');
  for(const selector of ['.fwTimeReadout','.fwHeader p','.fwCompact label','.fwProfileTimeSync'])
    assert(style.includes(selector),'Missing critical readable control: '+selector);
});
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

test('Field comparison status never labels absent times as zero or unavailable frames as synchronized',()=>{
  const start=ux.indexOf('function uxMeasuredTime('),stop=ux.indexOf('async function uxApplyState(',start);
  assert(start>=0&&stop>start,'Original comparison badge controller must expose measured-time guard');
  const bar={innerHTML:'',classList:{toggle(){}}};
  const controls={uxComparisonStatus:bar,fcEnabled:{checked:true},fcSync:{value:'exact'},
    fcDifference:{checked:true},fcDifferenceMode:{value:'signed'},fcLinkCameras:{checked:true},fcSyncVisuals:{checked:true}};
  const document={getElementById:id=>controls[id]||null};
  const primary={time:null},compare={sync:null};
  let language='en';
  const controller=new Function('document','uxUi','uxNames','uxEsc','fvState','fcState',
    'fvCase','fcCase','fcSameQuantity','fcCamerasLinked','fcVisualsSynced',
    ux.slice(start,stop)+';return {uxTimeText,uxUpdateComparisonStatus};')(
    document,(en,es)=>language==='es'?es:en,()=>({1:'A',2:'B'}),String,
    primary,compare,()=>({name:'Case A'}),()=>({name:'Case B'}),()=>true,()=>true,()=>true);
  for(const missing of [null,'',false,undefined,NaN,'Infinity','0x10']){
    assert.equal(controller.uxTimeText(missing),'—','Missing physical time must not appear as t=0');
  }
  assert.equal(controller.uxTimeText(0),'0 s');
  assert.equal(controller.uxTimeText('0'),'0 s');
  controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Case A · —'),'Primary without frame cannot claim t=0');
  assert(bar.innerHTML.includes('Not synchronized'),'Empty compare cannot claim Nearest');
  assert(bar.innerHTML.includes('No frame'),'Δ mode cannot claim computed data with no synchronized frame');
  compare.sync={ok:false,time:0.25,delta:0.25,exact:false};
  controller.uxUpdateComparisonStatus();
  assert(!bar.innerHTML.includes('Nearest'),'Failed Exact-only sync cannot be presented as nearest');
  compare.sync={ok:true,time:0.6,delta:-0.4,exact:false};
  controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Nearest'),'Valid nearest synchronization must remain visible');
  assert(!bar.innerHTML.includes('No frame'),'Valid difference mode no longer reports missing frame');
  compare.sync={ok:true,time:0,exact:true};
  controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Exact'),'Measured t=0 must be valid exact synchronization');
  compare.sync={ok:true,time:0.25,interpolated:true,lowerTime:0,upperTime:1};
  controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Interpolated')&&bar.innerHTML.includes('0 s↔1 s'));
  compare.sync={ok:true,time:0.25,interpolated:true,lowerTime:null,upperTime:1};
  controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Not synchronized'),'Invalid interpolation bounds may not claim frames');
  language='es';controller.uxUpdateComparisonStatus();
  assert(bar.innerHTML.includes('Sin sincronizar')&&bar.innerHTML.includes('Sin frame'));
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

test('3D A-D selectors are grouped in contextual cards without implicitly enabling comparison',()=>{
  for(const token of [
    'function fwEnsureViewCard(host,letter,extraId=null)',
    "const views=[{letter:'A',id:null},{letter:'B',id:null}]",
    "fwPromoteViewControlRow(controls,ids[0],letter,'case',id)",
    "fwPromoteViewControlRow(controls,ids[2],letter,'field',id)",
    "card.classList.toggle('hidden',letter!=='A'&&!enabled)",
    'compareUserRequested:false','if(!fwState.compareUserRequested)',
    ".fw3DViewCases .fwViewCardControls .row2",
    ".fw3DViewCases .fwViewCard.hidden{display:none!important}"
  ])assert(field.includes(token),'Missing original-selector-based Field inspector card: '+token);
});

test('Field 3D components are relocated out of Data before initial entry',()=>{
  const block=field.slice(field.indexOf('function fwInstall(){'),field.indexOf('let fwPrevSetDataView='));
  assert(block.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"),'Data cannot contain initial 3D controls');
  assert(block.includes("fwAdoptFieldNode('fieldViewPanel','fw3DHost')"),'Data cannot host initial 3D viewport');
});

test('Field A–D Inspector cards reuse original Case/Region and Field/Component rows and survive collapse, compare toggle and C/D removal',()=>{
  const start=field.indexOf('function fwPromoteViewControlRow(');
  const end=field.indexOf('function fwMount3D(){',start);
  assert(start>0&&end>start,'Production Field inspector card controller missing');
  function node(tag){
    const n={tagName:tag,id:'',className:'',dataset:{},children:[],parentElement:null,
      textContent:'',title:'',open:false,
      appendChild(child){
        if(child.parentElement){
          const previous=child.parentElement.children;
          const i=previous.indexOf(child);if(i>=0)previous.splice(i,1)
        }
        child.parentElement=n;n.children.push(child);return child
      },
      remove(){if(n.parentElement){const list=n.parentElement.children;const i=list.indexOf(n);if(i>=0)list.splice(i,1)}n.parentElement=null},
      querySelector(selector){
        const matches=x=>selector==='label'?x.tagName==='label':
          selector==='.fwViewCardControls'?x.className.split(' ').includes('fwViewCardControls'):false;
        const visit=items=>{for(const child of items){if(matches(child))return child;const nested=visit(child.children);if(nested)return nested}return null};
        return visit(n.children)
      }
    };
    n.classList={
      contains:x=>n.className.split(' ').includes(x),
      add:x=>{if(!n.classList.contains(x))n.className+=(n.className?' ':'')+x},
      toggle:(x,yes)=>{if(yes===undefined)yes=!n.classList.contains(x);
        if(yes)n.classList.add(x);else n.className=n.className.split(' ').filter(v=>v!==x).join(' ');
        return yes}
    };
    return n
  }
  const host=node('div');host.id='fw3DViewCases';
  const enabled={checked:false},originals={};
  const rowFor=(letter,kind)=>{
    const row=node('div');row.className='row2';row.dataset.original=letter+'-'+kind;
    const label=node('label');label.dataset={};row.appendChild(label);
    const first=kind==='case'?'Case':'Field',second=kind==='case'?'Region':'Component';
    const prefix=letter==='A'?'fv':letter==='B'?'fc':'fcExtra'+(letter.charCodeAt(0)-64);
    const selection={};
    for(const suffix of [first,second]){
      const id=prefix+suffix,select={
        value:letter+'-'+suffix.toLowerCase(),
        selectedOptions:[{textContent:letter+' chosen '+suffix.toLowerCase()}],
        closest:query=>query==='.row2'?row:null
      };
      selection[suffix]=select;originals[id]={row,label,select}
    }
    return row
  };
  for(const letter of ['A','B','C','D']){rowFor(letter,'case');rowFor(letter,'field')}
  function descend(root,id){
    if(root.id===id)return root;
    for(const child of root.children){const found=descend(child,id);if(found)return found}
    return null
  }
  const document={createElement:node,getElementById:id=>id==='fw3DViewCases'?host:
    id==='fcEnabled'?enabled:originals[id]?.select||descend(host,id)};
  const fcExtraViews=[{id:3},{id:4}];
  const controls=new Function('document','fcExtraViews','fwUi',field.slice(start,end)+
    ';return {fwPromoteViewCaseSelectors,fwRefreshViewCardSummaries,fwViewCardControlIds};')(
      document,fcExtraViews,(_,es)=>es);
  assert.equal(controls.fwPromoteViewCaseSelectors(),true);
  const card=letter=>document.getElementById('fwViewCard'+letter);
  for(const letter of ['A','B','C','D']){
    const c=card(letter);
    assert(c,'A–D should have a contextual Inspector card with preserved original source rows');
    const owned=c.querySelector('.fwViewCardControls');
    assert.equal(owned.children.length,2,'Each view card owns exactly two paired source rows');
    assert.equal(c.classList.contains('hidden'),letter!=='A','Comparison remains off by default');
    assert(owned.children.every(row=>row.classList.contains('hidden')===(letter!=='A')),
      'Native WebView2 must see original B–D .row2 controls hidden, not just their parent cards');
    assert.equal(c.open,true,'New views open to allow immediate Case/Region/Field/Component selection');
    assert.equal(document.getElementById(c.id+'Title').textContent,
      'Vista '+letter+' · '+(letter==='A'?'Principal':'Comparación'));
    assert(document.getElementById(c.id+'Summary').textContent.includes(letter+' chosen case'));
    for(const kind of ['case','field']){
      const first=kind==='case'?'Case':'Field';
      const prefix=letter==='A'?'fv':letter==='B'?'fc':'fcExtra'+(letter.charCodeAt(0)-64);
      const entry=originals[prefix+first];
      assert.strictEqual(entry.row.parentElement,owned,
        'Original scientific selector row must physically move, not clone');
      assert.equal(entry.label.dataset.flEs,'Vista '+letter+' · '+(kind==='case'?'Caso':'Variable'));
      assert.equal(entry.select.value,letter+'-'+first.toLowerCase());
    }
  }
  assert.equal(host.dataset.viewCount,'1');
  card('A').open=false;
  enabled.checked=true;
  assert.equal(controls.fwPromoteViewCaseSelectors(),true);
  assert.equal(host.dataset.viewCount,'4');
  assert.equal(host.children.length,4,'Repeated mounts must not duplicate cards');
  assert.equal(card('A').open,false,'A collapsed card must retain user expansion state');
  assert(['B','C','D'].every(letter=>!card(letter).classList.contains('hidden')));
  assert(['B','C','D'].every(letter=>card(letter).querySelector('.fwViewCardControls').children.every(row=>!row.classList.contains('hidden'))),
    'Enabled comparison must expose the real B–D rows to the native selector and accessibility checks');
  originals.fcExtra4Field.select.selectedOptions[0].textContent='T · scalar';
  controls.fwRefreshViewCardSummaries();
  assert(document.getElementById('fwViewCardDSummary').textContent.includes('T · scalar'));
  enabled.checked=false;controls.fwPromoteViewCaseSelectors();
  assert(['B','C','D'].every(letter=>card(letter).classList.contains('hidden')));
  assert(['B','C','D'].every(letter=>card(letter).querySelector('.fwViewCardControls').children.every(row=>row.classList.contains('hidden'))),
    'Original controls must report hidden independently of ancestor card display');
  assert.equal(host.children.length,4,'Disabling comparison must preserve C/D selectors and card state');
  enabled.checked=true;controls.fwPromoteViewCaseSelectors();
  fcExtraViews.splice(0,1);
  for(const suffix of ['Case','Region','Field','Component'])delete originals['fcExtra3'+suffix];
  controls.fwPromoteViewCaseSelectors();
  assert.equal(card('C'),null,'Removed View C must immediately lose its complete Inspector card');
  assert.equal(host.children.length,3);
  assert(card('D'),'Independent View D should remain visible');
  assert.equal(host.dataset.viewCount,'3');
  fcExtraViews.push({id:3});rowFor('C','case');rowFor('C','field');
  controls.fwPromoteViewCaseSelectors();
  assert(card('C'),'Recreated C must receive fresh original controls, not the deleted ones');
  assert.equal(card('C').querySelector('.fwViewCardControls').children.length,2);
  assert.equal(host.dataset.viewCount,'4');
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
  // Native fallback time delegates to the original strict numeric reader;
  // isolated companion tests must retain that actual source dependency.
  const numberStart=field.indexOf('function fwMeasuredNumber(');
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


// Granada visible Synchronize views: original three-way time/camera/visual
// checkboxes stay the ONLY owners, including mixed mode and manual linking.
test('Granada Field visible synchronize switch connects original A-D settings',()=>{
  const a=field.indexOf('function fwBindSyncViewControls(){'),
    b=field.indexOf('function fwCreateSurface(){',a);
  assert(a>=0&&b>a,'real synchronized view header binder must exist');
  function control(checked=false){
    return{checked,indeterminate:false,handlers:{},events:[],
      addEventListener(k,fn){(this.handlers[k]??=[]).push(fn)},
      dispatchEvent(e){this.events.push(e.type);
        for(const fn of this.handlers[e.type]||[])fn(e)}}
  }
  const names=['fcLinkTimes','fcLinkCameras','fcSyncVisuals'],
    controls=Object.fromEntries(names.map(id=>[id,control(true)]));
  controls.fwSyncViewsVisible=control(true);
  controls.fwLinkCamerasVisible=control(true);
  const document={getElementById:id=>controls[id]||null};
  class TestEvent{
    constructor(type,options){this.type=type;this.bubbles=options?.bubbles}
  }
  const connect=new Function('document','Event','fwUi',
    field.slice(a,b)+';return fwBindSyncViewControls;')(
      document,TestEvent,(en,es)=>es);
  connect();
  assert.equal(controls.fwSyncViewsVisible.checked,true);
  assert.equal(controls.fwSyncViewsVisible.indeterminate,false);
  controls.fwSyncViewsVisible.checked=false;
  controls.fwSyncViewsVisible.dispatchEvent(new TestEvent('change',{bubbles:true}));
  assert(names.every(id=>!controls[id].checked),
    'one visible switch must unlink camera, physical times and visual settings');
  assert(names.every(id=>controls[id].events.includes('change')),
    'all three original handlers must be notified, not replaced');
  assert.equal(controls.fwLinkCamerasVisible.checked,false);
  assert.equal(controls.fwSyncViewsVisible.indeterminate,false);
  controls.fwSyncViewsVisible.checked=true;
  controls.fwSyncViewsVisible.dispatchEvent(new TestEvent('change',{bubbles:true}));
  assert(names.every(id=>controls[id].checked));
  controls.fcLinkTimes.checked=false;
  controls.fcLinkTimes.dispatchEvent(new TestEvent('change',{bubbles:true}));
  assert.equal(controls.fwSyncViewsVisible.checked,false);
  assert.equal(controls.fwSyncViewsVisible.indeterminate,true,
    'custom granular mixed settings must not be falsely presented as fully synchronized');
  controls.fwLinkCamerasVisible.checked=false;
  controls.fwLinkCamerasVisible.dispatchEvent(new TestEvent('change',{bubbles:true}));
  assert.equal(controls.fcLinkCameras.checked,false);
  assert.equal(controls.fwSyncViewsVisible.indeterminate,true);
  controls.fwSyncViewsVisible.checked=false;
  controls.fwSyncViewsVisible.dispatchEvent(new TestEvent('change',{bubbles:true}));
  assert(names.every(id=>!controls[id].checked));
  assert.equal(controls.fwSyncViewsVisible.indeterminate,false);
  assert(field.includes('id="fwSyncViewsVisible" checked'),
    'the switch must be visible immediately in Field 3D header');
  assert(field.includes('data-fl-es="Sincronizar vistas"'),
    '3D global synchronization must be translated');
  assert(field.includes('fwBindSyncViewControls();'),
    'live Field workspace must bind the actual switch');
});

test('Granada unsynchronized physical times survive native workspace save/restore',()=>{
  const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
  for(const token of [
    "timesLinked:document.getElementById('fcLinkTimes')?.checked!==false",
    "independentTimes:{",
    "key:fcState.timeSource||''",
    "value:Number.isFinite(fcState.timeTarget)?fcState.timeTarget:null",
    "check('fcLinkTimes',saved.timesLinked)",
    "saved.independentTimes[letter]",
    "state.timeSource=entry.key;state.timeTarget=entry.value",
    "check('fcLinkTimes',true)",
    "e.target?.matches?.('[data-fc-independent-time], [data-fc-time-rate], [data-fc-time-loop]')"
  ])assert(ux.includes(token),'real measured time preference must survive: '+token);
  assert(field.includes('id="fwSyncViewsVisible"'),
    'the option must be reachable without opening the Field inspector');
});


test('Granada Field exit stops original independent players before UI ownership moves',()=>{
  const start=field.indexOf('function fwLeave(){'),
    end=field.indexOf('function fwInstall(){',start);
  assert(start>=0&&end>start,'original Field exit lifecycle required');
  const events=[],state={active:true,layout:'3d',dataViewBeforeField:null,
    fieldTsSeq:5,compareUserRequested:true};
  const leave=new Function('fwState','document','fcStopAllIndependentPlayback',
    'fvStopPlayback','fwTimeStop','fwSetInspector',
    'fwReturnCompanionControlsToData','cases','fvCaseViewAvailable','window',
    field.slice(start,end)+';return fwLeave;')(
    state,{getElementById:()=>null},
    ()=>events.push('stop B/C/D'),
    ()=>events.push('stop A'),
    ()=>events.push('stop global Field'),
    ()=>events.push('close inspector'),
    ()=>events.push('return companion'),
    [{id:'A'},{id:'B'}],()=>true,{FoamLensPlotSurfaces:{active:()=>null}});
  leave();
  assert.equal(state.active,false);
  assert.equal(state.fieldTsSeq,6);
  assert.deepStrictEqual(events.slice(0,3),
    ['stop B/C/D','stop A','stop global Field'],
    'independent B/C/D playback must stop before Data takes Field controls');
  assert.deepStrictEqual(events.slice(3),['close inspector','return companion'],
    'original Field exit must still restore the usual Inspector and plot ownership');
  assert.equal(state.compareUserRequested,true,
    'exiting Field should not discard multi-case source configuration');
  leave();
  assert.equal(events.length,5,'repeated Field exit must not duplicate source playback stops');
});


test('Granada native B/C/D playback speed and loop survive Workspace save, restore and reset',()=>{
  const begin=ux.indexOf('function uxSnapshot(){'),
    end=ux.indexOf('function uxSave(){',begin);
  assert(begin>=0&&end>begin,'original workspace snapshot must be accessible');
  const B={timeSource:'B3|metal|T',timeTarget:2,timePlaybackRate:2,timePlaybackLoop:true},
    C={id:3,timeSource:'C3|mold|T',timeTarget:.5,
      timePlaybackRate:.5,timePlaybackLoop:false},
    D={id:4,timeSource:'D3|metal|alpha1',timeTarget:1,
      timePlaybackRate:99,timePlaybackLoop:'yes'};
  const snapshot=new Function('document','fwState','fcState','fcExtraViews',
    'uxNames','uxDefaultNames','uxLoad','window',
    ux.slice(begin,end)+';return uxSnapshot();')(
    {getElementById:id=>id==='fcLinkTimes'?{checked:false}:null},
    {layout:'3d',view:'3d',syncTime:false,companion:'profile'},
    B,[C,D],()=>({1:'A',2:'B',3:'C',4:'D'}),
    {1:'A',2:'B',3:'C',4:'D'},()=>({}),
    {FoamLensWorkspaceResize:{getSizes:()=>null}}
  );
  assert.deepStrictEqual(snapshot.playbackSettings,{
    B:{rate:2,loop:true},
    C:{rate:.5,loop:false},
    D:{rate:1,loop:false}
  },'actual workspace save must preserve independent rates and valid loop flags');
  assert.equal(snapshot.timesLinked,false);
  assert.deepStrictEqual(snapshot.independentTimes.C,{key:'C3|mold|T',value:.5});
  for(const token of [
    'playbackSettings:Object.fromEntries([',
    'state.timePlaybackRate=[.5,1,2].includes(Number(options.rate))?',
    'state.timePlaybackLoop=options.loop===true',
    'state.timePlaybackRate=1;state.timePlaybackLoop=false',
    'state.timeTarget=NaN;state.timeSource=',
    "e.target?.matches?.('[data-fc-independent-time], [data-fc-time-rate], [data-fc-time-loop]')"
  ])assert(ux.includes(token),'real save/restore/reset binding missing: '+token);
  assert.equal(snapshot.schema,2,'existing workspace state schema must be preserved');
  assert(field.includes('id="fwSyncViewsVisible"'),
    'original visible Synchronize views switch must remain available');
});
