#!/usr/bin/env node
// Use a local production build so CSP and real route CSS remain in force.
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createServer, request as httpRequest} from 'node:http';
import {launchChrome, openTarget} from './chrome.mjs';
import {blogSurfaces} from './fixtures/blog-editorial.mjs';
import {CONTRAST_JS} from './contrast.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
// Send the actual public Host to middleware while the browser stays on loopback.
// Remote-looking HTTP origins would upgrade local assets to HTTPS under CSP.
let proxyHost = blogSurfaces[0].host;
const proxy = createServer((request, response) => {
  try {
    assert.equal(request.method, 'GET', 'This visual checker is read-only');
    const target = new URL(request.url, base);
    assert.equal(target.origin, base);
    assert.ok(!target.pathname.startsWith('/core-api/'), 'Public indexes must not request private APIs');
    // node:http preserves Host; this Node runtime's fetch does not.
    const outgoing = httpRequest(target, {headers: {host: proxyHost}}, upstream => {
      response.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(response);
    });
    outgoing.on('error', error => {response.statusCode = 502; response.end(String(error));});
    outgoing.end();
  } catch (error) {response.statusCode = 502; response.end(String(error));}
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const browserBase = `http://127.0.0.1:${proxy.address().port}`;
const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const out = 'work/visual-harness/ux-gaps';
mkdirSync(out, {recursive: true});
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await cdp.evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
const results = [];
try {
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  for (const surface of blogSurfaces) {
    proxyHost = surface.host;
    for (const width of [360, 390, 768, 1440]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width < 768});
      await cdp.send('Page.navigate', {url: `${browserBase}/`});
      await waitFor(`document.querySelector('.blog-embedded .blog-featured-link')`);
      await cdp.evaluate(`Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise(resolve => {image.onload = image.onerror = resolve}))).then(() => document.fonts.ready).then(() => true)`);
      const metrics = await cdp.evaluate(`(() => {
        const root = document.querySelector('.blog-embedded');
        const featured = root.querySelector('.blog-featured');
        const rect = element => {const box = element.getBoundingClientRect(); return {left: box.left, top: box.top, width: box.width, height: box.height, right: box.right}};
        return {
          title: root.querySelector('h1').textContent,
          h1Count: document.querySelectorAll('h1').length,
          canonical: document.querySelector('link[rel="canonical"]').href,
          overflow: document.documentElement.scrollWidth > innerWidth,
          grid: getComputedStyle(root.querySelector('.blog-grid')).gridTemplateColumns.split(' ').length,
          root: rect(root), featured: rect(featured),
          body: rect(featured.querySelector('.blog-featured-body')),
          cover: rect(featured.querySelector('.blog-featured-cover')),
          cards: Array.from(root.querySelectorAll('.blog-card')).map(rect),
          images: Array.from(root.querySelectorAll('img')).map(image => ({complete: image.complete, width: image.naturalWidth, alt: image.alt})),
          links: Array.from(root.querySelectorAll('.blog-featured-link,.blog-card-link')).map(link => link.getAttribute('href')),
        };
      })()`);
      assert.equal(metrics.title, surface.title);
      assert.equal(metrics.h1Count, 1);
      assert.equal(metrics.canonical, `https://${surface.host}/`);
      assert.equal(metrics.overflow, false, 'No horizontal overflow');
      assert.equal(metrics.grid, width < 768 ? 1 : 2);
      assert.ok(metrics.images.every(image => image.complete && image.width > 0 && image.alt), 'Every current image loads');
      assert.equal(new Set(metrics.links).size, metrics.links.length, 'One focus target per post');
      assert.ok(metrics.cards.every(card => card.height < 600 && card.right <= width), 'Compact cards stay in viewport');
      assert.ok(Math.abs(metrics.featured.width - metrics.root.width) < 2, 'Featured uses the full editorial width');
      if (width >= 768) {
        assert.ok(metrics.body.width > metrics.featured.width * .48, 'Featured text uses its column');
        assert.ok(metrics.cover.left >= metrics.body.left + metrics.body.width - 2, 'Featured media sits beside text');
        for (let index = 0; index + 1 < metrics.cards.length; index += 2) {
          assert.ok(Math.abs(metrics.cards[index].top - metrics.cards[index + 1].top) < 2, 'Following posts share a balanced row');
        }
      } else {
        assert.ok(metrics.cover.top >= metrics.body.top + metrics.body.height - 2, 'Mobile featured stacks');
        assert.ok(metrics.featured.height < 700, 'No giant mobile featured region');
      }
      // Focus through the keyboard, not focus() (which may not match :focus-visible).
      await cdp.evaluate(`document.querySelector('.blog-header a').focus(); true`);
      await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      const focus = await cdp.evaluate(`({card:document.activeElement.classList.contains('blog-featured-link'),style:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth})`);
      assert.ok(focus.card && focus.style === 'solid' && parseFloat(focus.width) >= 3, 'Keyboard focus is visible on the featured card');
      await cdp.evaluate('window.scrollTo(0, 0); true');
      const shot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
      writeFileSync(`${out}/blog-${surface.section}-${width}.png`, Buffer.from(shot.data, 'base64'));
      const contrast = {};
      for (const theme of ['light', 'dark']) {
        await cdp.evaluate(`document.documentElement.dataset.theme = '${theme}'; true`);
        await sleep(250); // Measure settled theme colors, not an in-flight CSS transition.
        contrast[theme] = await cdp.evaluate(CONTRAST_JS);
        assert.equal(contrast[theme].failureCount, 0, `${theme} text contrast: ${JSON.stringify(contrast[theme].failures)}`);
        assert.ok(await cdp.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${theme} has no overflow`);
        if (theme === 'dark') {
          const darkShot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
          writeFileSync(`${out}/blog-${surface.section}-${width}-dark.png`, Buffer.from(darkShot.data, 'base64'));
        }
      }
      await cdp.evaluate(`document.documentElement.dataset.theme = 'light'; true`);
      results.push({section: surface.section, width, ...metrics, contrast});
      console.log(`PASS blog ${surface.section} ${width}px: real host, geometry, images and keyboard focus`);
    }
    const firstPost = results.find(result => result.section === surface.section).links[0];
    await cdp.send('Page.navigate', {url: `${browserBase}${firstPost}`});
    await waitFor(`document.querySelector('.blog-post .blog-prose')`);
    const detail = await cdp.evaluate(`({template: Boolean(document.querySelector('.blog-page')), proseSize:getComputedStyle(document.querySelector('.blog-post .blog-prose')).fontSize, titleSize:getComputedStyle(document.querySelector('.blog-post h1')).fontSize})`);
    assert.equal(detail.template, false, 'Detail stays outside template styles');
    assert.equal(detail.proseSize, '15px', 'Detail reading style is unchanged');
    assert.equal(detail.titleSize, '38px', 'Detail title style is unchanged');
    console.log(`PASS blog ${surface.section} detail: original style contract`);
  }
  writeFileSync(`${out}/blog-editorial.json`, JSON.stringify(results, null, 2));
} finally {cdp.close(); await chrome.close(); await new Promise(resolve => proxy.close(resolve));}
