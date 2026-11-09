"""FoamLens CAD conversion through an *installed* FreeCADCmd / OpenCascade.

Launched headlessly by the Windows host in a private temporary WSL-visible
directory. Never run through an arbitrary user-supplied Python or shell command.
No installation, network access, OpenFOAM case edits or automatic healing.
"""
import json
import math
import os
import struct
import sys

MAX_SOLIDS = 24
MAX_TRIANGLES = 300_000
MAX_STL_BYTES = 16 * 1024 * 1024
ALLOWED_EXT = (".step", ".iges", ".brep")


def require_finite(values):
    if not all(math.isfinite(float(v)) for v in values):
        raise ValueError("Non-finite OCCT vertex, normal or geometry metric")


def tessellate_binary_stl(shape, target, max_remaining, tolerance):
    vertices, triangles = shape.tessellate(tolerance)
    count = len(triangles)
    if count < 1 or count > max_remaining:
        raise ValueError("OCCT output is empty or exceeds 300000 triangle preview limit")
    if len(vertices) < 3 or 84 + 50 * count > MAX_STL_BYTES:
        raise ValueError("OCCT output exceeds per-region binary STL limit")
    with open(target, "wb") as stream:
        stream.write(b"FoamLens FreeCAD OpenCascade".ljust(80, b"\0"))
        stream.write(struct.pack("<I", count))
        for tri in triangles:
            if len(tri) != 3 or any(not 0 <= int(i) < len(vertices) for i in tri):
                raise ValueError("Invalid topology index from OCCT tessellation")
            coords = [
                (float(vertices[int(i)].x), float(vertices[int(i)].y), float(vertices[int(i)].z))
                for i in tri
            ]
            flat = [v for point in coords for v in point]
            require_finite(flat)
            a, b, c = coords
            ab = [b[i] - a[i] for i in range(3)]
            ac = [c[i] - a[i] for i in range(3)]
            n = (
                ab[1] * ac[2] - ab[2] * ac[1],
                ab[2] * ac[0] - ab[0] * ac[2],
                ab[0] * ac[1] - ab[1] * ac[0],
            )
            size = math.sqrt(sum(x * x for x in n))
            normal = tuple(x / size for x in n) if size > 0 else (0.0, 0.0, 0.0)
            require_finite(normal)
            try:
                stream.write(struct.pack("<12fH", *(normal + tuple(flat)), 0))
            except (OverflowError, struct.error) as exc:
                raise ValueError("OCCT vertices exceed binary STL float32 range") from exc
    return count


def main():
    import Part  # The installed FreeCADCmd must provide actual OCCT Part module.

    base = os.path.dirname(os.path.realpath(__file__))
    files = [name for name in ("source.step", "source.iges", "source.brep")
             if os.path.isfile(os.path.join(base, name))]
    if len(files) != 1:
        raise ValueError("Exactly one supported STEP/IGES/BREP source is required")
    source = os.path.join(base, files[0])
    with open(os.path.join(base, "settings.json"), encoding="utf-8") as file:
        settings = json.load(file)
    tolerance = float(settings["deflectionMm"])
    if not math.isfinite(tolerance) or tolerance not in (0.2, 0.5, 1.0):
        raise ValueError("Unsupported OCCT linear tessellation tolerance")

    shape = Part.Shape()
    shape.read(source)
    if shape.isNull() or not shape.isValid() or not shape.Faces:
        raise ValueError("FreeCAD/OCCT could not load a valid face-bearing BREP")
    solids = list(shape.Solids)
    if len(solids) > MAX_SOLIDS:
        raise ValueError("CAD assembly exceeds 24 separately previewable solids")
    parts = solids if solids else [shape]
    regions = []
    total = 0
    for i, piece in enumerate(parts, 1):
        if piece.isNull() or not piece.Faces:
            raise ValueError("Encountered an empty OCCT region")
        name = "solid_%03d" % i if solids else "surface_001"
        filename = "region_%03d.stl" % i
        fullpath = os.path.join(base, filename)
        count = tessellate_binary_stl(
            piece, fullpath, MAX_TRIANGLES - total, tolerance
        )
        total += count
        size = os.path.getsize(fullpath)
        if size != 84 + 50 * count:
            raise ValueError("STL output size does not match actual triangle count")
        bounds = piece.BoundBox
        lengths = [float(bounds.XLength), float(bounds.YLength), float(bounds.ZLength)]
        area = float(piece.Area)
        require_finite(lengths + [area])
        if any(x < 0 for x in lengths) or area < 0:
            raise ValueError("Negative geometry extent/area from OCCT")
        regions.append({
            "name": name,
            "file": filename,
            "triangles": count,
            "sizeBytes": size,
            "boundsMm": lengths,
            "surfaceAreaMm2": area,
            "solidIndex": i if solids else None,
        })

    result = {
        "schema": "foamlens/native-occt-conversion/1",
        "engine": "FreeCAD/OpenCascade",
        "sourceFormat": os.path.splitext(files[0])[1].lstrip("."),
        "sourceObjectLabelsPreserved": False,
        "freecadInternalCoordinateUnit": "mm",
        "sourceUnitsIndependentlyVerified": False,
        "deflectionMm": tolerance,
        "originalCaseModified": False,
        "totalTriangles": total,
        "regions": regions,
        "limitations": [
            "FreeCAD/OCCT imported and tessellated BREP faces; output is not a volume mesh.",
            "FreeCAD internal coordinates are millimeters; verify expected dimensions in CAD.",
            "Original STEP/IGES assembly labels are not preserved; solids use stable ordinal names.",
            "Tessellation and shape validity do not certify an OpenFOAM-ready CFD boundary.",
        ],
    }
    with open(os.path.join(base, "conversion.json"), "w", encoding="utf-8") as file:
        json.dump(result, file, ensure_ascii=True)
    print("FoamLens: FreeCAD OCCT conversion completed (%d triangle surfaces)" % len(regions))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not print private file paths or the user's input content to logs.
        print("FoamLens: FreeCAD/OCCT conversion failed: " + type(error).__name__, file=sys.stderr)
        sys.exit(2)
