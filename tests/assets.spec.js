import { test, expect } from '@playwright/test';
import path from 'node:path';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await expect(page.locator('#loading')).toBeHidden();
  if (await page.locator('#skip-tutorial').isVisible()) await page.locator('#skip-tutorial').click();
  await page.locator('#mission-list [data-object="chair"]').click();
  await expect(page.locator('#inspector')).toBeVisible();
}

function monitorNetwork(page) {
  const external = [], errors = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) external.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  return { external, errors };
}

// A textured tetrahedron with independent buffer/image files, kept in memory.
// Subdirectory URIs exercise glTF packages selected through a flat file picker.
function multipartFixture({ name = 'local-fixture.gltf', bufferURI = 'meshes/fixture.bin', imageURI = 'textures/checker.png', includeBuffer = true, includeImage = true } = {}) {
  const positions = new Float32Array([-.5, 0, -.5, .5, 0, -.5, 0, 1, 0, 0, 0, .5]);
  const uv = new Float32Array([0, 0, 1, 0, .5, 1, 1, 1]);
  const indices = new Uint16Array([0, 2, 1, 1, 2, 3, 3, 2, 0, 0, 1, 3]);
  const buffer = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(uv.buffer), Buffer.from(indices.buffer)]);
  const model = {
    asset: { version: '2.0', generator: 'ErgoFlip import regression fixture' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    buffers: [{ uri: bufferURI, byteLength: buffer.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: uv.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positions.byteLength + uv.byteLength, byteLength: indices.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', min: [-.5, 0, -.5], max: [.5, 1, .5] },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC2' },
      { bufferView: 2, componentType: 5123, count: 12, type: 'SCALAR' },
    ],
    images: [{ uri: imageURI }], textures: [{ source: 0 }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: .8 } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 }] }],
  };
  const files = [{ name, mimeType: 'model/gltf+json', buffer: Buffer.from(JSON.stringify(model)) }];
  if (includeBuffer) files.push({ name: 'fixture.bin', mimeType: 'application/octet-stream', buffer });
  if (includeImage) files.push({ name: 'checker.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGO4syDqPwAHCALWi+O7NwAAAABJRU5ErkJggg==', 'base64') });
  return files;
}

async function assertRetainedModel(page, filename) {
  await page.locator('#close-inspector').click();
  await page.locator('#mission-list [data-object="chair"]').click();
  await expect(page.locator('#model-credit')).toContainText(filename);
  await expect(page.locator('#object-name')).toHaveText('Kursi & meja kerja');
}

test('local GLB imports, remains interactive, and creator/source render as plain text per object', async ({ page }) => {
  const { external, errors } = monitorNetwork(page);
  await ready(page);
  const score = await page.locator('#score').textContent();
  await page.locator('.model-credit-fields summary').click();
  const author = '<img src=x onerror="window.creditExecuted=true">';
  const source = 'https://example.invalid/?credit=<svg onload=window.creditExecuted=true>';
  await page.locator('#model-author').fill(author);
  await page.locator('#model-source').fill(source);
  await expect(page.locator('#model-credit')).toContainText(author);
  await expect(page.locator('#model-credit')).toContainText(source);
  await expect(page.locator('#model-credit img, #model-credit svg, #model-credit script, #model-credit a')).toHaveCount(0);
  await page.locator('#model-input').setInputFiles(path.resolve('assets/models/sheen-chair.glb'));
  await expect(page.locator('#toast')).toContainText('Model dimuat.');
  await expect(page.locator('#model-credit')).toContainText('sheen-chair.glb');
  await expect(page.locator('#score')).toHaveText(score);

  await page.locator('#control-height').evaluate(input => { input.value = '46'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(await page.evaluate(() => window.ergoDebug.snapshot().state.rooms.office.chair.height)).toBe(46);
  await page.locator('#close-inspector').click();
  await page.keyboard.press('f');
  await expect(page.locator('#inspector')).toBeVisible();
  await expect(page.locator('#object-name')).toHaveText('Kursi & meja kerja');
  await page.locator('#mission-list [data-object="monitor"]').click();
  await expect(page.locator('#model-author')).toHaveValue('');
  await expect(page.locator('#model-source')).toHaveValue('');
  await page.locator('#mission-list [data-object="chair"]').click();
  await expect(page.locator('#model-author')).toHaveValue(author);
  await expect(page.locator('#model-source')).toHaveValue(source);
  expect(await page.evaluate(() => window.creditExecuted)).toBeUndefined();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('multipart glTF resolves selected local buffers/textures and preserves object after missing dependencies', async ({ page }) => {
  const { external, errors } = monitorNetwork(page);
  await ready(page);
  const score = await page.locator('#score').textContent();
  await page.locator('#model-input').setInputFiles(multipartFixture());
  await expect(page.locator('#toast')).toContainText('Model dimuat.');
  await expect(page.locator('#model-credit')).toContainText('local-fixture.gltf');
  await expect(page.locator('#score')).toHaveText(score);

  for (const missing of [
    multipartFixture({ name: 'missing-buffer.gltf', includeBuffer: false }),
    multipartFixture({ name: 'missing-texture.gltf', includeImage: false }),
    multipartFixture({ name: 'remote-buffer.gltf', bufferURI: 'https://example.invalid/not-selected.bin', includeBuffer: false }),
    multipartFixture({ name: 'remote-texture.gltf', imageURI: 'https://example.invalid/not-selected.png', includeImage: false }),
  ]) {
    await page.locator('#model-input').setInputFiles(missing);
    await expect(page.locator('#toast')).toContainText('Model tidak dapat dimuat.');
    await assertRetainedModel(page, 'local-fixture.gltf');
    await expect(page.locator('#score')).toHaveText(score);
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
