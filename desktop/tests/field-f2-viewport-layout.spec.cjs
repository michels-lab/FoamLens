'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const moduleSrc=fs.readFileSync(path.join(base,'v24-field-f2-viewport-layout.js'),'utf8');
const existing=fs.readFileSync(path.join(base,'v14-z-field-compare.js'),'utf8');
const workspace=fs.readFileSync(path.join(base,'v14-zz-field-workspace.js'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
new Function(moduleSrc);
const start=moduleSrc.indexOf('/* FOAMLENS_F2_LAYOUT_CORE_START */');
const end=moduleSrc.indexOf('/* FOAMLENS_F2_LAYOUT_CORE_END */',start);
assert(start>=0&&end>start,'Core must be tested without browser globals');
const f=new Function(moduleSrc.slice(start,end)+
 ';return {h:pvHeight,max:pvMaxHeight,rect:pvRect,overlap:pvOverlap,within:pvWithin,buffer:pvBuffer,check:pvClassify,views:pvViews}')();
assert.strictEqual(f.views.fvViewport,'A');assert.strictEqual(f.views.fcViewport,'B');
assert.strictEqual(f.views.fcExtra3Viewport,'C');assert.strictEqual(f.views.fcExtra4Viewport,'D');
assert.strictEqual(f.views.fcDifferenceViewport,'Δ');
assert.equal(f.h(300,800),340);
assert.equal(f.h(5000,900),738);
assert.equal(f.h(810,900),738);
assert.equal(f.h(780,1300),780);
assert.equal(f.h('bad',900),460);
assert.equal(f.h(600,600),492,'High DPI windows with fewer CSS pixels cap height');
assert.equal(f.max(4000),1050);
assert.equal(f.max(500),410);
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
assert.equal(f.overlap(rect(0,0,60,40),rect(30,20,60,40)),600);
assert.equal(f.overlap(rect(0,0,60,40),rect(100,100,50,50)),0);
assert.equal(f.within(rect(0,0,500,400),rect(3,3,450,300)),true);
assert.equal(f.within(rect(0,0,500,400),rect(-20,3,450,300)),false);
const empty={scene:rect(0,0,700,460),canvas:rect(0,0,700,460),
  overlays:[],buffer:f.buffer(700,460,1.25,875,575)};
assert.equal(empty.buffer.matches,true);
assert.equal(f.check(empty).state,'no-observed-conflict');
assert.equal(f.check({...empty,buffer:f.buffer(700,460,2,1400,920)}).state,'no-observed-conflict');
assert.equal(f.check({...empty,buffer:f.buffer(700,460,2,1500,920)}).state,'review');
assert(f.check({...empty,canvas:rect(0,0,900,460)}).issues.some(x=>x.type==='canvas-clipped'));
assert.equal(f.check({scene:rect(0,0,0,0),canvas:null}).state,'unmeasured');
const badge={name:'badge',rect:rect(12,12,90,27),scrollWidth:90,clientWidth:90};
const cotas={name:'dimension-cotas',rect:rect(12,50,220,70),scrollWidth:200,clientWidth:220};
const scale={name:'material-legend',rect:rect(490,220,180,200),scrollWidth:175,clientWidth:180};
const noCollision=f.check({...empty,overlays:[badge,cotas,scale]});
assert.equal(noCollision.state,'no-observed-conflict');
assert.equal(f.check({...empty,overlays:[badge,{...cotas,rect:rect(12,25,180,70)}]}).state,'layout-conflict');
assert(f.check({...empty,overlays:[badge,{...cotas,rect:rect(12,25,180,70)}]})
 .issues.some(x=>x.type==='overlapping-overlays'));
assert(f.check({...empty,overlays:[{...scale,rect:rect(610,220,180,200)}]}).issues.some(x=>x.type==='overlay-clipped'));
assert(f.check({...empty,overlays:[{...cotas,scrollWidth:250,clientWidth:200}]}).issues.some(x=>x.type==='text-clipped-horizontal'));
assert(f.check({...empty,overlays:[{...cotas,scrollHeight:96,clientHeight:70}]}).issues.some(x=>x.type==='text-clipped-vertical'));
for(const dpr of [1,1.25,1.5,1.75,2]){
  for(const width of [1024,1280,1920]){
    const css=width/dpr,actual=Math.round(css*Math.min(2,dpr));
    assert(f.buffer(css,500,dpr,actual,Math.round(500*dpr)).matches,
      'DPR uses real CSS width, not physical window pixels');
  }
}
for(const token of ["fcViewGrid","fcViewportScene","fcViewToolbar","id='pvAuditPanel'",
 "data-pv-control","pvGrip","role','separator'","aria-orientation','horizontal'",
 "window.addEventListener('resize'","pvResetFocus()","fcScheduleLayoutRender",
 "new ResizeObserver(","new MutationObserver(","data:","pvHeight","pvAuditPanel",
 "devicePixelRatio","capturedUtc","canvasPhysicalPx","visualViewportScale",
 "foamlens.field.f2.viewheights.v1","window.FoamLensF2Layout"]){
 if(token==='data:')continue;
 assert(moduleSrc.includes(token),'Missing actual Field layout contract '+token)
}
for(const name of ['fcComposedViewport','fcViewToolbar','fcViewGrid','fcScheduleLayoutRender']){
 assert(existing.includes(name),'Source Field multi-view should retain '+name)
}
assert(workspace.includes('foamlens.fieldWorkspace.ux.v2'),'Split layout persistence must remain separate');
for(const name of ['Directory.GetFiles(AppRoot, "v*-*.js")','File.ReadAllText(path, Encoding.UTF8)'])
 assert(native.includes(name),'Native WebView2 must package the versioned independent extension '+name);
assert(!moduleSrc.includes('fetch(')&&!moduleSrc.includes('XMLHttpRequest'),'Viewport evidence must not upload data');
assert(!moduleSrc.includes('cases.push(')&&!moduleSrc.includes('series.push('),'Viewport module must not mutate original OpenFOAM data');
assert(!moduleSrc.includes('fcState.camera=')&&!moduleSrc.includes('fvState.camera='),
 'The camera must remain owned by existing Field controls');
console.log('Granada #149 PASS: independent A–D heights/focus, 1024/1280/1920 CSS/DPR math, overlap/clipping, existing renderers and native packaging contracts.');
