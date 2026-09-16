import { test, expect } from '@playwright/test';

async function touchPoint(locator, dx = 0, dy = 0) { const r = await locator.boundingBox(); return { x: r.x + r.width / 2 + dx, y: r.y + r.height / 2 + dy }; }
async function touch(cdp, type, points) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }

test('mobile landscape: rotation, simultaneous joystick/look, contextual actions and input reset', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await expect(page.locator('#orientation-prompt')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#orientation-prompt')).toBeHidden();
  await page.locator('#skip-tutorial').tap();
  const cdp = await context.newCDPSession(page);
  const start = await page.evaluate(() => window.ergoDebug.snapshot());
  const stick = await touchPoint(page.locator('#joystick'), 25, 0);
  await touch(cdp, 'touchStart', [{ ...stick, id: 1 }, { x: 565, y: 175, id: 2 }]);
  await touch(cdp, 'touchMove', [{ ...stick, id: 1 }, { x: 630, y: 180, id: 2 }]);
  await page.waitForTimeout(500);
  const moving = await page.evaluate(() => window.ergoDebug.snapshot());
  expect(moving.rotation[1]).not.toBe(start.rotation[1]); expect(moving.camera).not.toEqual(start.camera);
  await touch(cdp, 'touchEnd', []);
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().touch.joystick)).toEqual({ x: 0, y: 0 });
  await page.locator('#mobile-missions').tap(); await page.locator('[data-object="chair"]').first().tap();
  await expect(page.locator('#inspector')).toBeVisible();
  const panel = await page.locator('#inspector').boundingBox(); expect(panel.y).toBeGreaterThanOrEqual(44); expect(panel.y + panel.height).toBeLessThanOrEqual(390);
  await page.locator('#control-height').evaluate(e => { e.value = 46; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#close-inspector').tap();
  await expect(page.locator('#mobile-interact')).toHaveText('Periksa'); await page.locator('#mobile-interact').tap();
  await expect(page.locator('#inspector')).toBeVisible(); await page.locator('#close-inspector').tap();
  await page.locator('#mobile-missions').tap(); await page.locator('[data-object="dirt"]').first().tap();
  await page.locator('#close-inspector').tap(); await expect(page.locator('#mobile-interact')).toHaveText('Bersihkan');
  await page.locator('#mobile-interact').tap(); await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().state.rooms.office.dirt.cleaned.length)).toBe(1);
  await page.locator('#outdoor-button').tap(); await expect(page.locator('#mobile-interact')).toHaveText('Buka'); await page.locator('#mobile-interact').tap();
  await expect(page.locator('#header-room')).toHaveText('Halaman Aman');
  await page.locator('#neighborhood-button').tap(); await page.locator('#mobile-interact').tap();
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().neighborhood.gateProgress)).toBe(1);
  await page.screenshot({ path: 'test-results/mobile-landscape-preview.png' });
  const left = await touchPoint(page.locator('#joystick'), 0, -30), run = await touchPoint(page.locator('#mobile-sprint'));
  await touch(cdp, 'touchStart', [{ ...left, id: 3 }, { ...run, id: 4 }]);
  await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().touch.sprinting)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 }); await touch(cdp, 'touchCancel', []);
  await expect(page.locator('#orientation-prompt')).toBeVisible();
  expect(await page.evaluate(() => window.ergoDebug.snapshot().touch)).toEqual({ portrait: true, joystick: { x: 0, y: 0 }, sprinting: false });
  const paused = await page.evaluate(() => window.ergoDebug.snapshot().camera); await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.ergoDebug.snapshot().camera)).toEqual(paused);
  await page.setViewportSize({ width: 667, height: 375 }); await expect(page.locator('#orientation-prompt')).toBeHidden();
  await page.locator('#mobile-menu').tap(); await expect(page.locator('#resume-game')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 667 }); await expect(page.locator('#orientation-prompt')).toBeVisible();
  await page.setViewportSize({ width: 667, height: 375 }); await expect(page.locator('#resume-game')).toBeVisible(); await page.locator('#resume-game').tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-small-landscape-preview.png' });
  expect(errors).toEqual([]); await context.close();
});

test('mobile furniture: touch inventory, two hands, rotate, cancel and place', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.locator('#skip-tutorial').tap(); await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
  await page.locator('#objects-button').tap(); await page.locator('[data-prop="chair"]').tap(); await page.locator('#move-object').tap();
  await expect(page.locator('#mobile-interact')).toHaveText('Letakkan');
  expect(await page.evaluate(() => window.ergoDebug.snapshot().hands.visible)).toBe(true);
  await page.locator('#rotate-object').tap(); expect(await page.evaluate(() => window.ergoDebug.snapshot().moving.rotation)).toBeCloseTo(Math.PI / 4);
  await page.locator('#cancel-object').tap(); await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().moving)).toBeNull();
  await page.locator('#objects-button').tap(); await page.locator('[data-prop="chair"]').tap(); await page.locator('#move-object').tap();
  await expect(page.locator('#mobile-interact')).toBeEnabled();
  const stick = await page.locator('#joystick').boundingBox(), hud = await page.locator('#move-hud').boundingBox(), action = await page.locator('#mobile-interact').boundingBox();
  expect(hud.x).toBeGreaterThan(stick.x + stick.width); expect(hud.x + hud.width).toBeLessThan(action.x);
  await page.screenshot({ path: 'test-results/mobile-hands-preview.png' });
  await page.locator('#mobile-interact').tap(); await expect.poll(() => page.evaluate(() => window.ergoDebug.snapshot().moving)).toBeNull();
  expect(await page.evaluate(() => window.ergoDebug.snapshot().state.placements.office.chair)).toBeTruthy();
  expect(errors).toEqual([]); await context.close();
});
