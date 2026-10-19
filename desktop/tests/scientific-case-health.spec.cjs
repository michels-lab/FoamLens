'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(dir,'v24-scientific-case-health.js'),'utf8');
const meshSource=fs.readFileSync(path.join(dir,'v20-mesh-quality-audit.js'),'utf8');
new Function(source);
const a=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_START */'),
      b=source.indexOf('/* FOAMLENS_CASE_HEALTH_CORE_END */',a);
assert(a>=0&&b>a,'scientific health core must be independently testable');
const api=new Function(source.slice(a,b)+';return{audit:chAudit,runtime:chRuntime,num:chNumber,pairs:chValidPairs,states:chStatuses}')();
const ma=meshSource.split('/* FOAMLENS_CHECKMESH_CORE_START */')[1].split('/* FOAMLENS_CHECKMESH_CORE_END */')[0];
const parsedMesh=new Function(ma+';return maPureCheckMesh')();
const mkCase=()=>({id:12,name:'Sample Source Case',rootPath:'case12',
 config:{source:{controlDict:'system/controlDict',fvSolution:'system/fvSolution'},
   endTime:10,deltaT:.002,maxCo:2,adjustTimeStep:true,nOuterCorrectors:3,nCorrectors:2},
 discoveryModel:{fields:[
  {name:'T',fieldClass:'volScalarField',dimensions:'[0 0 0 1 0 0 0]',
   boundaries:['wall','interface'],records:[{sourcePath:'case12/0/T'}]},
  {name:'U',fieldClass:'volVectorField',dimensions:'[0 1 -1 0 0 0 0]',
   boundaries:['wall'],records:[{sourcePath:'case12/0/U'}]}],
  dictionaries:[{name:'controlDict',sourcePath:'case12/system/controlDict'},
     {name:'fvSolution',sourcePath:'case12/system/fvSolution'}],
  timeDirectories:[0,1,2,3,10],regions:['metal'],postProcessing:[{functionPath:'heatFlux',records:[{sourcePath:'postProcessing/heatFlux/0/surfaceFieldValue.dat'}]}]},
 discovery:{regions:['metal']}
});
const l=(root,metric,y,extra={})=>({caseId:12,logRoot:root,logMetric:metric,t:[0,1,2],y,
  datasetType:'log',sourcePath:'case12/log.solver',derived:false,...extra});
