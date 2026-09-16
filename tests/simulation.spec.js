import { test, expect } from '@playwright/test';
import { newGame, SAVE_KEY } from '../src/rules.js';

async function ready(page, room = 0) {
  const state = newGame(); state.current = room; state.completed = room ? ['office'] : []; state.onboarding.skipped = true;
  await page.addInitScript(({ state, key }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { state, key: SAVE_KEY });
  await page.goto('/'); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await expect(page.locator('#loading')).toBeHidden();
  await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
}
async function selectProp(page, id) {
  if (await page.locator('#inspector').isVisible()) await page.locator('#close-inspector').click();
  await page.locator('#objects-button').click(); await page.locator(`[data-prop="${id}"]`).click();
  await expect(page.locator('#inspector')).toBeVisible();
}
async function lookForSpace(page) {
  // Turn through real keyboard/mouse controls until a valid placement is found.
  for (let i = 0; i < 12; i++) {
    if (await page.evaluate(() => window.ergoDebug.snapshot().moving?.valid)) return;
    const rect = await page.locator('#viewport canvas').boundingBox();
    const x = rect.x + rect.width * .5, y = rect.y + rect.height * .32;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 80, y, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(80);
  }
  throw new Error('No available placement found');
}

test('movable furniture: hands, collision preview, rotate, cancel, save and restore', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); await ready(page);
  await selectProp(page, 'chair');
  const before = await page.evaluate(() => window.ergoDebug.objectBounds('chair'));
  await page.locator('#move-object').click();
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().moving?.id)).toBe('chair');
  expect(await page.evaluate(() => window.ergoDebug.snapshot().hands.visible)).toBe(true);
  await page.keyboard.press('r');
  expect(await page.evaluate(() => window.ergoDebug.snapshot().moving.rotation)).toBeCloseTo(Math.PI / 4);
  await page.keyboard.press('x');
  expect(await page.evaluate(() => window.ergoDebug.objectBounds('chair'))).toEqual(before);
  await selectProp(page, 'chair'); await page.locator('#move-object').click(); await lookForSpace(page);
  await page.screenshot({ path: 'test-results/hands-moving-preview.png' });
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().moving)).toBeNull();
  const after = await page.evaluate(() => window.ergoDebug.objectBounds('chair')); expect(after).not.toEqual(before);
  await page.waitForTimeout(250); await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  expect(await page.evaluate(() => window.ergoDebug.objectBounds('chair'))).toEqual(after);
  await expect(page.locator('#loading')).toBeHidden(); await selectProp(page, 'chair'); await page.locator('#reset-object-position').click();
  expect(await page.evaluate(() => window.ergoDebug.objectBounds('chair'))).toEqual(before);
  expect(errors).toEqual([]);
});

test('kitchen cooking: posture, handle, flame, stirring, serving and power-off on reload', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); await ready(page, 1);
  await selectProp(page, 'stove'); await page.locator('[data-cook="power"]').click();
  expect(await page.evaluate(() => window.ergoDebug.snapshot().state.cooking.on)).toBe(true);
  await page.locator('#move-object').click(); await expect(page.locator('#toast')).toContainText('Matikan kompor');
  await page.locator('[data-cook="stir"]').click(); await expect(page.locator('#toast')).toContainText('Atur meja');
  await page.locator('[data-cook="handle"]').click();
  await page.locator('#mission-list [data-object="counter"]').click();
  await page.locator('#control-height').evaluate(el => { el.value = '90'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-cook="stir"]').click();
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().hands.action)).toBe('stir');
  await page.waitForTimeout(600);const hands=await page.evaluate(()=>window.ergoDebug.snapshot().hands);if(hands.status==='ready')for(const hand of hands.sides)expect(hand.contactError).toBeLessThan(.012);await page.screenshot({ path: 'test-results/cooking-hands-preview.png' });
  await expect(page.locator('[data-cook="serve"]')).toBeEnabled(); await page.locator('[data-cook="serve"]').click();
  expect(await page.evaluate(() => window.ergoDebug.snapshot().state.cooking)).toMatchObject({ on: false, handle: 1, stirred: true, served: true });
  await page.locator('[data-cook="power"]').click(); await page.waitForTimeout(250); await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  expect(await page.evaluate(() => window.ergoDebug.snapshot().state.cooking.on)).toBe(false);
  expect(errors).toEqual([]);
});

test('interior geometry: grounded trees and desk equipment resting above the tabletop', async ({ page }) => {
  await ready(page);
  const trees = await page.evaluate(() => window.ergoDebug.treeBases());
  expect(trees.length).toBeGreaterThan(5);
  for (const tree of trees) expect(tree.minY).toBeLessThanOrEqual(-.2);
  await page.locator('#mission-list [data-object="chair"]').click();
  for (const height of [68, 90, 73]) {
    await page.locator('#control-deskHeight').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, height);
    const geometry = await page.evaluate(() => ({ keyboard: window.ergoDebug.objectBounds('keyboard'), monitor: window.ergoDebug.objectBounds('monitor'), desk: window.ergoDebug.objectBounds('desk') }));
    expect(geometry.keyboard.min[1]).toBeGreaterThanOrEqual(height / 100 + .024);
    expect(geometry.monitor.min[1]).toBeGreaterThanOrEqual(height / 100 + .026);
    expect(geometry.keyboard.min[2]).toBeGreaterThan(geometry.desk.min[2]);
    expect(geometry.keyboard.max[2]).toBeLessThan(geometry.desk.max[2]);
  }
  await selectProp(page, 'desk');
  const before = await page.evaluate(() => Object.fromEntries(['desk', 'keyboard', 'monitor', 'lamp'].map(id => [id, window.ergoDebug.objectBounds(id)])));
  await page.locator('#move-object').click(); await lookForSpace(page); await page.keyboard.press('f');
  const after = await page.evaluate(() => Object.fromEntries(['desk', 'keyboard', 'monitor', 'lamp'].map(id => [id, window.ergoDebug.objectBounds(id)])));
  const delta = after.desk.min.map((v, i) => v - before.desk.min[i]);
  for (const id of ['keyboard', 'monitor', 'lamp']) for (let i = 0; i < 3; i++) expect(after[id].min[i] - before[id].min[i]).toBeCloseTo(delta[i], 4);
});
