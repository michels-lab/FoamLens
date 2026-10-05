#!/usr/bin/env python3
"""Independent VTK reference validation for FoamLens streamlines on a real OpenFOAM case."""

from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import statistics
import sys

import numpy as np

try:
    import vtk
    from vtk.util.numpy_support import vtk_to_numpy
except Exception as exc:
    raise SystemExit(f"VTK is required for streamline reference validation: {exc}")


def available_times(reader):
    vals = reader.GetTimeValues() if hasattr(reader, "GetTimeValues") else None
    if vals is None:
        return []
    return [float(vals.GetValue(i)) for i in range(vals.GetNumberOfValues())]


def set_time(reader, value):
    key = vtk.vtkStreamingDemandDrivenPipeline.UPDATE_TIME_STEP()
    reader.GetOutputInformation(0).Set(key, float(value))
    reader.Update()


def leaf_datasets(composite):
    if isinstance(composite, vtk.vtkDataSet):
        yield "", composite
        return
    it = composite.NewIterator()
    it.VisitOnlyLeavesOn()
    it.SkipEmptyNodesOn()
    it.InitTraversal()
    while not it.IsDoneWithTraversal():
        obj = it.GetCurrentDataObject()
        meta = it.GetCurrentMetaData()
        name = ""
        if meta is not None and meta.Has(vtk.vtkCompositeDataSet.NAME()):
            name = str(meta.Get(vtk.vtkCompositeDataSet.NAME()))
        if isinstance(obj, vtk.vtkDataSet):
            yield name, obj
        it.GoToNextItem()


def find_velocity_dataset(output, region):
    candidates = []
    for name, ds in leaf_datasets(output):
        arr = ds.GetCellData().GetArray("U")
        if arr is None or arr.GetNumberOfComponents() < 3 or ds.GetNumberOfCells() < 8:
            continue
        score = (2 if region.lower() in name.lower() else 0, ds.GetNumberOfCells())
        candidates.append((score, name, ds))
    if not candidates:
        names = []
        for name, ds in leaf_datasets(output):
            names.append({
                "name": name,
                "cells": ds.GetNumberOfCells(),
                "cell_arrays": [ds.GetCellData().GetArrayName(i) for i in range(ds.GetCellData().GetNumberOfArrays())],
                "point_arrays": [ds.GetPointData().GetArrayName(i) for i in range(ds.GetPointData().GetNumberOfArrays())],
            })
        raise RuntimeError("No VTK leaf dataset with cell-associated U was found. Leaves: " + json.dumps(names[:20]))
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1], candidates[0][2]


def cell_centers(ds):
    filt = vtk.vtkCellCenters()
    filt.SetInputData(ds)
    filt.VertexCellsOff()
    filt.Update()
    pts = filt.GetOutput().GetPoints()
    if pts is None:
        raise RuntimeError("VTK could not construct cell centers.")
    return np.asarray(vtk_to_numpy(pts.GetData()), dtype=float)


def pick_seeds(centers, vectors, bounds, count=4):
    lo = np.array(bounds[::2], dtype=float)
    hi = np.array(bounds[1::2], dtype=float)
    span = np.maximum(hi - lo, 1e-30)
    diag = float(np.linalg.norm(span))
    speed = np.linalg.norm(vectors[:, :3], axis=1)
    finite = np.isfinite(centers).all(axis=1) & np.isfinite(speed) & (speed > max(float(np.nanmax(speed)) * 1e-8, 1e-14))
    for margin in (0.12, 0.06, 0.02, 0.0):
        interior = finite & np.all((centers >= lo + margin * span) & (centers <= hi - margin * span), axis=1)
        ids = np.where(interior)[0]
        ids = ids[np.argsort(speed[ids])[::-1]]
        chosen = []
        for idx in ids:
            p = centers[idx]
            if all(np.linalg.norm(p - centers[j]) >= diag * 0.08 for j in chosen):
                chosen.append(int(idx))
            if len(chosen) >= count:
                return chosen
    ids = np.where(finite)[0]
    return [int(i) for i in ids[np.argsort(speed[ids])[::-1][:count]]]


def sample_foam_v(centers, vectors, point, nearest=8):
    d = centers - point
    d2 = np.einsum("ij,ij->i", d, d)
    k = min(nearest, len(d2))
    if k < 1:
        return None
    idx = np.argpartition(d2, k - 1)[:k]
    vv = vectors[idx, :3]
    mask = np.isfinite(vv).all(axis=1)
    if not np.any(mask):
        return None
    idx = idx[mask]
    vv = vectors[idx, :3]
    dd = d2[idx]
    w = 1.0 / np.maximum(dd, 1e-18)
    return np.sum(vv * w[:, None], axis=0) / np.sum(w)


def inside(point, lo, hi, pad):
    return bool(np.all(point >= lo - pad) and np.all(point <= hi + pad))


