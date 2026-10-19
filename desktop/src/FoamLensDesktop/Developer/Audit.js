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
  const clean=value=>{
    let s=String(value===undefined?'undefined':value===null?'null':value);
    for(const [regex,replacement] of sensitivePatterns)s=s.replace(regex,replacement);
    return s.slice(0,MAX_TEXT)
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
    if(badge)badge.textContent='Dev Audit · '+events.length+(lastChecks?' · '+lastChecks.status:'')
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
    style.textContent='.fldaToggle{position:fixed;right:16px;bottom:16px;z-index:2147483645;background:#1f73bd;color:#fff;border:1px solid #85cdff;border-radius:10px;padding:11px 14px;font:700 12px system-ui;cursor:pointer;box-shadow:0 3px 16px #0008}.fldaPanel{position:fixed;z-index:2147483646;right:16px;bottom:65px;width:min(510px,calc(100vw - 30px));max-height:min(76vh,720px);display:none;flex-direction:column;gap:9px;padding:15px;background:#0c1725;color:#e6f4ff;border:2px solid #438abd;border-radius:13px;font:12px/1.45 system-ui;box-shadow:0 6px 30px #000a}.fldaPanel.open{display:flex}.fldaPanel h2{font-size:16px;margin:0}.fldaPanel p{margin:2px 0 8px;color:#adcbdf}.fldaPanel .fldaTools{display:flex;flex-wrap:wrap;gap:6px}.fldaPanel button{border:1px solid #4e7899;border-radius:6px;padding:7px 9px;color:#fff;background:#174363;cursor:pointer}.fldaEntries{overflow:auto;min-height:60px;max-height:45vh;display:flex;flex-direction:column;gap:7px}.fldaEntry{border:1px solid #31485a;padding:8px;border-radius:7px;overflow-wrap:anywhere}.fldaEntry strong,.fldaEntry small{display:block}.fldaEntry small{color:#b3c8d8}.fldaState{font-size:11px;color:#c1d5e7}';
    const root=document.createElement('div');root.id='flDeveloperAuditRoot';
    root.innerHTML='<button class="fldaToggle" id="flDeveloperAuditToggle" aria-controls="flDeveloperAuditPanel" aria-expanded="false">Dev Audit</button><section class="fldaPanel" id="flDeveloperAuditPanel" role="dialog" aria-label="FoamLens Developer audit" aria-hidden="true"><h2>FoamLENS Developer · Audit</h2><p>Developer-only copy. Observed errors + bounded checks, no automatic upload. Scientific case data is not included.</p><div class="fldaTools"><button id="fldaScan">Run Audit checks</button><button id="fldaCopy">Copy AI prompt</button><button id="fldaPrompt">Export AI prompt</button><button id="fldaJson">Export JSON</button><button id="fldaClear">Clear</button><button id="fldaClose">Close</button></div><div class="fldaState" id="fldaState" role="status">Waiting for inspection</div><div class="fldaEntries" id="fldaEntries"></div></section>';
    document.head.append(style);document.body.append(root);
    badge=root.querySelector('.fldaToggle');items=root.querySelector('.fldaEntries');
    const panel=root.querySelector('.fldaPanel');
    const open=value=>{panel.classList.toggle('open',value);panel.setAttribute('aria-hidden',String(!value));badge.setAttribute('aria-expanded',String(value));if(value){renderFindings();root.querySelector('#fldaScan').focus()}else badge.focus()};
    badge.onclick=()=>open(!panel.classList.contains('open'));
    root.querySelector('#fldaClose').onclick=()=>open(false);
    root.querySelector('#fldaScan').onclick=()=>{const r=runChecks();root.querySelector('#fldaState').textContent=r.status+' · '+r.findings.length+' findings; '+events.length+' observed records'};
    root.querySelector('#fldaPrompt').onclick=()=>downloadDeveloperAudit('prompt');
    root.querySelector('#fldaJson').onclick=()=>downloadDeveloperAudit('json');
    root.querySelector('#fldaCopy').onclick=async()=>{
      const t=prompt();
      try{await navigator.clipboard.writeText(t);root.querySelector('#fldaState').textContent='Sanitized AI prompt copied locally'}
      catch{downloadDeveloperAudit('prompt');root.querySelector('#fldaState').textContent='Clipboard unavailable; prompt exported as a text file'}
    };
    root.querySelector('#fldaClear').onclick=()=>{events.length=0;steps.length=0;lastChecks=null;updateBadge();renderFindings();root.querySelector('#fldaState').textContent='Session records cleared'};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))open(false)});
    updateBadge();renderFindings()
  }
  window.__foamLensDeveloperAudit={event,runChecks,snapshot,prompt,downloadDeveloperAudit};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount()
})();
