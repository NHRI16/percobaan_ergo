import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Local CC0 surfaces and attributed CC BY Sketchfab models: assets/CREDITS.md.
const base = '../assets/textures/';
const descriptor = (id, repeat, normalScale = .45) => ({
  id,
  map: new URL(`${base}${id}/${id}_diff_1k.jpg`, import.meta.url).href,
  normalMap: new URL(`${base}${id}/${id}_nor_gl_1k.jpg`, import.meta.url).href,
  roughnessMap: new URL(`${base}${id}/${id}_rough_1k.jpg`, import.meta.url).href,
  repeat,
  normalScale,
  source: `https://polyhaven.com/a/${id}`,
  license: 'CC0-1.0',
});
export const SURFACE_ASSETS = Object.freeze({
  floor: descriptor('wood_floor', [4.8, 4.8], .35),
  wood: descriptor('wood_floor', [1, 1], .18),
  plaster: descriptor('plaster_grey_04', [4, 2], .24),
  grass: descriptor('leafy_grass', [6, 6], .62),
  concrete: descriptor('concrete_floor_worn_001', [2, 3], .55),
});
const sketchfab = (file, author, slug, height, extra = {}) => ({
  url: new URL(`../assets/models/sketchfab/${file}.glb`, import.meta.url).href,
  source: `https://sketchfab.com/3d-models/${slug}`, author, license: 'CC-BY-4.0', height, ...extra,
});
const kitchenAsset = (file, height) => sketchfab(file, 'QuarizonStudio', 'modern-scandinavian-kitchen-island-a9738f4e651b4779acdddcfbb89516f6', height);
const apartmentAsset = (file, height) => sketchfab(file, 'Visthétique', 'modern-apartment-1fbb649cd6624f2bb7b7d6e30c6533a5', height);
export const BUNDLED_MODELS = Object.freeze({
  treeCanopy: sketchfab('tree-canopy', 'Daniel', 'realistic-tree-d989c0f801d847b9a74992ec4ddcfdfc', 8, { vegetation: true }),
  treeGarden: sketchfab('tree-garden', 'praktikumgkv2022', 'pohon-60cee0b63e4742d2a904d63609870621', 5.5, { vegetation: true }),
  treeSlender: sketchfab('tree-slender', 'vikanovia28', 'pohon-794d4122cec24186b00df68859c480d0', 7, { vegetation: true }),
  kitchenCounter: kitchenAsset('kitchen-counter', .89),
  kitchenOven: kitchenAsset('kitchen-oven', 1.45),
  kitchenPendants: kitchenAsset('kitchen-pendants', 1.25),
  apartmentFridge: apartmentAsset('apartment-fridge', 1.9),
  apartmentSofa: apartmentAsset('apartment-sofa', .82),
  apartmentCoffee: apartmentAsset('apartment-coffee', .34),
  readingChair: {
    url: new URL('../assets/models/sheen-chair.glb', import.meta.url).href,
    source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair',
    author: 'Eric Chadwick / Wayfair LLC (2020)',
    license: 'CC0-1.0',
    height: .9,
  },
});

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();
function loadTexture(url, color, renderer) {
  if (!textureCache.has(url)) {
    textureCache.set(url, textureLoader.loadAsync(url).then(texture => {
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      return texture;
    }).catch(error => { textureCache.delete(url); throw error; }));
  }
  return textureCache.get(url);
}

/** Return cached, untiled texture sources; callers may clone to set their own UV repeat. */
export async function loadSurfaceTextures(renderer, onReady = () => {}) {
  const ready = {};
  await Promise.all(Object.entries(SURFACE_ASSETS).map(async ([type, definition]) => {
    try {
      const maps = await loadMaps(definition, renderer);
      ready[type] = maps;
      onReady(type, maps);
    } catch (error) {
      // Loading is optional: procedural room geometry remains playable offline.
      console.warn(`Tekstur ${type} belum tersedia; material dasar tetap digunakan.`, error);
    }
  }));
  return ready;
}
async function loadMaps(definition, renderer) {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture(definition.map, true, renderer),
    loadTexture(definition.normalMap, false, renderer),
    loadTexture(definition.roughnessMap, false, renderer),
  ]);
  return { map, normalMap, roughnessMap };
}

