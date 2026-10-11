import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const port = 3241, origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: '', AI_OS_ENABLED: 'false', AI_OS_AI_ENABLED: 'false', AI_OS_AUTONOMY_ENABLED: 'false' },
});
const routes = ['/', '/alternatives', '/compare', '/products/scalper', '/products/swing', '/products/pro', '/links', '/education', '/indicators', '/start', '/community', '/affiliates', '/about-darth-algo', '/support'];
const checkoutPaths = { scalper: '/14AfZi4T5fRidqS2oc6kg03', swing: '/28EcN699l8oQ9aC5Ao6kg02', pro: '/4gM8wQfxJ6gI1IabYM6kg05' };
const errors = [], checks = [];
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 500)); }
  assert.ok(ready, 'Local production server must start');
  await mkdir('artifacts/product-first', { recursive: true });
  for (const [name, engine, width, height] of [['chromium', chromium, 1280, 1000], ['webkit', webkit, 390, 844]]) {
    browser = await engine.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    // No external navigations, purchases, analytics writes or customer actions.
    await context.route('**/*', route => {
      const request = route.request();
      if (!request.url().startsWith(origin + '/')) return route.abort();
      if (!['GET', 'HEAD'].includes(request.method())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    for (const path of routes) {
      const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, path);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1, path + ' has one headline');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path + ' horizontal overflow');
      const explorer = page.locator('[data-product-spotlight] .indicator-explorer');
      if (await explorer.count()) {
        const image = explorer.locator('figure img').first();
        assert.ok(await image.evaluate(img => img.complete && img.naturalWidth > 0), path + ' real chart loaded');
        assert.ok((await image.boundingBox()).y < height * .65, path + ' product visible in first screen');
        const controls = explorer.getByRole('group').getByRole('button');
        for (let i = 0; i < 3; i++) {
          await controls.nth(i).click();
          assert.equal(await controls.nth(i).getAttribute('aria-pressed'), 'true');
          assert.equal(await explorer.locator('button[aria-pressed="true"]').count(), 1, 'Exactly one active feature');
        }
        await controls.first().click();
        const expand = explorer.getByRole('button', { name: /^Enlarge / });
        await expand.click();
        assert.ok(await page.getByRole('dialog').isVisible());
        const chartRegion = page.getByRole('region', { name: 'Full-size chart; use arrow keys to scroll' });
        await chartRegion.focus();
        assert.ok(await chartRegion.evaluate(el => el === document.activeElement), 'Full-size chart accepts keyboard focus');
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('.indicator-dialog[open] .indicator-dialog-scroll').scrollLeft > 0);
        if (path === '/products/pro') await page.screenshot({ path: `artifacts/product-first/${name}-chart-dialog.png` });
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.ok(await expand.evaluate(el => el === document.activeElement), 'Native dialog restores focus');
      }
      if (path.startsWith('/products/')) {
        const slug = path.split('/').pop();
        const links = await page.locator('a[href^="https://buy.stripe.com/"]').evaluateAll(nodes => nodes.map(n => n.href));
        assert.ok(links.length >= 2, 'Top and bottom selected-product CTA');
        for (const href of links) assert.equal(new URL(href).pathname, checkoutPaths[slug]);
      }
      if (['/', '/alternatives', '/links', '/products/pro', '/compare', '/education'].includes(path)) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/product-first/${name}-${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}.png`, fullPage: false });
      }
      if (path === '/links') {
        assert.equal(await page.locator('.hub-brand-emblem').evaluate(el => getComputedStyle(el).transform), 'none');
        assert.deepEqual(await page.locator('.links-market-hub *').evaluateAll(nodes => nodes.filter(el => {
          const style = getComputedStyle(el);
          return style.filter !== 'none' || (style.backdropFilter && style.backdropFilter !== 'none') || (style.webkitBackdropFilter && style.webkitBackdropFilter !== 'none');
        }).map(el => el.className)), [], 'No decorative filter layers over the link-hub brand');
      }
      checks.push(`${name} ${path}: layout, image, controls, route PASS`);
    }
    // Actual hydrated attribution survives navigation, feature switches and dynamic links.
    for (const source of ['threads', 'whop', 'search']) {
      await page.goto(`${origin}/alternatives?utm_source=${source}&utm_campaign=ui-check&utm_content=chart`);
      await page.getByRole('link', { name: 'Explore Pro — $29/month', exact: true }).click();
      await page.waitForURL('**/products/pro');
      await page.waitForFunction(() => document.querySelector('a[href^="https://buy.stripe.com/"]')?.href.includes('client_reference_id=da1_'));
      const url = new URL(await page.locator('a[href^="https://buy.stripe.com/"]').first().getAttribute('href'));
      assert.equal(url.searchParams.get('utm_source'), source);
      assert.deepEqual(JSON.parse(Buffer.from(url.searchParams.get('client_reference_id').slice(4), 'base64url')), [source, 'ui-check', 'chart']);
    }
    await page.evaluate(() => {
      const a = document.createElement('a'); a.textContent = 'Fixture affiliate checkout'; a.id = 'affiliate-fixture';
      a.href = 'https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05?client_reference_id=affiliate-fixture&prefilled_promo_code=FIXTURE'; document.body.append(a);
    });
    await page.waitForTimeout(100);
    assert.equal(new URL(await page.locator('#affiliate-fixture').getAttribute('href')).searchParams.get('client_reference_id'), 'affiliate-fixture');
    await page.goto(origin + '/start?source=whop&campaign=ui-check');
    assert.equal(await page.getByRole('link', { name: 'Explore the free community', exact: true }).getAttribute('href'), '/community?source=whop&campaign=ui-check');
    await page.goto(origin + '/?utm_source=threads&utm_campaign=ui-check');
    for (const [id, slug] of [['scalper-plan','scalper'], ['swing-trial','swing'], ['pro-plan','pro']]) {
      await page.locator(`a[href="#${id}"]:visible`).first().click();
      assert.ok(await page.locator('#' + id).count());
      assert.ok(await page.locator(`#${id} a[href*="${checkoutPaths[slug]}"]`).count());
    }
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ['/alternatives', '/products/swing', '/links']) {
      await page.goto(origin + path); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path + ' narrow screen');
    }
    await context.close();
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await nojs.newPage(); await staticPage.goto(origin + '/products/pro');
    assert.ok(await staticPage.locator('a[href="https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05"]').count());
    await nojs.close(); await browser.close(); browser = null;
  }
  assert.deepEqual(errors, []);
  await writeFile('artifacts/product-first/report.json', JSON.stringify({ result: 'PASS', checks, attribution: ['threads', 'whop', 'search', 'existing affiliate reference'], productionWrites: 0, externalNavigations: 0 }, null, 2));
  console.log('PASS product-first Chromium + WebKit, 320/390/1280 widths, chart/dialog controls, selected checkout, no-JS and attribution.');
} finally { await browser?.close(); server.kill('SIGTERM'); }
