/* Granada #149: Field viewport heights, transient focus, DOM/DPI evidence.
 * Existing Field renderer, cameras, data and Split drag controller unchanged. */
/* FOAMLENS_F2_LAYOUT_CORE_START */
const pvViews={fvViewport:'A',fcViewport:'B',fcExtra3Viewport:'C',fcExtra4Viewport:'D',fcDifferenceViewport:'Δ'};
const pvKey='foamlens.field.f2.viewheights.v1';
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
/* FOAMLENS_F2_LAYOUT_CORE_END */
function pvEl(id){return document.getElementById(id)}
let pvHeights={},pvFocus=null,pvFrame=0,pvObserver=null,pvLast=null;
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
function pvFocusViewport(viewport){
  if(!viewport||!pvViews[viewport.id]||viewport.classList.contains('hidden'))return false;
  const grid=pvEl('fcViewGrid');if(!grid)return false;
  pvFocus=pvFocus===viewport.id?null:viewport.id;
  grid.classList.toggle('pvFocus',!!pvFocus);
  for(const el of grid.children)if(pvViews[el.id]){
    el.classList.toggle('pvFocusTarget',el.id===pvFocus);
    const btn=el.querySelector('[data-pv-control="focus"]');
    if(btn)btn.setAttribute('aria-pressed',el.id===pvFocus?'true':'false')
  }
  pvRedraw();return true
}
function pvResetFocus(){
  pvFocus=null;const grid=pvEl('fcViewGrid');
  grid?.classList.remove('pvFocus');
  if(grid)for(const child of grid.children)child.classList.remove('pvFocusTarget');
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
  const scene=viewport.querySelector('.fcViewportScene'),canvas=scene?.querySelector('canvas'),
    r=canvas?.getBoundingClientRect(),dpr=Number(window.devicePixelRatio)||1,
    pieces=[['time-badge','.fcTimeBadge'],['dimension-cotas','.fvMeshDimensions'],
      ['physical-measure','.fvMeasureInfo'],['axis-gizmo','.fvAxisGizmo'],
      ['field-legend','.fvLegend'],['compare-legend','.fcLegend'],
      ['material-legend','.fvRegionScaleDock']];
  const dock=scene?.querySelector('.fvRegionScaleDock');
  const overlays=pieces.filter(([label])=>label!=='field-legend'||
    !dock?.contains(scene?.querySelector('.fvLegend')))
    .map(([label,sel])=>pvSampleOverlay(scene,sel,label)).filter(Boolean);
  const snapshot={scene:pvRect(scene?.getBoundingClientRect()),canvas:pvRect(r),
    overlays,buffer:r?pvBuffer(r.width,r.height,dpr,canvas.width,canvas.height):null};
  return{id:viewport.id,view:pvViews[viewport.id],
    sceneCssPx:snapshot.scene?{width:snapshot.scene.width,height:snapshot.scene.height}:null,
    canvasPhysicalPx:snapshot.buffer?.actual??null,
    canvasExpectedPhysicalPx:snapshot.buffer?.expected??null,
    overlays:overlays.map(x=>({name:x.name,rect:x.rect})),...pvClassify(snapshot)}
}
function pvAudit(){
  const grid=pvEl('fcViewGrid'),
    elements=grid?[...grid.children].filter(x=>pvViews[x.id]&&!x.classList.contains('hidden')&&x.getBoundingClientRect().width>0):[],
    views=elements.map(pvMeasure),
    counts={};for(const v of views)counts[v.state]=(counts[v.state]||0)+1;
  const report={schema:'foamlens/field-f2-layout/1',capturedUtc:new Date().toISOString(),
    environment:{innerCssPx:{width:window.innerWidth,height:window.innerHeight},
      devicePixelRatio:Number(window.devicePixelRatio)||1,
      visualViewportScale:window.visualViewport?.scale??null},
    counts,views,confidence:'current-rendered-dom-geometry-only',
    limitations:[
      'No other screen width, DPI scale, monitor or installed Windows Setup/Portable is measured unless independently run there.',
      'DOM overlaps are visual geometry observations, not proof of inaccurate OpenFOAM numerical fields, axes, units or temperature data.',
      'The existing Field renderer owns camera, source, timeline, mesh and export state; this extension changes CSS panel height/focus only.',
      'Canvas buffer differences may be transient during resizing or screenshot export.',
      'No case names, scientific values, private source paths, screenshots or file contents are saved.'
    ]};
  pvLast=report;
  if(pvEl('pvStatus'))pvEl('pvStatus').textContent=views.length+' measured viewport(s); '+
    (counts['layout-conflict']||0)+' with overlay conflicts, '+(counts.review||0)+' need review. Current CSS px/DPR only.';
  if(pvEl('pvEvidence'))pvEl('pvEvidence').textContent=views.map(v=>v.view+': '+v.state+' · '+
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
    if(e.button!==0)return;
    const height=viewport.querySelector('.fcViewportScene')?.getBoundingClientRect().height;
    if(!(height>0))return;
    e.preventDefault();dragging={y:e.clientY,height,pointerId:e.pointerId};
    grip.setPointerCapture?.(e.pointerId)
  });
  grip.addEventListener('pointermove',e=>{
    if(!dragging||dragging.pointerId!==e.pointerId)return;
    pvSetHeight(viewport,dragging.height+e.clientY-dragging.y,false)
  });
  const finish=()=>{if(!dragging)return;dragging=null;
    const height=viewport.querySelector('.fcViewportScene')?.getBoundingClientRect().height;
    if(height>0)pvSetHeight(viewport,height,true)
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
    };div.append(b)
  }
  toolbar.appendChild(div);
  const grip=document.createElement('div');grip.className='pvGrip';grip.tabIndex=0;
  grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');
  grip.setAttribute('aria-label','View '+pvViews[viewport.id]+' resize height using drag or arrow keys');
  scene.insertAdjacentElement('afterend',grip);pvGrip(grip,viewport);
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(items=>viewport.classList.toggle('pvCompact',(items[0]?.contentRect?.width||540)<540));
    ro.observe(scene)
  }
}
function pvStyles(){
  if(pvEl('pvStyles'))return;
  const css=[
    '#fcViewGrid .pvViewport .fcViewportScene{height:var(--pvHeight,clamp(340px,36vw,500px))!important;min-height:0!important}',
    '#fcViewGrid.pvFocus>.pvViewport:not(.pvFocusTarget){display:none!important}',
    '#fcViewGrid.pvFocus>.pvFocusTarget{grid-column:1/-1!important}',
    '#fcViewGrid .pvActions{display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
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
  pvStyles();pvAuditPanel();
  for(const child of grid.children)pvMountViewport(child);
  if(!pvObserver&&typeof MutationObserver!=='undefined'){
    pvObserver=new MutationObserver(()=>{
      for(const child of grid.children)pvMountViewport(child);
      if(pvFocus&&(!pvEl(pvFocus)||pvEl(pvFocus)?.classList.contains('hidden')))pvResetFocus()
    });
    pvObserver.observe(grid,{childList:true})
  }
  return true
}
function pvInstall(){
  pvHeights=pvLoad();let attempts=0;
  (function seek(){if(pvDiscover())return;if(attempts++<900)requestAnimationFrame(seek)})();
  window.addEventListener('resize',()=>{
    for(const [id,value] of Object.entries(pvHeights)){const el=pvEl(id);
      if(el)pvSetHeight(el,value,false)}
  });
  // The existing Field controller owns which views are visible. Restore focus
  // when compare/difference is disabled, rather than hiding the only live view.
  document.addEventListener('change',e=>{
    if(['fcEnabled','fcDifference'].includes(e.target?.id))pvResetFocus()
  },true)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pvInstall,{once:true});
else pvInstall();
window.FoamLensF2Layout={resize:pvSetHeight,focus:pvFocusViewport,
  resetFocus:pvResetFocus,measure:pvAudit,core:{height:pvHeight,maxHeight:pvMaxHeight,
    overlap:pvOverlap,within:pvWithin,buffer:pvBuffer,classify:pvClassify}};
