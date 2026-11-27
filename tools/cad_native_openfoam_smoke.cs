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
var suite=args.Length>2?args[2]:"all";
if(suite is not ("all" or "core" or "snappy"))throw new ArgumentException("Invalid suite");
if(version is not ("13" or "14"))throw new ArgumentException("version");
Directory.CreateDirectory(output);
if(suite!="snappy"){
    var probe=await NativeCadSurfaceCheck.RunProcessAsync("/bin/bash",output,new[]{"-lc",NativeCartesianMesh.ProbeScript(),"foamlens-wsl-probe","unused",version},TimeSpan.FromSeconds(30),CancellationToken.None);
    File.WriteAllText(Path.Combine(output,"environment-preflight.log"),probe.Stdout+"\n"+probe.Stderr);
    var parsed=NativeCartesianMesh.ParsePreflight(probe,version);
    NativeCartesianMesh.RequireTools(parsed,"blockMesh",true);NativeCartesianMesh.RequireTools(parsed,"gmshToFoam",true);NativeCartesianMesh.RequireTools(parsed,"surfaceCheck");
    if(Directory.Exists(Path.Combine(output,"constant"))||Directory.Exists(Path.Combine(output,"system")))throw new InvalidOperationException("Preflight wrote case staging directories.");
    Console.WriteLine("PASS native Foundation environment preflight "+version);
}
var patches=new[]{"xMin","xMax","yMin","yMax","zMin","zMax"};
object Axis(double[] p,int[] n)=>new{points=p,counts=n,grading=n.Select(_=>1).ToArray()};
var axes=new[]{Axis(new[]{0.0,0.5,1.0},new[]{4,4}),Axis(new[]{0.0,1.0},new[]{8}),Axis(new[]{0.0,1.0},new[]{8})};
var zones=new[]{new{ijk=new[]{0,0,0},name="metal"},new{ijk=new[]{1,0,0},name="mold"}};
const string control="FoamFile { version 2.0; format ascii; class dictionary; object controlDict; }\napplication blockMesh; startFrom startTime; startTime 0; stopAt endTime; endTime 1; deltaT 1; writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 12; writeCompression off; timeFormat general; timePrecision 6; runTimeModifiable false;\n";
async Task<string> Run(string name, string utility, bool split, JsonElement input)
{
    var background=utility=="snappyHexMesh"?NativeCartesianMesh.PrepareSnappyBackground(input):(Input:input,UniformLevel:(int?)null,OriginalCells:(long?)null);
    input=background.Input;
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
            var featureDict=NativeCartesianMesh.BuildSurfaceFeatures(input,stl.Keys);if(featureDict is not null)File.WriteAllText(Path.Combine(dir,"system","surfaceFeaturesDict"),featureDict);
        }
    }
    var source=Path.GetFullPath(Path.Combine(output,"..","tools","native-quality"));
    var staged=Path.Combine(dir,"native-quality-src");
    foreach(var asset in new[]{"foamlensMeshQuality.C","Make/files","Make/options"}){var target=Path.Combine(staged,asset);Directory.CreateDirectory(Path.GetDirectoryName(target)!);File.Copy(Path.Combine(source,asset),target,true);}
    var run=await NativeCadSurfaceCheck.RunProcessAsync("/bin/bash",dir,new[]{"-c",NativeCartesianMesh.Script,"foamlens-mesh-ci",dir,version,utility,split?"split":"single"},TimeSpan.FromMinutes(30),CancellationToken.None);
    File.WriteAllText(Path.Combine(dir,"runner.log"),run.Stdout+"\n"+run.Stderr);
    if(run.ExitCode!=0){
        foreach(var log in Directory.EnumerateFiles(dir,"*.log").OrderBy(x=>x)){
            var lines=File.ReadLines(log).TakeLast(100);
            Console.Error.WriteLine("=== "+name+"/"+Path.GetFileName(log)+" ===\n"+string.Join("\n",lines));
        }
        throw new InvalidOperationException(name+": native runner exit "+run.ExitCode+"\n"+run.Stderr);
    }
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
    if(!m.Success){
        var uniform=Regex.Match(s[(header+1)..],@"^\s*(\d+)\s*\{\s*(\d+)\s*\}\s*;?\s*$");
        if(!uniform.Success||int.Parse(uniform.Groups[1].Value,CultureInfo.InvariantCulture)<=0)throw new InvalidOperationException("Unexpected owner list: "+s[(header+1)..].Trim()[..Math.Min(120,s[(header+1)..].Trim().Length)]);
        return checked(int.Parse(uniform.Groups[2].Value,CultureInfo.InvariantCulture)+1);
    }
    var ids=Regex.Matches(m.Groups[2].Value,@"\d+").Cast<Match>().Select(x=>int.Parse(x.Value,CultureInfo.InvariantCulture)).ToArray();
    if(ids.Length!=int.Parse(m.Groups[1].Value,CultureInfo.InvariantCulture)||ids.Length==0)throw new InvalidOperationException("Owner count mismatch");
    return ids.Max()+1;
}
void CheckLog(string dir,string file)
{
    string log=File.ReadAllText(Path.Combine(dir,file));
    var exitPath=Path.Combine(dir,Path.ChangeExtension(file,".exit"));
    int? code=File.Exists(exitPath)&&int.TryParse(File.ReadAllText(exitPath).Trim(),out var parsed)?parsed:null;
    if(NativeCartesianMesh.QualityStatus(code,log)!="mesh-ok-reported"||log.Contains("Failed ",StringComparison.Ordinal)){
        Console.Error.WriteLine("=== quality evidence "+dir+"/"+file+" ===\n"+log);
        throw new InvalidOperationException("Mesh quality check did not report Mesh OK: "+file);
    }
}
var outcomes=new Dictionary<string,object>();
async Task Scenario(string name,Func<Task<object>> action){try{outcomes[name]=new{passed=true,evidence=await action()};Console.WriteLine("PASS "+name);}catch(Exception e){outcomes[name]=new{passed=false,error=e.Message};Console.Error.WriteLine("FAIL "+name+": "+e);}}
if(suite!="snappy")await Scenario("cartesian",async()=>{
var cart=await Run("cartesian","blockMesh",true,JsonSerializer.SerializeToElement(new{axes,patches,zones}));
foreach(var region in new[]{"metal","mold"}){
    if(Cells(cart,region)!=256)throw new InvalidOperationException("Wrong split Cartesian region cell count");
    CheckLog(cart,"checkMesh."+region+".log");
    var q=Path.Combine(cart,"nativeQuality."+region);
    var qualityExit=Path.Combine(cart,"nativeQuality."+region+".exit");
    if(!File.Exists(qualityExit)||File.ReadAllText(qualityExit).Trim()!="0"){
        foreach(var logName in new[]{"nativeQualityBuild.log","nativeQuality."+region+".log"}){
            var logPath=Path.Combine(cart,logName);
            if(File.Exists(logPath))Console.Error.WriteLine("=== "+logName+" ===\n"+string.Join("\n",File.ReadLines(logPath).TakeLast(150)));
        }
        throw new InvalidOperationException("Native quality extractor failed in "+region);
    }
    var manifest=File.ReadAllText(Path.Combine(q,"complete.txt"));
    if(!manifest.Contains("region="+region+"\n")||!manifest.Contains("cells=256\n"))throw new InvalidOperationException("Native quality region mismatch");
    var vols=File.ReadLines(Path.Combine(q,"cellVolume.csv")).Skip(1).Select(l=>double.Parse(l.Split(',')[1],CultureInfo.InvariantCulture)).ToArray();
    if(vols.Length!=256||vols.Any(v=>Math.Abs(v-1.0/512)>1e-12))throw new InvalidOperationException("Native cell volume analytical gate");
    var angles=File.ReadLines(Path.Combine(q,"nonOrthogonality.csv")).Skip(1).Select(l=>double.Parse(l.Split(',')[1],CultureInfo.InvariantCulture)).ToArray();
    if(angles.Length==0||angles.Any(v=>Math.Abs(v)>1e-5))throw new InvalidOperationException("Native orthogonality analytical gate");
}
return new{metal=256,mold=256};});
// Each region is 2×2×2 HEX8 cells with internal neighbours in all
// three axes. A one-cell region is underdetermined by checkMesh, even
// when its volume and geometric shape are perfect.
string ConformalGmsh()
{
    int Node(int x,int y,int z)=>1+x+5*(y+3*z);
    var nodes=new List<string>();
    for(int z=0;z<=2;z++)for(int y=0;y<=2;y++)for(int x=0;x<=4;x++)
        nodes.Add($"{Node(x,y,z)} {x} {y} {z}");
    var elements=new List<string>();int id=0;
    for(int z=0;z<2;z++)for(int y=0;y<2;y++)for(int x=0;x<4;x++){
        int group=x<2?2:3;
        int[] v={Node(x,y,z),Node(x+1,y,z),Node(x+1,y+1,z),Node(x,y+1,z),Node(x,y,z+1),Node(x+1,y,z+1),Node(x+1,y+1,z+1),Node(x,y+1,z+1)};
        elements.Add($"{++id} 5 2 {group} {group} "+string.Join(" ",v));
    }
    for(int z=0;z<2;z++)for(int y=0;y<2;y++){
        int[] v={Node(2,y,z),Node(2,y+1,z),Node(2,y+1,z+1),Node(2,y,z+1)};
        elements.Add($"{++id} 3 2 1 1 "+string.Join(" ",v));
    }
    return string.Join("\n",new[]{"$MeshFormat","2.2 0 8","$EndMeshFormat","$PhysicalNames","3","2 1 \"fl_2_201\"","3 2 \"fl_3_101\"","3 3 \"fl_3_102\"","$EndPhysicalNames","$Nodes",nodes.Count.ToString(CultureInfo.InvariantCulture)}
        .Concat(nodes).Concat(new[]{"$EndNodes","$Elements",elements.Count.ToString(CultureInfo.InvariantCulture)}).Concat(elements).Concat(new[]{"$EndElements",""}));
}
if(suite!="snappy")await Scenario("gmsh",async()=>{
var gmsh=await Run("gmsh","gmshToFoam",true,JsonSerializer.SerializeToElement(new{msh=ConformalGmsh()}));
foreach(var region in new[]{"fl_3_101","fl_3_102"}){
    if(Cells(gmsh,region)!=8)throw new InvalidOperationException("Wrong Gmsh split region cell count");
    CheckLog(gmsh,"checkMesh."+region+".log");
}
return new{metal=8,mold=8};});
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
// A separate aligned, level-zero castellated control isolates cell
// selection from refinement transitions and surface snapping. The three
// existing strict snapped mesh scenarios below remain unchanged.
if(suite!="core")await Scenario("snappy-aligned-control",async()=>{
    var dir=await Run("snappy-aligned-control","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=0,maxLevel=0,maxCells=20000,snapEnabled=false,transitionLayers=2,stlBase64=Convert.ToBase64String(stream.ToArray())}}));
    int cells=Cells(dir);if(cells!=448)throw new InvalidOperationException("Aligned castellated control expected 448 external cells, got "+cells);
    CheckLog(dir,"checkMesh.log");
    return new{cells,quality="Mesh OK",snap=false,refinement=0};
});
// Strict alternate path: same level-one near-surface cell size but
// uniformly refined background, no octree transition. Original strict
// cases remain in the suite; an alternate pass cannot hide their failure.
if(suite!="core")await Scenario("snappy-uniform-background",async()=>{
    var cfg=JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,uniformBackground=true,snapEnabled=false,stlBase64=Convert.ToBase64String(stream.ToArray())}});
    var prepared=NativeCartesianMesh.PrepareSnappyBackground(cfg);
    if(prepared.UniformLevel!=1||prepared.OriginalCells!=512||NativeCartesianMesh.Build(prepared.Input).Cells!=4096)throw new InvalidOperationException("Uniform background accounting failed");
    var dir=await Run("snappy-uniform-background","snappyHexMesh",false,cfg);
    int cells=Cells(dir);if(cells!=3584)throw new InvalidOperationException("Expected 3584 aligned external cells, got "+cells);
    CheckLog(dir,"checkMesh.log");
    return new{cells,backgroundCells=4096,originalBackgroundCells=512,localRefinement=0,quality="Mesh OK",snap=false};
});
// Repeat the original refinement with snapping disabled. This diagnostic
// must produce a valid mesh snapshot and a determinate quality report;
// its mesh-quality status is separate from the strict snapped scenarios.
if(suite!="core")await Scenario("snappy-refinement-diagnostic",async()=>{
    var dir=await Run("snappy-refinement-diagnostic","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,snapEnabled=false,transitionLayers=3,stlBase64=Convert.ToBase64String(stream.ToArray())}}));
    int cells=Cells(dir);if(cells<=0||cells==512)throw new InvalidOperationException("Castellated refinement diagnostic did not change mesh");
    string log=File.ReadAllText(Path.Combine(dir,"checkMesh.log"));string quality=NativeCartesianMesh.QualityStatus(0,log);
    if(quality is not ("mesh-ok-reported" or "checks-failed"))throw new InvalidOperationException("Missing determinate quality evidence");
    if(quality=="checks-failed"&&!Directory.Exists(Path.Combine(dir,"constant","polyMesh","sets")))throw new InvalidOperationException("Expected native defect sets for rejected mesh");
    Console.WriteLine("Diagnostic quality: "+quality);
    return new{cells,quality,snap=false,transitionLayers=3,qualityCertified=false};
});
if(suite!="core")await Scenario("snappy-explicit-recovery",async()=>{
    var dir=await Run("snappy-explicit-recovery","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,explicitFeatures=true,transitionLayers=3,stlBase64=Convert.ToBase64String(stream.ToArray())}}));
    if(File.ReadAllText(Path.Combine(dir,"surfaceFeatures.exit")).Trim()!="0")throw new InvalidOperationException("Explicit feature extraction failed");
    int cells=Cells(dir);if(cells<=0||cells==512)throw new InvalidOperationException("Explicit recovery did not create a mesh");
    string log=File.ReadAllText(Path.Combine(dir,"checkMesh.log"));string quality=NativeCartesianMesh.QualityStatus(0,log);
    if(quality is not ("mesh-ok-reported" or "checks-failed"))throw new InvalidOperationException("Missing determinate explicit recovery quality");
    Console.WriteLine("Explicit feature recovery quality: "+quality);
    return new{cells,quality,qualityCertified=false};
});
if(suite!="core")await Scenario("snappy",async()=>{
var snappy=await Run("snappy","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,stlBase64=Convert.ToBase64String(stream.ToArray())}}));
var snappyCells=Cells(snappy);if(snappyCells<=0||snappyCells==512)throw new InvalidOperationException("Snappy did not produce a different mesh");
CheckLog(snappy,"checkMesh.log");
return new{cells=snappyCells};});
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
// Separate experimental alternatives with actual snapping on non-aligned geometry.
 // The original strict local refinement scenarios remain mandatory and unchanged.
 // Non-aligned surfaces use the same fixture shape at a shifted scale.
foreach(bool explicitFeatures in new[]{false,true}){
 if(suite=="core")break;
 string scenario=explicitFeatures?"snappy-uniform-unaligned-explicit":"snappy-uniform-unaligned-implicit";
 await Scenario(scenario,async()=>{
  var shifted=SmallCube(.143f);
  var cfg=JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,uniformBackground=true,snapEnabled=true,explicitFeatures,transitionLayers=3,stlBase64=Convert.ToBase64String(shifted)}});
  var prepared=NativeCartesianMesh.PrepareSnappyBackground(cfg);
  if(prepared.UniformLevel!=1||prepared.OriginalCells!=512||NativeCartesianMesh.Build(prepared.Input).Cells!=4096)throw new InvalidOperationException("Uniform snapped background accounting failed");
  var dir=await Run(scenario,"snappyHexMesh",false,cfg);int cells=Cells(dir);
  if(cells<=0||cells>=4096)throw new InvalidOperationException("Expected retained subset of uniform background");
  string log=File.ReadAllText(Path.Combine(dir,"checkMesh.log"));string quality=NativeCartesianMesh.QualityStatus(0,log);
  if(quality is not ("mesh-ok-reported" or "checks-failed"))throw new InvalidOperationException("Missing native quality evidence");
  if(explicitFeatures&&File.ReadAllText(Path.Combine(dir,"surfaceFeatures.exit")).Trim()!="0")throw new InvalidOperationException("Explicit feature extraction failed");
  Console.WriteLine(scenario+" quality: "+quality);
  return new{cells,quality,snap=true,explicitFeatures,backgroundCells=4096,originalBackgroundCells=512,localRefinement=0,qualityCertified=false};
 });
}
// Independent uniform alternatives: preserve both named surfaces and optional
// layer requests; record actual quality, never substitute for strict local gates.
foreach(bool withLayers in new[]{false,true}){
 if(suite=="core")break;
 string scenario=withLayers?"snappy-uniform-multi-layers":"snappy-uniform-multi-explicit";
 await Scenario(scenario,async()=>{
  var surfaceSettings=withLayers?new[]{new{id=1,minLevel=1,maxLevel=1,layers=1},new{id=2,minLevel=1,maxLevel=1,layers=1}}:new[]{new{id=1,minLevel=1,maxLevel=1,layers=1}}.Take(0).ToArray();
  var cfg=JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,uniformBackground=true,snapEnabled=true,explicitFeatures=true,transitionLayers=3,surfaces=new[]{new{stlBase64=Convert.ToBase64String(SmallCube(.143f))},new{stlBase64=Convert.ToBase64String(SmallCube(.49f))}},surfaceSettings,layerSettings=new{expansionRatio=1.2,finalLayerThickness=.25,minThickness=.1}}});
  var prepared=NativeCartesianMesh.PrepareSnappyBackground(cfg);
  var (dict,surfaces)=NativeCartesianMesh.BuildSnappy(prepared.Input,4096);
  if(surfaces.Count!=2||!dict.Contains("level (0 0)")||(withLayers&&!dict.Contains("nSurfaceLayers 1;")))throw new InvalidOperationException("Uniform multi-surface transform mismatch");
  var dir=await Run(scenario,"snappyHexMesh",false,cfg);int cells=Cells(dir);
  var boundary=File.ReadAllText(Path.Combine(dir,"constant","polyMesh","boundary"));
  if(cells<=0||!boundary.Contains("flSurface_001")||!boundary.Contains("flSurface_002"))throw new InvalidOperationException("Uniform surface identities lost");
  var quality=NativeCartesianMesh.QualityStatus(0,File.ReadAllText(Path.Combine(dir,"checkMesh.log")));
  if(quality is not ("mesh-ok-reported" or "checks-failed"))throw new InvalidOperationException("Missing native quality evidence");
  Console.WriteLine(scenario+" quality: "+quality);
  var finalLayers=withLayers?NativeCartesianMesh.FinalLayerEvidence(0,File.ReadAllText(Path.Combine(dir,"generation.log")),NativeCartesianMesh.RequestedSurfaceLayers(prepared.Input)):null;
  if(withLayers){
   if(finalLayers is null)throw new InvalidOperationException("Final native layer table missing or ambiguous");
   Console.WriteLine(scenario+" final native layers: "+JsonSerializer.Serialize(finalLayers));
  }
  return new{cells,quality,surfaces=2,withLayers,finalLayers,layerCoverageCertified=false,qualityCertified=false};
 });
}
// Controlled recovery experiments: same surfaces/retained point and strict
// quality thresholds, vary thickness or background resolution, never the gate.
foreach(var attempt in new[]{(Name:"thicker-050",Level:1,Thickness:.50,Cap:20000),(Name:"thicker-065",Level:1,Thickness:.65,Cap:20000),(Name:"finer-L2",Level:2,Thickness:.25,Cap:100000)}){
 if(suite=="core")break;
 string scenario="snappy-layer-recovery-"+attempt.Name;
 await Scenario(scenario,async()=>{
  var surfaceSettings=new[]{new{id=1,minLevel=attempt.Level,maxLevel=attempt.Level,layers=1},new{id=2,minLevel=attempt.Level,maxLevel=attempt.Level,layers=1}};
  var cfg=JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=attempt.Level,maxLevel=attempt.Level,maxCells=attempt.Cap,uniformBackground=true,snapEnabled=true,explicitFeatures=true,transitionLayers=3,surfaces=new[]{new{stlBase64=Convert.ToBase64String(SmallCube(.143f))},new{stlBase64=Convert.ToBase64String(SmallCube(.49f))}},surfaceSettings,layerSettings=new{expansionRatio=1.2,finalLayerThickness=attempt.Thickness,minThickness=.1}}});
  var prepared=NativeCartesianMesh.PrepareSnappyBackground(cfg);
  long backgroundCells=NativeCartesianMesh.Build(prepared.Input).Cells;
  var (dict,surfaces)=NativeCartesianMesh.BuildSnappy(prepared.Input,backgroundCells);
  if(surfaces.Count!=2||!dict.Contains("minFaceWeight 0.05;")||!dict.Contains("maxConcave 80;")||!dict.Contains("nSurfaceLayers 1;"))throw new InvalidOperationException("Recovery changed strict controls");
  var dir=await Run(scenario,"snappyHexMesh",false,cfg);
  int cells=Cells(dir);
  var boundary=File.ReadAllText(Path.Combine(dir,"constant","polyMesh","boundary"));
  if(cells<=0||!boundary.Contains("flSurface_001")||!boundary.Contains("flSurface_002"))throw new InvalidOperationException("Recovery surface identities lost");
  var quality=NativeCartesianMesh.QualityStatus(0,File.ReadAllText(Path.Combine(dir,"checkMesh.log")));
  if(quality is not ("mesh-ok-reported" or "checks-failed"))throw new InvalidOperationException("Missing native quality evidence");
  string generationLog=File.ReadAllText(Path.Combine(dir,"generation.log"));
  var finalLayers=NativeCartesianMesh.FinalLayerEvidence(0,generationLog,NativeCartesianMesh.RequestedSurfaceLayers(prepared.Input));
  if(finalLayers is null)throw new InvalidOperationException("Missing final recovery layer evidence");
  var peakLowWeightFaces=NativeCartesianMesh.LayerPeakLowWeightFaces(0,generationLog);
  bool positiveOnBoth=finalLayers.Values.All(v=>v.AverageLayers>0);
  bool recoveryObserved=positiveOnBoth&&quality=="mesh-ok-reported";
  var evidence=new{cells,backgroundCells,quality,attempt.Level,attempt.Thickness,finalLayers,peakLowWeightFaces,positiveOnBoth,recoveryObserved,layerCoverageCertified=false,qualityCertified=false};
  Console.WriteLine(scenario+" evidence: "+JsonSerializer.Serialize(evidence));
  return evidence;
 });
}
if(suite!="core")await Scenario("snappy-multi",async()=>{
var multi=await Run("snappy-multi","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,surfaces=new[]{new{stlBase64=Convert.ToBase64String(SmallCube(.125f))},new{stlBase64=Convert.ToBase64String(SmallCube(.5f))}}}}));
var multiCells=Cells(multi);if(multiCells<=0||multiCells==512)throw new InvalidOperationException("Multi-surface snappy did not produce a different mesh");
CheckLog(multi,"checkMesh.log");
var boundary=File.ReadAllText(Path.Combine(multi,"constant","polyMesh","boundary"));
if(!boundary.Contains("flSurface_001")||!boundary.Contains("flSurface_002"))throw new InvalidOperationException("Both distinct CAD surface patches must be represented");
return new{cells=multiCells,surfaces=2};});

if(suite!="core")await Scenario("snappy-advanced",async()=>{
var advanced=await Run("snappy-advanced","snappyHexMesh",false,JsonSerializer.SerializeToElement(new{axes,patches,zones=Array.Empty<object>(),snappy=new{inside=new[]{.11,.11,.11},minLevel=1,maxLevel=1,maxCells=20000,stlBase64=Convert.ToBase64String(stream.ToArray()),boxes=new[]{new{min=new[]{.05,.05,.05},max=new[]{.23,.23,.23},level=2}},surfaceSettings=new[]{new{id=1,minLevel=1,maxLevel=2,layers=1}},layerSettings=new{expansionRatio=1.2,finalLayerThickness=.25,minThickness=.1}}}));
var advancedCells=Cells(advanced);if(advancedCells<=0||advancedCells==512)throw new InvalidOperationException("Advanced snappy did not produce a different mesh");
CheckLog(advanced,"checkMesh.log");
// Record native layer diagnostics verbatim. A requested layer is not an
// acceptance claim; actual extrusion coverage needs its own evidence.
var advancedLog=File.ReadAllText(Path.Combine(advanced,"generation.log"));
if(!advancedLog.Contains("layer",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Layer stage diagnostics unavailable");
return new{cells=advancedCells,layerCoverageCertified=false};});
File.WriteAllText(Path.Combine(output,"summary.json"),JsonSerializer.Serialize(new{version,suite,scenarios=outcomes,engine="actual Foundation CLI",windowsWslTransportVerified=false},new JsonSerializerOptions{WriteIndented=true}));
var failed=outcomes.Where(x=>!(bool)x.Value.GetType().GetProperty("passed")!.GetValue(x.Value)!).Select(x=>x.Key).ToArray();
if(failed.Length>0)throw new InvalidOperationException("Actual Foundation "+version+" failed scenarios: "+string.Join(", ",failed));
Console.WriteLine("Actual OpenFOAM "+version+" "+suite+" mesh workflow PASS");
