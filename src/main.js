import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildUI } from './ui/buildUI.js';
import { showFatalError, clearFatalError } from './ui/errors.js';
import { createRenderer } from './core/createRenderer.js';
import { createScene } from './core/createScene.js';
import { createLighting } from './core/createLighting.js';
import { createFloor } from './core/createFloor.js';
import { createBallMaterial } from './materials/createBallMaterial.js';
import { applyCover } from './materials/coverTextures.js';
import { loadGolfBall } from './models/loadGolfBall.js';

const root = document.querySelector('#app');
const ui = buildUI(root);

let renderer;
let scene;
let camera;
let controls;
let floor;
let floorMaterial;
let ball = null;
let ballMaterial = null;
let animationFrame = 0;

function setStatus(message) {
  ui.status.textContent = message;
}

function resize() {
  const rect = ui.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function setCamera(position) {
  camera.position.copy(position);
  controls.target.set(0, 0, 0);
  controls.update();
}

function applyFloorPreset(key) {
  floor.visible = true;
  floorMaterial.transmission = 0;
  floorMaterial.transparent = false;
  floorMaterial.opacity = 1;
  floorMaterial.metalness = 0;

  const presets = {
    dark: { color: '#16181b', roughness: 0.34, clearcoat: 0.15 },
    white: { color: '#ededed', roughness: 0.65, clearcoat: 0.05 },
    wood: { color: '#7a4c2c', roughness: 0.48, clearcoat: 0.18 },
    grass: { color: '#315f2b', roughness: 0.96, clearcoat: 0.0 },
    glass: { color: '#cce7ec', roughness: 0.08, clearcoat: 0.75 },
    brick: { color: '#7a382d', roughness: 0.88, clearcoat: 0.0 }
  };

  const preset = presets[key] || presets.dark;
  floorMaterial.color.set(preset.color);
  floorMaterial.roughness = preset.roughness;
  floorMaterial.clearcoat = preset.clearcoat;

  if (key === 'glass') {
    floorMaterial.transparent = true;
    floorMaterial.opacity = 0.72;
    floorMaterial.transmission = 0.55;
  }

  floorMaterial.needsUpdate = true;
}

async function switchModel(key) {
  clearFatalError(ui);
  setStatus('Loading imported mesh…');
  ui.modelDiagnostic.textContent = 'Loading…';

  try {
    const loaded = await loadGolfBall(key, ballMaterial);

    if (ball) {
      scene.remove(ball);
      ball.geometry.dispose();
    }

    ball = loaded.mesh;
    scene.add(ball);

    const m = loaded.metadata;
    ui.modelDiagnostic.classList.remove('error');
    ui.modelDiagnostic.textContent =
      `${m.label} · ${m.triangles.toLocaleString()} triangles · ` +
      `${m.vertices.toLocaleString()} vertices · UV: ${m.hasUV ? 'yes' : 'no'}`;

    setStatus(`${m.label} loaded successfully.`);
  } catch (error) {
    ui.modelDiagnostic.classList.add('error');
    ui.modelDiagnostic.textContent = 'Model failed to load';
    showFatalError(
      ui,
      'The imported golf-ball mesh could not be loaded. This build does not substitute a generated cartoon ball.',
      error
    );
    setStatus('Model loading failed.');
  }
}

async function initialize() {
  try {
    renderer = createRenderer(ui.canvas);
    ({ scene, camera } = createScene());
    createLighting(scene);
    ({ floor, material: floorMaterial } = createFloor(scene));
    ballMaterial = createBallMaterial();

    controls = new OrbitControls(camera, ui.canvas);
    controls.enableDamping = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 9;
    controls.target.set(0, 0, 0);

    applyFloorPreset('dark');
    await applyCover(ballMaterial, 'clean');
    await switchModel('detailed');

    ui.modelSelect.addEventListener('change', (event) => switchModel(event.target.value));

    ui.coverSelect.addEventListener('change', async (event) => {
      setStatus('Loading cover material…');
      try {
        await applyCover(ballMaterial, event.target.value);
        setStatus('Cover material ready.');
      } catch (error) {
        showFatalError(ui, 'The cover texture set could not be loaded.', error);
      }
    });

    ui.ballColor.addEventListener('input', (event) => {
      if (ui.coverSelect.value === 'clean') {
        ballMaterial.color.set(event.target.value);
      }
    });

    ui.roughness.addEventListener('input', (event) => {
      ballMaterial.roughness = Number(event.target.value);
    });

    ui.clearcoat.addEventListener('input', (event) => {
      ballMaterial.clearcoat = Number(event.target.value);
    });

    ui.backgroundColor.addEventListener('input', (event) => {
      scene.background.set(event.target.value);
    });

    ui.floorSelect.addEventListener('change', (event) => {
      applyFloorPreset(event.target.value);
    });

    ui.frontView.addEventListener('click', () => setCamera(new THREE.Vector3(0, 0.15, 4.4)));
    ui.rearView.addEventListener('click', () => setCamera(new THREE.Vector3(0, 0.15, -4.4)));
    ui.isoView.addEventListener('click', () => setCamera(new THREE.Vector3(3.3, 2.4, 3.8)));
    ui.resetView.addEventListener('click', () => setCamera(new THREE.Vector3(0, 0.3, 4.4)));

    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setStatus('Studio ready.');
  } catch (error) {
    showFatalError(ui, 'The renderer could not be initialized.', error);
    setStatus('Renderer initialization failed.');
  }
}

initialize();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(animationFrame);
    renderer?.dispose();
  });
}
