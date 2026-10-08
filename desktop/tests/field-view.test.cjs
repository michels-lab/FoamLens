'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const programPath=path.join(root,'src','FoamLensDesktop','Program.cs');
const source=fs.readFileSync(modulePath,'utf8');
const program=fs.readFileSync(programPath,'utf8');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');
const animationSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-animation-export.js'),'utf8');
const compareSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-z-field-compare.js'),'utf8');
const plotSurfaceSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-zy-plot-surfaces.js'),'utf8');
const workspaceSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-zz-field-workspace.js'),'utf8');
const ribbonSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v15-ribbon-ui.js'),'utf8');

new Function(source);
new Function(animationSource);
new Function(compareSource);
new Function(plotSurfaceSource);
new Function(workspaceSource);
new Function(ribbonSource);

const begin='/* FOAMLENS_FIELD_VIEW_CORE_START */';
const end='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field View core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function('const cases=[];const flUi=(en)=>en;'+core+';return {fvBuildMeshInventory,fvBuildMeshFromTexts,fvNearestTime,fvAdvanceIndex,fvColorMap,fvLegendGradient,fvBuildSpatialHash,fvSeedPlane,fvSeedLine,fvSeedBox,fvSeedPatch,fvCellContainsPoint,fvPointInMesh,fvFilterSeedsInsideMesh,fvPointVectorsFromCells,fvTetraWeights,fvFindContainingCell,fvSampleMeshVectorInCell,fvCreateMeshVectorSampler,fvStreamlineSeeds,fvIntegrateStreamline,fvCombineStreamline,fvReadyRegions,fvCaseViewAvailable,fvAvailability,fvMeshFacePoints,fvCellFaces,fvPointCells,fvPointValuesFromCells,fvSliceTetra,fvBuildSliceGeometry,fvResolveFieldMeshLayout,fvCombinePartitionMeshes,fvBoundaryPatchCoverage};')();

function fvClampProxy(v,a,b){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a}
function fvFiniteRangeProxy(values){let min=Infinity,max=-Infinity,count=0;for(const raw of values||[]){const v=Number(raw);if(!Number.isFinite(v))continue;if(v<min)min=v;if(v>max)max=v;count++}return count?{valid:true,min,max,count}:{valid:false,min:NaN,max:NaN,count:0}}
function fvColorMapProxy(v,min,max){return api.fvColorMap(v,min,max,'turbo')}
function fvBuildSpatialHashProxy(centers,min,max,count){return api.fvBuildSpatialHash(centers,min,max,count)}
const vectorStart=source.indexOf('function fvAdaptiveVectorGlyphTarget');
const vectorEnd=source.indexOf('function fvRefreshSeedPatchOptions',vectorStart);
assert(vectorStart>=0&&vectorEnd>vectorStart,'Vector-analysis kernel markers missing.');
const vectorCore=source.slice(vectorStart,vectorEnd);
const vectorApi=new Function(
  'const fvState={spatialHash:null};'+
  'const fvClamp='+fvClampProxy.toString()+';'+
  'const fvFiniteRange='+fvFiniteRangeProxy.toString()+';'+
  'const fvColorMap=(v,min,max)=>[0.5,0.5,0.5];'+
  'const fvBuildSpatialHash='+fvBuildSpatialHashProxy.toString().replace('return api.fvBuildSpatialHash(centers,min,max,count)','return {buckets:new Map()}')+';'+
  vectorCore+
  ';return {fvNormalizeVectorRoi,fvVectorCellInRoi,fvVectorEligibleCells,fvSelectVectorGlyphCells,fvBuildVectorGlyphBuffers};'
)();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-12){assert(Math.abs(Number(a)-Number(b))<=e,`${a} != ${b}`)}

function foamFile(cls,obj,body){
  return 'FoamFile\n{\n format ascii;\n class '+cls+';\n object '+obj+';\n}\n'+body+'\n';
}

const points=foamFile('vectorField','points','8\n(\n(0 0 0)\n(1 0 0)\n(1 1 0)\n(0 1 0)\n(0 0 1)\n(1 0 1)\n(1 1 1)\n(0 1 1)\n)');
const faces=foamFile('faceList','faces','6\n(\n4(0 3 2 1)\n4(4 5 6 7)\n4(0 1 5 4)\n4(1 2 6 5)\n4(2 3 7 6)\n4(3 0 4 7)\n)');
const owner=foamFile('labelList','owner','6\n(\n0\n0\n0\n0\n0\n0\n)');
const neighbour=foamFile('labelList','neighbour','0\n(\n)');

test('browser fallback parses a one-cell OpenFOAM cube mesh',()=>{
  const mesh=api.fvBuildMeshFromTexts(points,faces,owner,neighbour);
  assert.equal(mesh.supported,true);
  assert.equal(mesh.pointCount,8);
  assert.equal(mesh.faceCount,6);
  assert.equal(mesh.internalFaceCount,0);
  assert.equal(mesh.boundaryFaceCount,6);
  assert.equal(mesh.cellCount,1);
  assert.equal(mesh.surfaceOwners.length,12);
  assert.equal(mesh.surfaceTriangles.length,36);
  assert.equal(mesh.surfaceEdges.length,24);
  assert.equal(mesh.faceOffsets.length,7);
  assert.equal(mesh.facePoints.length,24);
  assert.equal(mesh.owners.length,6);
  assert.equal(mesh.neighbours.length,0);
  assert.deepEqual(mesh.faceOffsets,[0,4,8,12,16,20,24]);
  assert.deepEqual(mesh.boundsMin,[0,0,0]);
  assert.deepEqual(mesh.boundsMax,[1,1,1]);
  assert(Math.abs(mesh.cellCenters[0]-.5)<1e-12);
  assert(Math.abs(mesh.cellCenters[1]-.5)<1e-12);
  assert(Math.abs(mesh.cellCenters[2]-.5)<1e-12);
});

test('polyhedral cell centroid is volume weighted on an asymmetric square pyramid',()=>{
  const pyramidPoints=foamFile('vectorField','points','5\n(\n(-1 -1 0)\n(1 -1 0)\n(1 1 0)\n(-1 1 0)\n(0 0 3)\n)');
  const pyramidFaces=foamFile('faceList','faces','5\n(\n4(0 3 2 1)\n3(0 1 4)\n3(1 2 4)\n3(2 3 4)\n3(3 0 4)\n)');
  const pyramidOwner=foamFile('labelList','owner','5\n(\n0\n0\n0\n0\n0\n)');
  const pyramidNeighbour=foamFile('labelList','neighbour','0\n(\n)');
  const mesh=api.fvBuildMeshFromTexts(pyramidPoints,pyramidFaces,pyramidOwner,pyramidNeighbour);
  assert.equal(mesh.supported,true);
  near(mesh.cellCenters[0],0,1e-12);
  near(mesh.cellCenters[1],0,1e-12);
  near(mesh.cellCenters[2],.75,1e-12);
  assert.notEqual(mesh.cellCenters[2],.8,'regressed to mean of face centres');
  assert.equal(mesh.cellCenterMethod,'volume-weighted-polyhedral');
});

test('polyMesh slice reconstruction cuts a unit cube at the requested plane',()=>{
  const mesh=api.fvBuildMeshFromTexts(points,faces,owner,neighbour);
  const cut=api.fvBuildSliceGeometry(mesh,[10],'x',.37);
  assert(cut.triangleCount>0);
  assert.equal(cut.positions.length,cut.triangleCount*9);
  assert.equal(cut.values.length,cut.triangleCount*3);
  for(let i=0;i<cut.positions.length;i+=3)assert(Math.abs(cut.positions[i]-.37)<1e-6,'slice vertex escaped x=0.37');
  for(const v of cut.values)assert(Math.abs(v-10)<1e-9,'uniform cell value was not preserved on slice');
  let area=0;
  for(let i=0;i<cut.positions.length;i+=9){
    const y0=cut.positions[i+1],z0=cut.positions[i+2],y1=cut.positions[i+4],z1=cut.positions[i+5],y2=cut.positions[i+7],z2=cut.positions[i+8];
    area+=Math.abs((y1-y0)*(z2-z0)-(z1-z0)*(y2-y0))*.5;
  }
  assert(Math.abs(area-1)<1e-5,'unit-cube slice area should be 1, got '+area);
  assert(/tetrahedralization/.test(cut.interpolation));
});

test('mesh inventory recognizes default and named-region polyMesh groups',()=>{
  const files=[];
  for(const name of ['points','faces','owner','neighbour']){
    files.push({name,webkitRelativePath:'case/constant/polyMesh/'+name,size:10});
    files.push({name,webkitRelativePath:'case/constant/fluid/polyMesh/'+name,size:10});
  }
  const inv=api.fvBuildMeshInventory(files,'case');
  assert.equal(inv.length,2);
  assert(inv.every(x=>x.complete));
  assert.deepEqual(inv.map(x=>x.region),['','fluid']);
});

