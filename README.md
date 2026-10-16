# Neolithic Pick

An experimental Three.js scholarly viewer for an Early Bronze Age antler pick.

The project revisits a photogrammetric model created in 2022 and explores how a
digitised cultural-heritage object can be presented with transparent provenance,
spatial annotation, accessible interaction, and reusable metadata.

## Project status

The viewer foundation is in place. The optimised GLB model, object metadata, and
scholarly annotations will be added in subsequent iterations.

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

## Planned workflow

1. Export and optimise the original photogrammetric model as GLB.
2. Record provenance, capture, processing, licence, and object metadata.
3. Add evidence-linked spatial annotations and interpretive uncertainty.
4. Test keyboard, touch, reduced-motion, and small-screen interactions.
5. Measure loading and rendering performance on representative devices.

## Technology

- [Three.js](https://threejs.org/) for real-time 3D rendering
- [Vite](https://vite.dev/) for local development and production builds
- TypeScript for explicit interfaces and maintainable viewer code

## Licence

Source-code licensing and reuse terms will be documented before the first
public release. Rights and attribution for the digitised object and its imagery
will be recorded separately from the software licence.
