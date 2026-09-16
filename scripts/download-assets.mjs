// Reproducible downloads from the publishers' public asset endpoints only.
// Run: node scripts/download-assets.mjs
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../assets/', import.meta.url));
const assets = [
  ['wood_floor', 'Dimitrios Savva'],
  ['leafy_grass', 'Charlotte Baglioni'],
  ['plaster_grey_04', 'Rob Tuytel'],
  ['concrete_floor_worn_001', 'Dimitrios Savva and Rico Cilliers'],
];
const manifest = { generated: new Date().toISOString(), license: 'CC0-1.0', files: [] };
async function get(url) {
  const host = new URL(url).hostname;
  if (!['api.polyhaven.com', 'dl.polyhaven.org', 'raw.githubusercontent.com'].includes(host)) throw new Error('Unrecognized publisher: ' + host);
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status} downloading ${url}`);
  return response;
}
async function download(url, relative, expectedMD5) {
  const destination = path.resolve(root, relative);
  if (!destination.startsWith(root)) throw new Error('Destination must stay in assets');
  let data;
  try {
    const existing = await readFile(destination);
    if (expectedMD5 && createHash('md5').update(existing).digest('hex') === expectedMD5) data = existing;
  } catch {}
  if (!data) data = Buffer.from(await (await get(url)).arrayBuffer());
  const md5 = createHash('md5').update(data).digest('hex');
  if (expectedMD5 && md5 !== expectedMD5) throw new Error('Publisher checksum mismatch: ' + relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data);
  return { path: relative.replaceAll('\\', '/'), url, bytes: data.length, md5, sha256: createHash('sha256').update(data).digest('hex') };
}
for (const [id, author] of assets) {
  const files = await (await get('https://api.polyhaven.com/files/' + id)).json();
  for (const channel of ['Diffuse', 'nor_gl', 'Rough']) {
    const remote = files[channel]['1k'].jpg;
    const relative = 'textures/' + id + '/' + path.basename(new URL(remote.url).pathname);
    const file = await download(remote.url, relative, remote.md5);
    manifest.files.push({ ...file, source: 'https://polyhaven.com/a/' + id, author, license: 'CC0-1.0', channel });
    console.log(`${relative}: ${(file.bytes / 1024).toFixed(0)} KiB (verified)`);
  }
}
const modelURL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb';
const chair = await download(modelURL, 'models/sheen-chair.glb');
const header = await readFile(path.join(root, chair.path));
if (header.readUInt32LE(0) !== 0x46546c67 || header.readUInt32LE(4) !== 2) throw new Error('Expected glTF 2 binary');
manifest.files.push({ ...chair, source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair', author: 'Eric Chadwick / Wayfair LLC (2020)', license: 'CC0-1.0', channel: 'model' });
await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Local pack: ${(manifest.files.reduce((sum, file) => sum + file.bytes, 0) / 1024 / 1024).toFixed(2)} MiB`);
