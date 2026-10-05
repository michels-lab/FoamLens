'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-sidebar-sections.js');
const source=fs.readFileSync(modulePath,'utf8');
const indexSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
new Function(source);

const begin='/* FOAMLENS_SIDEBAR_SECTIONS_CORE_START */';
const end='/* FOAMLENS_SIDEBAR_SECTIONS_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Sidebar section core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {SB_STORAGE_KEY,sbNormalizeState,sbDefaultCollapsed,sbSectionKey};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('sidebar collapse state is sanitized to booleans',()=>{
  assert.deepEqual(api.sbNormalizeState({a:true,b:false,c:'true',d:1}),{a:true,b:false});
  assert.deepEqual(api.sbNormalizeState(null),{});
  assert.deepEqual(api.sbNormalizeState([]),{});
});

test('case management defaults collapsed while other cards default expanded',()=>{
  assert.equal(api.sbDefaultCollapsed('case-comparison'),true);
  for(const key of ['load-data','figure','figure-element-editor','selected-curve','phase-change'])assert.equal(api.sbDefaultCollapsed(key),false);
});

test('stable section keys do not depend on translated visible text',()=>{
  const fake=(selectorMap,id='')=>({id,querySelector:(q)=>selectorMap[q]||null});
  assert.equal(api.sbSectionKey(fake({'#caseManagerTitle':{}}),0),'case-comparison');
  assert.equal(api.sbSectionKey(fake({'#countBadge':{}}),0),'load-data');
  assert.equal(api.sbSectionKey(fake({},'elementEditorCard'),0),'figure-element-editor');
  assert.equal(api.sbSectionKey(fake({'#thesisFigureBtn':{}}),0),'figure');
  assert.equal(api.sbSectionKey(fake({'#selBadge':{}}),0),'selected-curve');
  assert.equal(api.sbSectionKey(fake({'#tliq':{}}),0),'phase-change');
});

test('sidebar product wiring preserves header and persists per-section state',()=>{
  for(const token of [
    "foamlens.sidebar.sections.v1",
    "sidebar.children",
    "flSidebarSectionCollapsed",
    "aria-expanded",
    "localStorage.setItem",
    "localStorage.getItem",
    "sidebar.appendChild(manager)",
    "caseManagerTitle",
    "document.addEventListener('foamlens-language-change'"
  ])assert(source.includes(token),'Missing sidebar wiring token: '+token);
  assert(source.includes(".sidebar > .card.flSidebarSectionCollapsed > :not(.cardhead){display:none!important}"));
});

test('global sidebar toggle stays clear of the scrollbar and resize rail',()=>{
  assert(indexSource.includes('.sidebarToggle{position:absolute;z-index:360;top:18px;left:calc(var(--sidebar-w) - 52px);width:34px;height:34px'));
  assert(indexSource.includes('.brand{display:flex;gap:12px;align-items:center;margin-bottom:16px;padding-right:44px}'));
  assert(!indexSource.includes('left:calc(var(--sidebar-w) - 17px)'),'Global sidebar toggle regressed onto the scrollbar/divider.');
  assert(indexSource.includes('.app.sidebarCollapsed .sidebarToggle{position:fixed;left:10px;top:50%'),'Collapsed-sidebar reopen control is no longer reachable.');
});

test('sidebar sections are scoped to the active workflow instead of leaking across tabs',()=>{
  for(const token of [
    "if(card.querySelector?.('#referenceLinesTitle'))return 'reference-lines'",
    'function sbSectionVisible',
    "if(mode==='analysis')return !['load-data','case-comparison','figure','figure-element-editor','selected-curve','phase-change','reference-lines'].includes(key)",
    "if(view==='catalog')return false",
    "if(key==='phase-change'||key==='reference-lines')return view==='timeseries'||view==='profile'",
    'flSidebarContextHidden',
    'sbApplyContext',
    'sbPatchNavigation'
  ])assert(source.includes(token),'Missing contextual sidebar token: '+token);
});

console.log('FoamLens collapsible sidebar regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
