using System.IO.Compression;
using System.Text;
using FoamLensDesktop;

var tests = new (string Name, Action Execute)[]
{
    ("official module loads in deterministic original Windows order", () =>
    {
        var actual = Read(("v2-beta.js", "second"), ("v1-alpha.js", "first"), ("index.html", "unrelated"));
        Check(actual.SequenceEqual(new[]{"first","second"}), "Unexpected original extension order");
    }),
    ("unknown leftover local JS is never opened", () =>
    {
        var root = Path.Combine(Path.GetTempPath(), "g34-synthetic-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            File.WriteAllText(Path.Combine(root,"v99-unbundled.js"),"DO_NOT_EXECUTE_FROM_LOCAL_FILE");
            var actual=Read(("v1-alpha.js","trusted-one"));
            Check(actual.SequenceEqual(new[]{"trusted-one"}), "Local unbundled source accidentally loaded");
        }
        finally { Directory.Delete(root,true); }
    }),
    ("case-colliding ZIP entries rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-ALPHA.js","first"),("V1-alpha.js","second")))),
    ("duplicate exact ZIP entries rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-a.js","first"),("v1-a.js","second")))),
    ("relative traversal rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-safe.js","ok"),("../v99-dirty.js","bad")))),
    ("absolute ZIP path rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-safe.js","ok"),("/v99-evil.js","bad")))),
    ("Windows ZIP backslash rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-safe.js","ok"),(@"sub\v99-evil.js","bad")))),
    ("ZIP ADS colon rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-safe.js","ok"),("asset:x","bad")))),
    ("ZIP malformed UTF8 JS rejected", () =>
        Expect<DecoderFallbackException>(() => ReadBytes(("v1-good.js",new byte[]{0xFF,0xFE,0xFF})))),
    ("empty original extension bundle rejected", () =>
        Expect<InvalidDataException>(() => Read(("index.html","only HTML")))),
    ("oversized original extension rejected", () =>
        Expect<InvalidDataException>(() => Read(("v1-big.js",new string('X',8*1024*1024+1))))),
    ("subdirectory JS never executed as top-level extension", () =>
    {
        var actual=Read(("v1-core.js","REAL"),("assets/v99-fake.js","FAKE"));
        Check(actual.SequenceEqual(new[]{"REAL"}),"Nested unexpected module executed");
    }),
    ("official actual unicode JS preserved", () =>
    {
        var actual=Read(("v1-core.js","const c='solido γ µm';"));
        Check(actual[0].Contains("γ µm"),"Scientific Unicode not preserved");
    }),
    ("real UTF-8 BOM ignored exactly once", () =>
    {
        var actual=ReadBytes(("v1-core.js",new byte[]{0xEF,0xBB,0xBF,(byte)'o',(byte)'k'}));
        Check(actual[0]=="ok","Unexpected BOM in injected scripts");
    }),
    ("no source JS read from disk or network", () =>
    {
        var source=File.ReadAllText(
          Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../desktop/src/FoamLensDesktop/TrustedEmbeddedFrontendExtensions.cs")));
        Check(!source.Contains("Directory.GetFiles") && !source.Contains("File.ReadAllText") &&
              !source.Contains("HttpClient") && source.Contains("GetManifestResourceStream"),
              "Not purely executable-embedded source");
    })
};
var passed=0;
foreach(var (name,run) in tests)
{
    try {run(); Console.WriteLine("G34 PASS "+name); passed++;}
    catch(Exception e){Console.Error.WriteLine("G34 FAIL "+name+": "+e);return 1;}
}
Console.WriteLine($"G34 complete: {passed}/{tests.Length} trusted-source negative regressions passed.");
return passed==tests.Length?0:1;

static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
static void Expect<T>(Action act)where T:Exception
{
    try {act();}
    catch(T){return;}
    throw new Exception("Expected fail-closed "+typeof(T).Name);
}
static string[] Read(params (string Name,string Source)[] entries)=>
    ReadBytes(entries.Select(e=>(e.Name,Encoding.UTF8.GetBytes(e.Source))).ToArray());
static string[] ReadBytes(params (string Name,byte[] Bytes)[] entries)
{
    using var memory=new MemoryStream();
    using(var zip=new ZipArchive(memory,ZipArchiveMode.Create,true))
        foreach(var entry in entries)
        {
            var member=zip.CreateEntry(entry.Name);
            using var output=member.Open();
            output.Write(entry.Bytes);
        }
    memory.Position=0;
    return TrustedEmbeddedFrontendExtensions.ReadFromPackage(memory);
}
