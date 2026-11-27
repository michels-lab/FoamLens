using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace FoamLensDesktop;

// Only structured Cartesian plans are accepted. No uploaded dictionaries,
// executable paths, case paths, includes, directives or arbitrary shell code.
internal static class NativeCartesianMesh
{
    private const long MaxCells = 200000;
    private const long MaxOutput = 24 * 1024 * 1024;
    private static readonly string[] MeshNames = { "points", "faces", "owner", "neighbour", "boundary", "cellZones", "faceZones", "pointZones" };
    private static string Num(double x) => x.ToString("G17", CultureInfo.InvariantCulture);
    private static string FoamList<T>(IEnumerable<T> v) => "(" + string.Join(" ", v) + ")";
    private static string Name(JsonElement e)
    {
        var s = e.GetString() ?? "";
        if (s.Length is < 1 or > 64 || !System.Text.RegularExpressions.Regex.IsMatch(s, @"\A[A-Za-z][A-Za-z0-9_]*\z") || s is "none" or "defaultFaces")
            throw new ArgumentException("Invalid patch or zone name.");
        return s;
    }
    private sealed record Axis(double[] Points, int[] Counts, double[] Grading);
    internal static (string Dictionary, long Cells) Build(JsonElement root)
    {
        var axes = root.GetProperty("axes").EnumerateArray().Select(a =>
        {
            var p = a.GetProperty("points").EnumerateArray().Select(x => x.GetDouble()).ToArray();
            var n = a.GetProperty("counts").EnumerateArray().Select(x => x.GetInt32()).ToArray();
            var g = a.GetProperty("grading").EnumerateArray().Select(x => x.GetDouble()).ToArray();
            if (n.Length is < 1 or > 16 || p.Length != n.Length + 1 || g.Length != n.Length ||
                p.Any(x => !double.IsFinite(x)) ||
                n.Where((x,i) => x < 1 || x > 10000 || !double.IsFinite(g[i]) || g[i] < 0.0001 || g[i] > 10000 || (x == 1 && g[i] != 1) || !(p[i+1] > p[i]) || !double.IsFinite(p[i+1]-p[i])).Any())
                throw new ArgumentException("Invalid Cartesian axis.");
            return new Axis(p,n,g);
        }).ToArray();
        if (axes.Length != 3) throw new ArgumentException("Three axes required.");
        int nx=axes[0].Counts.Length, ny=axes[1].Counts.Length, nz=axes[2].Counts.Length;
        if (nx*ny*nz > 512) throw new ArgumentException("Too many blocks.");
        long cells=axes.Aggregate(1L,(v,a)=>checked(v*a.Counts.Sum()));
        if (cells > MaxCells) throw new ArgumentException("Native run limited to 200,000 planned cells.");
        var patches=root.GetProperty("patches").EnumerateArray().Select(Name).ToArray();
        if (patches.Length!=6 || patches.Distinct(StringComparer.Ordinal).Count()!=6) throw new ArgumentException("Six distinct exterior patches required.");
        var zones=new Dictionary<(int,int,int),string>();
        foreach (var z in root.GetProperty("zones").EnumerateArray())
        {
            var ijk=z.GetProperty("ijk").EnumerateArray().Select(x=>x.GetInt32()).ToArray();
            if (ijk.Length!=3 || ijk[0]<0 || ijk[0]>=nx || ijk[1]<0 || ijk[1]>=ny || ijk[2]<0 || ijk[2]>=nz ||
                !zones.TryAdd((ijk[0],ijk[1],ijk[2]),Name(z.GetProperty("name")))) throw new ArgumentException("Invalid or duplicate zone block.");
        }
        int Id(int i,int j,int k)=>(k*(ny+1)+j)*(nx+1)+i;
        var b=new StringBuilder("FoamFile { version 2.0; format ascii; class dictionary; object blockMeshDict; }\nscale 1;\nvertices\n(\n");
        for(int k=0;k<=nz;k++)for(int j=0;j<=ny;j++)for(int i=0;i<=nx;i++)
            b.AppendLine(FoamList(new[]{Num(axes[0].Points[i]),Num(axes[1].Points[j]),Num(axes[2].Points[k])}));
        b.AppendLine(");\nblocks\n(");
        var faces=Enumerable.Range(0,6).Select(_=>new List<string>()).ToArray();
        int[][] sides={new[]{0,4,7,3},new[]{1,2,6,5},new[]{0,1,5,4},new[]{3,7,6,2},new[]{0,3,2,1},new[]{4,5,6,7}};
        for(int k=0;k<nz;k++)for(int j=0;j<ny;j++)for(int i=0;i<nx;i++)
        {
            int[] v={Id(i,j,k),Id(i+1,j,k),Id(i+1,j+1,k),Id(i,j+1,k),Id(i,j,k+1),Id(i+1,j,k+1),Id(i+1,j+1,k+1),Id(i,j+1,k+1)};
            int[] q={i,j,k};var size=axes.Select((a,d)=>a.Points[q[d]+1]-a.Points[q[d]]).Aggregate(1.0,(a,c)=>a*c);
            if (!(size>0) || !double.IsFinite(size)) throw new ArgumentException("Invalid block volume.");
            zones.TryGetValue((i,j,k),out var zone);
            b.AppendLine("hex "+FoamList(v)+(zone is null?"":" "+zone)+" "+FoamList(axes.Select((a,d)=>a.Counts[q[d]]))+" simpleGrading "+FoamList(axes.Select((a,d)=>Num(a.Grading[q[d]]))));
            bool[] exterior={i==0,i==nx-1,j==0,j==ny-1,k==0,k==nz-1};
            for(int d=0;d<6;d++)if(exterior[d])faces[d].Add(FoamList(sides[d].Select(x=>v[x])));
        }
        b.AppendLine(");\nedges ();\nboundary\n(");
        for(int i=0;i<6;i++)b.AppendLine(patches[i]+" { type patch; faces (\n"+string.Join("\n",faces[i])+"\n); }");
        b.AppendLine(");\nmergePatchPairs ();");
        return (b.ToString(),cells);
    }

    internal static string QualityStatus(int? exit,string log)
    {
        if(exit is null)return "not-run";
        if(exit!=0)return "command-failed";
        // Native reports are evidence, not certification. A standalone success
        // marker is insufficient in truncated, concatenated or fatal output.
        if(System.Text.RegularExpressions.Regex.IsMatch(log,@"(?m)^[ \t]*Failed[ \t]+\d+[ \t]+mesh checks?\.[ \t\r]*$"))return "checks-failed";
        if(System.Text.RegularExpressions.Regex.IsMatch(log,@"(?im)\bFOAM\s+FATAL\s+(?:IO\s+)?ERROR\b|\bFOAM\s+aborting\b|^[ \t]*(?:Floating point exception|Segmentation fault|SIGFPE|SIGSEGV)\b"))return "checks-failed";
        if(log.Contains("[truncated]",StringComparison.Ordinal))return "undetermined";
        var ok=System.Text.RegularExpressions.Regex.Matches(log,@"(?m)^[ \t]*Mesh OK\.[ \t\r]*$");
        var end=System.Text.RegularExpressions.Regex.Matches(log,@"(?m)^[ \t]*End[ \t\r]*$");
        if(ok.Count==1&&end.Count==1&&ok[0].Index<end[0].Index&&string.IsNullOrWhiteSpace(log[(end[0].Index+end[0].Length)..]))return "mesh-ok-reported";
        return "undetermined";
    }

