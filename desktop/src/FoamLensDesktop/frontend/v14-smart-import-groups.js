/* FoamLens Desktop v1.4.1 — Smart Import case-version grouping. */

/* FOAMLENS_SMART_IMPORT_GROUPS_CORE_START */
function sivVersionInfo(name){
  const raw=String(name||'').trim().split(/[\\/]/).filter(Boolean).at(-1)||'';
  let m=raw.match(/^(?:version|ver|v)[._ -]?(\d+(?:\.\d+)*)(?=$|[._ -])/i);
  if(m)return{version:m[1],family:'',token:m[0],detected:true};
  m=raw.match(/^([A-Za-z]+)[._ -]?(\d+(?:\.\d+)*)(?=$|[._ -])/);
  if(m)return{version:m[2],family:m[1],token:m[0],detected:true};
  return{version:'',family:'',token:'',detected:false}
}
function sivVersionSort(a,b){
  const aa=String(a||'').split('.').map(Number),bb=String(b||'').split('.').map(Number),n=Math.max(aa.length,bb.length);
  for(let i=0;i<n;i++){const x=Number.isFinite(aa[i])?aa[i]:0,y=Number.isFinite(bb[i])?bb[i]:0;if(x!==y)return x-y}
  return String(a||'').localeCompare(String(b||''),undefined,{numeric:true,sensitivity:'base'})
}
function sivGroupCandidates(candidates){
  const map=new Map(),other=[];
  (candidates||[]).forEach((candidate,index)=>{
    const info=sivVersionInfo(candidate?.name);
    if(!info.detected){other.push({candidate,index,info});return}
    if(!map.has(info.version))map.set(info.version,[]);
    map.get(info.version).push({candidate,index,info})
  });
  const groups=[...map.entries()].sort((a,b)=>sivVersionSort(a[0],b[0])).map(([version,items])=>({version,items,families:[...new Set(items.map(x=>x.info.family).filter(Boolean))].sort()}));
  return{groups,other}
}
function sivSelectionState(total,checked){
  total=Math.max(0,Number(total)||0);checked=Math.max(0,Math.min(total,Number(checked)||0));
  return{checked:total>0&&checked===total,indeterminate:checked>0&&checked<total,selected:checked,total}
}
/* FOAMLENS_SMART_IMPORT_GROUPS_CORE_END */

