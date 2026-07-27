# Golf Ball Studio V2

A clean Vite + Three.js rebuild using the uploaded golf-ball meshes as the foundation.

## What is fixed

- No procedural golf-ball sphere is created.
- No silent fallback is used.
- The detailed imported mesh is the default.
- Model loading errors show the exact JavaScript error.
- The active triangle and vertex counts are visible.
- Rendering, model loading, materials, lighting, UI, decals, animation, and export are separated into modules.
- The project uses local npm dependencies rather than a fragile browser import map.

## Included imported assets

- `public/assets/models/uploaded-ball-detailed.glb`
- `public/assets/models/uploaded-ball-performance.glb`
- New-ball PBR textures
- Lightly-used PBR textures

## Run locally

Install Node.js, then open a terminal inside this folder:

```bash
npm install
npm run dev
```

Vite will print a local address, commonly:

```text
http://localhost:5173/
```

## Build for GitHub Pages

```bash
npm install
npm run build
```

Upload the contents of the generated `dist` folder to GitHub Pages, or configure GitHub Actions to build it automatically.

## Recommended GitHub deployment

The included Vite configuration uses `base: './'`, allowing the generated build to work inside a normal GitHub Pages repository subfolder.

## Next milestone

The next version should implement:

1. Front decal projection
2. Rear decal projection
3. 180-degree alignment stripe
4. Procedural floor textures
5. Rolling animations
6. PNG and WebM export