    internal static void SelfTest()
    {
        var fixture=new NativeCadSurfaceCheck.ProcessOutput(0,"project=OpenFOAM\nversion=14\nblockMesh=available\ncheckMesh=available\ntimeout=available\n","",false);
        var probe=ParsePreflight(fixture,"14");RequireTools(probe,"blockMesh");
        foreach(var invalid in new[]{ParsePreflight(fixture,"13"),ParsePreflight(fixture with {Truncated=true},"14"),ParsePreflight(fixture with {Stdout=fixture.Stdout+"version=13\n"},"14"),ParsePreflight(fixture with {Stdout=fixture.Stdout+"checkMesh=missing\n"},"14")})
        {bool denied=false;try{RequireTools(invalid,"blockMesh");}catch(NotSupportedException){denied=true;}if(!denied)throw new InvalidOperationException("Invalid preflight accepted.");}
        bool splitDenied=false;try{RequireTools(probe,"blockMesh",true);}catch(NotSupportedException){splitDenied=true;}if(!splitDenied)throw new InvalidOperationException("Missing splitMeshRegions accepted.");
        var hashDir=Path.Combine(Path.GetTempPath(),"foamlens-input-test-"+Guid.NewGuid().ToString("N"));
        try{Directory.CreateDirectory(hashDir);File.WriteAllText(Path.Combine(hashDir,"source.msh"),"abc");var h=HashStagingInputs(hashDir,CancellationToken.None).GetAwaiter().GetResult();if(h.Length!=1||h[0].Path!="source.msh"||h[0].Bytes!=3||h[0].Sha256!="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")throw new InvalidOperationException("Staging SHA256 mismatch.");}finally{Directory.Delete(hashDir,true);}
        var installed=new[]{new WslDistribution("Ubuntu 24.04",true),new WslDistribution("Ubuntu-26.04",false)};
        if(ResolveDistribution(null,installed)!="Ubuntu 24.04"||ResolveDistribution("Ubuntu-26.04",installed)!="Ubuntu-26.04")throw new InvalidOperationException("WSL selection failed.");
        if(!WslArgs("Ubuntu 24.04","wslpath","-a","a b").SequenceEqual(new[]{"--distribution","Ubuntu 24.04","--exec","wslpath","-a","a b"}))throw new InvalidOperationException("WSL argument boundary failed.");
        foreach(var invalid in new[]{"--exec","Ubuntu\nother","Unknown"}){bool denied=false;try{ResolveDistribution(invalid,installed);}catch(NotSupportedException){denied=true;}if(!denied)throw new InvalidOperationException("Unregistered WSL selection accepted.");}
        if(!CommandPlan("gmshToFoam",true,false).Any(x=>x.StartsWith("splitMeshRegions"))||CommandPlan("blockMesh",false,false).Any(x=>x.StartsWith("snappyHexMesh")))throw new InvalidOperationException("Command preview mismatch.");
        foreach(var valid in new[]{"Mesh OK.\n\nEnd\n","Mesh OK.\r\nEnd\r\n","sigFpe : Enabling floating point exception trapping (FOAM_SIGFPE).\nMesh OK.\nEnd\n"})
            if(QualityStatus(0,valid)!="mesh-ok-reported")throw new InvalidOperationException("Complete native quality receipt rejected.");
        foreach(var incomplete in new[]{"Mesh OK.\n","End\n","End\nMesh OK.\n","Mesh OK.\nEnd\nMesh OK.\nEnd\n","Mesh OK.\nEnd\n[truncated]","Mesh OK.\nEnd\nmore output","prefix Mesh OK.\nEnd\n"})
            if(QualityStatus(0,incomplete)!="undetermined")throw new InvalidOperationException("Incomplete or ambiguous quality receipt accepted.");
        foreach(var failure in new[]{"Failed 1 mesh checks.\n","Mesh OK.\nFailed 2 mesh checks.\nEnd\n","FOAM FATAL IO ERROR\nMesh OK.\nEnd\n","Mesh OK.\nFOAM aborting\nEnd\n","Floating point exception\nMesh OK.\nEnd\n"})
            if(QualityStatus(0,failure)!="checks-failed")throw new InvalidOperationException("Negative native quality evidence accepted.");
        if(QualityStatus(1,"Mesh OK.\nEnd\n")!="command-failed"||QualityStatus(null,"Mesh OK.\nEnd\n")!="not-run")throw new InvalidOperationException("Quality receipt command status ignored.");
        const string valid = """
            {"axes":[{"points":[0,1,2],"counts":[2,3],"grading":[1,1]},{"points":[0,1],"counts":[4],"grading":[1]},{"points":[0,1],"counts":[5],"grading":[1]}],"patches":["xMin","xMax","yMin","yMax","zMin","zMax"],"zones":[{"ijk":[0,0,0],"name":"metal"},{"ijk":[1,0,0],"name":"mold"}]}
            """;
        using var doc=JsonDocument.Parse(valid);
        var (dict,cells)=Build(doc.RootElement);
        var zones=CartesianZones(doc.RootElement,cells);if(zones["metal"]!=40||zones["mold"]!=60)throw new InvalidOperationException("Cartesian split zone count mismatch.");
        if(cells!=100 || !dict.Contains(" metal (2 4 5)") || !dict.Contains(" mold (3 4 5)") || !dict.Contains("type patch;"))throw new InvalidOperationException("Cartesian host topology self-test failed.");
        foreach(var bad in new[]{valid.Replace("metal","metal;include"),valid.Replace("[0,1,2]","[0,0,2]"),valid.Replace("[1,0,0]","[0,0,0]"),valid.Replace("[4]","[10001]")})
        {
            using var test=JsonDocument.Parse(bad);
            try{Build(test.RootElement);}catch(ArgumentException){continue;}
            throw new InvalidOperationException("Unsafe Cartesian plan accepted.");
        }
        using(var incomplete=JsonDocument.Parse(valid.Replace(",{\"ijk\":[1,0,0],\"name\":\"mold\"}","")))
        {
            try{CartesianZones(incomplete.RootElement,cells);throw new InvalidOperationException("Incomplete zones accepted.");}catch(ArgumentException){}
        }
        var stl=new byte[134];
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(stl.AsSpan(80,4),1);
        for(int i=0;i<9;i++)System.Buffers.Binary.BinaryPrimitives.WriteSingleLittleEndian(stl.AsSpan(96+4*i,4),0.25f);
        var snappyJson=valid.Replace("[{\"ijk\":[0,0,0],\"name\":\"metal\"},{\"ijk\":[1,0,0],\"name\":\"mold\"}]","[]");
        snappyJson=snappyJson[..^1]+",\"snappy\":{\"inside\":[0.5,0.5,0.5],\"minLevel\":1,\"maxLevel\":2,\"maxCells\":200000,\"stlBase64\":\""+Convert.ToBase64String(stl)+"\"}}";
        using(var sn=JsonDocument.Parse(snappyJson))
        {
            var (sd,surface)=BuildSnappy(sn.RootElement,cells);
            if(!sd.Contains("insidePoint (0.5 0.5 0.5);")||!sd.Contains("level (1 2)")||!sd.Contains("addLayers false;")||surface.Count!=1||surface.Values.Single().Length!=134)throw new InvalidOperationException("Snappy dictionary self-test failed.");
        }
        // Exact native transformation, independently of frontend validation.
        var uniformNode=JsonNode.Parse(snappyJson)!.AsObject();
        foreach(var axis in uniformNode["axes"]!.AsArray())
        {
            var grading=axis!["grading"]!.AsArray();
            for(int j=0;j<grading.Count;j++)grading[j]=JsonValue.Create(1.0);
        }
        uniformNode["snappy"]!["maxLevel"]=1;
        uniformNode["snappy"]!["uniformBackground"]=true;
        var uniform=PrepareSnappyBackground(JsonSerializer.SerializeToElement(uniformNode));
        if(uniform.UniformLevel!=1||uniform.OriginalCells!=cells||Build(uniform.Input).Cells!=cells*8||
           !BuildSnappy(uniform.Input,cells*8).Dictionary.Contains("level (0 0)")||
           !BuildSnappy(uniform.Input,cells*8).Dictionary.Contains("minFaceWeight 0.05;"))
            throw new InvalidOperationException("Uniform background self-test failed.");
        foreach(var kind in new[]{"unequal","cap","grading","boxes","overrides"})
        {
            var invalid=JsonNode.Parse(uniformNode.ToJsonString())!.AsObject();
            var sn=invalid["snappy"]!.AsObject();
            if(kind=="unequal")sn["maxLevel"]=2;
            if(kind=="cap")sn["maxCells"]=cells*8-1;
            if(kind=="grading")invalid["axes"]![0]!["grading"]![0]=2.0;
            if(kind=="boxes")sn["boxes"]=JsonNode.Parse("[{}]");
            if(kind=="overrides")sn["surfaceSettings"]=JsonNode.Parse("[{}]");
            bool rejected=false;
            try{PrepareSnappyBackground(JsonSerializer.SerializeToElement(invalid));}catch(ArgumentException){rejected=true;}
            if(!rejected)throw new InvalidOperationException("Incompatible uniform background accepted: "+kind);
        }
        var advancedJson=snappyJson[..^2]+",\"boxes\":[{\"min\":[0.1,0.1,0.1],\"max\":[0.4,0.4,0.4],\"level\":3}],\"surfaceSettings\":[{\"id\":1,\"minLevel\":2,\"maxLevel\":3,\"layers\":2}],\"layerSettings\":{\"expansionRatio\":1.25,\"finalLayerThickness\":0.25,\"minThickness\":0.125}}}";
        using(var sn=JsonDocument.Parse(advancedJson)){
            var (sd,_)=BuildSnappy(sn.RootElement,cells);
            if(!sd.Contains("type box;")||!sd.Contains("mode inside; level 3;")||!sd.Contains("level (2 3)")||!sd.Contains("addLayers true;")||!sd.Contains("nSurfaceLayers 2;")||!sd.Contains("expansionRatio 1.25;"))throw new InvalidOperationException("Advanced snappy dictionary self-test failed.");
        }
        foreach(var invalid in new[]{advancedJson.Replace("\"layers\":2","\"layers\":9"),advancedJson.Replace("\"level\":3","\"level\":5"),advancedJson.Replace("\"max\":[0.4,0.4,0.4]","\"max\":[0.05,0.4,0.4]")}){
            using var sn=JsonDocument.Parse(invalid);
            try{BuildSnappy(sn.RootElement,cells);throw new InvalidOperationException("Invalid advanced snappy settings accepted.");}catch(ArgumentException){}
        }
        using(var diagnostic=JsonDocument.Parse(snappyJson[..^2]+",\"snapEnabled\":false,\"transitionLayers\":3}}")){
            var (sd,_)=BuildSnappy(diagnostic.RootElement,cells);
            if(!sd.Contains("snap false;")||!sd.Contains("nCellsBetweenLevels 3;")||!sd.Contains("addLayers false;"))throw new InvalidOperationException("Castellated diagnostic self-test failed.");
        }
        using(var feature=JsonDocument.Parse(snappyJson[..^2]+",\"explicitFeatures\":true}}")){
            var (sd,surface)=BuildSnappy(feature.RootElement,cells);var fd=BuildSurfaceFeatures(feature.RootElement,surface.Keys);
            if(!sd.Contains("explicitFeatureSnap true;")||!sd.Contains("surface_001.extendedFeatureEdgeMesh")||fd is null||!fd.Contains("includedAngle 150;"))throw new InvalidOperationException("Explicit feature recovery self-test failed.");
        }
        foreach(var badDiagnostic in new[]{snappyJson[..^2]+",\"transitionLayers\":7}}",advancedJson[..^2]+",\"snapEnabled\":false}}"}){
            using var docDiagnostic=JsonDocument.Parse(badDiagnostic);
            try{BuildSnappy(docDiagnostic.RootElement,cells);throw new InvalidOperationException("Invalid diagnostic settings accepted.");}catch(ArgumentException){}
        }
        foreach(var invalid in new[]{snappyJson.Replace("[0.5,0.5,0.5]","[0,0.5,0.5]"),snappyJson.Replace("\"maxLevel\":2","\"maxLevel\":9")})
        {
            using var sn=JsonDocument.Parse(invalid);
            try{BuildSnappy(sn.RootElement,cells);throw new InvalidOperationException("Invalid snappy settings accepted.");}catch(ArgumentException){}
        }
        const string msh = """
            $MeshFormat
            2.2 0 8
            $EndMeshFormat
            $PhysicalNames
            1
            3 1 "fl_3_101"
            $EndPhysicalNames
            $Nodes
            8
            1 0 0 0
            2 1 0 0
            3 1 1 0
            4 0 1 0
            5 0 0 1
            6 1 0 1
            7 1 1 1
            8 0 1 1
            $EndNodes
            $Elements
            1
            1 5 2 1 1 1 2 3 4 5 6 7 8
            $EndElements
            """;
        if(ValidateGmsh(msh.Replace("\r\n","\n"))!=1)throw new InvalidOperationException("Canonical MSH self-test failed.");
        foreach(var bad in new[]{msh.Replace("fl_3_101","../escape"),msh.Replace("6 7 8","6 7 9"),msh.Replace("1 5 2","1 17 2"),msh.Replace("2.2 0 8","4.1 0 8")})
        {
            try{ValidateGmsh(bad.Replace("\r\n","\n"));}catch(ArgumentException){continue;}
            throw new InvalidOperationException("Invalid canonical MSH accepted.");
        }
    }


