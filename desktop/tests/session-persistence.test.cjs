'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const session=fs.readFileSync(path.join(base,'v23-session-state.js'),'utf8');
const plots=fs.readFileSync(path.join(base,'v14-zy-plot-surfaces.js'),'utf8');
const fieldUx=fs.readFileSync(path.join(base,'v17-workspace-ux.js'),'utf8');

new Function(session);new Function(plots);new Function(fieldUx);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('session state persists top-level mode context plots and Field state',()=>{
  for(const token of [
    "const flSessionKey='foamlens.session.v1'",
    'activeMode:String(activeAppMode',
    'context:flSessionContextSnapshot()',
    'plots:window.FoamLensPlotSurfaces?.serialize?.()',
    'field:window.FoamLensWorkspaceUx?.getState?.()',
    'localStorage.setItem(flSessionKey'
  ])assert(session.includes(token),'Missing session persistence token: '+token);
});

test('saved context is keyed by stable case identity instead of numeric runtime id',()=>{
  for(const token of [
    "caseRoot:String(c?.rootPath||'')",
    "caseName:String(c?.name||'')",
    "String(c?.rootPath||'')===root",
    "String(c?.name||'')===name"
  ])assert(session.includes(token),'Missing stable case identity token: '+token);
  assert(!session.includes('caseId:activeContextCaseId'),'Session persistence stores transient case ids.');
});

test('session waits for workspace data before restoring navigation',()=>{
  for(const token of [
    'function flSessionHasWorkspaceData()',
    "if(!force&&!flSessionHasWorkspaceData())return false",
    "if(!flSessionHasWorkspaceData())return false",
    "MutationObserver(()=>{if(flSessionPending)flSessionTryRestore()})"
  ])assert(session.includes(token),'Missing deferred restore token: '+token);
});

test('Field mode restore fails safely to Data when no compatible 3D case exists',()=>{
  assert(session.includes("if(mode==='field')"));
  assert(session.includes("if(!cases.some(c=>fvCaseViewAvailable(c)))return'data'"));
});

test('plot surface persistence uses stable series workspace keys',()=>{
  for(const token of [
    'function flPlotSurfaceSerialize()',
    'function flPlotSurfaceHydrate(payload',
    'seriesWorkspaceKey(item)',
    'seriesKey:flPlotSurfaceSeriesKey(p.seriesId)',
    'activeSeriesKey:flPlotSurfaceSeriesKey(state.activeId)',
    'flPlotSurfaceSeriesId(p.seriesKey)'
  ])assert(plots.includes(token),'Missing stable plot persistence token: '+token);
});

test('Field Inspector joins the existing persisted Field layout',()=>{
  assert(fieldUx.includes("inspector:typeof fwState!=='undefined'?!!fwState.inspector:false"));
  assert(fieldUx.includes("setInspector?.(!!saved.inspector)"));
  assert(fieldUx.includes("setInspector?.(false)"));
});

test('session saves on navigation context plot interaction and application close',()=>{
  for(const token of [
    'flSessionPatchNavigation()',
    "'foamlens-context-change'",
    "'foamlens-plot-state-change'",
    "'foamlens-plot-surface-change'",
    "'foamlens-field-view-change'",
    "window.addEventListener('beforeunload',flSessionSaveNow)",
    "window.addEventListener('pagehide',flSessionSaveNow)"
  ])assert(session.includes(token),'Missing save trigger: '+token);
});

console.log('FoamLens v1.6 session persistence regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