def trace_foamlens(seed, centers, vectors, bounds, direction, step, max_steps, max_length):
    lo = np.array(bounds[::2], dtype=float)
    hi = np.array(bounds[1::2], dtype=float)
    p = np.array(seed, dtype=float)
    out = [p.copy()]
    length = 0.0
    sign = 1.0 if direction == "forward" else -1.0
    for _ in range(max_steps):
        if length + step > max_length + 1e-12:
            break
        v1 = sample_foam_v(centers, vectors, p)
        if v1 is None:
            break
        s1 = float(np.linalg.norm(v1))
        if not (s1 > 1e-14):
            break
        u1 = v1 / s1
        mid = p + sign * 0.5 * step * u1
        v2 = sample_foam_v(centers, vectors, mid)
        if v2 is None:
            break
        s2 = float(np.linalg.norm(v2))
        if not (s2 > 1e-14):
            break
        u2 = v2 / s2
        nxt = p + sign * step * u2
        if not inside(nxt, lo, hi, step * 0.25):
            break
        length += float(np.linalg.norm(nxt - p))
        p = nxt
        out.append(p.copy())
    return np.asarray(out), length


def to_point_velocity(ds):
    c2p = vtk.vtkCellDataToPointData()
    c2p.SetInputData(ds)
    c2p.PassCellDataOn()
    c2p.Update()
    out = c2p.GetOutput()
    u = out.GetPointData().GetArray("U")
    if u is None:
        raise RuntimeError("vtkCellDataToPointData did not produce point-associated U.")
    out.GetPointData().SetActiveVectors("U")
    return out


def trace_vtk(point_ds, seed, direction, step, max_length):
    pts = vtk.vtkPoints()
    pts.InsertNextPoint(float(seed[0]), float(seed[1]), float(seed[2]))
    source = vtk.vtkPolyData()
    source.SetPoints(pts)

    tracer = vtk.vtkStreamTracer()
    tracer.SetInputData(point_ds)
    tracer.SetSourceData(source)
    tracer.SetInputArrayToProcess(0, 0, 0, vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS, "U")
    tracer.SetIntegratorTypeToRungeKutta4()
    if hasattr(vtk.vtkStreamTracer, "LENGTH_UNIT"):
        tracer.SetIntegrationStepUnit(vtk.vtkStreamTracer.LENGTH_UNIT)
    tracer.SetInitialIntegrationStep(float(step))
    tracer.SetMinimumIntegrationStep(float(step) * 0.25)
    tracer.SetMaximumIntegrationStep(float(step) * 2.0)
    tracer.SetMaximumPropagation(float(max_length))
    tracer.SetMaximumNumberOfSteps(2000)
    tracer.SetTerminalSpeed(1e-14)
    if direction == "forward":
        tracer.SetIntegrationDirectionToForward()
    else:
        tracer.SetIntegrationDirectionToBackward()
    tracer.Update()
    out = tracer.GetOutput()
    if out.GetNumberOfPoints() < 2 or out.GetNumberOfLines() < 1:
        return np.empty((0, 3)), 0.0

    lines = out.GetLines()
    ids = vtk.vtkIdList()
    lines.InitTraversal()
    best = []
    while lines.GetNextCell(ids):
        row = [ids.GetId(i) for i in range(ids.GetNumberOfIds())]
        if len(row) > len(best):
            best = row
    if len(best) < 2:
        return np.empty((0, 3)), 0.0
    xyz = np.asarray([out.GetPoint(i) for i in best], dtype=float)
    length = float(np.linalg.norm(np.diff(xyz, axis=0), axis=1).sum())
    if np.linalg.norm(xyz[-1] - seed) < np.linalg.norm(xyz[0] - seed):
        xyz = xyz[::-1].copy()
    return xyz, length


def resample(path, n=48, max_distance=None):
    if len(path) < 2:
        return None
    seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
    s = np.concatenate(([0.0], np.cumsum(seg)))
    total = float(s[-1])
    if total <= 0:
        return None
    limit = total if max_distance is None else min(total, float(max_distance))
    if limit <= 0:
        return None
    q = np.linspace(0.0, limit, n)
    out = np.column_stack([np.interp(q, s, path[:, axis]) for axis in range(3)])
    return out


