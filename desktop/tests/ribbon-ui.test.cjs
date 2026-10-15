'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const repoRoot=path.join(__dirname,'..','..');
const frontend=path.join(repoRoot,'desktop','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(frontend,'v15-ribbon-ui.js'),'utf8');
const workspace=fs.readFileSync(path.join(frontend,'v14-zz-field-workspace.js'),'utf8');
const activity=fs.readFileSync(path.join(frontend,'v20-activity-manager.js'),'utf8');

new Function(source);new Function(workspace);new Function(activity);

const tabs=['home','data','field','analysis','export','view'];
for(const tab of tabs){
  const tuplePattern=new RegExp("\\['"+tab+"','[^']+','[^']+','[^']+'\\]");
  assert(tuplePattern.test(source),"Ribbon tab definition missing: "+tab);
}
for(const removed of ['plots','compare'])
  assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(source),
    "Obsolete top-level alias tab still present: "+removed);

for(const id of [
  'flRaDataTimeSeries','flRaDataProfiles','flRaDataLogs','flRaDataCompare','flRaCatalog','flRaFieldWorkspace',
  'flRaInspector','flRaProbe','flRaCompare3D','flRaCompareDifference',
  'flRaAnalysisTimeResult','flRaAnalysisProfileResult','flRaExportPng','flRaTheme'
]) assert(source.includes(id),'Missing v1.6 Ribbon action: '+id);

assert(source.includes("flRibbonActionHtml('flRaDataTimeSeries'"),'Time Series must appear as an actual Data Ribbon action.');
assert(source.includes("flRibbonBind('flRaDataTimeSeries',()=>flRibbonOpenDataView('timeseries'))"),'Time Series must navigate to its real Data view.');
assert(!source.includes("flRibbonBind('flRaDataTime',"),'Retired Time Series command must not reappear.');

assert(source.includes("flRibbonBind('flRaAnalysisTimeResult',()=>flRibbonOpenDataView('timeseries'))"),
  'Analysis has no explicit Time Series result handoff.');
assert(source.includes("flRibbonBind('flRaAnalysisProfileResult',()=>flRibbonOpenDataView('profile'))"),
  'Analysis has no explicit Spatial Profile result handoff.');
assert(source.includes("flRibbonContextNeeded"),'Context scope policy is missing.');
assert(source.includes("activeAppMode==='analysis'"),
  'Analysis must retain the shared Project/Case/Region context.');
assert(source.includes("activeAppMode==='data')return typeof currentDataView==='string'&&currentDataView!=='catalog'"),
  'Catalog must not duplicate its own Case/Region filters with the shared context bar.');
assert(source.includes("if(typeof activeAppMode==='string'&&activeAppMode==='field')return false"),
  '3D Field must not mount Data plot context.');
assert(source.includes("foamlens-field-view-change"),
  'Ribbon does not listen for internal Field tab scope changes.');
assert(source.includes('function flRibbonUpdateFieldScope'),
  'Field Ribbon does not scope 3D-only actions to 3D/Split.');
assert(source.includes('function flRibbonMountFieldTimeTransport'),
  'Global physical-time transport is not mounted into the Field Ribbon.');
assert(source.includes("host.appendChild(transport)"),
  'Field Ribbon creates a second time controller instead of reusing the global transport.');
assert(source.includes('flRibbonTimeHost'),
  'Field Ribbon has no physical-time transport host.');
assert(source.includes("document.getElementById('fvCacheLimit')"),
  'Field Ribbon does not mount the canonical frame-cache selector beside playback.');
assert(source.includes("document.getElementById('fvCacheReadout')"),
  'Field Ribbon does not mount the canonical cache readout beside playback.');
assert(source.includes("cacheField.parentElement!==popup"),
  'Frame-cache control is copied instead of moved as the canonical control.');
assert(source.includes('function flRibbonMountFieldOptions'),
  'Field Ribbon does not own contextual Split options.');
assert(source.includes("document.getElementById('fwSplitChooser')"),
  'Split second-pane chooser is not available from the Field Ribbon.');
