// SPDX-License-Identifier: GPL-3.0-or-later
// FoamLens native quality exporter for OpenFOAM Foundation 13/14.
// Read-only mesh access; CSV files go to an explicit output directory.
#include "argList.H"
#include "Time.H"
#include "polyMesh.H"
#include "polyMeshCheck.H"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <locale>
#include <string>

using namespace Foam;

template<class Getter>
static bool writeMetric(const std::string& path, label count, Getter value)
{
    std::ofstream out(path);
    out.imbue(std::locale::classic());
    out << "id,value\n" << std::setprecision(17);
    for (label i=0; i<count; ++i)
    {
        const double v=value(i);
        if (!std::isfinite(v)) return false;
        out << i << ',' << v << '\n';
    }
    out.flush();
    return out.good();
}

int main(int argc, char* argv[])
{
    argList::noParallel();
    argList::addOption("region","name","Read a named region");
    argList::addOption("output","directory","Existing absolute output directory");
    #include "setRootCase.H"
    #include "createTime.H"

    word region(polyMesh::defaultRegion);
    args.optionReadIfPresent("region",region);
    fileName output;
    if (!args.optionReadIfPresent("output",output) || output.empty() || output[0]!='/')
    {
        Info << "Supply an existing absolute -output directory" << endl;
        return 2;
    }

    const polyMesh mesh(IOobject(region,runTime.constant(),runTime,IOobject::MUST_READ));
    const vectorField& a=mesh.faceAreas();
    const vectorField& f=mesh.faceCentres();
    const vectorField& c=mesh.cellCentres();
    const scalarField& v=mesh.cellVolumes();
    const tmp<scalarField> orth=meshCheck::faceOrthogonality(mesh,a,c);
    const tmp<scalarField> skew=meshCheck::faceSkewness(mesh,mesh.points(),f,a,c);
    const tmp<scalarField> weights=meshCheck::faceWeights(mesh,f,a,c);
    const tmp<scalarField> ratios=meshCheck::volRatio(mesh,v);

    const label n=mesh.nInternalFaces();
    if (orth().size()<n || skew().size()<mesh.nFaces() ||
        weights().size()<n || ratios().size()<n) return 3;
    const std::string dir(output.c_str());
    // Non-coupled boundary orthogonality/weights/ratios are not reported as measurements.
    const double degrees=180.0/std::acos(-1.0);
    const bool ok=
        writeMetric(dir+"/nonOrthogonality.csv",n,[&](label i){
            const double x=orth()[i];
            return std::isfinite(x)?std::acos(std::max(-1.0,std::min(1.0,x)))*degrees:x;
        }) &&
        writeMetric(dir+"/skewness.csv",mesh.nFaces(),[&](label i){return skew()[i];}) &&
        writeMetric(dir+"/faceWeight.csv",n,[&](label i){return weights()[i];}) &&
        writeMetric(dir+"/volumeRatio.csv",n,[&](label i){return ratios()[i];}) &&
        writeMetric(dir+"/faceArea.csv",mesh.nFaces(),[&](label i){return mag(a[i]);}) &&
        writeMetric(dir+"/cellVolume.csv",mesh.nCells(),[&](label i){return v[i];});
    if (!ok) return 4;
    std::ofstream manifest(dir+"/complete.txt");
    manifest << "foamlens/native-quality/1\n"
             << "region=" << region.c_str() << "\n"
             << "instance=constant\n"
             << "cells=" << mesh.nCells() << "\n"
             << "faces=" << mesh.nFaces() << "\n"
             << "internalFaces=" << n << "\n";
    manifest.flush();
    return manifest.good()?0:5;
}
