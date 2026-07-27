import * as THREE from 'three';

export function createFloor(scene) {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#16181b',
    roughness: 0.34,
    metalness: 0.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.45
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    material
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.08;
  floor.receiveShadow = true;
  scene.add(floor);

  return { floor, material };
}