test('mesh inventory keeps reconstructed and processor-local polyMesh states separate',()=>{
  const files=[];
  for(const prefix of ['case/constant/metal/polyMesh','case/processor0/constant/metal/polyMesh','case/processor1/constant/metal/polyMesh'])
    for(const name of ['points','faces','owner','neighbour','boundary'])
      files.push({name,webkitRelativePath:prefix+'/'+name,size:10});
  const inv=api.fvBuildMeshInventory(files,'case');
  assert.equal(inv.length,3);
  assert.deepEqual(inv.map(x=>x.partition),['','processor0','processor1']);
  assert(inv.every(x=>x.region==='metal'&&x.complete));
  assert(inv[0].sourcePaths.points.includes('/constant/metal/polyMesh/points'));
  assert(inv[1].sourcePaths.points.includes('/processor0/constant/metal/polyMesh/points'));
  assert(inv[2].sourcePaths.points.includes('/processor1/constant/metal/polyMesh/points'));
});

test('processor dynamic mesh snapshots inherit only within their own partition',()=>{
  const files=[];
  for(const p of ['processor0','processor1'])for(const name of ['points','faces','owner','neighbour'])
    files.push({name,webkitRelativePath:'case/'+p+'/constant/polyMesh/'+name,size:10});
  files.push({name:'points',webkitRelativePath:'case/processor0/1/polyMesh/points',size:10});
  const inv=api.fvBuildMeshInventory(files,'case');
  const p0=inv.find(x=>x.partition==='processor0'),p1=inv.find(x=>x.partition==='processor1');
  assert.equal(p0.dynamic,true);assert.deepEqual(p0.dynamicTimes,[1]);
  assert.equal(p1.dynamic,false);assert.deepEqual(p1.dynamicTimes,[]);
  assert(p0.snapshots[0].sourcePaths.points.includes('/processor0/1/polyMesh/points'));
  assert(p0.snapshots[0].sourcePaths.faces.includes('/processor0/constant/polyMesh/faces'));
  assert(p1.sourcePaths.points.includes('/processor1/constant/polyMesh/points'));
});

test('multi-region cases enable Field View when a meshed region has volume fields',()=>{
  const c={meshInventory:[{region:'metal',complete:true},{region:'mold',complete:true}],discoveryModel:{fields:[
    {region:'metal',storage:'volume',kind:'scalar',times:[0,1],name:'T'},
    {region:'metal',storage:'volume',kind:'vector',times:[0,1],name:'U'},
    {region:'mold',storage:'volume',kind:'scalar',times:[0,1],name:'T'}
  ]}};
  assert.equal(api.fvCaseViewAvailable(c),true);
  assert.equal(api.fvCaseViewAvailable({meshInventory:[{region:'metal',complete:true}],discoveryModel:{fields:[{region:'mold',storage:'volume',kind:'scalar',times:[0]}]}}),false);
  assert.equal(api.fvCaseViewAvailable({meshInventory:[{region:'metal',complete:true}],discoveryModel:{fields:[{region:'metal',storage:'point',kind:'scalar',times:[0],name:'pointT'}]}}),true);
  assert.equal(api.fvCaseViewAvailable({meshInventory:[{region:'metal',complete:true}],discoveryModel:{fields:[{region:'metal',storage:'surface',kind:'vector',times:[0],name:'phiFace'}]}}),true);
});

test('Field View excludes a mesh-only default region when named regions contain compatible fields',()=>{
  const c={meshInventory:[
    {region:'',complete:true,baseComplete:true,baseFiles:{},baseSourcePaths:{},snapshots:[]},
    {region:'metal',complete:true,baseComplete:true,baseFiles:{},baseSourcePaths:{},snapshots:[]},
    {region:'mold',complete:true,baseComplete:true,baseFiles:{},baseSourcePaths:{},snapshots:[]}
  ],discoveryModel:{fields:[
    {region:'metal',storage:'volume',kind:'scalar',times:[0,1],name:'T'},
    {region:'metal',storage:'volume',kind:'vector',times:[0,1],name:'U'},
    {region:'mold',storage:'volume',kind:'scalar',times:[0,1],name:'T'}
  ]}};
  assert.deepEqual(api.fvReadyRegions(c),['metal','mold']);
  const a=api.fvAvailability(c);
  assert.equal(a.ready,true);
  assert.deepEqual(a.sharedRegions,['metal','mold']);
  assert(!a.sharedRegions.includes(''));
});

test('field-to-mesh layout resolves processor partitions one-to-one',()=>{
  const c={meshInventory:[
    {partition:'processor0',region:'metal',complete:true},
    {partition:'processor1',region:'metal',complete:true}
  ]};
  const g={records:[
    {partition:'processor0',time:1,sourcePath:'processor0/1/metal/T'},
    {partition:'processor1',time:1,sourcePath:'processor1/1/metal/T'}
  ]};
  const x=api.fvResolveFieldMeshLayout(c,'metal',g,1);
  assert.equal(x.valid,true);assert.equal(x.mode,'decomposed');
  assert.deepEqual(x.parts.map(p=>p.partition),['processor0','processor1']);
  assert.equal(x.parts[0].record.sourcePath,'processor0/1/metal/T');
  assert.equal(x.parts[1].record.sourcePath,'processor1/1/metal/T');
});

test('field-to-mesh layout rejects a missing processor mesh instead of borrowing another topology',()=>{
  const c={meshInventory:[{partition:'processor0',region:'metal',complete:true}]};
  const g={records:[
    {partition:'processor0',time:1},
    {partition:'processor1',time:1}
  ]};
  const x=api.fvResolveFieldMeshLayout(c,'metal',g,1);
  assert.equal(x.valid,false);assert.equal(x.mode,'invalid');
  assert.equal(x.reason,'mesh-partition-missing:processor1');
});

test('reconstructed field and mesh take precedence over processor copies',()=>{
  const reconstructed={partition:'',region:'metal',complete:true};
  const c={meshInventory:[reconstructed,{partition:'processor0',region:'metal',complete:true}]};
  const g={records:[{partition:'',time:1,sourcePath:'1/metal/T'},{partition:'processor0',time:1,sourcePath:'processor0/1/metal/T'}]};
  const x=api.fvResolveFieldMeshLayout(c,'metal',g,1);
  assert.equal(x.valid,true);assert.equal(x.mode,'reconstructed');
  assert.equal(x.record.sourcePath,'1/metal/T');
  assert.equal(x.meshGroup,reconstructed);
});

test('decomposed mesh composition keeps processor interfaces out of the physical surface',()=>{
  const make=(partition,shift,patches)=>({
    supported:true,points:[shift,0,0, shift+1,0,0, shift,1,0, shift,0,1],
    faceOffsets:[0,3,6,9,12],facePoints:[0,2,1, 0,1,3, 1,2,3, 2,0,3],
    owners:[0,0,0,0],neighbours:[],cellCenters:[shift+.25,.25,.25],
    pointCount:4,faceCount:4,internalFaceCount:0,boundaryFaceCount:4,cellCount:1,
    boundsMin:[shift,0,0],boundsMax:[shift+1,1,1],boundaryPatches:patches,sourceBytes:100
  });
  const p0=make('processor0',0,[{name:'wall0',type:'wall',startFace:0,nFaces:3},{name:'proc0to1',type:'processor',startFace:3,nFaces:1}]);
  const p1=make('processor1',1,[{name:'proc1to0',type:'processor',startFace:0,nFaces:1},{name:'wall1',type:'wall',startFace:1,nFaces:3}]);
  assert.equal(api.fvBoundaryPatchCoverage(p0).valid,true);
  assert.equal(api.fvBoundaryPatchCoverage(p1).valid,true);
  const m=api.fvCombinePartitionMeshes([{partition:'processor0',mesh:p0},{partition:'processor1',mesh:p1}]);
  assert.equal(m.supported,true);
  assert.equal(m.decomposed,true);
  assert.equal(m.pointCount,8);assert.equal(m.cellCount,2);assert.equal(m.faceCount,8);
  assert.deepEqual(m.partitions,['processor0','processor1']);
  assert.deepEqual(m.partitionRanges.map(r=>[r.partition,r.cellStart,r.cellCount,r.pointStart,r.pointCount]),[
    ['processor0',0,1,0,4],['processor1',1,1,4,4]
  ]);
  const processorFaces=new Set(m.boundaryPatches.filter(p=>p.processor).flatMap(p=>Array.from({length:p.nFaces},(_,i)=>p.startFace+i)));
  assert.deepEqual([...processorFaces].sort((a,b)=>a-b),[3,4]);
  assert.equal(m.surfaceOwners.length,6);
  assert(m.surfaceTriangleFaces.every(fi=>!processorFaces.has(fi)),'processor interface leaked into physical surface');
});

