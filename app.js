
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const canvas = document.getElementById('stage');
const stageWrap = document.getElementById('stageWrap');
const statusEl = document.getElementById('status');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
} catch (error) {
  console.error(error);
  statusEl.textContent = 'WebGL could not start';
  stageWrap.innerHTML = `<div class="preview-error"><strong>3D preview could not start.</strong><span>${error?.message || 'Your browser or graphics settings blocked WebGL.'}</span></div>`;
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0.4, 4.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const ballGroup = new THREE.Group();
scene.add(ballGroup);

const textureCanvas = document.createElement('canvas');
textureCanvas.width = 2048;
textureCanvas.height = 1024;
const textureCtx = textureCanvas.getContext('2d');
const personalizationTexture = new THREE.CanvasTexture(textureCanvas);
personalizationTexture.colorSpace = THREE.SRGBColorSpace;
personalizationTexture.wrapS = THREE.RepeatWrapping;
personalizationTexture.anisotropy = 8;

const state = {
  frontImage: null,
  rearImage: null,
  frontEnabled: true,
  rearEnabled: true,
  stripeEnabled: true,
  stripeColor: '#111111',
  stripeWidth: 8,
  stripeText: '',
  autoRotate: true,
  animationPlaying: false,
  animationStart: 0,
  animationDuration: 6,
  animationPreset: 'turntable',
  backgroundType: 'solid',
  backgroundColor: '#d9d9d9',
  backgroundColor2: '#777777',
  floorEnabled: true,
  ballModel: 'uploadedDetailed',
  coverPreset: 'clean',
  finish: 'satin',
  ballColor: '#ffffff',
  surfacePreset: 'whiteStudio',
  surfaceScale: 6,
  surfaceRoughness: 0.72,
  surfaceReflection: 0.08,
  surfaceBump: 0.02,
  rollingResistance: 0.12,
  rollBumpiness: 0
};

// Replace these temporary defaults with the user's exact production measurements.
// Values are normalized to the ball's UV map.
const PRINT_ZONE_CONFIG = {
  front: { centerU: 0.25, centerV: 0.50, widthU: 0.17, heightV: 0.34 },
  rear:  { centerU: 0.75, centerV: 0.50, widthU: 0.17, heightV: 0.34 },
  stripe: { startU: 0.25, lengthU: 0.50, centerV: 0.50 }
};

let ballGeometry = null;
const ballMaterial = new THREE.MeshPhysicalMaterial({
  color: state.ballColor,
  roughness: 0.38,
  metalness: 0,
  clearcoat: 0.2,
  clearcoatRoughness: 0.35,
  map: personalizationTexture
});

const textureLoader = new THREE.TextureLoader();
const microNormalTexture = textureLoader.load('assets/textures/ball-micro-normal.png');
microNormalTexture.wrapS = microNormalTexture.wrapT = THREE.RepeatWrapping;
microNormalTexture.repeat.set(7, 4);
const ballRoughnessTexture = textureLoader.load('assets/textures/ball-roughness.png');
ballRoughnessTexture.wrapS = ballRoughnessTexture.wrapT = THREE.RepeatWrapping;
ballRoughnessTexture.repeat.set(6, 3);
ballMaterial.normalMap = microNormalTexture;
ballMaterial.normalScale.set(0.10, 0.10);
ballMaterial.roughnessMap = ballRoughnessTexture;
ballMaterial.envMapIntensity = 1.25;

const coverAssets = {
  newPbr: {
    base: 'assets/textures/covers/new-basecolor.png',
    normal: 'assets/textures/covers/new-normal.png',
    roughness: 'assets/textures/covers/new-roughness.png',
    height: 'assets/textures/covers/new-height.png'
  },
  usedPbr: {
    base: 'assets/textures/covers/used-basecolor.png',
    normal: 'assets/textures/covers/used-normal.png',
    roughness: 'assets/textures/covers/used-roughness.png',
    height: 'assets/textures/covers/used-height.png'
  }
};
const loadedCoverTextures = new Map();
let coverBaseImage = null;

function loadImageAsset(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = path;
  });
}

async function loadCoverSet(name) {
  if (name === 'clean') {
    coverBaseImage = null;
    ballMaterial.normalMap = microNormalTexture;
    ballMaterial.roughnessMap = ballRoughnessTexture;
    ballMaterial.bumpMap = null;
    ballMaterial.normalScale.set(.10, .10);
    updatePersonalizationTexture();
    ballMaterial.needsUpdate = true;
    setStatus('Clean neutral cover ready.');
    return;
  }

  if (!loadedCoverTextures.has(name)) {
    const paths = coverAssets[name];
    const [baseImage, normal, roughness, height] = await Promise.all([
      loadImageAsset(paths.base),
      textureLoader.loadAsync(paths.normal),
      textureLoader.loadAsync(paths.roughness),
      textureLoader.loadAsync(paths.height)
    ]);
    normal.colorSpace = THREE.NoColorSpace;
    roughness.colorSpace = THREE.NoColorSpace;
    height.colorSpace = THREE.NoColorSpace;
    loadedCoverTextures.set(name, { baseImage, normal, roughness, height });
  }

  const set = loadedCoverTextures.get(name);
  coverBaseImage = set.baseImage;
  ballMaterial.normalMap = set.normal;
  ballMaterial.roughnessMap = set.roughness;
  ballMaterial.bumpMap = set.height;
  ballMaterial.bumpScale = name === 'usedPbr' ? .025 : .012;
  ballMaterial.normalScale.set(name === 'usedPbr' ? .42 : .28, name === 'usedPbr' ? .42 : .28);
  updatePersonalizationTexture();
  ballMaterial.needsUpdate = true;
  setStatus(name === 'usedPbr' ? 'Lightly-used PBR cover ready.' : 'New-ball PBR cover ready.');
}