const allLogs=()=>[
 l('Courant','courantMax',[.2,1,1.2]),
 l('U','initialResidual',[.1,.01,.001]),l('U','finalResidual',[.01,.001,.0001]),
 l('p_rgh','initialResidual',[.2,.02,.002]),l('p_rgh','finalResidual',[.02,.002,.0002]),
 l('T','initialResidual',[.5,.1,.01]),l('T','finalResidual',[.05,.01,.001]),
 l('continuity','continuityGlobal',[0,1e-9,3e-9])
];
const okLog=api.runtime('Create time\nTime = 0\nTime = 1\nTime = 10\nEnd\n','log.solver');
const okMesh=parsedMesh('Exec : checkMesh\nMesh stats\n cells: 5\n faces: 10\n 0 mesh checks failed\nMesh OK.','mesh.log');
const good=api.audit({case:mkCase(),logs:allLogs(),runtime:okLog,meshReport:okMesh});
const by=(report,key)=>{const item=report.checks.find(x=>x.id===key);assert(item,key+' omitted');return item};
assert.equal(good.overall,'not-certified','no case-wide scientific certification');
assert.equal(good.schema,'foamlens/scientific-case-health/1');
assert.equal(by(good,'fields').status,'verified');
assert.equal(by(good,'time').status,'verified');
assert.equal(by(good,'completion').status,'verified');
assert.equal(by(good,'control').status,'verified');
assert.equal(by(good,'courant').status,'verified');
assert.equal(by(good,'pimple').status,'verified');
assert.equal(by(good,'residuals').status,'verified');
assert.equal(by(good,'continuity').status,'verified');
assert.equal(by(good,'mesh').status,'verified');
assert.equal(by(good,'energy').status,'warning','energy conservation is not implied by a solver history');
assert.equal(by(good,'interfaces').status,'not-applicable');
assert(good.limitations.some(s=>s.includes('NOT')||s.includes('NEVER')));
assert.equal(good.sourceInventory.logSeries,allLogs().length);
assert(good.coverage.analyzed<good.coverage.total);
assert(!good.checks.some(x=>x.status==='error'));
assert.equal(good.checks.length,12);
const deficient=api.audit({case:{id:6,name:'partial',discoveryModel:{fields:[],timeDirectories:[],regions:[]}},logs:[]});
for(const key of ['fields','time','control','courant','residuals','continuity','mesh','dimensions']){
 const state=by(deficient,key).status;
 assert(['insufficient-information','not-analyzed'].includes(state),key+' must not default to pass: '+state)
}
assert.equal(by(deficient,'completion').status,'not-analyzed');
assert.equal(deficient.overall,'not-certified');
const failed=api.audit({case:mkCase(),logs:allLogs(),runtime:api.runtime('Time = 1\nFOAM FATAL ERROR\nEnd\n'),meshReport:parsedMesh('Exec : checkMesh\n2 mesh checks failed\n')});
assert.equal(by(failed,'completion').status,'error','fatal dominates End marker');
assert.equal(by(failed,'mesh').status,'error');
assert.equal(failed.overall,'not-certified');
const exceeded=allLogs();exceeded[0].y=[.4,2.1,3];
const warnings=api.audit({case:mkCase(),logs:exceeded,runtime:api.runtime('Time = 1\n')});
assert.equal(by(warnings,'courant').status,'warning','only case-config maxCo is used as contextual limit');
assert.equal(by(warnings,'completion').status,'warning');
const noCo=mkCase();delete noCo.config.source.controlDict;
const notAssumed=api.audit({case:noCo,logs:allLogs()});
assert.equal(by(notAssumed,'courant').status,'insufficient-information','do not apply maxCo if controlDict provenance absent');
assert.equal(by(notAssumed,'control').status,'insufficient-information');
const other=allLogs().map(x=>({...x,caseId:22}));
const cross=api.audit({case:mkCase(),logs:other});
assert.equal(by(cross,'courant').status,'insufficient-information','never use another case logs');
const malformed=allLogs();malformed[0].t=[0,1,1];malformed[0].y=[0,.2,.3];
assert.equal(by(api.audit({case:mkCase(),logs:malformed}),'courant').status,'error');
const missingFinal=allLogs().filter(s=>s.logMetric!=='finalResidual');
assert.equal(by(api.audit({case:mkCase(),logs:missingFinal}),'residuals').status,'warning');
const missingField=mkCase();missingField.discoveryModel.fields[0].dimensions='';
assert.equal(by(api.audit({case:missingField,logs:allLogs()}),'dimensions').status,'warning');
const multi=mkCase();multi.discoveryModel.regions=['metal','mold'];
assert.equal(by(api.audit({case:multi,logs:allLogs()}),'interfaces').status,'insufficient-information');
const invalid=api.audit({case:{id:null},logs:allLogs()});
assert.equal(invalid.overall,'not-assessed');
assert.equal(api.num(null)!==api.num(null),true,'null not zero');
assert(Number.isNaN(api.num('')));

assert(Number.isNaN(api.num(false)));
assert.deepEqual(api.pairs({t:[0,1],y:[0,0]}),[[0,0],[1,0]]);
assert.equal(api.pairs({t:[0,1],y:[0,null]}),null);
assert.equal(api.pairs({t:[0,0],y:[0,1]}),null);
assert.deepEqual(api.states,['verified','warning','error','insufficient-information','not-analyzed','not-applicable']);
assert.equal(api.runtime('End\n').completion,'unknown','End alone is not a recognized OpenFOAM run');
assert.equal(api.runtime('Time = 1\nTime = .5\n').nondecreasingTime,false);
assert.throws(()=>api.runtime('x'.repeat(4*1024*1024+1)),/limit/);
assert.ok(!source.includes('QuickCup'),'no thesis-specific case names in general software');
for(const token of ["chEl('chExport').disabled=false","chSourceLogRows(c)","maPureCheckMesh","chRuntime(data.text","reportBindingsVerifiedToCase:false",
    "overall:'not-certified'","not-analyzed","insufficient-information","timeDirectories",
    "function chExport()","window.FoamLensScientificCaseHealth"])
 assert(source.includes(token),'Missing scientific UI/evidence guarantee '+token);
console.log('Granada #155 scientific case-health PASS: full/partial/fatal, no false certainty, contextual Courant, mesh, PIMPLE, dimensions, region and source provenance.');
