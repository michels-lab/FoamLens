'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-field-view.js');
const programPath=path.join(root,'src','FoamLensDesktop','Program.cs');
const source=fs.readFileSync(modulePath,'utf8');
const program=fs.readFileSync(programPath,'utf8');

new Function(source);

const begin='/* FOAMLENS_FIELD_VIEW_CORE_START */';
const end='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field View core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function('const cases=[];const flUi=(en)=>en;'+core+';return {fvBuildMeshInventory,fvBuildMeshFromTexts,fvNearestTime,fvAdvanceIndex,fvColorMap,fvLegendGradient,fvBuildSpatialHash,fvSeedPlane,fvIntegrateStreamline,fvCaseViewAvailable,fvAvailability,fvMeshFacePoints,fvCellFaces,fvPointCells,fvPointValuesFromCells,fvSliceTetra,fvBuildSliceGeometry};')();

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

test('Field View product module is wired to native mesh, transient fields and WebGL',()=>{
  for(const token of ['parseOpenFOAMMesh','pmLoadFieldSet','pmComponentValues','getContext(\'webgl2\'','fvIntegrateStreamline','fvBuildVectorGlyphBuffers','fvBuildSliceGeometry','fvUpdateSlice','slicePos','field3d','fvVectors','fvStreamlines','id="fvSlice"','id="fvSliceAxis"','id="fvSlicePosition"','id="fvSliceOpacity"','not claimed to be bit-identical to ParaView/VTK']){
    assert(source.includes(token),'Missing Field View wiring token: '+token);
  }
});


test('Field View stays discoverable even when no compatible 3D case is loaded',()=>{
  const a=api.fvAvailability(null);
  assert.equal(a.ready,false);
  assert(/Load an OpenFOAM case/i.test(a.reason));
  assert(source.includes("tab.disabled=false"),'Field View tab is still disabled when unavailable.');
  assert(source.includes("workspaceGoFieldView"),'Overview quick action for Field View is missing.');
  assert(source.includes("Open Field View to see what data is missing"),'Unavailable Field View does not explain discoverability.');
});

test('native host injects extensions into the main FoamLens IIFE, not the last document IIFE',()=>{
  assert(program.includes('const string mainIifeMarker = "const FOAMLENS_NATIVE=";'));
  assert(program.includes('var scriptClose = html.IndexOf("</script>", mainMarker'));
  assert(program.includes('html.LastIndexOf(iifeClose, scriptClose, StringComparison.Ordinal)'));
  assert(program.includes("document.getElementById('fieldViewTab')"));
  assert(program.includes('FoamLens Field View extension did not mount enabled/discoverable'));
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
  assert(isoSource.includes('does not silently reconstruct face data into a volume field'));
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

console.log('FoamLens Field View regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
