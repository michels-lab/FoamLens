#!/usr/bin/env python3
import json, math, os, sys
from pathlib import Path

try:
    import vtk
except Exception as exc:
    raise SystemExit(f"VTK import failed: {exc}")

if len(sys.argv) < 3:
    raise SystemExit("Usage: python streamline-vtk-compare.py <B13 case root> <foamlens-streamlines.json>")

case_root=Path(sys.argv[1]).resolve()
foam_path=Path(sys.argv[2]).resolve()
data=json.loads(foam_path.read_text())
if not case_root.exists():
    raise SystemExit(f"B13 case root missing: {case_root}")

foam_marker=case_root/"FoamLensVTK.foam"
foam_marker.touch(exist_ok=True)

reader=vtk.vtkOpenFOAMReader()
reader.SetFileName(str(foam_marker))
if hasattr(reader,"SkipZeroTimeOff"): reader.SkipZeroTimeOff()
if hasattr(reader,"DecomposePolyhedraOff"): reader.DecomposePolyhedraOff()
reader.UpdateInformation()

# Ask for every available array/patch so the comparison cannot silently omit U.
for method in ("EnableAllCellArrays","EnableAllPointArrays","EnableAllPatchArrays"):
    if hasattr(reader,method):
        try: getattr(reader,method)()
        except Exception: pass

target_time=float(data["time"])
try:
    reader.UpdateTimeStep(target_time)
except Exception:
    executive=reader.GetExecutive()
    executive.SetUpdateTimeStep(0,target_time)
    reader.Update()

root=reader.GetOutputDataObject(0)
if root is None:
    raise SystemExit("vtkOpenFOAMReader returned no output")

def datasets(obj,path="root"):
    if obj is None: return
    if isinstance(obj,vtk.vtkDataSet):
        yield path,obj
        return
    if isinstance(obj,vtk.vtkMultiBlockDataSet):
        for i in range(obj.GetNumberOfBlocks()):
            child=obj.GetBlock(i)
            meta=obj.GetMetaData(i)
            name=""
            if meta is not None and meta.Has(vtk.vtkCompositeDataSet.NAME()):
                name=meta.Get(vtk.vtkCompositeDataSet.NAME())
            yield from datasets(child,path+"/"+(name or f"block{i}"))
    elif isinstance(obj,vtk.vtkPartitionedDataSetCollection):
        for i in range(obj.GetNumberOfPartitionedDataSets()):
            pds=obj.GetPartitionedDataSet(i)
            meta=obj.GetMetaData(i)
            name=""
            if meta is not None and meta.Has(vtk.vtkCompositeDataSet.NAME()):
                name=meta.Get(vtk.vtkCompositeDataSet.NAME())
            yield from datasets(pds,path+"/"+(name or f"dataset{i}"))
    elif isinstance(obj,vtk.vtkPartitionedDataSet):
        for i in range(obj.GetNumberOfPartitions()):
            yield from datasets(obj.GetPartition(i),path+f"/partition{i}")

candidates=[]
for p,ds in datasets(root):
    cd=ds.GetCellData()
    pd=ds.GetPointData()
    has_u=(cd and cd.GetArray("U") is not None) or (pd and pd.GetArray("U") is not None)
    if has_u and ds.GetNumberOfCells()>0:
        score=(10 if "metal" in p.lower() else 0)+math.log10(max(1,ds.GetNumberOfCells()))
        candidates.append((score,p,ds))
if not candidates:
    names=[]
    for p,ds in datasets(root):
        ca=[ds.GetCellData().GetArrayName(i) for i in range(ds.GetCellData().GetNumberOfArrays())]
        pa=[ds.GetPointData().GetArrayName(i) for i in range(ds.GetPointData().GetNumberOfArrays())]
        names.append((p,ds.GetNumberOfCells(),ca,pa))
    raise SystemExit("VTK found no dataset with U. Blocks: "+repr(names[:20]))

candidates.sort(key=lambda x:x[0],reverse=True)
_,dataset_path,mesh=candidates[0]

# StreamTracer requires point vectors for interpolation. Convert cell-centred OpenFOAM U when necessary.
if mesh.GetPointData().GetArray("U") is None:
    c2p=vtk.vtkCellDataToPointData()
    c2p.SetInputData(mesh)
    c2p.PassCellDataOn()
    c2p.Update()
    trace_input=c2p.GetOutput()
else:
    trace_input=mesh

if trace_input.GetPointData().GetArray("U") is None:
    raise SystemExit(f"Selected VTK block {dataset_path} still has no point U after CellDataToPointData")

seed_poly=vtk.vtkPolyData()
seed_points=vtk.vtkPoints()
verts=vtk.vtkCellArray()
for seed in data["seeds"]:
    pid=seed_points.InsertNextPoint(float(seed[0]),float(seed[1]),float(seed[2]))
    verts.InsertNextCell(1)
    verts.InsertCellPoint(pid)
seed_poly.SetPoints(seed_points)
seed_poly.SetVerts(verts)

tracer=vtk.vtkStreamTracer()
tracer.SetInputData(trace_input)
tracer.SetSourceData(seed_poly)
tracer.SetInputArrayToProcess(0,0,0,vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS,"U")
tracer.SetIntegrationDirectionToForward()
tracer.SetIntegratorTypeToRungeKutta2()
if hasattr(tracer,"SetIntegrationStepUnit") and hasattr(vtk.vtkStreamTracer,"LENGTH_UNIT"):
    tracer.SetIntegrationStepUnit(vtk.vtkStreamTracer.LENGTH_UNIT)
