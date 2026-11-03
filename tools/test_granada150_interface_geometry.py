"""Negative original polyMesh interface-coordinate regression tests; no CFD or checkMesh."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase, main
import json

path=Path(__file__).with_name("granada150_interface_geometry.py")
spec=importlib.util.spec_from_file_location("original_geometry",path)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def mesh(case,region,vertices,face,patch,to_region,to_patch):
    d=case/"constant"/region/"polyMesh"
    d.mkdir(parents=True)
    header="FoamFile\n{\n format ascii;\n class polyMesh;\n}\n"
    (d/"points").write_text(header+"4\n(\n"+"\n".join("("+" ".join(map(str,p))+")" for p in vertices)+"\n)\n")
    (d/"faces").write_text(header+"1\n(\n4("+" ".join(map(str,face))+")\n)\n")
    (d/"boundary").write_text(header+"1\n(\n"+patch+"\n{\n type mappedWall;\n nFaces 1;\n startFace 0;\n neighbourRegion "+to_region+";\n neighbourPatch "+to_patch+";\n}\n)\n")


class InterfaceTests(TestCase):
    def setUp(self):
        tmp=TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root=Path(tmp.name)/"case"
        verts=[(0,0,0),(1,0,0),(1,1,0),(0,1,0)]
        mesh(self.root,"alpha",verts,(0,1,2,3),"a_to_b","beta","b_to_a")
        mesh(self.root,"beta",verts,(3,2,1,0),"b_to_a","alpha","a_to_b")

    def change(self,region,file,old,new):
        f=self.root/"constant"/region/"polyMesh"/file
        f.write_text(f.read_text().replace(old,new))

    def test_one_face_matches_geometrically_with_opposite_normals(self):
        result=m.audit(self.root)
        self.assertEqual(result["status"],"geometric-source-interfaces-matched")
        self.assertEqual(result["matchingPairs"],1)
        self.assertEqual(result["matchingFaces"],1)
        self.assertEqual(result["pairs"][0]["nonOpposedFaces"],0)
        self.assertEqual(result["scientificValidity"],"not-certified")
        self.assertFalse(result["checkMeshExecuted"])
        self.assertNotIn(str(self.root.resolve()),json.dumps(result))

    def test_same_orientation_does_not_pass(self):
        self.change("beta","faces","4(3 2 1 0)","4(0 1 2 3)")
        result=m.audit(self.root)
        self.assertEqual(result["pairs"][0]["nonOpposedFaces"],1)
        self.assertEqual(result["matchingPairs"],0)

    def test_moved_vertex_is_not_mispaired(self):
        self.change("beta","points","(1 1 0)","(1 1 0.01)")
        self.assertEqual(m.audit(self.root)["pairs"][0]["matchedFaces"],0)

    def test_wrong_reverse_patch_rejected(self):
        self.change("beta","boundary","neighbourPatch a_to_b;",
                    "neighbourPatch another;")
        self.assertEqual(m.audit(self.root)["pairs"][0]["status"],
                         "nonreciprocal-original-interface")

    def test_missing_region_rejected(self):
        self.change("alpha","boundary","neighbourRegion beta;",
                    "neighbourRegion missing;")
        self.assertEqual(m.audit(self.root)["pairs"][0]["status"],
                         "missing-reciprocal-original-patch")

    def test_invalid_face_id_fail_closed(self):
        self.change("beta","faces","4(3 2 1 0)","4(3 2 1 90)")
        with self.assertRaisesRegex(m.EvidenceError,"nonexistent"):
            m.audit(self.root)

    def test_nonfinite_coordinate_fail_closed(self):
        self.change("alpha","points","(1 1 0)","(NaN 1 0)")
        with self.assertRaisesRegex(m.EvidenceError,"Nonfinite"):
            m.audit(self.root)

    def test_binary_flag_fail_closed(self):
        self.change("alpha","points","format ascii","format binary")
        with self.assertRaisesRegex(m.EvidenceError,"ASCII"):
            m.audit(self.root)

    def test_overlapping_patch_ranges_rejected(self):
        self.change("alpha","boundary","1\n(\na_to_b","2\n(\na_to_b")
        self.change("alpha","boundary","}\n)\n","}\nextra\n{\n nFaces 1;\n startFace 0;\n}\n)\n")
        with self.assertRaisesRegex(m.EvidenceError,"overlap"):
            m.audit(self.root)

    def test_repeated_points_in_face_fail_closed(self):
        self.change("alpha","faces","4(0 1 2 3)","4(0 1 2 2)")
        with self.assertRaisesRegex(m.EvidenceError,"duplicate point"):
            m.audit(self.root)

    def test_tolerance_has_scientifically_bounded_range(self):
        for tol in (-1,0,1e-15,.01,float("nan")):
            with self.assertRaisesRegex(m.EvidenceError,"Tolerance"):
                m.audit(self.root,tol)


if __name__=="__main__":
    main(verbosity=2)
