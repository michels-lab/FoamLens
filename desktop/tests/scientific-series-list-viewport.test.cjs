'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const start=html.indexOf('const flSeriesListLimits=new Map();');
const end=html.indexOf('function active(){',start);
assert(start>0&&end>start,'Actual series DOM pagination source missing');
const fragment=html.slice(start,end);
const total=3008;
const curves=Array.from({length:total},(_,i)=>({
  id:i+1,caseId:i<2500?1:2,caseName:i<2500?'Metal':'Mold',
  field:{canonical:'T',original:'T',unit:'K',display:'Temperature'},
  probe:i,visible:true,color:'#123456',fileName:'probe-'+i+'.dat',
  datasetType:'timeseries',t:[0,1],y:[1,2],
  derivedKind:null
}));
const allCurves=curves.slice();
const caseNames={1:'Metal',2:'Mold'};
let activeView='timeseries';
const rendered=[],footers=[],dom={};
function fakeElement(tag){
  const obj={tagName:tag.toUpperCase(),className:'',html:'',children:[],handlers:{},onclick:null,
    appendChild(child){this.children.push(child);},
    querySelector(key){
      if(!this.handlers[key])this.handlers[key]={onclick:null,addEventListener(){}};
      return this.handlers[key]
    }};
  Object.defineProperty(obj,'innerHTML',{get(){return this.html},set(v){this.html=v;this.children.length=0}});
  return obj
}
dom.seriesList=fakeElement('div');
const mock={
  Map,Math,
  document:{createElement:tag=>fakeElement(tag)},
  $:id=>dom[id],
  get currentDataView(){return activeView;},
  currentViewSeries:()=>allCurves,
  flUi:(en)=>en,esc:String,tr:s=>s,labelFor:s=>s.field.canonical,
  localizedFieldName:f=>f.display,
  datasetTypeOf:s=>s.datasetType,caseById:id=>({name:caseNames[id]}),
  isCaseVisible:()=>true,
  activeId:null,loadStyle(){},draw(){},updateMeta(){}
};
vm.createContext(mock);
vm.runInContext(fragment+';globalThis.renderLive=renderList;globalThis.listCaps=flSeriesListLimits',mock,{timeout:1000});
function count(){
  return dom.seriesList.children.filter(x=>x.className.startsWith('series')&&x.className!=='seriesGroupHeader'&&x.className!=='seriesListPager').length
}
function footer(){return dom.seriesList.children.find(x=>x.className==='seriesListPager')}
function groups(){return dom.seriesList.children.filter(x=>x.className==='seriesGroupHeader')}
mock.renderLive();
assert.strictEqual(count(),120,'The initial DOM may not render 3,008 curves on opening');
assert.strictEqual(groups().length,1,'Only the group with visible rows should be shown initially');
assert.strictEqual(groups()[0].innerHTML.includes('2500 curves'),true,'Group must report full series provenance');
assert(footer(),'User needs explicit access to remaining curves');
assert(footer().innerHTML.includes('120 / 3,008'),'Visible/full curve counts must remain honest');
footer().querySelector('[data-role="series-next"]').onclick();
assert.strictEqual(count(),270,'Load more must reveal exactly next 150 scientific curves');
assert.strictEqual(groups().length,1,'First 270 curves remain in the first physical case');
const afterMore=footer();
afterMore.querySelector('[data-role="series-all"]').onclick();
assert.strictEqual(count(),3008,'Show all must allow access to all scientific series');
assert.strictEqual(groups().length,2,'All physical cases must remain distinguishable');
assert(!footer(),'Pager disappears when every curve is visible');
const raw=allCurves.reduce((sum,c)=>sum+c.y[0],0);
assert.strictEqual(raw,3008,'Virtualising row display must never alter original scientific data');
assert.strictEqual(allCurves.length,3008,'No scientific curve may be discarded');
activeView='profile';
allCurves.forEach(c=>{c.datasetType='profile';c.profileAxis='x';c.profileTime=0;c.profileLine='x=0';c.profileCoordUnit='mm'});
mock.profileOrientationLabel=()=> 'x';
mock.trimZeros=String;
mock.renderLive();
assert.strictEqual(count(),120,'Another scientific view must start with a separate bounded list');
assert(footer(),'Spatial Profiles must retain explicit access to all rows');
console.log('FoamLens 2D curve list viewport PASS: 3,008 untouched raw series, 120 initial DOM rows, 150-row increments, all-row opt in and distinct physical groups.');
