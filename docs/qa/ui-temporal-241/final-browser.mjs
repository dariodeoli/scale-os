import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const require2 = createRequire(new URL("../../../backend/package.json", import.meta.url));
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const out = resolve(process.env.QA_OUT || "/tmp/temporal-final");
await mkdir(out, { recursive: true });
const { outputFiles } = await require2("esbuild").build({ entryPoints: [fileURLToPath(new URL("./fixture.tsx", import.meta.url))], bundle: true, write: false, jsx: "automatic", format: "iife", platform: "browser", loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
const cssImports=['owncoding-ui/styles.css','./app/ui-tokens.css','./app/globals.css','./app/qa-fixes.css','./app/mobile-forms.css','./app/ui-system.css','./app/contrast.css','./app/tailwind.css','./app/dialog.css','./app/ui/temporal.css'];
const cssBundle=await require2('esbuild').build({stdin:{contents:cssImports.map(path=>`@import '${path}';`).join('\n'),resolveDir:repo,loader:'css'},bundle:true,write:false,outdir:resolve(out,'css'),external:['/fonts/*','/images/*','/brand/*'],logLevel:'silent'});
const tailwindConfig=require2('tailwindcss/loadConfig')(resolve(repo,'tailwind.config.mjs'));
tailwindConfig.content=[{raw:(await Promise.all(['docs/qa/ui-temporal-241/fixture.tsx','app/ui/temporal.tsx','app/dialog.tsx','app/operations.tsx','app/ui/button.tsx'].map(path=>readFile(resolve(repo,path),'utf8')))).join('\n'),extension:'tsx'}];
const css=(await require2('postcss')([require2('tailwindcss')(tailwindConfig),require2('autoprefixer')()]).process(cssBundle.outputFiles.find(file=>file.path.endsWith('.css')).text,{from:resolve(repo,'app/tailwind.css')})).css;
const server = createServer(async(req, res) => {
  if(/^\/(fonts|images|brand)\//.test(req.url||'')){try{res.end(await readFile(resolve(repo,'public',req.url.slice(1).split('?')[0])));}catch{res.writeHead(404);res.end();}return;}
  res.setHeader("Content-Type", "text/html");
  res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
#root>main{max-width:450px;margin:auto;padding:16px}main>form{display:grid;gap:12px}h1{font-size:20px}</style></head><body><div id="root"></div></body></html>`);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await require2("puppeteer-core").launch({ headless: true, executablePath: process.env.CHROME_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"], env: { ...process.env, XDG_CONFIG_HOME: out, XDG_CACHE_HOME: out } });
const report = { source: process.env.QA_SOURCE_SHA, checks: [], observations: [], screenshots: [], browserErrors: [], blockedRequests: [], method: "Actual keyboard and click. Initial/default values are React fixture props. Component Apply dispatches a programmatic DOM event; recorded as isTrusted:false when present, never described as user typing." };
function check(name, passed, detail) {
  report.checks.push({ name, passed: Boolean(passed), detail });
  assert(passed, name);
}
const values = { date: "2026-10-17", time: "13:45", datetime: "2026-10-17T13:45", month: "2026-10" };
const partial = { date: "2026-02-", time: "13:", datetime: "2026-10-17T13:", month: "2026-" };
const invalid = { date: "2026-02-31", time: "25:70", datetime: "2026-02-31T13:45", month: "2026-13" };
async function mount(p, kind, options = {}) {
  await p.evaluate(({ kind: kind2, initial, options: options2 }) => window.mount(kind2, initial, options2), { kind, initial: values[kind], options });
  await p.waitForSelector("#subject");
}
async function page(kind, { width = 1366, theme = "light", zone = "America/Asuncion", options = {} } = {}) {
  const p = await browser.newPage();
  p.setDefaultTimeout(15e3);
  await p.setViewport({ width, height: 900 });
  await p.emulateTimezone(zone);
  p.on("pageerror", (e) => report.browserErrors.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    const u = new URL(r.url());
    if(["data:","blob:","about:"].includes(u.protocol))return r.continue();
    if (u.hostname !== "127.0.0.1" || !["GET", "HEAD"].includes(r.method())) {
      report.blockedRequests.push({ host: u.hostname, path: u.pathname, method: r.method() });
      return r.abort();
    }
    return r.continue();
  });
  await p.goto("http://127.0.0.1:" + server.address().port);
  await p.addScriptTag({ content: outputFiles[0].text });
  await p.evaluate((theme2) => document.documentElement.dataset.theme = theme2, theme);
  await mount(p, kind, options);
  return p;
}
async function type(p, selector, value) {
  const n = await p.$(selector);
  assert(n, selector);
  await n.click();
  await p.keyboard.down("Control");
  await p.keyboard.press("KeyA");
  await p.keyboard.up("Control");
  await p.keyboard.press("Backspace");
  await n.type(value, { delay: 30 });
  await p.keyboard.press("Tab");
}
async function snap(p, stage) {
  return p.$eval("#subject", (n, stage2) => ({ stage: stage2, value: n.value, type: n.type, model: window.state(), badInput: n.validity.badInput, valid: n.validity.valid, customError: n.validity.customError, events: window.events.slice(), attempts: window.attempts.slice() }), stage);
}
async function button(p, text) {
  const h = await p.evaluateHandle((text2) => [...document.querySelectorAll("button")].find((n) => n.checkVisibility() && n.textContent.trim() === text2), text);
  assert(h.asElement(), text);
  await h.asElement().click();
}
async function open(p) {
  await p.click(".ui-temporal>button");
  await p.waitForSelector("[role=dialog]");
}
async function closed(p) {
  await p.waitForFunction(() => !document.querySelector("[role=dialog]"));
}
let active;
try {
  for (const [kind, initial] of Object.entries(values)) {
    for (const zone of ["America/Asuncion", "Asia/Tokyo"]) {
      const p2 = active = await page(kind, { zone });
      const x2 = await snap(p2, "timezone");
      check(`${kind} ${zone}: civil ISO unchanged`, x2.value === initial && x2.model === initial);
      await p2.close();
    }
    const p = active = await page(kind);
    check(`${kind}: main ref reaches text input`, await p.evaluate(() => window.ref() === document.querySelector("#subject") && window.ref().type === "text"));
    for (const [name, raw] of [["partial", partial[kind]], ["impossible", invalid[kind]]]) {
      await type(p, "#subject", raw);
      await p.click("#other");
      await p.type("#other", "unrelated");
      let x2 = await snap(p, name + " after rerender");
      check(`${kind}: ${name} raw survives other field`, x2.value === raw && x2.model === raw, x2);
      await p.click("#submit");
      x2 = await snap(p, name + " submit");
      check(`${kind}: ${name} cannot submit as optional empty`, x2.attempts.at(-1)?.value === raw && x2.attempts.at(-1)?.accepted === false, x2);
      report.observations.push({ kind, ...x2 });
    }
    await open(p);
    await button(p, "Cancelar");
    await closed(p);
    check(`${kind}: picker Cancel preserves impossible raw`, (await snap(p, "Cancel")).value === invalid[kind]);
    await open(p);
    await p.keyboard.press("Escape");
    await closed(p);
    check(`${kind}: picker Escape preserves impossible raw`, (await snap(p, "Escape")).value === invalid[kind]);
    await type(p, "#subject", initial);
    await open(p);
    const stageSelector = kind === "time" ? '[role=dialog] input[aria-label="Horas (00\u201323)"]' : kind === "month" ? '[role=dialog] input[aria-label="Mes"]' : '[role=dialog] input[aria-label="Fecha"]';
    await p.waitForSelector(stageSelector);
    await p.focus(stageSelector);
    if (kind === "time") {
      await p.keyboard.down("Control");
      await p.keyboard.press("KeyA");
      await p.keyboard.up("Control");
    } else for (let i = 0; i < 6; i++) await p.keyboard.press("ArrowLeft");
    await p.keyboard.press("Backspace");
    check(`${kind}: incomplete staged picker cannot Apply`, await p.evaluate(() => [...document.querySelectorAll("[role=dialog] button")].find((n) => n.textContent.trim() === "Aplicar")?.disabled));
    await button(p, "Cancelar");
    await closed(p);
    check(`${kind}: invalid staged draft never replaces main value`, (await snap(p, "invalid staged Cancel")).value === initial);
    await open(p);
    if (kind === "date" || kind === "month" || kind === "datetime") {
      const selector = kind === "month" ? '[role=dialog] input[aria-label="Mes"]' : '[role=dialog] input[aria-label="Fecha"]';
      await p.waitForSelector(selector);
      await p.focus(selector);
      for (let i = 0; i < 6; i++) await p.keyboard.press("ArrowLeft");
      await p.keyboard.press("ArrowUp");
    } else {
      await type(p, '[role=dialog] input[aria-label="Horas (00\u201323)"]', "23");
      await type(p, '[role=dialog] input[aria-label="Minutos (00\u201359)"]', "59");
    }
    await button(p, "Aplicar");
    await closed(p);
    let x = await snap(p, "Apply");
    check(`${kind}: staged Apply commits a new valid civil value`, x.value !== initial && x.value !== "" && x.model === x.value && x.valid, x);
    check(`${kind}: Apply callback has actual DOM target and native Event`, x.events.at(-1)?.targetIsInput && x.events.at(-1)?.nativeEvent, x.events.at(-1));
    await type(p, "#subject", "");
    await p.click("#submit");
    x = await snap(p, "intentional clear");
    check(`${kind}: intentional complete clear remains supported`, x.attempts.at(-1)?.accepted && x.attempts.at(-1)?.value === "");
    await p.close();
    const pending = active = await page(kind, { options: { pending: true } });
    check(`${kind}: pending disables main and icon`, await pending.evaluate(() => document.querySelector("#subject").disabled && document.querySelector(".ui-temporal>button").disabled));
    await pending.close();
    for (const option of ["disabled", "readOnly"]) {
      const p2 = active = await page(kind, { options: { [option]: true } });
      check(`${kind}: ${option} prevents picker editing`, await p2.evaluate((option2) => document.querySelector(".ui-temporal>button").disabled && (option2 === "readOnly" ? document.querySelector("#subject").readOnly : document.querySelector("#subject").disabled), option));
      await p2.close();
    }
    const min = { date: "2026-10-18", time: "13:46", datetime: "2026-10-17T13:46", month: "2026-11" };
    const max = { date: "2026-10-16", time: "13:44", datetime: "2026-10-17T13:44", month: "2026-09" };
    for (const [bound, value] of [["min", min[kind]], ["max", max[kind]]]) {
      const p2 = active = await page(kind, { options: { [bound]: value } });
      await p2.click("#submit");
      const x2 = await snap(p2, bound);
      check(`${kind}: ${bound} range blocks out-of-range raw submission`, !x2.valid && x2.attempts.at(-1)?.accepted === false, x2);
      await p2.close();
    }
  }
  const tokyo=active=await page('datetime',{zone:'Asia/Tokyo'});await open(tokyo);await type(tokyo,'[role=dialog] input[aria-label="Horas (00–23)"]','23');await type(tokyo,'[role=dialog] input[aria-label="Minutos (00–59)"]','59');await button(tokyo,'Aplicar');await closed(tokyo);check('Tokyo datetime Apply keeps civil date and 24h time without offset conversion',(await snap(tokyo,'Tokyo Apply')).value==='2026-10-17T23:59');await tokyo.close();
  for (const width of [1366, 390]) for (const theme of ["light", "dark"]) {
    const p = active = await page("datetime", { width, theme });
    await open(p);
    const x = await p.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      return { overflow: document.documentElement.scrollWidth - innerWidth, dialogWidth: d.getBoundingClientRect().width, ampm: /\b(?:AM|PM)\b/.test(d.textContent) };
    });
    check(`${width} ${theme}: no page/dialog overflow`, x.overflow <= 0 && x.dialogWidth <= width, x);
    check(`${width} ${theme}: clock has no AM/PM`, !x.ampm, x);
    const file = `${width}-${theme}.png`;
    await p.screenshot({ path: resolve(out, file) });
    report.screenshots.push(file);
    await p.close();
  }
  for (const kind of ["date", "time"]) {
    const p = active = await page(kind);
    await p.evaluate(({ kind: kind2, initial }) => window.mountEditor(kind2, initial), { kind, initial: values[kind] });
    await p.waitForSelector("[data-field=subject] input");
    await type(p, "[data-field=subject] input", partial[kind]);
    await type(p, "[data-field=other] input", "unrelated change");
    await p.click("button[type=submit]");
    check(`Editor ${kind}: partial raw is preserved and never saved empty`, await p.evaluate((raw) => document.querySelector("[data-field=subject] input").value === raw && window.writes.length === 0, partial[kind]));
    await p.close();
  }
  check("No JavaScript page errors", report.browserErrors.length === 0);
  check("No external requests or API writes", report.blockedRequests.length === 0);
} catch (e) {
  report.checks.push({ name: "Runner completion", passed: false, error: e.stack });
  await active?.screenshot({ path: resolve(out, "failure.png") }).catch(() => {
  });
  console.error(e.stack);
} finally {
  report.passed = report.checks.every((c) => c.passed);
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failed: report.checks.filter((c) => !c.passed) }));
  if (!report.passed) process.exitCode = 1;
}
