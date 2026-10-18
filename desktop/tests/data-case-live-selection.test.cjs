'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/index.html'),'utf8');
const a=html.indexOf('let dataCompareSelectionEpoch=0;'),b=html.indexOf('function dataCompareReset(){',a);
assert(a>0&&b>a,'Live selection must execute real production source');
const source=html.slice(a,b);
function harness(mode='timeseries'){
  const counts={refreshed:0,cleared:0,reset:0,stopped:0,rendered:0,metadata:0,drawn:0,hydrated:0};
  const state={active:true,selected:new Set([1,2]),mode};
  const nodes={profileSet:{dataset:{}},profileLine:{dataset:{}},dataCompareStatus:{textContent:''}};
  let pending=0,resolveLoad=null;
  // The host permits exactly one active indexed-profile hydration operation.
  const activeHydration=new Promise(resolve=>{resolveLoad=resolve});
  const module=new Function('dataCompareState','$','stopAllPlayback','resetProfilePlaybackState',
    'clearProfilePlaybackFrameCache','dataCompareRefresh','refreshDatasetControls','renderList','updateMeta',
    'draw','lazyProfileCountForContext','hydrateLazyProfilesForContext','flUi','lazyProfileHydrationPromise',source+
    'let currentDataView='+JSON.stringify(mode)+';return {changed:dataCompareSelectionChanged,epoch:()=>dataCompareSelectionEpoch,setView:v=>currentDataView=v}')(
    state,id=>nodes[id],()=>counts.stopped++,()=>counts.reset++,()=>counts.cleared++,
    ()=>counts.refreshed++,()=>{counts.refreshed++},()=>counts.rendered++,()=>counts.metadata++,()=>counts.drawn++,
    ()=>pending,()=>{counts.hydrated++;pending=0;
      // Match the real single-flight lazyProfileHydrationPromise: two
      // checkbox changes during one IO batch await the same promise.
      return activeHydration},(en)=>en,activeHydration);
  return{counts,state,module,nodes,setPending:n=>pending=n,resolve:()=>resolveLoad?.(true)}
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve()}
(async()=>{
  const time=harness();
  time.module.changed();
  assert.equal(time.counts.drawn,1,'After checking a loaded case, redraw comparison immediately');
  assert.equal(time.counts.reset,1,'Avoid stale playback frame mixing case selections');
  assert.equal(time.counts.hydrated,0,'Time-series comparison must reuse already loaded curves');
  time.state.active=false;time.module.changed();
  assert.equal(time.counts.drawn,1,'Inactive comparison must not change single-case plot');
  const profile=harness('profile');
  profile.setPending(3);profile.module.changed();
  assert.equal(profile.counts.drawn,1);
  assert.equal(profile.counts.hydrated,1,'Selected indexed profiles must be loaded on demand');
  assert.equal(profile.nodes.profileSet.dataset.compareDefault,'1');
  profile.module.changed();
  assert.equal(profile.counts.drawn,2,'Second selection must immediately redraw current selected cases');
  profile.resolve();await flush();
  assert.equal(profile.counts.drawn,3,'Only the latest selection may repaint after asynchronous load');
  assert(profile.counts.refreshed>=3,'Dataset selectors and case list must stay current');
  assert(html.includes("dataCompareState.selected.clear();dataCompareSelectionChanged()"),
    'Clear selection must refresh plot immediately');
  assert(/dataCompareState\.selected\.add\(id\);else dataCompareState\.selected\.delete\(id\);\s*dataCompareSelectionChanged\(\)/.test(html),
    'Checkbox edits must update actual plotted data, not only the checklist');
  assert(html.includes("new Set(dataCompareAvailableCases().map(c=>c.id));dataCompareSelectionChanged()"),
    'Select all must update actual plotted data');
  assert(/function dataCompareReset\(\)\{\s*\+\+dataCompareSelectionEpoch/.test(html),
    'Reset must prevent stale indexed profile requests from repainting a new mode');
  console.log('Live loaded-case selection: direct plot update, no duplicate file import, source-index hydration and stale async cancellation PASS')
})().catch(e=>{console.error(e);process.exitCode=1});
