'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const app=path.join(__dirname,'..','src','FoamLensDesktop');
const source=fs.readFileSync(path.join(app,'frontend','v24-physics-evidence-explorer.js'),'utf8');
const html=fs.readFileSync(path.join(app,'frontend','index.html'),'utf8');
const field=fs.readFileSync(path.join(app,'frontend','v13-field-mapping.js'),'utf8');
const momentum=fs.readFileSync(path.join(app,'frontend','v14-momentum-mechanisms.js'),'utf8');
const native=fs.readFileSync(path.join(app,'Program.cs'),'utf8');
new Function(source);
for(const text of ['Directory.GetFiles(AppRoot, "v*-*.js")','File.ReadAllText(path, Encoding.UTF8)'])
 assert(native.includes(text),'Native Windows versioned bundle must load new independent module: '+text);
for(const text of ['function pmLoadFieldSet(','function pmAlignedComponents(','function pmFilterByPhase(',
 'function pmClassifyPhase(','function pmStats(','function pmRunVerification(',
 'function pmRunScatterAnalysis(','function pmRunEvolutionAnalysis('])
 assert(html.includes(text),'Existing Phase/Momentum calculation should be reused, not duplicated: '+text);
for(const text of ['function fmMappingForRegion(','function fmSuggestMappingsWithMetadata('])
 assert(field.includes(text),'Region-specific user mapping and suggestions must be preserved: '+text);
for(const text of ['function maMechanismPairs(','function maAnalyzeCurrent('])
 assert(momentum.includes(text),'Momentum mechanism engine should stay unchanged: '+text);
for(const text of ['window.FoamLensPhysicsEvidenceExplorer','generalAnalysisModules','peDescriptors(','peValidate(',
 'peAssemble(','peRead(','peEl(','peChart(','peExport(','noAutomaticPhysicsInference',
 'No source-backed physical-time samples','No original OpenFOAM source'])
 assert(source.includes(text),'Evidence explorer contract missing '+text);
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'),'No remote transmission of source research');
assert(!source.includes("series.push(")&&!source.includes("pmFieldMappings.set("),
 'Source-bound Analysis must never change case data or owner field-mapping');
console.log('Granada #156 native extension, non-overlap and reused Phase/Momentum source engine PASS.');
