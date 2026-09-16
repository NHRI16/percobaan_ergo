import {test,expect} from '@playwright/test';

test('female hand pair: loaded skeletons, actual GLB clips, independent fingers and interaction poses',async({page})=>{
 const errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('female'))downloads.push(r.url());});
 await page.goto('/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#skip-tutorial').click();
 const hands=await page.evaluate(()=>window.ergoDebug.snapshot().hands);
 expect(hands.status).toBe('ready');expect(hands.model).toBe('female_hand.glb');expect(hands.sides).toMatchObject([{side:'left',bones:23,mirrored:true},{side:'right',bones:23,mirrored:false}]);
 expect(hands.clips).toEqual(expect.arrayContaining(['Idle','Reach','Grip','Pinch','Stir','Clean','Release']));
 expect(downloads).toHaveLength(1);expect(downloads[0]).toContain('/assets/models/sketchfab/female-hands-rigged.glb');
 // Exercise the exported animation itself, independent of the game's procedural blending.
 const animation=await page.evaluate(async()=>{
  const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const gltf=await new GLTFLoader().loadAsync('/assets/models/sketchfab/female-hands-rigged.glb');
  const bone=gltf.scene.getObjectByName('Right_index_1'),before=bone.quaternion.toArray(),mixer=new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(gltf.animations.find(c=>c.name==='Grip')).play();mixer.update(.45);
  let finite=true;gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=mesh.getVertexPosition(i,new THREE.Vector3());finite&&=Number.isFinite(p.length())&&p.length()<.5;}});
  return {before,after:bone.quaternion.toArray(),finite};
 });
 expect(animation.after).not.toEqual(animation.before);expect(animation.finite).toBe(true);
 await page.locator('#mission-list [data-object="chair"]').click();await page.locator('#move-object').click();
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().hands.pose)).toBe('carry');
 await page.waitForTimeout(500);const gripping=await page.evaluate(()=>window.ergoDebug.snapshot().hands);
 expect(gripping.sides[0].curls[2]).toBeGreaterThan(hands.sides[0].curls[2]+.25);
 await page.screenshot({path:'artifacts/female-hands-carrying.png'});
 await page.locator('#cancel-object').click();await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().hands.pose)).toBe('idle');
 await page.waitForTimeout(500);await page.screenshot({path:'artifacts/female-hands-idle.png'});
 expect(errors).toEqual([]);
});

test('hand model failure retains functional fallback hands and interactions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/female-hands-rigged.glb',route=>route.abort());
 await page.goto('/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#skip-tutorial').click();
 expect(await page.evaluate(()=>window.ergoDebug.snapshot().hands.status)).toBe('fallback');
 await page.locator('#mission-list [data-object="chair"]').click();await page.locator('#move-object').click();
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().hands.pose)).toBe('carry');await page.locator('#cancel-object').click();expect(errors).toEqual([]);
});