async function applyCoverPreset(name) {
  state.coverPreset = name;
  try {
    await loadCoverSet(name);
  } catch (error) {
    console.error(error);
    state.coverPreset = 'clean';
    document.getElementById('coverPreset').value = 'clean';
    await loadCoverSet('clean');
    setStatus('Cover texture failed to load; using clean neutral cover.');
  }
}

const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
ball.rotation.y = -Math.PI / 2;
ballGroup.add(ball);

const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floorMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf0f0f0,
  roughness: 0.72,
  metalness: 0.02,
  clearcoat: 0,
  clearcoatRoughness: 0.5,
  transparent: false,
  opacity: 1,
  side: THREE.DoubleSide
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.04;
floor.receiveShadow = true;

scene.add(floor);

const surfaceTextureCanvas = document.createElement('canvas');
surfaceTextureCanvas.width = 1024;
surfaceTextureCanvas.height = 1024;
const surfaceTextureCtx = surfaceTextureCanvas.getContext('2d', { willReadFrequently: true });
const surfaceTexture = new THREE.CanvasTexture(surfaceTextureCanvas);
surfaceTexture.colorSpace = THREE.SRGBColorSpace;
surfaceTexture.wrapS = THREE.RepeatWrapping;
surfaceTexture.wrapT = THREE.RepeatWrapping;
surfaceTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const surfaceBumpCanvas = document.createElement('canvas');
surfaceBumpCanvas.width = 1024;
surfaceBumpCanvas.height = 1024;
const surfaceBumpCtx = surfaceBumpCanvas.getContext('2d', { willReadFrequently: true });
const surfaceBumpTexture = new THREE.CanvasTexture(surfaceBumpCanvas);
surfaceBumpTexture.wrapS = THREE.RepeatWrapping;
surfaceBumpTexture.wrapT = THREE.RepeatWrapping;
surfaceBumpTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

floorMaterial.map = surfaceTexture;
floorMaterial.bumpMap = surfaceBumpTexture;

const SURFACE_PRESETS = {
  whiteStudio: {
    label: 'White studio',
    description: 'Smooth studio floor · low rolling resistance',
    colors: ['#f1f1f1', '#d9d9d9'],
    roughness: .72, reflection: .08, bump: .015, resistance: .12, bumpiness: 0,
    scale: 6, type: 'studio'
  },
  grass: {
    label: 'Grass',
    description: 'Long grass fibers · high resistance and visible wobble',
    colors: ['#214b22', '#5e8738'],
    roughness: .98, reflection: .01, bump: .10, resistance: .72, bumpiness: .09,
    scale: 10, type: 'grass'
  },
  puttingGreen: {
    label: 'Putting green',
    description: 'Short-cut turf · realistic moderate slowdown',
    colors: ['#356f37', '#78a64d'],
    roughness: .93, reflection: .015, bump: .045, resistance: .34, bumpiness: .018,
    scale: 12, type: 'puttingGreen'
  },
  wood: {
    label: 'Wood',
    description: 'Finished wood · medium friction and soft reflection',
    colors: ['#6d3f22', '#c18a52'],
    roughness: .48, reflection: .25, bump: .035, resistance: .22, bumpiness: .008,
    scale: 5, type: 'wood'
  },
  glass: {
    label: 'Glass',
    description: 'Clear reflective glass · very low rolling resistance',
    colors: ['#c7e2e6', '#eaf7f8'],
    roughness: .06, reflection: .92, bump: 0, resistance: .025, bumpiness: 0,
    scale: 4, type: 'glass'
  },
  brick: {
    label: 'Brick',
    description: 'Brick joints · medium-high resistance and rhythmic bumps',
    colors: ['#703226', '#b65b43'],
    roughness: .90, reflection: .015, bump: .11, resistance: .50, bumpiness: .105,
    scale: 4, type: 'brick'
  },
  concrete: {
    label: 'Concrete',
    description: 'Fine concrete aggregate · moderate resistance',
    colors: ['#777777', '#b0b0b0'],
    roughness: .88, reflection: .025, bump: .055, resistance: .38, bumpiness: .028,
    scale: 7, type: 'concrete'
  },
  marble: {
    label: 'Marble',
    description: 'Polished marble · low friction and strong highlights',
    colors: ['#dad7d0', '#f8f5ed'],
    roughness: .20, reflection: .58, bump: .012, resistance: .09, bumpiness: .002,
    scale: 3, type: 'marble'
  },
  sand: {
    label: 'Sand',
    description: 'Loose sand · heavy slowdown with subtle sinking motion',
    colors: ['#b78e55', '#e4c58f'],
    roughness: 1, reflection: 0, bump: .12, resistance: .88, bumpiness: .07,
    scale: 13, type: 'sand'
  },
  blackAcrylic: {
    label: 'Black acrylic',
    description: 'Glossy black acrylic · long roll and mirrored highlights',
    colors: ['#050505', '#181818'],
    roughness: .10, reflection: .84, bump: 0, resistance: .055, bumpiness: 0,
    scale: 4, type: 'acrylic'
  },
  carpet: {
    label: 'Carpet',
    description: 'Dense carpet fibers · strong resistance and soft wobble',
    colors: ['#33363b', '#676b73'],
    roughness: 1, reflection: 0, bump: .095, resistance: .80, bumpiness: .065,
    scale: 14, type: 'carpet'
  },
  metal: {
    label: 'Brushed metal',
    description: 'Brushed metal · low resistance with directional highlights',
    colors: ['#666b70', '#c4c9ce'],
    roughness: .28, reflection: .72, bump: .018, resistance: .08, bumpiness: .002,
    scale: 6, type: 'metal'
  },
  rubber: {
    label: 'Rubber mat',
    description: 'Textured rubber · medium-high grip and tiny surface vibration',
    colors: ['#151515', '#3b3b3b'],
    roughness: .96, reflection: .01, bump: .075, resistance: .58, bumpiness: .035,
    scale: 9, type: 'rubber'
  },
  transparent: {
    label: 'Transparent',
    description: 'No visible floor · ball appears suspended',
    colors: ['#ffffff', '#ffffff'],
    roughness: .5, reflection: 0, bump: 0, resistance: .1, bumpiness: 0,
    scale: 4, type: 'transparent'
  }
};