test('decomposed composition refuses mesh partitions without complete patch topology',()=>{
  const mesh={supported:true,points:[0,0,0],faceOffsets:[0,1],facePoints:[0],owners:[0],neighbours:[],cellCenters:[0,0,0],pointCount:1,faceCount:1,internalFaceCount:0,boundaryFaceCount:1,cellCount:1,boundaryPatches:[]};
  const m=api.fvCombinePartitionMeshes([{partition:'processor0',mesh}]);
  assert.equal(m.supported,false);
  assert(/boundary-patches-missing/.test(m.reason));
});

test('time navigation uses physical values without index assumptions',()=>{
  assert.equal(api.fvNearestTime([0,.1,.4,1],.31),.4);
  assert.equal(api.fvAdvanceIndex(2,1,4),3);
  assert.equal(api.fvAdvanceIndex(3,1,4),3);
  assert.equal(api.fvAdvanceIndex(0,-1,4),0);
});

test('colormap stays finite and normalized',()=>{
  for(const palette of ['viridis','turbo','coolwarm']){
    for(const v of [-1,0,.5,1,2]){
      const c=api.fvColorMap(v,0,1,palette);
      assert.equal(c.length,3);
      assert(c.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
    }
  }
});

test('legend gradient follows the selected colormap',()=>{
  const viridis=api.fvLegendGradient('viridis'),turbo=api.fvLegendGradient('turbo'),coolwarm=api.fvLegendGradient('coolwarm');
  assert(/^linear-gradient\(90deg,/.test(viridis));
  assert.notEqual(viridis,turbo);
  assert.notEqual(viridis,coolwarm);
  assert.notEqual(turbo,coolwarm);
});

test('mesh-aware streamline sampler preserves a uniform vector exactly inside a real cell',()=>{
  const mesh=api.fvBuildMeshFromTexts(points,faces,owner,neighbour),hash=api.fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount),sampler=api.fvCreateMeshVectorSampler(mesh,hash,[[2,-3,4]]);
  for(const p of [[.5,.5,.5],[.2,.3,.4],[.8,.7,.6]]){
    const v=sampler(p);assert(v,'mesh-aware sampler rejected an interior cube point');near(v[0],2,1e-10);near(v[1],-3,1e-10);near(v[2],4,1e-10)
  }
  assert.equal(sampler([1.2,.5,.5]),null);
});

test('streamline integrator follows a uniform cell-centred velocity field',()=>{
  const centers=[],vectors=[];
  for(let i=0;i<12;i++){centers.push(.25+i*.5,.5,.5);vectors.push([1,0,0])}
  const min=[0,0,0],max=[6,1,1];
  const hash=api.fvBuildSpatialHash(centers,min,max,vectors.length);
  const line=api.fvIntegrateStreamline([1,.5,.5],hash,centers,vectors,min,max,1,.1,25);
  assert(line.length>8);
  assert(line.at(-1).p[0]>line[0].p[0]);
  assert(line.every(q=>Number.isFinite(q.speed)));
});

test('streamline seed density is real up to the advertised 400 seeds',()=>{
  const min=[0,0,0],max=[1,2,3];
  assert.equal(api.fvSeedPlane(min,max,'x',100,.5).length,100);
  assert.equal(api.fvSeedPlane(min,max,'y',400,.25).length,400);
  assert.equal(api.fvSeedLine(min,max,'z',73,.5).length,73);
  assert.equal(api.fvSeedBox(min,max,125).length,125);
});

test('volume seed modes reject points that are only inside the bounding box but outside the actual polyhedral mesh',()=>{
  const pyramidPoints=foamFile('vectorField','points','5\n(\n(-1 -1 0)\n(1 -1 0)\n(1 1 0)\n(-1 1 0)\n(0 0 3)\n)');
  const pyramidFaces=foamFile('faceList','faces','5\n(\n4(0 3 2 1)\n3(0 1 4)\n3(1 2 4)\n3(2 3 4)\n3(3 0 4)\n)');
  const pyramidOwner=foamFile('labelList','owner','5\n(\n0\n0\n0\n0\n0\n)');
  const pyramidNeighbour=foamFile('labelList','neighbour','0\n(\n)');
  const mesh=api.fvBuildMeshFromTexts(pyramidPoints,pyramidFaces,pyramidOwner,pyramidNeighbour);
  assert.equal(api.fvCellContainsPoint(mesh,0,[0,0,.75]),true);
  assert.equal(api.fvPointInMesh(mesh,[0,0,.75]),true);
  assert.equal(api.fvPointInMesh(mesh,[.9,.9,2.5]),false,'bounding-box-only point leaked into the pyramid mesh');
  const seeds=api.fvStreamlineSeeds(mesh,{mode:'box',count:80});
  assert(seeds.length>0&&seeds.length<=80);
  assert(seeds.every(p=>api.fvPointInMesh(mesh,p)),'Box seeding emitted a point outside the real cell geometry');
});

test('boundary-patch seeding uses actual patch faces and nudges seeds inward',()=>{
  const mesh={
    points:[0,0,0, 1,0,0, 1,1,0, 0,1,0],
    faceOffsets:[0,4],facePoints:[0,1,2,3],owners:[0],
    cellCenters:[.5,.5,.5],boundsMin:[0,0,0],boundsMax:[1,1,1],
    boundaryPatches:[{name:'wall',sourceName:'wall',type:'wall',startFace:0,nFaces:1}]
  };
  const seeds=api.fvSeedPatch(mesh,'wall',4);
  assert.equal(seeds.length,4);
  assert(seeds.every(p=>p[2]>0&&p[2]<1e-3),'patch seeds were not nudged into the owner cell');
});

test('streamline direction and physical path-length controls are enforced',()=>{
  const centers=[],vectors=[];
  for(let i=0;i<24;i++){centers.push(.125+i*.25,.5,.5);vectors.push([1,0,0])}
  const min=[0,0,0],max=[6,1,1],hash=api.fvBuildSpatialHash(centers,min,max,vectors.length),seed=[3,.5,.5];
  const forward=api.fvCombineStreamline(seed,hash,centers,vectors,min,max,{direction:'forward',step:.1,maxSteps:100,maxLength:.35});
  const backward=api.fvCombineStreamline(seed,hash,centers,vectors,min,max,{direction:'backward',step:.1,maxSteps:100,maxLength:.35});
  const both=api.fvCombineStreamline(seed,hash,centers,vectors,min,max,{direction:'both',step:.1,maxSteps:100,maxLength:.7});
  assert(forward.at(-1).p[0]>forward[0].p[0]);
  assert(backward.at(-1).p[0]<backward[0].p[0]);
  assert(forward.at(-1).distance<=.35+1e-9);
  assert(backward.at(-1).distance<=.35+1e-9);
  assert(both.length>forward.length);
});

test('Field View product module is wired to native mesh, transient fields and WebGL',()=>{
  for(const token of ['parseOpenFOAMMesh','pmLoadFieldSet','pmComponentValues','getContext(\'webgl2\'','fvIntegrateStreamline','fvBuildVectorGlyphBuffers','fvBuildSliceGeometry','fvUpdateSlice','slicePos','fieldViewPanel','fieldViewControls','fvVectors','fvStreamlines','id="fvSlice"','id="fvSliceAxis"','id="fvSlicePosition"','id="fvSliceOpacity"','not claimed to be bit-identical to ParaView/VTK']){
    assert(source.includes(token),'Missing Field View wiring token: '+token);
  }
  assert(!source.includes("setDataView('field3d')"),'Field View wiring regressed to the retired Data navigation path.');
});


test('3D case switching preserves the explicit user selection and invalidates stale case work',()=>{
  for(const token of [
    'async function fvHandleCaseChange()',
    'fvState.caseId=selectedId',
    '++fvState.frameSeq',
    '++fvState.prefetchSeq',
    '++fvState.globalRangeSeq',
    'fvState.mesh=null',
    'fvState.globalRange=null',
    'fvRefreshSelectors(true)',
    "await fvLoadSelection()",
    "3D case switch did not persist",
    "3D renderer is not bound to the selected case"
  ])assert(source.includes(token),'Missing safe 3D case-switch token: '+token);
  assert(!source.includes("document.getElementById('fvCase').onchange=()=>{fvRefreshSelectors(false);fvLoadSelection()}"),
    '3D Case onchange still discards the case selected by the user.');
  assert(source.includes("document.getElementById('fvCase').onchange=()=>fvHandleCaseChange()"),
    '3D Case selector is not wired through the safe case-switch handler.');
});

test('vector ROI sampling selects only cells inside normalized mesh bounds',()=>{
  const mesh={boundsMin:[0,0,0],boundsMax:[10,2,2],cellCenters:[]};
  const vectors=[];
  for(let i=0;i<10;i++){mesh.cellCenters.push(i+.5,1,1);vectors.push([i+1,0,0])}
  const roi=vectorApi.fvNormalizeVectorRoi(mesh,{enabled:true,min:[.2,0,0],max:[.6,1,1]});
  assert.equal(roi.enabled,true);
  near(roi.worldMin[0],2);near(roi.worldMax[0],6);
  const eligible=vectorApi.fvVectorEligibleCells(mesh,vectors,roi);
  assert.deepEqual(eligible,[2,3,4,5]);
  const selected=vectorApi.fvSelectVectorGlyphCells(mesh,vectors,3,roi);
  assert.equal(selected.length,3);
  assert(selected.every(i=>eligible.includes(i)),'ROI sampler selected a cell outside the ROI.');
  assert(selected.every(i=>vectorApi.fvVectorCellInRoi(mesh,i,roi)));
});

test('normalized vector glyphs keep equal arrow length while magnitude mode preserves relative magnitude',()=>{
  const mesh={boundsMin:[0,0,0],boundsMax:[4,1,1],cellCenters:[.5,.5,.5,1.5,.5,.5,2.5,.5,.5,3.5,.5,.5]};
  const vectors=[[1,0,0],[2,0,0],[4,0,0],[8,0,0]];
  const fixed=vectorApi.fvBuildVectorGlyphBuffers(mesh,vectors,4,1,{lengthMode:'normalized'});
  const scaled=vectorApi.fvBuildVectorGlyphBuffers(mesh,vectors,4,1,{lengthMode:'magnitude'});
  assert.equal(fixed.glyphCount,4);assert.equal(scaled.glyphCount,4);
  assert.equal(fixed.lengthMode,'normalized');assert.equal(scaled.lengthMode,'magnitude');
  assert(fixed.lengths.every(x=>Math.abs(x-fixed.lengths[0])<1e-12),'Normalized arrows do not have a constant length.');
  assert(scaled.lengths[3]>scaled.lengths[2]&&scaled.lengths[2]>scaled.lengths[1]&&scaled.lengths[1]>scaled.lengths[0],
    'Magnitude-proportional arrows do not increase with vector magnitude.');
  near(scaled.lengths[3]/scaled.lengths[0],8,1e-10);
  near(scaled.lengths[2]/scaled.lengths[0],4,1e-10);
});

test('vector glyph metadata distinguishes requested eligible and actually rendered cells',()=>{
  const mesh={boundsMin:[0,0,0],boundsMax:[8,1,1],cellCenters:[]},vectors=[];
  for(let i=0;i<8;i++){mesh.cellCenters.push(i+.5,.5,.5);vectors.push([i===2?0:i+1,0,0])}
  const roi={enabled:true,min:[.25,0,0],max:[.75,1,1]};
  const glyph=vectorApi.fvBuildVectorGlyphBuffers(mesh,vectors,20,1,{lengthMode:'normalized',roi});
  assert.equal(glyph.requested,20);
  assert.equal(glyph.eligibleCount,4);
  assert.equal(glyph.selectedCells.length,3,'zero-magnitude eligible cell should not render a glyph');
  assert.equal(glyph.glyphCount,3);
  assert(glyph.selectedCells.every(i=>i>=2&&i<=5));
});

test('vector and streamline visualization expose independent real-resolution controls',()=>{
  for(const token of [
    'fvVectorControls','fvStreamlineControls','fvVectorResolution','fvVectorScale','fvVectorLengthMode','fvVectorRoiMode','fvVectorRoiControls',
    'Vector resolution','Seed density','max="400"','value="100"',
    'fvSeedMode','fvSeedPatch','fvStreamDirection','fvStreamStepPct','fvStreamMaxSteps','fvStreamMaxLengthPct',
    'Boundary patch','Box / Volume','Forward','Backward','integration points','fvPointInMesh','fvFilterSeedsInsideMesh','requestedSeeds',
    'fvAdaptiveVectorGlyphTarget','fvVectorGlyphTarget','fvVectorGlyphScale',
    'fvNormalizeVectorRoi','fvVectorEligibleCells','fvVectorCellInRoi','fvSelectVectorGlyphCells','glyphCount','requested','eligibleCount','lengthMode',
    "document.getElementById('fvVectorControls')?.classList.toggle('hidden'",
    "document.getElementById('fvStreamlineControls')?.classList.toggle('hidden'"
  ])assert(source.includes(token),'Missing flow-resolution control token: '+token);
  assert(!source.includes('fvBuildVectorGlyphBuffers(mesh,vectors,280)'),
    'Vector glyph density is still hard-coded to 280.');
  assert(source.includes('option value="2400"'),
    'High-resolution 2400-glyph option is missing.');
});

test('Field navigation is owned by the Ribbon with no legacy mode-button fallback',()=>{
  assert(!workspaceSource.includes('createdModeButton'),
    'Field workspace still creates a legacy modeField fallback.');
  assert(!workspaceSource.includes("b.id='modeField'"),
    'Field workspace still synthesizes the hidden legacy Field navigation button.');
  assert(ribbonSource.includes("document.getElementById('modeField')?.remove()"),
    'Ribbon does not retire the legacy Field button after mounting.');
  assert(!ribbonSource.includes("flRibbonClick('modeField')"),
    'Ribbon still falls back to the hidden legacy Field button.');
});

test('Field View is a top-level Ribbon workspace instead of a Data dataset sub-tab',()=>{
  for(const token of [
    "body.appMode-field #fieldSurface{display:block}",
    "setAppMode=function(mode){if(mode==='field')"
  ])assert(workspaceSource.includes(token),'Missing top-level Field workspace token: '+token);
  assert(!workspaceSource.includes("setDataView=function(mode){if(mode==='field3d'"),
    'Field workspace still aliases 3D through Data navigation.');
  assert(!source.includes("setDataView=function(mode){if(mode==='field3d'"),
    'Field View still patches Data navigation for 3D.');
  assert(!source.includes("tab.id='fieldViewTab'"),
    'Field View still creates a legacy Data dataset tab.');
  assert(source.includes("if(document.getElementById('fieldViewControls')&&document.getElementById('fieldViewPanel'))return true"),
    'Field View installation is not keyed to its owned Field UI.');
});


test('multi-view workspace supports linked or independent cameras and visual settings',()=>{
  for(const token of [
    'fcLinkCameras','fcResyncCameras','fcFitAll','fcSyncVisuals',
    'fcCloneCamera','fcCameraFor','fcCamerasLinked','fcFitAllCameras','fcResyncCameras',
    'fcView2Palette','fcView2Opacity','fcView2Surface','fcView2Edges','fcView2Slice','fcView2Iso',
    'fcView2Vectors','fcView2Streamlines','fcVisualsSynced','fcVisualFor',
    "if(!fcVisualsSynced())","camera:null,visual:null"
  ])assert(compareSource.includes(token),'Missing independent multi-view token: '+token);
});

test('Field workspace can define a native Spatial Profile by picking A and B in 3D',()=>{
  for(const token of [
    'fwDraw3DProfile','fw3DProfileSamples','fwClear3DProfile','fw3DProfileOverlay',
    'fwHandle3DProfileClick','fpPickAtEvent','fwSampleFieldAtPoint','fwBuild3DLineProfile',
    "datasetType:'profile'","derivedKind:'field3d_line_profile'",
    "profileAxis:'s'","profilePointA","profilePointB","profileSampleCount",
    'toggle3DProfile','build3DProfile','get3DProfile'
  ])assert((workspaceSource+'\n'+source).includes(token),'Missing 3D-defined Spatial Profile token: '+token);
});

test('Field workspace shows one view by default and supports explicit 3D + Spatial Profile Split',()=>{
  for(const token of [
    'fw3DHost','fw2DHost','fwCompanion','Spatial Profile','fwSetCompanion',
    'data-fw-view="3d"','data-fw-view="profile"','data-fw-view="split"',
    "fwState={active:false,companion:'profile',layout:'3d',view:'3d'",
    "view==='split'","fwSetLayout('split')",
    "FoamLensPlotSurfaces?.ensure?.('field',host)",
    "FoamLensPlotSurfaces?.activate?.('field',host,{restore:false})",
    "fwAdoptFieldNode('fieldViewPanel','fw3DHost')","fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')",
    'fwSyncCompanionTime','applyProfileTimeValue'
  ])assert(workspaceSource.includes(token),'Missing explicit Field view/Split token: '+token);
  assert(!workspaceSource.includes("fwMove('canvas'?.parentElement?.id"),
    'Dead/invalid canvas move remains in the Field workspace.');
  assert(!workspaceSource.includes('appendChild(chart)'),
    'Field workspace still reparents the shared 2D chart.');
  assert(!workspaceSource.includes('fwRestoreCompanionNodes'),
    'Field workspace still contains the legacy shared-chart restore path.');
  assert(plotSurfaceSource.includes("['data',{view:currentDataView||'timeseries'"),
    'Stable Data / Analysis / Field plot-surface state is missing.');
});

test('Field workspace Time Series can derive curves directly from selectable 3D OpenFOAM fields',()=>{
  for(const token of [
    'fwFieldTsControls','fwTsEnable2','fwTsSource${slot}','fwTsFieldSource${slot}',
    'fwTsCase${slot}','fwTsRegion${slot}','fwTsField${slot}','fwTsComponent${slot}',
    'fwTsStat${slot}','fwBuildFieldTimeSeries','fwBuildOneFieldHistory',
    'fvLoadFrameData(c,group,region,times[i],component',
    "derivedKind:'field_history_workspace'",
    "datasetType:'timeseries'",
    '3D field history'
  ])assert(workspaceSource.includes(token),'Missing 3D-derived Time Series token: '+token);
  assert(workspaceSource.includes("stat==='delta'"),'3D field Time Series does not expose delta as a temporal statistic.');
  assert(workspaceSource.includes('timeSeriesOptionsBase().length||fieldHistoryAvailable'),'Field workspace still treats Time Series as unavailable when only 3D fields exist.');
});

test('Field workspace exposes multi-case 3D controls instead of hiding comparison inside Analysis',()=>{
  for(const token of [
    'fwAdd3DView','+ Add 3D View','Configure 3D views','fcEnabled','fcExtraAdd',
    'FC_MAX_TOTAL_VIEWS','fcExtraViews','fcCase','fcField','fcComponent',
    'Each 3D view has its own case · region · field · component'
  ])assert((workspaceSource+'\n'+compareSource).includes(token),'Missing visible multi-case 3D token: '+token);
  assert(compareSource.includes('FC_MAX_TOTAL_VIEWS=4'),'3D comparison no longer supports four synchronized views.');
  for(const token of [
    "fcExtra'+id+'Case","fcExtra'+id+'Region","fcExtra'+id+'Field","fcExtra'+id+'Component",
    "for(const suffix of ['Case','Region','Field','Component'])"
  ])assert(compareSource.includes(token),'Views C/D lost independent case/region/field/component selection: '+token);
});

test('multi-view layout coalesces its render cascade without racing explicit high-resolution renders',()=>{
  for(const token of [
    'let fcLayoutRenderFrame=0',
    'function fcPerformLayoutRender()',
    'const primaryRender=fvRender.__fcBase||fvRender',
    'function fcFlushLayoutRender()',
    'cancelAnimationFrame(fcLayoutRenderFrame)',
    'function fcScheduleLayoutRender()',
    'fcLayoutRenderFrame=requestAnimationFrame',
    'fvRender.__fcBase=previous',
    'flushLayoutRender:fcFlushLayoutRender',
    'fcUpdateStatsGrid()',
    'window.FoamLensFieldWorkspace?.promoteCaseSelectors?.()',
    'fcScheduleLayoutRender()'
  ])assert(compareSource.includes(token),'Missing multi-view render coalescing/high-resolution safety token: '+token);
  const updateLayout=compareSource.match(/function fcUpdateLayout\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
  assert(updateLayout.indexOf('fcUpdateStatsGrid()')>=0&&updateLayout.indexOf('fcScheduleLayoutRender()')>updateLayout.indexOf('fcUpdateStatsGrid()'),
    'Field comparison stats must be refreshed before the single coalesced layout render.');
  assert(!compareSource.includes('setTimeout(()=>{fvRender();fcRender();fcRenderDifference();fcRenderExtras()},0)'),
    'Multi-view layout still renders the comparison cascade twice.');
});

test('all visible synchronized 3D views remain eligible for the same exported animation',()=>{
  for(const token of [
    'vaDescriptorList','getVideoDescriptors','All synchronized 3D views are composited into the same video',
    'Visible views are included in video export'
  ])assert((animationSource+'\n'+workspaceSource).includes(token),'Missing multi-view video token: '+token);
});

test('Field View exposes explicit 3D navigation presets and an interactive XYZ gizmo',()=>{
  for(const token of [
    'fvOrbitMode','fvPanMode','fvZoomMode','fvFitCamera',
    'data-fv-view="front"','data-fv-view="back"','data-fv-view="left"','data-fv-view="right"',
    'data-fv-view="top"','data-fv-view="bottom"','data-fv-view="iso"',
    'fvAxisGizmo','data-axis-button="x"','data-axis-button="y"','data-axis-button="z"',
    'fvCameraPreset','fvCameraPanPixels','fvCameraZoomFactor','fvUpdateAxisGizmo'
  ])assert(source.includes(token),'Missing 3D navigation token: '+token);
  assert(source.includes("e.button===1||e.button===2?'pan'"),'Middle/right-drag pan fallback is missing.');
  assert(source.includes("canvas.addEventListener('dblclick',fvCameraFitCurrent)"),'Double-click fit behavior is missing.');
});


test('Field View uses intelligent color ranges with adaptive precision and explicit delta',()=>{
  for(const token of [
    'Smart · current frame','Global · all times','fvRangeMode','fvRangeMin','fvRangeMax',
    'fvFmtRange','fvRangeUniform','Uniform field','<span>Δ</span>','fvComputeGlobalRange'
  ])assert(source.includes(token),'Missing intelligent range token: '+token);
  assert(!source.includes('id="fvLockRange"'),'Obsolete Lock color range checkbox is still present.');
});

test('Field View prefetches temporal fields through one bounded shared LRU cache',()=>{
  for(const token of [
    'fieldInflight:new Map()','fvLoadFieldSetCached','fvSchedulePrefetch',
    'index+1,index+2,index-1','fvCacheLimit','fvSetCacheLimitMb','Prefetching'
  ])assert(source.includes(token),'Missing Field View prefetch token: '+token);
  for(const token of [
    'let pmFieldCacheLimit=512*1024*1024','function pmFieldCacheGet','function pmFieldCachePut',
    'function pmFieldCacheTrim','function pmSetFieldCacheLimit','function pmFieldCacheStats',
    'function pmClearFieldCache(){pmFieldCache.clear();pmFieldCacheBytes=0}'
  ])assert(index.includes(token),'Missing bounded shared field-cache token: '+token);
  assert(!index.includes('function pmClearFieldCache(){pmClearFieldCache()'),'Shared field-cache clear became recursive.');
});

test('non-primary canvases are no longer globally forced absolute over the application',()=>{
  assert(index.includes('.chartwrap > canvas#canvas{position:absolute;inset:0;width:100%;height:100%}'),
    'Primary 2D canvas does not have a scoped layout rule.');
  assert(!index.includes('\ncanvas{position:absolute;inset:0;width:100%;height:100%}'),
    'A global absolute canvas rule can overlay unrelated 3D/analysis canvases.');
});

test('Field View exports synchronized multi-view animation with fixed scientific ranges',()=>{
  for(const token of [
    'Animation / Video','fvVideoStart','fvVideoEnd','fvVideoFps','fvVideoResolution','fvVideoFormat',
    'captureStream','MediaRecorder','vaPreload','vaAccumulateRanges','vaApplyRanges',
    'All synchronized 3D views are composited into the same video'
  ])assert(animationSource.includes(token),'Missing animation-export token: '+token);
});

test('Field workspace owns one central viewport plus a contextual sidebar',()=>{
  for(const token of [
    'fw3DHost','fw2DHost','fwPlotTitle','fw3DControlsHost','fw2DControlsHost',
    'fwControlsDrawer','fwInspectorToggle','fwSetInspector','fwMountContextSidebar',
    "sidebar.prepend(drawer)",".sidebar>.fwControlsDrawer.fwSidebarContext{position:static",
    'fwEnsureCompanionSurface','fwActivateCompanionSurface',
    "fwAdoptFieldNode('fieldViewPanel','fw3DHost')",
    "fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')",
    'fwGrid.layout-3d .fwPlotCard{display:none}',
    'fwGrid.layout-plot .fw3DCard{display:none}'
  ])assert(workspaceSource.includes(token),'Missing central Field viewport/context sidebar token: '+token);
  assert(!workspaceSource.includes('grid-template-columns:minmax(0,1fr) 340px'),
    '3D focus still reserves a permanent controls column.');
});

test('Field View stays discoverable from Ribbon and Overview even when no compatible 3D case is loaded',()=>{
  const a=api.fvAvailability(null);
  assert.equal(a.ready,false);
  assert(/Load an OpenFOAM case/i.test(a.reason));
  assert(ribbonSource.includes("['field','cube','3D / Field','3D / Campo']"),
    'Official Field Ribbon tab definition is missing.');
  assert(source.includes("workspaceGoFieldView"),'Overview quick action for Field View is missing.');
  assert(source.includes("q.onclick=()=>{try{setAppMode('field')}"),
    'Overview Field action does not enter the Field workspace directly.');
  assert(!source.includes("setDataView('field3d')"),
    'Overview still falls back through the retired Data field3d route.');
  assert(/Load an OpenFOAM case/i.test(a.reason),'Unavailable Field View does not explain its missing input.');
  assert(!source.includes("tab.id='fieldViewTab'"),'Legacy Data Field View tab still exists.');
});

test('native host smokes the Ribbon-owned Field surface and rejects legacy navigation',()=>{
  assert(program.includes('const string mainIifeMarker = "const FOAMLENS_NATIVE=";'));
  assert(program.includes('var scriptClose = html.IndexOf("</script>", mainMarker'));
  assert(program.includes('html.LastIndexOf(iifeClose, scriptClose, StringComparison.Ordinal)'));
  assert(program.includes("document.getElementById('flRibbonTab-field')"));
  assert(program.includes('legacyFieldButtonAbsent'));
  assert(program.includes('legacyFieldDatasetTabAbsent'));
  assert(program.includes('FoamLens v1.6 Field Ribbon/surface did not mount cleanly'));
});


test('iso-surface marching tetrahedra reconstructs a linear phi=0.5 plane',()=>{
  const isoSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-isosurface.js'),'utf8');
  new Function(isoSource);
  const b='/* FOAMLENS_ISOSURFACE_CORE_START */',e='/* FOAMLENS_ISOSURFACE_CORE_END */',i=isoSource.indexOf(b),j=isoSource.indexOf(e,i);
  assert(i>=0&&j>i,'Iso-surface core markers missing.');
  const coreIso=isoSource.slice(i,j+e.length);
  const isoApi=new Function(coreIso+';return {fvIsoTetra,fvIsoTriangleArea};')();
  const verts=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]],vals=[0,1,1,1],tris=isoApi.fvIsoTetra(verts,vals,.5,1e-12);
  assert.equal(tris.length,1);
  const pts=tris[0];
  for(const p of pts)near(p[0]+p[1]+p[2],.5,1e-10);
  near(isoApi.fvIsoTriangleArea(...pts),Math.sqrt(3)/8,1e-10);
});