def compare_paths(a, b, diag, len_a, len_b):
    common = min(float(len_a), float(len_b))
    if common <= diag * 0.01:
        return None
    aa = resample(a, 48, common)
    bb = resample(b, 48, common)
    if aa is None or bb is None:
        return None
    dist = np.linalg.norm(aa - bb, axis=1)
    rms = float(np.sqrt(np.mean(dist * dist)) / diag)
    mx = float(np.max(dist) / diag)
    endpoint = float(np.linalg.norm(aa[-1] - bb[-1]) / diag)
    length_rel = float(abs(len_a - len_b) / max(len_a, len_b, diag * 1e-12))
    return {"rms_diag": rms, "max_diag": mx, "endpoint_diag": endpoint, "length_rel": length_rel, "common_length": common}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("case")
    ap.add_argument("--time", type=float, default=9.8)
    ap.add_argument("--region", default="metal")
    ap.add_argument("--seeds", type=int, default=4)
    ap.add_argument("--output", default="streamline-vtk-validation.json")
    args = ap.parse_args()

    case = Path(args.case).resolve()
    if not case.is_dir():
        raise SystemExit(f"OpenFOAM case not found: {case}")
    marker = case / "FoamLensVTKValidation.foam"
    marker.touch(exist_ok=True)

    reader = vtk.vtkOpenFOAMReader()
    reader.SetFileName(str(marker))
    if hasattr(reader, "SetCreateCellToPoint"):
        reader.SetCreateCellToPoint(False)
    reader.UpdateInformation()
    try:
        reader.DisableAllCellArrays()
        reader.SetCellArrayStatus("U", 1)
    except Exception:
        pass

    times = available_times(reader)
    selected_time = min(times, key=lambda t: abs(t - args.time)) if times else args.time
    if times and abs(selected_time - args.time) > 1e-7:
        raise RuntimeError(f"Requested physical time {args.time} is unavailable; nearest VTK time is {selected_time}.")
    set_time(reader, selected_time)

    block_name, ds = find_velocity_dataset(reader.GetOutput(), args.region)
    u_arr = ds.GetCellData().GetArray("U")
    vectors = np.asarray(vtk_to_numpy(u_arr), dtype=float)
    centers = cell_centers(ds)
    if len(vectors) != len(centers):
        raise RuntimeError(f"Cell U count {len(vectors)} does not match cell-center count {len(centers)}.")

    bounds = ds.GetBounds()
    span = np.array([bounds[1]-bounds[0], bounds[3]-bounds[2], bounds[5]-bounds[4]], dtype=float)
    diag = float(np.linalg.norm(span))
    if not diag > 0:
        raise RuntimeError("Invalid VTK domain diagonal.")
    step = diag * 0.0045
    max_length = diag
    seed_ids = pick_seeds(centers, vectors, bounds, max(3, args.seeds))
    point_ds = to_point_velocity(ds)

    records = []
    for seed_id in seed_ids:
        seed = centers[seed_id].copy()
        speed = float(np.linalg.norm(vectors[seed_id, :3]))
        for direction in ("forward", "backward"):
            foam_path, foam_len = trace_foamlens(seed, centers, vectors, bounds, direction, step, 300, max_length)
            vtk_path, vtk_len = trace_vtk(point_ds, seed, direction, step, max_length)
            metrics = compare_paths(foam_path, vtk_path, diag, foam_len, vtk_len)
            records.append({
                "seed_cell": seed_id,
                "seed": [float(x) for x in seed],
                "seed_speed": speed,
                "direction": direction,
                "foam_points": int(len(foam_path)),
                "vtk_points": int(len(vtk_path)),
                "foam_length": float(foam_len),
                "vtk_length": float(vtk_len),
                "metrics": metrics,
            })

    valid = [r for r in records if r["metrics"] is not None and r["foam_points"] >= 4 and r["vtk_points"] >= 4]
    if len(valid) < max(4, args.seeds):
        raise RuntimeError(f"Only {len(valid)} representative VTK/FoamLens paths were comparable; records={json.dumps(records)}")

    rms = [r["metrics"]["rms_diag"] for r in valid]
    endpoint = [r["metrics"]["endpoint_diag"] for r in valid]
    length_rel = [r["metrics"]["length_rel"] for r in valid]
    max_dist = [r["metrics"]["max_diag"] for r in valid]
    summary = {
        "validator": "VTK vtkOpenFOAMReader + vtkStreamTracer (RK4) vs independent FoamLens RK2/IDW reference",
        "case": case.name,
        "region": args.region,
        "vtk_block": block_name,
        "time": selected_time,
        "cells": int(ds.GetNumberOfCells()),
        "points": int(ds.GetNumberOfPoints()),
        "domain_diagonal": diag,
        "foam_step": step,
        "seeds": len(seed_ids),
        "comparable_paths": len(valid),
        "median_rms_diag": float(statistics.median(rms)),
        "worst_rms_diag": float(max(rms)),
        "median_max_diag": float(statistics.median(max_dist)),
        "median_endpoint_diag": float(statistics.median(endpoint)),
        "median_length_rel": float(statistics.median(length_rel)),
        "records": records,
        "thresholds": {
            "median_rms_diag": 0.08,
            "worst_rms_diag": 0.18,
            "median_endpoint_diag": 0.18,
            "median_length_rel": 0.35,
        }
    }
    failures = []
    for key, limit in summary["thresholds"].items():
        if summary[key] > limit:
            failures.append(f"{key}={summary[key]:.6g} > {limit:.6g}")

    Path(args.output).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in summary.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit("VTK streamline reference validation failed: " + "; ".join(failures))
    print("FoamLens streamline VTK reference validation passed.")


if __name__ == "__main__":
    main()
