import { test, expect } from '@playwright/test';
import { newGame, ROOMS, SAVE_KEY } from '../src/rules.js';

async function enter(page, id) {
  const state = newGame(); state.current = ROOMS.findIndex(room => room.id === id);
  state.completed = ROOMS.slice(0, state.current).map(room => room.id); state.onboarding.skipped = true;
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: SAVE_KEY, state });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await expect(page.locator('#loading')).toBeHidden();
  await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
}

test('Sketchfab kitchen and sofa load locally and retain adjustment and movement', async ({ page }) => {
  const errors = [], rawDownloads = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('models%20sketchfab')) rawDownloads.push(request.url()); });
  await enter(page, 'kitchen');
  const assets = await page.evaluate(() => window.ergoDebug.snapshot().assets);
  expect(assets.failed).toEqual([]);
  expect(assets.loaded).toEqual(expect.arrayContaining(['kitchenCounter', 'kitchenPendants', 'kitchenOven', 'apartmentFridge', 'apartmentCoffee']));
  await page.screenshot({ path: 'test-results/sketchfab-kitchen-preview.png' });
  const fridge = await page.evaluate(() => window.ergoDebug.objectBounds('fridge'));
  expect(fridge.min[1]).toBeCloseTo(0, 3);
  expect(fridge.max[0] - fridge.min[0]).toBeCloseTo(.79, 3);
  await page.locator('#mission-list [data-object="counter"]').click();
  const before = await page.evaluate(() => window.ergoDebug.objectBounds('counter'));
  await page.locator('#control-height').evaluate(input => { input.value = '90'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  const after = await page.evaluate(() => window.ergoDebug.objectBounds('counter'));
  expect(after.max[1] / before.max[1]).toBeCloseTo(90 / 110, 2);
  await page.locator('#close-inspector').click(); await page.keyboard.press('f');
  await expect(page.locator('#inspector')).toBeVisible();
  await page.locator('#close-inspector').click();
  // Load a saved home project to exercise the extracted sofa independently.
  await enter(page, 'home');
  expect((await page.evaluate(() => window.ergoDebug.snapshot().assets)).loaded).toContain('apartmentSofa');
  await page.screenshot({ path: 'test-results/sketchfab-home-preview.png' });
  await page.locator('#mission-list [data-object="sofa"]').click();
  await page.locator('#control-x').evaluate(input => { input.value = '-2.2'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  const sofa = await page.evaluate(() => window.ergoDebug.objectBounds('sofa'));
  expect((sofa.max[0] + sofa.min[0]) / 2).toBeCloseTo(-2.2, 3);
  expect(sofa.max[0] - sofa.min[0]).toBeCloseTo(1.9, 3);
  expect(errors).toEqual([]); expect(rawDownloads).toEqual([]);
});

test('all three supplied tree varieties appear outdoors and survive room revisits', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await enter(page, 'outdoor');
  const assets = await page.evaluate(() => window.ergoDebug.snapshot().assets);
  expect(assets.failed).toEqual([]);
  expect(assets.loaded).toEqual(expect.arrayContaining(['treeCanopy', 'treeGarden', 'treeSlender']));
  expect(assets.loaded.filter(key => key.startsWith('tree')).length).toBe(50);
  await page.screenshot({ path: 'test-results/sketchfab-garden-preview.png' });
  await page.locator('#outdoor-button').click(); await page.keyboard.press('f');
  await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
  expect((await page.evaluate(() => window.ergoDebug.snapshot().assets)).failed).toEqual([]);
  await page.locator('#outdoor-button').click(); await page.keyboard.press('f');
  await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
  const revisit = await page.evaluate(() => window.ergoDebug.snapshot());
  expect(revisit.room).toBe('outdoor'); expect(revisit.assets.loaded).toHaveLength(50);
  expect(errors).toEqual([]);
});

test('missing bundled model preserves the playable fallback', async ({ page }) => {
  await page.route('**/apartment-fridge.glb', route => route.abort());
  await enter(page, 'kitchen');
  expect((await page.evaluate(() => window.ergoDebug.snapshot().assets)).failed).toEqual(['apartmentFridge']);
  const bounds = await page.evaluate(() => window.ergoDebug.objectBounds('fridge'));
  expect(bounds.max[1]).toBeGreaterThan(1.8);
  await page.locator('#mission-list [data-object="fridge"]').click();
  await expect(page.locator('#control-x')).toBeVisible();
  await page.locator('#close-inspector').click(); await page.keyboard.press('f');
  await expect(page.locator('#inspector')).toBeVisible();
});
