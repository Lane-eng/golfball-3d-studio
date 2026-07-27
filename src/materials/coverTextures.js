import * as THREE from 'three';

const loader = new THREE.TextureLoader();

const COVER_OPTIONS = {
  clean: null,
  new: {
    base: './assets/textures/covers/new-basecolor.png',
    normal: './assets/textures/covers/new-normal.png',
    roughness: './assets/textures/covers/new-roughness.png',
    height: './assets/textures/covers/new-height.png'
  },
  used: {
    base: './assets/textures/covers/used-basecolor.png',
    normal: './assets/textures/covers/used-normal.png',
    roughness: './assets/textures/covers/used-roughness.png',
    height: './assets/textures/covers/used-height.png'
  }
};

function loadTexture(url, colorSpace = THREE.NoColorSpace) {
  return loader.loadAsync(url).then((texture) => {
    texture.colorSpace = colorSpace;
    texture.flipY = false;
    return texture;
  });
}

export async function applyCover(material, key) {
  const option = COVER_OPTIONS[key];

  material.map = null;
  material.normalMap = null;
  material.roughnessMap = null;
  material.bumpMap = null;

  if (!option) {
    material.color.set('#f8f8f5');
    material.roughness = 0.30;
    material.clearcoat = 0.36;
    material.clearcoatRoughness = 0.22;
    material.needsUpdate = true;
    return;
  }

  const [base, normal, roughness, height] = await Promise.all([
    loadTexture(option.base, THREE.SRGBColorSpace),
    loadTexture(option.normal),
    loadTexture(option.roughness),
    loadTexture(option.height)
  ]);

  material.color.set('#ffffff');
  material.map = base;
  material.normalMap = normal;
  material.roughnessMap = roughness;
  material.bumpMap = height;
  material.bumpScale = key === 'used' ? 0.015 : 0.008;
  material.normalScale.set(key === 'used' ? 0.22 : 0.14, key === 'used' ? 0.22 : 0.14);
  material.needsUpdate = true;
}
