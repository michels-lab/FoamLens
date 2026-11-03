#!/usr/bin/env python3
"""Strict source-neutral PNG evidence contract for real native Field F1 screenshots.

Validates the existence and integrity of the genuine WebView2 PNG emitted by
FoamLens per installed/portable B13 run; cannot certify scientific accuracy.
"""
import argparse
import hashlib
import json
import struct
import zlib
from pathlib import Path

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

def inspect_png(image: Path) -> dict:
    raw = Path(image).read_bytes()
    if len(raw) < 4096 or not raw.startswith(PNG_MAGIC):
        raise ValueError("Missing complete native Field PNG")
    offset = 8
    saw_ihdr = False
    saw_idat = False
    saw_iend = False
    width = height = 0
    while offset < len(raw):
        if offset + 12 > len(raw):
            raise ValueError("Truncated Field PNG chunk")
        length = struct.unpack(">I", raw[offset:offset + 4])[0]
        label = raw[offset + 4:offset + 8]
        end = offset + 12 + length
        if length > 24 * 1024 * 1024 or end > len(raw):
            raise ValueError("Invalid Field PNG chunk length")
        data = raw[offset + 8:offset + 8 + length]
        expected = struct.unpack(">I", raw[offset + 8 + length:end])[0]
        if (zlib.crc32(label + data) & 0xffffffff) != expected:
            raise ValueError("Field PNG chunk CRC mismatch")
        if not saw_ihdr:
            if label != b"IHDR" or length != 13:
                raise ValueError("Field PNG lacks valid IHDR")
            width, height = struct.unpack(">II", data[:8])
            if not 200 <= width <= 10000 or not 150 <= height <= 10000:
                raise ValueError("Field PNG dimensions implausible")
            saw_ihdr = True
        elif label == b"IHDR":
            raise ValueError("Duplicate Field PNG IHDR")
        if label == b"IDAT" and length:
            saw_idat = True
        if label == b"IEND":
            if length or not saw_idat or end != len(raw):
                raise ValueError("Field PNG incomplete or trailing data")
            saw_iend = True
        offset = end
        if saw_iend:
            break
    if not saw_ihdr or not saw_idat or not saw_iend:
        raise ValueError("Incomplete native Field screenshot")
    return {"schema": "foamlens/granada-g20-field-f1-image/1",
            "sha256": hashlib.sha256(raw).hexdigest(),
            "width": width, "height": height, "bytes": len(raw),
            "physical_accuracy_certified": False,
            "owner_dpi_signoff": False}

if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--png", required=True)
    args = a.parse_args()
    print(json.dumps(inspect_png(Path(args.png)), sort_keys=True))
