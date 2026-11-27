'use strict';
// Generate the same dictionaries as the embedded UI. Never use owner cases.
const fs=require('fs'),path=require('path'),assert=require('assert');
const [version,target]=process.argv.slice(2);
assert(['13','14'].includes(version));assert(target&&!fs.existsSync(target),'new disposable target required');
const code=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend/v25-case-builder.js'),'utf8');
const api=new Function(code.slice(0,code.indexOf('function flMountCaseBuilder'))+';return flCaseBuilder')();
const input={version,mode:'single',endTime:'0.02',deltaT:'0.01',writeInterval:'0.01',regions:'body|solid|solid',patches:'body|walls|wall',fields:'body|T|volScalarField|0 0 0 1 0 0 0|300',boundaries:'body|T|walls|fixedValue|310',materials:'',solidProperties:'body|2000|1000|2|50|0',schemes:'body|Euler|Gauss linear|Gauss linear corrected|linear|corrected',linearSolvers:'body|e|GAMG|symGaussSeidel|1e-8|0.1|0',pimple:'body|1|-|0|-',divSchemes:'',relaxation:'',residualControl:''};
const p=api.build(input);
fs.mkdirSync(target,{recursive:true});
for(const e of p.entries){const name=e.name.startsWith('draft/')?e.name.slice(6):e.name;const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,e.data)}
const mesh='FoamFile { version 2.0; format ascii; class dictionary; object blockMeshDict; }\nconvertToMeters 1;\nvertices ((0 0 0)(0.01 0 0)(0.01 0.01 0)(0 0.01 0)(0 0 0.01)(0.01 0 0.01)(0.01 0.01 0.01)(0 0.01 0.01));\nblocks (hex (0 1 2 3 4 5 6 7) (4 4 4) simpleGrading (1 1 1));\nedges ();\nboundary (walls { type wall; faces ((0 4 7 3)(1 2 6 5)(0 1 5 4)(3 7 6 2)(0 3 2 1)(4 5 6 7)); });\nmergePatchPairs ();\n';
fs.writeFileSync(path.join(target,'system/blockMeshDict'),mesh);
console.log('Generated actual Case Builder solid draft in disposable fixture: '+target);
