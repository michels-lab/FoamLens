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
const api=new Function('const cases=[];const flUi=(en)=>en;'+core+';return {fvBuildMeshInventory,fvBuildMeshFromTexts,fvNearestTime,fvAdvanceIndex,fvColorMap,fvLegendGradient,fvBuildSpatialHash,fvSeedPlane,fvIntegrateStreamline,fvCaseViewAvailable,fvAvailability};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}

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
  assert.deepEqual(mesh.boundsMin,[0,0,0]);
  assert.deepEqual(mesh.boundsMax,[1,1,1]);
  assert(Math.abs(mesh.cellCenters[0]-.5)<1e-12);
  assert(Math.abs(mesh.cellCenters[1]-.5)<1e-12);
  assert(Math.abs(mesh.cellCenters[2]-.5)<1e-12);
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
  for(const token of ['parseOpenFOAMMesh','pmLoadFieldSet','pmComponentValues','getContext(\'webgl2\'','fvIntegrateStreamline','fvBuildVectorGlyphBuffers','field3d','fvVectors','fvStreamlines']){
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

test('native host exposes cancellable read-only OpenFOAM mesh parsing',()=>{
  assert(program.includes('case "parseOpenFOAMMesh":'));
  assert(program.includes('HandleOpenFoamMeshAsync(root, requestId)'));
  assert(program.includes('operation = "openFoamMesh"'));
  assert(program.includes('OpenFoamMeshParseResult'));
  assert(program.includes('"binary-format"'));
  const start=program.indexOf('private async Task HandleOpenFoamMeshAsync');
  const finish=program.indexOf('private async Task HandleOpenFoamFieldAsync',start);
  const body=program.slice(start,finish);
  assert(body.includes('CancellationToken'));
  assert(body.includes('File.ReadAllTextAsync'));
  assert(!/FileAccess\.Write|WriteAll|Delete\(|Move\(/.test(body));
});

test('versioned frontend extensions are loaded generically',()=>{
  assert(program.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});

console.log('FoamLens Field View regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
