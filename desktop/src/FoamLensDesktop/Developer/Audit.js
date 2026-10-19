// FOAMLENS_DEVELOPER_AUDIT_V1
// Compiled ONLY in FoamLensDeveloper.exe. Does not modify scientific inputs.
(() => {
  'use strict';
  if (window.__foamLensDeveloperAudit) return;
  const MAX_EVENTS=200,MAX_TEXT=1400,MAX_STEPS=25;
  const events=[],steps=[];
  const started=new Date().toISOString();
  const sensitivePatterns=[
    [/([?&](?:token|key|secret|password|access_token|authorization)=)[^&#\s]+/gi,'$1[REDACTED]'],
    [/(?:Bearer\s+)[a-z0-9._~+/-]+/gi,'Bearer [REDACTED]'],
    [/((?:api[_-]?key|password|secret|token)\s*[:=]\s*)["']?[^\s"',;}]+/gi,'$1[REDACTED]'],
    [/[a-z]:\\(?:Users\\[^\\\s]+\\)?(?:[^\s"'<>|]+\\)*[^\s"'<>|]*/gi,'[LOCAL_PATH]'],
    [/\/(?:home|Users)\/[^\s"'<>|]+/g,'[LOCAL_PATH]'],
    [/https?:\/\/[^\s"'<>]+/gi,s=>{try{const u=new URL(s);return u.origin+u.pathname}catch{return '[URL]'}}]
  ];
  const clean=(value,maxLength=MAX_TEXT)=>{
    let s=String(value===undefined?'undefined':value===null?'null':value);
    for(const [regex,replacement] of sensitivePatterns)s=s.replace(regex,replacement);
    return s.slice(0,maxLength)
  };
  function event(kind,message,severity='error',source='runtime',extra={}){
    const record={
      at:new Date().toISOString(),kind:clean(kind),severity:clean(severity),
      message:clean(message),source:clean(source),page:location.pathname,
      ...Object.fromEntries(Object.entries(extra).slice(0,8).map(([k,v])=>[k,clean(v)]))
    };
    const prev=events.at(-1);
    if(prev&&prev.kind===record.kind&&prev.message===record.message&&prev.source===record.source){
      prev.repeat=(prev.repeat||1)+1;prev.at=record.at;
    }else{events.push(record);if(events.length>MAX_EVENTS)events.shift()}
    updateBadge();
    return record
  }
  function elementId(node){
    if(!node||node.nodeType!==1)return '';
    const stable=node.id||node.getAttribute('data-mode')||node.getAttribute('data-review')||node.getAttribute('aria-label')||node.tagName;
    return clean(stable).slice(0,80)
  }
  // Durable, developer-only section notes. Data stays in the isolated
  // FoamLensDeveloper WebView2 profile; export is an explicit user action.
  const ANNOTATION_KEY='foamlens-developer-section-notes-v1',MAX_NOTES=100,MAX_NOTE_CHARS=2000;
  let annotationSeq=0,picking=false,draftTarget=null,noteEditor=null,noteList=null;
  let annotations=[];
  function loadAnnotations(){
    try{
      const saved=JSON.parse(window.localStorage?.getItem(ANNOTATION_KEY)||'[]');
      if(!Array.isArray(saved))return [];
      return saved.filter(v=>v&&typeof v.id==='string'&&typeof v.selector==='string'&&
        typeof v.comment==='string'&&typeof v.page==='string').slice(-MAX_NOTES).map(v=>({
        id:String(v.id).slice(0,80),page:String(v.page).slice(0,180),
        selector:String(v.selector).slice(0,260),section:String(v.section||'Unlabeled section').slice(0,180),
        targetTag:String(v.targetTag||'').slice(0,32),rect:v.rect||null,
        comment:v.comment.slice(0,MAX_NOTE_CHARS),
        createdAt:String(v.createdAt||new Date().toISOString()),
        updatedAt:String(v.updatedAt||v.createdAt||new Date().toISOString())
      }))
    }catch{return []}
  }
  annotations=loadAnnotations();
  function persistAnnotations(){
    try{
      window.localStorage?.setItem(ANNOTATION_KEY,JSON.stringify(annotations));
      return true
    }catch{
      event('annotation-storage-unavailable',
        'Section annotations are only in memory. Export JSON before closing this session.','warning','Developer');
      return false
    }
  }
  function safeSelector(node){
    const parts=[];
    for(let el=node;el&&el.nodeType===1&&parts.length<8;el=el.parentElement){
      const id=el.getAttribute?.('id');
      if(id&&id.length<120){
        const escaped=id.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
        parts.unshift('[id="'+escaped+'"]');break
      }
      const tag=String(el.tagName||'div').toLowerCase();
      let nth=1;
      for(let p=el.previousElementSibling;p;p=p.previousElementSibling)
        if(p.tagName===el.tagName)nth++;
      parts.unshift(tag+':nth-of-type('+nth+')')
    }
    return parts.join(' > ').slice(0,260)
  }
  function sectionLabel(node){
    const container=node.closest?.('.fcViewport,.fvViewport,.fwCard,[role="region"],section,article,main,[data-fc-toolbar]')||node;
    const h=container.querySelector?.('h1,h2,h3,.fwCardHead strong,[data-fc-toolbar] .fcMoveHandle')||
      (container.matches?.('h1,h2,h3')?container:null);
    return clean([container.id||container.getAttribute?.('aria-label')||container.tagName,
      (h?.textContent||'').trim().slice(0,75)].filter(Boolean).join(' · ')||'Selected element')
  }
  function targetFromElement(node){
    if(!node||node.nodeType!==1)return null;
    const el=node.closest?.('button,select,input,textarea,canvas,[role="button"]')||node;
    const rect=el.getBoundingClientRect?.();
    return {page:location.pathname,selector:safeSelector(el),section:sectionLabel(el),
      targetTag:String(el.tagName||'').toLowerCase(),
      rect:rect?{x:Math.round(rect.x),y:Math.round(rect.y),
        width:Math.round(rect.width),height:Math.round(rect.height)}:null}
  }
  function annotationsSnapshot(){
    return annotations.map(note=>({...note,section:clean(note.section),
      page:clean(note.page),selector:clean(note.selector),comment:clean(note.comment,MAX_NOTE_CHARS)}))
  }
  function saveAnnotation(target,comment,editId=null){
    if(!target||!target.selector||!target.page)throw Error('Select a real interface section first.');
    const message=String(comment||'').trim().slice(0,MAX_NOTE_CHARS);
    if(!message)throw Error('Write a comment for the selected section.');
    const now=new Date().toISOString();
    const existing=editId?annotations.find(n=>n.id===editId):null;
    if(editId&&!existing)throw Error('The note being edited no longer exists.');
    if(existing){
      Object.assign(existing,{...target,comment:message,updatedAt:now})
    }else{
      annotations.push({...target,comment:message,
        id:'section-'+Date.now().toString(36)+'-'+(++annotationSeq).toString(36),
        createdAt:now,updatedAt:now});
      if(annotations.length>MAX_NOTES)annotations.splice(0,annotations.length-MAX_NOTES)
    }
    persistAnnotations();updateBadge();renderNotes();
    return existing||annotations.at(-1)
  }
  function removeAnnotation(id){
    const index=annotations.findIndex(n=>n.id===id);
    if(index<0)return false;
    annotations.splice(index,1);persistAnnotations();updateBadge();renderNotes();return true
  }
  function resolveTarget(note){
    if(!note||note.page!==location.pathname)return null;
    try{return document.querySelector(note.selector)}catch{return null}
  }
  function highlightTarget(el){
    if(!el)return false;
    el.scrollIntoView?.({block:'center',inline:'nearest'});
    const previous=el.style?.outline||'',offset=el.style?.outlineOffset||'';
    if(el.style){el.style.outline='3px solid #ffb347';el.style.outlineOffset='3px'}
    setTimeout(()=>{if(el.style){el.style.outline=previous;el.style.outlineOffset=offset}},2800);
    return true
  }
  function annotationStatus(message){
    const el=document.getElementById?.('fldaState');if(el)el.textContent=message
  }
  function startPick(){
    picking=true;
    const panel=document.getElementById?.('flDeveloperAuditPanel');
    const toggle=document.getElementById?.('flDeveloperAuditToggle');
    panel?.classList.remove('open');panel?.setAttribute('aria-hidden','true');
    toggle?.setAttribute('aria-expanded','false');
    const tip=document.getElementById?.('fldaPickHint');
    if(tip){tip.hidden=false;tip.textContent='Select a precise FoamLENS control or section (Esc to cancel)'}
    annotationStatus('Pick a section; no FoamLENS action will execute on the chosen click.')
  }
  function endPick(){
    picking=false;
    const tip=document.getElementById?.('fldaPickHint');if(tip)tip.hidden=true
  }
  function chooseElement(el){
    const target=targetFromElement(el);if(!target)return null;
    draftTarget=target;endPick();
    const panel=document.getElementById?.('flDeveloperAuditPanel');
    panel?.classList.add('open');panel?.setAttribute('aria-hidden','false');
    document.getElementById?.('flDeveloperAuditToggle')?.setAttribute('aria-expanded','true');
    const input=document.getElementById?.('fldaComment');
    if(input){input.value='';input.dataset.editId='';input.focus()}
    const info=document.getElementById?.('fldaSelected');
    if(info)info.textContent='Selected: '+target.section+' / '+target.selector;
    annotationStatus('Location selected. Write a comment and click Save note.');
    return target
  }
  document.addEventListener('click',e=>{
    if(!picking)return;
    if(e.target?.closest?.('#flDeveloperAuditRoot,#fldaPickHint'))return;
    e.preventDefault();e.stopImmediatePropagation();
    chooseElement(e.target)
  },true);
  function renderNotes(){
    if(!noteList)return;
    noteList.textContent='';
    if(!annotations.length){
      const empty=document.createElement('p');
      empty.textContent='No saved section comments. Use Point to section to create one.';
      noteList.append(empty);return
    }
    for(const note of annotations.slice().reverse()){
      const wrap=document.createElement('div');wrap.className='fldaEntry';
      const heading=document.createElement('strong');heading.textContent=note.section;
      const snippet=document.createElement('div');snippet.textContent=note.comment;
      const meta=document.createElement('small');
      meta.textContent=note.page+' · '+note.selector+' · '+note.updatedAt;
      const actions=document.createElement('div');actions.className='fldaNoteActions';
      const edit=document.createElement('button');edit.textContent='Edit';
      edit.onclick=()=>{
        draftTarget={page:note.page,selector:note.selector,section:note.section,
          targetTag:note.targetTag,rect:note.rect};
        const input=document.getElementById('fldaComment');
        if(input){input.value=note.comment;input.dataset.editId=note.id;input.focus()}
        document.getElementById('fldaSelected').textContent=
          'Editing: '+note.section+' / '+note.selector
      };
      const locate=document.createElement('button');locate.textContent='Locate';
      locate.onclick=()=>{
        const el=resolveTarget(note);
        if(!highlightTarget(el))
          annotationStatus('The saved section is not visible on this page; the note stays in the export.')
      };
      const del=document.createElement('button');del.textContent='Delete';
      del.onclick=()=>{removeAnnotation(note.id);annotationStatus('Section note deleted.')};
      actions.append(edit,locate,del);wrap.append(heading,snippet,meta,actions);noteList.append(wrap)
    }
  }
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('button,a,select,[role="button"]');
    if(!target)return;
    steps.push({at:new Date().toISOString(),action:'click',target:elementId(target)});
    if(steps.length>MAX_STEPS)steps.shift()
  },true);
  window.addEventListener('error',e=>{
    if(e.target&&e.target!==window){
      const target=e.target;
      const resource=target.getAttribute?.('src')||target.getAttribute?.('href')||target.tagName;
      event('resource-error','Resource could not load: '+resource,'error','browser');
    }else{
      event('javascript-error',e.message||'Unspecified JavaScript error','error',
        e.filename||'browser',{line:e.lineno||'',column:e.colno||'',stack:e.error?.stack||''})
    }
  },true);
  window.addEventListener('unhandledrejection',e=>{
    const reason=e.reason;
    event('unhandled-rejection',reason?.message||reason||'Unspecified promise rejection',
      'error','promise',{stack:reason?.stack||''})
  });
  if(window.chrome?.webview?.addEventListener)window.chrome.webview.addEventListener('message',e=>{
    if(e.data?.type==='developerHostEvent')
      event(e.data.kind||'host-event',e.data.message||'Native host event','error','WebView2')
  });
  function visible(el){
    if(!el||!el.isConnected)return false;
    const css=getComputedStyle(el),r=el.getBoundingClientRect();
    return css.display!=='none'&&css.visibility!=='hidden'&&r.width>2&&r.height>2
  }
  function insideViewport(el){
    const r=el.getBoundingClientRect();
    return r.left>=-2&&r.top>=-2&&r.right<=innerWidth+2&&r.bottom<=innerHeight+2
  }
  function overlap(a,b){
    const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
    return Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left))*
      Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top))
  }
  function runChecks(){
    const findings=[],add=(kind,msg,severity='warning',target='DOM')=>findings.push(
      {at:new Date().toISOString(),kind,source:target,severity,message:clean(msg),origin:'automated-check'});
    const seen=new Set();
    for(const el of document.querySelectorAll('[id]')){
      if(seen.has(el.id))add('duplicate-id','Duplicate DOM id: #'+el.id,'error','document');
      else seen.add(el.id)
    }
    for(const id of ['flRibbon','workspace','fieldViewPanel','dataCatalogPanel','aboutDeveloperBtn']){
      if(!document.getElementById(id))add('missing-control','Expected base control absent: #'+id,'error','document')
    }
    for(const [id,label] of [['fwAdd3DViewVisible','Add view'],['fwImport3DCase','Import case']]){
      const el=document.getElementById(id);
      if(!el)add('missing-field-action',label+' is absent','warning','Field');
      else if(visible(el)&&!insideViewport(el))add('offscreen-field-action',label+' is outside the visible window','warning','Field')
    }
    const ribbon=document.querySelector('#flRibbonPanel-field.active');
    if(ribbon&&visible(ribbon)){
      const r=ribbon.getBoundingClientRect();
      for(const g of ribbon.children){
        if(!visible(g))continue;
        const b=g.getBoundingClientRect();
        if(b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2)
          add('ribbon-overflow','Field ribbon group clips: '+elementId(g),'warning','Field Ribbon')
      }
    }
    const panels=[...document.querySelectorAll('.fcViewport')].filter(visible);
    for(const vp of panels){
      const bar=vp.querySelector('[data-fc-toolbar]');
      if(bar&&visible(bar)&&overlap(bar,vp.querySelector('canvas')||bar)>3)
        add('toolbar-canvas-overlap','Viewport header overlaps render canvas: '+elementId(vp),'warning','Field');
    }
    const mem=performance?.memory;
    const result={
      at:new Date().toISOString(),checks:'DOM, Field controls, viewport bounds, duplicate IDs',
      viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio},
      document:{title:clean(document.title),nodes:document.querySelectorAll('*').length},
      navigationMs:Math.round(performance.getEntriesByType('navigation')[0]?.duration||0),
      heapMB:mem?.usedJSHeapSize?Math.round(mem.usedJSHeapSize/1048576):null,
      status:findings.some(f=>f.severity==='error')?'issues-found':findings.length?'warnings':'checks-passed',
      findings
    };
    for(const f of findings)event(f.kind,f.message,f.severity,f.source,{origin:f.origin});
    lastChecks=result;updateBadge();renderFindings();return result
  }
  let lastChecks=null;
  function snapshot(){
    return {schema:'foamlens-developer-audit/1',edition:'FoamLens Developer',
      createdAt:new Date().toISOString(),started,appVersion:clean(
        document.querySelector('[data-desktop-version]')?.textContent||'unknown'),
      location:location.pathname,
      environment:{userAgent:clean(navigator.userAgent),viewport:innerWidth+'×'+innerHeight,
        pixelRatio:devicePixelRatio},
      checks:lastChecks||{status:'not-inspected',note:'Run Audit checks to inspect this layout'},
      observedErrors:events.slice(),recentActions:steps.slice(),
      sectionAnnotations:annotationsSnapshot(),
      limitations:['Only errors observed during this session are captured',
        'A passed UI check does not establish scientific correctness',
        'No solver execution, source file scanning or hidden user data inspection occurred']
    }
  }
  function prompt(){
    const r=snapshot();
    let t=['# FoamLENS Developer — AI debugging request',
      'You are reviewing evidence from a scientific OpenFOAM analysis app. Fix reproducible faults without changing scientific results or assuming a failure occurred without evidence.',
      'Preserve the existing WebView2/.NET/WinForms app, OpenFOAM field provenance, units, UI layout, and Windows release tests.',
      'Report root-cause hypotheses as hypotheses. Separate observed errors from automated layout warnings.',
      '',
      '## Build and environment',
      'Edition: '+r.edition,'Version: '+r.appVersion,'Viewport: '+r.environment.viewport,
      'Device pixel ratio: '+r.environment.pixelRatio,'Timestamp: '+r.createdAt,
      '## Reproduction action targets (no typed text or file contents)',
      ...r.recentActions.map(s=>'- '+s.at+' '+s.action+' '+s.target),
      '## Developer section annotations ('+r.sectionAnnotations.length+')',
      'These are developer-authored reports, not automatically verified failures. Preserve their UI location and precise comment:',
      ...r.sectionAnnotations.map((a,i)=>[
        '### Note '+(i+1)+': '+a.section,
        'Screen / page: '+a.page,'DOM target selector: '+a.selector,
        'Target element: '+a.targetTag,
        'Saved screen bounds: '+JSON.stringify(a.rect||{}),
        'Developer comment: '+a.comment,
        'Saved: '+a.createdAt+' | Last edited: '+a.updatedAt
      ].join('\n')),
      '## Observed errors ('+r.observedErrors.length+')',
      ...r.observedErrors.map((e,i)=>[
        '### '+(i+1)+'. '+e.kind+' ('+e.severity+')',
        'Source: '+e.source+' | Time: '+e.at+' | Repeats: '+(e.repeat||1),
        'Message: '+e.message, e.stack?'Sanitized stack: '+e.stack:''
      ].filter(Boolean).join('\n')),
      '## Automated inspection','Status: '+r.checks.status,
      ...(r.checks.findings||[]).map(e=>'- '+e.severity+': '+e.kind+' — '+e.message),
      '## Uninspected scope',...r.limitations.map(x=>'- '+x),
      '## Required response','1. Map each issue to the responsible source module and a verifiable reproduction path.',
      '2. Propose minimal implementation and exact regression test, including Windows Setup and portable coverage.',
      '3. State missing evidence explicitly. Do not fabricate measurements, physical field values or success claims.',
      '4. Do not request credentials or private CFD cases; prefer minimal sanitized fixtures.'
    ];
    if(!r.observedErrors.length)t.push('No runtime errors were observed in this session; do not report this as a crash.');
    return t.join('\n').slice(0,190000)
  }
  function downloadDeveloperAudit(kind='prompt'){
    const content=kind==='json'?JSON.stringify(snapshot(),null,2):prompt();
    const type=kind==='json'?'application/json':'text/plain';
    const filename='foamlens-developer-audit-'+new Date().toISOString().replace(/[:.]/g,'-')+(kind==='json'?'.json':'.txt');
    const url=URL.createObjectURL(new Blob([content],{type:type+';charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=filename;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)
  }
  let badge=null,items=null;
  function updateBadge(){
    if(badge)badge.textContent='Dev Audit · '+events.length+' errors · '+annotations.length+' notes'+(lastChecks?' · '+lastChecks.status:'')
  }
  function renderFindings(){
    if(!items)return;
    items.textContent='';
    const recent=events.slice(-35).reverse();
    if(!recent.length){const p=document.createElement('p');p.textContent='No errors observed. Run Audit checks for a bounded layout inspection.';items.append(p)}
    for(const e of recent){
      const block=document.createElement('div');block.className='fldaEntry';
      const heading=document.createElement('strong');heading.textContent=e.severity.toUpperCase()+' · '+e.kind;
      const body=document.createElement('div');body.textContent=e.message;
      const foot=document.createElement('small');foot.textContent=e.at+' · '+e.source+(e.repeat?' · x'+e.repeat:'');
      block.append(heading,body,foot);items.append(block)
    }
  }
  function mount(){
    if(document.getElementById('flDeveloperAuditRoot')||!document.body)return;
    const style=document.createElement('style');
    style.textContent='.fldaToggle{position:fixed;right:16px;bottom:16px;z-index:2147483645;background:#1f73bd;color:#fff;border:1px solid #85cdff;border-radius:10px;padding:11px 14px;font:700 12px system-ui;cursor:pointer;box-shadow:0 3px 16px #0008}.fldaPanel{position:fixed;z-index:2147483646;right:16px;bottom:65px;width:min(510px,calc(100vw - 30px));max-height:min(76vh,720px);display:none;flex-direction:column;gap:9px;padding:15px;background:#0c1725;color:#e6f4ff;border:2px solid #438abd;border-radius:13px;font:12px/1.45 system-ui;box-shadow:0 6px 30px #000a}.fldaPanel.open{display:flex}.fldaPanel h2{font-size:16px;margin:0}.fldaPanel p{margin:2px 0 8px;color:#adcbdf}.fldaPanel .fldaTools{display:flex;flex-wrap:wrap;gap:6px}.fldaPanel button{border:1px solid #4e7899;border-radius:6px;padding:7px 9px;color:#fff;background:#174363;cursor:pointer}.fldaEntries{overflow:auto;min-height:60px;max-height:45vh;display:flex;flex-direction:column;gap:7px}.fldaEntry{border:1px solid #31485a;padding:8px;border-radius:7px;overflow-wrap:anywhere}.fldaEntry strong,.fldaEntry small{display:block}.fldaEntry small{color:#b3c8d8}.fldaState{font-size:11px;color:#c1d5e7}.fldaNotes{border-top:1px solid #36516a;padding-top:9px;display:flex;flex-direction:column;gap:6px}.fldaNotes label{font-weight:700}.fldaNotes textarea{box-sizing:border-box;width:100%;min-height:67px;max-height:160px;resize:vertical;background:#11283a;color:#fff;border:1px solid #628cad;border-radius:6px;padding:7px;font:12px/1.45 system-ui}.fldaNoteList{max-height:25vh;overflow:auto;display:grid;gap:6px}.fldaNoteActions{display:flex;gap:6px;margin-top:6px}.fldaNoteActions button{font-size:11px}#fldaPickHint:not([hidden]){position:fixed;z-index:2147483647;left:50%;top:12px;transform:translateX(-50%);padding:13px 20px;color:#fff;background:#14588b;border:2px solid #a7e2ff;border-radius:9px;pointer-events:none;box-shadow:0 5px 25px #0008}.fldaPanel{max-height:85vh!important;overflow:auto!important}';
    const root=document.createElement('div');root.id='flDeveloperAuditRoot';
    root.innerHTML='<button class="fldaToggle" id="flDeveloperAuditToggle" aria-controls="flDeveloperAuditPanel" aria-expanded="false">Dev Audit</button><section class="fldaPanel" id="flDeveloperAuditPanel" role="dialog" aria-label="FoamLens Developer audit" aria-hidden="true"><h2>FoamLENS Developer · Audit</h2><p>Developer-only copy. Observed errors + bounded checks, no automatic upload. Scientific case data is not included.</p><div class="fldaTools"><button id="fldaPick">Point to section</button><button id="fldaScan">Run Audit checks</button><button id="fldaCopy">Copy AI prompt</button><button id="fldaPrompt">Export AI prompt</button><button id="fldaJson">Export JSON</button><button id="fldaClear">Clear</button><button id="fldaClose">Close</button></div><div class="fldaState" id="fldaState" role="status">Waiting for inspection</div><div class="fldaNotes"><strong>Persistent section comments</strong><div class="fldaState" id="fldaSelected">Select any control, chart or view using Point to section</div><label for="fldaComment">Comment about this precise section</label><textarea id="fldaComment" rows="3" maxlength="2000" placeholder="What is wrong here, what you expect, and how to reproduce it?"></textarea><div class="fldaTools"><button id="fldaSave">Save note</button><button id="fldaCancelNote">Clear editor</button></div><div class="fldaNoteList" id="fldaNoteList"></div></div><strong>Observed errors and layout checks</strong><div class="fldaEntries" id="fldaEntries"></div></section><div id="fldaPickHint" hidden aria-live="polite">Select a FoamLENS section (Esc to cancel)</div>';
    document.head.append(style);document.body.append(root);
    badge=root.querySelector('.fldaToggle');items=root.querySelector('.fldaEntries');noteList=root.querySelector('#fldaNoteList');
    const panel=root.querySelector('.fldaPanel');
    const open=value=>{panel.classList.toggle('open',value);panel.setAttribute('aria-hidden',String(!value));badge.setAttribute('aria-expanded',String(value));if(value){renderFindings();root.querySelector('#fldaScan').focus()}else badge.focus()};
    badge.onclick=()=>open(!panel.classList.contains('open'));
    root.querySelector('#fldaClose').onclick=()=>open(false);
    root.querySelector('#fldaPick').onclick=startPick;
    root.querySelector('#fldaSave').onclick=()=>{
      const input=root.querySelector('#fldaComment');
      try{
        const saved=saveAnnotation(draftTarget,input.value,input.dataset.editId||null);
        input.value='';input.dataset.editId='';draftTarget=null;
        root.querySelector('#fldaSelected').textContent='Saved: '+saved.section+' / '+saved.selector;
        annotationStatus('Saved section comment locally; it will be included in JSON and AI prompt exports.')
      }catch(e){annotationStatus(String(e.message||e))}
    };
    root.querySelector('#fldaCancelNote').onclick=()=>{
      draftTarget=null;const input=root.querySelector('#fldaComment');
      input.value='';input.dataset.editId='';
      root.querySelector('#fldaSelected').textContent='No section selected'
    };
    root.querySelector('#fldaScan').onclick=()=>{const r=runChecks();root.querySelector('#fldaState').textContent=r.status+' · '+r.findings.length+' findings; '+events.length+' observed records'};
    root.querySelector('#fldaPrompt').onclick=()=>downloadDeveloperAudit('prompt');
    root.querySelector('#fldaJson').onclick=()=>downloadDeveloperAudit('json');
    root.querySelector('#fldaCopy').onclick=async()=>{
      const t=prompt();
      try{await navigator.clipboard.writeText(t);root.querySelector('#fldaState').textContent='Sanitized AI prompt copied locally'}
      catch{downloadDeveloperAudit('prompt');root.querySelector('#fldaState').textContent='Clipboard unavailable; prompt exported as a text file'}
    };
    root.querySelector('#fldaClear').onclick=()=>{events.length=0;steps.length=0;lastChecks=null;updateBadge();renderFindings();root.querySelector('#fldaState').textContent='Session records cleared'};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking){endPick();return}if(e.key==='Escape'&&panel.classList.contains('open'))open(false)});
    updateBadge();renderFindings();renderNotes()
  }
  window.__foamLensDeveloperAudit={event,runChecks,snapshot,prompt,downloadDeveloperAudit,
    startPick,chooseElement,targetFromElement,saveAnnotation,removeAnnotation,annotationsSnapshot};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount()
})();
