#!/usr/bin/env python3
"""G31 adversarial regressions: these source-fidelity checks are NOT native acceptance."""
import base64
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

MODULE = Path(__file__).with_name("granada_g31_original_package_bom.py")
spec = importlib.util.spec_from_file_location("granada_g31", MODULE)
g31 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g31)


class ActualPackageSafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.frontend = self.root / "frontend"
        self.frontend.mkdir()
        self.license = self.root / "LICENSE.txt"
        self.license.write_text("FoamLens test-only license", encoding="utf-8")
        (self.frontend / "index.html").write_text("<!doctype html><title>fixture</title>", encoding="utf-8")
        for i in range(21):
            (self.frontend / ("v%d-safety.js" % i)).write_text("void %d;\n" % i, encoding="utf-8")
        (self.frontend / "assets" / "branding").mkdir(parents=True)
        for i in range(9):
            (self.frontend / "assets" / "branding" / ("asset%d.svg" % i)).write_text(
                "<svg>fixture%d</svg>" % i, encoding="utf-8")
        self.archive = self.root / "AppBundle.zip"
        self.original = g31.expected_frontend(self.frontend, self.license)
        self.write_archive()

    def write_archive(self, extra=(), replace=None):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for path, source in self.original.items():
                z.writestr(path, "wrong-file!" if path == replace else source.read_bytes())
            for entry in extra:
                z.writestr(*entry)

    def test_exact_source_bundle_passes_and_counts_files(self):
        evidence = g31.audit_bundle(self.archive, self.frontend, self.license)
        self.assertEqual(evidence["assetFileCount"], len(self.original))
        self.assertTrue(evidence["exactOriginalFrontendAssetParity"])

    def test_mutated_real_source_replacement_blocked(self):
        self.write_archive(replace="index.html")
        with self.assertRaisesRegex(g31.EvidenceError, "bytes differ"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_unpacked_leftover_v_extension_blocked_before_distribution(self):
        self.write_archive(extra=[("v99-unreviewed-script.js", "alert(1)")])
        with self.assertRaisesRegex(g31.EvidenceError, "allowlist"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_missing_real_source_module_blocked(self):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for name, source in self.original.items():
                if not name.startswith("v1-"):
                    z.writestr(name, source.read_bytes())
        with self.assertRaisesRegex(g31.EvidenceError, "allowlist"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_zip_slip_entry_cannot_escape_source_root(self):
        self.write_archive(extra=[("../escape.js", "outside")])
        with self.assertRaisesRegex(g31.EvidenceError, "traversal"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_windows_drive_prefix_is_rejected(self):
        self.write_archive(extra=[("C:/poison.js", "outside")])
        with self.assertRaisesRegex(g31.EvidenceError, "drive-prefixed"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_windows_reserved_path_rejected(self):
        self.write_archive(extra=[("AUX.js", "outside")])
        with self.assertRaisesRegex(g31.EvidenceError, "reserved Windows"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_windows_separator_ambiguity_is_rejected(self):
        self.write_archive(extra=[(r"assets\branding\shadow.js", "outside")])
        with self.assertRaisesRegex(g31.EvidenceError, "separator"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_archive_case_collision_blocked(self):
        self.write_archive(extra=[("INDEX.html", "outside")])
        with self.assertRaisesRegex(g31.EvidenceError, "case-colliding"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_duplicate_same_path_cannot_shadow_provenance(self):
        self.write_archive(extra=[("index.html", "new overwritten asset")])
        with self.assertRaisesRegex(g31.EvidenceError, "duplicate"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_archive_symlink_blocked(self):
        malicious = zipfile.ZipInfo("untrusted-link.js")
        malicious.create_system = 3
        malicious.external_attr = (0o120777 << 16)
        self.write_archive(extra=[(malicious, "link-target")])
        with self.assertRaisesRegex(g31.EvidenceError, "symlink"):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def test_corrupt_zip_rejected(self):
        self.archive.write_bytes(b"not a real source package")
        with self.assertRaises(zipfile.BadZipFile):
            g31.audit_bundle(self.archive, self.frontend, self.license)

    def write_nuget(self, library=None, version="1.0.4191.47"):
        proj = self.root / "FoamLensDesktop.csproj"
        proj.write_text('<Project><ItemGroup><PackageReference Include="Microsoft.Web.WebView2" Version="' +
                        version + '" /></ItemGroup></Project>', encoding="utf-8")
        assets = self.root / "project.assets.json"
        lib = library or {"type": "package", "sha512": base64.b64encode(b"a" * 64).decode("ascii")}
        assets.write_text(json.dumps({"libraries": {"Microsoft.Web.WebView2/1.0.4191.47": lib},
                                      "targets": {"net8.0-windows": {
                                          "Microsoft.Web.WebView2/1.0.4191.47": {"type": "package"}
                                      }}}), encoding="utf-8")
        return proj, assets

    def test_actual_nuget_sha512_graph_and_pinned_versions(self):
        proj, assets = self.write_nuget()
        data = g31.audit_nuget(proj, assets)
        self.assertEqual(data["resolved"][0]["sha512Hex"], "61" * 64)
        self.assertEqual(data["direct"][0]["version"], "1.0.4191.47")

    def test_drifting_restored_nuget_direct_version_rejected(self):
        proj, assets = self.write_nuget(version="1.0.1000.0")
        with self.assertRaisesRegex(g31.EvidenceError, "differs from actual restored"):
            g31.audit_nuget(proj, assets)

    def test_unpinned_nuget_wildcard_rejected(self):
        proj, assets = self.write_nuget(version="1.0.*")
        with self.assertRaisesRegex(g31.EvidenceError, "unpinned"):
            g31.audit_nuget(proj, assets)

    def test_nuget_no_verified_sha512_rejected(self):
        proj, assets = self.write_nuget(library={"type": "package"})
        with self.assertRaisesRegex(g31.EvidenceError, "SHA-512 missing"):
            g31.audit_nuget(proj, assets)

    def test_invalid_fake_sha512_rejected(self):
        proj, assets = self.write_nuget(library={"type": "package", "sha512": "bad!"})
        with self.assertRaisesRegex(g31.EvidenceError, "malformed"):
            g31.audit_nuget(proj, assets)

    def test_source_script_never_claims_release_or_offline_science(self):
        src = MODULE.read_text("utf-8")
        self.assertIn('"releaseReady": False', src)
        self.assertIn('"actualPublisherAuthenticodeVerified": False', src)
        self.assertIn('"securityAdvisoryDatabaseChecked": False', src)
        self.assertNotIn("QUICKCUP_FIXTURE_TOKEN", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
