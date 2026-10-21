#!/usr/bin/env python3
"""Positive/negative regression for measurable original G8 compact plot footprint."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

module_path=Path(__file__).with_name("granada_g8_native_plot_visibility_gate.py")
spec=importlib.util.spec_from_file_location("native_g8_plot", module_path)
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class G8NativePlotVisibilityTests(unittest.TestCase):
    def create_image(self, directory, left, right, top=425, bottom=675):
        path=Path(directory)/"native.png"
        image=Image.new("RGB",(640,900),(10,21,36))
        ImageDraw.Draw(image).rectangle((left,top,right,bottom),fill=(255,255,255))
        image.save(path)
        return path

    def test_wide_chart_passes(self):
        with tempfile.TemporaryDirectory() as temp:
            m=gate.inspect(self.create_image(temp,21,618))
            self.assertEqual(m["result"],"PASS")
            self.assertGreater(m["peak_chart_span_px"],580)

    def test_old_cramped_chart_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            m=gate.inspect(self.create_image(temp,405,624))
            self.assertEqual(m["result"],"FAIL")
            self.assertLess(m["peak_chart_span_px"],230)

    def test_false_white_header_not_counted(self):
        with tempfile.TemporaryDirectory() as temp:
            m=gate.inspect(self.create_image(temp,5,635,top=20,bottom=90))
            self.assertEqual(m["result"],"FAIL")

    def test_short_white_flash_not_counted(self):
        with tempfile.TemporaryDirectory() as temp:
            m=gate.inspect(self.create_image(temp,10,630,top=450,bottom=465))
            self.assertEqual(m["result"],"FAIL")

    def test_viewport_identity_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"native.png"
            Image.new("RGB",(1200,900),(255,255,255)).save(path)
            with self.assertRaises(ValueError):gate.inspect(path)


if __name__=="__main__":
    unittest.main()
