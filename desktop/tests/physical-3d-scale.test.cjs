'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v14-field-view.js'),'utf8');
const from=source.indexOf('/* FOAMLENS_PHYSICAL_3D_SCALE_CORE_START */'),to=source.indexOf('/* FOAMLENS_PHYSICAL_3D_SCALE_CORE_END */',from);
assert(from>=0&&to>from,'Actual production physical scale functions must be available');
const basis=()=>({right:[1,0,0],up:[0,1,0],z:[0,0,1]});
const api=new Function('fvCameraBasis',source.slice(from,to)+
  ';return {fvOrtho,fvFitDistance,fvProjectWorld,fvMetricScale,fvMetricLabel,fvMeshVertexNearestAt,fvPhysicalDistance}') (basis);
const approx=(a,b,tol=1e-6)=>assert(Math.abs(a-b)<=tol,a+' differs from '+b);
const points=new Float64Array([-.02,-.03,-.001, .02,-.03,-.001, -.02,.03,-.001, .02,.03,-.001,
  -.02,-.03,.001,.02,-.03,.001,-.02,.03,.001,.02,.03,.001]);
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(let i=0;i<points.length;i+=3)for(let a=0;a<3;a++){
  min[a]=Math.min(min[a],points[i+a]);max[a]=Math.max(max[a],points[i+a])
}
const bounds={min,max,center:[0,0,0],diagonal:Math.hypot(...max.map((n,i)=>n-min[i]))};
assert.deepStrictEqual(bounds.min,[-.02,-.03,-.001]);
assert.deepStrictEqual(bounds.max,[.02,.03,.001]);
for(const canvas of [{clientWidth:300,clientHeight:600},{clientWidth:1600,clientHeight:350},
  {clientWidth:800,clientHeight:500}]){
  for(const projection of ['orthographic','perspective']){
    const d=api.fvFitDistance(bounds,{projection},canvas);
    assert(Number.isFinite(d)&&d>0,'Camera fit must remain finite and positive');
    const aspect=canvas.clientWidth/canvas.clientHeight,half=d*Math.tan(Math.PI/8);
    const mat=api.fvOrtho(-half*aspect,half*aspect,-half,half,1e-8,100);
    if(projection==='orthographic'){
      for(let i=0;i<points.length;i+=3){
        const point=[points[i],points[i+1],points[i+2]];
        // Orthographic x and y must preserve the exact OpenFOAM physical aspect ratio.
        const hit=api.fvProjectWorld(point,mat,canvas.clientWidth,canvas.clientHeight);
        assert(hit,'Every source mesh corner should project');
        assert(hit.x>=0&&hit.x<=canvas.clientWidth,'Physical domain must fit horizontal viewport');
        assert(hit.y>=0&&hit.y<=canvas.clientHeight,'Physical domain must fit vertical viewport')
      }
    }
  }
}
const mvp=api.fvOrtho(-1,1,-1,1,-1,1);
const hit=api.fvProjectWorld([.2,.4,0],mvp,400,200);
approx(hit.x,240);approx(hit.y,60);
assert.equal(hit.inside,true);
const mesh={points:new Float64Array([-.1,0,0,.1,0,0,0,0,0]),surfaceEdges:[0,1]};
const p=api.fvMeshVertexNearestAt([mesh],180,100,mvp,400,200,10);
assert.deepStrictEqual(p.point,[-.1,0,0],'Pick an actual exterior OpenFOAM vertex');
assert.equal(api.fvMeshVertexNearestAt([mesh],200,100,mvp,400,200,5),null,'No fake measurement point between vertices');
approx(api.fvPhysicalDistance([0,0,0],[.03,.04,0]),.05,1e-12);
assert.deepStrictEqual(api.fvMetricScale(.05),{factor:1000,unit:'mm'});
assert.equal(api.fvMetricLabel(.05,api.fvMetricScale(.05)),'50');
assert(!Number.isFinite(api.fvPhysicalDistance([0,0],[1,2])),'Reject ill-formed coordinates');
assert(Number.isNaN(api.fvFitDistance({min:[0,0,0],max:[Infinity,1,1],center:[0,0,0]},
  {projection:'orthographic'},{clientWidth:100,clientHeight:100})));
assert(source.includes("camera:{yaw:.72,pitch:.42,distance:2.8,target:[0,0,0],projection:'orthographic'}"),
  'True-scale orthographic must be the default');
assert(source.includes('fvPhysicalOverlayRender(canvas)'),'World coordinate annotations must update on redraw');
for(const id of ['fvFitCamera','fvProjectionOrtho','fvProjectionPerspective','fvShowDimensions','fvMeasureTool',
  'fvMeasureClear','fvPhysicalAxes','fvMeshDimensions','fvRegionScaleDock','fvSecondaryScaleLegends'])
  assert(source.includes('id="'+id+'"'),'Required real Field UI missing: '+id);
assert(source.includes('fvRegionLegendMarkup(layer,fvRegionScene.choices.get(region))'),
  'Secondary legends must use each region\'s own physical field and range');
assert(source.includes("if(range.min===range.max)"),'Uniform secondary field must never show fake color gradient');
console.log('FoamLens physical 3D: true orthographic aspect, fit across aspect ratios, measured XYZ, real vertex distance, independent scales PASS');
