'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ribbon=fs.readFileSync(path.join(frontend,'v15-ribbon-ui.js'),'utf8');
const field=fs.readFileSync(path.join(frontend,'v14-zz-field-workspace.js'),'utf8');
const ux=fs.readFileSync(path.join(frontend,'v17-workspace-ux.js'),'utf8');
for(const src of [ribbon,field,ux])new Function(src);
for(const preset of ['Iso','Front','Back','Left','Right','Top','Bottom']){
  assert(ribbon.includes('flRaQuick'+preset),'Missing direct camera direction '+preset);
  assert(ribbon.includes('flRaCamera'+preset),'Missing full camera direction '+preset);
}
for(const id of ['flRaFieldProfile','flRaFieldTimeSeries','flRaFieldLogs','flRaSplit'])
  assert(!ribbon.includes("flRibbonActionHtml('"+id+"'"),'Field still advertises Data-owned plot '+id);
for(const view of ['profile','timeseries','log','split'])
  assert(!field.includes('data-fw-view="'+view+'"'),'Field still exposes Data-owned view '+view);
assert(ribbon.includes('body.flRibbonReady.appMode-field .fwWorkspaceBar{display:none!important}'),'Actual class-based navigation leak is not fixed');
assert(!ribbon.includes('body.flRibbonReady.appMode-field #fwWorkspaceBar{display:none!important}'));
assert(field.includes("view='3d';fwState.view=view;"),'Legacy Field view state not constrained');
assert(ux.includes("FoamLensFieldWorkspace?.setView?.('3d')"),'Imported legacy Field state is not constrained');
assert(ribbon.includes('function flRibbonPlaceCachePopover()'));
assert(ribbon.includes("const popup=advanced.querySelector('.flRibbonCachePopover')"));
assert(ribbon.includes('width:auto!important;max-width:none!important'),'Compact camera labels will be squeezed to obsolete 29px icons');
assert(ribbon.includes('position:fixed;z-index:950'),'Frame-cache UI can still grow the constrained Ribbon row');
assert(ribbon.includes('flRibbonCachePopover .flRibbonCacheField select{width:100%'));
assert(ribbon.includes('flRibbonBind(\'flRaAnalysisTimeResult\',()=>flRibbonOpenDataView(\'timeseries\'))'));
assert(ribbon.includes('flRibbonBind(\'flRaAnalysisProfileResult\',()=>flRibbonOpenDataView(\'profile\'))'));
console.log('Field-only 3D nav, seven unique camera shortcuts and anchored cache popover contracts passed.');