    // Strict canonical MSH 2.2 subset emitted by our inspector; no arbitrary
    // sections, strings, directives, paths, binaries or higher-order elements.
    internal static long ValidateGmsh(string source, Dictionary<string,long>? volumeGroups = null)
    {
        if(source.Length>32*1024*1024 || source.Contains('\0') || source.Contains('\r'))throw new ArgumentException("Invalid canonical MSH transfer.");
        using var rd=new StringReader(source);
        string Line()=>rd.ReadLine()??throw new ArgumentException("Unexpected end of MSH.");
        void Expect(string v){if(Line()!=v)throw new ArgumentException("Unexpected MSH section.");}
        string[] Row()=>Line().Split(' ',StringSplitOptions.RemoveEmptyEntries);
        int Id(string v){if(!int.TryParse(v,NumberStyles.None,CultureInfo.InvariantCulture,out var n)||n<=0)throw new ArgumentException("Invalid MSH ID.");return n;}
        int Count(int cap){int n=Id(Line());if(n>cap)throw new ArgumentException("MSH record limit exceeded.");return n;}
        Expect("$MeshFormat");Expect("2.2 0 8");Expect("$EndMeshFormat");Expect("$PhysicalNames");
        var groups=new Dictionary<int,(int Dim,string Name)>();var names=new HashSet<string>(StringComparer.Ordinal);
        int ng=Count(10000);
        for(int i=0;i<ng;i++){var t=Row();if(t.Length!=3||t[0] is not ("2" or "3")||!System.Text.RegularExpressions.Regex.IsMatch(t[2],@"\A""fl_[23]_[0-9]+""\z")||!names.Add(t[2])||!groups.TryAdd(Id(t[1]),(int.Parse(t[0],CultureInfo.InvariantCulture),t[2].Trim('"'))))throw new ArgumentException("Invalid canonical physical group.");}
        Expect("$EndPhysicalNames");Expect("$Nodes");int nn=Count(1000000);var nodes=new HashSet<int>();
        for(int i=0;i<nn;i++){var t=Row();if(t.Length!=4||!nodes.Add(Id(t[0]))||t.Skip(1).Any(x=>!double.TryParse(x,NumberStyles.Float,CultureInfo.InvariantCulture,out var v)||!double.IsFinite(v)))throw new ArgumentException("Invalid MSH node.");}
        Expect("$EndNodes");Expect("$Elements");int ne=Count(1500000),volumes=0;var elements=new HashSet<int>();
        for(int i=0;i<ne;i++){var t=Row();if(t.Length<5||!elements.Add(Id(t[0]))||t[2]!="2"||!groups.TryGetValue(Id(t[3]),out var group))throw new ArgumentException("Invalid MSH element or group.");
            int dim=group.Dim;
            int count=t[1]=="5"&&dim==3?8:t[1]=="3"&&dim==2?4:0;if(count==0||t.Length!=5+count)throw new ArgumentException("Only grouped QUAD4 and HEX8 supported.");
            Id(t[4]);var ids=t.Skip(5).Select(Id).ToArray();if(ids.Distinct().Count()!=count||ids.Any(x=>!nodes.Contains(x)))throw new ArgumentException("Invalid MSH connectivity.");if(dim==3){if(++volumes>350000)throw new ArgumentException("Native Gmsh cap: 350000 HEX8 cells.");if(volumeGroups!=null)volumeGroups[group.Name]=volumeGroups.GetValueOrDefault(group.Name)+1;}}
        Expect("$EndElements");if(rd.ReadLine()!=null||volumes==0)throw new ArgumentException("Trailing MSH data or empty volume.");return volumes;
    }

    internal static Dictionary<string,long> CartesianZones(JsonElement root, long total)
    {
        var axes=root.GetProperty("axes").EnumerateArray().Select(a=>a.GetProperty("counts").EnumerateArray().Select(x=>x.GetInt32()).ToArray()).ToArray();
        var counts=new Dictionary<string,long>(StringComparer.Ordinal);
        foreach(var z in root.GetProperty("zones").EnumerateArray()){
            var q=z.GetProperty("ijk").EnumerateArray().Select(x=>x.GetInt32()).ToArray();
            string name=Name(z.GetProperty("name"));
            counts[name]=counts.GetValueOrDefault(name)+(long)axes[0][q[0]]*axes[1][q[1]]*axes[2][q[2]];
        }
        ValidateSplit(counts,total);
        return counts;
    }
    private static void ValidateSplit(Dictionary<string,long> zones,long total)
    {
        if(zones.Count is <2 or >12 || zones.Values.Any(n=>n<=0) || zones.Values.Sum()!=total ||
            zones.Keys.Any(n=>n is "polyMesh" or "region0" or "sets" or "triSurface" or "geometry"))
            throw new ArgumentException("Split requires 2–12 nonempty explicit cell zones covering every cell, with distinct non-reserved region names.");
    }

    // Explicit alternate mesh strategy: put the requested equal refinement
    // into the background counts, not local octree transitions. Only uniform
    // grading is supported; local boxes/overrides/layers cannot be substituted.
    internal static (JsonElement Input,int? UniformLevel,long? OriginalCells) PrepareSnappyBackground(JsonElement root)
    {
        if(!root.TryGetProperty("snappy",out var settings)||!settings.TryGetProperty("uniformBackground",out var flag)||!flag.GetBoolean())return(root,null,null);
        var (_,baseCells)=Build(root);
        int min=settings.GetProperty("minLevel").GetInt32(),max=settings.GetProperty("maxLevel").GetInt32(),cap=settings.GetProperty("maxCells").GetInt32();
        if(min!=max||min<1||min>4)throw new ArgumentException("Uniform background requires equal requested refinement levels 1–4.");
        if(root.GetProperty("zones").GetArrayLength()!=0||(root.TryGetProperty("splitRegions",out var split)&&split.GetBoolean())||
           (settings.TryGetProperty("boxes",out var boxes)&&boxes.GetArrayLength()!=0)||
           (settings.TryGetProperty("surfaceSettings",out var overrides)&&overrides.GetArrayLength()!=0))
            throw new ArgumentException("Uniform background is an alternative without zones, local boxes or per-surface overrides/layers.");
        if(cap<baseCells||cap>350000)throw new ArgumentException("Invalid maxGlobalCells for uniform background.");
        var factor=1<<min;
        long refined=checked(baseCells*factor*factor*factor);
        if(refined>MaxCells||refined>cap)throw new ArgumentException("Uniform refined background exceeds native 200,000-cell or selected maxGlobalCells limit.");
        var node=JsonNode.Parse(root.GetRawText())!.AsObject();
        foreach(var axis in node["axes"]!.AsArray())
        {
            if(axis!["grading"]!.AsArray().Any(x=>x!.GetValue<double>()!=1))throw new ArgumentException("Uniform background requires unit grading in every interval.");
            var counts=axis["counts"]!.AsArray();
            for(int i=0;i<counts.Count;i++)
            {
                int count=checked(counts[i]!.GetValue<int>()*factor);
                if(count>10000)throw new ArgumentException("Refined axis interval exceeds 10,000 cells.");
                counts[i]=JsonValue.Create(count);
            }
        }
        var sn=node["snappy"]!.AsObject();
        sn["minLevel"]=0;sn["maxLevel"]=0;sn.Remove("uniformBackground");
        var prepared=JsonSerializer.SerializeToElement(node);
        if(Build(prepared).Cells!=refined)throw new InvalidOperationException("Uniform background cell accounting mismatch.");
        return(prepared,min,baseCells);
    }

