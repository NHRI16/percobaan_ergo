import * as THREE from 'three';

const belongsTo = (node, parent) => { for (let n = node; n; n = n.parent) if (n === parent) return true; return false; };
function boundsOf(group) {
  group.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  group.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.userData.hitProxy) return;
    mesh.geometry.computeBoundingBox(); bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  });
  return bounds;
}

/** Carries a visual copy while validating the full-size placement against the room. */
export class ObjectMover {
  constructor(world) { this.world = world; this.active = null; this.ray = new THREE.Raycaster(); }
  contains(group) { return !!this.active?.entries.some(e => belongsTo(group, e.group)); }
  begin(id) {
    const w = this.world, entry = w.objects.get(id);
    if (this.active || w.carrying || !entry || ['dirt', 'gate', 'exit', 'entrance'].includes(id)) return false;
    const group = entry.group, bounds = boundsOf(group);
    if (bounds.isEmpty() || w.camera.getWorldPosition(new THREE.Vector3()).distanceTo(bounds.getCenter(new THREE.Vector3())) > 4) return false;
    const entries = [entry];
    if (id === 'desk') for (const key of ['monitor', 'keyboard', 'lamp', 'desktop-decor']) { const e = w.objects.get(key); if (e) entries.push(e); }
    if (id === 'bench') { const e = w.objects.get('lamp'); if (e) entries.push(e); }
    const start = entries.map(e => ({ position: e.group.position.clone(), rotation: e.group.rotation.y, world: e.group.getWorldPosition(new THREE.Vector3()), placement: structuredClone(w.placements[e.group.userData.id] || { offset: [0, 0, 0], rotation: 0 }) }));
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const held = group.clone(true), heldRoot = new THREE.Group();
    held.position.sub(group.parent.worldToLocal(center.clone())); held.rotation.copy(group.rotation);
    heldRoot.add(held); heldRoot.scale.setScalar(Math.min(1, .58 / Math.max(size.x, size.y, size.z)));
    heldRoot.position.set(0, -.29, -.79); w.camera.add(heldRoot);
    held.traverse(mesh => { if (mesh.userData.hitProxy) mesh.visible = false; if (mesh.isMesh) { mesh.castShadow = false; mesh.receiveShadow = false; } });
    const marker = new THREE.Box3Helper(bounds.clone(), '#c2e5a0'); w.scene.add(marker);
    this.active = { id, entries, start, bounds, size, center, heldRoot, marker, angle: 0, valid: false, target: center.clone(), small: Math.max(size.x, size.z) < 1.1 && size.y < 1.65 };
    entries.forEach(e => { e.group.visible = false; }); w.outline.visible = false; w.hands.perform('reach');
    this.tick(); w.renderer.shadowMap.needsUpdate = true; return true;
  }
  gripTargets(){const a=this.active;if(!a)return null;const size=a.size.clone().multiplyScalar(a.heldRoot.scale.x),c=Math.abs(Math.cos(a.angle)),s=Math.abs(Math.sin(a.angle)),half=(size.x*c+size.z*s)/2;const center=a.heldRoot.position;return {pinch:Math.min(size.x,size.y,size.z)<.055,left:new THREE.Vector3(center.x-half+.009,center.y,center.z+size.z*.17),right:new THREE.Vector3(center.x+half-.009,center.y,center.z+size.z*.17)};}
  rotate() { if (this.active) { this.active.angle += Math.PI / 4; this.tick(); } }
  tick() {
    const a = this.active, w = this.world; if (!a) return;
    const pose=[...w.camera.position.toArray(),...w.camera.rotation.toArray(),a.angle,w.assetState.pending].join('/');if(a.lastPose===pose)return;a.lastPose=pose;
    const camera = w.camera.getWorldPosition(new THREE.Vector3()), forward = w.camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0; forward.normalize();
    const distance = Math.min(3, 1.15 + Math.max(a.size.x, a.size.z) * .55);
    const center = camera.clone().addScaledVector(forward, distance);
    this.ray.set(new THREE.Vector3(center.x, 2.7, center.z), new THREE.Vector3(0, -1, 0)); this.ray.far = 4;
    w.root.updateMatrixWorld(true);
    const hits = this.ray.intersectObject(w.root, true).filter(hit => {
      for (let n = hit.object; n && n !== w.root; n = n.parent) if (!n.visible || n.userData.hitProxy || this.contains(n)) return false;
      const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld);
      return normal?.y > .65 && hit.point.y < (a.small ? 1.65 : .16);
    });
    const floor = hits[0];
    center.y = (floor?.point.y ?? 0) + .008 + a.size.y / 2;
    const c = Math.abs(Math.cos(a.angle)), s = Math.abs(Math.sin(a.angle));
    const size = new THREE.Vector3(c * a.size.x + s * a.size.z, a.size.y, s * a.size.x + c * a.size.z);
    const candidate = new THREE.Box3().setFromCenterAndSize(center, size), b = w.bounds;
    a.valid = !!floor && candidate.min.x >= b.minX && candidate.max.x <= b.maxX && candidate.min.z >= b.minZ && candidate.max.z <= b.maxZ;
    const player = new THREE.Box3(new THREE.Vector3(camera.x - .2, 0, camera.z - .2), new THREE.Vector3(camera.x + .2, 1.7, camera.z + .2));
    if (candidate.intersectsBox(player)) a.valid = false;
    const inner = candidate.clone(); inner.min.addScalar(.018); inner.max.addScalar(-.018);
    for (const [id, e] of w.objects) {
      if (id === 'dirt' || !e.group.visible || this.contains(e.group) || a.entries.some(held => belongsTo(held.group, e.group))) continue;
      const other = boundsOf(e.group); if (!other.isEmpty() && inner.intersectsBox(other)) { a.valid = false; break; }
    }
    // Static walls, fences, pools and terrain barriers are represented by room colliders.
    for (const collider of w.colliders) {
      const other = new THREE.Box3(new THREE.Vector3(collider.x - collider.w / 2, .18, collider.z - collider.d / 2), new THREE.Vector3(collider.x + collider.w / 2, 3, collider.z + collider.d / 2));
      if (inner.intersectsBox(other)) { a.valid = false; break; }
    }
    a.target.copy(center); a.marker.box.copy(candidate); a.marker.material.color.set(a.valid ? '#b6e493' : '#ed907c');
    a.heldRoot.rotation.y = a.angle; w.renderer.shadowMap.needsUpdate = true;
  }
  finish() {
    const a = this.active, w = this.world; if (!a?.valid) return false;
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a.angle);
    a.entries.forEach((e, i) => {
      const start = a.start[i], target = start.world.clone().sub(a.center).applyQuaternion(rotation).add(a.target);
      e.group.position.copy(e.group.parent.worldToLocal(target)); e.group.rotation.y = start.rotation + a.angle; e.group.visible = true;
      const offset = new THREE.Vector3(...start.placement.offset).add(e.group.position.clone().sub(start.position));
      const placement = { offset: offset.toArray(), rotation: start.placement.rotation + a.angle };
      w.placements[e.group.userData.id] = placement; e.appliedPlacement = structuredClone(placement); w.updateHitBox(e.group.userData.id);
    });
    if(a.id==='garden-bench'&&w.values.carry?.delivered){w.removePlacement('carry');delete w.placements.carry;w.update('carry',w.values.carry);}
    this.dispose(); w.hands.perform('release'); w.renderer.shadowMap.needsUpdate = true; return true;
  }
  cancel() { if (!this.active) return; this.active.entries.forEach(e => { e.group.visible = true; }); this.dispose(); this.world.renderer.shadowMap.needsUpdate = true; }
  dispose() { const a = this.active; a.heldRoot.removeFromParent(); a.marker.removeFromParent(); a.marker.geometry.dispose(); a.marker.material.dispose(); this.active = null; }
  snapshot() { const a = this.active; return a ? { id: a.id, valid: a.valid, target: a.target.toArray(), rotation: a.angle, small: a.small } : null; }
}