function seededNoise(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(ca.r + (cb.r - ca.r) * t)},${Math.round(ca.g + (cb.g - ca.g) * t)},${Math.round(ca.b + (cb.b - ca.b) * t)})`;
}

function clearSurfaceCanvases(baseColor = '#888888', bumpValue = 128) {
  surfaceTextureCtx.fillStyle = baseColor;
  surfaceTextureCtx.fillRect(0, 0, 1024, 1024);
  surfaceBumpCtx.fillStyle = `rgb(${bumpValue},${bumpValue},${bumpValue})`;
  surfaceBumpCtx.fillRect(0, 0, 1024, 1024);
}

function drawSurfaceTexture(preset) {
  const ctx = surfaceTextureCtx;
  const bump = surfaceBumpCtx;
  const rand = seededNoise([...preset.type].reduce((a, c) => a + c.charCodeAt(0), 17));
  const [dark, light] = preset.colors;
  clearSurfaceCanvases(mixColor(dark, light, .5), 128);

  if (preset.type === 'studio' || preset.type === 'acrylic' || preset.type === 'glass') {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, light);
    gradient.addColorStop(.55, mixColor(dark, light, .65));
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  if (preset.type === 'grass' || preset.type === 'puttingGreen' || preset.type === 'carpet') {
    ctx.fillStyle = mixColor(dark, light, .35);
    ctx.fillRect(0, 0, 1024, 1024);
    const fibers = preset.type === 'puttingGreen' ? 10000 : 17000;
    for (let i = 0; i < fibers; i++) {
      const x = rand() * 1024;
      const y = rand() * 1024;
      const len = preset.type === 'puttingGreen' ? 2 + rand() * 5 : 5 + rand() * 13;
      ctx.strokeStyle = mixColor(dark, light, .15 + rand() * .8);
      ctx.globalAlpha = .25 + rand() * .65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - .5) * 3, y - len);
      ctx.stroke();

      const v = Math.round(105 + rand() * 90);
      bump.strokeStyle = `rgb(${v},${v},${v})`;
      bump.beginPath();
      bump.moveTo(x, y);
      bump.lineTo(x, y - len);
      bump.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (preset.type === 'wood') {
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 170) {
      ctx.fillStyle = mixColor(dark, light, .2 + rand() * .5);
      ctx.fillRect(0, y, 1024, 5);
      bump.fillStyle = 'rgb(70,70,70)';
      bump.fillRect(0, y, 1024, 4);
    }
    for (let i = 0; i < 170; i++) {
      const y = rand() * 1024;
      ctx.strokeStyle = mixColor(dark, light, rand());
      ctx.globalAlpha = .18 + rand() * .35;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * .018 + rand() * 5) * (2 + rand() * 6));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (preset.type === 'brick') {
    ctx.fillStyle = '#c9b39f';
    ctx.fillRect(0, 0, 1024, 1024);
    const bw = 190, bh = 92, mortar = 10;
    for (let row = 0; row < Math.ceil(1024 / bh); row++) {
      const offset = row % 2 ? -bw / 2 : 0;
      for (let x = offset; x < 1024; x += bw) {
        const shade = .15 + rand() * .75;
        ctx.fillStyle = mixColor(dark, light, shade);
        ctx.fillRect(x + mortar / 2, row * bh + mortar / 2, bw - mortar, bh - mortar);
        for (let n = 0; n < 35; n++) {
          ctx.fillStyle = `rgba(255,255,255,${rand() * .08})`;
          ctx.fillRect(x + rand() * bw, row * bh + rand() * bh, 2 + rand() * 5, 1 + rand() * 3);
        }
        bump.fillStyle = 'rgb(175,175,175)';
        bump.fillRect(x + mortar / 2, row * bh + mortar / 2, bw - mortar, bh - mortar);
      }
    }
  }

  if (preset.type === 'concrete' || preset.type === 'sand' || preset.type === 'rubber') {
    ctx.fillStyle = mixColor(dark, light, .5);
    ctx.fillRect(0, 0, 1024, 1024);
    const dots = preset.type === 'sand' ? 60000 : 26000;
    for (let i = 0; i < dots; i++) {
      const x = rand() * 1024;
      const y = rand() * 1024;
      const radius = .4 + rand() * (preset.type === 'sand' ? 2.2 : 3.2);
      ctx.fillStyle = mixColor(dark, light, rand());
      ctx.globalAlpha = .18 + rand() * .48;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      const v = Math.round(80 + rand() * 125);
      bump.fillStyle = `rgb(${v},${v},${v})`;
      bump.beginPath();
      bump.arc(x, y, radius, 0, Math.PI * 2);
      bump.fill();
    }
    ctx.globalAlpha = 1;

    if (preset.type === 'rubber') {
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      bump.strokeStyle = 'rgb(175,175,175)';
      for (let i = -1024; i < 2048; i += 45) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 1024, 1024); ctx.stroke();
        bump.beginPath(); bump.moveTo(i, 0); bump.lineTo(i - 1024, 1024); bump.stroke();
      }
    }
  }

  if (preset.type === 'marble') {
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 24; i++) {
      const y0 = rand() * 1024;
      ctx.strokeStyle = mixColor('#8d9094', dark, rand());
      ctx.globalAlpha = .15 + rand() * .25;
      ctx.lineWidth = 1 + rand() * 7;
      ctx.beginPath();
      ctx.moveTo(-50, y0);
      for (let x = 0; x < 1100; x += 35) {
        ctx.lineTo(x, y0 + Math.sin(x * .012 + rand() * 6) * (20 + rand() * 55));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (preset.type === 'metal') {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
    gradient.addColorStop(0, dark);
    gradient.addColorStop(.5, light);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 2) {
      const alpha = .03 + rand() * .10;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, y, 1024, 1);
      const v = Math.round(110 + rand() * 35);
      bump.fillStyle = `rgb(${v},${v},${v})`;
      bump.fillRect(0, y, 1024, 1);
    }
  }

  surfaceTexture.needsUpdate = true;
  surfaceBumpTexture.needsUpdate = true;
}

function updateSurfaceTextureRepeat() {
  const repeat = Math.max(1, state.surfaceScale);
  surfaceTexture.repeat.set(repeat, repeat);
  surfaceBumpTexture.repeat.set(repeat, repeat);
}

function syncSurfaceControls() {
  document.getElementById('surfaceScale').value = state.surfaceScale;
  document.getElementById('surfaceRoughness').value = state.surfaceRoughness;
  document.getElementById('surfaceReflection').value = state.surfaceReflection;
  document.getElementById('surfaceBump').value = state.surfaceBump;
  document.getElementById('rollingResistance').value = state.rollingResistance;
  document.getElementById('rollBumpiness').value = state.rollBumpiness;
}

function applySurfaceMaterial() {
  floor.visible = state.floorEnabled && state.surfacePreset !== 'transparent';
  floorMaterial.roughness = state.surfaceRoughness;
  floorMaterial.metalness = Math.min(.95, state.surfaceReflection * .8);
  floorMaterial.clearcoat = state.surfaceReflection;
  floorMaterial.clearcoatRoughness = Math.max(.02, 1 - state.surfaceReflection);
  floorMaterial.bumpScale = state.surfaceBump;
  floorMaterial.transmission = 0;
  floorMaterial.opacity = 1;
  floorMaterial.transparent = false;

  if (state.surfacePreset === 'glass') {
    floorMaterial.color.set('#d8f1f4');
    floorMaterial.transmission = .72;
    floorMaterial.thickness = .15;
    floorMaterial.ior = 1.45;
    floorMaterial.opacity = .72;
    floorMaterial.transparent = true;
  } else {
    floorMaterial.color.set('#ffffff');
  }

  floorMaterial.needsUpdate = true;
  updateSurfaceTextureRepeat();
}

function applySurfacePreset(name) {
  const preset = SURFACE_PRESETS[name] || SURFACE_PRESETS.whiteStudio;
  state.surfacePreset = name;
  state.surfaceScale = preset.scale;
  state.surfaceRoughness = preset.roughness;
  state.surfaceReflection = preset.reflection;
  state.surfaceBump = preset.bump;
  state.rollingResistance = preset.resistance;
  state.rollBumpiness = preset.bumpiness;

  drawSurfaceTexture(preset);
  syncSurfaceControls();
  applySurfaceMaterial();
  document.getElementById('surfaceReadout').textContent = preset.description;
  setStatus(`${preset.label} surface ready.`);
}


const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
new RGBELoader().load(
  'assets/environments/studio-softboxes.hdr',
  hdr => {
    const environment = pmremGenerator.fromEquirectangular(hdr).texture;
    scene.environment = environment;
    hdr.dispose();
    pmremGenerator.dispose();
    ballMaterial.envMapIntensity = 1.25;
    ballMaterial.needsUpdate = true;
    setStatus('Realistic ball and studio reflections ready.');
  },
  undefined,
  error => {
    console.warn('HDR environment could not load:', error);
    setStatus('Ball ready; HDR environment file was not found.');
  }
);

const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.1);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 4);
key.position.set(3.5, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

const fill = new THREE.DirectionalLight(0xdde7ff, 1.8);
fill.position.set(-4, 2, 3);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 3.2);
rim.position.set(0, 3, -4);
scene.add(rim);

const gltfLoader = new GLTFLoader();
const modelCache = new Map();

function selectAutomaticModel() {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const memory = navigator.deviceMemory || 4;
  if (mobile || memory <= 4) return 'assets/models/blank-ball-mobile.glb';
  if (memory >= 8 && window.devicePixelRatio <= 2) return 'assets/models/blank-ball-high.glb';
  return 'assets/models/blank-ball-medium.glb';
}

function pathForBallModel(model) {
  if (model === 'uploadedDetailed') return 'assets/models/uploaded-ball-detailed.glb';
  if (model === 'uploadedPerformance') return 'assets/models/uploaded-ball-performance.glb';
  if (model === 'blankTour') return 'assets/models/blank-ball-high.glb';
  if (model === 'blankLowDimple') return 'assets/models/blank-ball-medium.glb';
  if (model === 'blankHighDimple') return 'assets/models/blank-ball-mobile.glb';
  return selectAutomaticModel();
}

async function loadRealisticGeometry(path) {
  if (modelCache.has(path)) return modelCache.get(path).clone();
  const gltf = await gltfLoader.loadAsync(path);
  let geometry = null;
  gltf.scene.traverse(node => {
    if (!geometry && node.isMesh) geometry = node.geometry;
  });
  if (!geometry) throw new Error(`No mesh found in ${path}`);
  geometry.computeVertexNormals();
  modelCache.set(path, geometry);
  return geometry.clone();
}

async function applyBallModel(model) {
  state.ballModel = model;
  const path = pathForBallModel(model);
  const label = path.includes('uploaded-ball-detailed') ? 'imported detailed hero'
    : path.includes('uploaded-ball-performance') ? 'imported performance'
    : path.includes('high') ? 'generated high-detail'
    : path.includes('mobile') ? 'generated mobile'
    : 'generated balanced';
  setStatus(`Loading realistic ${label} golf ball…`);
  try {
    const nextGeometry = await loadRealisticGeometry(path);
    const previousGeometry = ball.geometry;
    ball.geometry = nextGeometry;
    ballGeometry = nextGeometry;
    previousGeometry?.dispose();
    await loadCoverSet(state.coverPreset);
    ballMaterial.needsUpdate = true;
    setStatus(`Realistic ${label} dimple model ready.`);
  } catch (error) {
    console.error(error);
    setStatus('Model failed to load. Check that the assets folder was uploaded.');
  }
}

function drawImageInZone(img, zone) {
  if (!img) return;
  const x = (zone.centerU - zone.widthU / 2) * textureCanvas.width;
  const y = (zone.centerV - zone.heightV / 2) * textureCanvas.height;
  const w = zone.widthU * textureCanvas.width;
  const h = zone.heightV * textureCanvas.height;

  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  textureCtx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function updatePersonalizationTexture() {
  textureCtx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

  // Draw the selected supplied cover texture beneath personalization.
  textureCtx.fillStyle = '#ffffff';
  textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  if (coverBaseImage) {
    textureCtx.drawImage(coverBaseImage, 0, 0, textureCanvas.width, textureCanvas.height);
  }

  if (state.stripeEnabled) {
    const stripe = PRINT_ZONE_CONFIG.stripe;
    const stripeHeight = (state.stripeWidth / 100) * textureCanvas.height;
    const startX = stripe.startU * textureCanvas.width;
    const width = stripe.lengthU * textureCanvas.width;
    const y = stripe.centerV * textureCanvas.height - stripeHeight / 2;

    textureCtx.fillStyle = state.stripeColor;
    textureCtx.fillRect(startX, y, width, stripeHeight);

    if (state.stripeText.trim()) {
      textureCtx.save();
      textureCtx.fillStyle = '#ffffff';
      textureCtx.font = `600 ${Math.max(20, stripeHeight * .55)}px Arial`;
      textureCtx.textAlign = 'center';
      textureCtx.textBaseline = 'middle';
      textureCtx.fillText(
        state.stripeText.trim(),
        startX + width / 2,
        y + stripeHeight / 2,
        width * .9
      );
      textureCtx.restore();
    }
  }

  if (state.frontEnabled) drawImageInZone(state.frontImage, PRINT_ZONE_CONFIG.front);
  if (state.rearEnabled) drawImageInZone(state.rearImage, PRINT_ZONE_CONFIG.rear);

  personalizationTexture.needsUpdate = true;
}

function applyFinish(name) {
  state.finish = name;
  const finishes = {
    matte: { roughness: .78, clearcoat: .02, clearcoatRoughness: .9 },
    satin: { roughness: .40, clearcoat: .18, clearcoatRoughness: .38 },
    gloss: { roughness: .20, clearcoat: .65, clearcoatRoughness: .12 },
    pearl: { roughness: .28, clearcoat: .45, clearcoatRoughness: .22 }
  };
  Object.assign(ballMaterial, finishes[name] || finishes.satin);
}

function updateBackground() {
  const type = state.backgroundType;
  const c1 = state.backgroundColor;
  const c2 = state.backgroundColor2;

  if (type === 'transparent') {
    scene.background = null;
    stageWrap.style.background = 'transparent';
  } else if (type === 'solid') {
    scene.background = new THREE.Color(c1);
    stageWrap.style.background = c1;
  } else {
    scene.background = null;
    stageWrap.style.background = `linear-gradient(145deg, ${c1}, ${c2})`;
  }

}

function applyLightingPreset(name) {
  const presets = {
    clean:   { key: 4.0, fill: 1.8, rim: 3.2, hemi: 1.1, exposure: 1.1 },
    dramatic:{ key: 5.8, fill: .35, rim: 5.5, hemi: .35, exposure: .9 },
    luxury:  { key: 4.6, fill: .8, rim: 4.8, hemi: .55, exposure: 1.0 },
    social:  { key: 4.8, fill: 2.2, rim: 4.2, hemi: 1.2, exposure: 1.15 },
    outdoor: { key: 5.2, fill: 1.5, rim: 1.4, hemi: 1.6, exposure: 1.2 }
  };
  const p = presets[name] || presets.clean;
  key.intensity = p.key;
  fill.intensity = p.fill;
  rim.intensity = p.rim;
  hemi.intensity = p.hemi;
  renderer.toneMappingExposure = p.exposure;

  document.getElementById('keyLight').value = p.key;
  document.getElementById('fillLight').value = p.fill;
  document.getElementById('rimLight').value = p.rim;
}

function setAspectRatio(value) {
  stageWrap.className = `ratio-${value.replace(':', '-')}`;
  resizeRenderer();
}

function resizeRenderer() {
  const rect = stageWrap.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function loadImage(file, target) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => setStatus('Could not read image.');
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state[target] = img;
      updatePersonalizationTexture();
      setStatus(`${target === 'frontImage' ? 'Front' : 'Rear'} artwork loaded.`);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function tweenCamera(position, target = new THREE.Vector3(0, 0, 0), ms = 650) {
  const start = performance.now();
  const from = camera.position.clone();
  const to = position.clone();
  const startTarget = controls.target.clone();

  function frame(now) {
    const t = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(from, to, e);
    controls.target.lerpVectors(startTarget, target, e);
    controls.update();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runAnimationPreset() {
  state.animationPlaying = true;
  state.animationStart = performance.now();
  state.animationDuration = Number(document.getElementById('duration').value);
  state.animationPreset = document.getElementById('animationPreset').value;
  state.autoRotate = false;
  document.getElementById('autoRotate').checked = false;
  setStatus(`Playing ${document.getElementById('animationPreset').selectedOptions[0].text}.`);
}

function updatePresetAnimation(now) {
  if (!state.animationPlaying) return;

  const elapsed = (now - state.animationStart) / 1000;
  const duration = state.animationDuration;
  const t = Math.min(1, elapsed / duration);
  const ease = t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
  const resistance = THREE.MathUtils.clamp(state.rollingResistance, 0, .95);
  const rollingProgress = 1 - Math.pow(1 - ease, 1 + resistance * 3.8);
  const travelFactor = 1 - resistance * .48;
  const bumpAmplitude = state.rollBumpiness;

  ballGroup.position.set(0, 0, 0);
  ballGroup.scale.setScalar(1);

  const applySurfaceMotion = progress => {
    if (!bumpAmplitude) return;
    const frequency = state.surfacePreset === 'brick' ? 18 : state.surfacePreset === 'grass' ? 29 : 23;
    const envelope = Math.sin(Math.PI * progress);
    ballGroup.position.y += Math.abs(Math.sin(progress * Math.PI * frequency)) * bumpAmplitude * envelope;
    ball.rotation.x += Math.sin(progress * Math.PI * (frequency * .55)) * bumpAmplitude * .10;
    ball.rotation.y += Math.sin(progress * Math.PI * (frequency * .32)) * bumpAmplitude * .08;
    if (state.surfacePreset === 'sand') {
      ballGroup.position.y -= .035 * envelope;
    }
  };

  switch (state.animationPreset) {
    case 'turntable':
      ball.rotation.y = -Math.PI / 2 + t * Math.PI * 2;
      break;
    case 'frontReveal':
      ball.rotation.y = -Math.PI * 1.6 + ease * Math.PI * 1.1;
      break;
    case 'rearReveal':
      ball.rotation.y = -Math.PI / 2 + ease * Math.PI;
      break;
    case 'frontStripeRear':
      ball.rotation.y = -Math.PI / 2 + ease * Math.PI;
      break;
    case 'rollLeftRight': {
      const distance = 5.2 * travelFactor;
      ballGroup.position.x = -distance / 2 + rollingProgress * distance;
      ball.rotation.z = -rollingProgress * Math.PI * 3.5 * travelFactor;
      applySurfaceMotion(rollingProgress);
      break;
    }
    case 'rollRightLeft': {
      const distance = 5.2 * travelFactor;
      ballGroup.position.x = distance / 2 - rollingProgress * distance;
      ball.rotation.z = rollingProgress * Math.PI * 3.5 * travelFactor;
      applySurfaceMotion(rollingProgress);
      break;
    }
    case 'rollToward': {
      const forward = 2.4 * travelFactor;
      ballGroup.position.z = -3.2 + rollingProgress * forward;
      ballGroup.scale.setScalar(.55 + rollingProgress * .75 * travelFactor);
      ball.rotation.x = -rollingProgress * Math.PI * 3.5 * travelFactor;
      applySurfaceMotion(rollingProgress);
      break;
    }
    case 'sCurve': {
      const distance = 5.4 * travelFactor;
      ballGroup.position.x = -distance / 2 + rollingProgress * distance;
      ballGroup.position.z = Math.sin(rollingProgress * Math.PI * 2) * .55 * travelFactor;
      ball.rotation.z = -rollingProgress * Math.PI * 4 * travelFactor;
      applySurfaceMotion(rollingProgress);
      break;
    }
  }

  if (t >= 1) {
    state.animationPlaying = false;
    setStatus(`${SURFACE_PRESETS[state.surfacePreset]?.label || 'Surface'} animation complete.`);
  }
}

function getExportDimensions() {
  const aspect = document.getElementById('aspectRatio').value;
  const base = Number(document.getElementById('resolution').value);
  const pairs = {
    '9:16': [Math.round(base * 9 / 16), base],
    '16:9': [base, Math.round(base * 9 / 16)],
    '1:1': [base, base],
    '4:5': [Math.round(base * 4 / 5), base],
    '3:2': [base, Math.round(base * 2 / 3)]
  };
  return pairs[aspect] || pairs['9:16'];
}

function withExportResolution(callback) {
  const oldSize = new THREE.Vector2();
  renderer.getSize(oldSize);
  const oldPixelRatio = renderer.getPixelRatio();
  const oldAspect = camera.aspect;
  const [w, h] = getExportDimensions();

  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  callback(w, h);

  renderer.setPixelRatio(oldPixelRatio);
  renderer.setSize(oldSize.x, oldSize.y, false);
  camera.aspect = oldAspect;
  camera.updateProjectionMatrix();
}

function exportPng() {
  withExportResolution((w, h) => {
    renderer.domElement.toBlob(blob => {
      if (!blob) return setStatus('PNG export failed.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `golfball-render-${w}x${h}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`PNG exported at ${w}×${h}.`);
    }, 'image/png');
  });
}

