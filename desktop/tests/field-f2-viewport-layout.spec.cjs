'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const moduleSrc=fs.readFileSync(path.join(base,'v24-field-f2-viewport-layout.js'),'utf8');
const existing=fs.readFileSync(path.join(base,'v14-z-field-compare.js'),'utf8');
const workspace=fs.readFileSync(path.join(base,'v18-context-help-resize.js'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const trusted=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','TrustedEmbeddedFrontendExtensions.cs'),'utf8');
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
 "b.dataset.pvControl=action","pvGrip","role','separator'","aria-orientation','horizontal'",
 "window.addEventListener('resize'","pvResetFocus()","fcScheduleLayoutRender",
 "new ResizeObserver(","new MutationObserver(","data:","pvHeight","pvAuditPanel",
 "devicePixelRatio","capturedUtc","canvasPhysicalPx","visualViewportScale",
 "foamlens.field.f2.viewheights.v1","window.FoamLensF2Layout"]){
 if(token==='data:')continue;
 assert(moduleSrc.includes(token),'Missing actual Field layout contract '+token)
}
// A 1920px desktop can show 4 panes narrower than 570 CSS px each.
// CSS media queries keyed to the whole window cannot protect these controls.
const dock=existing.slice(existing.indexOf('container-name:fc-region-dock'));
assert(dock.includes('container-type:inline-size'),'Physical regions must follow EACH pane width');
assert(dock.includes('@container fc-region-dock (max-width:570px)')&&
       dock.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),
       'Two-column controls are required when A/B/C/D panes narrow');
assert(dock.includes('@container fc-region-dock (max-width:340px)')&&
       dock.includes('grid-template-columns:minmax(0,1fr)'),
       'One-column controls are required for extra narrow/high-DPI viewports');
assert(dock.includes('.fcPhysicalRegionRow select,.fcPhysicalRegionRow input{min-width:0;max-width:100%}'),
       'Native field/component selectors and opacity controls must not cause horizontal overflow');
assert(existing.includes("holder.innerHTML='<details '")&&existing.includes('data-fc-region-field')&&
       existing.includes('data-fc-region-comp')&&existing.includes('data-fc-region-opacity'),
       'Preserve original physical region field, component, opacity and visibility controls');

for(const name of ['fcComposedViewport','fcViewToolbar','fcViewGrid','fcScheduleLayoutRender']){
 assert(existing.includes(name),'Source Field multi-view should retain '+name)
}
assert(workspace.includes('foamlens.fieldWorkspace.ux.v2'),'Split layout persistence must remain separate');
assert(native.includes('TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()'),
  'The actual Windows host must load only trusted embedded frontend modules');
assert(!native.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),
  'Never reintroduce wildcard executable JS from writable user AppRoot');
assert(trusted.includes('FoamLensDesktop.AppBundle.zip')&&trusted.includes('ReadFromRunningAssembly()'),
  'Independent F2 extension must be part of the authorized embedded bundle');
assert(!moduleSrc.includes('fetch(')&&!moduleSrc.includes('XMLHttpRequest'),'Viewport evidence must not upload data');
assert(!moduleSrc.includes('cases.push(')&&!moduleSrc.includes('series.push('),'Viewport module must not mutate original OpenFOAM data');
assert(!moduleSrc.includes('fcState.camera=')&&!moduleSrc.includes('fvState.camera='),
 'The camera must remain owned by existing Field controls');
console.log('Granada #149 PASS: independent A–D heights/focus, 1024/1280/1920 CSS/DPR math, overlap/clipping, existing renderers and native packaging contracts.');


// Granada Field compact height menu: original Maximize + physical resize grip
// remain immediately accessible, while per-view +/-/Reset move to their own
// native <details> group. Exercise the real bilingual labeling function.
{
  const begin=moduleSrc.indexOf('function pvSyncSizeButtons(){');
  const end=moduleSrc.indexOf('function pvReconcileFocus(){',begin);
  assert(begin>0&&end>begin,'original size control synchronization required');
  const buttons=action=>({
    dataset:{pvControl:action},textContent:'',title:'',attributes:{},
    setAttribute(k,v){this.attributes[k]=v}
  });
  function view(id){
    const summary={textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v}};
    const menuButtons=new Map(['less','more','reset'].map(name=>[name,buttons(name)]));
    const menu={querySelector:key=>key==='summary'?summary:
      menuButtons.get(key.match?.(/data-pv-control="([^"]+)"/)?.[1])||null};
    return{id,summary,menuButtons,querySelector:key=>key==='.pvSizeMenu'?menu:null}
  }
  const children=['fvViewport','fcViewport','fcExtra3Viewport','fcExtra4Viewport'].map(view);
  let lang='en';
  const update=new Function('pvEl','pvViews','pvFocusLabel',moduleSrc.slice(begin,end)+
    ';return pvSyncSizeButtons;')(
    id=>id==='fcViewGrid'?{children}:null,
    f.views,(en,es)=>lang==='es'?es:en);
  update();
  for(const v of children){
    const letter=f.views[v.id];
    assert.equal(v.summary.textContent,'Size');
    assert.equal(v.summary.attributes['aria-label'],'View '+letter+' · Panel height');
    assert.equal(v.menuButtons.get('more').textContent,'+ Height');
    assert.equal(v.menuButtons.get('less').attributes['aria-label'],'View '+letter+' · − Height');
    assert.equal(v.menuButtons.get('reset').textContent,'Reset');
  }
  lang='es';update();
  for(const v of children){
    assert.equal(v.summary.textContent,'Tamaño');
    assert.equal(v.summary.attributes['aria-label'],'Vista '+f.views[v.id]+' · Altura del panel');
    assert.equal(v.menuButtons.get('less').textContent,'− Altura');
    assert.equal(v.menuButtons.get('more').textContent,'+ Altura');
    assert.equal(v.menuButtons.get('reset').textContent,'Restablecer');
  }
  const mountStart=moduleSrc.indexOf('function pvMountViewport(viewport){');
  const mountEnd=moduleSrc.indexOf('function pvStyles(){',mountStart);
  assert(mountStart>0&&mountEnd>mountStart);
  const mount=moduleSrc.slice(mountStart,mountEnd);
  assert(mount.includes("if(action==='focus')div.append(b);else sizeButtons.append(b)"),
    'Maximize stays visible while only height controls move to menu');
  assert(mount.includes("b.dataset.pvControl=action"),
    'native source action handlers must remain untouched');
  assert(mount.includes("size.addEventListener('keydown'"),
    'source menu must support Escape and focus restoration');
  assert(mount.includes("summary.focus()"),
    'dismissed height menu must restore focus to its visible summary');
  assert(moduleSrc.includes('#fcViewGrid .pvSizeMenu[open]{flex:1 0 100%}'),
    'expanded height controls must wrap without covering mesh');
  assert(moduleSrc.includes('scene.insertAdjacentElement(\'afterend\',grip)'),
    'original physical drag grip must remain visible');
  console.log('Granada Field compact height menu PASS: original A/B/C/D buttons, localized menu, focus and drag grip');
}


