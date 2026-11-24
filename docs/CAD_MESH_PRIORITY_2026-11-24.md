# CAD and mesh — priority block 3 (2026-11-24)

Owner prioritizes CAD/meshing over Data/Analysis. Keep v1.8.23 Field baseline. PR #380 deferred, do not merge over CAD work.

## Research-driven sequence
- C3D04 A: rounded multi-block, grading, transition/basal non-orthogonality; native face IDs/centroids, region interfaces, block/patch lineage. Current Cartesian designer is a first subset only; import/review original arbitrary blockMeshDict including arcs/projected edges, multi-grading, actual native checkMesh face/cell sets, local quality overlays next.
- C3D05 B: STEP/Gmsh conformal HEX8, 92,200 metal and 178,588 mold cells; preserve original region IDs, physical surface groups, Gmsh import/convert, interface matching and volume/area. Do not rerun completed CFD or overwrite research case.
- CAD measurements/selection, orthogonal cuts, feature edges, connectivity, extract block, threshold, mesh quality/histogram, cell centers and IDs, integrate variables with physical weighting, resample/probe location and temporal statistics are prioritized ParaView-inspired gaps. Existing Field slices, contours, streamlines and line profiles must be reused rather than duplicated. Distinguish point/cell/face associations.
- Later explicit OpenFOAM version detection, isolated WSL staging, actual blockMesh/checkMesh, snappyHexMesh and splitMeshRegions; native results and case export. No automatic physics or interface certification.

## First implementation
CAD-only Cartesian multi-block plan with SI axes, subdivisions and expansion ratios, shared vertices, explicitly painted cellZones, exterior generic patch names, physical slice preview, planned interface face counts and ZIP dictionary+manifest. The preview is a plan, not a volume mesh, CAD fit, or solver result. Exact runtime and OpenFOAM dictionary execution pending.

References: https://github.com/michels-lab/MasterProject/tree/main/cases_3d/C3D_04_rounded_multiblock_pilot ; https://github.com/michels-lab/MasterProject/tree/main/cases_3d/C3D_05_step_gmsh_conformal ; https://doc.cfd.direct/openfoam/user-guide-v13/blockmesh ; https://doc.openfoam.com/2606/tools/pre-processing/mesh/generation/blockMesh/ ; https://docs.paraview.org/en/latest/UsersGuide/filteringData.html