assert(source.includes("#flRibbonPanel-field.active{display:flex;align-items:center;flex-wrap:nowrap"),'Field Ribbon must remain one compact primary row.');
assert(source.includes("document.getElementById('flRibbon')?.appendChild(shelf)"),'Field subbars must live outside the primary command row.');
assert(source.includes("body.flRibbonReady.appMode-field .fwWorkspaceBar{display:none!important}"),
  'Duplicated internal Field navigation remains visible under the Ribbon.');
for(const id of ['flRaProbe','flRaSlice','flRaVectors','flRaStreamlines','flRaCompare3D','flRaLinkCameras'])
  assert(source.includes(id),'Expected scoped Field action missing: '+id);
assert(source.includes("view==='3d'||view==='split'"),
  '3D-only Ribbon actions are not tied to 3D/Split view state.');
assert(source.includes("flRibbonContextHost.hidden{display:none!important}"),
  'Context host cannot be hidden in pure 3D focus.');
assert(source.includes("globalContextBar"),
  'Project/Case/Region state presentation was deleted instead of scoped.');
assert(source.includes('body.flRibbonReady.appMode-data .datasetTabs'),
  'Legacy Data view tabs are still competing with the Field internal tabs.');
assert(source.includes('body.flRibbonReady.appMode-analysis .datasetTabs'),
  'Legacy Data view tabs are still visible in Analysis.');

assert(workspace.includes('data-fw-view="3d"'));
for(const legacy of ['profile','timeseries','log','split'])
  assert(!workspace.includes('data-fw-view="'+legacy+'"'),'Data-only view leaked into Field: '+legacy);
assert(workspace.includes("foamlens-field-view-change"),
  'Field tabs do not publish scope changes.');

assert(activity.includes('flActivityOverlayOpen'));
assert(activity.includes('activityToast.flActivitySuppressed{display:none!important}'),
  'Activity toast is not suppressed while a detailed overlay owns progress.');
assert(activity.includes("'scanOverlay'"),
  'Scanner overlay is not part of the unified activity policy.');

assert(source.includes("document.getElementById('modeField')?.remove()"),
  'Legacy Field mode button is not retired after Ribbon installation.');
assert(!source.includes("flRibbonClick('modeField')"),
  'Field Ribbon still falls back to the retired legacy mode button.');
assert(source.includes("body.flRibbonReady #modeNavBar{display:none!important}"),
  'Legacy mode navigation may only be hidden after the Ribbon mounts.');
assert(source.includes("body.flRibbonReady .top .tools{display:none!important}"));
assert(source.includes('window.FoamLensRibbon'));

assert(source.includes('window.FoamLensRibbonMeasureChrome=measure')&&source.includes('window.FoamLensRibbonMeasureChrome?.()'),
  'Ribbon navigation must synchronously measure the chrome before placing the sidebar');
console.log('FoamLens v1.6 Ribbon/context/activity scope audit passed:',tabs.length,'top-level tabs.');

assert(source.includes('function flRibbonFieldSubbars')&&source.includes("shelf.classList.toggle('hidden',!enabled)"),'One-at-a-time contextual 3D subbars are missing.');
assert(source.includes('.flRibbonTimeGroup{min-width:300px')&&source.includes('flRibbonCacheAdvanced'),'Field ribbon must be compact and cache configuration collapsible.');
assert(!source.includes("flRibbonActionHtml('flRaAbout'"),'About must not disappear when the Home ribbon tab is not active.');
assert(source.includes("document.getElementById('fcEnabled')?.checked")&&source.includes("setInspector?.(true)"),'Compare must reveal explicit second-view controls.');

for(const id of ['flRaCameraIso','flRaCameraFront','flRaCameraBack','flRaCameraLeft','flRaCameraRight','flRaCameraTop','flRaCameraBottom','flRaQuickIso','flRaQuickFront','flRaQuickBack','flRaQuickLeft','flRaQuickRight','flRaQuickTop','flRaQuickBottom'])assert(source.includes(id),'Camera preset missing: '+id);
assert(source.includes('flRibbonCameraTools')&&source.includes('flCameraToolsActive'),'Orbit/pan/zoom tools must live in contextual Camera subbar.');

