'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const repoRoot=path.join(__dirname,'..','..');
const ribbonPath=path.join(repoRoot,'desktop','src','FoamLensDesktop','frontend','v15-ribbon-ui.js');
const source=fs.readFileSync(ribbonPath,'utf8');

const tabs=['home','data','field','plots','analysis','compare','export','view'];
for(const tab of tabs){
  assert(source.includes("flRibbonTab-"+tab),"Ribbon tab missing: "+tab);
  assert(source.includes("flRibbonPanel-"+tab),"Ribbon panel missing: "+tab);
}

const requiredTargets=[
  'addFiles','addFolder','saveWorkspaceTop','openWorkspaceTop',
  'timeSeriesTab','profileTab','logTab','catalogTab',
  'fwAdd3DView','fwConfigureViews','fwLayout',
  'fvProbeMode','fvSlice','fvVectors','fvStreamlines','fvFitCamera','fvResetCamera',
  'generalAnalysisNav','pmMappingNav','pmPhaseNav','createDifference',
  'fcEnabled','fcAddView','exportPng','exportSvg','exportCsv','thesisFigureBtn',
  'fvAnimationPanel','sidebarToggle','theme','language'
];
for(const id of requiredTargets)assert(source.includes("'"+id+"'")||source.includes('"'+id+'"'),"Ribbon lost existing control target: "+id);

assert(source.includes("globalContextBar"),'Ribbon must preserve the existing project/case/region context bar.');
assert(source.includes("contextTrail"),'Ribbon must preserve the existing context trail.');
assert(source.includes("body.flRibbonReady #modeNavBar{display:none!important}"),
  'Legacy mode navigation may only be hidden after the ribbon is installed.');
assert(source.includes("body.flRibbonReady .top .tools{display:none!important}"),
  'Legacy toolbar may only be hidden after the ribbon is installed.');
assert(source.includes(".flRibbonLabel{font-size:8px"),
  'Ribbon action words must remain compact beneath the icons.');
assert(source.includes(".flRibbonIcon{width:21px;height:21px"),
  'Ribbon actions must retain icon-first visual hierarchy.');
assert(source.includes("aria-selected"),'Ribbon tabs must expose selected state accessibly.');
assert(source.includes("role=\"tablist\""),'Ribbon must expose a tablist.');
assert(source.includes("window.FoamLensRibbon"),'Ribbon must expose a small runtime smoke API.');

const actionCount=(source.match(/flRibbonActionHtml\('/g)||[]).length;
assert(actionCount>=35,'Ribbon should organize the major workflows, not be a token toolbar. Found '+actionCount+' action definitions.');

console.log('FoamLens ribbon UI source audit passed:',tabs.length,'tabs,',actionCount,'actions.');