// Granada Field numeric XYZ caption classification: mesh axes remain in the
// scene while measured length readouts/legends live in a separate caption.
// Their own clipping is checked without falsely reporting mesh-overlay
// collisions or hiding the original OpenFOAM metric information.
{
  const scene=rect(0,0,320,360),canvas=rect(0,0,320,360);
  const caption=rect(0,360,320,135);
  const badge={name:'time-badge',rect:rect(12,12,80,28)};
  const cotas={name:'dimension-cotas',rect:rect(10,375,300,56),
    scrollWidth:294,clientWidth:300,scrollHeight:54,clientHeight:56};
  const legends={name:'physical-legends',rect:rect(10,438,300,42),
    scrollWidth:295,clientWidth:300,scrollHeight:41,clientHeight:42};
  const measured={scene,canvas,caption,overlays:[badge],annotations:[cotas,legends],
    buffer:f.buffer(320,360,1.5,480,540)};
  assert.equal(f.check(measured).state,'no-observed-conflict',
    'source-backed XYZ below canvas must not collide with the time badge');
  assert.deepStrictEqual(f.check(measured).issues,[]);
  const oldOverlay={name:'old-metric-floating',rect:rect(10,20,300,60)};
  assert(f.check({...measured,overlays:[badge,oldOverlay]}).issues.some(x=>
    x.type==='overlapping-overlays'),
    'actual old floating XYZ readout would obscure the time badge');
  const clipped={...measured,annotations:[{...cotas,rect:rect(10,375,410,56)}]};
  assert(f.check(clipped).issues.some(x=>
    x.type==='caption-annotation-clipped'&&x.a==='dimension-cotas'),
    'long XYZ text exceeding its actual panel must be flagged');
  const textClipped={...measured,annotations:[{...legends,scrollWidth:401,clientWidth:300}]};
  assert(f.check(textClipped).issues.some(x=>
    x.type==='caption-text-clipped-horizontal'&&x.a==='physical-legends'),
    'physical scale legends cut off by the caption must be flagged');
  const missingCaption={...measured,caption:null};
  assert.equal(f.check(missingCaption).state,'review',
    'a missing caption requires review, not fake source-backed proof');
  assert(f.check(missingCaption).issues.some(x=>x.type==='caption-unmeasured'));
  assert(moduleSrc.includes("['metric-bounds','.fcMetricBounds']"),
    'B/C/D metrics must be included in the actual runtime layout audit');
  assert(moduleSrc.includes("['material-legend','.fvRegionScaleDock']"),
    'A actual primary and physical material legends must be audited within caption');
  assert(moduleSrc.includes("['compare-legend','.fcLegend']"),
    'B/C/D original primary measured color scales must be audited within caption');
  assert(moduleSrc.includes("dock=caption?.querySelector('.fvRegionScaleDock')"),
    'the Field source audit must never classify the moved A legend as a mesh overlay');
  const compareLegend={name:'compare-legend',rect:rect(10,438,300,42),
    scrollWidth:280,clientWidth:300,scrollHeight:41,clientHeight:42};
  assert.equal(f.check({...measured,annotations:[cotas,compareLegend]}).state,'no-observed-conflict',
    'B/C/D source-backed color scale below canvas must not count as mesh obscuration');
  assert(moduleSrc.includes("['dimension-cotas','.fvMeshDimensions']"),
    'A metric readout remains audited from its existing original element');
  assert(moduleSrc.includes('annotations:annotations.map(x=>({name:x.name,rect:x.rect}))'),
    'runtime evidence must report exact observed caption annotations');
  assert(!moduleSrc.includes("['dimension-cotas','.fvMeshDimensions'],\n      ['physical-measure'"),
    'A readout must not be incorrectly counted as a canvas overlay');
  console.log('Granada Field metric caption audit PASS: narrow layout, real XYZ/legend clipping and no false canvas collisions');
}
