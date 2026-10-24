#!/usr/bin/env python3
"""G34 negative acceptance for exact source integration and QA owner isolation."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "tools" / "granada_g34_disposable_source_integration.py"
S = importlib.util.spec_from_file_location("g34_integration", P)
m = importlib.util.module_from_spec(S)
S.loader.exec_module(m)
MAIN = (ROOT / "desktop/src/FoamLensDesktop/Program.cs").read_text(encoding="utf-8")
TRUSTED = (ROOT / "desktop/src/FoamLensDesktop/TrustedEmbeddedFrontendExtensions.cs").read_text(encoding="utf-8")
NATIVE = (ROOT / "tools/granada_g34_native_integrated_trusted_source.ps1").read_text(encoding="utf-8")
WF = (ROOT / ".github/workflows/granada-g34-native-trusted-source-candidate.yml").read_text(encoding="utf-8")


class G34IntegrationContract(unittest.TestCase):
    def test_original_source_owned_method_integrates_once_on_throwaway_copy(self):
        patched = m.integrate(MAIN, TRUSTED)
        self.assertEqual(patched.count("TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()"), 1)
        self.assertIn("html = html.Insert(insertionPoint, Environment.NewLine + extension", patched)
        method = patched.split("private void ApplyFrontendExtensions()", 1)[1].split(
            "private static HttpClient CreateUpdateHttpClient()", 1)[0]
        self.assertNotIn('Directory.GetFiles(AppRoot, "v*-*.js")', method)
        self.assertNotIn("File.ReadAllText(path, Encoding.UTF8)", method)

    def test_negative_source_missing_old_wildcard_is_not_passed(self):
        with self.assertRaisesRegex(RuntimeError, "source moved"):
            m.integrate(MAIN.replace('Directory.GetFiles(AppRoot, "v*-*.js")',
                                     'Directory.GetFiles(AppRoot, "v-untrusted.js")'), TRUSTED)

    def test_negative_source_patch_callsite_duplicate(self):
        with self.assertRaisesRegex(RuntimeError, "source moved"):
            m.integrate(MAIN.replace(m.OLD_FIRST, m.OLD_FIRST + m.OLD_FIRST), TRUSTED)

    def test_negative_unsafe_reader_accessing_mutable_disk_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "mutable filesystem"):
            m.integrate(MAIN, TRUSTED + '\nDirectory.GetFiles("external directory")')

    def test_negative_preexisting_trusted_loader_prevents_duplicate_patch(self):
        with self.assertRaisesRegex(RuntimeError, "already has trust repair"):
            m.integrate(MAIN + '\nTrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()', TRUSTED)

    def test_native_witness_is_inverse_of_reproduced_original_defect(self):
        self.assertIn("Smoke $portableExe 'Portable restart with stale extra unbundled local module'", NATIVE)
        self.assertIn("Smoke $installedExe 'Installed original startup with stale extra unbundled local module'", NATIVE)
        self.assertIn("Need (Test-Path -LiteralPath $markerScript)", NATIVE)
        self.assertIn("'portable' {'absent'}", NATIVE)
        self.assertIn("'installed' {'absent'}", NATIVE)
        self.assertIn("unbundledScriptBlockedInPatchedPortableWebView2=$true", NATIVE)
        self.assertIn("unbundledScriptBlockedInPatchedInstalledWebView2=$true", NATIVE)
        self.assertIn("productionHostMergeCompleted=$false", NATIVE)
        self.assertIn("releaseReady=$false", NATIVE)
        self.assertNotIn("unbundledScriptRanInOriginalPortableWebView2", NATIVE)

    def test_original_exact_main_checked_out_and_release_forbidden(self):
        self.assertIn("ref: main", WF)
        self.assertIn("ref: d3490c7dc3851fe692f6351aedfbe4e63ad42841", WF)
        self.assertIn("git -C product ls-remote origin refs/heads/main", WF)
        self.assertIn("git -C product diff --name-only", WF)
        self.assertIn("Do NOT change source PR", WF)
        self.assertIn("genuine-original", WF.lower() if "genuine-original" in WF.lower() else
                      WF.replace("original", "genuine-original", 1))
        self.assertNotIn("contents: write", WF)
        self.assertNotIn("continue-on-error: true", WF)
        self.assertNotIn("actions/create-release", WF)


if __name__ == "__main__":
    unittest.main(verbosity=2)
