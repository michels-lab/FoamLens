# Native quality exporter — Foundation 13/14

Source candidate; compilation/runtime not yet verified. Uses meshCheck's faceOrthogonality, faceSkewness, faceWeights, volRatio; native faceAreas and cellVolumes. Serial, reconstructed constant mesh only. No CFD solver or mesh writes. Does not certify quality.

In a WSL shell with the selected Foundation environment loaded, build from this directory:

```bash
wmake
```

Use a newly created, empty output directory outside the research case:

```bash
out="$(mktemp -d)"
foamlensMeshQuality -case "$CASE" -region metal -output "$out"
test -f "$out/complete.txt"
```

Omit -region for the default mesh. If the utility exits nonzero, discard the entire output. Do not reuse an output directory. A completed CSV can be loaded in Mesh Studio with the exact same reconstructed constant mesh, choosing the correct cell/face association. Manual import does not prove source identity. Nonorthogonality is acos of native cosine in degrees, internal faces only; faceWeight and volumeRatio internal only; skewness and faceArea include boundary faces. No boundary placeholders for internal-only metrics. CellVolume uses native cell IDs. No aspect ratio or determinant claim.

API references:
- https://cpp.openfoam.org/v13/polyMeshCheck_8H_source.html
- https://cpp.openfoam.org/v14/polyMeshCheck_8H_source.html

Next: compile and smoke-test both versions with analytical hexahedral meshes, then integrate automatic capture into isolated desktop runner. Never replace checkMesh acceptance with this export.