    internal static (string Dictionary, Dictionary<string,byte[]> Surfaces) BuildSnappy(JsonElement root, long cells)
    {
        var settings=root.GetProperty("snappy");
        if(root.GetProperty("zones").GetArrayLength()!=0)throw new ArgumentException("Snappy run requires a background plan without assigned zones.");
        var axes=root.GetProperty("axes").EnumerateArray().Select(a=>a.GetProperty("points").EnumerateArray().Select(x=>x.GetDouble()).ToArray()).ToArray();
        var inside=settings.GetProperty("inside").EnumerateArray().Select(x=>x.GetDouble()).ToArray();
        if(inside.Length!=3||inside.Where((x,i)=>!double.IsFinite(x)||x<=axes[i][0]||x>=axes[i][^1]).Any())throw new ArgumentException("Explicit retained point must be strictly inside the background domain.");
        int min=settings.GetProperty("minLevel").GetInt32(),max=settings.GetProperty("maxLevel").GetInt32(),limit=settings.GetProperty("maxCells").GetInt32();
        if(min<0||max<min||max>4||limit<cells||limit>350000)throw new ArgumentException("Refinement levels 0–4 and cell limit up to 350000 required.");
        var payloads=settings.TryGetProperty("surfaces",out var list)
            ?list.EnumerateArray().Select(x=>x.GetProperty("stlBase64").GetString()??"").ToArray()
            :new[]{settings.GetProperty("stlBase64").GetString()??""};
        if(payloads.Length is <1 or >8||payloads.Sum(x=>(long)x.Length)>5600000)throw new ArgumentException("Select 1–8 STL surfaces totaling at most 4 MiB.");
        var surfaces=new Dictionary<string,byte[]>();
        long totalBytes=0;
        for(int i=0;i<payloads.Length;i++)
        {
            byte[] data=Convert.FromBase64String(payloads[i]);
            int triangles=NativeCadSurfaceCheck.ValidateBinaryStl(data);
            totalBytes+=data.Length;
            if(totalBytes>4*1024*1024)throw new ArgumentException("Combined selected STL exceeds 4 MiB.");
            for(int t=0;t<triangles;t++)for(int p=0;p<3;p++)for(int d=0;d<3;d++){
                float x=System.Buffers.Binary.BinaryPrimitives.ReadSingleLittleEndian(data.AsSpan(84+50*t+12+12*p+4*d,4));
                if(x<=axes[d][0]||x>=axes[d][^1])throw new ArgumentException("Every selected surface must lie strictly inside the background mesh; expand bounds first.");
            }
            surfaces.Add("surface_"+(i+1).ToString("D3",CultureInfo.InvariantCulture)+".stl",data);
        }
        bool snapEnabled=!settings.TryGetProperty("snapEnabled",out var snapNode)||snapNode.GetBoolean();
        bool explicitFeatures=settings.TryGetProperty("explicitFeatures",out var featureNode)&&featureNode.GetBoolean();
        if(explicitFeatures&&!snapEnabled)throw new ArgumentException("Explicit feature snapping requires snap enabled.");
        int transition=settings.TryGetProperty("transitionLayers",out var transNode)?transNode.GetInt32():2;
        if(transition<1||transition>6)throw new ArgumentException("Transition buffer must be 1–6 cells.");
        var geometry=new StringBuilder();var refine=new StringBuilder();var boxes=new StringBuilder();var layerPatches=new StringBuilder();
        var overrides=new Dictionary<int,(int Min,int Max,int Layers)>();
        if(settings.TryGetProperty("surfaceSettings",out var configs))
        foreach(var cfg in configs.EnumerateArray()){
            int id=cfg.GetProperty("id").GetInt32(),lo=cfg.GetProperty("minLevel").GetInt32(),hi=cfg.GetProperty("maxLevel").GetInt32(),n=cfg.GetProperty("layers").GetInt32();
            if(id<1||id>surfaces.Count||lo<0||hi<lo||hi>4||n<0||n>8||!overrides.TryAdd(id,(lo,hi,n)))throw new ArgumentException("Invalid or duplicate surface refinement/layers.");
        }
        double expansion=1.2,final=0.3,minThickness=0.1;
        if(settings.TryGetProperty("layerSettings",out var layer)){
            expansion=layer.GetProperty("expansionRatio").GetDouble();final=layer.GetProperty("finalLayerThickness").GetDouble();minThickness=layer.GetProperty("minThickness").GetDouble();
            if(!double.IsFinite(expansion)||!double.IsFinite(final)||!double.IsFinite(minThickness)||expansion<1||expansion>2||final<=0||final>0.9||minThickness<=0||minThickness>final)throw new ArgumentException("Invalid relative layer thickness or expansion ratio.");
        }
        if(settings.TryGetProperty("boxes",out var boxList)){
            if(boxList.GetArrayLength()>12)throw new ArgumentException("At most 12 refinement boxes.");
            int boxIndex=0;
            foreach(var box in boxList.EnumerateArray()){
                var lo=box.GetProperty("min").EnumerateArray().Select(x=>x.GetDouble()).ToArray();var hi=box.GetProperty("max").EnumerateArray().Select(x=>x.GetDouble()).ToArray();int level=box.GetProperty("level").GetInt32();
                if(lo.Length!=3||hi.Length!=3||level<1||level>4||lo.Where((x,i)=>!double.IsFinite(x)||!double.IsFinite(hi[i])||x>=hi[i]||x<axes[i][0]||hi[i]>axes[i][^1]).Any())throw new ArgumentException("Refinement box must have positive extent inside background domain and level 1–4.");
                string key="flBox_"+(++boxIndex).ToString("D3",CultureInfo.InvariantCulture);
                geometry.AppendLine(key+" { type box; min "+FoamList(lo.Select(Num))+"; max "+FoamList(hi.Select(Num))+"; }");
                boxes.AppendLine(key+" { mode inside; level "+level+"; }");
            }
        }
        var features=new StringBuilder();int index=0;foreach(var file in surfaces.Keys){
            string key="flSurface_"+(++index).ToString("D3",CultureInfo.InvariantCulture);
            geometry.AppendLine(key+" { type triSurface; file \""+file+"\"; }");
            var cfg=overrides.GetValueOrDefault(index,(min,max,0));
            refine.AppendLine(key+" { level ("+cfg.Item1+" "+cfg.Item2+"); patchInfo { type wall; } }");
            if(explicitFeatures)features.AppendLine("{ file \""+Path.GetFileNameWithoutExtension(file)+".extendedFeatureEdgeMesh\"; level "+cfg.Item1+"; }");
            if(cfg.Item3>0)layerPatches.AppendLine("\""+key+"(_.*)?\" { nSurfaceLayers "+cfg.Item3+"; }");
        }
        if(!snapEnabled&&layerPatches.Length>0)throw new ArgumentException("Boundary layers require snapping; use a separate explicit run.");
        string dict=$$"""
            FoamFile { version 2.0; format ascii; class dictionary; object snappyHexMeshDict; }
            castellatedMesh true;
            snap {{(snapEnabled?"true":"false")}};
            addLayers {{(layerPatches.Length>0?"true":"false")}};
            geometry { {{geometry.ToString()}} }
            castellatedMeshControls
            {
                maxLocalCells {{limit}}; maxGlobalCells {{limit}}; minRefinementCells 0; maxLoadUnbalance 0.1; nCellsBetweenLevels {{transition}};
                features ({{features.ToString()}});
                refinementSurfaces { {{refine.ToString()}} }
                resolveFeatureAngle 30;
                refinementRegions { {{boxes.ToString()}} }
                insidePoint {{FoamList(inside.Select(Num))}};
                allowFreeStandingZoneFaces false;
            }
            snapControls { nSmoothPatch 3; tolerance {{(explicitFeatures?"1":"2")}}; nSolveIter {{(explicitFeatures?300:30)}}; nRelaxIter 5; nFeatureSnapIter 10; implicitFeatureSnap {{(explicitFeatures?"false":"true")}}; explicitFeatureSnap {{(explicitFeatures?"true":"false")}}; multiRegionFeatureSnap {{(explicitFeatures?"true":"false")}}; }
            addLayersControls { relativeSizes true; layers { {{layerPatches.ToString()}} } expansionRatio {{Num(expansion)}}; finalLayerThickness {{Num(final)}}; minThickness {{Num(minThickness)}}; nGrow 0; featureAngle 60; nRelaxIter 5; nSmoothSurfaceNormals 1; nSmoothNormals 3; nSmoothThickness 10; maxFaceThicknessRatio 0.5; maxThicknessToMedialRatio 0.3; minMedialAxisAngle 90; nBufferCellsNoExtrude 0; nLayerIter 50; }
            meshQualityControls { maxNonOrtho 65; maxBoundarySkewness 20; maxInternalSkewness 4; maxConcave 80; minVol 1e-20; minTetQuality 1e-15; minArea -1; minTwist 0.02; minDeterminant 0.001; minFaceWeight 0.05; minVolRatio 0.01; minTriangleTwist -1; nSmoothScale 4; errorReduction 0.75; }
            singleRegionName true;
            debug 0;
            mergeTolerance 1e-6;
            """;
        return (dict,surfaces);
    }

