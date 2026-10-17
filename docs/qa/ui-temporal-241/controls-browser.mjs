import { createRequire } from "node:module";
import { createServer } from "node:http";
import { writeFile, readFile, mkdir } from "node:fs/promises";
const r = createRequire(new URL("../../../backend/package.json", import.meta.url));
const { build } = r("esbuild"), puppeteer = r("puppeteer-core");
const repo = new URL("../../../", import.meta.url).pathname;
const source = `import React,{useState,useRef}from'react';import{createRoot}from'react-dom/client';import{DateInput,TimeInput,DateTimeInput,MonthInput}from'./app/ui/temporal';window.trace=[];const kinds={date:DateInput,time:TimeInput,datetime:DateTimeInput,month:MonthInput};window.mount=(kind,initial,options={})=>{function App(){const[v,set]=useState(initial),[other,S]=useState(''),ref=useRef(null);window.ref=()=>ref.current;const C=kinds[kind];window.state=()=>v;return <form noValidate onSubmit={e=>{e.preventDefault();window.saved=v}}><C {...options} ref={ref} id='subject' value={v} onChange={e=>{window.trace.push({value:e.target.value,bad:e.target.validity.badInput});set(e.target.value)}}/><input id='other' value={other} onChange={e=>S(e.target.value)}/><button>Guardar</button></form>}createRoot(document.getElementById('root')).render(<App/>)};`;
const b = await build({ stdin: { contents: source, resolveDir: repo, loader: "tsx" }, bundle: true, write: false, jsx: "automatic", format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
const css = await readFile(repo + "app/ui-tokens.css", "utf8") + "\n" + await readFile(repo + "app/ui-system.css", "utf8");
const s = createServer((q, z) => z.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + 'body{margin:0;background:var(--surface);color:var(--text);font-family:Arial}#root{max-width:450px;margin:auto;padding:16px}form{display:grid;gap:12px}input{height:42px;box-sizing:border-box}</style></head><body><div id="root"></div></body></html>'));
await new Promise((r2) => s.listen(0, "127.0.0.1", r2));
const browser = await puppeteer.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const out = process.env.QA_OUT || "/tmp/temporal-controls";
await mkdir(out, { recursive: true });
const checks = [], observations = [], screenshots = [];
const values = { date: "2026-10-17", time: "13:45", datetime: "2026-10-17T13:45", month: "2026-10" };
const max = { date: "2026-10-16", time: "13:44", datetime: "2026-10-17T13:44", month: "2026-09" };
function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
}
async function page(kind, options = {}, width = 1366, theme = "light") {
  const p2 = await browser.newPage();
  await p2.setViewport({ width, height: 900 });
  await p2.emulateTimezone("America/Asuncion");
  await p2.goto("http://127.0.0.1:" + s.address().port);
  await p2.addScriptTag({ content: b.outputFiles[0].text });
  await p2.evaluate(({ kind: kind2, initial, options: options2, theme: theme2 }) => {
    document.documentElement.dataset.theme = theme2;
    window.mount(kind2, initial, options2);
  }, { kind, initial: values[kind], options, theme });
  await p2.waitForSelector("#subject");
  return p2;
}
async function snap(p2, stage) {
  return p2.$eval("#subject", (n, stage2) => ({ stage: stage2, value: n.value, badInput: n.validity.badInput, valid: n.validity.valid, rangeUnderflow: n.validity.rangeUnderflow, rangeOverflow: n.validity.rangeOverflow, model: window.state(), trace: window.trace, saved: window.saved }), stage);
}
for (const [kind, initial] of Object.entries(values)) {
  const p2 = await page(kind);
  check(kind + " forwarded ref targets actual input", await p2.evaluate(() => window.ref() === document.querySelector("#subject")));
  await p2.focus("#subject");
  for (let i = 0; i < 6; i++) await p2.keyboard.press("ArrowLeft");
  await p2.keyboard.press("ArrowUp");
  const changed = await snap(p2, "ArrowUp manual existing value");
  check(kind + " valid native keyboard edit emits changed ISO", changed.valid && changed.value !== initial && changed.model === changed.value, changed);
  await p2.click("#other");
  await p2.type("#other", "other");
  check(kind + " valid keyboard edit survives unrelated rerender", (await snap(p2, "rerender")).value === changed.value);
  await p2.$eval("#subject", (n) => {
    window.picker = [];
    const old = n.showPicker?.bind(n);
    n.showPicker = () => {
      window.picker.push(Boolean(old));
      return old?.();
    };
  });
  await p2.click(".ui-temporal button");
  check(kind + " icon calls actual browser showPicker", await p2.evaluate(() => window.picker.length === 1 && window.picker[0]));
  await p2.keyboard.press("Escape");
  check(kind + " picker leaves civil value intact", (await snap(p2, "picker")).value === changed.value);
  await p2.close();
  for (const opt of ["pending", "disabled", "readOnly"]) {
    const p3 = await page(kind, { [opt]: true });
    check(kind + " " + opt + " disables picker", await p3.$eval(".ui-temporal button", (n) => n.disabled));
    check(kind + " " + opt + " native input state", await p3.$eval("#subject", (n, opt2) => opt2 === "readOnly" ? n.readOnly : n.disabled, opt));
    await p3.close();
  }
  for (const bound of ["min", "max"]) {
    const p3 = await page(kind, { [bound]: bound === "max" ? max[kind] : { date: "2026-10-18", time: "13:46", datetime: "2026-10-17T13:46", month: "2026-11" }[kind] });
    const x = await snap(p3, bound);
    check(kind + " native " + bound + " constraint remains detectable", bound === "max" ? x.rangeOverflow : x.rangeUnderflow, x);
    await p3.close();
  }
}
for (const width of [1366, 390]) for (const theme of ["light", "dark"]) {
  const p2 = await page("datetime", {}, width, theme);
  const x = await p2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, picker: document.querySelector(".ui-temporal button").getBoundingClientRect().height }));
  check(width + " " + theme + " no overflow", x.overflow <= 0, x);
  check(width + " " + theme + " picker target", x.picker >= (width === 390 ? 44 : 32), x);
  const file = width + "-" + theme + ".png";
  await p2.screenshot({ path: out + "/" + file });
  screenshots.push(file);
  await p2.close();
}
const p = await page("date");
await p.focus("#subject");
for (let i = 0; i < 6; i++) await p.keyboard.press("ArrowLeft");
await p.keyboard.type("02");
await p.keyboard.type("31");
await p.keyboard.type("2026");
observations.push(await snap(p, "Attempt February31 via native keyboard"));
await p.click("#other");
await p.type("#other", "rerender");
observations.push(await snap(p, "Impossible date after rerender"));
await p.close();
const report = { source: process.env.QA_SOURCE_SHA, checks, observations, screenshots, passed: checks.every((c) => c.passed), method: "Actual keyboard, native input constraints and original showPicker instrumentation. Initial values/options are React props, not synthetic input events." };
await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, failed: checks.filter((c) => !c.passed), observations }));
await browser.close();
await new Promise((r2) => s.close(r2));
