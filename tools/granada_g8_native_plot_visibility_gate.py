#!/usr/bin/env python3
"""Evidence-only G8 compact chart visibility gate on real Windows screenshot PNGs.

Not OCR, not a physics calibration and not visual sign-off. Checks that the
light chart content spans a substantial portion of the real compact workspace,
so G7's squeezed 220px Time Series plot cannot be silently accepted again.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

from PIL import Image

SCHEMA = "foamlens/granada-g8-compact-canvas-geometry/1"


def longest_light_run(image: Image.Image, y: int) -> int:
    row = image.convert("RGB").crop((0, y, image.width, y + 1))
    longest = 0
    current = 0
    for red, green, blue in row.getdata():
        if red >= 228 and green >= 228 and blue >= 228:
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def inspect(path: Path) -> dict:
    with Image.open(path) as source:
        source.verify()
    with Image.open(path) as source:
        image = source.convert("RGB")
    width, height = image.size
    if width != 640 or height != 900:
        raise ValueError(f"{path}: expected actual 640x900 WebView2 compact frame; got {width}x{height}")
    # Never use the top header or footer for a passing score. At least 5 rows
    # of the actual scientific content must have a wide, continuous graph area.
    rows = list(range(415, min(height - 180, 700), 15))
    runs = [longest_light_run(image, y) for y in rows]
    qualifying = [length for length in runs if length >= 480]
    return {"file": str(path), "viewport": [width, height],
            "min_required_chart_span_px": 480, "peak_chart_span_px": max(runs, default=0),
            "qualifying_content_rows": len(qualifying), "sample_rows": len(rows),
            "result": "PASS" if len(qualifying) >= 5 else "FAIL"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    visual = args.root / "evidence" / "visual"
    images = [visual / variant / "time-series-compact.png" for variant in ("installed", "portable")]
    records = []
    try:
        for image in images:
            if not image.is_file():
                raise FileNotFoundError(f"Required native screenshot missing: {image}")
            records.append(inspect(image))
    except (ValueError, FileNotFoundError, OSError) as error:
        print(f"G8 native screenshot geometry FAIL: {error}")
        return 1
    report = {"schema": SCHEMA, "human_visual_approved": False, "records": records,
              "all_passed": all(r["result"] == "PASS" for r in records),
              "limits": "Pixel footprint only; not axis correctness, interaction, physical DPI or aesthetics."}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["all_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
