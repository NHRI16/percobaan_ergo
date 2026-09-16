import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const NEIGHBORHOOD_BOUNDS = { minX: -57, maxX: 57, minZ: -65, maxZ: 22 };
export const GATE_Z = -18;

// An original, fictional Menteng-inspired residential street, in meter units.
export function buildNeighborhood(world, kit) {
  const { box, cyl, group, mat, surface, sign, tree, rod } = kit;
  const p = group(world.root);
  p.name = 'menteng-neighborhood';
  const ivory = mat('#ece9df', .87), charcoal = mat('#303b38', .66, .18);
  const limestone = mat('#c6bca8', .91), wood = surface('wood'), paving = surface('stone');
  const glass = mat('#739390', .16, .48), warmGlass = mat('#a4aaa0', .24, .28);
  const hedgeMat = mat('#496548', .94);
  const obstacle = (x, z, w, d) => world.colliders.push({ x, z, w, d });
  const frontSign = (parent, text, x, y, z, w, h) => {
    const holder = group(parent, x, y, z); holder.rotation.y = Math.PI;
    sign(holder, text, 0, 0, 0, w, h); return holder;
  };

  function glazing(parent, x, y, z, width, height, warm = false) {
    box(parent, width + .16, height + .16, .14, x, y, z, charcoal);
    box(parent, width, height, .035, x, y, z - .09, warm ? warmGlass : glass);
    const panels = Math.max(2, Math.round(width / 1.25));
    for (let i = 1; i < panels; i++) box(parent, .045, height, .07, x - width / 2 + width * i / panels, y, z - .12, charcoal);
    // Pale curtains and a narrow reflection accent give the glazing depth.
    for (const side of [-1, 1]) box(parent, .24, height - .1, .012, x + side * (width / 2 - .2), y, z - .117, mat('#bdc3b7', .87));
    box(parent, width * .8, .025, .014, x, y + height * .3, z - .121, mat('#bbd0ca', .25, .3));
  }

  function residence(x, z, { rotation = 0, number = '01', variant = 0, main = false } = {}) {
    const h = group(p, x, 0, z); h.rotation.y = rotation;
    const wall = variant === 1 ? mat('#dedbd0', .9) : ivory;
    box(h, 20, .2, 12.4, 0, .01, 6, paving);
    box(h, 18, 3.35, 10.6, 0, 1.78, 6, wall);
    box(h, 19.1, .27, 11.6, 0, 3.53, 5.7, ivory);
    box(h, 10.9, 3.05, 9.4, -3.3, 5.17, 6.05, wall);
    box(h, 6.4, 2.9, 8.3, 5.1, 5.09, 6.6, variant === 2 ? limestone : charcoal);
    box(h, 11.6, .25, 10, -3.3, 6.79, 6, ivory);
    box(h, 6.9, .22, 8.9, 5.15, 6.68, 6.6, ivory);
    // Deep eaves, a stone entry tower, timber soffits, and a sheltered balcony.
    box(h, 19.2, .09, 2.15, 0, 3.34, .81, wood);
    box(h, 2.1, 6.55, .32, 1.65, 3.31, .47, limestone);
    for (let i = 0; i < 10; i++) box(h, 2.12, .018, .027, 1.65, .4 + i * .61, .29, mat('#a79e8b', .95));
    glazing(h, -4.65, 1.76, .62, 6.6, 2.65, true);
    glazing(h, 5.45, 1.76, .62, 4.5, 2.65);
    glazing(h, -4.45, 5.13, 1.29, 7.5, 2.25);
    glazing(h, 5.1, 5.13, 2.39, 4.65, 2.1, true);
    box(h, 8.6, .16, 1.9, -4.45, 3.73, .49, paving);
    box(h, 8.5, .82, .055, -4.45, 4.22, -.43, mat('#8fa8a1', .2, .35));
    for (const yy of [3.83, 4.65]) box(h, 8.65, .045, .075, -4.45, yy, -.46, charcoal);
    for (const xx of [-8.68, -.22]) box(h, .05, .87, .075, xx, 4.23, -.46, charcoal);
    for (let i = 0; i < 13; i++) box(h, .085, 2.5, .18, 3.05 + i * .35, 5.17, 2.21, wood);
    // Side glazing and roof planting remain visible when walking around the lot.
    const sideWindow = group(h, -9.03, 0, 5.9); sideWindow.rotation.y = Math.PI / 2;
    glazing(sideWindow, 0, 1.8, 0, 6.8, 2.45);
    for (const xx of [-7.4, -1.7]) {
      box(h, 1.3, .35, .45, xx, 3.98, .45, ivory);
      box(h, 1.2, .35, .39, xx, 4.28, .45, hedgeMat, .1);
    }
    if (!main) {
      box(h, 1.2, 2.65, .16, 0, 1.43, .37, wood);
      box(h, .035, .66, .07, -.37, 1.25, .26, charcoal);
      frontSign(h, `RESIDENCE ${number}`, 1.67, 1.9, .28, 1.35, .22);
    } else frontSign(h, 'MENTENG HOUSE', 1.65, 2.52, .28, 1.55, .2);
    // Short, broad steps are visually shallow enough for the level walking surface.
    box(h, 3, .08, 1.35, -.1, .02, -.08, paving);
    const center = new THREE.Vector3(0, 0, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    obstacle(x + center.x, z + center.z, 18.3, 10.9);
    world.residences.push({ number, x, z, main });
    return h;
  }

  // Large lawns, a broad road, and walkable sidewalks on both sides.
  box(p, 150, .16, 125, 0, -.14, -19, surface('grass'));
  const asphalt = mat('#555c5b', .98);
  box(p, 120, .07, 8, 0, -.015, -25, asphalt);
  for (const z of [-19.6, -30.4]) {
    box(p, 120, .1, 2.8, 0, 0, z, paving);
    for (let i = -29; i <= 29; i++) box(p, .018, .005, 2.8, i * 2, .053, z, mat('#93998e', .94));
    box(p, 120, .16, .16, 0, .008, z + (z > -25 ? -1.45 : 1.45), limestone);
  }
  for (let x = -56; x < 58; x += 6) box(p, 2.3, .009, .085, x, .026, -25, mat('#ded9ba', .9));
  for (const z of [-21.3, -28.7]) box(p, 118, .008, .08, 0, .026, z, mat('#dbddce', .92));
  // Crosswalk, drains, and a green residential street sign.
  for (let z = -28.6; z < -21; z += 1.1) box(p, 2.1, .01, .5, 18, .03, z, mat('#e4e3d6', .95));
  for (const x of [-44, -22, 0, 22, 44]) for (const z of [-21.12, -28.88]) {
    box(p, .7, .016, .23, x, .032, z, charcoal);
    for (let i = 0; i < 6; i++) box(p, .025, .019, .19, x - .25 + i * .1, .043, z, mat('#88928b', .7, .3));
  }
  cyl(p, .055, .07, 3.35, 5.7, 1.675, -19.4, charcoal);
  sign(p, 'JL. TAMAN MENTENG', 5.7, 2.96, -19.37, 2.4, .42);
  frontSign(p, 'JL. TAMAN MENTENG', 5.7, 2.96, -19.43, 2.4, .42);
  obstacle(5.7, -19.4, .16, .16);

  world.residences = [];
  residence(0, 4.72, { main: true });
  for (const [x, number, variant] of [[-30, '03', 1], [30, '05', 2]]) residence(x, 1, { number, variant });
  for (const [x, number, variant] of [[-30, '02', 2], [0, '04', 1], [30, '06', 0]]) residence(x, -46, { number, variant, rotation: Math.PI });

  function frontFence(center, z, gap = 4.8, label = '01', reverse = false) {
    for (const side of [-1, 1]) {
      const width = 14 - gap / 2;
      const x = center + side * (gap / 2 + width / 2);
      box(p, width, .65, .28, x, .325, z, limestone);
      box(p, width, .08, .35, x, .69, z, ivory);
      for (let i = 0; i < Math.floor(width / .3); i++) box(p, .045, 1.12, .08, x - width / 2 + .15 + i * .3, 1.27, z, charcoal);
      box(p, width, .06, .1, x, 1.85, z, charcoal);
      obstacle(x, z, width, .32);
      box(p, .48, 2.15, .52, center + side * (gap / 2 + .12), 1.075, z, ivory);
      obstacle(center + side * (gap / 2 + .12), z, .48, .52);
    }
    frontSign(p, label, center - gap / 2 - .12, 1.36, z - .272, .32, .3);
    if (reverse) sign(p, label, center - gap / 2 - .12, 1.36, z + .272, .32, .3);
  }
  frontFence(0, GATE_Z);
  for (const x of [-30, 30]) frontFence(x, GATE_Z, 5.5, x < 0 ? '03' : '05');
  for (const [x, number] of [[-30, '02'], [0, '04'], [30, '06']]) frontFence(x, -33, 5.5, number, true);
  // Side and rear boundaries are physical; each property is reached through its driveway.
  for (const x of [-14, 14]) {
    box(p, .25, 1.75, 35.4, x, .875, -.3, ivory); obstacle(x, -.3, .25, 35.4);
    box(p, .38, .12, 35.5, x, 1.79, -.3, limestone);
    box(p, .7, 1.3, 25, x + (x < 0 ? .6 : -.6), .67, -2, hedgeMat, .12);
  }
  box(p, 28, 1.75, .25, 0, .875, 17.4, ivory); obstacle(0, 17.4, 28, .25);
  // The gate-to-door route continues the existing mission garden without moving objectives.
  box(p, 3.8, .055, 11, 0, .004, -12.5, paving);
  for (const x of [-30, 30]) box(p, 4.9, .055, 20, x, .004, -8.7, paving);
  for (const x of [-30, 0, 30]) box(p, 4.9, .055, 14, x, .004, -39, paving);
  for (let i = 0; i < 12; i++) box(p, 3.75, .007, .018, 0, .035, -17.5 + i * .9, mat('#90968b', .92));

  // A sunken ornamental pool and a shaded outdoor lounge fill the larger garden.
  box(p, 4.9, .12, 8.9, -8.9, .025, -10.9, limestone);
  box(p, 4.5, .035, 8.5, -8.9, .094, -10.9, mat('#397c78', .14, .42));
  for (let i = 0; i < 15; i++) box(p, 4.2, .002, .019, -8.9, .114, -14.7 + i * .54, mat('#88b1a0', .22, .35));
  obstacle(-8.9, -10.9, 4.8, 8.8);
  box(p, 6, .06, 7.5, 8.7, .005, -10.5, paving);
  for (const x of [6.1, 11.3]) for (const z of [-13.65, -7.35]) {
    box(p, .13, 2.9, .13, x, 1.45, z, charcoal); obstacle(x, z, .18, .18);
  }
  for (let i = 0; i < 17; i++) box(p, 5.7, .12, .1, 8.7, 2.92, -13.8 + i * .41, wood);
  for (const x of [6.05, 11.35]) box(p, .12, .19, 7.1, x, 2.79, -10.5, charcoal);
  for (const x of [7.3, 9.8]) {
    const lounge=group(p,x,0,-10.6);lounge.userData={propLabel:'Kursi santai taman',solidSize:[1.05,2.05]};
    box(lounge, 1.05, .22, 2.05, 0, .28, 0, wood);
    box(lounge, 1, .13, 1.9, 0, .46, 0, mat('#d8d5c5', .95), .05);
    box(lounge, 1, .16, .6, 0, .61, -.62, mat('#b3bea8', .96), .04);
  }

  // Mature tropical trees frame the street and provide recognizable landmarks.
  const trees = [[-11, 1, 2], [11.5, 2, 2.1], [-11.6, -16, 1.7], [11.5, -16, 1.85]];
  for (const x of [-49, -39, -22, -10, 11, 25, 41, 51]) for (const z of [-19.7, -30.5]) trees.push([x, z, 1.65 + (Math.abs(x) % 3) * .12]);
  for (const [x, z, scale] of trees) {
    tree(p, x, z, scale, Math.abs(Math.round(x * 31 + z * 7)));
    obstacle(x, z, .7, .7);
    if (z < -18) box(p, 1.25, .08, 1.25, x, .005, z, mat('#68705e', .98));
  }
  for (const x of [-44, -17, 17, 44]) {
    const z = -20.2;
    cyl(p, .055, .09, 4.2, x, 2.1, z, charcoal);
    rod(p, [x, 4.15, z], [x, 4.3, z - .8], .05, charcoal);
    box(p, .32, .1, .9, x, 4.28, z - .9, charcoal);
    box(p, .24, .02, .7, x, 4.22, z - .9, mat('#e9dfb6', .5));
    obstacle(x, z, .2, .2);
  }
  // A small parked car establishes the street's scale without blocking its sidewalks.
  for (const [x, z, color] of [[-24, -22.2, '#d6d8d3'], [34, -27.8, '#53665f']]) {
    const car = group(p, x, 0, z);
    box(car, 4.3, .64, 1.72, 0, .62, 0, mat(color, .3, .3), .15);
    box(car, 2.3, .66, 1.52, -.12, 1.15, 0, mat('#495d61', .17, .5), .14);
    box(car, 2.2, .1, 1.55, -.12, 1.51, 0, mat(color, .3, .3), .05);
    for (const xx of [-1.3, 1.3]) for (const zz of [-.82, .82]) {
      const wheel = cyl(car, .34, .34, .18, xx, .37, zz, mat('#343937', .94), 16); wheel.rotation.x = Math.PI / 2;
      const hub = cyl(car, .18, .18, .185, xx, .37, zz, mat('#9ea8a2', .3, .7), 12); hub.rotation.x = Math.PI / 2;
    }
    obstacle(x, z, 4.3, 1.8);
  }
  // Distant greenery and low silhouettes close the horizon beyond the walkable block.
  for (let x = -66; x <= 66; x += 11) for (const z of [-70, 29]) {
    tree(p, x, z, 2.4, Math.abs(x * 23 + z));
    box(p, 7, 6 + Math.abs(x % 4), 7, x, 2.8, z + (z < 0 ? -6 : 6), mat('#9aa59b', .95));
  }
  batchScenery(p);
}

// Keep the larger neighborhood inexpensive: static meshes share a draw call per
// material and spatial cell. Instanced leaf canopies retain their own culling.
function batchScenery(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map(), originals = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material)) return;
    // Tree placeholders must remain together for their asynchronous replacement.
    for (let parent = mesh.parent; parent && parent !== root; parent = parent.parent) if (parent.userData.treeSlot || parent.userData.propLabel) return;
    const position = mesh.getWorldPosition(new THREE.Vector3());
    const key = `${mesh.material.uuid}/${Math.floor(position.x / 24)}/${Math.floor(position.z / 24)}`;
    if (!batches.has(key)) batches.set(key, { material: mesh.material, geometries: [] });
    const copy = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    copy.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    batches.get(key).geometries.push(copy); originals.push(mesh);
  });
  for (const { material, geometries } of batches.values()) {
    const merged = mergeGeometries(geometries);
    geometries.forEach(geo => geo.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.transientGeometry = true;
    merged.computeBoundingSphere(); root.add(mesh);
  }
  originals.forEach(mesh => mesh.removeFromParent());
}