test('iso-surface product wiring is present in Field View',()=>{
  const isoSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-isosurface.js'),'utf8');
  for(const token of [
    'Iso-surface / contour','Iso-superficie / contorno','fvIsoValue','fvIsoOpacity',
    'fvBuildIsoSurfaceGeometry','marching tetrahedra','fvUpdateIso','fvIsoPanel'
  ])assert(isoSource.includes(token),'Missing iso-surface token: '+token);
  for(const token of ['isoPos:null','isoColor:null','isoCount:0',"if(typeof fvUpdateIso==='function')fvUpdateIso(displayRange)"])
    assert(source.includes(token),'Missing Field View iso rendering token: '+token);
});


test('point-associated fields color actual mesh vertices without cell conversion',()=>{
  const start=source.indexOf('function fvPointSurfaceColors'),end=source.indexOf('function fvConstantColors',start);
  assert(start>=0&&end>start,'Field-association helper block missing.');
  const assocSource=source.slice(start,end);
  const assoc=new Function(
    "const flUi=(en)=>en;"+
    "const fvColorMap=(v)=>[Number(v),0,0];"+
    "const fvMeshFacePoints=(mesh,fi)=>{const a=mesh.faceOffsets[fi],b=mesh.faceOffsets[fi+1];return mesh.facePoints.slice(a,b)};"+
    assocSource+";return {fvPointSurfaceColors,fvBuildInternalFaceBuffers,fvInternalFaceColors,fvAssociationCount};"
  )();
  const mesh={surfaceTriangles:[0,1,2],points:[0,0,0,1,0,0,0,1,0],pointCount:3,internalFaceCount:0,cellCount:1,faceOffsets:[0],facePoints:[]};
  const colors=assoc.fvPointSurfaceColors(mesh,[.1,.5,.9],0,1,'viridis');
  near(colors[0],.1,1e-6);near(colors[3],.5,1e-6);near(colors[6],.9,1e-6);
  assert.equal(assoc.fvAssociationCount(mesh,'point'),3);
});

