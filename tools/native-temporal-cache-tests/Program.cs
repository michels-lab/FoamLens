using FoamLensDesktop;

// Compile the exact production cache implementation without WebView2.
// Any scientific integrity failure aborts the process with a nonzero exit code.
await NativeTemporalCache.RunSelfTestAsync();
await NativeCaseCatalog.RunSelfTestAsync();
