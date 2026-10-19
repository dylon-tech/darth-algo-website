// Regression for the founder-requested removal of the former 3D tour.
// Keep this entry point for the existing website validation workflow.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';
const origin = 'http://127.0.0.1:3255';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3255'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: '', AI_OS_ENABLED: 'false', AI_OS_AI_ENABLED: 'false', AI_OS_AUTONOMY_ENABLED: 'false' },
});
const errors = [], checks = []; let browser;
try {
  let ready = false;
  for (let i = 0; i < 90; i++) { try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 500)); }
  assert.ok(ready); await mkdir('artifacts/removed-3d', { recursive: true });
  const mobile = process.env.QA_MOBILE_ENGINE === 'chromium' ? ['mobile-chromium', chromium, 390, 844] : ['iphone', webkit, 390, 844];
  for (const [name, engine, width, height] of [['desktop', chromium, 1440, 1000], mobile]) {
    browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin + '/')) return route.abort();
      if (!['GET', 'HEAD'].includes(route.request().method())) return route.fulfill({ status: 200, body: '{}' });
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    for (const path of ['/', '/products/pro', '/products/scalper', '/products/swing']) {
      assert.equal((await page.goto(origin + path, { waitUntil: 'networkidle' })).status(), 200);
      assert.equal(await page.locator('#inside-the-engine, .chart-journey, .journey-finish').count(), 0, 'Tour and its spacer are removed');
      assert.equal(await page.locator('a[href="#inside-the-engine"]').count(), 0, 'No dangling 3D tour links');
      assert.equal(await page.getByRole('button', { name: '3D view', exact: true }).count(), 0);
      const spacing = await page.locator('[data-product-spotlight]').evaluate(hero => {
        const next = hero.nextElementSibling;
        return { nextTag: next?.tagName, gap: next ? next.getBoundingClientRect().top - hero.getBoundingClientRect().bottom : null };
      });
      assert.equal(spacing.nextTag, 'SECTION');
      assert.ok(Math.abs(spacing.gap) <= 1, 'The next content section directly follows the real product view');
      const explorer = page.locator('[data-product-spotlight] .indicator-explorer');
      const controls = explorer.getByRole('group').getByRole('button');
      for (const i of [1, 2, 0, 2, 0]) {
        await controls.nth(i).click();
        assert.equal(await controls.nth(i).getAttribute('aria-pressed'), 'true');
        const imageLoaded = await explorer.locator('figure img').evaluate(async img => {
          if (img.complete) return img.naturalWidth > 0;
          return await new Promise(resolve => {
            const timeout = setTimeout(() => resolve(false), 5000);
            const settled = () => { clearTimeout(timeout); resolve(img.naturalWidth > 0); };
            img.addEventListener('load', settled, { once: true });
            img.addEventListener('error', settled, { once: true });
          });
        });
        assert.ok(imageLoaded, 'Actual indicator image loads');
      }
      const enlarge = explorer.getByRole('button', { name: /^Enlarge / });
      await enlarge.click(); assert.ok(await page.getByRole('dialog').isVisible());
      await page.getByRole('button', { name: 'Close enlarged chart', exact: true }).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await enlarge.click(); await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.ok(await enlarge.evaluate(el => el === document.activeElement), 'Focus returns after dismissal');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
      await page.locator('[data-product-spotlight] + section').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/removed-3d/${name}-${path === '/' ? 'home' : path.split('/').pop()}-transition.png` });
      checks.push(`${name} ${path}: tour absent, no gap, real chart controls and repeated dialog dismissal PASS`);
    }
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ['/', '/products/pro', '/products/scalper', '/products/swing']) {
      await page.goto(origin + path, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path}: narrow screen`);
    }
    await context.close(); await browser.close(); browser = null;
  }
  assert.deepEqual(errors, []);
  await writeFile('artifacts/removed-3d/report.json', JSON.stringify({ result: 'PASS', checks, externalWrites: 0 }, null, 2));
  console.log('PASS 3D tour removed without gaps; actual charts retained on desktop, mobile and 320px widths.');
} finally { await browser?.close(); server.kill('SIGTERM'); }
