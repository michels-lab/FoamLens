# FoamLens — Microsoft Store channel

This directory defines the Microsoft Store MSIX distribution channel for FoamLens.

## Partner Center identity

The values in `partner-center.json` were copied from the live FoamLens product identity in Microsoft Partner Center:

- Package/Identity/Name: `MichelDuarte.FoamLens`
- Package/Identity/Publisher: `CN=D2024BFC-8238-4063-A8DD-A91208327224`
- Package/Properties/PublisherDisplayName: `Michel Duarte`
- Store ID: `9P0PTHSQ89LL`

These values are public package identity metadata, not secrets. They must not be changed unless Partner Center itself changes the FoamLens product identity.

## Distribution boundary

The Store build is compiled from the same FoamLens Desktop source, with `FoamLensStoreChannel=true`. It disables the GitHub automatic/manual updater and leaves Store installation/updates to Microsoft. Direct GitHub Setup/Portable builds remain unchanged.

## Build and manual submission

Run **Build FoamLens Microsoft Store MSIX**. The artifact contains the versioned unsigned `.msix`, its SHA-256, and the rendered Store manifest.

Upload the MSIX to Partner Center product `9P0PTHSQ89LL` under the submission **Packages** section. Microsoft Store signs accepted Store packages. Do not distribute the unsigned CI MSIX directly.

Store certification/publication remain manual evidence until Partner Center actually accepts the submission.
