'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const index=read('index.html');
const field=read('v14-zz-field-workspace.js');
const fieldView=read('v14-field-view.js');
const plots=read('v14-zy-plot-surfaces.js');
const ribbon=read('v15-ribbon-ui.js');
const context=read('v13-multiregion-context.js');
const session=read('v23-session-state.js');
const analysis=[
  'v13-flow-analysis.js','v13-numerical-performance.js','v13-physical-analysis.js',
  'v13-solidification-analysis.js','v13-spatial-differences.js','v13-temporal-alignment.js',
  'v13-thermal-analysis.js','v13-vector-fields.js','v14-energy-audit.js',
  'v14-experimental-validation.js','v14-momentum-mechanisms.js'
].map(read);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('legacy Field navigation is absent from product DOM and routing',()=>{
  assert(!index.includes('id="modeField"'),'Base HTML still exposes the legacy Field mode button.');
  assert(!fieldView.includes("tab.id='fieldViewTab'"),'Field View still creates the legacy Data tab.');
  assert(!fieldView.includes("setDataView('field3d')"),'Field View still routes through Data.');
  assert(!field.includes("setDataView('field3d')"),'Field workspace still aliases Data field3d navigation.');
});

test('top-level workspaces own stable render/control trees',()=>{
  assert(!field.includes('appendChild(chart)'),'Field still reparents a chart.');
  assert(!field.includes('fwRestoreCompanionNodes'),'Field still restores a shared chart.');
  assert(!field.includes('function fwRemember('),'Legacy DOM origin tracking remains.');
  assert(plots.includes("['data',{view:currentDataView||'timeseries'"));
  assert(plots.includes("['analysis',{view:'timeseries'"));
  assert(plots.includes("['field',{view:'profile'"));
  assert(plots.includes('bindPlotCanvasInteractions(canvas)'));
});

test('Field uses one explicit physical-time transport and contextual sidebar',()=>{
  assert(field.includes('id="fwTimeTransport"'));
  assert(field.includes('body.appMode-field .fvTimeline'));
  assert(field.includes('body.appMode-field #profileTimeline'));
  assert(field.includes('body.appMode-field #playbackGlobal'));
  assert(field.includes('fwControlsDrawer'));
  assert(field.includes('fwMountContextSidebar'));
  assert(field.includes(".sidebar>.fwControlsDrawer.fwSidebarContext{position:static"));
  assert(field.includes("group3D.style.display=(view==='3d'||view==='split')?'':'none'"));
  assert(field.includes("group2D.style.display=(view==='3d')?'none':''"));
  assert(ribbon.includes("document.getElementById('fvCacheLimit')"));
  assert(ribbon.includes("#flRibbonPanel-field.active{flex-wrap:wrap"));
});

test('Ribbon exposes real scopes without fake Plots or Compare tabs',()=>{
  for(const kept of ['home','data','field','analysis','export','view'])
    assert(new RegExp("\\['"+kept+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Missing Ribbon scope '+kept);
  for(const removed of ['plots','compare'])
    assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Fake Ribbon scope returned: '+removed);
});

test('Analysis-created results remain navigation-neutral',()=>{
  for(const src of analysis){
    assert(!src.includes("setDataView('timeseries')"),'Analysis module silently switches to Time Series.');
    assert(!src.includes("setDataView('profile')"),'Analysis module silently switches to Spatial Profile.');
    assert(!src.includes('||document.body')&&!src.includes('|| document.body'),'Analysis module falls back to document.body.');
  }
  const p0=index.indexOf('function createPhaseFrontTrajectories()'),p1=index.indexOf('function exportPhaseFrontCsv()',p0);
  assert(p0>=0&&p1>p0,'Phase Front creation function missing.');
  const phase=index.slice(p0,p1);
  assert(!phase.includes("setDataView('timeseries')"),'Phase Front still silently changes plot view.');
  assert(ribbon.includes('flRaAnalysisTimeResult')&&ribbon.includes('flRaAnalysisProfileResult'),'Explicit Analysis result handoffs missing.');
});

test('Case and Region state are independent from selector DOM',()=>{
  assert(context.includes('window.FoamLensContextStore'));
  const start=context.indexOf('seriesMatchesGlobalContext=function(s)'),end=context.indexOf('refreshGlobalContext=mrRenderContextPresentation',start);
  const matcher=context.slice(start,end);
  assert(matcher.includes('mrContextSnapshot()'));
  assert(!matcher.includes('globalCaseSelect')&&!matcher.includes('globalRegionSelect'));
});

test('cross-session persistence covers all top-level workspace state',()=>{
  for(const token of [
    "foamlens.session.v1",'activeMode:String(activeAppMode','context:flSessionContextSnapshot()',
    'FoamLensPlotSurfaces?.serialize?.()','FoamLensWorkspaceUx?.getState?.()',
    'FoamLensWorkspaceUx?.applyState?.(payload.field)',
    'beforeunload','pagehide'
  ])assert(session.includes(token),'Missing session token '+token);
});

test('Difference language is unambiguous between 2D curves and 3D fields',()=>{
  assert(ribbon.includes("'2D Curve Δ','Δ de curvas 2D'"));
  assert(ribbon.includes("'Strict 3D Δ','Δ 3D estricta'"));
});

test('v1.6 architecture has no intentional cross-workspace chart bridge left',()=>{
  const frontendFiles=fs.readdirSync(base).filter(n=>n==='index.html'||/^v\d+-.*\.js$/i.test(n));
  const offenders=[];
  for(const name of frontendFiles){
    const src=read(name);
    if(src.includes('appendChild(chart)'))offenders.push(name+': appendChild(chart)');
    if(src.includes('fwRestoreCompanionNodes'))offenders.push(name+': fwRestoreCompanionNodes');
  }
  assert.deepEqual(offenders,[]);
});

console.log('FoamLens v1.6 final UX coherence audit passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