function sivUi(en,es){
  try{return typeof flUi==='function'?flUi(en,es):(document.getElementById('language')?.value==='es'?es:en)}catch{return en}
}
function sivEsc(v){
  try{return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}catch{return String(v??'')}
}
function sivEnsureStyle(){
  if(document.getElementById('sivStyle'))return;
  const style=document.createElement('style');style.id='sivStyle';style.textContent=`
#smartImportVersionGroups{display:flex;flex-wrap:wrap;align-items:center;gap:7px;padding:10px 12px;margin:0 0 10px;border:1px solid var(--line);border-radius:13px;background:var(--panel2)}
.sivGroupTitle{font-size:9px;font-weight:850;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-right:2px}
.sivVersionToggle{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:5px 8px;border:1px solid var(--line);border-radius:9px;background:var(--panel);font-size:9px;font-weight:750;cursor:pointer;user-select:none}
.sivVersionToggle:hover{border-color:var(--accent);background:var(--accentSoft)}
.sivVersionToggle input{margin:0}.sivVersionToggle small{font-size:8px;color:var(--muted);font-weight:650}
.sivBulkActions{display:flex;gap:5px;margin-left:auto}.sivBulkActions .btn{padding:5px 8px;font-size:8px}
.smartCaseRow[data-siv-version] .smartCaseMeta:before{content:attr(data-siv-label);display:inline-flex;border:1px solid rgba(91,153,225,.35);border-radius:999px;padding:2px 5px;margin-right:4px;font-size:8px;font-weight:850;color:var(--accent)}
@media(max-width:650px){.sivBulkActions{width:100%;margin-left:0}.sivBulkActions .btn{flex:1}}
`;document.head.appendChild(style)
}
function sivRowsForVersion(version){
  return [...document.querySelectorAll('.smartCaseRow')].filter(row=>String(row.dataset.sivVersion||'')===String(version||''))
}
function sivSelectableChecksForVersion(version){
  return sivRowsForVersion(version).map(row=>row.querySelector('.smartCaseCheck')).filter(x=>x&&!x.disabled)
}
function sivSetVersion(version,checked){
  for(const input of sivSelectableChecksForVersion(version))input.checked=!!checked;
  sivRefreshVersionControls();try{syncSmartImportSummary()}catch{}
}
function sivSetAll(checked){
  document.querySelectorAll('.smartCaseCheck:not(:disabled)').forEach(x=>x.checked=!!checked);
  sivRefreshVersionControls();try{syncSmartImportSummary()}catch{}
}
function sivRefreshVersionControls(){
  const host=document.getElementById('smartImportVersionGroups');if(!host)return;
  host.querySelectorAll('[data-siv-toggle]').forEach(input=>{
    const version=input.dataset.sivToggle,checks=sivSelectableChecksForVersion(version),selected=checks.filter(x=>x.checked).length,state=sivSelectionState(checks.length,selected);
    input.checked=state.checked;input.indeterminate=state.indeterminate;
    const count=host.querySelector('[data-siv-count="'+CSS.escape(version)+'"]');if(count)count.textContent=state.selected+'/'+state.total
  })
}
function sivBuildGroups(candidates){
  const list=document.getElementById('smartImportList');if(!list)return;
  let host=document.getElementById('smartImportVersionGroups');
  if(!host){host=document.createElement('div');host.id='smartImportVersionGroups';list.insertAdjacentElement('beforebegin',host)}
  const grouped=sivGroupCandidates(candidates),parts=[];
  parts.push('<span class="sivGroupTitle">'+sivEsc(sivUi('Case versions','Versiones de casos'))+'</span>');
  for(const group of grouped.groups){
    const familyText=group.families.length>1?group.families.join(' / '):group.families[0]||'';
    parts.push('<label class="sivVersionToggle"><input type="checkbox" data-siv-toggle="'+sivEsc(group.version)+'"><span>'+sivEsc(sivUi('Version ','Versión ')+group.version)+'</span><small data-siv-count="'+sivEsc(group.version)+'">0/'+group.items.length+'</small>'+(familyText?'<small>'+sivEsc(familyText)+'</small>':'')+'</label>')
  }
  if(grouped.other.length)parts.push('<label class="sivVersionToggle"><input type="checkbox" data-siv-toggle="__other__"><span>'+sivEsc(sivUi('Other','Otros'))+'</span><small data-siv-count="__other__">0/'+grouped.other.length+'</small></label>');
  parts.push('<span class="sivBulkActions"><button class="btn soft" type="button" id="sivSelectAll">'+sivEsc(sivUi('Select all','Seleccionar todo'))+'</button><button class="btn" type="button" id="sivClearAll">'+sivEsc(sivUi('Clear all','Quitar todo'))+'</button></span>');
  host.innerHTML=parts.join('');
  const byIndex=new Map();for(const g of grouped.groups)for(const item of g.items)byIndex.set(item.index,g.version);for(const item of grouped.other)byIndex.set(item.index,'__other__');
  document.querySelectorAll('.smartCaseRow').forEach(row=>{
    const version=byIndex.get(Number(row.dataset.index))||'__other__';row.dataset.sivVersion=version;
    row.dataset.sivLabel=version==='__other__'?sivUi('Other','Otros'):sivUi('Version ','Versión ')+version
  });
  host.querySelectorAll('[data-siv-toggle]').forEach(input=>input.addEventListener('change',()=>sivSetVersion(input.dataset.sivToggle,input.checked)));
  document.getElementById('sivSelectAll')?.addEventListener('click',()=>sivSetAll(true));
  document.getElementById('sivClearAll')?.addEventListener('click',()=>sivSetAll(false));
  document.querySelectorAll('.smartCaseCheck').forEach(x=>x.addEventListener('change',sivRefreshVersionControls));
  sivRefreshVersionControls()
}
function sivInstall(){
  sivEnsureStyle();
  if(typeof openSmartImport!=='function'||openSmartImport.__sivPatched)return false;
  const previousOpen=openSmartImport;
  openSmartImport=function(candidates){
    const result=previousOpen.apply(this,arguments);sivBuildGroups(candidates||[]);return result
  };
  openSmartImport.__sivPatched=true;
  if(typeof syncSmartImportSummary==='function'&&!syncSmartImportSummary.__sivPatched){
    const previousSummary=syncSmartImportSummary;
    syncSmartImportSummary=function(){
      const result=previousSummary.apply(this,arguments),selected=document.querySelectorAll('.smartCaseCheck:checked').length,active=new Set([...document.querySelectorAll('.smartCaseCheck:checked')].map(x=>x.closest('.smartCaseRow')?.dataset.sivVersion).filter(Boolean));
      const el=document.getElementById('smartImportSummary');if(el&&document.getElementById('smartImportVersionGroups'))el.textContent+=' · '+active.size+' '+sivUi(active.size===1?'version selected':'versions selected',active.size===1?'versión seleccionada':'versiones seleccionadas');
      sivRefreshVersionControls();return result
    };syncSmartImportSummary.__sivPatched=true
  }
  document.addEventListener('foamlens-language-change',()=>{if(document.getElementById('smartImportOverlay')?.classList.contains('open'))sivBuildGroups(pendingSmartCases||[])});
  return true
}
sivInstall();
window.FoamLensSmartImportGroups={sivVersionInfo,sivVersionSort,sivGroupCandidates,sivSelectionState,sivBuildGroups,sivSetVersion,sivSetAll};
