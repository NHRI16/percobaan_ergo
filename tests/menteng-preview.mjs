import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.locator('#skip-tutorial').click();
  await page.locator('#outdoor-button').click();
  await page.keyboard.press('f');
  await page.waitForFunction(() => window.ergoDebug.snapshot().assets.pending === 0);
  const gardenUI = await page.addStyleTag({ content: '#hud, .topbar, #toast { visibility: hidden; }' });
  await page.waitForTimeout(1200);
  await page.locator('#viewport canvas').screenshot({ path: 'test-results/sketchfab-garden-clean.png' });
  await gardenUI.evaluate(element => element.remove());
  await page.locator('#neighborhood-button').click();
  const hiddenUI = await page.addStyleTag({ content: '#hud, .topbar, #toast { visibility: hidden; }' });
  await page.mouse.move(400, 430);
  await page.mouse.down();
  await page.mouse.move(400 + Math.PI / .004, 395, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.locator('#viewport canvas').screenshot({ path: 'test-results/menteng-house-preview.png' });
  await hiddenUI.evaluate(element => element.remove());
  await page.locator('#neighborhood-button').click();
  await page.keyboard.press('f');
  await page.waitForFunction(() => window.ergoDebug.snapshot().neighborhood.gateProgress === 1);
  await page.keyboard.down('w'); await page.waitForTimeout(1750); await page.keyboard.up('w');
  await page.addStyleTag({ content: '#hud, .topbar, #toast { visibility: hidden; }' });
  await page.mouse.move(800, 430); await page.mouse.down();
  await page.mouse.move(690, 385, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(800);
  await page.locator('#viewport canvas').screenshot({ path: 'test-results/menteng-neighborhood-preview.png' });
  console.log(JSON.stringify({ errors, view: await page.evaluate(() => {
    const { camera, drawCalls, triangles, neighborhood, assets } = window.ergoDebug.snapshot();
    return { camera, drawCalls, triangles, residences: neighborhood.residences.length, assets };
  }) }));
} finally {
  await browser.close();
}
