// Build browser-ready derivatives from the user's original Sketchfab downloads.
// Originals are never modified. Chrome is used only to resize embedded textures.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import * as THREE from 'three';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'models sketchfab');
const output = path.join(root, 'assets/models/sketchfab');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const textureCache = new Map(), sources = new Map(), manifest = [];

async function source(file) {
  if (sources.has(file)) return sources.get(file);
  const bytes = await fs.readFile(path.join(input, file));
  const json = file.endsWith('.glb') ? JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12))) : JSON.parse(bytes);
  const binary = file.endsWith('.glb') ? bytes.subarray(28 + bytes.readUInt32LE(12)) : await fs.readFile(path.join(input, json.buffers[0].uri));
  const matrices = [];
  function walk(index, parent = new THREE.Matrix4()) {
    const node = json.nodes[index];
    const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
      new THREE.Vector3(...(node.translation || [0, 0, 0])), new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(node.scale || [1, 1, 1])));
    matrices[index] = parent.clone().multiply(local);
    node.children?.forEach(child => walk(child, matrices[index]));
  }
  json.scenes[json.scene || 0].nodes.forEach(index => walk(index));
  const result = { json, binary, matrices };
  sources.set(file, result);
  return result;
}

async function prepare(file, name, selection, { crop, rotation = 0, tree = false, textureSize = 1024 } = {}) {
  const { json, binary, matrices } = await source(file);
  const out = { asset: structuredClone(json.asset), scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], textures: [], images: [], samplers: json.samplers || [], accessors: [], bufferViews: [], buffers: [] };
  out.asset.generator = 'ErgoFlip local asset preparation';
  out.asset.extras.modifications = 'Selected scene parts; texture resizing; legacy foliage materials adapted to metallic-roughness.';
  const chunks = [], materialMap = new Map(), textureMap = new Map(), accessorMap = new Map();
  let length = 0, triangles = 0;
  function addBytes(bytes, extra = {}) {
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    const index = out.bufferViews.length;
    out.bufferViews.push({ ...extra, buffer: 0, byteOffset: length, byteLength: bytes.length });
    chunks.push(bytes); length += bytes.length;
    return index;
  }
  function copyAccessor(index) {
    if (!accessorMap.has(index)) {
      const accessor = structuredClone(json.accessors[index]);
      if (accessor.sparse) throw new Error('Sparse accessors need explicit preparation');
      const view = json.bufferViews[accessor.bufferView];
      const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
      const width = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType] * components;
      const bytes = Buffer.alloc(accessor.count * width);
      for (let i = 0; i < accessor.count; i++) {
        const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0) + i * (view.byteStride || width);
        binary.copy(bytes, i * width, offset, offset + width);
      }
      accessor.bufferView = addBytes(bytes, { target: view.target }); accessor.byteOffset = 0;
      accessorMap.set(index, out.accessors.length); out.accessors.push(accessor);
    }
    return accessorMap.get(index);
  }
  async function copyTexture(index) {
    if (textureMap.has(index)) return textureMap.get(index);
    const texture = structuredClone(json.textures[index]), image = json.images[texture.source];
    let bytes;
    if (image.uri) bytes = await fs.readFile(path.join(input, image.uri));
    else { const view = json.bufferViews[image.bufferView]; bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength); }
    const mime = image.mimeType || (image.uri?.endsWith('.png') ? 'image/png' : 'image/jpeg');
    const cacheKey = createHash('sha256').update(bytes).update(String(textureSize)).digest('hex');
    if (!textureCache.has(cacheKey)) {
      const result = await page.evaluate(async ({ base64, mime, max }) => {
        const image = new Image(); image.src = `data:${mime};base64,${base64}`; await image.decode();
        const ratio = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL(mime, .86).split(',')[1];
      }, { base64: bytes.toString('base64'), mime, max: textureSize });
      textureCache.set(cacheKey, Buffer.from(result, 'base64'));
    }
    texture.source = out.images.length;
    out.images.push({ name: image.name, mimeType: mime, bufferView: addBytes(textureCache.get(cacheKey)) });
    textureMap.set(index, out.textures.length); out.textures.push(texture);
    return textureMap.get(index);
  }
  async function copyMaterial(index) {
    if (materialMap.has(index)) return materialMap.get(index);
    const material = structuredClone(json.materials[index]);
    const legacy = material.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (legacy) {
      material.pbrMetallicRoughness = { baseColorFactor: legacy.diffuseFactor || [1, 1, 1, 1], baseColorTexture: legacy.diffuseTexture, metallicFactor: 0, roughnessFactor: tree ? .92 : Math.max(.35, 1 - (legacy.glossinessFactor ?? 1)) };
      delete material.extensions.KHR_materials_pbrSpecularGlossiness;
    }
    if (tree) {
      material.pbrMetallicRoughness.roughnessFactor = .92;
      if (material.alphaMode === 'BLEND' || material.alphaMode === 'MASK') {
        material.alphaMode = 'MASK'; material.alphaCutoff = .4;
        if (material.pbrMetallicRoughness.baseColorFactor) material.pbrMetallicRoughness.baseColorFactor[3] = 1;
      }
    }
    async function remap(object) {
      for (const [key, value] of Object.entries(object)) {
        if (!value || typeof value !== 'object') continue;
        if (key.endsWith('Texture') && value.index !== undefined) value.index = await copyTexture(value.index);
        else await remap(value);
      }
    }
    await remap(material);
    materialMap.set(index, out.materials.length); out.materials.push(material);
    return materialMap.get(index);
  }
  const indices = new Set();
  function select(index) { const node = json.nodes[index]; if (node.mesh !== undefined) indices.add(index); node.children?.forEach(select); }
  (selection || json.scenes[json.scene || 0].nodes).forEach(select);
  const rotate = new THREE.Matrix4().makeRotationY(rotation);
  for (const index of indices) {
    const node = json.nodes[index], mesh = json.meshes[node.mesh], primitives = [];
    for (const primitive of mesh.primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Only triangle meshes are supported');
      let filtered;
      if (crop) {
        const position = json.accessors[primitive.attributes.POSITION], pv = json.bufferViews[position.bufferView];
        const ia = primitive.indices === undefined ? null : json.accessors[primitive.indices], iv = ia && json.bufferViews[ia.bufferView];
        const count = ia ? ia.count : position.count;
        const readIndex = n => !ia ? n : ia.componentType === 5125 ? binary.readUInt32LE((iv.byteOffset || 0) + (ia.byteOffset || 0) + n * 4) : binary.readUInt16LE((iv.byteOffset || 0) + (ia.byteOffset || 0) + n * 2);
        const readPoint = n => { const offset = (pv.byteOffset || 0) + (position.byteOffset || 0) + n * (pv.byteStride || 12); return new THREE.Vector3(binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8)).applyMatrix4(matrices[index]); };
        filtered = [];
        for (let i = 0; i < count; i += 3) {
          const ids = [readIndex(i), readIndex(i + 1), readIndex(i + 2)], points = ids.map(readPoint), center = points.reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(3);
          if (crop(center, index, points)) filtered.push(...ids);
        }
        if (!filtered.length) continue;
      }
      const next = { ...primitive, attributes: {}, material: await copyMaterial(primitive.material) };
      if (filtered) {
        // Remove unused vertices too: otherwise glTF accessor bounds still include
        // the rest of the apartment and normalization shrinks the selected item.
        const unique = [...new Set(filtered)], remap = new Map(unique.map((id, i) => [id, i]));
        for (const [key, value] of Object.entries(primitive.attributes)) {
          const accessor = json.accessors[value], view = json.bufferViews[accessor.bufferView];
          const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
          const width = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType] * components;
          const bytes = Buffer.alloc(unique.length * width);
          unique.forEach((id, i) => { const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0) + id * (view.byteStride || width); binary.copy(bytes, i * width, offset, offset + width); });
          const copied = { ...accessor, bufferView: addBytes(bytes, { target: 34962 }), byteOffset: 0, count: unique.length };
          delete copied.min; delete copied.max;
          if (key === 'POSITION') {
            const bounds = new THREE.Box3();
            for (let i = 0; i < unique.length; i++) bounds.expandByPoint(new THREE.Vector3(bytes.readFloatLE(i * width), bytes.readFloatLE(i * width + 4), bytes.readFloatLE(i * width + 8)));
            copied.min = bounds.min.toArray(); copied.max = bounds.max.toArray();
          }
          next.attributes[key] = out.accessors.length; out.accessors.push(copied);
        }
        const array = new Uint32Array(filtered.map(id => remap.get(id)));
        next.indices = out.accessors.length;
        out.accessors.push({ bufferView: addBytes(Buffer.from(array.buffer), { target: 34963 }), componentType: 5125, count: array.length, type: 'SCALAR' });
        triangles += array.length / 3;
      } else {
        for (const [key, value] of Object.entries(primitive.attributes)) next.attributes[key] = copyAccessor(value);
        next.indices = primitive.indices === undefined ? undefined : copyAccessor(primitive.indices); triangles += json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
      }
      primitives.push(next);
    }
    if (!primitives.length) continue;
    out.scenes[0].nodes.push(out.nodes.length);
    out.nodes.push({ name: node.name, mesh: out.meshes.length, matrix: rotate.clone().multiply(matrices[index]).toArray() });
    out.meshes.push({ name: mesh.name, primitives });
  }
  out.extensionsUsed = (json.extensionsUsed || []).filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  out.extensionsRequired = (json.extensionsRequired || []).filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  out.buffers.push({ byteLength: length });
  const jsonBytes = Buffer.from(JSON.stringify(out)), jsonPadded = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 32); jsonBytes.copy(jsonPadded);
  const binPadded = Buffer.alloc(Math.ceil(length / 4) * 4); Buffer.concat(chunks).copy(binPadded);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonPadded.length + binPadded.length, 8); header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binPadded.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const bytes = Buffer.concat([header, jsonPadded, binHeader, binPadded]);
  await fs.writeFile(path.join(output, `${name}.glb`), bytes);
  const entry = { file: `${name}.glb`, original: file, bytes: bytes.length, triangles, sha256: createHash('sha256').update(bytes).digest('hex'), ...out.asset.extras };
  manifest.push(entry); console.log(`${name}: ${(bytes.length / 1048576).toFixed(2)} MiB, ${triangles} triangles`);
}