    // Fixed program; positional args are only the host-owned temp path and an allowlisted version.
    internal static string? BuildSurfaceFeatures(JsonElement root,IEnumerable<string> files)
    {
        var settings=root.GetProperty("snappy");
        if(!settings.TryGetProperty("explicitFeatures",out var flag)||!flag.GetBoolean())return null;
        var names=files.ToArray();
        if(names.Length==0||names.Any(n=>!System.Text.RegularExpressions.Regex.IsMatch(n,@"\Asurface_[0-9]{3}\.stl\z")))throw new ArgumentException("Invalid staged surface name.");
        return "FoamFile { version 2.0; format ascii; class dictionary; object surfaceFeaturesDict; }\nsurfaces ("+string.Join(" ",names.Select(n=>"\""+n+"\""))+");\nincludedAngle 150;\n";
    }
    internal const string Script = """
        set -e
        # Foundation bashrc reads its positional arguments as configuration.
        # Source it inside a function with no case/utility arguments.
        readonly fl_version="$2"
        fl_source_profile() { . "$fl_profile"; }
        if [ "${WM_PROJECT_VERSION:-}" != "$fl_version" ] || [ "${WM_PROJECT:-}" != OpenFOAM ]; then
          for fl_profile in "/opt/openfoam$fl_version/etc/bashrc" "/usr/lib/openfoam/openfoam$fl_version/etc/bashrc" "$HOME/OpenFOAM/OpenFOAM-$fl_version/etc/bashrc"; do
            if [ -r "$fl_profile" ]; then
              printf 'Loading Foundation environment: %s\n' "$fl_profile" >&2
              fl_source_profile >&2 || true
            fi
            if [ "${WM_PROJECT_VERSION:-}" = "$fl_version" ] && [ "${WM_PROJECT:-}" = OpenFOAM ]; then break; fi
          done
        fi
        if [ "${WM_PROJECT:-}" != OpenFOAM ] || [ "${WM_PROJECT_VERSION:-}" != "$fl_version" ]; then
          printf 'Requested Foundation OpenFOAM environment unavailable: project=%s version=%s requested=%s\n' "${WM_PROJECT:-unset}" "${WM_PROJECT_VERSION:-unset}" "$fl_version" >&2
          exit 127
        fi
        if [ "$3" = gmshToFoam ]; then command -v gmshToFoam >/dev/null; else command -v blockMesh >/dev/null; fi
        if [ "$3" = snappyHexMesh ]; then command -v snappyHexMesh >/dev/null; command -v surfaceCheck >/dev/null; fi
        command -v checkMesh >/dev/null
        command -v timeout >/dev/null
        cd "$1"
        printf '%s\n' "$WM_PROJECT_VERSION" > detected-version.txt
        set +e
        if [ "$3" = gmshToFoam ]; then
          timeout --kill-after=5s 90s gmshToFoam -case "$1" "$1/source.msh" > generation.log 2>&1
        else
          timeout --kill-after=5s 90s blockMesh -case "$1" > generation.log 2>&1
        fi
        code=$?
        printf '%s\n' "$code" > generation.exit
        if [ "$3" = snappyHexMesh ]; then printf '%s\n' "$code" > blockMesh.exit; cp generation.log blockMesh.log; fi
        if [ "$code" -ne 0 ]; then exit "$code"; fi
        if [ "$3" = snappyHexMesh ]; then
                    : > surfaceCheck.log
          for surface in "$1"/constant/geometry/surface_*.stl; do
            if [ ! -f "$surface" ]; then exit 3; fi
            printf 'Surface %s\n' "$(basename "$surface")" >> surfaceCheck.log
            timeout --kill-after=5s 30s surfaceCheck -checkSelfIntersection "$surface" >> surfaceCheck.log 2>&1
            code=$?
            printf '%s\n' "$code" > surfaceCheck.exit
            if [ "$code" -ne 0 ]; then printf '%s\n' "$code" > generation.exit; exit "$code"; fi
          done
          if [ -f system/surfaceFeaturesDict ]; then
            if ! command -v surfaceFeatures >/dev/null; then printf '127\n' > surfaceFeatures.exit; exit 127; fi
            timeout --kill-after=5s 60s surfaceFeatures -case "$1" > surfaceFeatures.log 2>&1
            code=$?
            printf '%s\n' "$code" > surfaceFeatures.exit
            if [ "$code" -ne 0 ]; then exit "$code"; fi
          fi
          timeout --kill-after=5s 180s snappyHexMesh -case "$1" > generation.log 2>&1
          code=$?
          printf '%s\n' "$code" > generation.exit
          printf '%s\n' "$code" > snappyHexMesh.exit
          if [ "$code" -ne 0 ]; then exit "$code"; fi
        fi
        timeout --kill-after=5s 90s checkMesh -case "$1" -allTopology -allGeometry -writeSets -writeSurfaces > checkMesh.log 2>&1
        code=$?
        printf '%s\n' "$code" > checkMesh.exit
        # Foundation checkMesh does not expose the OpenCFD writeFields switch.
        # Generate actual native cell volumes separately, without changing quality status.
        fl_write_volumes() {
          local region="$1" log="$2" result
          if ! command -v foamPostProcess >/dev/null; then
            echo 'foamPostProcess unavailable' > "$log.log"
            printf '127\n' > "$log.exit"
            return 0
          fi
          mkdir -p 0
          if [ -n "$region" ]; then
            timeout --kill-after=5s 40s foamPostProcess -case "$fl_case" -region "$region" -time 0 -func writeCellVolumes > "$log.log" 2>&1
          else
            timeout --kill-after=5s 40s foamPostProcess -case "$fl_case" -time 0 -func writeCellVolumes > "$log.log" 2>&1
          fi
          result=$?
          printf '%s\n' "$result" > "$log.exit"
          return 0
        }
        fl_case="$1"
        # Build only packaged sources, in this isolated temporary case. Never
        # execute a binary supplied by a case or from an arbitrary PATH entry.
        fl_quality_build() {
          if [ -f nativeQualityBuild.exit ]; then return 0; fi
          local result
          if [ ! -f "$fl_case/native-quality-src/foamlensMeshQuality.C" ] || ! command -v wmake >/dev/null; then
            echo 'Packaged source or wmake unavailable' > nativeQualityBuild.log
            printf '127\n' > nativeQualityBuild.exit
            return 0
          fi
          mkdir -p "$fl_case/native-quality-bin"
          (cd "$fl_case/native-quality-src" && export FOAM_USER_APPBIN="$fl_case/native-quality-bin" && timeout --kill-after=5s 180s wmake) > nativeQualityBuild.log 2>&1
          result=$?
          printf '%s\n' "$result" > nativeQualityBuild.exit
          return 0
        }
        fl_quality_run() {
          local region="$1" log="$2" result out="$fl_case/$2"
          fl_quality_build
          if [ "$(cat nativeQualityBuild.exit)" != 0 ] || [ ! -x "$fl_case/native-quality-bin/foamlensMeshQuality" ]; then
            printf '127\n' > "$log.exit"
            return 0
          fi
          mkdir "$out" || { printf '3\n' > "$log.exit"; return 0; }
          if [ -n "$region" ]; then
            timeout --kill-after=5s 60s "$fl_case/native-quality-bin/foamlensMeshQuality" -case "$fl_case" -region "$region" -output "$out" > "$log.log" 2>&1
          else
            timeout --kill-after=5s 60s "$fl_case/native-quality-bin/foamlensMeshQuality" -case "$fl_case" -output "$out" > "$log.log" 2>&1
          fi
          result=$?
          printf '%s\n' "$result" > "$log.exit"
          return 0
        }
        if [ "$code" -ne 0 ] || [ "$4" != split ]; then
          fl_write_volumes "" nativeVolumes
          fl_quality_run "" nativeQuality
          exit "$code"
        fi
        if ! command -v splitMeshRegions >/dev/null; then echo 'splitMeshRegions unavailable' >&2; exit 127; fi
        if [ "$fl_version" = 14 ]; then
          timeout --kill-after=5s 120s splitMeshRegions -case "$1" -cellZones all -noFields > splitMeshRegions.log 2>&1
        else
          timeout --kill-after=5s 120s splitMeshRegions -case "$1" -cellZonesOnly > splitMeshRegions.log 2>&1
        fi
        code=$?
        printf '%s\n' "$code" > splitMeshRegions.exit
        if [ "$code" -ne 0 ]; then exit "$code"; fi
        while IFS= read -r region; do
          if [ ! -d "constant/$region/polyMesh" ]; then echo "Expected region missing: $region" >&2; exit 3; fi
          timeout --kill-after=5s 60s checkMesh -case "$1" -region "$region" -allTopology -allGeometry -writeSets -writeSurfaces > "checkMesh.$region.log" 2>&1
          code=$?
          printf '%s\n' "$code" > "checkMesh.$region.exit"
          fl_write_volumes "$region" "nativeVolumes.$region"
          fl_quality_run "$region" "nativeQuality.$region"
        done < expected-regions.txt
        exit 0
        """;
    // Reuse the exact Foundation loader used by generation. No case directory,
    // mesher, solver, package install or arbitrary command is accepted here.
    internal static string FoundationLoader()
    {
        const string marker = "if [ \"$3\" = gmshToFoam ]; then";
        int end=Script.IndexOf(marker,StringComparison.Ordinal);
        if(end<0)throw new InvalidOperationException("Foundation loader boundary missing.");
        return Script[..end];
    }
    internal static string ProbeScript()=>FoundationLoader()+"""
        printf 'project=%s\nversion=%s\n' "$WM_PROJECT" "$WM_PROJECT_VERSION"
        for tool in blockMesh checkMesh surfaceCheck gmshToFoam splitMeshRegions snappyHexMesh surfaceFeatures foamPostProcess wmake timeout; do
          if command -v "$tool" >/dev/null 2>&1; then printf '%s=available\n' "$tool"; else printf '%s=missing\n' "$tool"; fi
        done
        """;

