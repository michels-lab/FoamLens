#!/usr/bin/env python3
"""Negative and positive regression tests for published-release integrity gate."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_published_release import verify_release


class ReleaseIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)
        self.version = "1.8.1"
        self.metadata = {
            "tagName": "v1.8.1",
            "isDraft": False,
            "isPrerelease": False,
            "publishedAt": "2026-10-12T20:00:00Z",
            "url": "https://github.com/michels-lab/FoamLens/releases/tag/v1.8.1",
            "assets": [],
        }
        self.build = {}
        for kind in ("Setup", "Portable"):
            name = f"FoamLens-{kind}-v1.8.1.exe"
            data = bytearray(1_001_000)
            data[:2] = b"MZ"
            data[0x3C:0x40] = (128).to_bytes(4, "little")
            data[128:132] = b"PE\x00\x00"
            path = self.dir / name
            path.write_bytes(data)
            expected = hashlib.sha256(data).hexdigest()
            (self.dir / (name + ".sha256")).write_text(f"{expected}  {name}\n", encoding="ascii")
            self.build[name] = path
            for n in (name, name + ".sha256"):
                self.metadata["assets"].append({"name": n, "size": (self.dir / n).stat().st_size})

    def test_verifies_both_published_executables(self):
        result = verify_release(self.metadata, self.dir, self.version)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(len(result["binaries"]), 2)

    def test_rejects_changed_public_binary(self):
        path = self.build["FoamLens-Setup-v1.8.1.exe"]
        with path.open("r+b") as f:
            f.seek(300)
            f.write(b"modified")
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_asset_missing(self):
        self.metadata["assets"].pop()
        with self.assertRaisesRegex(ValueError, "Required published"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_wrong_checksum_filename(self):
        p = self.dir / "FoamLens-Portable-v1.8.1.exe.sha256"
        p.write_text(p.read_text("ascii").replace("Portable", "Setup"), encoding="ascii")
        with self.assertRaisesRegex(ValueError, "malformed checksum"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_draft_and_prerelease(self):
        for field in ("isDraft", "isPrerelease"):
            self.metadata[field] = True
            with self.assertRaisesRegex(ValueError, "draft/prerelease"):
                verify_release(self.metadata, self.dir, self.version)
            self.metadata[field] = False

    def test_rejects_mismatched_tag(self):
        self.metadata["tagName"] = "v1.8.0"
        with self.assertRaisesRegex(ValueError, "Published tag"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_truncated_executable(self):
        p = self.build["FoamLens-Setup-v1.8.1.exe"]
        p.write_bytes(p.read_bytes()[:4096])
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_wrong_PE_signature_with_valid_hash(self):
        p = self.build["FoamLens-Setup-v1.8.1.exe"]
        d = bytearray(p.read_bytes())
        d[128:132] = b"FAKE"
        p.write_bytes(d)
        ck = self.dir / (p.name + ".sha256")
        ck.write_text(f"{hashlib.sha256(d).hexdigest()}  {p.name}\n", "ascii")
        with self.assertRaisesRegex(ValueError, "Invalid Windows PE signature"):
            verify_release(self.metadata, self.dir, self.version)

    def test_rejects_forged_release_metadata_size(self):
        self.metadata["assets"][0]["size"] += 1
        with self.assertRaisesRegex(ValueError, "size/provenance mismatch"):
            verify_release(self.metadata, self.dir, self.version)


if __name__ == "__main__":
    unittest.main()
