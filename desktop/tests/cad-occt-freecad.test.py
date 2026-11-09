"""Tests actual bundled conversion script with a controlled fake Part API.

This is NOT proof that FreeCAD or OpenCascade was installed/executed.
End-to-end kernel acceptance remains separate and requires user WSL.
"""
import json
import os
import runpy
import shutil
import struct
import sys
import tempfile
import types
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "src" / "FoamLensDesktop" / "NativeCadOcctFreecad.py"


class Vec:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z


class Box:
    XLength = 100
    YLength = 200
    ZLength = 50


class Solid:
    Faces = [1]
    BoundBox = Box()
    Area = 12000

    def __init__(self, size=100):
        self.size = size

    def isNull(self):
        return False

    def tessellate(self, tolerance):
        if tolerance not in (0.2, 0.5, 1.0):
            raise ValueError("Unexpected quality")
        return (
            [Vec(0, 0, 0), Vec(self.size, 0, 0), Vec(0, 200, 0)],
            [(0, 1, 2)],
        )


class Shape(Solid):
    pieces = [Solid(100), Solid(50)]
    invalid = False

    def read(self, filename):
        if not Path(filename).read_bytes().startswith(b"ISO-10303-21;"):
            raise ValueError("Invalid test source")

    def isValid(self):
        return not self.invalid

    @property
    def Solids(self):
        return self.pieces


class TestOcctScript(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.dir = Path(self.temp.name)
        shutil.copyfile(SCRIPT, self.dir / "convert.py")
        (self.dir / "source.step").write_bytes(b"ISO-10303-21; fake STEP used only for script I/O")
        (self.dir / "settings.json").write_text(json.dumps({"deflectionMm": 0.5}))
        self.original = sys.modules.get("Part")
        sys.modules["Part"] = types.SimpleNamespace(Shape=Shape)
        Shape.invalid = False
        Shape.pieces = [Solid(100), Solid(50)]

    def tearDown(self):
        if self.original is None:
            sys.modules.pop("Part", None)
        else:
            sys.modules["Part"] = self.original
        self.temp.cleanup()

    def run_script(self):
        runpy.run_path(str(self.dir / "convert.py"), run_name="__main__")

    def test_two_solids_have_real_binary_stl_shapes_and_conservative_provenance(self):
        self.run_script()
        manifest = json.loads((self.dir / "conversion.json").read_text())
        self.assertEqual(manifest["engine"], "FreeCAD/OpenCascade")
        self.assertEqual(manifest["sourceFormat"], "step")
        self.assertEqual(manifest["freecadInternalCoordinateUnit"], "mm")
        self.assertFalse(manifest["sourceUnitsIndependentlyVerified"])
        self.assertFalse(manifest["sourceObjectLabelsPreserved"])
        self.assertFalse(manifest["originalCaseModified"])
        self.assertEqual(manifest["totalTriangles"], 2)
        self.assertEqual([r["name"] for r in manifest["regions"]], ["solid_001", "solid_002"])
        for row in manifest["regions"]:
            payload = (self.dir / row["file"]).read_bytes()
            self.assertEqual(len(payload), 134)
            self.assertEqual(struct.unpack_from("<I", payload, 80)[0], 1)
            self.assertEqual(row["sizeBytes"], len(payload))
            self.assertAlmostEqual(struct.unpack_from("<f", payload, 84 + 12 + 12)[0], 100 if row["solidIndex"] == 1 else 50)
        self.assertEqual(list(self.dir.glob("region_*.stl")).__len__(), 2)

    def test_no_closed_solids_still_imports_surface_shape(self):
        Shape.pieces = []
        self.run_script()
        data = json.loads((self.dir / "conversion.json").read_text())
        self.assertEqual(data["regions"][0]["name"], "surface_001")
        self.assertEqual(data["regions"][0]["solidIndex"], None)

    def test_reject_invalid_shape_without_writing_manifest(self):
        Shape.invalid = True
        with self.assertRaises(SystemExit) as error:
            self.run_script()
        self.assertEqual(error.exception.code, 2)
        self.assertFalse((self.dir / "conversion.json").exists())

    def test_reject_too_many_solids_before_tessellation(self):
        Shape.pieces = [Solid() for _ in range(25)]
        with self.assertRaises(SystemExit):
            self.run_script()
        self.assertFalse((self.dir / "conversion.json").exists())

    def test_reject_unapproved_tessellation_quality(self):
        (self.dir / "settings.json").write_text(json.dumps({"deflectionMm": -4}))
        with self.assertRaises(SystemExit):
            self.run_script()
        self.assertFalse((self.dir / "conversion.json").exists())


if __name__ == "__main__":
    unittest.main()