test('surface-associated fields triangulate real internal faces and preserve face identity',()=>{
  const start=source.indexOf('function fvPointSurfaceColors'),end=source.indexOf('function fvConstantColors',start);
  const assocSource=source.slice(start,end);
  const assoc=new Function(
    "const flUi=(en)=>en;"+
    "const fvColorMap=(v)=>[Number(v),0,0];"+
    "const fvMeshFacePoints=(mesh,fi)=>{const a=mesh.faceOffsets[fi],b=mesh.faceOffsets[fi+1];return mesh.facePoints.slice(a,b)};"+
    assocSource+";return {fvBuildInternalFaceBuffers,fvInternalFaceColors,fvAssociationCount};"
  )();
  const mesh={points:[0,0,0,1,0,0,1,1,0,0,1,0],faceOffsets:[0,4],facePoints:[0,1,2,3],internalFaceCount:1,pointCount:4,cellCount:2};
  const g=assoc.fvBuildInternalFaceBuffers(mesh);
  assert.equal(g.positions.length,18);
  assert.deepEqual(g.triangleFaces,[0,0]);
  const colors=assoc.fvInternalFaceColors(g.triangleFaces,[.75],0,1,'viridis');
  assert.equal(colors.length,18);for(let i=0;i<colors.length;i+=3)near(colors[i],.75,1e-6);
  assert.equal(assoc.fvAssociationCount(mesh,'surface'),1);
});

