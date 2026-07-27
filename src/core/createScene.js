import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#22262b');

  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  camera.position.set(0, 0.3, 4.4);

  return { scene, camera };
}
