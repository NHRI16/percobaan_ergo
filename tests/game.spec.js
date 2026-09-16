import {test,expect} from '@playwright/test';
async function ready(page,{tutorial=false}={}){await page.goto('/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await expect(page.locator('#loading')).toBeHidden();if(!tutorial&&await page.locator('#skip-tutorial').isVisible())await page.locator('#skip-tutorial').click();}
async function setRange(page,key,value){await page.locator('#control-'+key).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function choose(page,key,value){await page.locator(`[data-choice="${key}"][data-value="${value}"]`).click();}
async function select(page,id){await page.locator(`#mission-list [data-object="${id}"]`).click();await expect(page.locator('#inspector')).toBeVisible();}
async function cleanAll(page){await select(page,'dirt');while(await page.locator('#clean-next').isEnabled()){await page.locator('#clean-next').click();await expect(page.locator('#toast')).toContainText(/Area bersih/);}}
async function hold(page,keys,duration){for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(duration);for(const key of keys)await page.keyboard.up(key);}
async function walkTo(page,x,z,tolerance=.7){
 // Use the same WASD controls as a player. Telemetry only reads our position.
 for(let attempt=0;attempt<100;attempt++){
  const {camera,rotation}=await page.evaluate(()=>window.ergoDebug.snapshot());const dx=x-camera[0],dz=z-camera[2];
  if(Math.hypot(dx,dz)<tolerance)return;
  const yaw=rotation[1],forward=-Math.sin(yaw)*dx-Math.cos(yaw)*dz,strafe=Math.cos(yaw)*dx-Math.sin(yaw)*dz;
  const keys=[];if(Math.abs(forward)>Math.abs(strafe)*.4)keys.push(forward>0?'w':'s');if(Math.abs(strafe)>Math.abs(forward)*.4)keys.push(strafe>0?'d':'a');
  await hold(page,keys,180);
 }
 const snapshot=await page.evaluate(()=>window.ergoDebug.snapshot());throw new Error(`WASD did not reach (${x}, ${z}); camera=${snapshot.camera}, carrying=${snapshot.carrying}`);
}
async function dragLook(page,dx=75,dy=0){
 const point=await page.locator('#viewport canvas').evaluate(canvas=>{const r=canvas.getBoundingClientRect();for(const y of [.35,.45,.25,.55])for(const x of [.4,.5,.6]){const p={x:r.x+r.width*x,y:r.y+r.height*y};if(document.elementFromPoint(p.x,p.y)===canvas)return p;}throw new Error('No unobstructed canvas area for camera drag');});
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.mouse.up();
}

test('Menteng neighborhood: physical gate, street, neighboring residence and return home',async({page})=>{
 test.setTimeout(150000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await ready(page);
 await expect(page.locator('#neighborhood-button')).toBeHidden();
 await page.locator('#outdoor-button').click();await page.keyboard.press('f');
 await expect(page.locator('#neighborhood-button')).toBeVisible();
 const initial=await page.evaluate(()=>window.ergoDebug.snapshot());
 expect(initial.neighborhood.residences).toHaveLength(6);
 expect(initial.neighborhood.gateOpen).toBe(false);
 await page.locator('#neighborhood-button').click();
 await expect(page.locator('#focus-name')).toHaveText('Gerbang Taman Menteng');
 await hold(page,['w'],1300);
 expect((await page.evaluate(()=>window.ergoDebug.snapshot().camera))[2]).toBeGreaterThan(-17.8);
 await page.keyboard.press('f');
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().neighborhood.gateProgress)).toBe(1);
 await walkTo(page,1,-20,.3);
 expect((await page.evaluate(()=>window.ergoDebug.snapshot().camera))[2]).toBeLessThan(-18.5);
 await expect(page.locator('#neighborhood-location')).toContainText('kembali ke gerbang');
 await page.screenshot({path:'test-results/menteng-street-preview.png'});
 await walkTo(page,6,-31.2,.3);await hold(page,['w'],1100);
 // The opposite fence is solid; entry is through the center of its driveway.
 expect((await page.evaluate(()=>window.ergoDebug.snapshot().camera))[2]).toBeGreaterThan(-32.8);
 await walkTo(page,0,-31.2,.3);await walkTo(page,0,-41,.4);
 const visited=await page.evaluate(()=>window.ergoDebug.snapshot());
 expect(visited.camera[2]).toBeLessThan(-40);
 expect(visited.room).toBe('outdoor');expect(visited.state.xp).toBe(initial.state.xp);
 await page.screenshot({path:'test-results/menteng-neighbor-preview.png'});
 await page.locator('#neighborhood-button').click();await page.keyboard.press('f');
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().neighborhood.gateProgress)).toBe(0);
 await page.locator('#neighborhood-button').click();await page.keyboard.press('f');
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().neighborhood.gateProgress)).toBe(1);
 await walkTo(page,1,-16,.3);
 await page.locator('#outdoor-button').click();await page.keyboard.press('f');
 await expect(page.locator('#header-room')).toHaveText('Kantor Fokus');
 await expect(page.locator('#neighborhood-button')).toBeHidden();expect(errors).toEqual([]);
});
test('full career: real controls, cleaning, practice, scores, persistence and single rewards',async({page})=>{
 test.setTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await expect(page.locator('#mission-count')).toHaveText('0 / 5');await expect(page.locator('[data-room="1"]')).toBeDisabled();await expect(page.locator('#submit-project')).toBeDisabled();
 await select(page,'chair');await setRange(page,'height',46);await setRange(page,'back',105);await setRange(page,'deskHeight',73);
 await select(page,'monitor');await setRange(page,'height',120);await setRange(page,'distance',65);
 await select(page,'keyboard');await setRange(page,'reach',28);await setRange(page,'tilt',4);
 await select(page,'lamp');await setRange(page,'lux',400);await choose(page,'direction',1);await cleanAll(page);
 await expect(page.locator('#score')).toHaveText('100');await expect(page.locator('#mission-count')).toHaveText('5 / 5');await page.locator('#close-inspector').click();await page.locator('#submit-project').click();await expect(page.locator('#xp')).toHaveText('250');await page.locator('#next-project').click();await expect(page.locator('#header-room')).toHaveText('Dapur Mengalir');
 await select(page,'counter');await setRange(page,'height',90);await select(page,'fridge');await setRange(page,'x',.5);await setRange(page,'z',0);await expect(page.locator('#object-feedback')).toContainText('Jarak aktual');await select(page,'shelf');await setRange(page,'height',100);await select(page,'cart');await setRange(page,'x',-2);await page.locator('[data-rotate]').click();await cleanAll(page);await expect(page.locator('#score')).toHaveText('100');await page.locator('#close-inspector').click();await page.locator('#submit-project').click();await expect(page.locator('#xp')).toHaveText('600');await page.locator('#next-project').click();
 await select(page,'broom');await page.locator('#practice-activity').click();await expect(page.locator('#toast')).toContainText('Postur belum sesuai');await setRange(page,'length',130);await choose(page,'posture',1);await page.locator('#practice-activity').click();await expect(page.locator('#practice-activity')).toContainText('Ulangi latihan');
 await select(page,'mop');await setRange(page,'length',140);await choose(page,'posture',1);await page.locator('#practice-activity').click();await expect(page.locator('#practice-activity')).toContainText('Ulangi latihan');
 await select(page,'box');await choose(page,'posture',1);await page.locator('#practice-activity').click();await expect(page.locator('#practice-activity')).toContainText('Ulangi latihan');await select(page,'sofa');await setRange(page,'x',-2.2);await cleanAll(page);await expect(page.locator('#score')).toHaveText('100');await page.locator('#close-inspector').click();await page.locator('#submit-project').click();await expect(page.locator('#xp')).toHaveText('1.050');await page.locator('#next-project').click();
 await expect(page.locator('#header-room')).toHaveText('Halaman Aman');await expect(page.locator('[data-room="4"]')).toBeDisabled();
 await select(page,'planter');await setRange(page,'height',93);await select(page,'path');await setRange(page,'x',2.5);
 await select(page,'light');await setRange(page,'lux',150);await choose(page,'direction',1);await cleanAll(page);
 await select(page,'carry');await page.locator('#practice-activity').click();await expect(page.locator('#toast')).toContainText('Postur belum sesuai');
 await choose(page,'posture',1);await page.locator('#practice-activity').click();await expect(page.locator('#inspector')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().carrying)).toBe(true);
 await page.keyboard.press('f');await expect(page.locator('#toast')).toContainText('Belum sampai');
 expect(await page.evaluate(()=>window.ergoDebug.snapshot().state.rooms.outdoor.carry.delivered)).toBe(false);
 await expect(page.locator('#deliver-carry')).toBeDisabled();
 await walkTo(page,-1.3,1.8);await walkTo(page,-1.3,-2.3,.45);
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().deliveryDistance)).toBeLessThanOrEqual(1.8);
 await expect(page.locator('#deliver-carry')).toBeEnabled();
 await page.keyboard.press('f');await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().carrying)).toBe(false);
 await expect(page.locator('#score')).toHaveText('100');await page.locator('#submit-project').click();await expect(page.locator('#xp')).toHaveText('1.550');await page.locator('#next-project').click();
 await select(page,'bench');await setRange(page,'height',96);await select(page,'tools');await setRange(page,'height',120);await setRange(page,'reach',30);await select(page,'lamp');await setRange(page,'lux',600);await choose(page,'direction',1);await select(page,'cart');await setRange(page,'x',-2);await cleanAll(page);await expect(page.locator('#score')).toHaveText('100');await page.locator('#close-inspector').click();await page.locator('#submit-project').click();await expect(page.locator('#xp')).toHaveText('2.100');await expect(page.locator('#modal-content')).toContainText('SELURUH PROYEK SELESAI');await page.locator('#close-modal').click();
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await expect(page.locator('#score')).toHaveText('100');await expect(page.locator('#xp')).toHaveText('2.100');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#skip-tutorial')).toHaveCount(0);await page.locator('#submit-project').click();await expect(page.locator('#modal-content')).toContainText('Reward sudah diklaim');await expect(page.locator('#xp')).toHaveText('2.100');expect(errors).toEqual([]);
});
test('desktop: F raycast, movement bounds, settings, models and unsupported VR',async({page})=>{
 await ready(page);await select(page,'chair');await page.locator('#close-inspector').click();await page.keyboard.press('f');await expect(page.locator('#object-name')).toHaveText('Kursi & meja kerja');await expect(page.locator('#inspector')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#resume-game')).toBeVisible();await page.locator('#resume-game').click();
 const before=await page.evaluate(()=>window.ergoDebug.snapshot().camera);await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');const after=await page.evaluate(()=>window.ergoDebug.snapshot().camera);expect(Math.hypot(after[0]-before[0],after[2]-before[2])).toBeGreaterThan(.1);
 await page.keyboard.down('s');await page.waitForTimeout(3500);await page.keyboard.up('s');const bounded=await page.evaluate(()=>window.ergoDebug.snapshot().camera);expect(Math.abs(bounded[0])).toBeLessThanOrEqual(4.16);expect(Math.abs(bounded[2])).toBeLessThanOrEqual(3.66);
 await page.locator('#settings-button').click();await page.locator('#quality-select').selectOption('low');await page.locator('#labels-toggle').uncheck();await page.locator('#close-modal').click();await expect(page.locator('.world-label:visible')).toHaveCount(0);await page.locator('#vr-button').click();await expect(page.locator('#modal-content')).toContainText('headset');await page.locator('#close-modal').click();
 await select(page,'chair');await page.locator('#model-input').setInputFiles({name:'broken.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('not a valid glb')});await expect(page.locator('#toast')).toContainText('Model tidak dapat dimuat');await expect(page.locator('#object-name')).toHaveText('Kursi & meja kerja');
});
test('welcome can be skipped, Esc pauses movement, and the outdoor door works in both directions',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await ready(page,{tutorial:true});
 await expect(page.locator('#play-tutorial')).toBeVisible();await expect(page.locator('#skip-tutorial')).toBeVisible();
 await expect(page.locator('#modal-content')).toContainText('WASD');await expect(page.locator('#modal-content')).toContainText('crosshair');
 await page.locator('#skip-tutorial').click();await expect(page.locator('#tutorial-card')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('#resume-game')).toBeVisible();
 const before=await page.evaluate(()=>window.ergoDebug.snapshot().camera);await hold(page,['w'],350);
 expect(await page.evaluate(()=>window.ergoDebug.snapshot().camera)).toEqual(before);
 await page.locator('#resume-game').click();await page.locator('#outdoor-button').click();
 expect(await page.evaluate(()=>window.ergoDebug.snapshot().room)).toBe('office');
 await page.keyboard.press('f');await expect(page.locator('#header-room')).toHaveText('Halaman Aman');
 await expect(page.locator('[data-room="1"]')).toBeDisabled();await expect(page.locator('[data-room="4"]')).toBeDisabled();
 await page.screenshot({path:'test-results/outdoor-preview.png'});
 await page.locator('#outdoor-button').click();expect(await page.evaluate(()=>window.ergoDebug.snapshot().room)).toBe('outdoor');
 await page.keyboard.press('f');await expect(page.locator('#header-room')).toHaveText('Kantor Fokus');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#play-tutorial')).toHaveCount(0);expect(await page.evaluate(()=>window.ergoDebug.snapshot().state.onboarding.skipped)).toBe(true);
 await page.keyboard.press('Escape');await page.locator('#menu-tutorial').click();await expect(page.locator('#tutorial-card')).toBeVisible();
 await page.locator('#tutorial-skip').click();await expect(page.locator('#tutorial-card')).toBeHidden();
 await page.locator('#outdoor-button').click();await page.keyboard.press('f');await expect(page.locator('#header-room')).toHaveText('Halaman Aman');
 await select(page,'carry');await choose(page,'posture',1);await page.locator('#practice-activity').click();
 await expect.poll(()=>page.evaluate(()=>window.ergoDebug.snapshot().carrying)).toBe(true);
 await page.locator('#settings-button').click();await page.locator('#quality-select').selectOption('low');
 await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();await expect(page.locator('#play-tutorial')).toBeVisible();
 const reset=await page.evaluate(()=>window.ergoDebug.snapshot());expect(reset.room).toBe('office');expect(reset.state.current).toBe(0);expect(reset.carrying).toBe(false);
 expect(reset.state.xp).toBe(0);expect(reset.state.completed).toEqual([]);expect(reset.state.onboarding).toEqual({completed:false,skipped:false});
 expect(reset.state.settings.quality).toBe('low');expect(reset.tutorial.active).toBe(false);
 await page.locator('#skip-tutorial').click();await select(page,'chair');await expect(page.locator('#control-deskHeight')).toHaveValue('84');expect(errors).toEqual([]);
});

test('optional tutorial advances only after moving, looking, inspecting, adjusting, cleaning and exiting',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await ready(page,{tutorial:true});
 await page.locator('#play-tutorial').click();await expect(page.locator('#tutorial-card')).toBeVisible();await expect(page.locator('#tutorial-next')).toBeDisabled();
 await hold(page,['a'],650);await expect(page.locator('#tutorial-next')).toBeEnabled();await page.locator('#tutorial-next').click();
 await expect(page.locator('#tutorial-next')).toBeDisabled();await dragLook(page);await expect(page.locator('#tutorial-next')).toBeEnabled();await page.locator('#tutorial-next').click();
 await expect(page.locator('#tutorial-next')).toBeDisabled();await page.locator('#tutorial-guide').click();await page.keyboard.press('f');
 await expect(page.locator('#object-name')).toHaveText('Kursi & meja kerja');await expect(page.locator('#tutorial-next')).toBeEnabled();await page.locator('#tutorial-next').click();
 await expect(page.locator('#tutorial-next')).toBeDisabled();await setRange(page,'height',46);await setRange(page,'back',105);
 await expect(page.locator('#tutorial-next')).toBeDisabled();await setRange(page,'deskHeight',73);await expect(page.locator('#tutorial-next')).toBeEnabled();await page.locator('#tutorial-next').click();
 await expect(page.locator('#tutorial-next')).toBeDisabled();await page.locator('#tutorial-guide').click();await page.keyboard.press('3');await page.keyboard.press('f');
 await expect(page.locator('#tutorial-next')).toBeEnabled();expect(await page.evaluate(()=>window.ergoDebug.snapshot().state.rooms.office.dirt.cleaned.length)).toBe(1);
 await page.locator('#tutorial-next').click();await expect(page.locator('#tutorial-next')).toBeDisabled();await page.locator('#tutorial-guide').click();
 expect(await page.evaluate(()=>window.ergoDebug.snapshot().room)).toBe('office');await page.keyboard.press('f');
 await expect(page.locator('#header-room')).toHaveText('Halaman Aman');await expect(page.locator('#tutorial-next')).toBeEnabled();await page.locator('#tutorial-next').click();
 await expect(page.locator('#tutorial-card')).toBeHidden();
 const state=await page.evaluate(()=>window.ergoDebug.snapshot().state);expect(state.onboarding.completed).toBe(true);expect(state.settings.tutorialCompleted).toBe(true);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#play-tutorial')).toHaveCount(0);await expect(page.locator('#tutorial-card')).toBeHidden();expect(errors).toEqual([]);
});
