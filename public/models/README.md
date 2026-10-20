# Model assets

`antler_pick/` contains the original Sketchfab glTF geometry and a
browser-delivery texture derivative. Its `license.txt` records the source,
author, attribution wording, and CC BY 4.0 licence.

Current delivery asset:

- 35,433 vertices
- 67,998 triangles
- One material and one base-colour texture
- No animation or compressed-geometry extensions

The viewer references `material0_baseColor-4096.webp`, a 4096 × 4096 WebP
derivative generated from the retained 8192 × 8192 JPEG source. The source is
stored at
`research/source-assets/antler_pick/material0_baseColor-8192.jpeg`, outside
Vite's `public/` directory, so it remains available for provenance without being
copied into the production site. The derivative is approximately 1.0 MB rather
than 12.2 MB and uses WebP quality 84. It is a delivery optimization only; no
interpretive image editing was applied.

Large intermediate photogrammetry files and source captures should not be added
to the web repository. Preserve them in the project archive.
