// Linux CI fixture runner: invokes the exact production shell program and
// dictionary builders, not a second handwritten mesh implementation.
// Windows/WSL transport is intentionally outside this test.
using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using FoamLensDesktop;

var output=Path.GetFullPath(args[0]);
var version=args[1];
if(version is not ("13" or "14"))throw new ArgumentException("version");
Directory.CreateDirectory(output);
var patches=new[]{"xMin","xMax","yMin","yMax","zMin","zMax"};
object Axis(double[] p,int[] n)=>new{points=p,counts=n,grading=n.Select(_=>1).ToArray()};
var axes=new[]{Axis(new[]{0.0,0.5,1.0},new[]{4,4}),Axis(new[]{0.0,1.0},new[]{8}),Axis(new[]{0.0,1.0},new[]{8})};
var zones=new[]{new{ijk=new[]{0,0,0},name="metal"},new{ijk=new[]{1,0,0},name="mold"}};
const string control="FoamFile { version 2.0; format ascii; class dictionary; object controlDict; }\napplication blockMesh; startFrom startTime; startTime 0; stopAt endTime; endTime 1; deltaT 1; writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 12; writeCompression off; timeFormat general; timePrecision 6; runTimeModifiable false;\n";
async Task<string> Run(string name, string utility, bool split, JsonElement input)
{
    var dir=Path.Combine(output,name);
    Directory.CreateDirectory(Path.Combine(dir,"system"));Directory.CreateDirectory(Path.Combine(dir,"constant"));
    File.WriteAllText(Path.Combine(dir,"system","controlDict"),control);
    if(utility=="gmshToFoam"){
        var groups=new Dictionary<string,long>();string msh=input.GetProperty("msh").GetString()!;
        NativeCartesianMesh.ValidateGmsh(msh,groups);File.WriteAllText(Path.Combine(dir,"source.msh"),msh);
        if(split)File.WriteAllLines(Path.Combine(dir,"expected-regions.txt"),groups.Keys);
    }else{
        var (dict,cells)=NativeCartesianMesh.Build(input);File.WriteAllText(Path.Combine(dir,"system","blockMeshDict"),dict);
        if(split)File.WriteAllLines(Path.Combine(dir,"expected-regions.txt"),NativeCartesianMesh.CartesianZones(input,cells).Keys);
        if(utility=="snappyHexMesh"){
            var (sd,stl)=NativeCartesianMesh.BuildSnappy(input,cells);Directory.CreateDirectory(Path.Combine(dir,"constant","geometry"));
            File.WriteAllText(Path.Combine(dir,"system","snappyHexMeshDict"),sd);
            foreach(var (file,data) in stl)File.WriteAllBytes(Path.Combine(dir,"constant","geometry",file),data);
        }
    }
    var run=await NativeCadSurfaceCheck.RunProcessAsync("/bin/bash",dir,new[]{"-c",NativeCartesianMesh.Script,"foamlens-mesh-ci",dir,version,utility,split?"split":"single"},TimeSpan.FromMinutes(10),CancellationToken.None);
    File.WriteAllText(Path.Combine(dir,"runner.log"),run.Stdout+"\n"+run.Stderr);
    if(run.ExitCode!=0)throw new InvalidOperationException(name+": native runner exit "+run.ExitCode+"\n"+run.Stderr);
    if(File.ReadAllText(Path.Combine(dir,"detected-version.txt")).Trim()!=version)throw new InvalidOperationException("Version mismatch");
    void ExitOk(string file){if(File.ReadAllText(Path.Combine(dir,file)).Trim()!="0")throw new InvalidOperationException(name+": "+file);}
    ExitOk("generation.exit");ExitOk("checkMesh.exit");
    if(split)ExitOk("splitMeshRegions.exit");
    return dir;
}
int Cells(string dir,string? region=null)
{
    var path=region is null?Path.Combine(dir,"constant","polyMesh"):Path.Combine(dir,"constant",region,"polyMesh");
    foreach(var file in new[]{"points","faces","owner","neighbour","boundary"})if(!File.Exists(Path.Combine(path,file)))throw new InvalidOperationException("Missing native "+path+"/"+file);
    string s=File.ReadAllText(Path.Combine(path,"owner"));
    s=Regex.Replace(s,@"/\*[\s\S]*?\*/|//[^\r\n]*","");
    int header=s.IndexOf('}');if(header<0)throw new InvalidOperationException("Missing owner header");
    var m=Regex.Match(s[(header+1)..],@"^\s*(\d+)\s*\(([\s\S]*?)\)\s*;?\s*$");
    if(!m.Success)throw new InvalidOperationException("Unexpected owner list");
    var ids=Regex.Matches(m.Groups[2].Value,@"\d+").Cast<Match>().Select(x=>int.Parse(x.Value,CultureInfo.InvariantCulture)).ToArray();
    if(ids.Length!=int.Parse(m.Groups[1].Value,CultureInfo.InvariantCulture)||ids.Length==0)throw new InvalidOperationException("Owner count mismatch");
    return ids.Max()+1;
}
void CheckLog(string dir,string file)
{
    string log=File.ReadAllText(Path.Combine(dir,file));
    if(!log.Contains("Mesh OK.",StringComparison.Ordinal)||log.Contains("Failed ",StringComparison.Ordinal))throw new InvalidOperationException("Mesh quality check did not report Mesh OK: "+file);
}
var cart=await Run("cartesian","blockMesh",true,JsonSerializer.SerializeToElement(new{axes,patches,zones}));
foreach(var region in new[]{"metal","mold"}){
    if(Cells(cart,region)!=256)throw new InvalidOperationException("Wrong split Cartesian region cell count");
    CheckLog(cart,"checkMesh."+region+".log");
}
const string msh="""
$MeshFormat
2.2 0 8
$EndMeshFormat
$PhysicalNames
3
2 1 "fl_2_201"
3 2 "fl_3_101"
3 3 "fl_3_102"
$EndPhysicalNames
$Nodes
12
1 0 0 0
2 1 0 0
3 1 1 0
4 0 1 0
5 0 0 1
6 1 0 1
7 1 1 1
8 0 1 1
9 2 0 0
10 2 1 0
11 2 0 1
12 2 1 1
$EndNodes
$Elements
3
1 5 2 2 1 1 2 3 4 5 6 7 8
2 5 2 3 2 2 9 10 3 6 11 12 7
3 3 2 1 3 2 3 7 6
$EndElements
""";
var gmsh=await Run("gmsh","gmshToFoam",true,JsonSerializer.SerializeToElement(new{msh=msh.Replace("\r\n","\n")}));
foreach(var region in new[]{"fl_3_101","fl_3_102"}){
    if(Cells(gmsh,region)!=1)throw new InvalidOperationException("Wrong Gmsh split region cell count");
    CheckLog(gmsh,"checkMesh."+region+".log");
}
// Closed outward-wound cube inside background, retained external point
// deliberately not on a background cell face.
var v=new float[][]{new[]{.25f,.25f,.25f},new[]{.75f,.25f,.25f},new[]{.75f,.75f,.25f},new[]{.25f,.75f,.25f},new[]{.25f,.25f,.75f},new[]{.75f,.25f,.75f},new[]{.75f,.75f,.75f},new[]{.25f,.75f,.75f}};
int[][] faces={new[]{0,3,2,1},new[]{4,5,6,7},new[]{0,1,5,4},new[]{1,2,6,5},new[]{2,3,7,6},new[]{3,0,4,7}};
using var stream=new MemoryStream();using(var bw=new BinaryWriter(stream,Encoding.ASCII,true)){
    bw.Write(new byte[80]);bw.Write((uint)12);
    foreach(var face in faces)foreach(var t in new[]{new[]{face[0],face[1],face[2]},new[]{face[0],face[2],face[3]}}){
        var a=v[t[0]];var b=v[t[1]];var c=v[t[2]];
        float[] u={b[0]-a[0],b[1]-a[1],b[2]-a[2]},w={c[0]-a[0],c[1]-a[1],c[2]-a[2]};
        float[] normal={u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]};
        var len=MathF.Sqrt(normal.Sum(x=>x*x));foreach(var x in normal)bw.Write(x/len);
        foreach(var i in t)foreach(var x in v[i])bw.Write(x);bw.Write((ushort)0);
    }
}
var snappy=await Run("snappy","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,stlBase64=Convert.ToBase64String(stream.ToArray())}}));
var snappyCells=Cells(snappy);if(snappyCells<=0||snappyCells==512)throw new InvalidOperationException("Snappy did not produce a different mesh");
CheckLog(snappy,"checkMesh.log");
byte[] SmallCube(float offset)
{
    var data=stream.ToArray();
    for(int i=0;i<12;i++)for(int j=0;j<9;j++){
        var at=data.AsSpan(84+50*i+12+4*j,4);
        float original=System.Buffers.Binary.BinaryPrimitives.ReadSingleLittleEndian(at);
        System.Buffers.Binary.BinaryPrimitives.WriteSingleLittleEndian(at,original*.5f+offset);
    }
    return data;
}
var multi=await Run("snappy-multi","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,surfaces=new[]{new{stlBase64=Convert.ToBase64String(SmallCube(.125f))},new{stlBase64=Convert.ToBase64String(SmallCube(.5f))}}}}));
var multiCells=Cells(multi);if(multiCells<=0||multiCells==512)throw new InvalidOperationException("Multi-surface snappy did not produce a different mesh");
CheckLog(multi,"checkMesh.log");
var boundary=File.ReadAllText(Path.Combine(multi,"constant","polyMesh","boundary"));
if(!boundary.Contains("flSurface_001")||!boundary.Contains("flSurface_002"))throw new InvalidOperationException("Both distinct CAD surface patches must be represented");

File.WriteAllText(Path.Combine(output,"summary.json"),JsonSerializer.Serialize(new{version,cartesian=new{metal=256,mold=256},gmsh=new{metal=1,mold=1},snappyCells,multiCells,engine="actual Foundation CLI",windowsWslTransportVerified=false},new JsonSerializerOptions{WriteIndented=true}));
Console.WriteLine("Actual OpenFOAM "+version+" mesh workflow PASS");
