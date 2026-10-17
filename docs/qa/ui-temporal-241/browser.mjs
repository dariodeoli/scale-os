import { createRequire } from "node:module";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
const r = createRequire(new URL("../../../backend/package.json", import.meta.url));
const { build } = r("esbuild"), puppeteer = r("puppeteer-core");
const repo = new URL("../../../", import.meta.url).pathname;
const source = `import React,{useState,useRef}from'react';import{createRoot}from'react-dom/client';import{DateInput,TimeInput,DateTimeInput,MonthInput}from'./app/ui/temporal';window.trace=[];const kinds={date:DateInput,time:TimeInput,datetime:DateTimeInput,month:MonthInput};window.mount=(kind,initial,options={})=>{function App(){const[v,set]=useState(initial),[other,S]=useState(''),ref=useRef(null);window.ref=()=>ref.current;const C=kinds[kind];window.state=()=>v;return <form noValidate onSubmit={e=>{e.preventDefault();window.saved=v}}><C {...options} ref={ref} id='subject' value={v} onChange={e=>{window.trace.push({value:e.target.value,bad:e.target.validity.badInput});set(e.target.value)}}/><input id='other' value={other} onChange={e=>S(e.target.value)}/><button>Guardar</button></form>}createRoot(document.getElementById('root')).render(<App/>)};`;
const b = await build({ stdin: { contents: source, resolveDir: repo, loader: "tsx" }, bundle: true, write: false, jsx: "automatic", format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
const s = createServer((q, z) => z.end('<div id="root"></div>'));
await new Promise((r2) => s.listen(0, "127.0.0.1", r2));
const browser = await puppeteer.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const checks = [], observations = [];
const values = { date: "2026-10-17", time: "13:45", datetime: "2026-10-17T13:45", month: "2026-10" };
function check(name, pass, detail) {
  checks.push({ name, passed: Boolean(pass), detail });
}
const snapshot = async (p, stage) => ({ stage, ...await p.$eval("#subject", (n) => ({ value: n.value, badInput: n.validity.badInput, valid: n.validity.valid, trace: window.trace, state: window.state(), saved: window.saved })) });
for (const [kind, initial] of Object.entries(values)) {
  for (const zone of ["America/Asuncion", "Asia/Tokyo"]) {
    const p2 = await browser.newPage();
    await p2.emulateTimezone(zone);
    await p2.goto("http://127.0.0.1:" + s.address().port);
    await p2.addScriptTag({ content: b.outputFiles[0].text });
    await p2.evaluate(({ kind: kind2, initial: initial2 }) => window.mount(kind2, initial2), { kind, initial });
    await p2.waitForSelector("#subject");
    const x = await snapshot(p2, "initial");
    check(kind + " " + zone + " civil ISO preserved", x.value === initial && x.state === initial);
    await p2.close();
  }
  const p = await browser.newPage();
  await p.goto("http://127.0.0.1:" + s.address().port);
  await p.addScriptTag({ content: b.outputFiles[0].text });
  await p.evaluate(({ kind: kind2, initial: initial2 }) => window.mount(kind2, initial2), { kind, initial });
  await p.waitForSelector("#subject");
  const result = [await snapshot(p, "initial")];
  await p.focus("#subject");
  for (let i = 0; i < 6; i++) await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("Backspace");
  result.push(await snapshot(p, "keyboardBackspace"));
  await p.click("#other");
  await p.type("#other", "rerender");
  result.push(await snapshot(p, "afterOtherField"));
  await p.click("form>button");
  result.push(await snapshot(p, "submit"));
  observations.push({ kind, result });
  const last = result.at(-1);
  check(kind + " partial does not submit empty", !(last.badInput && last.saved === ""));
  await p.close();
}
console.log(JSON.stringify({ checks, observations }, null, 2));
await writeFile(process.env.QA_REPORT_FILE || "/tmp/temporal-types.json", JSON.stringify({ checks, observations }, null, 2));
await browser.close();
await new Promise((r2) => s.close(r2));
