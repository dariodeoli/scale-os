#!/usr/bin/env node
// Run against a locally built app: BASE_URL=http://127.0.0.1:3100 node ...
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {launchChrome, openTarget} from './chrome.mjs';
import {adminResponses, auditMetadata} from './fixtures/admin-mobile-155.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base), 'Only local app instances are permitted');
const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await cdp.evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
try {
  await cdp.send('Page.enable');
  await cdp.send('Fetch.enable', {patterns: [{urlPattern: '*/core-api/*'}]});
  cdp.on('Fetch.requestPaused', async ({requestId, request}) => {
    const key = new URL(request.url).pathname.replace('/core-api', '');
    const data = adminResponses[key];
    await cdp.send('Fetch.fulfillRequest', {requestId, responseCode: data ? 200 : 404, responseHeaders: [{name: 'Content-Type', value: 'application/json'}], body: Buffer.from(JSON.stringify(data || {})).toString('base64')});
  });
  for (const width of [390, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: 844, deviceScaleFactor: 1, mobile: width < 768});
    await cdp.send('Page.navigate', {url: `${base}/superadmin`});
    await waitFor(`document.querySelector('.platform-admin-tabs button')`);
    const tabs = await cdp.evaluate(`Array.from(document.querySelectorAll('.platform-admin-tabs button')).map(el=>({text:el.title,top:el.getBoundingClientRect().top,right:el.getBoundingClientRect().right,height:el.getBoundingClientRect().height}))`);
    assert.equal(tabs.length, 5);
    assert.deepEqual(tabs.map(tab => tab.text), ['Resumen', 'Agencias', 'Accesos', 'Cupones', 'Auditoría']);
    if (width === 390) {
      assert.ok(new Set(tabs.map(tab => tab.top)).size > 1, 'Mobile tabs wrap');
      assert.ok(tabs.every(tab => tab.right <= width && tab.height >= 44), 'Every tab is visible with a 44px target');
      await cdp.evaluate(`document.querySelectorAll('.platform-admin-tabs button')[2].click()`);
      await waitFor(`document.querySelector('[aria-labelledby="platform-access-title"]')`);
      await cdp.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
      assert.ok(await cdp.evaluate('window.scrollY > 300'), 'Fixture produces deep Access scroll');
      await cdp.evaluate(`document.querySelectorAll('.platform-admin-tabs button')[4].click()`);
      await waitFor(`document.querySelector('.platform-admin-audit-cards article')`);
      assert.ok(await cdp.evaluate(`document.querySelector('.platform-admin-header').getBoundingClientRect().top >= 0`), 'Section switch reveals header');
      const record = await cdp.evaluate(`document.querySelector('.platform-admin-audit-cards article').textContent`);
      assert.ok(record.includes(JSON.stringify(auditMetadata)));
      for (const label of ['Fecha', 'Actor', 'Acción', 'Destino', 'Metadatos']) assert.ok(record.includes(label));
      assert.ok(await cdp.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No horizontal overflow');
      await cdp.evaluate(`window.scrollTo(0, 140)`);
      const before = await cdp.evaluate('scrollY');
      await cdp.evaluate(`document.querySelectorAll('.platform-admin-tabs button')[4].click()`);
      assert.equal(await cdp.evaluate('scrollY'), before, 'Same view preserves scroll');
      await cdp.evaluate(`document.querySelector('.platform-admin-actions button').click()`);
      await waitFor(`!document.querySelector('.platform-admin-actions button').disabled`);
      assert.equal(await cdp.evaluate('scrollY'), before, 'Refresh preserves scroll');
    } else {
      assert.equal(new Set(tabs.map(tab => tab.top)).size, 1, 'Desktop strip is unchanged');
      await cdp.evaluate(`document.querySelectorAll('.platform-admin-tabs button')[4].click()`);
      await waitFor(`document.querySelector('[role="table"][aria-label="Actividad de administración global"]')`);
    }
    mkdirSync('work/visual-harness/ux-gaps', {recursive: true});
    const shot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
    writeFileSync(`work/visual-harness/ux-gaps/admin-${width}.png`, Buffer.from(shot.data, 'base64'));
    console.log(`PASS admin ${width}px: tabs, audit, navigation and scroll invariants`);
  }
} finally {cdp.close(); await chrome.close();}
