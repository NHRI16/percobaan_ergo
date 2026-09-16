import * as THREE from 'three';

export function buildCooking(stove) {
  const pot = new THREE.Group(); pot.position.set(-.16, .035, -.13); stove.add(pot);
  const metal = new THREE.MeshStandardMaterial({ color: '#b8c4c1', metalness: .65, roughness: .3 });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.113, .10, .13, 24, 1, true), metal); bowl.position.y = .087; pot.add(bowl);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(.108, 24), new THREE.MeshStandardMaterial({ color: '#d9974a', roughness: .5 })); soup.rotation.x = -Math.PI / 2; soup.position.y = .14; pot.add(soup);
  for (let i = 0; i < 7; i++) { const vegetable = new THREE.Mesh(new THREE.BoxGeometry(.022, .009, .018), new THREE.MeshStandardMaterial({ color: i % 2 ? '#6e994e' : '#ebbd73' })); vegetable.position.set(Math.sin(i * 2.4) * .07, .145, Math.cos(i * 2.4) * .065); pot.add(vegetable); }
  const handle = new THREE.Group(); pot.add(handle);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.014, .018, .22, 8), new THREE.MeshStandardMaterial({ color: '#35473d', roughness: .8 })); grip.rotation.x = Math.PI / 2; grip.position.set(0, .1, .2); handle.add(grip);
  const flames = new THREE.Group(); pot.add(flames);
  const flameMaterial = new THREE.MeshStandardMaterial({ color: '#559eff', emissive: '#258cff', emissiveIntensity: 2, transparent: true, opacity: .86 });
  for (let i = 0; i < 12; i++) { const flame = new THREE.Mesh(new THREE.ConeGeometry(.012, .045, 6), flameMaterial); flame.position.set(Math.sin(i * Math.PI / 6) * .086, .01, Math.cos(i * Math.PI / 6) * .086); flames.add(flame); }
  const steam = new THREE.Group(); pot.add(steam);
  const steamMaterial = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: .18, depthWrite: false });
  for (let i = 0; i < 5; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(.028, 8, 6), steamMaterial); steam.add(puff); }
  const spoon = new THREE.Mesh(new THREE.CylinderGeometry(.006, .008, .25, 8), new THREE.MeshStandardMaterial({ color: '#ac8656', roughness: .8 })); spoon.position.set(.04, .23, 0); spoon.rotation.z = -.35; pot.add(spoon);
  let state = { on: false, handle: 0, stirred: false, served: false }, time = 0;
  return {
    targets(camera) {
      pot.updateWorldMatrix(true, true);
      return { right: camera.worldToLocal(spoon.localToWorld(new THREE.Vector3(0, .105, 0))), left: camera.worldToLocal(handle.localToWorld(new THREE.Vector3(0, .105, .23))) };
    },
    update(next) { state = next; flames.visible = next.on; steam.visible = next.on; handle.rotation.y = next.handle ? -Math.PI / 2 : 0; soup.material.color.set(next.served ? '#c88b41' : '#d9974a'); },
    tick(dt) { time += dt; flames.scale.y = 1 + Math.sin(time * 13) * .15; steam.children.forEach((puff, i) => { const t = (time * .35 + i / 5) % 1; puff.position.set(Math.sin(time + i) * .04, .17 + t * .35, Math.cos(time + i) * .03); puff.scale.setScalar(.45 + t); }); if (state.stirring) { spoon.position.x = Math.sin(time * 9) * .065; spoon.position.z = Math.cos(time * 9) * .065; } },
  };
}
