'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
const field=fs.readFileSync(path.join(root,'v14-field-view.js'),'utf8');
const start=source.indexOf('/* FOAMLENS_FIELD_LOOP_PLAYBACK_START */'),
  end=source.indexOf('/* FOAMLENS_FIELD_LOOP_PLAYBACK_END */',start);
assert(start>0&&end>start,'Test the actual Field playback implementation');
const real=source.slice(start,end);
async function microtasks(){for(let i=0;i<6;i++)await Promise.resolve()}
function harness({initial=2,events=[],deferred=null}={}){
  const state={playing:false,timer:null,epoch:0},queue=[],elements={
    fwTimeSlider:{value:String(initial)},
    fwTimeSpeed:{value:'4'},
    fwTimePlay:{textContent:'',title:'',attrs:{},setAttribute(k,v){this.attrs[k]=v}}
  };
  const times=[0,2.6,10];
  const api=new Function('fwTimeState','fwTimeTimes','fwTimeLoadIndex','document','fwUi','setTimeout','clearTimeout',
    real+';return {fwPlaybackNextIndex,fwTimeStop,fwTimePlay,fwTimeSetPlayLabel}')(
      state,()=>times,async i=>{
        events.push(i);if(deferred)await deferred.promise;
        elements.fwTimeSlider.value=String(i);return true
      },
      {getElementById:id=>elements[id]},(en,es)=>en,
      (fn,delay)=>{const entry={fn,delay,cancelled:false};queue.push(entry);return entry},
      entry=>{if(entry)entry.cancelled=true});
  const run=async()=>{const task=queue.shift();assert(task&&!task.cancelled,'Expected live timer');task.fn();await microtasks();return task};
  return {state,times,elements,events,queue,run,...api}
}
(async()=>{
  const h=harness();
  assert.equal(h.fwPlaybackNextIndex(2,3),0,'Final physical-time frame must restart at the first');
  assert.equal(h.fwPlaybackNextIndex(1,3),2);
  assert.equal(h.fwPlaybackNextIndex(0,1),-1,'Do not invent playback for one frame');
  assert.equal(h.fwPlaybackNextIndex(0,0),-1);
  h.fwTimePlay();await microtasks();
  assert.deepStrictEqual(h.events,[0],'Loop should restart immediately from last frame');
  assert.equal(h.state.playing,true);
  assert.equal(h.elements.fwTimePlay.attrs['aria-pressed'],'true');
  assert.match(h.elements.fwTimePlay.textContent,/Pause.*↻/);
  assert.equal(h.queue.length,1);
  assert.equal((await h.run()).delay,125,'4× speed applies to each next frame');
  assert.deepStrictEqual(h.events,[0,1]);
  h.elements.fwTimeSpeed.value='1';
  assert.equal((await h.run()).delay,125,'Previously scheduled interval remains consistent');
  assert.deepStrictEqual(h.events,[0,1,2]);
  assert.equal((await h.run()).delay,500,'Speed change applies without restarting playback');
  assert.deepStrictEqual(h.events,[0,1,2,0],'Loop continues for multiple full cycles');
  h.fwTimeStop();assert.equal(h.state.playing,false);
  assert.equal(h.elements.fwTimePlay.attrs['aria-pressed'],'false');
  assert.match(h.elements.fwTimePlay.textContent,/Play.*↻/);
  assert(!h.queue.some(t=>!t.cancelled),'Pausing must cancel the next scheduled tick');
  // Pausing during an asynchronous load must never schedule a second tick later.
  let resolve;const wait={promise:new Promise(r=>{resolve=r})};
  const delayed=harness({deferred:wait});
  delayed.fwTimePlay();assert.deepStrictEqual(delayed.events,[0]);
  delayed.fwTimeStop();resolve();await microtasks();
  assert.equal(delayed.queue.length,0,'Cancelled async playback must not resume after resolution');
  assert.equal(delayed.state.playing,false);
  assert(field.includes('next=i>=n?0:i+1'),'Legacy direct 3D timer must also loop');
  assert(source.includes('id="fwTimePlay"')&&source.includes('fwPlayControl'),
    'The visible Field toolbar must use the enlarged actual Play control');
  assert(ribbon.includes('grid-template-columns:32px 106px 32px'),'Play/Pause needs its own width');
  assert(ribbon.includes('display:inline!important')&&ribbon.includes('flRibbonCameraDirection'),
    'All seven camera directions need visible text and unambiguous X/Y/Z tooltips');
  for(const label of ['Front · +Z','Back · −Z','Left · −X','Right · +X','Top · +Y','Bottom · −Y','Isometric · XYZ'])
    assert(field.includes(label),'Missing a physical camera view label: '+label);
  assert(field.includes("b.classList.toggle('active',selected)"),'Active camera must remain highlighted');
  console.log('Field playback: repeated wrap, speeds, pause and asynchronous cancellation; readable transport and named camera buttons PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
