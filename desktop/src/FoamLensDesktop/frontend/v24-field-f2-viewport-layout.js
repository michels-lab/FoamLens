/* Granada #149: Field viewport heights, transient focus, DOM/DPI evidence.
 * Existing Field renderer, cameras, data and Split drag controller unchanged. */
/* FOAMLENS_F2_LAYOUT_CORE_START */
const pvViews={fvViewport:'A',fcViewport:'B',fcExtra3Viewport:'C',fcExtra4Viewport:'D',fcDifferenceViewport:'Δ'};
const pvKey='foamlens.field.f2.viewheights.v1';
const pvDeckKey='foamlens.field.comparison.deck.v1';
const pvDeckModes=['auto','two','row'];
function pvDeckColumns(mode,count,width){
  if(!Number.isFinite(count)||count<1)return 1;
  if(width<700)return 1;
  if(mode==='two')return Math.min(count,2);
  if(mode==='row')return Math.min(count,Math.max(2,Math.floor(width/310)));
  return count>=4&&width>=1320?4:count>=3&&width>=1040?3:Math.min(count,2)
}
function pvNumber(n){return typeof n==='number'&&Number.isFinite(n)?n:typeof n==='string'&&n.trim()&&Number.isFinite(Number(n))?Number(n):NaN}
function pvMaxHeight(vh){return Number.isFinite(pvNumber(vh))&&vh>0?Math.max(340,Math.min(1050,Math.floor(vh*82/100+1e-9))):800}
function pvHeight(value,vh){const n=pvNumber(value);return Number.isFinite(n)?Math.round(Math.max(340,Math.min(pvMaxHeight(vh),n))):460}
function pvRect(r){
  if(!r)return null;
  const out={};for(const k of ['left','right','top','bottom','width','height']){
    out[k]=pvNumber(r[k]);if(!Number.isFinite(out[k]))return null
  }
  return out.width>=0&&out.height>=0&&out.right>=out.left&&out.bottom>=out.top?out:null
}
function pvOverlap(a,b){
  a=pvRect(a);b=pvRect(b);if(!a||!b)return 0;
  return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))
}
function pvWithin(a,b,tol=3){
  a=pvRect(a);b=pvRect(b);return!!(a&&b&&b.left>=a.left-tol&&b.right<=a.right+tol&&
    b.top>=a.top-tol&&b.bottom<=a.bottom+tol)
}
function pvBuffer(w,h,dpr,bw,bh){
  if(![w,h,dpr,bw,bh].every(Number.isFinite)||w<=0||h<=0||dpr<=0)return null;
  const expected={width:Math.round(w*Math.min(dpr,2)),height:Math.round(h*Math.min(dpr,2))};
  return{expected,actual:{width:bw,height:bh},
    matches:Math.abs(bw-expected.width)<=4&&Math.abs(bh-expected.height)<=4}
}
function pvClassify(sample){
  const scene=pvRect(sample.scene),canvas=pvRect(sample.canvas),issues=[];
  if(!scene||scene.width<120||scene.height<120)return{state:'unmeasured',issues:[{type:'scene-not-rendered'}]};
  if(!canvas)issues.push({type:'canvas-unmeasured',severity:'warning'});
  else if(!pvWithin(scene,canvas,4))issues.push({type:'canvas-clipped',severity:'error'});
  // Scene overlays may obscure the actual mesh. Caption annotations are
  // intentionally OUTSIDE that scene, but must still remain within their
  // own measured caption (no cut-off XYZ values in 4-way layouts).
  const caption=pvRect(sample.caption),annotations=(sample.annotations||[])
    .filter(x=>pvRect(x.rect));
  for(const a of annotations){
    if(!caption)issues.push({type:'caption-unmeasured',severity:'warning',a:a.name});
    else if(!pvWithin(caption,a.rect,4))
      issues.push({type:'caption-annotation-clipped',severity:'error',a:a.name});
    if(a.scrollWidth!=null&&a.clientWidth!=null&&a.scrollWidth>a.clientWidth+3)
      issues.push({type:'caption-text-clipped-horizontal',severity:'warning',a:a.name});
    if(a.scrollHeight!=null&&a.clientHeight!=null&&a.scrollHeight>a.clientHeight+3)
      issues.push({type:'caption-text-clipped-vertical',severity:'warning',a:a.name});
  }
  const overlays=(sample.overlays||[]).filter(x=>pvRect(x.rect));
  for(let i=0;i<overlays.length;i++){
    const a=overlays[i];
    if(!pvWithin(scene,a.rect))issues.push({type:'overlay-clipped',severity:'error',a:a.name});
    if(a.scrollWidth!=null&&a.clientWidth!=null&&a.scrollWidth>a.clientWidth+3)
      issues.push({type:'text-clipped-horizontal',severity:'warning',a:a.name});
    if(a.scrollHeight!=null&&a.clientHeight!=null&&a.scrollHeight>a.clientHeight+3)
      issues.push({type:'text-clipped-vertical',severity:'warning',a:a.name});
    for(let j=i+1;j<overlays.length;j++){
      const overlap=pvOverlap(a.rect,overlays[j].rect);
      if(overlap>36)issues.push({type:'overlapping-overlays',severity:'error',a:a.name,b:overlays[j].name,areaCssPx2:Math.round(overlap)})
    }
  }
  if(sample.buffer&&!sample.buffer.matches)
    issues.push({type:'transient-canvas-buffer-size',severity:'warning',
      expected:sample.buffer.expected,actual:sample.buffer.actual});
  return{state:issues.some(x=>x.severity==='error')?'layout-conflict':issues.length?'review':'no-observed-conflict',issues}
}
// Audit the measured A/B/C/D GRID, not only independent caption overlays.
// Four sources across on a wide panel is an explicit usability requirement;
// a two-row layout at that width is a measurable regression.
function pvGridRowAudit(grid,items,panelWidth,deckMode='auto'){
  const rect=pvRect(grid),active=(items||[]).filter(x=>
    ['fvViewport','fcViewport','fcExtra3Viewport','fcExtra4Viewport'].includes(x.id)&&
    pvRect(x.rect)).map(x=>({id:x.id,rect:pvRect(x.rect)}));
  if(!rect||rect.width<120)return{state:'unmeasured',expectedColumns:0,
    visibleCount:active.length,rows:0,issues:[{type:'grid-not-rendered'}]};
  // CSS container queries measure the enclosing Field PANEL, not the grid
  // after its padding/borders. The audit must use the same breakpoint basis.
  const n=active.length,width=Number.isFinite(pvNumber(panelWidth))&&panelWidth>0?
    Number(panelWidth):rect.width;
  const expectedColumns=pvDeckColumns(deckMode,n,width);
  const tops=[];
  for(const entry of active){
    const top=entry.rect.top;
    if(!tops.some(value=>Math.abs(value-top)<=5))tops.push(top)
  }
  const rows=tops.length,issues=[];
  for(const item of active)if(item.rect.left<rect.left-4||item.rect.right>rect.right+4)
    issues.push({type:'viewport-overflows-grid',severity:'error',view:item.id});
  if(n&&rows>Math.ceil(n/Math.max(1,expectedColumns)))
    issues.push({type:n===4&&expectedColumns===4?'wide-quad-wrapped':'unexpected-extra-grid-row',
      severity:'error',expectedColumns,rows});
  return{state:issues.length?'layout-conflict':'no-observed-conflict',
    expectedColumns,visibleCount:n,rows,issues}
}
/* FOAMLENS_F2_LAYOUT_CORE_END */
function pvEl(id){return document.getElementById(id)}
let pvHeights={},pvFocus=null,pvFrame=0,pvObserver=null,pvObservedGrid=null,pvEscapeGrid=null,pvLast=null;
let pvDeckMode='auto',pvDeckHeight='individual',pvDeckRO=null,pvDeckPanel=null;
function pvSave(){try{localStorage.setItem(pvKey,JSON.stringify({schema:1,heights:pvHeights}))}catch{}}
function pvLoad(){
  try{const x=JSON.parse(localStorage.getItem(pvKey)||'{}');
    if(x?.schema!==1||!x.heights)return{};
    return Object.fromEntries(Object.keys(pvViews).filter(k=>Number.isFinite(pvNumber(x.heights[k]))).map(k=>[k,pvHeight(x.heights[k],window.innerHeight)]))
  }catch{return{}}
}
function pvRedraw(){
  if(pvFrame)return;
  pvFrame=requestAnimationFrame(()=>{pvFrame=0;
    try{if(typeof fcScheduleLayoutRender==='function')fcScheduleLayoutRender();else if(typeof fvRender==='function')fvRender()}catch{}
  })
}
function pvSetHeight(viewport,height,persist=true){
  if(!viewport||!pvViews[viewport.id])return null;
  const value=pvHeight(height,window.innerHeight);
  viewport.style.setProperty('--pvHeight',value+'px');
  if(persist){pvHeights[viewport.id]=value;pvSave()}
  pvRedraw();return value
}
function pvFocusLabel(en,es){
  try{return typeof flUi==='function'?flUi(en,es):
    (document.getElementById('language')?.value==='es'?es:en)}catch{return en}
}
function pvSyncFocusButtons(){
  const grid=pvEl('fcViewGrid');if(!grid)return;
  for(const view of grid.children){
    if(!pvViews[view.id])continue;
    const btn=view.querySelector?.('[data-pv-control="focus"]');
    if(!btn)continue;
    const focused=view.id===pvFocus;
    const label=focused?pvFocusLabel('Restore','Restaurar'):pvFocusLabel('Maximize','Maximizar');
    const prefix=pvFocusLabel('View','Vista')+' '+pvViews[view.id]+' · ';
    btn.setAttribute('aria-pressed',focused?'true':'false');
    btn.setAttribute('aria-label',prefix+label);
    btn.title=prefix+label;
    // A watched subtree must not self-trigger an endless MutationObserver loop.
    if(btn.textContent!==label)btn.textContent=label;
  }
  pvSyncSizeButtons();
}
// Compact height commands do not duplicate source-native resize handlers:
 // each view retains its own height state and the original drag grip.
