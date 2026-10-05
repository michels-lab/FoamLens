#!/usr/bin/env python3
import json, math, os, sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit("Usage: vtk_streamline_reference.py <OpenFOAM case> <foamlens.json> <report.json>")
case_root=Path(sys.argv[1]).resolve()
input_path=Path(sys.argv[2])
report_path=Path(sys.argv[3])
data=json.loads(input_path.read_text())
time=float(data["time"])
seeds=[[float(v) for v in p] for p in data["seeds"]]
foam_lines=[[[float(v) for v in p] for p in line] for line in data["foamLensLines"]]
diag=float(data["mesh"]["diag"])
step=float(data["integration"]["step"])
max_length=float(data["integration"]["maxLength"])

import vtk
from vtkmodules.vtkCommonDataModel import vtkCompositeDataSet, vtkDataObject
from vtkmodules.vtkFiltersCore import vtkCellDataToPointData
from vtkmodules.vtkFiltersFlowPaths import vtkStreamTracer
from vtkmodules.vtkCommonCore import vtkPoints
from vtkmodules.vtkCommonDataModel import vtkPolyData

marker=case_root/"FoamLensVTK.foam"
marker.write_text("")
reader=vtk.vtkOpenFOAMReader()
reader.SetFileName(str(marker))
reader.SetCreateCellToPoint(1)
reader.UpdateInformation()
reader.EnableAllCellArrays()
reader.EnableAllPointArrays()
reader.EnableAllPatchArrays()
if hasattr(reader,"SetTimeValue"):
    if not reader.SetTimeValue(time):
        raise RuntimeError(f"VTK OpenFOAM reader rejected requested time {time}")
reader.Update()
root=reader.GetOutput()

def leaves(obj, prefix=""):
    out=[]
    if obj is None:
        return out
    if obj.IsA("vtkDataSet"):
        out.append((prefix,obj))
        return out
    if obj.IsA("vtkMultiBlockDataSet"):
        for i in range(obj.GetNumberOfBlocks()):
            child=obj.GetBlock(i)
            name=""
            md=obj.GetMetaData(i)
            if md and md.Has(vtkCompositeDataSet.NAME()):
                name=md.Get(vtkCompositeDataSet.NAME()) or ""
            out.extend(leaves(child,prefix+"/"+name))
    elif obj.IsA("vtkPartitionedDataSetCollection"):
        for i in range(obj.GetNumberOfPartitionedDataSets()):
            out.extend(leaves(obj.GetPartitionedDataSet(i),prefix+f"/pdc{i}"))
    elif obj.IsA("vtkPartitionedDataSet"):
        for i in range(obj.GetNumberOfPartitions()):
            out.extend(leaves(obj.GetPartition(i),prefix+f"/part{i}"))
    return out

def seed_containment(ds):
    locator=vtk.vtkStaticCellLocator()
    locator.SetDataSet(ds)
    locator.BuildLocator()
    return sum(1 for p in seeds if locator.FindCell(p)>=0)

candidates=[]
for name,ds in leaves(root):
    pd=ds.GetPointData()
    cd=ds.GetCellData()
    has_u=(pd and pd.HasArray("U")) or (cd and cd.HasArray("U"))
    if has_u and ds.GetNumberOfCells()>0:
        inside=seed_containment(ds)
        candidates.append((inside,ds.GetNumberOfCells(),ds.GetNumberOfPoints(),name,ds))
if not candidates:
    raise RuntimeError("VTK did not expose any OpenFOAM dataset containing U.")
print("VTK U-bearing blocks:",json.dumps([
    {"name":x[3],"seedCells":x[0],"cells":x[1],"points":x[2],"bounds":list(x[4].GetBounds())}
    for x in sorted(candidates,key=lambda q:(q[0],q[1],q[2]),reverse=True)
],indent=2))
candidates.sort(key=lambda x:(x[0],x[1],x[2]),reverse=True)
inside_count,_,_,block_name,dataset=candidates[0]
if inside_count<=0:
    raise RuntimeError("No VTK U-bearing dataset contains any FoamLens in-mesh validation seed.")

if not dataset.GetPointData().HasArray("U"):
    c2p=vtkCellDataToPointData()
    c2p.SetInputData(dataset)
    c2p.PassCellDataOn()
    c2p.Update()
    dataset=c2p.GetOutput()
if not dataset.GetPointData().HasArray("U"):
    raise RuntimeError("VTK could not produce point-associated U for streamline tracing.")
dataset.GetPointData().SetActiveVectors("U")
print("VTK selected streamline block:",json.dumps({
    "name":block_name,
    "seedCells":inside_count,
    "cells":dataset.GetNumberOfCells(),
    "points":dataset.GetNumberOfPoints(),
    "bounds":list(dataset.GetBounds()),
    "pointArrays":[dataset.GetPointData().GetArrayName(i) for i in range(dataset.GetPointData().GetNumberOfArrays())],
    "cellArrays":[dataset.GetCellData().GetArrayName(i) for i in range(dataset.GetCellData().GetNumberOfArrays())]
},indent=2))

pts=vtkPoints()
for p in seeds:
    pts.InsertNextPoint(*p)
source=vtkPolyData()
source.SetPoints(pts)

tracer=vtkStreamTracer()
tracer.SetInputData(dataset)
tracer.SetSourceData(source)
tracer.SetInputArrayToProcess(0,0,0,vtkDataObject.FIELD_ASSOCIATION_POINTS,"U")
tracer.SetIntegratorTypeToRungeKutta2()
tracer.SetIntegrationDirectionToBoth()
tracer.SetIntegrationStepUnit(vtkStreamTracer.LENGTH_UNIT)
tracer.SetInitialIntegrationStep(step)
tracer.SetMinimumIntegrationStep(step)
tracer.SetMaximumIntegrationStep(step)
tracer.SetMaximumPropagation(max_length)
if hasattr(tracer,"SetMaximumNumberOfSteps"):
    tracer.SetMaximumNumberOfSteps(int(data["integration"]["maxSteps"]))