tracer.SetInitialIntegrationStep(float(data["step"]))
tracer.SetMinimumIntegrationStep(float(data["step"])*0.25)
tracer.SetMaximumIntegrationStep(float(data["step"])*2.0)
tracer.SetMaximumPropagation(float(data["maxLength"]))
tracer.SetMaximumNumberOfSteps(int(data["maxSteps"]))
tracer.SetTerminalSpeed(1e-14)
tracer.Update()
out=tracer.GetOutput()
if out is None or out.GetNumberOfCells()==0:
    raise SystemExit(f"VTK produced no streamlines from {dataset_path}")

vtk_lines=[]
for ci in range(out.GetNumberOfCells()):
    cell=out.GetCell(ci)
    pts=[]
    for j in range(cell.GetNumberOfPoints()):
        pts.append(list(out.GetPoint(cell.GetPointId(j))))
    if len(pts)>=2:
        vtk_lines.append(pts)

def dist(a,b):
    return math.sqrt(sum((float(a[i])-float(b[i]))**2 for i in range(3)))

def cumulative(points):
    s=[0.0]
    for i in range(1,len(points)):
        s.append(s[-1]+dist(points[i-1],points[i]))
    return s

def resample(points,n=41):
    c=cumulative(points)
    total=c[-1]
    if total<=0: return [points[0]]*n,total
    outp=[];j=1
    for k in range(n):
        target=total*k/(n-1)
        while j<len(c)-1 and c[j]<target: j+=1
        lo=max(0,j-1); hi=min(len(c)-1,j)
        if c[hi]<=c[lo]+1e-30: outp.append(points[lo]); continue
        w=(target-c[lo])/(c[hi]-c[lo])
        outp.append([points[lo][a]+w*(points[hi][a]-points[lo][a]) for a in range(3)])
    return outp,total

def initial_dir(points):
    for i in range(1,len(points)):
        d=[points[i][a]-points[0][a] for a in range(3)]
        m=math.sqrt(sum(x*x for x in d))
        if m>1e-14:return [x/m for x in d]
    return [0,0,0]

def cosine(a,b):
    return sum(a[i]*b[i] for i in range(3))

# Match each VTK line to its closest requested seed.
unused=set(range(len(vtk_lines)))
matches=[]
diag=float(data["diag"])
for fi,line in enumerate(data["lines"]):
    seed=line["seed"]
    if not unused:
        raise SystemExit("VTK returned fewer usable streamlines than FoamLens")
    vi=min(unused,key=lambda idx:min(dist(vtk_lines[idx][0],seed),dist(vtk_lines[idx][-1],seed)))
    unused.remove(vi)
    vp=vtk_lines[vi]
    # Ensure VTK line is forward from the requested seed.
    if dist(vp[-1],seed)<dist(vp[0],seed): vp=list(reversed(vp))
    fp=line["points"]
    fr,flen=resample(fp)
    vr,vlen=resample(vp)
    ds=[dist(a,b) for a,b in zip(fr,vr)]
    rms=math.sqrt(sum(x*x for x in ds)/len(ds))/diag
    maxdev=max(ds)/diag
    rel_len=abs(flen-vlen)/max(flen,vlen,diag*1e-12)
    cos=cosine(initial_dir(fp),initial_dir(vp))
    seed_err=dist(vp[0],seed)/diag
    matches.append(dict(index=fi,foamPoints=len(fp),vtkPoints=len(vp),rmsDiag=rms,maxDiag=maxdev,
                        relativeLengthError=rel_len,initialDirectionCosine=cos,seedErrorDiag=seed_err,
                        foamLength=flen,vtkLength=vlen))

# These tolerances are intentionally geometric and domain-normalized. They are not pixel tests.
# FoamLens samples a cell-centred field using its own spatial hash; VTK interpolates the converted
# point field, so bit identity is neither expected nor scientifically meaningful.
fail=[]
for m in matches:
    if m["seedErrorDiag"]>0.02: fail.append((m["index"],"seed",m["seedErrorDiag"]))
    if m["initialDirectionCosine"]<0.90: fail.append((m["index"],"direction",m["initialDirectionCosine"]))
    if m["rmsDiag"]>0.10: fail.append((m["index"],"rms",m["rmsDiag"]))
    if m["maxDiag"]>0.22: fail.append((m["index"],"max",m["maxDiag"]))
    if m["relativeLengthError"]>0.40: fail.append((m["index"],"length",m["relativeLengthError"]))

report={
    "case":data["caseName"],"region":data["region"],"time":target_time,"field":"U",
    "vtkDataset":dataset_path,"foamLensIntegrator":"normalized midpoint / RK2-like",
    "vtkIntegrator":"vtkStreamTracer Runge-Kutta 2","lineCount":len(matches),"metrics":matches,
    "thresholds":{"seedErrorDiag":0.02,"initialDirectionCosineMin":0.90,"rmsDiag":0.10,"maxDiag":0.22,"relativeLengthError":0.40}
}
print(json.dumps(report,indent=2))
Path(str(foam_path)+".vtk-report.json").write_text(json.dumps(report,indent=2))
if fail:
    raise SystemExit("FoamLens vs VTK streamline validation failed: "+repr(fail))
print("FoamLens vs VTK B13 streamline validation passed.")