assert(source.includes("flRibbonBind('flRaDataTimeSeries',()=>flRibbonOpenDataView('timeseries'))")&&source.includes("setAppMode('data');setDataView(view)"),'Data Time series must use canonical Data workspace view navigation.');
assert(source.includes("flRibbonBind('flRaDataProfiles',()=>flRibbonOpenDataView('profile'))"),'Data spatial profiles must use canonical Data workspace view navigation.');
assert(source.includes("flRibbonBind('flRaDataLogs',()=>flRibbonOpenDataView('log'))"),'Data solver logs must use canonical Data workspace view navigation.');
assert(source.includes('function flRibbonOpenData2DCompare()'),'Data 2D comparison entry point is missing.');

const tabHandlers=source.slice(source.indexOf("document.querySelectorAll('.flRibbonTab').forEach(b=>b.addEventListener('click'"),
  source.indexOf("flRibbonBind('flRaOpenFiles'"));
assert(tabHandlers.includes("else if(key==='data')try{setAppMode('data')}catch{}"),
  'Data tab must navigate through canonical Data mode, not override the selected plot');
assert(!tabHandlers.includes("setDataView("),
  'Returning to Data must preserve the current Time series / Profile / Logs / Catalog view');

assert(source.includes("flRibbonBind('flRaDifference',()=>flRibbonOpenData2DCompare())"),
  '2D difference button incorrectly opens advanced Analysis instead of Data.');

assert(source.includes('function flRibbonInstallChromeMeasurement')&&source.includes('watcher.observe(header)')&&source.includes('watcher.observe(ribbon)'),
  'Chrome height must be measured instead of a brittle fixed pixel offset');
assert(source.includes('body.flRibbonReady .sidebar{margin-top:calc(var(--flChromeTop) + var(--flRibbonHeight))'),
  'Sidebar must start below global top header and ribbon');
assert(source.includes('body.flRibbonReady .main{padding-top:calc(var(--flChromeTop) + var(--flRibbonHeight))'),
  'Main workspace must start below global chrome');
assert(source.includes('.flRibbon{position:fixed;left:0;right:0;top:var(--flChromeTop,58px);width:100%'),
  'Global Ribbon must never shrink with sidebar width');
assert(source.includes('.flRibbonLabel{font-size:10px')&&source.includes('.flFieldContextTab{padding:6px 10px'),
  'Ribbon buttons must have one consistent typography model');
for(const id of ['flRaQuickIso','flRaQuickFront','flRaQuickBack','flRaQuickLeft','flRaQuickRight','flRaQuickTop','flRaQuickBottom'])
  assert(source.includes(id),'Direct camera shortcut must remain visible: '+id);

// Native screenshot capture must exercise the actual Ribbon Camera shelf.
// The 3D canvas does not own controls after flRibbonFieldSubbars() reparents them.
const nativeHost=fs.readFileSync(path.join(repoRoot,'desktop','src','FoamLensDesktop','Program.cs'),'utf8');
assert(source.includes("shelf.appendChild(tools)")&&source.includes("const tools=document.querySelector('#fieldViewPanel .fvViewTools')"),
  'Camera toolbar must be moved from the 3D viewport into the Ribbon shelf.');
const scientificCapture=nativeHost.slice(nativeHost.indexOf('private async Task CaptureScientificWorkspaceEvidenceAsync()'),
  nativeHost.indexOf('private async Task CaptureCdpPngAsync(',nativeHost.indexOf('private async Task CaptureScientificWorkspaceEvidenceAsync()')));
assert(scientificCapture.includes("document.querySelector('#flFieldContextTabs [data-fl-subbar=\"camera\"]')")&&
  scientificCapture.includes("shelf?.querySelector('.fvViewTools')")&&
  scientificCapture.includes('cameraTab.click()')&&
  scientificCapture.includes('cameraDocked')&&
  scientificCapture.includes('overlap<1'),
  'Exact-head Windows screenshot must expand the real Ribbon Camera shelf and verify no 3D canvas overlap.');