async function recordWebm() {
  if (!window.MediaRecorder || !renderer.domElement.captureStream) {
    setStatus('This browser does not support WebM recording.');
    return;
  }

  const fps = Number(document.getElementById('fps').value);
  const [w, h] = getExportDimensions();
  const oldSize = new THREE.Vector2();
  renderer.getSize(oldSize);
  const oldAspect = camera.aspect;

  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const stream = renderer.domElement.captureStream(fps);
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golfball-animation-${w}x${h}-${fps}fps.webm`;
    a.click();
    URL.revokeObjectURL(url);

    renderer.setSize(oldSize.x, oldSize.y, false);
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();
    setStatus('WebM animation exported.');
  };

  recorder.start();
  runAnimationPreset();
  setStatus(`Recording ${state.animationDuration}s WebM at ${w}×${h}, ${fps} fps…`);

  setTimeout(() => recorder.stop(), state.animationDuration * 1000 + 250);
}

document.getElementById('frontUpload').addEventListener('change', e => loadImage(e.target.files[0], 'frontImage'));
document.getElementById('rearUpload').addEventListener('change', e => loadImage(e.target.files[0], 'rearImage'));

document.getElementById('clearFront').addEventListener('click', () => {
  state.frontImage = null;
  document.getElementById('frontUpload').value = '';
  updatePersonalizationTexture();
});
document.getElementById('clearRear').addEventListener('click', () => {
  state.rearImage = null;
  document.getElementById('rearUpload').value = '';
  updatePersonalizationTexture();
});

document.getElementById('frontEnabled').addEventListener('change', e => { state.frontEnabled = e.target.checked; updatePersonalizationTexture(); });
document.getElementById('rearEnabled').addEventListener('change', e => { state.rearEnabled = e.target.checked; updatePersonalizationTexture(); });
document.getElementById('stripeEnabled').addEventListener('change', e => { state.stripeEnabled = e.target.checked; updatePersonalizationTexture(); });
document.getElementById('stripeColor').addEventListener('input', e => { state.stripeColor = e.target.value; updatePersonalizationTexture(); });
document.getElementById('stripeWidth').addEventListener('input', e => { state.stripeWidth = Number(e.target.value); updatePersonalizationTexture(); });
document.getElementById('stripeText').addEventListener('input', e => { state.stripeText = e.target.value; updatePersonalizationTexture(); });

document.getElementById('ballModel').addEventListener('change', e => applyBallModel(e.target.value));
document.getElementById('coverPreset').addEventListener('change', e => applyCoverPreset(e.target.value));
document.getElementById('ballColor').addEventListener('input', e => {
  state.ballColor = e.target.value;
  ballMaterial.color.set(e.target.value);
});
document.getElementById('finish').addEventListener('change', e => applyFinish(e.target.value));

document.getElementById('backgroundType').addEventListener('change', e => { state.backgroundType = e.target.value; updateBackground(); });
document.getElementById('backgroundColor').addEventListener('input', e => { state.backgroundColor = e.target.value; updateBackground(); });
document.getElementById('backgroundColor2').addEventListener('input', e => { state.backgroundColor2 = e.target.value; updateBackground(); });

document.getElementById('lightingPreset').addEventListener('change', e => applyLightingPreset(e.target.value));
document.getElementById('keyLight').addEventListener('input', e => key.intensity = Number(e.target.value));
document.getElementById('fillLight').addEventListener('input', e => fill.intensity = Number(e.target.value));
document.getElementById('rimLight').addEventListener('input', e => rim.intensity = Number(e.target.value));
document.getElementById('surfacePreset').addEventListener('change', e => applySurfacePreset(e.target.value));
document.getElementById('surfaceScale').addEventListener('input', e => {
  state.surfaceScale = Number(e.target.value);
  updateSurfaceTextureRepeat();
});
document.getElementById('surfaceRoughness').addEventListener('input', e => {
  state.surfaceRoughness = Number(e.target.value);
  applySurfaceMaterial();
});
document.getElementById('surfaceReflection').addEventListener('input', e => {
  state.surfaceReflection = Number(e.target.value);
  applySurfaceMaterial();
});
document.getElementById('surfaceBump').addEventListener('input', e => {
  state.surfaceBump = Number(e.target.value);
  applySurfaceMaterial();
});
document.getElementById('rollingResistance').addEventListener('input', e => {
  state.rollingResistance = Number(e.target.value);
});
document.getElementById('rollBumpiness').addEventListener('input', e => {
  state.rollBumpiness = Number(e.target.value);
});
document.getElementById('floorEnabled').addEventListener('change', e => {
  state.floorEnabled = e.target.checked;
  applySurfaceMaterial();
});

document.getElementById('aspectRatio').addEventListener('change', e => setAspectRatio(e.target.value));
document.getElementById('lens').addEventListener('change', e => {
  const focal = Number(e.target.value);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(36 / (2 * focal)));
  camera.updateProjectionMatrix();
});
document.getElementById('cameraDistance').addEventListener('input', e => {
  const d = Number(e.target.value);
  camera.position.setLength(d);
});
document.getElementById('safeAreaToggle').addEventListener('change', e => {
  document.getElementById('safeArea').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('autoRotate').addEventListener('change', e => state.autoRotate = e.target.checked);
document.getElementById('duration').addEventListener('input', e => {
  document.getElementById('durationValue').textContent = `${e.target.value}s`;
});
document.getElementById('playAnimation').addEventListener('click', runAnimationPreset);

document.getElementById('frontView').addEventListener('click', () => tweenCamera(new THREE.Vector3(0, .25, 4.8)));
document.getElementById('rearView').addEventListener('click', () => tweenCamera(new THREE.Vector3(0, .25, -4.8)));
document.getElementById('isoView').addEventListener('click', () => tweenCamera(new THREE.Vector3(3.6, 2.1, 3.7)));

document.getElementById('exportPng').addEventListener('click', exportPng);
document.getElementById('recordWebm').addEventListener('click', recordWebm);

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(stageWrap);

function animate(now) {
  requestAnimationFrame(animate);
  controls.update();

  if (state.autoRotate && !state.animationPlaying) {
    ball.rotation.y += 0.0045;
  }

  updatePresetAnimation(now);
  renderer.render(scene, camera);
}

applyBallModel('blankStandard');
applyFinish('satin');
applyLightingPreset('clean');
applySurfacePreset('whiteStudio');
applyCoverPreset('clean');
updateBackground();
updatePersonalizationTexture();
resizeRenderer();
requestAnimationFrame(animate);
