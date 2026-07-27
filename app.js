
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  ballModel: 'blankStandard',
  finish: 'satin',
  ballColor: '#ffffff'
};

// Replace these temporary defaults with the user's exact production measurements.
// Values are normalized to the ball's UV map.
const PRINT_ZONE_CONFIG = {
  front: { centerU: 0.25, centerV: 0.50, widthU: 0.17, heightV: 0.34 },
  rear:  { centerU: 0.75, centerV: 0.50, widthU: 0.17, heightV: 0.34 },
  stripe: { startU: 0.25, lengthU: 0.50, centerV: 0.50 }
};

const ballGeometry = new THREE.SphereGeometry(1, 160, 96);
const ballMaterial = new THREE.MeshPhysicalMaterial({
  color: state.ballColor,
  roughness: 0.38,
  metalness: 0,
  clearcoat: 0.2,
  clearcoatRoughness: 0.35,
  map: personalizationTexture
});

const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
ball.rotation.y = -Math.PI / 2;
ballGroup.add(ball);

const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x999999,
  roughness: 0.72,
  metalness: 0.02
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.04;
floor.receiveShadow = true;
scene.add(floor);

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

function createDimpleNormalTexture(count = 360) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, c.width, c.height);

  const seed = count * 97;
  let t = seed;
  const rand = () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };

  const radius = Math.max(5, Math.min(13, 3200 / count));
  for (let i = 0; i < count; i++) {
    const x = rand() * c.width;
    const y = rand() * c.height;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgb(118,118,235)');
    g.addColorStop(.65, 'rgb(126,126,250)');
    g.addColorStop(1, 'rgb(128,128,255)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

let dimpleNormal = createDimpleNormalTexture(360);
ballMaterial.normalMap = dimpleNormal;
ballMaterial.normalScale.set(0.42, 0.42);

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

  // Soft neutral base so the material's selected color remains visible.
  textureCtx.fillStyle = '#ffffff';
  textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

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

function applyBallModel(model) {
  state.ballModel = model;
  let count = 360;
  let scale = 0.42;

  if (model === 'blankTour') { count = 388; scale = 0.45; }
  if (model === 'blankLowDimple') { count = 290; scale = 0.48; }
  if (model === 'blankHighDimple') { count = 430; scale = 0.36; }

  if (dimpleNormal) dimpleNormal.dispose();
  dimpleNormal = createDimpleNormalTexture(count);
  ballMaterial.normalMap = dimpleNormal;
  ballMaterial.normalScale.set(scale, scale);
  ballMaterial.needsUpdate = true;
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

  floorMaterial.color.set(c2);
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

  ballGroup.position.set(0, 0, 0);

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
    case 'rollLeftRight':
      ballGroup.position.x = -2.6 + ease * 5.2;
      ball.rotation.z = -ease * Math.PI * 3.5;
      break;
    case 'rollRightLeft':
      ballGroup.position.x = 2.6 - ease * 5.2;
      ball.rotation.z = ease * Math.PI * 3.5;
      break;
    case 'rollToward':
      ballGroup.position.z = -3.2 + ease * 2.4;
      ballGroup.scale.setScalar(.55 + ease * .75);
      ball.rotation.x = -ease * Math.PI * 3.5;
      break;
    case 'sCurve':
      ballGroup.position.x = -2.7 + ease * 5.4;
      ballGroup.position.z = Math.sin(ease * Math.PI * 2) * .55;
      ball.rotation.z = -ease * Math.PI * 4;
      break;
  }

  if (t >= 1) {
    state.animationPlaying = false;
    setStatus('Animation complete.');
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
document.getElementById('floorEnabled').addEventListener('change', e => {
  state.floorEnabled = e.target.checked;
  floor.visible = state.floorEnabled;
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
updateBackground();
updatePersonalizationTexture();
resizeRenderer();
requestAnimationFrame(animate);