test('Field View association wiring keeps face data distinct while point fields support explicit interior reconstruction',()=>{
  for(const token of [
    "fvFieldGroups(c,r,null,'any')",
    "fvAssociationLabel",
    "fvSyncAssociationControls",
    "fieldStorage:'volume'",
    "faceFieldPos:null",
    "faceFieldColor:null",
    "faceFieldCount:0",
    "fvLoadSurfaceBoundaryValues",
    "boundary faces with explicit values",
    "Field/mesh association-count mismatch",
    "fvFieldGroups(c,r,'vector','volume')",
    "fvBuildPointSliceGeometry",
    "const interior=String(storage||'volume')!=='surface'",
    "does not silently reconstruct face data into a volume field"
  ])assert(source.includes(token),'Missing field-association wiring token: '+token);
  const isoSource=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v14-isosurface.js'),'utf8');
  assert(isoSource.includes("String(fvState.fieldStorage||'volume')==='surface'"));
  assert(isoSource.includes('fvBuildPointIsoSurfaceGeometry'));
  assert(isoSource.includes("flSetIssue(meta,'iso-surface-association-incompatible'"));
  assert(!isoSource.includes('silently reinterpret face data as a volume field'));
});

test('native host exposes cancellable read-only OpenFOAM mesh parsing',()=>{
  assert(program.includes('case "parseOpenFOAMMesh":'));
  assert(program.includes('HandleOpenFoamMeshAsync(root, requestId)'));
  assert(program.includes('operation = "openFoamMesh"'));
  assert(program.includes('OpenFoamMeshParseResult'));
  assert(program.includes('ComputePolyhedralCellCenters('));
  assert(program.includes('"volume-weighted-polyhedral"'));
  assert(program.includes('owners[faceIndex] == cell'));
  assert(!program.includes('boundsMin, boundsMax, "mean-face-centres", sourceBytes'));
  assert(program.includes('FaceOffsets'));
  assert(program.includes('FacePoints'));
  assert(program.includes('Owners'));
  assert(program.includes('Neighbours'));
  assert(program.includes('ParseOpenFoamMeshBytes('));
  assert(program.includes('faceCompactList'));
  assert(program.includes('TryReadBinaryScalar('));
  assert(program.includes('TryReadBinaryLabel('));
  assert(program.includes('RunBinaryMeshParserSelfTest();'));
  assert(program.includes('binary-lsb-label32-scalar64-assumed'));
  const start=program.indexOf('private async Task HandleOpenFoamMeshAsync');
  const finish=program.indexOf('private async Task HandleOpenFoamFieldAsync',start);
  const body=program.slice(start,finish);
  assert(body.includes('CancellationToken'));
  assert(body.includes('File.ReadAllBytesAsync'));
  assert(!/FileAccess\.Write|WriteAll|Delete\(|Move\(/.test(body));
});

test('browser fallback stays explicit about binary mesh limitation',()=>{
  const binaryHeader='FoamFile\\n{\\n format binary;\\n class vectorField;\\n object points;\\n}\\n';
  const r=api.fvBuildMeshFromTexts(binaryHeader,binaryHeader,binaryHeader,binaryHeader);
  assert.equal(r.supported,false);
  assert.equal(r.reason,'binary-format');
});

test('versioned frontend extensions are loaded generically',()=>{
  assert(program.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});

test('Field selector remount prefers the loaded renderer field and component',()=>{
  assert(source.includes("oldField=preserve?(fvState.fieldName||fieldSel.value):''"),
    'Field selector remount can fall back to a stale DOM field instead of the loaded 3D field.');
  assert(source.includes("oldComp=preserve?(fvState.component||comp.value):comp.value"),
    'Component selector remount can fall back to a stale DOM component instead of renderer state.');
});


const regionBegin=source.indexOf('const fvRegionScene='),regionEnd=source.indexOf('function fvEsc(s)',regionBegin);
assert(regionBegin>0&&regionEnd>regionBegin,'Physical-region scene code missing.');
const regionCode=source.slice(regionBegin,regionEnd);
const regionApi=new Function(
  'const window={}; const fvTimeEqual=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=Math.max(1e-10,Math.max(Math.abs(Number(a)),Math.abs(Number(b)),1)*1e-10);'+
  regionCode+';return {fvRegionNames,fvRegionExactTime,fvRegionUnionBounds,fvRegionBeginVideoRangeScan,fvRegionObserveRange,fvRegionEndVideoRangeScan,fvRegionSetVideoRanges,fvRegionRangeKey,fvRegionScene};'
)();

test('one 3D canvas recognizes distinct physical regions without treating processor partitions as regions',()=>{
  const sourceCase={meshInventory:[
    {region:'solid',complete:true},
    {region:'fluid',complete:true},
    {region:'solid',complete:true,partition:'processor0'},
    {region:'unfinished',complete:false}
  ]};
  assert.deepStrictEqual(regionApi.fvRegionNames(sourceCase),['fluid','solid']);
  assert(regionCode.includes('fvRegionBuildLayer('));
  assert(regionCode.includes('fvRegionRenderLayers()'));
  assert(source.includes('fvRegionRenderLayers();fvUpdateAxisGizmo()'));
  assert(regionCode.includes("const inventory=fvMeshes(c).filter(g=>String(g.region||'')===region)"),'Processor fallback must remain scoped to ONE physical region');
  assert(regionCode.includes('fvCombinePartitionMeshes(loaded)'),'Processor-only submeshes within the same physical region should be reconstructible');
  for(const token of ['id="fvMultiRegionPanel"','id="fvMultiRegionRows"','id="fvRegionShowAll"','id="fvRegionOnlyPrimary"'])
    assert(source.includes(token),'Missing physical region control: '+token);
});

test('secondary region field data uses exact physical time; other times show explicit neutral geometry',()=>{
  assert.equal(regionApi.fvRegionExactTime([0,.1,.2],.1+1e-12),.1);
  assert.equal(regionApi.fvRegionExactTime([0,.1,.2],.15),undefined,'Never silently take closest field time');
  assert.equal(regionApi.fvRegionExactTime([],0),undefined);
  for(const token of [
    'fvLoadFrameData(c,selected,region,exact',
    'fvRegionGeometryAtTime(c,region,time)',
    'Geometry only; field unavailable at t = ',
    "data?.storage==='surface'",
    "if(choice.visible)failedVisible.push(region+"
  ])assert(regionCode.includes(token),'Missing scientific provenance/safety: '+token);
});

test('camera includes geometry bounds of all visible physically independent regions',()=>{
  const a={boundsMin:[0,0,0],boundsMax:[1,1,1]};
  const b={boundsMin:[2,-1,0],boundsMax:[4,1,3]};
  const bounds=regionApi.fvRegionUnionBounds([a,b]);
  assert.deepStrictEqual(bounds.min,[0,-1,0]);
  assert.deepStrictEqual(bounds.max,[4,1,3]);
  assert.deepStrictEqual(bounds.center,[2,0,1.5]);
  assert(Math.abs(bounds.diagonal-Math.sqrt(29))<1e-12);
  assert.equal(regionApi.fvRegionUnionBounds([{boundsMin:[5,5,5],boundsMax:[1,1,1]}]),null);
  assert(regionCode.includes('fvRegionReleaseLayer(layer)'),'Previous GPU buffers must be explicitly freed');
  assert(regionCode.includes('i+=2')&&regionCode.includes('Promise.all(regions.slice(i,i+2).map(loadOne))'),'Concurrent OpenFOAM multi-region parsing must stay bounded');
  assert(regionCode.includes('if(!current())return; // A newer case/frame owns the WebGL canvas.'),'Stale frame must not upload buffers to new case');
});



test('camera fit excludes hidden primary and secondary regions without inventing bounds',()=>{
  const setup=[
    'const window={};',
    'const c={id:1};',
    'const document={getElementById:id=>id==="fvRegion"?{value:"solid"}:null};',
    'const fvCase=()=>c;',
    'const fvState={mesh:{boundsMin:[-500,-500,-500],boundsMax:[500,500,500]},camera:{target:null,distance:0}};',
    'const fvRender=()=>{};',
    'const fvTimeEqual=(a,b)=>a===b;'
  ].join('\n');
  const exercise=[
    'fvRegionScene.caseId="1";',
    'fvRegionScene.choices.set("solid",{visible:false});',
    'fvRegionScene.choices.set("fluid",{visible:true});',
    'fvRegionScene.layers.set("fluid",{mesh:{boundsMin:[2,0,0],boundsMax:[4,2,2]}});',
    'const fit=fvRegionFitCamera(),target=fvState.camera.target.slice(),distance=fvState.camera.distance;',
    'fvRegionScene.choices.get("fluid").visible=false;',
    'const none=fvRegionFitCamera();',
    'return {fit,target,distance,none};'
  ].join('\n');
  const observed=new Function(setup+regionCode+exercise)();
  assert.equal(observed.fit,true,'A visible non-primary region must define the camera');
  assert.deepStrictEqual(observed.target,[3,1,1],'Hidden primary geometry must not affect framing');
  assert(Math.abs(observed.distance-Math.sqrt(12)*1.65)<1e-12);
  assert.equal(observed.none,false,'Nothing visible means there is no camera bound to fit');
  assert(source.includes("if(c&&!fvRegionChoice(c,primary).visible)return;"),
    'Single-region fallback must not refit a hidden primary mesh');
  assert(regionCode.includes("if(!fvRegionFitCamera())fvRender()"),
    'Visibility changes must refit newly displayed physical regions');
});


test('physical regions allocate and draw distinct meshes in one shared WebGL depth context',()=>{
  const setup=[
    'const calls=[];',
    'const gl={ARRAY_BUFFER:34962,STATIC_DRAW:35044,TRIANGLES:4,LINES:1,LEQUAL:515,',
    'createBuffer(){const b={id:calls.filter(x=>x[0]==="make").length+1};calls.push(["make",b.id]);return b},',
    'bindBuffer(){},bufferData(){},deleteBuffer(b){calls.push(["delete",b.id])},depthFunc(){},depthMask(){}};',
    'const fvState={renderer:{gl},mesh:null,camera:{}};const window={};',
    'const document={getElementById(id){if(id==="fvSurface"||id==="fvEdges")return {checked:true};if(id==="fvPalette")return {value:"viridis"};return null}};',
    'const fvTimeEqual=(a,b)=>Math.abs(Number(a)-Number(b))<1e-8;',
    'const fvClamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));',
    'const fvBuildSurfaceBuffers=()=>({surfacePositions:new Float32Array(9),edgePositions:new Float32Array(6)});',
    'const fvConstantColors=n=>new Float32Array(n*3);',
    'const fvSurfaceColors=()=>new Float32Array(9);const fvPointSurfaceColors=()=>new Float32Array(9);',
    'const fvBindDraw=(r,p,col,count,mode,opacity)=>calls.push(["draw",count,mode,opacity,r.gl===gl]);'
  ].join('\n');
  const exercise=[
    'fvRegionScene.choices.set("solid",{visible:true,opacity:1});',
    'fvRegionScene.choices.set("fluid",{visible:true,opacity:.8});',
    'const mesh={cellCount:1,pointCount:3};',
    'const solid=fvRegionBuildLayer("solid",mesh,{storage:"volume",fieldValues:[2],range:{valid:true,min:0,max:3},group:{name:"T"}},{visible:true,opacity:1},1);',
    'const fluid=fvRegionBuildLayer("fluid",mesh,{storage:"point",fieldValues:[1,2,3],range:{valid:true,min:1,max:3},group:{name:"U"}},{visible:true,opacity:.8},1);',
    'fvRegionScene.layers.set("solid",solid);fvRegionScene.layers.set("fluid",fluid);fvRegionRenderLayers();',
    'fvRegionReleaseLayer(solid);fvRegionReleaseLayer(fluid);',
    'return calls;'
  ].join('\n');
  const calls=new Function(setup+regionCode+exercise)();
  const draws=calls.filter(x=>x[0]==='draw');
  assert.equal(draws.length,4);
  assert(draws.every(x=>x[4]),'Physical layers must use the same GL context');
  assert.equal(calls.filter(x=>x[0]==='make').length,8);
  assert.equal(calls.filter(x=>x[0]==='delete').length,8,'Every GPU buffer must be released');
});


test('hidden physical regions release GPU layers and are never eagerly loaded',()=>{
  assert(regionCode.includes('function fvRegionApplyVisibility(c)'),'Visibility must be owned by one region manager');
  assert(regionCode.includes('++fvRegionScene.sequence;'),'Visibility changes must invalidate stale field reads');
  assert(regionCode.includes('fvRegionReleaseLayer(layer);'),'Invisible region buffers must be freed');
  assert(regionCode.includes('region!==primary&&fvRegionChoice(c,region).visible'),'Never parse fields for hidden secondary regions');
  assert(regionCode.includes('!fvRegionScene.layers.has(region)'),'Re-enabling a hidden region must request its missing layer');
  assert(source.includes('fvRegionClearLayers();fvSetStatus('),'Old physical-time layers must be released BEFORE the next primary frame loads');
  const setup=[
    'const window={};',
    'const calls=[];const gl={deleteBuffer:b=>calls.push(b)};',
    'const document={getElementById:id=>id==="fvRegion"?{value:"solid"}:null};',
    'const c={id:1,meshInventory:[{region:"solid",complete:true},{region:"fluid",complete:true}]};',
    'const fvCase=()=>c;const fvTimeEqual=(a,b)=>a===b;',
    'const fvState={mesh:{boundsMin:[0,0,0],boundsMax:[1,1,1]},renderer:{gl},time:0,camera:{target:[],distance:1}};',
    'const fvRender=()=>{};'
  ].join('\n');
  const exercise=[
    'fvRegionScene.caseId="1";',
    'fvRegionScene.choices.set("solid",{visible:true});',
    'fvRegionScene.choices.set("fluid",{visible:false});',
    'fvRegionScene.layers.set("fluid",{gl,surfacePos:1,surfaceColor:2,edgePos:3,edgeColor:4,mesh:{boundsMin:[-9,0,0],boundsMax:[-8,1,1]}});',
    'fvRegionApplyVisibility(c);',
    'return {remaining:fvRegionScene.layers.size,deletions:calls.slice(),camera:fvState.camera.target};'
  ].join('\n');
  const observed=new Function(setup+regionCode+exercise)();
  assert.equal(observed.remaining,0,'Hidden secondary geometry must not remain in memory');
  assert.deepStrictEqual(observed.deletions,[1,2,3,4],'Every hidden layer GL buffer must be released');
  assert.deepStrictEqual(observed.camera,[.5,.5,.5],'Hidden physical geometry must not affect camera fitting');
});


test('secondary surface fields color actual internal mesh faces and keep unknown boundaries neutral',()=>{
  assert(regionCode.includes("fvBuildInternalFaceBuffers(mesh)"),'Face data requires real mesh face geometry');
  assert(regionCode.includes("fvInternalFaceColors(face.triangleFaces,values,paintRange.min,paintRange.max,palette)"),
    'Face colors must map their exact internalFace indices, never cell or boundary indices');
  assert(source.includes("Real internal-face colors; boundary patches neutral"),'Scientific surface-field provenance must be visible');
  const setup=[
    'const calls=[];const gl={ARRAY_BUFFER:34962,STATIC_DRAW:35044,TRIANGLES:4,LINES:1,LEQUAL:515,',
    'createBuffer(){const b={id:calls.filter(x=>x[0]==="make").length+1};calls.push(["make",b.id]);return b},',
    'bindBuffer(){},bufferData(){},deleteBuffer(b){calls.push(["delete",b.id])},depthFunc(){},depthMask(){}};',
    'const fvState={renderer:{gl},mesh:null,camera:{}};const window={};',
    'const document={getElementById(id){if(id==="fvSurface"||id==="fvEdges")return {checked:true};if(id==="fvPalette")return {value:"viridis"};return null}};',
    'const fvTimeEqual=(a,b)=>Math.abs(Number(a)-Number(b))<1e-8;',
    'const fvClamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));',
    'const fvBuildSurfaceBuffers=()=>({surfacePositions:new Float32Array(9),edgePositions:new Float32Array(6)});',
    'const fvBuildInternalFaceBuffers=()=>({positions:new Float32Array(9),triangleFaces:[1]});',
    'const fvInternalFaceColors=(faces,vals,min,max)=>{calls.push(["faceValues",faces.map(i=>vals[i]),min,max]);return new Float32Array(9)};',
    'const fvConstantColors=n=>new Float32Array(n*3);',
    'const fvSurfaceColors=()=>new Float32Array(9);const fvPointSurfaceColors=()=>new Float32Array(9);',
    'const fvBindDraw=(r,p,col,count,mode,opacity)=>calls.push(["draw",count,mode,opacity]);'
  ].join('\n');
  const exercise=[
    'fvRegionScene.choices.set("fluid",{visible:true,opacity:.8});',
    'const mesh={cellCount:1,pointCount:3,internalFaceCount:2};',
    'const layer=fvRegionBuildLayer("fluid",mesh,{storage:"surface",fieldValues:[101,303],range:{valid:true,min:100,max:400},group:{name:"phi"}},{component:"value"},1);',
    'fvRegionScene.layers.set("fluid",layer);fvRegionRenderLayers();',
    'const colored=layer.colored,faceCount=layer.faceFieldCount;',
    'fvRegionReleaseLayer(layer);return {calls,colored,faceCount};'
  ].join('\n');
  const {calls,colored,faceCount}=new Function(setup+regionCode+exercise)();
  assert.equal(colored,true);
  assert.equal(faceCount,3);
  assert.deepStrictEqual(calls.find(x=>x[0]==='faceValues'),['faceValues',[303],100,400]);
  assert.equal(calls.filter(x=>x[0]==='make').length,6);
  assert.equal(calls.filter(x=>x[0]==='delete').length,6,'All internal-face GPU buffers must be released');
  const draws=calls.filter(x=>x[0]==='draw');
  assert.equal(draws.length,3,'Neutral shell, real colored face and edges share one GL viewport');
  assert(draws[0][3]<=.14,'Unknown boundaries must remain neutral/translucent');
  assert.equal(draws[1][3],.8,'Real internal-face colors use requested region opacity');
});


test('multiregion video waits for the exact physical frame and rejects missing visible layers',()=>{
  assert(animationSource.includes('isExporting:()=>vaState.exporting'),'Video exporting state must be exposed to Field frames');
  assert(source.includes('if(window.FoamLensAnimationExport?.isExporting?.()){await regionTask;if(seq!==fvState.frameSeq)return}'),
    'Video must not capture a frame before secondary physical-region layers complete');
  assert(source.includes('failedVisible.push(region+'),
    'Missing visible physical regions must be recorded as export failures');
  assert(source.includes('Cannot export an incomplete multiregion frame:'),
    'Video must fail closed instead of silently exporting only the primary region');
});


test('video color scale remains fixed per physical region, field, component, units and across timesteps',()=>{
  const solid={group:{name:'T'},storage:'volume',parsed:{dimensions:[0,0,0,1,0,0,0]},range:{valid:true,min:300,max:500}};
  const later={...solid,range:{valid:true,min:250,max:630}};
  const fluid={...solid,group:{name:'U'},parsed:{dimensions:[0,1,-1,0,0,0,0]},range:{valid:true,min:0,max:12}};
  regionApi.fvRegionBeginVideoRangeScan();
  regionApi.fvRegionObserveRange('solid',{component:'value'},solid);
  regionApi.fvRegionObserveRange('solid',{component:'value'},later);
  regionApi.fvRegionObserveRange('fluid',{component:'value'},fluid);
  const ranges=regionApi.fvRegionEndVideoRangeScan(),key=regionApi.fvRegionRangeKey('solid',{component:'value'},solid);
  assert.equal(Object.keys(ranges).length,2);
  assert.deepStrictEqual(ranges[key],{valid:true,min:250,max:630});
  regionApi.fvRegionSetVideoRanges(ranges);
  assert.equal(regionApi.fvRegionScene.videoRanges[key].max,630);
  regionApi.fvRegionSetVideoRanges(null);
  assert.equal(regionApi.fvRegionScene.videoRanges,null);
  assert(animationSource.includes('ranges.regions=window.FoamLensRegionScene?.endVideoRangeScan?.()'),
    'Secondary physical-region video ranges must be captured across preload frames');
  assert(animationSource.includes('setVideoRanges?.(ranges?.regions||null)'),
    'Final fixed physical-region range must be applied before recording');
  assert(source.includes('paintRange=fvRegionScene.videoRanges?.[fvRegionRangeKey(region,choice,data)]||range'),
    'Each region must color using its own fixed video range');
});

console.log('FoamLens Field View regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

test('comparison view metadata lives under scenes and long numeric values are responsive',()=>{
  const compare=compareSource;
  assert(compare.includes('function fcComposeViewport('),'Scene/caption split missing');
  assert(compare.includes("caption.className='fcViewportCaption'"),'Metadata caption must be outside WebGL scene');
  assert(compare.includes("scene.className='fcViewportScene'"),'3D canvas must have its own scene container');
  assert(compare.includes('fcComposeViewport(viewport)')&&compare.includes('fcComposeViewport(primary)')===false,
    'Every newly added viewport must share a structural scene/caption solution');
  assert(compare.includes('for(const viewport of [primary,second,diff])fcComposeViewport(viewport)'),
    'Primary, secondary and difference scenes must share one layout policy');
  assert(compare.includes('.fcViewLabel{position:static;display:block'),
    'Long case path must never be absolutely positioned over the 3D canvas');
  assert(compare.includes('.fcStatsCells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),
    '2-view statistics must not compress seven numeric statistics into 4 narrow columns');
  assert(compare.includes('overflow-wrap:anywhere;font-variant-numeric:tabular-nums'),
    'Scientific values must remain readable instead of being clipped by ellipsis');
  assert(compare.includes('.fcLegendTicks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'),
    'Legend tick values must not overlap in narrow comparison viewports');
});
