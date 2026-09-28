'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

function extractObjectAfter(token){
  const start=index.indexOf(token);
  assert(start>=0,'Missing '+token);
  const open=index.indexOf('{',start);
  assert(open>=0,'Missing object after '+token);
  let depth=0,quote='',escaped=false;
  for(let i=open;i<index.length;i++){
    const ch=index[i];
    if(quote){
      if(escaped){escaped=false;continue}
      if(ch==='\\'){escaped=true;continue}
      if(ch===quote)quote='';
      continue
    }
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0)return index.slice(open,i+1)
  }
  throw new Error('Unclosed object after '+token)
}

const I18N=new Function('return ('+extractObjectAfter('const I18N=')+')')();
const enKeys=Object.keys(I18N.en).sort(),esKeys=Object.keys(I18N.es).sort();
assert.deepStrictEqual(esKeys,enKeys,'English and Spanish I18N keys must remain identical');

const esValues=Object.values(I18N.es).join('\n');
const forbiddenSpanish=[
  /\bWorkspace\b/i,/\bdatasets\b/i,/\bPaper\b/,/\bmetadata\b/i,/\bfindings\b/i,
  /\bprofiles\b/i,/\bmapping\b/i,/\bthreshold\b/i,/\bTags\b/,/\bHealth\b/,
  /Spatial Profiles/i
];
for(const re of forbiddenSpanish)assert(!re.test(esValues),'Spanish I18N still contains English UI wording: '+re);
assert(!Object.values(I18N.en).some(v=>String(v).includes('Artículo')),'English I18N contains Spanish wording');

assert(index.includes('function flUi(en,es)'),'Missing bilingual runtime helper');
assert(index.includes('function flApplyBilingualText'),'Missing bilingual DOM helper');
assert(index.includes('foamlens-language-change'),'Language changes must emit a UI refresh event');
assert(index.includes("set('liveTitle','Watch Run','Monitorear ejecución')"),'Watch Run must have a Spanish label');

assert(index.includes('.row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'),'row2 must allow Spanish text to shrink safely');
assert(index.includes('.row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'),'row3 must allow Spanish text to shrink safely');
assert(index.includes('white-space:normal;line-height:1.25;min-width:0;overflow-wrap:anywhere'),'Buttons must wrap long translated labels');
assert(index.includes('.field{margin-bottom:9px;min-width:0}'),'Fields must be shrinkable inside translated grids');

const moduleNames=[
  'v13-flow-analysis.js','v13-numerical-performance.js','v13-performance-controls.js',
  'v13-physical-analysis.js','v13-solidification-analysis.js','v13-spatial-differences.js',
  'v13-temporal-alignment.js','v13-thermal-analysis.js','v13-vector-fields.js'
];
let combined=index;
for(const name of moduleNames){
  const src=fs.readFileSync(path.join(root,name),'utf8');
  combined+='\n'+src;
  const en=(src.match(/data-fl-en=/g)||[]).length,es=(src.match(/data-fl-es=/g)||[]).length;
  assert(en>0,'Expected bilingual DOM labels in '+name);
  assert.strictEqual(es,en,'data-fl-en/data-fl-es count mismatch in '+name);
  assert(src.includes('foamlens-language-change'),'Module must react to hot language changes: '+name);
}
const reproducible=fs.readFileSync(path.join(root,'v13-reproducible-export.js'),'utf8');
combined+='\n'+reproducible;

const stale=[
  'Cargando Spatial Profiles','Spatial Profiles cargados','Spatial Profiles listos',
  'Workspace FoamLens cargado','Abriendo workspace FoamLens','Threshold de ',
  'Tags del caso','Sin findings visibles','No hay findings visibles',
  'Mapping de FoamLens para ','No hay metadata compatible',
  'provenance de la transformación','Exportar serie + metadata',
  'profiles indexados','profiles bajo demanda','Calculando Health y Findings'
];
for(const phrase of stale)assert(!combined.includes(phrase),'Stale mixed-language UI phrase detected: '+phrase);

assert(index.includes("reviewStateLabel(wh.state)"),'Workspace Health must localize visible state labels');
assert(index.includes("reviewText(f.title)"),'Findings must localize visible titles');
assert(index.includes("reviewCategoryLabel(x.key,x.label)"),'Audit categories must localize labels');
assert(index.includes("reviewStateLabel(r.status)"),'Output audit must localize visible status codes');

console.log('Bilingual UI + overflow audit passed.');
console.log('  I18N keys:',enKeys.length);
console.log('  Audited modules:',moduleNames.length);
