import * as THREE from 'three';

export function createLighting(scene) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x1b1f24, 1.15);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 5.0);
  key.position.set(-4.5, 5.5, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfd9ff, 1.6);
  fill.position.set(4.2, 1.6, 3.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 3.3);
  rim.position.set(3.0, 4.5, -5.0);
  scene.add(rim);

  return { ambient, key, fill, rim };
}
