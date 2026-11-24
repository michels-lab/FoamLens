using System.Globalization;
using System.Text;
using System.Text.Json;

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

    internal static void SelfTest()
    {
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

    // Fixed program; positional args are only the host-owned temp path and an allowlisted version.
    private const string Script = """
        set -e
        version="$2"
        if [ "${WM_PROJECT_VERSION:-}" != "$version" ]; then
          for profile in "/opt/openfoam$version/etc/bashrc" "/usr/lib/openfoam/openfoam$version/etc/bashrc" "$HOME/OpenFOAM/OpenFOAM-$version/etc/bashrc"; do
            if [ -r "$profile" ]; then . "$profile" >/dev/null 2>&1 || true; fi
            if [ "${WM_PROJECT_VERSION:-}" = "$version" ]; then break; fi
          done
        fi
        if [ "${WM_PROJECT:-}" != OpenFOAM ] || [ "${WM_PROJECT_VERSION:-}" != "$version" ]; then echo 'Requested Foundation OpenFOAM environment unavailable' >&2; exit 127; fi
        if [ "$3" = gmshToFoam ]; then command -v gmshToFoam >/dev/null; else command -v blockMesh >/dev/null; fi
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
        if [ "$code" -ne 0 ]; then exit "$code"; fi
        timeout --kill-after=5s 90s checkMesh -case "$1" > checkMesh.log 2>&1
        code=$?
        printf '%s\n' "$code" > checkMesh.exit
        if [ "$code" -ne 0 ] || [ "$4" != split ]; then exit "$code"; fi
        if ! command -v splitMeshRegions >/dev/null; then echo 'splitMeshRegions unavailable' >&2; exit 127; fi
        timeout --kill-after=5s 120s splitMeshRegions -case "$1" -cellZonesOnly > splitMeshRegions.log 2>&1
        code=$?
        printf '%s\n' "$code" > splitMeshRegions.exit
        if [ "$code" -ne 0 ]; then exit "$code"; fi
        while IFS= read -r region; do
          if [ ! -d "constant/$region/polyMesh" ]; then echo "Expected region missing: $region" >&2; exit 3; fi
          timeout --kill-after=5s 60s checkMesh -case "$1" -region "$region" > "checkMesh.$region.log" 2>&1
          code=$?
          printf '%s\n' "$code" > "checkMesh.$region.exit"
        done < expected-regions.txt
        exit 0
        """;
    internal static async Task<object> RunAsync(JsonElement root, CancellationToken token, bool gmsh = false)
    {
        var version=root.GetProperty("version").GetString();
        if(version is not ("13" or "14"))throw new ArgumentException("Select Foundation OpenFOAM 13 or 14.");
        string? msh=gmsh?root.GetProperty("msh").GetString():null;
        if(gmsh&&msh is null)throw new ArgumentException("Canonical MSH missing.");
        bool split=root.TryGetProperty("splitRegions",out var splitNode)&&splitNode.GetBoolean();
        var expected=new Dictionary<string,long>(StringComparer.Ordinal);
        var (dict,cells)=gmsh?("",ValidateGmsh(msh!,split?expected:null)):Build(root);
        if(split){if(gmsh)ValidateSplit(expected,cells);else expected=CartesianZones(root,cells);}
        string utility=gmsh?"gmshToFoam":"blockMesh";
        long exportLimit=gmsh?48*1024*1024:MaxOutput;
        var wsl=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"wsl.exe");
        if(!File.Exists(wsl))throw new NotSupportedException("WSL is unavailable.");
        var dir=Path.Combine(Path.GetTempPath(),"foamlens-blockmesh-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(dir,"system"));Directory.CreateDirectory(Path.Combine(dir,"constant"));
        try
        {
            if(split)await File.WriteAllTextAsync(Path.Combine(dir,"expected-regions.txt"),string.Join("\n",expected.Keys)+"\n",token);
            if(gmsh)await File.WriteAllTextAsync(Path.Combine(dir,"source.msh"),msh!,token);
            else await File.WriteAllTextAsync(Path.Combine(dir,"system","blockMeshDict"),dict,token);
            await File.WriteAllTextAsync(Path.Combine(dir,"system","controlDict"),"FoamFile { version 2.0; format ascii; class dictionary; object controlDict; }\napplication blockMesh; startFrom startTime; startTime 0; stopAt endTime; endTime 1; deltaT 1; writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 12; writeCompression off; timeFormat general; timePrecision 6; runTimeModifiable false;\n",token);
            var translated=await NativeCadSurfaceCheck.RunProcessAsync(wsl,dir,new[]{"--exec","wslpath","-a",dir},TimeSpan.FromSeconds(15),token);
            var linux=translated.Stdout.Trim();
            if(translated.ExitCode!=0 || !linux.StartsWith("/") || linux.Contains('\n') || linux.Contains('\r'))throw new NotSupportedException("WSL path mapping failed.");
            var run=await NativeCadSurfaceCheck.RunProcessAsync(wsl,dir,new[]{"--exec","/bin/bash","-lc",Script,"foamlens-blockmesh",linux,version,utility,split?"split":"single"},TimeSpan.FromSeconds(split?1100:205),token);
            string Clean(string s)=>s.Replace(linux,"<temporary case>",StringComparison.Ordinal).Replace(dir,"<temporary case>",StringComparison.OrdinalIgnoreCase);
            async Task<string?> Small(string file,int limit)
            {
                var p=Path.Combine(dir,file);var info=new FileInfo(p);
                if(!info.Exists)return null;
                using var stream=new StreamReader(p);var buffer=new char[limit];int count=await stream.ReadBlockAsync(buffer.AsMemory(),token);
                return Clean(new string(buffer,0,count))+(stream.Peek()!=-1?"\n[truncated]":"");
            }
            int? Exit(string name){var p=Path.Combine(dir,name);return File.Exists(p)&&new FileInfo(p).Length<32&&int.TryParse(File.ReadAllText(p),out var x)?x:null;}
            var bm=Exit("generation.exit");var cm=Exit("checkMesh.exit");
            var detected=(await Small("detected-version.txt",128))?.Trim();
            var files=new Dictionary<string,string>();long total=0;string? exportError=null;
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
                    regions[name]=new { expectedCells,checkMeshExit=Exit("checkMesh."+name+".exit"),checkMeshLog=await Small("checkMesh."+name+".log",48000),files=regionFiles };
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
                if(exportError!=null)files.Clear();
            }
            return new { schema=gmsh?"foamlens/native-gmsh-mesh/1":"foamlens/native-cartesian-mesh/1",version=detected,plannedCells=cells,generationUtility=utility,generationExit=bm,blockMeshExit=gmsh?(int?)null:bm,checkMeshExit=cm,runnerExit=run.ExitCode,stdout=Clean(run.Stdout),stderr=Clean(run.Stderr),blockMeshLog=gmsh?null:await Small("generation.log",48000),gmshLog=gmsh?await Small("generation.log",48000):null,checkMeshLog=await Small("checkMesh.log",48000),splitRequested=split,splitExit,splitLog=await Small("splitMeshRegions.log",48000),splitError,regions,files,exportError,dictionary=dict,originalCaseModified=false,meshGenerated=bm==0,qualityCertified=false };
        }
        finally{try{Directory.Delete(dir,true);}catch(IOException){}catch(UnauthorizedAccessException){}}
    }
}
