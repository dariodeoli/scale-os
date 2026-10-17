/**
 * Refs #231/#222/#224. Mouse and keyboard state contrast in the real local app.
 * Requires a seeded owner, a client without a plan and a contract/template.
 * Run against the final source served by an isolated local frontend; no CSSOM patch.
 * QA_BASE_URL=http://127.0.0.1:3006 QA_FIXTURE_FILE=/private/test-identity.json \
 *   node build-tools/qa-hover-themes.mjs
 * QA_AUTH_BASE_URL can reuse another frontend for the same local API/session.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(new URL('../backend/package.json', import.meta.url)), puppeteer = require('puppeteer-core');
const base = new URL(process.env.QA_BASE_URL || 'http://127.0.0.1:3006').origin, authBase = new URL(process.env.QA_AUTH_BASE_URL || base).origin;
for (const origin of [base, authBase])
    assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'This browser check only accepts loopback URLs.');
assert(process.env.QA_FIXTURE_FILE, 'Provide QA_FIXTURE_FILE with a local admin test identity.');
const fixture = JSON.parse(await readFile(process.env.QA_FIXTURE_FILE, 'utf8')), identity = fixture.admin || fixture, report = [], out = resolve(process.env.QA_OUT || 'work/qa-hover-themes');
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
    const context = await browser.createBrowserContext(), page = await context.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(authBase + '/resumen', { waitUntil: 'domcontentloaded' });
    if (identity.session)
        await context.setCookie({ name: 'scale_session', value: identity.session, url: base });
    else
        assert.equal(await page.evaluate(async (id) => (await fetch('/core-api/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: id.email, password: id.password }), credentials: 'include' })).status, identity), 200);
    const pause = () => new Promise(r => setTimeout(r, 240));
    const go = async (route) => { await page.goto(base + route, { waitUntil: 'networkidle2' }); await page.waitForSelector('.workspace-content'); };
    const metric = async (selector) => { const result = await page.$eval(selector, el => { const css = getComputedStyle(el), name = el.querySelector('.person-container-name,.nav-label,.identity-name,h3') || el, c = getComputedStyle(name); const rgb = color => { const ctx = document.createElement('canvas').getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; }; return { bg: css.backgroundColor, bgRgb: rgb(css.backgroundColor), color: c.color, textRgb: rgb(c.color), hoverToken: css.getPropertyValue('--ui-hover-bg').trim(), selectedToken: css.getPropertyValue('--ui-selected-bg').trim(), selectedRgb: rgb(css.getPropertyValue('--ui-selected-bg').trim()), outline: css.outlineStyle, shadow: css.boxShadow, focusVisible: el.matches(':focus-visible'), height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, sidebar: Boolean(el.closest('.desktop-sidebar')), dark: document.documentElement.dataset.theme === 'dark' }; }); const blend = (fg, bg) => fg.slice(0, 3).map((v, n) => v * fg[3] / 255 + bg[n] * (1 - fg[3] / 255)); const luminance = color => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, n) => s + v * [.2126, .7152, .0722][n], 0); const bases = result.sidebar ? (result.dark ? [[10, 10, 14], [16, 16, 22]] : [[46, 0, 56], [37, 0, 47]]) : (result.dark ? [[39, 39, 48]] : [[255, 255, 255]]); result.contrast = Math.min(...bases.map(parent => { const bg = blend(result.bgRgb, parent), fg = blend(result.textRgb, bg), a = luminance(bg), b = luminance(fg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); })); return result; };
    const check = (name, value) => { report.push({ name, ...value }); assert.ok(value.contrast >= 4.5, `${name}: contrast ${value.contrast}`); if (value.dark && value.bgRgb[3] === 255)
        assert.ok(value.bgRgb.slice(0, 3).some(n => n < 180), `${name}: unexpected light surface`); };
    const keyboard = async (selector) => { await page.focus(selector); await page.keyboard.press('Tab'); await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift'); await pause(); };
    for (const theme of ['light', 'dark']) {
        await go('/clientes');
        await page.evaluate(theme => { localStorage.setItem('scale-theme', theme); if (theme === 'light')
            delete document.documentElement.dataset.theme;
        else
            document.documentElement.dataset.theme = theme; }, theme);
        await page.mouse.move(1000, 30);
        await page.hover('.desktop-sidebar .user');
        await pause();
        check(`${theme}: sidebar profile mouse`, await metric('.desktop-sidebar .user'));
        await page.screenshot({ path: `${out}/after-profile-${theme}-1440.png`, fullPage: true });
        await page.mouse.move(1000, 30);
        await keyboard('.desktop-sidebar .user');
        const focus = await metric('.desktop-sidebar .user');
        assert.equal(focus.focusVisible, true);
        assert.ok(focus.outline !== 'none' || focus.shadow !== 'none');
        check(`${theme}: sidebar profile keyboard`, focus);
        const desktopTarget = await metric('button[title^="Cargar plan y pago"]');
        assert.ok(desktopTarget.height >= 28 && desktopTarget.height <= 32, 'desktop keeps compact row actions');
        const nav = '.desktop-sidebar nav a:not(.active)';
        await page.hover(nav);
        await pause();
        check(`${theme}: inactive navigation`, await metric(nav));
        check(`${theme}: selected navigation`, await metric('.desktop-sidebar nav .active'));
        const row = '.client-hub-row';
        await page.hover(row);
        await pause();
        check(`${theme}: client row mouse`, await metric(row));
        const checkbox = row + ' input[type="checkbox"]';
        await page.click(checkbox);
        await pause();
        const selected = await metric(row);
        assert.deepEqual(selected.bgRgb, selected.selectedRgb);
        check(`${theme}: row selected preserves hover`, selected);
        await page.click(checkbox);
        const trigger = row + ' button[aria-haspopup="menu"]';
        if (await page.$(trigger)) {
            await page.click(trigger);
            await page.waitForSelector('[role="menu"]');
            const item = '[role="menu"] button[role="menuitem"]';
            await page.waitForSelector(item);
            await page.hover(item);
            await pause();
            check(`${theme}: menu mouse`, await metric(item));
            await page.keyboard.press('ArrowDown');
            await pause();
            check(`${theme}: menu keyboard`, await metric('[role="menu"] button[role="menuitem"]:focus'));
            await page.screenshot({ path: `${out}/after-menu-${theme}-1440.png`, fullPage: true });
            await page.keyboard.press('Escape');
        }
        await go('/contratos');
        await page.evaluate(theme => { localStorage.setItem('scale-theme', theme); if (theme === 'light')
            delete document.documentElement.dataset.theme;
        else
            document.documentElement.dataset.theme = theme; }, theme);
        await page.hover('.contract-card');
        await pause();
        check(`${theme}: contract container`, await metric('.contract-card'));
        await page.click('.ops-select-trigger');
        await page.waitForSelector('[role="option"]');
        const current = '[role="option"][aria-selected="true"]';
        await page.hover(current);
        await pause();
        const chosen = await metric(current);
        assert.deepEqual(chosen.bgRgb, chosen.selectedRgb);
        check(`${theme}: selected dropdown mouse`, chosen);
        const other = '[role="option"][aria-selected="false"]';
        await page.hover(other);
        await pause();
        check(`${theme}: dropdown mouse`, await metric(other));
        await page.keyboard.press('ArrowDown');
        await pause();
        check(`${theme}: dropdown keyboard`, await metric('[role="option"]:focus'));
        await page.screenshot({ path: `${out}/after-select-${theme}-1440.png`, fullPage: true });
        await page.keyboard.press('Escape');
    }
    await page.setViewport({ width: 390, height: 1000 });
    for (const theme of ['light', 'dark']) {
        await go('/clientes');
        await page.evaluate(theme => { localStorage.setItem('scale-theme', theme); if (theme === 'light')
            delete document.documentElement.dataset.theme;
        else
            document.documentElement.dataset.theme = theme; }, theme);
        const target = 'button[title^="Cargar plan y pago"]';
        const action = await metric(target);
        assert.ok(action.height >= 44 && action.width >= 44);
        report.push({ name: `${theme}: mobile client plan target`, height: action.height, width: action.width });
        await page.click('.mobile-menu-trigger');
        await page.waitForSelector('.mobile-sidebar .user');
        await page.hover('.mobile-sidebar .user');
        await pause();
        check(`${theme}: mobile profile mouse`, await metric('.mobile-sidebar .user'));
        await keyboard('.mobile-sidebar .user');
        const focus = await metric('.mobile-sidebar .user');
        assert.equal(focus.focusVisible, true);
        check(`${theme}: mobile profile keyboard`, focus);
        await page.screenshot({ path: `${out}/after-profile-${theme}-390.png`, fullPage: true });
        await page.keyboard.press('Escape');
        await go('/inventario');
        const summaries = await page.$$eval('summary', nodes => nodes.filter(n => /Ubicaciones de guardado|Categorías de equipos/.test(n.textContent)).map(n => ({ name: n.textContent.trim(), height: n.getBoundingClientRect().height })));
        assert.equal(summaries.length, 2);
        for (const s of summaries) {
            assert.ok(s.height >= 44);
            report.push({ name: `${theme}: ${s.name}`, height: s.height });
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
        await page.screenshot({ path: `${out}/after-inventory-${theme}-390.png`, fullPage: true });
    }
    await writeFile(resolve(out, 'report.json'), JSON.stringify({ base, mode: 'final source served by isolated next dev; no CSSOM patch', checks: report }, null, 2));
    console.log(`PASS ${report.length} actual app hover/focus/selected/target checks, mouse+keyboard, light+dark, desktop+mobile.`);
    console.log(JSON.stringify(report.filter(r => /sidebar profile mouse|mobile client plan|guardado|Categorías/.test(r.name)).map(({ name, bg, color, contrast, height, width }) => ({ name, bg, color, contrast, height, width })), null, 2));
}
catch (error) {
    await writeFile(resolve(out, 'report-failure.json'), JSON.stringify({ checks: report, error: String(error) }, null, 2));
    throw error;
}
finally {
    await browser.close();
}