/** Upgrade a fallback MeshStandardMaterial only after all three local maps load. */
export async function applySurfaceTextures(material, type, renderer, options = {}) {
  const definition = SURFACE_ASSETS[type === 'stone' ? 'concrete' : type];
  if (!definition || !material) return false;
  try {
    const maps = await loadMaps(definition, renderer);
    const repeat = options.repeat || definition.repeat;
    const nextMaps = {};
    for (const [slot, source] of Object.entries(maps)) {
      const texture = source.clone();
      texture.repeat.set(repeat[0], repeat[1]);
      texture.needsUpdate = true;
      nextMaps[slot] = texture;
    }
    // Dispose only clones this module owns; procedural fallback textures may be shared.
    for (const texture of material.userData.localSurfaceTextures || []) texture.dispose();
    Object.assign(material, nextMaps);
    material.userData.localSurfaceTextures = Object.values(nextMaps);
    material.userData.surfaceSource = definition.source;
    material.bumpMap = null;
    material.normalScale.setScalar(options.normalScale ?? definition.normalScale);
    material.roughness = options.roughness ?? 1;
    material.needsUpdate = true;
    if (renderer?.shadowMap) renderer.shadowMap.needsUpdate = true;
    return true;
  } catch (error) {
    console.warn(`Tekstur ${type} belum tersedia; material dasar tetap digunakan.`, error);
    return false;
  }
}

const gltfLoader = new GLTFLoader();
const modelCache = new Map();
function prepareVegetation(scene) {
  scene.updateMatrixWorld(true);
  const batches = new Map(), trunk = new THREE.Box3();
  const bounds = new THREE.Box3().setFromObject(scene, true), threshold = bounds.min.y + (bounds.max.y - bounds.min.y) * .035;
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const vertices = geometry.attributes.position, point = new THREE.Vector3();
    for (let i = 0; i < vertices.count; i++) { point.fromBufferAttribute(vertices, i); if (point.y <= threshold) trunk.expandByPoint(point); }
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(geometry);
  });
  const merged = new THREE.Group();
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    merged.add(new THREE.Mesh(geometry, material));
  }
  merged.userData.trunkCenter = trunk.getCenter(new THREE.Vector3()).toArray();
  return merged;
}
/** Decorative furniture only. Returns a centered, floor-aligned Group in meter units. */
export async function loadDecorativeModel(key = 'readingChair', options = {}) {
  const definition = BUNDLED_MODELS[key];
  if (!definition) throw new Error(`Model tidak tersedia: ${key}`);
  if (!modelCache.has(key)) modelCache.set(key, gltfLoader.loadAsync(definition.url).then(gltf => {
    if (definition.vegetation) gltf.scene = prepareVegetation(gltf.scene);
    return gltf;
  }).catch(error => { modelCache.delete(key); throw error; }));
  const gltf = await modelCache.get(key);
  const model = gltf.scene.clone(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (definition.vegetation && model.userData.trunkCenter) center.fromArray(model.userData.trunkCenter);
  const factor = (options.height ?? definition.height) / Math.max(size.y, .001);
  const scale = options.fit ? new THREE.Vector3(...options.fit).divide(size) : new THREE.Vector3(factor, factor, factor);
  const normalized = new THREE.Group();
  normalized.scale.copy(scale); normalized.position.set(-center.x * scale.x, -bounds.min.y * scale.y, -center.z * scale.z); normalized.add(model);
  const materialCopies = new Map();
  const copyMaterial = material => {
    if (!materialCopies.has(material)) materialCopies.set(material, material.clone());
    return materialCopies.get(material);
  };
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    // Each room owns its materials; cached geometry/textures survive room disposal.
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copyMaterial) : copyMaterial(mesh.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  const wrapper = new THREE.Group();
  wrapper.name = `bundled-${key}`;
  wrapper.userData.assetSource = definition.source;
  wrapper.userData.assetLicense = definition.license;
  wrapper.userData.assetAuthor = definition.author;
  wrapper.userData.assetKey = key;
  wrapper.add(normalized);
  if (options.position) wrapper.position.fromArray(options.position);
  wrapper.rotation.y = options.rotation ?? 0;
  return wrapper;
}
