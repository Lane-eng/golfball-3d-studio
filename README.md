# Golf Ball 3D Studio — Starter MVP

This is a browser-based starter version of the proposed golf-ball visualization and video studio.

## Included in this first version

- Interactive 3D golf ball
- Four generic blank ball presets
- Procedural dimple appearance
- Front artwork upload
- Rear artwork upload
- 180° stripe with color, width, and optional text
- Ball color and finish controls
- Background controls
- Lighting presets and manual light intensity controls
- Floor and shadow toggle
- Camera lens and distance controls
- Front, rear, and isometric camera shortcuts
- Animation presets:
  - Turntable
  - Front reveal
  - Rear reveal
  - Front → stripe → rear
  - Left-to-right roll
  - Right-to-left roll
  - Roll toward camera
  - S-curve roll
- Aspect ratios:
  - 9:16
  - 16:9
  - 1:1
  - 4:5
  - 3:2
- PNG still export
- WebM animation recording
- 1080p, 1440p, and 4K export sizing
- 24, 30, and 60 fps recording options

## Important limitations

This starter uses generic procedural golf-ball models. It does **not** claim exact branded dimple geometry.

The front and rear print-zone sizes currently use temporary normalized defaults. Replace the values in `PRINT_ZONE_CONFIG` inside `app.js` with the exact production measurements.

Browser video recording is WebM. You may convert WebM to MP4 after export, or add a server-side rendering pipeline later.

## Running locally

Because the project uses JavaScript modules, run it from a local web server instead of double-clicking `index.html`.

### Easy option with Python

Open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## GitHub Pages

Upload these files to a GitHub repository:

- `index.html`
- `styles.css`
- `app.js`

Then enable GitHub Pages under:

`Repository Settings → Pages → Deploy from branch → main / root`

## Recommended next development steps

1. Replace temporary print dimensions with exact front and rear production dimensions.
2. Replace procedural generic dimples with an accurate `.glb` blank-ball model.
3. Add verified branded `.glb` models one at a time.
4. Improve artwork projection using true decal geometry instead of only UV texture placement.
5. Add editable front/rear layer stacks from the existing 2D app.
6. Add floor materials and image/video backgrounds.
7. Add a path editor and timeline.
8. Add higher-quality transparent rendering and MP4 output.

## Dimple geometry correction

The current version uses physically displaced sphere vertices for recessed dimples. It no longer uses the earlier procedural normal-map texture that stretched and produced oversized dents.


## Surface system added in this version

The Studio panel now includes these procedural rolling surfaces:

- White studio
- Grass
- Putting green
- Wood
- Glass
- Brick
- Concrete
- Marble
- Sand
- Black acrylic
- Carpet
- Brushed metal
- Rubber mat
- Transparent / no floor

Each preset adjusts:

- Visible procedural texture
- Roughness and reflections
- Surface bump/relief
- Rolling resistance
- Rolling animation bumpiness
- Special behavior such as sand sinking and brick rhythm

The surface textures are generated in the browser, so there are no extra image files to upload.


## Realistic golf-ball assets

This build includes three locally hosted GLB meshes with physically recessed, rounded dimples and spherical UV coordinates:

- `assets/models/blank-ball-high.glb`
- `assets/models/blank-ball-medium.glb`
- `assets/models/blank-ball-mobile.glb`

It also includes a fine molded-cover normal map, a roughness map, and a local HDR studio environment. Upload the entire `assets` folder to GitHub along with the four main files. The models are generic and unbranded.


## Imported user-supplied golf-ball assets

This build integrates the meshes and textures supplied by the project owner.

### Model options

- Imported detailed hero ball: 43,388 vertices / 84,000 triangles
- Imported performance ball: 109,848 vertices / 54,924 triangles
- Previous generated models remain available as fallbacks

### Cover options

- Clean neutral cover
- Supplied new-ball PBR texture set
- Supplied lightly-used PBR texture set

The cover base color is composited underneath front art, rear art, and the alignment stripe. Normal, roughness, and height maps continue to control the molded surface appearance.


## Real-mesh V2 correction

This version fixes the startup bug that previously loaded `blankStandard` even though the imported
hero model was selected in the interface.

Important behavior:

- The imported detailed mesh is now the true startup model.
- The initial Three.js sphere has been removed.
- There is no silent procedural fallback.
- If an imported GLB is missing, the preview reports a visible model-load failure.
- The interface displays the name and triangle count of the mesh actually being rendered.
- Original imported UVs and authored normals are preserved.
- Clean-cover micro-normal strength is reduced so it does not make the dimples look inflated.
- Dark product lighting is the default so shallow dimple rims remain visible.