try {
 if(process.argv.includes('--hands')) {
  await prepare('female_hand.glb', 'female-hand', null, { textureSize:1024 });
  await fs.writeFile(path.join(output, 'hand-manifest.json'), JSON.stringify({generatedBy:'scripts/prepare-sketchfab.mjs --hands',assets:manifest},null,2)+'\n');
 } else {
  await prepare('realistic_tree.glb', 'tree-canopy', null, { tree: true });
  await prepare('pohon.glb', 'tree-garden', null, { tree: true });
  await prepare('pohon (1).glb', 'tree-slender', null, { tree: true });
  await prepare('scene.gltf', 'kitchen-counter', [6, 8], { rotation: -Math.PI / 2, crop: (p, index, points) => p.x < -3.3 && points.every(p => p.y < .95) && p.z > -2.5 && p.z < 2.1 });
  await prepare('scene.gltf', 'kitchen-oven', [10]);
  await prepare('scene.gltf', 'kitchen-pendants', [25], { rotation: -Math.PI / 2 });
  await prepare('modern_apartment.glb', 'apartment-fridge', [247]);
  await prepare('modern_apartment.glb', 'apartment-sofa', [95, 96, 97], { rotation: -Math.PI / 2, crop: (p, index) => index !== 95 || (p.x < -5.5 && p.z < 3.5) });
  await prepare('modern_apartment.glb', 'apartment-coffee', [83]);
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ generatedBy: 'scripts/prepare-sketchfab.mjs', assets: manifest }, null, 2) + '\n');
 }
} finally { await browser.close(); }
