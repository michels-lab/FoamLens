#!/usr/bin/env python3
"""Executed negative regression for FoamLens portable+installed visual provenance.

Uses generated test PNGs (never passed off as real application evidence).
The production release gate still validates actual packaged WebView2 captures.
"""
from __future__ import annotations

import copy
import hashlib
import json
import random
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from visual_release_gate import check_evidence

SOURCE_SHA = "1234567890abcdef1234567890abcdef12345678"
SURFACES = ("home", "about", "data", "field")
SCRIPT = Path(__file__).with_name("make_visual_evidence.py")


def render_fixture(path: Path, dimensions: tuple[int, int], seed: int) -> None:
    rng = random.Random(seed)
    image = Image.new("RGB", dimensions, (38, 51, 69))
    painter = ImageDraw.Draw(image)
    width, height = dimensions
    for _ in range(350):
        x = rng.randrange(width)
        y = rng.randrange(height)
        painter.rectangle(
            (x, y, min(width - 1, x + rng.randrange(4, 44)),
             min(height - 1, y + rng.randrange(4, 44))),
            fill=(rng.randrange(40, 240), rng.randrange(40, 240), rng.randrange(40, 240)),
        )
    image.save(path, format="PNG")


def assert_rejected(doc: dict, manifest: Path, needle: str) -> None:
    manifest.write_text(json.dumps(doc), encoding="utf-8")
    errors = check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                            require_review=False, require_portable=True)
    assert any(needle in message for message in errors), (needle, errors)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="foamlens-ui-provenance-") as temp:
        root = Path(temp)
        evidence = root / "visual"
        setup = root / "FoamLens-Setup-vtest.exe"
        portable = root / "FoamLens-Portable-vtest.exe"
        setup.write_bytes(b"test-only packaged installer")
        portable.write_bytes(b"test-only packaged portable app")
        for variant_index, variant in enumerate(("installed", "portable")):
            directory = evidence / variant
            directory.mkdir(parents=True)
            for viewport_index, (viewport, dimensions) in enumerate(
                (("wide", (920, 540)), ("compact", (460, 400)))
            ):
                for surface_index, surface in enumerate(SURFACES):
                    path = directory / f"{surface}-{viewport}.png"
                    render_fixture(path, dimensions,
                                   1000 * variant_index + 100 * viewport_index + surface_index)
                shutil.copyfile(
                    directory / f"about-{viewport}.png",
                    directory / f"about-{viewport}-bottom.png",
                )

        manifest = evidence / "manifest.json"
        subprocess.run(
            [sys.executable, str(SCRIPT),
             "--evidence-dir", str(evidence / "installed"),
             "--portable-evidence-dir", str(evidence / "portable"),
             "--artifact", str(setup),
             "--portable-artifact", str(portable),
             "--source-sha", SOURCE_SHA, "--platform", "windows",
             "--output", str(manifest)],
            check=True, capture_output=True, text=True,
        )
        original = json.loads(manifest.read_text(encoding="utf-8"))
        records = original["screenshots"]
        assert len(records) == 16, f"Expected 16 separate real-run analog captures, got {len(records)}"
        assert {shot["runtime_variant"] for shot in records} == {"installed", "portable"}
        assert all(shot["path"].startswith(shot["runtime_variant"] + "/") for shot in records)
        assert original["artifact_sha256"]["windows"] == hashlib.sha256(setup.read_bytes()).hexdigest()
        assert original["portable_artifact_sha256"]["windows"] == hashlib.sha256(portable.read_bytes()).hexdigest()
        assert check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                              require_review=False, require_portable=True,
                              artifact_paths={"windows": setup},
                              portable_artifact_paths={"windows": portable}) == []
        # A supplemental screenshot must not mask Home's failure to render
        # at genuinely distinct wide and compact native window sizes.
        compact_home = evidence / "installed" / "home-compact.png"
        previous_png = compact_home.read_bytes()
        try:
            render_fixture(compact_home, (920, 540), 424242)
            same_size = copy.deepcopy(original)
            record = next(shot for shot in same_size["screenshots"]
                          if shot["runtime_variant"] == "installed"
                          and shot["surface"] == "home" and shot["viewport"] == "compact")
            record["width"], record["height"] = 920, 540
            record["sha256"] = hashlib.sha256(compact_home.read_bytes()).hexdigest()
            assert_rejected(same_size, manifest,
                            "windows/installed/home: wide screenshot width must exceed compact screenshot width")
        finally:
            compact_home.write_bytes(previous_png)

        swapped_viewports = copy.deepcopy(original)
        for shot in swapped_viewports["screenshots"]:
            if shot["runtime_variant"] == "portable" and shot["surface"] == "data":
                shot["viewport"] = "wide" if shot["viewport"] == "compact" else "compact"
        assert_rejected(swapped_viewports, manifest,
                        "windows/portable/data: wide screenshot width must exceed compact screenshot width")
        manifest.write_text(json.dumps(original), encoding="utf-8")
        assert check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                              require_review=False, require_portable=True,
                              artifact_paths={"windows": setup},
                              portable_artifact_paths={"windows": portable}) == []

        # The screenshot hashes can all be valid while a Setup or portable EXE
        # is replaced after capture; the gate must reject the changed binary.
        setup.write_bytes(setup.read_bytes() + b"\npost-capture tamper")
        errors = check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                                require_review=False, require_portable=True,
                                artifact_paths={"windows": setup},
                                portable_artifact_paths={"windows": portable})
        assert any("installed: candidate binary SHA-256 differs" in problem for problem in errors), errors
        setup.write_bytes(setup.read_bytes()[:-len(b"\npost-capture tamper")])
        portable.write_bytes(portable.read_bytes() + b"\npost-capture tamper")
        errors = check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                                require_review=False, require_portable=True,
                                artifact_paths={"windows": setup},
                                portable_artifact_paths={"windows": portable})
        assert any("portable: candidate binary SHA-256 differs" in problem for problem in errors), errors
        portable.write_bytes(portable.read_bytes()[:-len(b"\npost-capture tamper")])

        # Existing Microsoft Store MSIX automation intentionally has no portable EXE.
        store_manifest = evidence / "store-manifest.json"
        subprocess.run(
            [sys.executable, str(SCRIPT), "--evidence-dir", str(evidence / "installed"),
             "--artifact", str(setup), "--source-sha", SOURCE_SHA,
             "--platform", "windows-store", "--capture-method", "running-desktop-app",
             "--output", str(store_manifest)],
            check=True, capture_output=True, text=True,
        )
        store_doc = json.loads(store_manifest.read_text(encoding="utf-8"))
        assert "portable_artifact_sha256" not in store_doc
        assert check_evidence(store_manifest, SOURCE_SHA, ["windows-store"], list(SURFACES),
                              require_review=False) == []

        # Optional Real OpenFOAM scene contract is mandatory on Windows CI when
        # QuickCup is available; test screenshots here are deliberately synthetic
        # fixtures and are NEVER uploaded as real runtime evidence.
        for variant_index, variant in enumerate(("installed", "portable")):
            render_fixture(evidence / variant / "field-real-multiregion.png",
                           (920, 540), 9898 + variant_index)
        subprocess.run(
            [sys.executable, str(SCRIPT),
             "--evidence-dir", str(evidence / "installed"),
             "--portable-evidence-dir", str(evidence / "portable"),
             "--artifact", str(setup), "--portable-artifact", str(portable),
             "--source-sha", SOURCE_SHA, "--platform", "windows",
             "--require-multiregion", "--output", str(manifest)],
            check=True, capture_output=True, text=True,
        )
        multiregion_doc = json.loads(manifest.read_text(encoding="utf-8"))
        actual = [s for s in multiregion_doc["screenshots"] if s["surface"] == "field-multiregion"]
        assert len(actual) == 2
        assert {s["runtime_variant"] for s in actual} == {"installed", "portable"}
        assert all(s["viewport"] == "real-metal-mold" for s in actual)
        assert check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                              require_review=False, require_portable=True,
                              require_multiregion=True,
                              artifact_paths={"windows": setup},
                              portable_artifact_paths={"windows": portable}) == []
        no_real = copy.deepcopy(multiregion_doc)
        no_real["screenshots"] = [s for s in no_real["screenshots"]
                                  if not (s["runtime_variant"] == "portable"
                                          and s["surface"] == "field-multiregion")]
        manifest.write_text(json.dumps(no_real), encoding="utf-8")
        errors = check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                                require_review=False, require_portable=True,
                                require_multiregion=True)
        assert any("portable: missing real metal/mold" in e for e in errors), errors
        corrupted = copy.deepcopy(multiregion_doc)
        shot = next(s for s in corrupted["screenshots"] if s["surface"] == "field-multiregion")
        shot["sha256"] = "0" * 64
        manifest.write_text(json.dumps(corrupted), encoding="utf-8")
        errors = check_evidence(manifest, SOURCE_SHA, ["windows"], list(SURFACES),
                                require_review=False, require_portable=True,
                                require_multiregion=True)
        assert any("screenshot checksum mismatch" in e for e in errors), errors
        manifest.write_text(json.dumps(original), encoding="utf-8")

        # Conversely, direct Windows must never silently downgrade to Store-style coverage.
        no_portable = subprocess.run(
            [sys.executable, str(SCRIPT), "--evidence-dir", str(evidence / "installed"),
             "--artifact", str(setup), "--source-sha", SOURCE_SHA,
             "--platform", "windows", "--output", str(evidence / "invalid.json")],
            capture_output=True, text=True,
        )
        assert no_portable.returncode != 0 and "requires both portable" in no_portable.stderr

        absent = copy.deepcopy(original)
        absent["screenshots"] = [
            shot for shot in absent["screenshots"]
            if not (shot["runtime_variant"] == "portable"
                    and shot["surface"] == "field" and shot["viewport"] == "compact")
        ]
        assert_rejected(absent, manifest, "windows/portable: missing wide/compact rendered field")

        wrong_digest = copy.deepcopy(original)
        wrong_digest["screenshots"][0]["candidate_artifact_sha256"] = "0" * 64
        assert_rejected(wrong_digest, manifest, "own candidate artifact digest")

        missing_portable_hash = copy.deepcopy(original)
        missing_portable_hash.pop("portable_artifact_sha256")
        assert_rejected(missing_portable_hash, manifest, "Missing real portable candidate SHA-256")

        mislabeled = copy.deepcopy(original)
        mislabeled["screenshots"][0]["runtime_variant"] = "remote"
        assert_rejected(mislabeled, manifest, "invalid Windows runtime variant")

        reused_file = copy.deepcopy(original)
        reused_file["screenshots"][0]["path"] = reused_file["screenshots"][8]["path"]
        assert_rejected(reused_file, manifest, "screenshot checksum mismatch")

        cross_runtime = copy.deepcopy(original)
        cross_runtime["screenshots"][8]["path"] = original["screenshots"][0]["path"]
        cross_runtime["screenshots"][8]["sha256"] = original["screenshots"][0]["sha256"]
        assert_rejected(cross_runtime, manifest, "portable screenshot path outside its runtime directory")

        manifest.write_text(json.dumps(original), encoding="utf-8")
        shot = evidence / records[0]["path"]
        shot.write_bytes(shot.read_bytes() + b"\nmodified after capture")
        assert_rejected(original, manifest, "screenshot checksum mismatch")

    print("PASS: separate Windows runtime captures and negative provenance regressions")


if __name__ == "__main__":
    main()