function pvSyncSizeButtons(){
  const grid=pvEl('fcViewGrid');if(!grid)return;
  for(const view of grid.children){
    const menu=view.querySelector?.('.pvSizeMenu');
    if(!menu||!pvViews[view.id])continue;
    const prefix=pvFocusLabel('View','Vista')+' '+pvViews[view.id]+' · ';
    const summary=menu.querySelector('summary');
    const title=pvFocusLabel('Size','Tamaño');
    if(summary){
      if(summary.textContent!==title)summary.textContent=title;
      summary.setAttribute('aria-label',prefix+pvFocusLabel('Panel height','Altura del panel'))
    }
    for(const [action,en,es] of [
      ['less','− Height','− Altura'],['more','+ Height','+ Altura'],
      ['reset','Reset','Restablecer']]){
      const button=menu.querySelector('[data-pv-control="'+action+'"]');
      if(!button)continue;
      const label=pvFocusLabel(en,es);
      if(button.textContent!==label)button.textContent=label;
      button.title=prefix+label;
      button.setAttribute('aria-label',prefix+label)
    }
  }
}
function pvReconcileFocus(){
  if(!pvFocus)return false;
  const grid=pvEl('fcViewGrid'),view=pvEl(pvFocus);
  if(!grid||!view||view.parentElement!==grid||view.classList.contains('hidden')||
    view.getBoundingClientRect().width<=0){
    pvResetFocus();return true
  }
  return false
}
function pvFocusViewport(viewport){
  if(!viewport||!pvViews[viewport.id]||viewport.classList.contains('hidden'))return false;
  const grid=pvEl('fcViewGrid');if(!grid||viewport.parentElement!==grid)return false;
  pvFocus=pvFocus===viewport.id?null:viewport.id;
  grid.classList.toggle('pvFocus',!!pvFocus);
  for(const el of grid.children)if(pvViews[el.id]){
    el.classList.toggle('pvFocusTarget',el.id===pvFocus);
  }
  pvSyncFocusButtons();pvApplyDeck();
  pvRedraw();return true
}
function pvResetFocus(){
  pvFocus=null;const grid=pvEl('fcViewGrid');
  grid?.classList.remove('pvFocus');
  if(grid)for(const child of grid.children)child.classList.remove('pvFocusTarget');
  pvSyncFocusButtons();pvApplyDeck();
  pvRedraw()
}
function pvSampleOverlay(scene,query,name){
  const node=scene?.querySelector(query);if(!node||node.classList.contains('hidden'))return null;
  const r=node.getBoundingClientRect(),style=window.getComputedStyle?.(node);
  if(r.width<=0||r.height<=0||style?.display==='none'||style?.visibility==='hidden')return null;
  return{name,rect:pvRect(r),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,
    scrollHeight:node.scrollHeight,clientHeight:node.clientHeight}
}
function pvMeasure(viewport){
  const scene=viewport.querySelector('.fcViewportScene'),
    caption=viewport.querySelector('.fcViewportCaption'),
    canvas=scene?.querySelector('canvas'),
    r=canvas?.getBoundingClientRect(),dpr=Number(window.devicePixelRatio)||1,
    pieces=[['time-badge','.fcTimeBadge'],
      ['physical-measure','.fvMeasureInfo'],['axis-gizmo','.fvAxisGizmo']],
    captionPieces=[['dimension-cotas','.fvMeshDimensions'],
      ['metric-bounds','.fcMetricBounds'],['field-legend','.fvLegend'],
      ['compare-legend','.fcLegend'],['material-legend','.fvRegionScaleDock'],
      ['physical-legends','.fcPhysicalLegends']];
  const dock=caption?.querySelector('.fvRegionScaleDock');
  const overlays=pieces.map(([label,sel])=>pvSampleOverlay(scene,sel,label)).filter(Boolean);
  const annotations=captionPieces.filter(([label])=>label!=='field-legend'||
    !dock?.contains(caption?.querySelector('.fvLegend')))
    .map(([label,sel])=>pvSampleOverlay(caption,sel,label)).filter(Boolean);
  const snapshot={scene:pvRect(scene?.getBoundingClientRect()),canvas:pvRect(r),
    caption:pvRect(caption?.getBoundingClientRect()),overlays,annotations,
    buffer:r?pvBuffer(r.width,r.height,dpr,canvas.width,canvas.height):null};
  return{id:viewport.id,view:pvViews[viewport.id],
    sceneCssPx:snapshot.scene?{width:snapshot.scene.width,height:snapshot.scene.height}:null,
    captionCssPx:snapshot.caption?{width:snapshot.caption.width,height:snapshot.caption.height}:null,
    canvasPhysicalPx:snapshot.buffer?.actual??null,
    canvasExpectedPhysicalPx:snapshot.buffer?.expected??null,
    overlays:overlays.map(x=>({name:x.name,rect:x.rect})),
    annotations:annotations.map(x=>({name:x.name,rect:x.rect})),...pvClassify(snapshot)}
}
function pvAudit(){
  const grid=pvEl('fcViewGrid'),
    elements=grid?[...grid.children].filter(x=>pvViews[x.id]&&!x.classList.contains('hidden')&&x.getBoundingClientRect().width>0):[],
    views=elements.map(pvMeasure),
    gridLayout=pvGridRowAudit(grid?.getBoundingClientRect?.(),elements.map(x=>({id:x.id,rect:x.getBoundingClientRect?.()})),pvEl('fieldViewPanel')?.getBoundingClientRect?.()?.width,pvDeckMode),
    counts={};for(const v of views)counts[v.state]=(counts[v.state]||0)+1;
  const report={schema:'foamlens/field-f2-layout/1',capturedUtc:new Date().toISOString(),
    environment:{innerCssPx:{width:window.innerWidth,height:window.innerHeight},
      devicePixelRatio:Number(window.devicePixelRatio)||1,
      visualViewportScale:window.visualViewport?.scale??null},
    counts,views,gridLayout,confidence:'current-rendered-dom-geometry-only',
    limitations:[
      'No other screen width, DPI scale, monitor or installed Windows Setup/Portable is measured unless independently run there.',
      'DOM overlays are classified inside the canvas scene and XYZ/legend annotations inside their own caption; neither classification proves OpenFOAM numerical accuracy.',
      'The existing Field renderer owns camera, source, timeline, mesh and export state; this extension changes CSS panel height/focus only.',
      'Canvas buffer differences may be transient during resizing or screenshot export.',
      'No case names, scientific values, private source paths, screenshots or file contents are saved.'
    ]};
  pvLast=report;
  if(pvEl('pvStatus'))pvEl('pvStatus').textContent=views.length+' measured viewport(s); '+
    (counts['layout-conflict']||0)+' with overlay conflicts, '+(counts.review||0)+' need review; '+gridLayout.issues.length+' grid arrangement issue(s). Current CSS px/DPR only.';
  if(pvEl('pvEvidence'))pvEl('pvEvidence').textContent='Grid A/B/C/D: '+gridLayout.state+' · '+gridLayout.expectedColumns+' column(s), '+gridLayout.rows+' row(s) · '+gridLayout.issues.map(x=>x.type).join(', ')+'\n'+views.map(v=>v.view+': '+v.state+' · '+
    v.issues.map(i=>i.type+(i.a?' '+i.a+(i.b?' vs '+i.b:''):'')).join(', ')).join('\n')||'No active Field viewport';
  if(pvEl('pvExport'))pvEl('pvExport').disabled=!views.length;
  return report
}
function pvExport(){
  if(!pvLast)return;
  const data=JSON.stringify({...pvAudit(),exportedUtc:new Date().toISOString()},null,2);
  if(typeof downloadText==='function'){downloadText('FoamLens_Field_F2_Viewport_Evidence.json',data,'application/json');return}
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='FoamLens_Field_F2_Viewport_Evidence.json';document.body.append(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function pvGrip(grip,viewport){
  let dragging=null;
  grip.addEventListener('pointerdown',e=>{
    if(e.button!==0||dragging)return;
    const height=viewport.querySelector('.fcViewportScene')?.getBoundingClientRect().height;
    if(!(height>0))return;
    e.preventDefault();dragging={y:e.clientY,height,pointerId:e.pointerId,
      originalHeight:viewport.style.getPropertyValue?.('--pvHeight')||''};
    grip.setPointerCapture?.(e.pointerId)
  });
  grip.addEventListener('pointermove',e=>{
    if(!dragging||dragging.pointerId!==e.pointerId)return;
    if(Number.isFinite(e.clientY))pvSetHeight(viewport,dragging.height+e.clientY-dragging.y,false)
  });
  const finish=e=>{
    // Browser PointerEvents can interleave mouse, touch and pen IDs.
    // Only the pointer that began this resize may commit or cancel it.
    if(!dragging||e.pointerId!==dragging.pointerId)return;
    const gesture=dragging;dragging=null;
    if(e.type==='pointerup'){
      // Commit the final physical movement, not a possibly stale scene
      // bounding box measured while a CSS/layout frame is still pending.
      const y=Number.isFinite(e.clientY)?e.clientY:gesture.y;
      pvSetHeight(viewport,gesture.height+y-gesture.y,true);
      return
    }
    // pointercancel / lostpointercapture must NOT save a transient height
    // in the user's persisted A/B/C/D viewport layout.
    if(gesture.originalHeight)
      viewport.style.setProperty('--pvHeight',gesture.originalHeight);
    else viewport.style.removeProperty('--pvHeight');
    pvRedraw()
  };
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(ev,finish);
  grip.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown','PageUp','PageDown','Home'].includes(e.key))return;
    e.preventDefault();
    const height=viewport.querySelector('.fcViewportScene')?.getBoundingClientRect().height||460;
    const next=e.key==='Home'?460:height+(e.key==='ArrowUp'?-40:e.key==='ArrowDown'?40:
      e.key==='PageUp'?-120:120);
    pvSetHeight(viewport,next)
  })
}
function pvMountViewport(viewport){
  if(!pvViews[viewport.id]||viewport.dataset.pvReady==='yes')return;
  const toolbar=viewport.querySelector('.fcViewToolbar'),scene=viewport.querySelector('.fcViewportScene');
  if(!toolbar||!scene)return;
  viewport.dataset.pvReady='yes';viewport.classList.add('pvViewport');
  if(pvHeights[viewport.id]!=null)pvSetHeight(viewport,pvHeights[viewport.id],false);
  const div=document.createElement('div');div.className='pvActions';
  const size=document.createElement('details');size.className='pvSizeMenu';
  const summary=document.createElement('summary');
  summary.textContent=pvFocusLabel('Size','Tamaño');
  const sizeButtons=document.createElement('div');sizeButtons.className='pvSizeControls';
  for(const [action,label] of [['less','− Height'],['more','+ Height'],['focus','Maximize'],['reset','Reset']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.pvControl=action;
    b.title='View '+pvViews[viewport.id]+' · '+label;
    b.setAttribute('aria-label','View '+pvViews[viewport.id]+' · '+label);
    if(action==='focus')b.setAttribute('aria-pressed','false');
    b.onclick=()=>{
      if(action==='focus')return pvFocusViewport(viewport);
      if(action==='reset'){delete pvHeights[viewport.id];pvSave();
        viewport.style.removeProperty('--pvHeight');pvRedraw();return}
      pvSetHeight(viewport,scene.getBoundingClientRect().height+(action==='more'?80:-80))
    };
    if(action==='focus')div.append(b);else sizeButtons.append(b)
  }
  size.append(summary,sizeButtons);
  size.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!size.open)return;
    event.preventDefault();event.stopPropagation?.();
    size.open=false;summary.focus()
  });
  div.append(size);
  toolbar.appendChild(div);
  pvSyncFocusButtons();
  const grip=document.createElement('div');grip.className='pvGrip';grip.tabIndex=0;
  grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');
  grip.setAttribute('aria-label','View '+pvViews[viewport.id]+' resize height using drag or arrow keys');
  scene.insertAdjacentElement('afterend',grip);pvGrip(grip,viewport);
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(items=>viewport.classList.toggle('pvCompact',(items[0]?.contentRect?.width||540)<540));
    ro.observe(scene)
  }
}
// Comparison deck: layout and height are view geometry only; never modify original field/case/camera/time choices.
function pvLoadDeck(){
  try{const p=JSON.parse(localStorage.getItem(pvDeckKey)||'{}');
    pvDeckMode=pvDeckModes.includes(p.mode)?p.mode:'auto';
    pvDeckHeight=['individual','compact','balanced','large'].includes(p.height)?p.height:'individual'
  }catch{pvDeckMode='auto';pvDeckHeight='individual'}
}
function pvSaveDeck(){try{localStorage.setItem(pvDeckKey,JSON.stringify({mode:pvDeckMode,height:pvDeckHeight}))}catch{}}
function pvDeckSceneHeight(){
  const h=window.innerHeight;
  if(pvDeckHeight==='compact')return pvHeight(Math.round(h*.42),h);
  if(pvDeckHeight==='balanced')return pvHeight(Math.round(h*.58),h);
  if(pvDeckHeight==='large')return pvHeight(Math.round(h*.76),h);
  return null
}
function pvApplyDeck(){
  const grid=pvEl('fcViewGrid'),panel=pvEl('fieldViewPanel');if(!grid||!panel)return;
  const views=Array.from(grid.children).filter(x=>pvViews[x.id]&&!x.classList.contains('hidden'));
  const n=views.filter(x=>x.id!=='fcDifferenceViewport').length;
  const width=panel.getBoundingClientRect?.().width||grid.getBoundingClientRect?.().width||0;
  const cols=pvFocus?1:pvDeckColumns(pvDeckMode,n,width);
  if(pvDeckMode==='auto'||pvFocus||!panel.classList.contains('fcCompareMode')){
    grid.removeAttribute('data-pv-deck-mode');grid.style.removeProperty('--pvDeckColumns')
  }else{
    if(grid.getAttribute('data-pv-deck-mode')!==pvDeckMode)grid.setAttribute('data-pv-deck-mode',pvDeckMode);
    const value=String(cols);
    if(grid.style.getPropertyValue('--pvDeckColumns')!==value)grid.style.setProperty('--pvDeckColumns',value)
  }
  const height=pvDeckSceneHeight();
  for(const v of Array.from(grid.children).filter(x=>pvViews[x.id])){
    if(height!==null){
      const px=height+'px';
      if(v.style.getPropertyValue('--pvDeckHeight')!==px)v.style.setProperty('--pvDeckHeight',px)
    }else v.style.removeProperty('--pvDeckHeight')
  }
  const count=pvEl('pvDeckStatus');
  if(count){const msg=pvFocus?pvFocusLabel('Focused view','Vista maximizada'):
    n+' '+pvFocusLabel(n===1?'view':'views',n===1?'vista':'vistas')+' · '+cols+' '+pvFocusLabel(cols===1?'column':'columns',cols===1?'columna':'columnas');
    if(count.textContent!==msg)count.textContent=msg;
  }
  const mode=pvEl('pvDeckMode'),heightSelect=pvEl('pvDeckHeight');
  if(mode&&mode.value!==pvDeckMode)mode.value=pvDeckMode;
  if(heightSelect&&heightSelect.value!==pvDeckHeight)heightSelect.value=pvDeckHeight;
  pvRedraw()
}
function pvDeckLabels(){
  const bar=pvEl('pvDeckBar');if(!bar)return;
  const pairs={pvDeckLabel:['Comparison layout','Disposición de comparación'],pvDeckModeLabel:['Arrangement','Distribución'],pvDeckHeightLabel:['Scene height','Altura de escena'],pvDeckReset:['Reset layout','Restablecer disposición']};
  for(const [id,[en,es]] of Object.entries(pairs)){const e=pvEl(id);if(e&&e.textContent!==pvFocusLabel(en,es))e.textContent=pvFocusLabel(en,es)}
  const modes=pvEl('pvDeckMode'),heights=pvEl('pvDeckHeight');
  const modeLabels=[['auto','Automatic','Automática'],['two','Two columns','Dos columnas'],['row','Widest safe row','Fila más amplia posible']];
  const heightLabels=[['individual','Independent','Independiente'],['compact','Compact / equal','Compacta / igual'],['balanced','Balanced / equal','Equilibrada / igual'],['large','Large / equal','Grande / igual']];
  for(const [select,list] of [[modes,modeLabels],[heights,heightLabels]]){
    if(!select)continue;for(const [value,en,es] of list){const option=Array.from(select.options).find(x=>x.value===value);
      if(option)option.textContent=pvFocusLabel(en,es)}
  }
}
function pvMountDeck(grid){
  if(pvEl('pvDeckBar'))return;
  const bar=document.createElement('section');bar.id='pvDeckBar';bar.className='pvDeckBar';
  bar.innerHTML='<strong id="pvDeckLabel"></strong><label class="pvDeckChoice"><span id="pvDeckModeLabel"></span><select id="pvDeckMode"><option value="auto"></option><option value="two"></option><option value="row"></option></select></label>'+
    '<label class="pvDeckChoice"><span id="pvDeckHeightLabel"></span><select id="pvDeckHeight"><option value="individual"></option><option value="compact"></option><option value="balanced"></option><option value="large"></option></select></label>'+
    '<button id="pvDeckReset" class="btn soft" type="button"></button><span id="pvDeckStatus" class="smallnote" aria-live="polite"></span>';
  grid.parentElement.insertBefore(bar,grid);
  pvEl('pvDeckMode').onchange=e=>{pvDeckMode=pvDeckModes.includes(e.target.value)?e.target.value:'auto';pvSaveDeck();pvApplyDeck()};
  pvEl('pvDeckHeight').onchange=e=>{pvDeckHeight=e.target.value;pvSaveDeck();pvApplyDeck()};
  pvEl('pvDeckReset').onclick=()=>{
    pvDeckMode='auto';pvDeckHeight='individual';pvHeights={};pvSave();pvSaveDeck();pvResetFocus();
    for(const id of Object.keys(pvViews)){const v=pvEl(id);if(v){v.style.removeProperty('--pvHeight');v.style.removeProperty('--pvDeckHeight')}}
    pvApplyDeck()
  };
  pvDeckLabels();pvApplyDeck()
}