tracer.SetComputeVorticity(False)
tracer.Update()
out=tracer.GetOutput()

vtk_lines=[]
for ci in range(out.GetNumberOfCells()):
    cell=out.GetCell(ci)
    ids=cell.GetPointIds()
    if ids.GetNumberOfIds()<2:
        continue
    line=[]
    for j in range(ids.GetNumberOfIds()):
        line.append(list(out.GetPoint(ids.GetId(j))))
    vtk_lines.append(line)
if not vtk_lines:
    raise RuntimeError("vtkStreamTracer produced no output lines.")

def dist(a,b):
    return math.sqrt(sum((a[i]-b[i])**2 for i in range(3)))
def arclength(line):
    return sum(dist(line[i-1],line[i]) for i in range(1,len(line)))
def resample(line,n=80):
    if not line:
        return []
    cum=[0.0]
    for i in range(1,len(line)):
        cum.append(cum[-1]+dist(line[i-1],line[i]))
    total=cum[-1]
    if total<=0:
        return [line[0][:] for _ in range(n)]
    result=[]
    j=1
    for k in range(n):
        target=total*k/(n-1)
        while j<len(cum)-1 and cum[j]<target:
            j+=1
        a=max(0,j-1);b=min(len(line)-1,j)
        span=cum[b]-cum[a]
        f=0.0 if span<=0 else (target-cum[a])/span
        result.append([line[a][q]+f*(line[b][q]-line[a][q]) for q in range(3)])
    return result
def rms_pair(a,b):
    return math.sqrt(sum(dist(x,y)**2 for x,y in zip(a,b))/max(1,len(a)))
def hausdorff(a,b):
    def directed(x,y):
        return max(min(dist(p,q) for q in y) for p in x)
    return max(directed(a,b),directed(b,a))
def closest_seed_distance(line,seed):
    return min(dist(p,seed) for p in line)

unused=set(range(len(vtk_lines)))
matches=[]
for si,seed in enumerate(seeds):
    ranked=sorted(unused,key=lambda li:closest_seed_distance(vtk_lines[li],seed))
    if not ranked:
        matches.append({"seedIndex":si,"ok":False,"reason":"no-unmatched-vtk-line"})
        continue
    li=ranked[0]
    unused.remove(li)
    fl=foam_lines[si];vl=vtk_lines[li]
    fr=resample(fl);vr=resample(vl)
    rev=list(reversed(vr))
    rms_forward=rms_pair(fr,vr);rms_reverse=rms_pair(fr,rev)
    if rms_reverse<rms_forward:
        vr=rev
    rms=rms_pair(fr,vr)
    hd=hausdorff(fr,vr)
    flen=arclength(fl);vlen=arclength(vl)
    length_rel=abs(flen-vlen)/max(flen,vlen,diag*1e-12)
    seed_error=closest_seed_distance(vl,seed)
    matches.append({
        "seedIndex":si,"vtkLineIndex":li,"ok":True,
        "foamLensPoints":len(fl),"vtkPoints":len(vl),
        "foamLensLength":flen,"vtkLength":vlen,
        "rms":rms,"rmsDiag":rms/diag,
        "hausdorff":hd,"hausdorffDiag":hd/diag,
        "lengthRelativeDifference":length_rel,
        "seedDistance":seed_error,"seedDistanceDiag":seed_error/diag
    })

good=[m for m in matches if m.get("ok")]
if len(good)<max(3,math.ceil(len(seeds)*0.6)):
    raise RuntimeError(f"Only {len(good)}/{len(seeds)} streamlines could be matched to VTK.")

rms_vals=[m["rmsDiag"] for m in good]
hd_vals=[m["hausdorffDiag"] for m in good]
len_vals=[m["lengthRelativeDifference"] for m in good]
report={
    "schema":"foamlens-vtk-streamline-validation-v1",
    "vtkVersion":vtk.vtkVersion.GetVTKVersion(),
    "reader":"vtkOpenFOAMReader",
    "tracer":"vtkStreamTracer/RK2",
    "caseName":data["caseName"],"region":data["region"],"field":data["field"],"time":time,
    "vtkBlock":block_name,
    "datasetCells":dataset.GetNumberOfCells(),"datasetPoints":dataset.GetNumberOfPoints(),
    "compared":len(good),"requested":len(seeds),
    "thresholds":{"maxMeanRmsDiag":0.06,"maxWorstRmsDiag":0.10,"maxWorstHausdorffDiag":0.16,"maxMeanLengthRelativeDifference":0.35},
    "metrics":{
        "meanRmsDiag":sum(rms_vals)/len(rms_vals),
        "worstRmsDiag":max(rms_vals),
        "worstHausdorffDiag":max(hd_vals),
        "meanLengthRelativeDifference":sum(len_vals)/len(len_vals)
    },
    "matches":matches
}
t=report["thresholds"];m=report["metrics"]
report["passed"]=(
    m["meanRmsDiag"]<=t["maxMeanRmsDiag"] and
    m["worstRmsDiag"]<=t["maxWorstRmsDiag"] and
    m["worstHausdorffDiag"]<=t["maxWorstHausdorffDiag"] and
    m["meanLengthRelativeDifference"]<=t["maxMeanLengthRelativeDifference"]
)
report_path.write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if not report["passed"]:
    raise SystemExit("FoamLens vs VTK streamline geometry exceeded validation thresholds.")