assert(!scientificCapture.includes("document.querySelector('#fieldViewPanel .fvViewTools')"),
  'Scientific screenshot validation must not search for Camera controls in their obsolete viewport parent.');

// Real DOM interaction: compact Camera must scroll the Ribbon shelf to the
// docked controls instead of leaving them beyond the right viewport edge.
const revealStart=source.indexOf('function flRibbonRevealCameraTools(');
const revealEnd=source.indexOf('function flRibbonFieldSubbars()',revealStart);
assert(revealStart>=0&&revealEnd>revealStart,
  'Missing compact Camera shelf reveal helper.');
const revealCamera=new Function(source.slice(revealStart,revealEnd)+';return flRibbonRevealCameraTools;')();
const cameraDock={getBoundingClientRect:()=>({left:830,right:1130,width:300})};
const compactShelf={scrollLeft:0,querySelector:selector=>selector==='.flRibbonCameraTools'?cameraDock:null,
  getBoundingClientRect:()=>({left:0,right:640,width:640})};
assert.equal(revealCamera(compactShelf),true);
assert.equal(compactShelf.scrollLeft,830,'Compact Camera should automatically reveal its docked toolbar.');
const visibleDock={getBoundingClientRect:()=>({left:50,right:300,width:250})};
const wideShelf={scrollLeft:0,querySelector:()=>visibleDock,
  getBoundingClientRect:()=>({left:0,right:1140,width:1140})};
assert.equal(revealCamera(wideShelf),true);
assert.equal(wideShelf.scrollLeft,0,'Already-visible wide Camera tools must not force horizontal scrolling.');
const leftClippedDock={getBoundingClientRect:()=>({left:-80,right:160,width:240})};
const clippedShelf={scrollLeft:100,querySelector:()=>leftClippedDock,
  getBoundingClientRect:()=>({left:0,right:640,width:640})};
assert.equal(revealCamera(clippedShelf),true);
assert.equal(clippedShelf.scrollLeft,20,'Resizing wider must restore left-clipped Camera controls.');
assert.equal(revealCamera({querySelector:()=>null}),false,'Missing tools must fail safely.');
assert(source.includes("if(enabled&&key==='camera')flRibbonRevealCameraTools(shelf)"),
  'Opening Camera must invoke its compact scroll-to-controls behavior.');
assert(source.includes("window.addEventListener('resize',()=>{")&&
  source.includes("if(camera?.classList.contains('active')&&!shelf.classList.contains('hidden'))"),
  'Keeping Camera open during wide/compact window changes must re-reveal its docked controls.');

const compactCssStart=source.indexOf('function flRibbonCss()');
const compactCssEnd=source.indexOf('function flRibbonSelectTab(',compactCssStart);
assert(compactCssStart>0&&compactCssEnd>compactCssStart,'Ribbon CSS generator is missing');
const compactCss=new Function(source.slice(compactCssStart,compactCssEnd)+';return flRibbonCss()')();
assert(compactCss.includes('@media(max-width:1460px)')&&compactCss.includes('#flRibbonPanel-field .flRibbonGroup:not(.flRibbonTimeGroup) .flRibbonLabel{display:none}'),
  'Laptop Field mode must collapse verbose labels to semantic icon controls');
assert(compactCss.includes('#flRibbonPanel-field .flRibbonGroup:not(.flRibbonTimeGroup) .flRibbonAction{width:29px'),
  'Field icon controls need bounded button widths in a one-row Ribbon');
assert(compactCss.includes('@media(max-width:760px)')&&compactCss.includes('.flRibbonQuickCameraGroup{display:none}'),
  'On compact viewports, duplicate quick cameras must yield to the Camera subbar');
assert(source.includes("aria-label=\"'+en.replace"),'Icon-only Ribbon controls need accessible names');

for(const id of ['flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'])
  assert(source.includes(id),'Data must expose its own plotting and compare actions: '+id);