function pvStyles(){
  if(pvEl('pvStyles'))return;
  const css=[
    '#fcViewGrid .pvViewport .fcViewportScene{height:var(--pvDeckHeight,var(--pvHeight,clamp(340px,36vw,500px)))!important;min-height:0!important}',
    '#fieldViewPanel.fcCompareMode #fcViewGrid[data-pv-deck-mode]:not(.pvFocus){grid-template-columns:repeat(var(--pvDeckColumns,2),minmax(0,1fr))!important;overflow-x:clip}',
    '.pvDeckBar{display:flex;flex-wrap:wrap;align-items:end;gap:10px;padding:10px 12px;margin:0 0 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);min-width:0}',
    '.pvDeckBar>strong{flex:0 1 auto;align-self:center;font-size:12px;color:var(--text)}',
    '.pvDeckChoice{display:grid;gap:4px;flex:1 1 160px;min-width:0;max-width:240px;font-size:11px;font-weight:700}',
    '.pvDeckChoice select{width:100%;min-height:36px;min-width:0;max-width:100%;font-size:12px}',
    '.pvDeckBar .btn{min-height:36px;white-space:normal;flex:0 1 auto}',
    '.pvDeckBar .smallnote{margin-left:auto;align-self:center}',
    '#fcViewGrid.pvFocus>.pvViewport:not(.pvFocusTarget){display:none!important}',
    '#fcViewGrid.pvFocus>.pvFocusTarget{grid-column:1/-1!important}',
    '#fcViewGrid .pvActions{display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
    '#fcViewGrid .pvSizeMenu{min-width:0;max-width:100%}',
    '#fcViewGrid .pvSizeMenu>summary{cursor:pointer;box-sizing:border-box;display:flex;align-items:center;min-height:30px;padding:6px 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);font-size:10px;font-weight:750;white-space:nowrap}',
    '#fcViewGrid .pvSizeMenu>summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '#fcViewGrid .pvSizeMenu[open]{flex:1 0 100%}',
    '#fcViewGrid .pvSizeControls{display:flex;flex-wrap:wrap;gap:4px;padding:6px 0}',
    '#fcViewGrid .pvActions button{padding:6px 7px;min-height:30px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:7px;cursor:pointer;font-size:10px}',
    '#fcViewGrid .pvActions button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}',
    '#fcViewGrid .pvGrip{height:10px;flex:0 0 10px;cursor:ns-resize;touch-action:none;border-top:1px solid var(--line);background:var(--panel2);position:relative}',
    '#fcViewGrid .pvGrip:after{content:"";position:absolute;width:40px;height:3px;left:calc(50% - 20px);top:3px;border-radius:999px;background:var(--muted)}',
    '#fcViewGrid .pvGrip:focus-visible{outline:2px solid var(--accent)}',
    '#fcViewGrid .pvViewport .fcViewportScene .fvMeshDimensions{top:48px;max-width:calc(55% - 18px);box-sizing:border-box}',
    '#fcViewGrid .pvViewport .fcViewportScene .fvMeasureInfo{max-width:calc(55% - 18px);box-sizing:border-box}',
    '#fcViewGrid .pvViewport .fcViewportScene .fvRegionScaleDock{max-width:43%;max-height:calc(100% - 136px);box-sizing:border-box}',
    '#fcViewGrid .pvViewport .fcViewportScene .fcLegend{max-height:calc(100% - 136px);overflow:auto;box-sizing:border-box}',
    '#fcViewGrid .pvViewport.pvCompact .fcViewportScene .fvRegionScaleDock{top:110px;bottom:auto;max-height:calc(100% - 125px)}',
    '#fcViewGrid .pvViewport.pvCompact .fcViewportScene .fvAxisGizmo{width:62px;height:62px}',
    '.pvAuditPanel{margin:12px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}',
    '.pvAuditPanel summary{cursor:pointer;font-size:11px;font-weight:800}',
    '.pvAuditPanel .extActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
  ].join('\n');
  const style=document.createElement('style');style.id='pvStyles';style.textContent=css;document.head.append(style)
}
function pvAuditPanel(){
  if(pvEl('pvAuditPanel'))return;
  const owner=document.querySelector('.fw3DCard');if(!owner)return;
  const d=document.createElement('details');d.id='pvAuditPanel';d.className='pvAuditPanel';
  d.innerHTML='<summary>Viewport size / DPI audit</summary>'+
    '<p class="smallnote">Check the currently rendered panel geometry; this cannot replace real installed Windows DPI checks.</p>'+
    '<div class="extActions"><button class="btn soft" type="button" id="pvAudit">Measure current layout</button>'+
    '<button class="btn soft" type="button" id="pvExport" disabled>Export JSON evidence</button>'+
    '<button class="btn soft" type="button" id="pvResetAll">Restore panel sizes</button></div>'+
    '<p id="pvStatus" class="smallnote" aria-live="polite"></p>'+
    '<pre id="pvEvidence" class="smallnote" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>';
  owner.append(d);
  pvEl('pvAudit').onclick=pvAudit;pvEl('pvExport').onclick=pvExport;
  pvEl('pvResetAll').onclick=()=>{pvHeights={};pvSave();pvResetFocus();
    for(const id of Object.keys(pvViews))pvEl(id)?.style.removeProperty('--pvHeight');
    pvLast=null;pvEl('pvExport').disabled=true}
}
function pvDiscover(){
  const grid=pvEl('fcViewGrid');if(!grid)return false;
  // The Field grid is created lazily after launch in some navigation paths.
  // Bind Escape when the real grid exists, not only on DOMContentLoaded.
  if(pvEscapeGrid!==grid){
    grid.addEventListener('keydown',e=>{
      if(e.key!=='Escape'||!pvFocus)return;
      pvResetFocus();e.preventDefault?.();e.stopPropagation?.()
    });
    pvEscapeGrid=grid
  }
  pvStyles();pvAuditPanel();pvMountDeck(grid);
  for(const child of grid.children)pvMountViewport(child);
  if(pvObservedGrid!==grid&&typeof MutationObserver!=='undefined'){
    pvObserver?.disconnect?.();
    pvObserver=new MutationObserver(()=>{
      for(const child of grid.children)pvMountViewport(child);
      pvReconcileFocus();
      pvSyncFocusButtons();pvApplyDeck()
    });
    // Compare views are commonly hidden by class changes, NOT removed from
    // the grid. Observing childList alone leaves an invisible maximized view.
    pvObserver.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    pvObservedGrid=grid
  }
  const panel=pvEl('fieldViewPanel');
  if(panel&&pvDeckPanel!==panel&&typeof ResizeObserver!=='undefined'){
    pvDeckRO?.disconnect?.();pvDeckRO=new ResizeObserver(()=>pvApplyDeck());pvDeckRO.observe(panel);pvDeckPanel=panel
  }
  pvReconcileFocus();
  pvSyncFocusButtons();pvApplyDeck();
  return true
}
function pvInstall(){
  pvHeights=pvLoad();pvLoadDeck();let attempts=0;
  (function seek(){if(pvDiscover())return;if(attempts++<900)requestAnimationFrame(seek)})();
  window.addEventListener('resize',()=>{
    for(const [id,value] of Object.entries(pvHeights)){const el=pvEl(id);
      if(el)pvSetHeight(el,value,false)}
    pvApplyDeck()
  });
  // The existing Field controller owns which views are visible. Restore focus
  // when compare/difference is disabled, rather than hiding the only live view.
  document.addEventListener('change',e=>{
    if(['fcEnabled','fcDifference'].includes(e.target?.id))pvResetFocus()
  },true);
  document.addEventListener('foamlens-language-change',()=>{pvSyncFocusButtons();pvDeckLabels();pvApplyDeck()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pvInstall,{once:true});
else pvInstall();
window.FoamLensF2Layout={resize:pvSetHeight,focus:pvFocusViewport,
  resetFocus:pvResetFocus,reconcileFocus:pvReconcileFocus,measure:pvAudit,core:{height:pvHeight,maxHeight:pvMaxHeight,
    overlap:pvOverlap,within:pvWithin,buffer:pvBuffer,classify:pvClassify}};