    internal sealed record WslDistribution(string Name,bool IsDefault);
    internal static WslDistribution[] InstalledDistributions()
    {
        if(!OperatingSystem.IsWindows())throw new NotSupportedException("WSL inventory requires Windows.");
        using var root=Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Lxss");
        if(root is null)return Array.Empty<WslDistribution>();
        var defaultId=root.GetValue("DefaultDistribution") as string;
        var result=new List<WslDistribution>();
        foreach(string key in root.GetSubKeyNames())
        {
            if(!Guid.TryParse(key,out var id))continue;
            using var entry=root.OpenSubKey(key);
            if(entry?.GetValue("DistributionName") is string name&&ValidDistributionName(name))
                result.Add(new WslDistribution(name,Guid.TryParse(defaultId,out var selected)&&selected==id));
        }
        return result.OrderByDescending(x=>x.IsDefault).ThenBy(x=>x.Name,StringComparer.OrdinalIgnoreCase).ToArray();
    }
    internal static bool ValidDistributionName(string name)=>name.Length is >0 and <=256&&!name.StartsWith('-')&&!name.Any(char.IsControl);
    internal static string ResolveDistribution(string? requested,IEnumerable<WslDistribution> inventory)
    {
        var all=inventory.ToArray();
        var matches=string.IsNullOrEmpty(requested)?all.Where(x=>x.IsDefault):all.Where(x=>string.Equals(x.Name,requested,StringComparison.Ordinal));
        var selected=matches.ToArray();
        if(selected.Length!=1||!ValidDistributionName(selected[0].Name))throw new NotSupportedException("WSL distribution unavailable or ambiguous. Refresh the installed distribution list.");
        return selected[0].Name;
    }
    internal static string? RequestedDistribution(JsonElement root)
    {
        if(!root.TryGetProperty("distribution",out var value)||value.ValueKind==JsonValueKind.Null)return null;
        if(value.ValueKind!=JsonValueKind.String)throw new ArgumentException("Invalid WSL distribution.");
        var name=value.GetString()!;
        if(name.Length>0&&!ValidDistributionName(name))throw new ArgumentException("Invalid WSL distribution.");
        return name;
    }
    internal static string[] WslArgs(string distribution,params string[] args)
    {
        if(!ValidDistributionName(distribution))throw new ArgumentException("Invalid WSL distribution.");
        return new[]{"--distribution",distribution,"--exec"}.Concat(args).ToArray();
    }
    internal static string[] CommandPlan(string utility,bool split,bool features)
    {
        var commands=new List<string>{utility=="gmshToFoam"?"gmshToFoam -case <staging> <staging>/source.msh":"blockMesh -case <staging>"};
        if(utility=="snappyHexMesh"){commands.Add("surfaceCheck -checkSelfIntersection <staged STL> (each surface)");if(features)commands.Add("surfaceFeatures -case <staging>");commands.Add("snappyHexMesh -case <staging>");}
        commands.Add("checkMesh -case <staging> -allTopology -allGeometry -writeSets -writeSurfaces");
        if(split){commands.Add("splitMeshRegions -case <staging> (Foundation-version-specific cellZones options)");commands.Add("checkMesh -case <staging> -region <region> (each region)");}
        commands.Add("foamPostProcess writeCellVolumes; packaged wmake quality helper (when available)");
        return commands.ToArray();
    }
    internal sealed record Preflight(bool Matched,Dictionary<string,bool> Tools,int ExitCode,bool OutputTruncated,string Stderr);
    internal static Preflight ParsePreflight(NativeCadSurfaceCheck.ProcessOutput output,string version)
    {
        var names=new[]{"blockMesh","checkMesh","surfaceCheck","gmshToFoam","splitMeshRegions","snappyHexMesh","surfaceFeatures","foamPostProcess","wmake","timeout"};
        var lines=output.Stdout.Split('\n',StringSplitOptions.TrimEntries|StringSplitOptions.RemoveEmptyEntries);
        bool matched=output.ExitCode==0&&!output.Truncated&&lines.Count(x=>x=="project=OpenFOAM")==1&&lines.Count(x=>x=="version="+version)==1&&lines.Count(x=>x.StartsWith("version=",StringComparison.Ordinal))==1&&lines.Count(x=>x.StartsWith("project=",StringComparison.Ordinal))==1;
        var tools=names.ToDictionary(n=>n,n=>matched&&lines.Count(x=>x==n+"=available")==1&&lines.Count(x=>x==n+"=missing")==0);
        return new Preflight(matched,tools,output.ExitCode,output.Truncated,output.Stderr);
    }
    internal static string[] RequiredTools(string utility,bool split,bool features)
    {
        var required=new List<string>{"timeout"};
        if(utility=="surfaceCheck")required.Add("surfaceCheck");
        else
        {
            required.Add(utility=="gmshToFoam"?"gmshToFoam":"blockMesh");
            required.Add("checkMesh");
            if(utility=="snappyHexMesh"){required.Add("surfaceCheck");required.Add("snappyHexMesh");if(features)required.Add("surfaceFeatures");}
            if(split)required.Add("splitMeshRegions");
        }
        return required.ToArray();
    }
    internal static void RequireTools(Preflight probe,string utility,bool split=false,bool features=false)
    {
        if(!probe.Matched)throw new NotSupportedException("Requested Foundation OpenFOAM environment could not be verified. No case staged.");
        var missing=RequiredTools(utility,split,features).Where(t=>!probe.Tools.TryGetValue(t,out bool available)||!available).ToArray();
        if(missing.Length>0)throw new NotSupportedException("Required native tools missing: "+string.Join(", ",missing)+". No case staged.");
    }
    internal static async Task<Preflight> ProbeSelectedAsync(string wsl,string distribution,string version,CancellationToken token)
    {
        if(version is not ("13" or "14"))throw new ArgumentException("Select Foundation OpenFOAM 13 or 14.");
        var output=await NativeCadSurfaceCheck.RunProcessAsync(wsl,Path.GetTempPath(),WslArgs(distribution,"/bin/bash","-lc",ProbeScript(),"foamlens-wsl-probe","unused",version),TimeSpan.FromSeconds(30),token);
        return ParsePreflight(output,version);
    }
    internal sealed record StagedInput(string Path,long Bytes,string Sha256);
    internal static async Task<StagedInput[]> HashStagingInputs(string dir,CancellationToken token)
    {
        var entries=new List<StagedInput>();
        foreach(string file in Directory.EnumerateFiles(dir,"*",SearchOption.AllDirectories).OrderBy(x=>x,StringComparer.Ordinal))
        {
            token.ThrowIfCancellationRequested();
            var info=new FileInfo(file);if((info.Attributes&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("Linked staging input rejected.");
            using var stream=File.OpenRead(file);
            entries.Add(new StagedInput(Path.GetRelativePath(dir,file).Replace('\\','/'),stream.Length,Convert.ToHexString(await System.Security.Cryptography.SHA256.HashDataAsync(stream,token)).ToLowerInvariant()));
        }
        return entries.ToArray();
    }
    internal static async Task<object> ProbeAsync(string version, CancellationToken token,string? requestedDistribution=null)
    {
        if(version is not ("13" or "14"))throw new ArgumentException("Select Foundation OpenFOAM 13 or 14.");
        var wsl=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"wsl.exe");
        if(!File.Exists(wsl))throw new NotSupportedException("WSL is unavailable.");
        var distribution=ResolveDistribution(requestedDistribution,InstalledDistributions());
        var probe=await ProbeSelectedAsync(wsl,distribution,version,token);
        return new {schema="foamlens/wsl-foundation-preflight/1",requestedVersion=version,matched=probe.Matched,
            runner="selected local WSL distribution",distribution,tools=probe.Tools,exitCode=probe.ExitCode,outputTruncated=probe.OutputTruncated,stderr=probe.Stderr,
            originalCaseModified=false};
    }
    internal static async Task<object> RunAsync(JsonElement root, CancellationToken token, bool gmsh = false)
    {
        var version=root.GetProperty("version").GetString();
        if(version is not ("13" or "14"))throw new ArgumentException("Select Foundation OpenFOAM 13 or 14.");
        string? msh=gmsh?root.GetProperty("msh").GetString():null;
        if(gmsh&&msh is null)throw new ArgumentException("Canonical MSH missing.");
        bool split=root.TryGetProperty("splitRegions",out var splitNode)&&splitNode.GetBoolean();
        bool snappy=!gmsh&&root.TryGetProperty("snappy",out _);
        if(snappy&&split)throw new ArgumentException("Surface snappy and zone splitting are separate operations.");
        if(snappy&&(!root.TryGetProperty("snappyDiagnosticOnly",out var diagnostic)||diagnostic.ValueKind!=JsonValueKind.True))throw new ArgumentException("Snappy refinement is diagnostic-only until strict native quality acceptance; explicit acknowledgement required.");
        var background=snappy?PrepareSnappyBackground(root):(Input:root,UniformLevel:(int?)null,OriginalCells:(long?)null);
        root=background.Input;
        var expected=new Dictionary<string,long>(StringComparer.Ordinal);
        var (dict,cells)=gmsh?("",ValidateGmsh(msh!,split?expected:null)):Build(root);
        if(split){if(gmsh)ValidateSplit(expected,cells);else expected=CartesianZones(root,cells);}
        var snappyInput=snappy?BuildSnappy(root,cells):default;
        string utility=gmsh?"gmshToFoam":snappy?"snappyHexMesh":"blockMesh";
        long exportLimit=gmsh||snappy?48*1024*1024:MaxOutput;
        var wsl=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"wsl.exe");
        if(!File.Exists(wsl))throw new NotSupportedException("WSL is unavailable.");
        var distribution=ResolveDistribution(RequestedDistribution(root),InstalledDistributions());
        var features=snappy&&BuildSurfaceFeatures(root,snappyInput.Surfaces!.Keys) is not null;
        var commands=CommandPlan(utility,split,features);
        var preflight=await ProbeSelectedAsync(wsl,distribution,version,token);
        RequireTools(preflight,utility,split,features);
        var dir=Path.Combine(Path.GetTempPath(),"foamlens-blockmesh-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(dir,"system"));Directory.CreateDirectory(Path.Combine(dir,"constant"));
        try
        {
            if(split)await File.WriteAllTextAsync(Path.Combine(dir,"expected-regions.txt"),string.Join("\n",expected.Keys)+"\n",token);
            if(gmsh)await File.WriteAllTextAsync(Path.Combine(dir,"source.msh"),msh!,token);
            else await File.WriteAllTextAsync(Path.Combine(dir,"system","blockMeshDict"),dict,token);
            if(snappy){Directory.CreateDirectory(Path.Combine(dir,"constant","geometry"));foreach(var (name,data) in snappyInput.Surfaces!)await File.WriteAllBytesAsync(Path.Combine(dir,"constant","geometry",name),data,token);await File.WriteAllTextAsync(Path.Combine(dir,"system","snappyHexMeshDict"),snappyInput.Dictionary!,token);var featureDict=BuildSurfaceFeatures(root,snappyInput.Surfaces!.Keys);if(featureDict is not null)await File.WriteAllTextAsync(Path.Combine(dir,"system","surfaceFeaturesDict"),featureDict,token);}
            await File.WriteAllTextAsync(Path.Combine(dir,"system","controlDict"),"FoamFile { version 2.0; format ascii; class dictionary; object controlDict; }\napplication blockMesh; startFrom startTime; startTime 0; stopAt endTime; endTime 1; deltaT 1; writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 12; writeCompression off; timeFormat general; timePrecision 6; runTimeModifiable false;\n",token);
            // Embedded assets are the same sources used by the Linux CI fixture.
            var sourceDir=Path.Combine(dir,"native-quality-src");
            foreach(var asset in new[]{"foamlensMeshQuality.C","Make/files","Make/options"})
            {
                using var stream=typeof(NativeCartesianMesh).Assembly.GetManifestResourceStream("FoamLens.NativeQuality."+asset);
                if(stream is null)continue;
                var target=Path.Combine(sourceDir,asset);Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                using var file=File.Create(target);await stream.CopyToAsync(file,token);
            }
            var stagingInputs=await HashStagingInputs(dir,token);
            var stagingControlDict=await File.ReadAllTextAsync(Path.Combine(dir,"system","controlDict"),token);
            var expectedRegionInput=split?await File.ReadAllTextAsync(Path.Combine(dir,"expected-regions.txt"),token):null;
            var translated=await NativeCadSurfaceCheck.RunProcessAsync(wsl,dir,WslArgs(distribution,"wslpath","-a",dir),TimeSpan.FromSeconds(15),token);
            var linux=translated.Stdout.Trim();
            if(translated.ExitCode!=0 || !linux.StartsWith("/") || linux.Contains('\n') || linux.Contains('\r'))throw new NotSupportedException("WSL path mapping failed.");
            var run=await NativeCadSurfaceCheck.RunProcessAsync(wsl,dir,WslArgs(distribution,"/bin/bash","-lc",Script,"foamlens-blockmesh",linux,version,utility,split?"split":"single"),TimeSpan.FromSeconds(split?2600:snappy?1040:520),token);
            string Clean(string s)=>s.Replace(linux,"<temporary case>",StringComparison.Ordinal).Replace(dir,"<temporary case>",StringComparison.OrdinalIgnoreCase);
            async Task<string?> Small(string file,int limit)
            {
                var p=Path.Combine(dir,file);var info=new FileInfo(p);
                if(!info.Exists)return null;
                using var stream=new StreamReader(p);var buffer=new char[limit];int count=await stream.ReadBlockAsync(buffer.AsMemory(),token);
                return Clean(new string(buffer,0,count))+(stream.Peek()!=-1?"\n[truncated]":"");
            }
            // Determine quality from the complete bounded log, not the first
            // 48k characters returned for display. A truncated positive
            // marker can never certify the rest of the run.
            async Task<string> ReportedQuality(string file,int? exit)
            {
                if(exit is null)return "not-run";
                if(exit!=0)return "command-failed";
                var path=Path.Combine(dir,file);var info=new FileInfo(path);
                if(!info.Exists||info.Length>16*1024*1024||(info.Attributes&FileAttributes.ReparsePoint)!=0)return "undetermined";
                return QualityStatus(exit,await File.ReadAllTextAsync(path,token));
            }
            int? Exit(string name){var p=Path.Combine(dir,name);return File.Exists(p)&&new FileInfo(p).Length<32&&int.TryParse(File.ReadAllText(p),out var x)?x:null;}
            var bm=snappy?Exit("snappyHexMesh.exit"):Exit("generation.exit");var cm=Exit("checkMesh.exit");
            var detected=(await Small("detected-version.txt",128))?.Trim();
            var files=new Dictionary<string,string>();long total=0;string? exportError=null;
            // Defect sets are optional evidence, not a proof that no defects exist.
            // Keep them associated with the exact polyMesh snapshot and region.
            async Task<(Dictionary<string,string> Sets,string[] Warnings,long Bytes)> ReadSets(string mesh,long remaining)
            {
                var sets=new Dictionary<string,string>();var warnings=new List<string>();long bytes=0;
                var folder=Path.Combine(mesh,"sets");if(!Directory.Exists(folder))return(sets,warnings.ToArray(),bytes);
                if((File.GetAttributes(folder)&FileAttributes.ReparsePoint)!=0)return(sets,new[]{"Linked sets folder omitted."},bytes);
                foreach(var p in Directory.EnumerateFiles(folder).OrderBy(x=>x,StringComparer.Ordinal).Take(129))
                {
                    token.ThrowIfCancellationRequested();var info=new FileInfo(p);string name=info.Name;
                    if(sets.Count>=128){warnings.Add("Set count limit reached.");break;}
                    if(!System.Text.RegularExpressions.Regex.IsMatch(name,@"\A[A-Za-z_][A-Za-z0-9_]{0,127}\z")||(info.Attributes&FileAttributes.ReparsePoint)!=0||info.Length>Math.Min(8*1024*1024,remaining-bytes)){warnings.Add("Set omitted: "+name);continue;}
                    var data=await File.ReadAllTextAsync(p,token);var header=data.Substring(0,Math.Min(data.Length,2048));
                    if(data.Contains('\0')||!System.Text.RegularExpressions.Regex.IsMatch(header,@"\bformat\s+ascii\s*;")||!System.Text.RegularExpressions.Regex.IsMatch(header,@"\bclass\s+(faceSet|cellSet|pointSet)\s*;")){warnings.Add("Unsupported set: "+name);continue;}
                    sets[name]=data;bytes+=info.Length;
                }
                return(sets,warnings.ToArray(),bytes);
            }
            async Task<(Dictionary<string,string> Fields,string Status,long Bytes)> ReadVolumes(string? region,long remaining)
            {
                var fields=new Dictionary<string,string>();var log=region is null?"nativeVolumes":"nativeVolumes."+region;
                var exit=Exit(log+".exit");if(exit is null)return(fields,"not-run",0);if(exit!=0)return(fields,"command-failed",0);
                var folder=region is null?Path.Combine(dir,"0"):Path.Combine(dir,"0",region);
                if(!Directory.Exists(folder)||(File.GetAttributes(folder)&FileAttributes.ReparsePoint)!=0)return(fields,"missing-or-linked",0);
                var info=new FileInfo(Path.Combine(folder,"V"));
                if(!info.Exists||(info.Attributes&FileAttributes.ReparsePoint)!=0)return(fields,"missing-or-linked",0);
                if(info.Length>Math.Min(8*1024*1024,remaining))return(fields,"transfer-limit",0);
                var data=await File.ReadAllTextAsync(info.FullName,token);var header=data.Substring(0,Math.Min(data.Length,2048));
                if(data.Contains('\0')||!System.Text.RegularExpressions.Regex.IsMatch(header,@"\bformat\s+ascii\s*;")||!System.Text.RegularExpressions.Regex.IsMatch(header,@"\bclass\s+volScalarField\s*;")||!System.Text.RegularExpressions.Regex.IsMatch(header,@"\bobject\s+V\s*;"))return(fields,"unsupported-field",0);
                fields["V"]=data;return(fields,"captured",info.Length);
            }
            async Task<(Dictionary<string,string> Metrics,string Status,string? Manifest,long Bytes)> ReadQuality(string? region,long remaining)
            {
                var metrics=new Dictionary<string,string>();var log=region is null?"nativeQuality":"nativeQuality."+region;
                var exit=Exit(log+".exit");if(exit is null)return(metrics,"not-run",null,0);if(exit!=0)return(metrics,exit==127?"build-unavailable":"command-failed",null,0);
                var folder=Path.Combine(dir,log);
                if(!Directory.Exists(folder)||(File.GetAttributes(folder)&FileAttributes.ReparsePoint)!=0)return(metrics,"missing-or-linked",null,0);
                var manifest=new FileInfo(Path.Combine(folder,"complete.txt"));
                if(!manifest.Exists||manifest.Length>2048||(manifest.Attributes&FileAttributes.ReparsePoint)!=0)return(metrics,"incomplete",null,0);
                var receipt=await File.ReadAllTextAsync(manifest.FullName,token);
                long bytes=manifest.Length;
                foreach(var name in new[]{"nonOrthogonality","skewness","faceWeight","volumeRatio","faceArea","cellVolume"})
                {
                    var info=new FileInfo(Path.Combine(folder,name+".csv"));
                    if(!info.Exists||(info.Attributes&FileAttributes.ReparsePoint)!=0||info.Length>Math.Min(16*1024*1024,remaining-bytes))return(new(),"incomplete-or-transfer-limit",null,0);
                    var data=await File.ReadAllTextAsync(info.FullName,token);
                    if(data.Contains('\0')||!data.StartsWith("id,value\n",StringComparison.Ordinal))return(new(),"unsupported-metric",null,0);
                    metrics[name]=data;bytes+=info.Length;
                }
                return(metrics,"captured",receipt,bytes);
            }
            var nativeSets=new Dictionary<string,string>();string[] setWarnings=Array.Empty<string>();var nativeQualityFields=new Dictionary<string,string>();string nativeVolumeStatus="not-run";var nativeMetrics=new Dictionary<string,string>();string nativeMetricsStatus="not-run";string? nativeMetricsManifest=null;
            var splitExit=Exit("splitMeshRegions.exit");var regions=new Dictionary<string,object>();string? splitError=null;long splitBytes=0;
            if(split&&splitExit==0)
            {
                foreach(var (name,expectedCells) in expected)
                {
                    var regionDir=Path.Combine(dir,"constant",name);
                    var regionFiles=new Dictionary<string,string>();
                    if(!Directory.Exists(regionDir)||(File.GetAttributes(regionDir)&FileAttributes.ReparsePoint)!=0){splitError="Expected region absent or linked: "+name;break;}
                    var poly=Path.Combine(regionDir,"polyMesh");
                    if(!Directory.Exists(poly)||(File.GetAttributes(poly)&FileAttributes.ReparsePoint)!=0){splitError="Expected region mesh absent or linked: "+name;break;}
                    foreach(var file in MeshNames.Concat(new[]{"cellRegionAddressing","faceRegionAddressing","pointRegionAddressing","boundaryRegionAddressing"}))
                    {
                        var info=new FileInfo(Path.Combine(poly,file));
                        if(!info.Exists){if(Array.IndexOf(MeshNames,file) is >=0 and <5)splitError="Missing region mesh file: "+name+"/"+file;continue;}
                        if((info.Attributes&FileAttributes.ReparsePoint)!=0||info.Length>64*1024*1024-splitBytes){splitError="Region transfer exceeds 64 MiB or includes a link.";break;}
                        splitBytes+=info.Length;var data=await File.ReadAllTextAsync(info.FullName,token);
                        if(data.Contains('\0')||!System.Text.RegularExpressions.Regex.IsMatch(data.Substring(0,Math.Min(data.Length,2048)),@"\bformat\s+ascii\s*;")){splitError="Only ASCII region mesh output is supported.";break;}
                        regionFiles["constant/polyMesh/"+file]=data;
                    }
                    if(splitError!=null)break;
                    var captured=await ReadSets(poly,64*1024*1024-splitBytes);splitBytes+=captured.Bytes;
                    var regionLog=await Small("checkMesh."+name+".log",48000);var volumes=await ReadVolumes(name,64*1024*1024-splitBytes);splitBytes+=volumes.Bytes;var quality=await ReadQuality(name,64*1024*1024-splitBytes);splitBytes+=quality.Bytes;
                    regions[name]=new { expectedCells,checkMeshExit=Exit("checkMesh."+name+".exit"),qualityStatus=await ReportedQuality("checkMesh."+name+".log",Exit("checkMesh."+name+".exit")),checkMeshLog=regionLog,files=regionFiles,sets=captured.Sets,setWarnings=captured.Warnings,nativeQualityFields=volumes.Fields,nativeVolumeStatus=volumes.Status,nativeVolumeLog=await Small("nativeVolumes."+name+".log",12000),nativeMetrics=quality.Metrics,nativeMetricsStatus=quality.Status,nativeMetricsManifest=quality.Manifest,nativeMetricsLog=await Small("nativeQuality."+name+".log",12000) };
                }
                if(splitError!=null)regions.Clear();
                // Combined and separated meshes are different snapshots. Do not
                // duplicate a potentially large combined mesh in the same reply.
            }
            if(bm==0&&(!split||splitExit!=0))
            {
                var mesh=Path.Combine(dir,"constant","polyMesh");
                foreach(var name in MeshNames)
                {
                    var p=Path.Combine(mesh,name);var info=new FileInfo(p);
                    if(!info.Exists){if(Array.IndexOf(MeshNames,name)<5)exportError="Required native mesh file missing: "+name;continue;}
                    if((info.Attributes&FileAttributes.ReparsePoint)!=0 || info.Length>exportLimit-total){exportError="Native mesh exceeds bounded transfer limit or contains a link.";break;}
                    total+=info.Length;
                    var data=await File.ReadAllTextAsync(p,token);
                    if(data.Contains('\0') || !System.Text.RegularExpressions.Regex.IsMatch(data.Substring(0,Math.Min(data.Length,2048)),@"\bformat\s+ascii\s*;")){exportError="Only native ASCII mesh export is supported.";break;}
                    files["constant/polyMesh/"+name]=data;
                }
                if(exportError!=null)files.Clear();else{var captured=await ReadSets(mesh,exportLimit-total);nativeSets=captured.Sets;setWarnings=captured.Warnings;total+=captured.Bytes;var volumes=await ReadVolumes(null,exportLimit-total);nativeQualityFields=volumes.Fields;nativeVolumeStatus=volumes.Status;total+=volumes.Bytes;var quality=await ReadQuality(null,exportLimit-total);nativeMetrics=quality.Metrics;nativeMetricsStatus=quality.Status;nativeMetricsManifest=quality.Manifest;}
            }
            return new { schema=gmsh?"foamlens/native-gmsh-mesh/1":snappy?"foamlens/native-snappy-mesh/1":"foamlens/native-cartesian-mesh/1",version=detected,requestedVersion=version,distribution,commandPlan=commands,preflightTools=preflight.Tools,stagingInputs,stagingControlDict,expectedRegionInput,stagingIsolated=true,uniformBackgroundLevel=background.UniformLevel,originalBackgroundCells=background.OriginalCells,plannedCells=cells,generationUtility=utility,generationExit=bm,blockMeshExit=gmsh?(int?)null:snappy?Exit("blockMesh.exit"):bm,checkMeshExit=cm,qualityStatus=await ReportedQuality("checkMesh.log",cm),runnerExit=run.ExitCode,stdout=Clean(run.Stdout),stderr=Clean(run.Stderr),blockMeshLog=gmsh?null:await Small(snappy?"blockMesh.log":"generation.log",48000),snappyLog=snappy?await Small("generation.log",48000):null,surfaceCheckLog=snappy?await Small("surfaceCheck.log",48000):null,surfaceCheckExit=snappy?Exit("surfaceCheck.exit"):null,snappyDictionary=snappy?snappyInput.Dictionary:null,surfaceFeaturesDictionary=snappy?BuildSurfaceFeatures(root,snappyInput.Surfaces!.Keys):null,surfaceFeaturesExit=Exit("surfaceFeatures.exit"),surfaceFeaturesLog=await Small("surfaceFeatures.log",24000),gmshLog=gmsh?await Small("generation.log",48000):null,checkMeshLog=await Small("checkMesh.log",48000),splitRequested=split,splitExit,splitLog=await Small("splitMeshRegions.log",48000),splitError,regions,files,sets=nativeSets,setWarnings,nativeQualityFields,nativeVolumeStatus,nativeVolumeLog=await Small("nativeVolumes.log",12000),nativeMetrics,nativeMetricsStatus,nativeMetricsManifest,nativeMetricsLog=await Small("nativeQuality.log",12000),nativeQualityBuildLog=await Small("nativeQualityBuild.log",24000),exportError,dictionary=dict,originalCaseModified=false,meshGenerated=bm==0,qualityCertified=false,snappyDiagnosticOnly=snappy };
        }
        finally{try{Directory.Delete(dir,true);}catch(IOException){}catch(UnauthorizedAccessException){}}
    }
}
