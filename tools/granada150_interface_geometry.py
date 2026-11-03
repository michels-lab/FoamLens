#!/usr/bin/env python3
"""Read-only original OpenFOAM ASCII polyMesh interface-geometry evidence.

No CFD or checkMesh execution. No mutation of input files. Explicit reciprocal
boundary patches, real face vertices and opposite normals are compared.
Geometric compatibility is NOT certification of mesh quality or simulation.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys

MAX_BYTES = 24 * 1024 * 1024
NUMBER = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$")
LABEL = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]{0,119}$")
LIST = re.compile(r"(?m)^\s*(\d+)\s*\n\s*\(\s*(?:\n|$)")
PATCH = re.compile(r"(?m)^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\{([^{}]*)\}")


class EvidenceError(ValueError):
    pass


def read_source(path, case):
    if path.is_symlink() or path.parent.is_symlink() or path.parent.parent.is_symlink():
        raise EvidenceError("Original polyMesh symbolic links are not supported")
    if not path.resolve().is_relative_to(case):
        raise EvidenceError("Original polyMesh source escapes selected case")
    if not path.is_file() or path.stat().st_size > MAX_BYTES:
        raise EvidenceError("Original polyMesh source absent or oversized")
    data = path.read_bytes()
    if len(data) > MAX_BYTES:
        raise EvidenceError("Original source exceeds size limit")
    try:
        text = data.decode("ascii")
    except UnicodeDecodeError as exc:
        raise EvidenceError("Original source is not ASCII") from exc
    if not re.search(r"\bformat\s+ascii\s*;", text):
        raise EvidenceError("Only explicitly ASCII polyMesh is supported")
    return text, hashlib.sha256(data).hexdigest()


def list_tokens(source):
    match = LIST.search(source)
    if not match or int(match.group(1)) > 2_000_000:
        raise EvidenceError("Invalid original OpenFOAM list count")
    return int(match.group(1)), re.findall(r"[()]|[^\s()]+", source[match.end():])


def pop(tokens, index, value=None):
    if index >= len(tokens) or (value is not None and tokens[index] != value):
        raise EvidenceError("Truncated or malformed source list")
    return tokens[index], index + 1


def integer(value):
    if not re.fullmatch(r"\d+", value):
        raise EvidenceError("Invalid source index")
    return int(value)


def parse_points(source):
    count, tokens = list_tokens(source)
    pts, at = [], 0
    for _ in range(count):
        _, at = pop(tokens, at, "(")
        v = []
        for __ in range(3):
            raw, at = pop(tokens, at)
            if not NUMBER.fullmatch(raw) or not math.isfinite(float(raw)):
                raise EvidenceError("Nonfinite or invalid source point")
            v.append(float(raw))
        _, at = pop(tokens, at, ")")
        pts.append(tuple(v))
    pop(tokens, at, ")")
    return pts


def parse_faces(source, points):
    count, tokens = list_tokens(source)
    faces, at = [], 0
    for _ in range(count):
        raw, at = pop(tokens, at)
        n = integer(raw)
        if not 3 <= n <= 1024:
            raise EvidenceError("Degenerate or oversized original face")
        _, at = pop(tokens, at, "(")
        ids = []
        for __ in range(n):
            raw, at = pop(tokens, at)
            index = integer(raw)
            if index >= len(points):
                raise EvidenceError("Source face references nonexistent point")
            ids.append(index)
        _, at = pop(tokens, at, ")")
        if len(set(ids)) != n:
            raise EvidenceError("Source face has duplicate point IDs")
        faces.append(tuple(ids))
    pop(tokens, at, ")")
    return faces


def parse_boundary(source, face_count):
    match = LIST.search(source)
    if not match:
        raise EvidenceError("Original boundary list absent")
    count = int(match.group(1))
    blocks = list(PATCH.finditer(source, match.end()))
    if count != len(blocks) or count > 50_000:
        raise EvidenceError("Malformed original boundary patch count")
    patches, ranges = {}, []
    for block in blocks:
        name, body = block.group(1), block.group(2)
        if not LABEL.fullmatch(name) or name in patches:
            raise EvidenceError("Repeated or invalid original patch")
        def attr(field):
            found = re.search(r"(?:^|[;\s])" + re.escape(field)
                              + r"\s+([A-Za-z0-9_.-]+)\s*;", body)
            return found.group(1) if found else None
        raw_num, raw_start = attr("nFaces"), attr("startFace")
        if raw_num is None or raw_start is None:
            raise EvidenceError("Missing original nFaces/startFace")
        n, start = integer(raw_num), integer(raw_start)
        if start + n > face_count:
            raise EvidenceError("Patch reaches beyond original face list")
        ranges.append((start, start + n))
        patches[name] = {"name": name, "nFaces": n, "startFace": start,
                         "neighbourRegion": attr("neighbourRegion"),
                         "neighbourPatch": attr("neighbourPatch"),
                         "type": attr("type") or "unknown"}
    ranges = sorted((x for x in ranges if x[0] != x[1]))
    if any(b[0] < a[1] for a, b in zip(ranges, ranges[1:])):
        raise EvidenceError("Original boundary face ranges overlap")
    return patches


def source_mesh(case, region):
    root = case / "constant" / region / "polyMesh"
    original = {}
    hashes = {}
    for item in ("points", "faces", "boundary"):
        original[item], hashes[item] = read_source(root / item, case)
    points = parse_points(original["points"])
    faces = parse_faces(original["faces"], points)
    boundary = parse_boundary(original["boundary"], len(faces))
    return {"name": region, "points": points, "faces": faces,
            "patches": boundary, "hashes": hashes}


def newell(vertices):
    n = [0., 0., 0.]
    for a, b in zip(vertices, vertices[1:] + vertices[:1]):
        n[0] += (a[1]-b[1])*(a[2]+b[2])
        n[1] += (a[2]-b[2])*(a[0]+b[0])
        n[2] += (a[0]-b[0])*(a[1]+b[1])
    return n


def face_shapes(mesh, patch, tol):
    out, duplicates = {}, 0
    for index in range(patch["startFace"], patch["startFace"] + patch["nFaces"]):
        vertices = [mesh["points"][i] for i in mesh["faces"][index]]
        key = tuple(sorted(tuple(round(c/tol) for c in vertex) for vertex in vertices))
        if key in out:
            duplicates += 1
        else:
            out[key] = {"vertices": vertices, "normal": newell(vertices)}
    return out, duplicates


def match_pair(left, lp, right, rp, tol):
    la, duplicates_a = face_shapes(left, lp, tol)
    rb, duplicates_b = face_shapes(right, rp, tol)
    matched, wrong_normals, degenerate, max_dev = 0, 0, 0, 0.
    for key, face in la.items():
        counterpart = rb.get(key)
        if counterpart is None:
            continue
        matched += 1
        a, b = face["normal"], counterpart["normal"]
        aa = math.sqrt(sum(x*x for x in a))
        bb = math.sqrt(sum(x*x for x in b))
        if aa <= 1.e-25 or bb <= 1.e-25:
            degenerate += 1
            continue
        if sum(x*y for x, y in zip(a,b))/(aa*bb) > -0.99:
            wrong_normals += 1
        deviation = max(math.dist(x, y) for x, y in
                        zip(sorted(face["vertices"]), sorted(counterpart["vertices"])))
        max_dev = max(max_dev, deviation)
        if deviation > tol:
            wrong_normals += 1
    success = (lp["nFaces"] == rp["nFaces"] == matched
               and not any((duplicates_a, duplicates_b, wrong_normals, degenerate)))
    return {
        "region": left["name"], "patch": lp["name"],
        "otherRegion": right["name"], "otherPatch": rp["name"],
        "facesA": lp["nFaces"], "facesB": rp["nFaces"],
        "matchedFaces": matched,
        "unmatchedA": lp["nFaces"] - matched, "unmatchedB": rp["nFaces"] - matched,
        "duplicateA": duplicates_a, "duplicateB": duplicates_b,
        "nonOpposedFaces": wrong_normals, "degenerateNormals": degenerate,
        "maxMatchedVertexDeviationSourceUnits": max_dev,
        "status": "matching-opposite-original-faces" if success else
                  "nonmatching-or-nonconformal-original-interface",
    }


def audit(case, tolerance=1e-9):
    case = Path(case).expanduser().resolve()
    if not case.is_dir() or not (case/"constant").is_dir():
        raise EvidenceError("Selected original case is absent")
    if not math.isfinite(tolerance) or not 1e-12 <= tolerance <= 1e-5:
        raise EvidenceError("Tolerance outside supported source-coordinate bounds")
    regions = sorted(x.name for x in (case/"constant").iterdir()
                     if x.is_dir() and LABEL.fullmatch(x.name)
                     and (x/"polyMesh").is_dir())
    if not 2 <= len(regions) <= 32:
        raise EvidenceError("Expected 2–32 explicit named original source regions")
    meshes = {region: source_mesh(case, region) for region in regions}
    # The final batch integrity gate checks even earlier regions after
    # subsequent files have been read, not just during own region parsing.
    for region, mesh in meshes.items():
        for name, digest in mesh["hashes"].items():
            _, after = read_source(case/"constant"/region/"polyMesh"/name, case)
            if after != digest:
                raise EvidenceError("Original source changed during interface audit")
    pairs, processed = [], set()
    for region in regions:
        left = meshes[region]
        for patch in left["patches"].values():
            other_region, other_name = patch["neighbourRegion"], patch["neighbourPatch"]
            if not other_region and not other_name:
                continue
            key = (region, patch["name"])
            if key in processed:
                continue
            processed.add(key)
            right = meshes.get(other_region)
            counterpart = right["patches"].get(other_name) if right and other_name else None
            if counterpart is None:
                pairs.append({"region":region, "patch":patch["name"],
                              "status":"missing-reciprocal-original-patch"})
                continue
            processed.add((other_region, other_name))
            if (counterpart["neighbourRegion"] != region or
                counterpart["neighbourPatch"] != patch["name"]):
                pairs.append({"region":region,"patch":patch["name"],
                              "status":"nonreciprocal-original-interface"})
                continue
            pairs.append(match_pair(left,patch,right,counterpart,tolerance))
    passed = sum(x["status"] == "matching-opposite-original-faces" for x in pairs)
    return {
        "schema":"foamlens/original-polyMesh-interface-geometry/1",
        "caseLabel":case.name, "regions":regions, "regionCount":len(regions),
        "toleranceSourceCoordinateUnits":tolerance, "pairs":pairs,
        "matchingPairs":passed,
        "matchingFaces":sum(x.get("matchedFaces",0) for x in pairs if
                            x["status"]=="matching-opposite-original-faces"),
        "status":"geometric-source-interfaces-matched" if pairs and passed==len(pairs)
                 else "no-declared-interface" if not pairs
                 else "incomplete-or-nonconformal-interface-evidence",
        "checkMeshExecuted":False, "scientificValidity":"not-certified",
        "limitations":[
            "Only original ASCII source geometry, reciprocal patch names and face orientation were checked.",
            "Tolerance quantization can yield false negatives near rounding-bin boundaries.",
            "No checkMesh, CFD, thermal interpolation, or solver/interface physics certification.",
            "Nonconformal/AMI mapping may be legitimate and requires a separate interpolation audit."
        ],
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--case",required=True,type=Path)
    p.add_argument("--tolerance",type=float,default=1e-9)
    p.add_argument("--expected-pairs",type=int)
    p.add_argument("--expected-faces",type=int)
    a=p.parse_args()
    try:
        result=audit(a.case,a.tolerance)
    except (EvidenceError,OSError) as e:
        print("Original source audit unavailable: "+str(e),file=sys.stderr)
        return 2
    print(json.dumps(result,indent=2))
    if a.expected_pairs is not None and result["matchingPairs"]!=a.expected_pairs:
        return 1
    if a.expected_faces is not None and result["matchingFaces"]!=a.expected_faces:
        return 1
    return 0 if result["status"]=="geometric-source-interfaces-matched" else 1


if __name__=="__main__":
    raise SystemExit(main())
