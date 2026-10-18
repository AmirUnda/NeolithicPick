# Neolithic Pick

A data-driven Three.js scholarly viewer for a Neolithic deer-antler pick associated
with Rijckholt / Sint Geertruid.

The project revisits a photogrammetric model created in 2022 and explores how a
digitised cultural-heritage object can be presented with transparent provenance,
spatial annotation, accessible interaction, and reusable metadata.

## Viewer features

- Six evidence-labelled spatial annotations with shareable deep links
- Source-derived and editorial placements recorded separately
- Keyboard-accessible annotation list and complete non-visual descriptions
- Explicit provenance gaps rather than inferred catalogue data
- Reduced-motion camera navigation and responsive layouts
- Locally bundled glTF assets with a 4096 px WebP delivery texture

## Development

Prerequisites:

- Node.js 22 or newer
- pnpm 11

Install dependencies and start the local development server:

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm check
pnpm build
```

While the development server is running, append
`?simulate-model-error` to the local URL to verify the model-load failure state.

The heritage record and annotation copy live in `src/heritage-data.ts`. All
source positions, camera poses, evidence references, confidence labels, and
editorial placement notes are reviewable there. The three Sketchfab hotspot
vectors remain untouched beside their transformed local-export coordinates, so
the export-root adjustment is auditable.

Unresolved source material is kept out of the browser bundle. The assessment of
the creator-supplied Centre Céramique photographs is recorded in
`research/dijkman-source-note.md`.

## Technology

- [Three.js](https://threejs.org/) for real-time 3D rendering
- [Vite](https://vite.dev/) for local development and production builds
- TypeScript for explicit interfaces and maintainable viewer code

## Licence

The 3D model is published under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) by Centre Céramique
Maastricht and is credited in the interface. Source-code licensing remains to be
chosen before a public software release.
