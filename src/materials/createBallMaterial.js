import * as THREE from 'three';

export function createBallMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#f8f8f5',
    roughness: 0.30,
    metalness: 0,
    clearcoat: 0.36,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.6
  });
}
