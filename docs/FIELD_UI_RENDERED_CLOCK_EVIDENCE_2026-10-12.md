# Field Workspace — actual packaged clock readout evidence

Owner requested continued interface validation; no redesign. The real native Windows WebView2 QuickCup smoke already captures Field/Data UI at 1140×820 and 640×900 for both installed Setup and Portable. It now also asserts that the visible Field timeline `fwTimeReadout` and accessible range value equal the physical time of the **actually loaded primary OpenFOAM frame**.

The check compares real Field descriptor time with active transport and visible `t = ... s` content, as well as actual screen-space readout dimensions. A selected timeline tick alone is not sufficient. Both screenshot sizes must pass; a regression in one fails Windows CI.

This is rendered UI functional evidence; owner visual review after a release remains separate. No new themes, typography, layout, product icon, release or case data are changed.

The real UI smoke reads the module-owned physical clock via its new read-only `timeController.current()` API. The function is not assumed global; the displayed and accessible time must correspond to the actual loaded OpenFOAM frame.
