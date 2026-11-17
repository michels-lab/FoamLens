'use strict';
// Granada CAD F3/F4: execute the original native CAD inventory, tree controls
// and original named-triSurface ZIP exporter; do not mock visibility logic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
  'frontend','v24-cad-surface-inspector.js'),'utf8');
new Function(source);
const section=(begin,end)=>{
  const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
  assert(a>=0&&b>a,'Missing original CAD source: '+begin);
  return source.slice(a,b)
};
const core=new Function(section('/* FOAMLENS_CAD_CORE_START */',
  '/* FOAMLENS_CAD_CORE_END */')+
  ';return {snapshot:cgVisibilitySnapshot,restore:cgVisibilityRestore,'+
  'all:cgSetPartsVisibility,part:cgSetPartVisibility,isolate:cgIsolatePart,'+
  'totals:cgVisiblePartTotals,batch:cgVisibleRegionBatch,'+
  'summary:cgSummary,unit:cgUnitScale,pack:cgStoreZip,parse:cgParseStl}')();
const tri=(part,x=0)=>({part,vertices:[[x,0,0],[x+1,0,0],[x,1,0]]});
const model=(name,labels,unit)=> {
  const triangles=labels.map((name,i)=>tri(name,i*3)),
    summary=core.summary(triangles);
  return {name,format:'obj-surface',bytes:42,triangles,summary,
    partSummaries:new Map(labels.map(p=>[p,core.summary(triangles.filter(t=>t.part===p))])),
    partsVisible:new Map(labels.map(p=>[p,true])),
    warnings:[],unit,visible:true}
};
const metal=model('Motor & molde <A>',['metal','wall'],'mm');
const sand=model('Molde C3',['mold','wall'],'cm');
const models=[metal,sand];
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:2,visibleParts:4});
const before=core.snapshot(models);
assert.equal(core.all(models,false),4);
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:0,visibleParts:0});
assert.throws(()=>core.batch(models),/Select at least one visible/);
core.restore(models,before);
assert.equal(core.all(models,false,0),2);
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:1,visibleParts:2});
assert.equal(core.all(models,true,0),2);
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:2,visibleParts:4});
assert.equal(core.part(models,0,'wall',false),true);
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:2,visibleParts:3});
assert.throws(()=>core.part(models,0,'invented',true),/Unknown original CAD part/);
assert.throws(()=>core.all(models,true,2),/scope/);
assert.throws(()=>core.isolate(models,-1,'wall'),/Unknown CAD part/);
const preIsolation=core.snapshot(models);
const isolated=core.isolate(models,1,'mold');
assert.equal(core.totals(models).visibleParts,1);
assert.equal(sand.visible,true);
assert.equal(metal.visible,false);
assert.deepEqual([...sand.partsVisible], [['mold',true],['wall',false]]);
assert.equal(core.batch(models).manifest.regionCount,1);
assert.equal(core.batch(models).manifest.regions[0].part,'mold');
assert.equal(core.batch(models).manifest.regions[0].sourceUnitConfirmedByUser,'cm');
core.restore(models,isolated);
assert.deepEqual(core.totals(models),{models:2,parts:4,visibleModels:2,visibleParts:3});
assert.deepEqual([...metal.partsVisible],[['metal',true],['wall',false]]);
assert.equal(core.batch(models).manifest.regionCount,3,'Restored visibility includes exactly the selected original regions');
const stale=core.snapshot(models);
const fake=model('New geometry',['other'],'m');
models.push(fake);
const untouched=core.snapshot(models);
assert.throws(()=>core.restore(models,stale),/assembly changed/);
assert.deepEqual(core.totals(models),{models:3,parts:5,visibleModels:3,visibleParts:4},
  'Failed original inventory restore must never partially change visibility');
models.pop();
const broken=core.snapshot(models);
broken[1].parts.set('invented',true);broken[1].parts.delete('mold');
assert.throws(()=>core.restore(models,broken),/parts changed/);
core.restore(models,preIsolation);

