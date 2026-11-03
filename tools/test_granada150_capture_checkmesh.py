"""Negative local-source/case safety fixtures for Granada #150 capture tool.

The fake stdout represents synthetic fixtures; NO real checkMesh execution or
physical mesh-validity claims are made by these unit tests.
"""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase, main, mock
import subprocess

MODULE = Path(__file__).with_name("granada150_capture_checkmesh.py")
spec = importlib.util.spec_from_file_location("granada150_capture", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class CheckMeshCaptureTests(TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.case = self.root / "caseA"
        for region in ("metal", "mold"):
            mesh = self.case / "constant" / region / "polyMesh"
            mesh.mkdir(parents=True)
            for item in mod.MESH_FILES:
                (mesh / item).write_bytes(("source " + region + "/" + item).encode())
        self.out = self.root / "evidence"

    @staticmethod
    def response(args, region=None, returncode=0, stderr=b""):
        region = region or args[args.index("-region") + 1]
        raw = (f"Exec : checkMesh -region {region} -allTopology -allGeometry\n"
               f"Create polyMesh {region} for time = 0\n"
               "Mesh stats\n points: 4\n faces: 4\n cells: 1\nMesh OK.\n")
        return subprocess.CompletedProcess(args, returncode, raw.encode(), stderr)

    def test_two_regions_are_discovered_and_original_bytes_preserved(self):
        with mock.patch.object(mod.shutil, "which", return_value="/usr/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run", side_effect=self.response) as runner:
            result = mod.capture(self.case, self.out)
        self.assertEqual([r["region"] for r in result["regions"]], ["metal", "mold"])
        self.assertTrue(result["allSourceReportsReady"])
        self.assertTrue(all(r["meshFilesUnchanged"] for r in result["regions"]))
        self.assertTrue(all(r["scientificValidity"] == "not-certified" for r in result["regions"]))
        self.assertEqual(runner.call_count, 2)
        for call in runner.call_args_list:
            args = call.args[0]
            self.assertEqual(args[-2:], ["-allTopology", "-allGeometry"])
            self.assertNotIn("-writeSets", args)
            self.assertNotIn("foamMultiRun", args)
        self.assertTrue((self.out / "checkMesh_capture_manifest.json").is_file())
        self.assertIn(b"Exec : checkMesh -region metal",
                      (self.out / "checkMesh_metal.log").read_bytes())

    def test_output_inside_case_is_forbidden_without_running_a_command(self):
        with mock.patch.object(mod.subprocess, "run") as runner:
            with self.assertRaisesRegex(mod.CaptureError, "OUTSIDE"):
                mod.capture(self.case, self.case / "audit")
            runner.assert_not_called()

    def test_repeated_capture_never_overwrites_a_prior_log(self):
        self.out.mkdir()
        (self.out / "checkMesh_metal.log").write_text("existing original science")
        with self.assertRaisesRegex(mod.CaptureError, "never overwrite"):
            mod.capture(self.case, self.out)
        self.assertEqual((self.out / "checkMesh_metal.log").read_text(),
                         "existing original science")

    def test_missing_mesh_file_fails_closed(self):
        (self.case / "constant" / "metal" / "polyMesh" / "faces").unlink()
        with mock.patch.object(mod.shutil, "which", return_value="/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run") as runner:
            with self.assertRaisesRegex(mod.CaptureError, "missing original polyMesh/faces"):
                mod.capture(self.case, self.out)
            runner.assert_not_called()

    def test_inconsistent_source_region_fails_but_preserves_original_log(self):
        def misleading(args, **kwargs):
            return self.response(args, region="mold")
        with mock.patch.object(mod.shutil, "which", return_value="/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run", side_effect=misleading):
            result = mod.capture(self.case, self.out, regions=["metal"])
        self.assertFalse(result["allSourceReportsReady"])
        self.assertEqual(result["regions"][0]["status"], "region-not-proven-by-both-markers")
        self.assertTrue((self.out / "checkMesh_metal.log").exists())

    def test_command_only_never_proves_region(self):
        raw = b"Exec : checkMesh -region metal\nMesh stats\n cells: 1\nMesh OK.\n"
        self.assertFalse(mod.region_marker_evidence(raw)["matched"])
        raw = b"Create polyMesh metal for time = 0\nMesh stats\n cells: 1\nMesh OK.\n"
        self.assertFalse(mod.region_marker_evidence(raw)["matched"])

    def test_nonzero_checkmesh_exit_is_not_success(self):
        with mock.patch.object(mod.shutil, "which", return_value="/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run",
                               side_effect=lambda args, **kwargs: self.response(args, returncode=2)):
            result = mod.capture(self.case, self.out, regions=["metal"])
        self.assertEqual(result["regions"][0]["status"], "checkMesh-nonzero-exit")

    def test_source_mesh_modified_during_capture_is_detected(self):
        def mutating(args, **kwargs):
            (self.case / "constant" / "metal" / "polyMesh" / "points").write_bytes(b"modified")
            return self.response(args)
        with mock.patch.object(mod.shutil, "which", return_value="/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run", side_effect=mutating):
            result = mod.capture(self.case, self.out, regions=["metal"])
        self.assertEqual(result["regions"][0]["status"], "mesh-fingerprints-changed")
        self.assertFalse(result["regions"][0]["meshFilesUnchanged"])

    def test_generic_region_selection_and_source_privacy(self):
        self.assertEqual(mod.discover_regions(self.case, None), ["metal", "mold"])
        with self.assertRaisesRegex(mod.CaptureError, "Invalid or duplicate"):
            mod.discover_regions(self.case, ["metal", "metal"])
        with self.assertRaisesRegex(mod.CaptureError, "no corresponding"):
            mod.discover_regions(self.case, ["unknown"])
        with self.assertRaisesRegex(mod.CaptureError, "Invalid or duplicate"):
            mod.discover_regions(self.case, ["../escape"])

    def test_checkmesh_missing_does_not_create_output(self):
        with mock.patch.object(mod.shutil, "which", return_value=None):
            with self.assertRaisesRegex(mod.CaptureError, "activate OpenFOAM"):
                mod.capture(self.case, self.out)
        self.assertFalse(self.out.exists())

    def test_timeout_preserves_incomplete_evidence_and_returns_failure(self):
        with mock.patch.object(mod.shutil, "which", return_value="/bin/checkMesh"), \
             mock.patch.object(mod.subprocess, "run",
                               side_effect=subprocess.TimeoutExpired("checkMesh", 1, output=b"partial", stderr=b"error")):
            result = mod.capture(self.case, self.out, ["metal"], timeout=1)
        self.assertEqual(result["regions"][0]["status"], "timed-out")
        self.assertEqual((self.out / "checkMesh_metal.log").read_bytes(), b"partial")
        self.assertFalse(result["allSourceReportsReady"])

if __name__ == "__main__":
    main(verbosity=2)
