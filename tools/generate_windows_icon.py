#!/usr/bin/env python3
"""Generate the actual Windows/Store ICO directly from the arc-free canonical SVG.

Requires resvg_py==0.5.0. ICO PNG frames remain lossless; no manually cropped or
stale raster derivatives are accepted. Run --check to enforce exact source parity.
"""
from __future__ import annotations
import argparse
import hashlib
import re
import struct
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

SIZES = (16, 24, 32, 48, 64, 128, 256)
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "desktop/src/FoamLensDesktop/frontend/assets/branding/official-app-icon.svg"
DEFAULT_OUTPUT = ROOT / "desktop/src/FoamLensDesktop/Assets/FoamLens.ico"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def assert_arc_free(markup: str) -> None:
    root = ET.fromstring(markup)
    if root.tag != "{http://www.w3.org/2000/svg}svg":
        raise ValueError("Expected a standalone SVG source.")
    if root.get("viewBox") != "0 0 1024 1024":
        raise ValueError("Windows icon must preserve canonical square source geometry.")
    forbidden = ("A360", "A280", "M190 275", "M190 750", "M95 78", "M95 418")
    if any(part in markup for part in forbidden):
        raise ValueError("Owner-rejected orbit/bracket geometry is present in the source.")
    for path in root.findall(".//{http://www.w3.org/2000/svg}path"):
        if re.search(r"(^|[\s,])[Aa](?=[\d\s,.-])", path.get("d", "")):
            raise ValueError("Owner-rejected SVG elliptical arcs are present.")
    if len(root.findall(".//{http://www.w3.org/2000/svg}path")) < 4:
        raise ValueError("Layered-field mark paths are missing.")


def generate(source: Path) -> bytes:
    try:
        import resvg_py
    except ImportError as exc:
        raise SystemExit("Install SVG rasterizer: python -m pip install resvg_py==0.5.0") from exc
    markup = source.read_text(encoding="utf-8")
    assert_arc_free(markup)
    frames = []
    for size in SIZES:
        png = resvg_py.svg_to_bytes(svg_string=markup, width=size, height=size)
        if not png.startswith(PNG_SIGNATURE) or struct.unpack(">II", png[16:24]) != (size, size):
            raise ValueError(f"Invalid lossless SVG-derived {size}px PNG raster.")
        frames.append(png)
    offset = 6 + 16 * len(SIZES)
    directory = bytearray(struct.pack("<HHH", 0, 1, len(SIZES)))
    for size, png in zip(SIZES, frames):
        directory += struct.pack("<BBBBHHII", 0 if size == 256 else size,
                                 0 if size == 256 else size, 0, 0, 1, 32,
                                 len(png), offset)
        offset += len(png)
    return bytes(directory) + b"".join(frames)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="Fail if the checked-in ICO differs from its SVG source.")
    args = parser.parse_args()
    expected = generate(args.source)
    digest = hashlib.sha256(expected).hexdigest()
    if args.check:
        if not args.output.is_file() or args.output.read_bytes() != expected:
            print("ERROR: Windows ICO differs from owner-approved arc-free SVG source. Regenerate it.", file=sys.stderr)
            return 1
        print(f"Windows ICO matches canonical SVG at all {len(SIZES)} sizes: SHA256 {digest}")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not args.output.exists() or args.output.read_bytes() != expected:
        args.output.write_bytes(expected)
    print(f"Generated lossless SVG-derived FoamLens.ico ({len(expected)} bytes, {len(SIZES)} resolutions), SHA256 {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