// Test actual original CAD tree UI and its native event handlers by invoking
// the production render + selection functions against a minimal DOM surface.
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#39;',"'")
  .replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const status={textContent:''};let draws=0;
const controls=new Map();
const simple=(key,props={})=>{const value={...props};controls.set(key,value);return value};
const inventory={
  _html:'',nodes:{},textContent:'',
  set innerHTML(v){
    this._html=v;this.nodes={};
    for(const kind of ['cg-tree','cg-show','cg-part','cg-model-show','cg-model-hide',
      'cg-focus','cg-isolate','cg-unit']){
      const re=new RegExp('<[^>]*data-'+kind+'="([^"]*)"[^>]*>','g');
      this.nodes[kind]=[...v.matchAll(re)].map(match=>{
        const value=decode(match[1]),element={dataset:{},listeners:{},
          addEventListener(event,fn){this.listeners[event]=fn},
          dispatch(event,newChecked){
            if(typeof newChecked==='boolean')this.checked=newChecked;
            assert(this.listeners[event],'Original CAD binding missing '+kind+' '+event);
            this.listeners[event]()
          }};
        const prop=kind.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
        element.dataset[prop]=value;
        element.checked=/\schecked(?:\s|>)/.test(match[0]);
        element.open=/\sopen(?:\s|>)/.test(match[0]);
        return element
      })
    }
  },
  get innerHTML(){return this._html},
  querySelectorAll(selector){
    const kind=selector.slice('[data-'.length,-1);
    return this.nodes[kind]||[]
  },
  get(kind,key){
    return (this.nodes[kind]||[]).find(n=>Object.values(n.dataset).includes(key))
  }
};
const partPicker={
  _markup:'',_value:'',options:[],
  get value(){return this._value},
  set value(v){this._value=String(v)},
  get innerHTML(){return this._markup},
  set innerHTML(v){
    this._markup=v;
    this.options=[...v.matchAll(/<option value="([^"]*)"/g)].map(m=>({value:decode(m[1])}));
    this._value=this.options[0]?.value||''
  }
};
const nodes={
  cgInventory:inventory,cgStatus:status,cgPart:partPicker,
  cgExportStl:{disabled:false},cgExportBatch:{disabled:false,title:''},
  cgUnitWarning:{textContent:''},cgVisibleCount:{textContent:''},
  cgRestoreVisibility:{disabled:true},cgPartsShowAll:{disabled:true},
  cgPartsHideAll:{disabled:true}
};
const document={getElementById:id=>nodes[id]||null};
const cgUi=en=>en,cgEscape=v=>String(v??'').replace(/[&<>"']/g,c=>(
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const funcs=section('let cgModels=[]','function cgDownload(')+
  section('function cgRenderInventory(){','function cgPrepareSurface(');
const original=new Function('document','cgVisiblePartTotals','cgVisibilityRestore',
  'cgSetPartsVisibility','cgSetPartVisibility','cgIsolatePart','cgUnitScale',
  'cgUi','cgEscape','cgShow','cgDraw','cgRefreshNativeCheck','cgModelsInitial',
  funcs+
  ';cgModels.push(...cgModelsInitial);return {render:cgRenderInventory,'+
  'selection:cgChangePartSelection,focus:cgFocusNamedPart,'+
  'isolate:cgIsolateNamedPart,models:cgModels,open:cgTreeOpen,'+
  'selected:()=>cgPreIsolationVisibility,refresh:cgRefreshExport}')(
    document,core.totals,core.restore,core.all,core.part,core.isolate,core.unit,
    cgUi,cgEscape,msg=>{status.textContent=String(msg)},
    ()=>{draws++},()=>{},models);
original.render();
assert(inventory.innerHTML.includes('<details class="cgItem cgModelTree"'),
  'CAD inventory must be an expandable model→named parts tree');
assert(inventory.innerHTML.includes('Motor &amp; molde &lt;A&gt;'),
  'Imported CAD names must be escaped before entering DOM');
assert(!inventory.innerHTML.includes('<strong>Motor & molde <A>'));
assert.equal(inventory.nodes['cg-tree'].length,2);
assert.equal(inventory.nodes['cg-part'].length,4);
assert.equal(inventory.nodes['cg-focus'].length,4);
assert.equal(inventory.nodes['cg-isolate'].length,4);
assert.equal(inventory.nodes['cg-model-show'].length,2);
assert.equal(nodes.cgVisibleCount.textContent.includes('3 / 4 visible parts'),true);
const selectedModel=inventory.get('cg-tree','0');
selectedModel.open=false;selectedModel.dispatch('toggle');
original.render();
assert.equal(inventory.get('cg-tree','0').open,false,
  'Expanded/collapsed model tree state persists across render and visibility changes');
assert.equal(inventory.get('cg-tree','1').open,true);
const isolate=inventory.get('cg-isolate','1|wall');
assert(isolate,'Part isolation must target both model identity and original named part');
isolate.dispatch('click');
assert.equal(core.totals(models).visibleParts,1);
assert.equal(nodes.cgRestoreVisibility.disabled,false);
assert.equal(partPicker.value,'1|wall');
assert.equal(nodes.cgExportBatch.disabled,false);
assert.equal(nodes.cgExportStl.disabled,false);
assert.equal(core.batch(models).manifest.regions[0].part,'wall');
assert.equal(core.batch(models).manifest.regions[0].sourceFile,'Molde C3');
assert(nodes.cgVisibleCount.textContent.includes('1 / 4'));
original.selection('restore');
assert.equal(core.totals(models).visibleParts,3);
assert.equal(nodes.cgRestoreVisibility.disabled,true);
assert.deepEqual([...metal.partsVisible],[['metal',true],['wall',false]],
  'Restore returns exact mixed pre-isolation selection, not a show-all guess');
const hideModel=inventory.get('cg-model-hide','1');hideModel.dispatch('click');
assert.equal(core.totals(models).visibleParts,1);
assert.equal(nodes.cgExportStl.disabled,true,'Hidden selected part cannot be exported as a visible region');
assert.equal(nodes.cgExportBatch.disabled,false,'Visible original metal region is still batch-exportable');
const showModel=inventory.get('cg-model-show','1');showModel.dispatch('click');
assert.equal(core.totals(models).visibleParts,3);
const focus=inventory.get('cg-focus','0|metal');focus.dispatch('click');
assert.equal(partPicker.value,'0|metal');
assert.equal(nodes.cgExportStl.disabled,false);
const isolatedMetal=inventory.get('cg-isolate','0|metal');isolatedMetal.dispatch('click');
assert.equal(core.totals(models).visibleParts,1);
// A manual part checkbox intentionally discards the old isolate snapshot.
const checkbox=inventory.get('cg-part','0|wall');checkbox.dispatch('change',true);
assert.equal(nodes.cgRestoreVisibility.disabled,true);
assert.equal(core.totals(models).visibleParts,2);
assert.throws(()=>core.batch(models.map(m=>({...m,unit:'unknown'}))),/Confirm/);
assert.equal(metal.unit,'mm');
assert.equal(sand.unit,'cm');
assert(draws>=8,'Visibility actions must redraw the actual original CAD viewport');
assert(source.includes('id="cgPartsShowAll"')&&source.includes('id="cgPartsHideAll"')&&
  source.includes('id="cgRestoreVisibility"'));
assert(source.includes("document.getElementById('cgRestoreVisibility').onclick=()=>cgChangePartSelection('restore')"));
assert(source.includes("document.getElementById('cgExportBatch').onclick=cgExportVisibleBatch"));
assert(source.includes("!cgModels[index].partsVisible.get(part)"),
  'Individual STL export cannot bypass a hidden part selection');
console.log('PASS CAD F3/G10 assembly model→part tree, named isolation/restoration, per-model/global show-hide, strict original STL/ZIP export visibility, unit and geometry invariants');
