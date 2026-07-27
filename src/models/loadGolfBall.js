import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export const MODEL_OPTIONS = {
  detailed: {
    label: 'Detailed hero ball',
    url: './assets/models/uploaded-ball-detailed.glb'
  },
  performance: {
    label: 'Performance ball',
    url: './assets/models/uploaded-ball-performance.glb'
  }
};

export async function loadGolfBall(modelKey, material) {
  const option = MODEL_OPTIONS[modelKey];
  if (!option) throw new Error(`Unknown model key: ${modelKey}`);

  const gltf = await loader.loadAsync(option.url);
  let sourceMesh = null;

  gltf.scene.traverse((node) => {
    if (!sourceMesh && node.isMesh && node.geometry) sourceMesh = node;
  });

  if (!sourceMesh) {
    throw new Error(`No mesh was found in ${option.url}`);
  }

  const geometry = sourceMesh.geometry.clone();

  if (!geometry.attributes.position) {
    throw new Error(`The model ${option.url} has no position attribute`);
  }

  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const center = geometry.boundingSphere.center.clone();
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();

  const radius = geometry.boundingSphere.radius;
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`Invalid model radius in ${option.url}`);
  }

  const scale = 1 / radius;
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = option.label;

  const triangleCount = geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3;

  return {
    mesh,
    metadata: {
      key: modelKey,
      label: option.label,
      url: option.url,
      triangles: Math.round(triangleCount),
      vertices: geometry.attributes.position.count,
      hasUV: Boolean(geometry.attributes.uv),
      hasNormals: Boolean(geometry.attributes.normal)
    }
  };
}
