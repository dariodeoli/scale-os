# Responsive skills research — Scale

Read-only research; cloned sources under /tmp. No installer or upstream script executed; no app/service edits.

## Verified sources

- https://github.com/ov3rf1w/ui-responsive-audit — HEAD `2966fe6f866e1e8bad37d3ce6a88434a474fc11b`, version0.5.0, MIT ©2026 Raphael Wagner. Local `/tmp/scale-responsive-audit-research`. Contains SKILL.md, agents/openai.yaml (Codex display/default_prompt metadata, **not a background scheduler or a set of independently executable agents**), audit geometry tests, real Playwright script, static server. Node>=20; peer playwright-core>=1.40.
- https://github.com/AsadSumbul/mobile-responsive — HEAD `668ae10be644082adb0b1b999461bc2f8a15c861`, skill version1.0.0, MIT ©2026 Asad. Local `/tmp/scale-mobile-responsive-research`. Contains SKILL.md, reference docs, optional CommonJS Playwright overflow checker. No agents directory. README explicitly lists Codex support; plain Agent Skills format.

Both can be copied into a project-scoped supported skills directory for Codex; global installation is unnecessary. Preserve LICENSE and pin revision in attribution/manifest if vendored.

## Adopted method / adaptation

Responsive-audit method: production build, sample three representative surfaces first; inspect sample before expanding; audit full sections and sticky start/mid/end scroll states; triage automated geometry with screenshots; repair smallest affected states and repeat final matrix. Mobile-responsive method: reuse Scale's tokens/components, min-width responsive reflow, min-width:0 for flex/grid children, target44px, input16px on touch; fix overflow at source, never hide all document overflow to mask it.

Scale is Next SSR/authenticated, not static export. Use own `next start` process against compiled `.next/BUILD_ID`, local synthetic API/session, never static-serve out/. Existing docs/qa/ui-app-241/browser-matrix.mjs already provides local-only Puppeteer, private cookie file, external request blocking, themes, screenshots, runtime/error collection; it is the best implementation base. Existing build-tools/run-ui-browser-241.mjs runs17 isolated browser groups with Chromium preflight and fails missing browser. It tests synthetic components, not full authenticated app responsiveness.

## Upstream limitations to avoid

- responsive-audit launchBrowser tries msedge, chrome, bundled Chromium; **does not** honor CHROME_PATH/PUPPETEER_EXECUTABLE_PATH. Needs adaptation for /usr/bin/chromium.
- No storageState/session cookie support. Only consent localStorage seed. Authenticated route matrix would otherwise audit login redirects instead of app; assert actual route and heading.
- Script prints failureCount but does **not** exit nonzero for findings; explicit result gate required.
- check-overflow.js scans element right edges, including descendants intentionally clipped inside scroll containers; can create false positives. Assess document.scrollWidth plus responsible ancestor scroll behavior, left edge and containment. It also reports only15 unique offenders and lacks sticky/overlap/images/auth coverage.
- Upstream tap and overlap findings require screenshot confirmation; duplicate parent/child box intersections and icon child dimensions must not count as independent broken controls.
- No upstream agent directory gives automatic scheduling; Codex coordinator must explicitly delegate tasks.

## Executable Scale matrix plan

1. Integrator serves a clean production build and gives exact source SHA/BUILD_ID + local URL; own API synthetic sessions only. Do not share .next across active builds or stop other stacks.
2. Reuse matrix runner, env QA_BASE_URL, QA_SESSION_FILE, QA_COMPILED_SOURCE, QA_OUT. Extend viewport definitions to320x740,390x844,768x1024,1024x768,1440x1000. Add320x568 for short-screen login/signup/dialogs; include light/dark/contrast themes where changed tokens/hover apply.
3. Sample login/register, authenticated balance, inventory/dialog at320/768/1440 first. Wait fonts.ready + two animation frames, dismiss only demo introductory UI; do not hide UI defects.
4. Route coverage: public /, /registro, /demo, /recuperar-cuenta, /status; internal /resumen,/produccion,/pipeline,/clientes,/presupuestos,/contratos,/proyectos,/inventario,/estudio,/equipo,/pagos,/informes,/configuracion,/pagos/balance,/pagos/mora,/pagos/prevision; synthetic admin /superadmin and portal with dedicated fixtures where available. Missing surfaces recorded as missing, not passed.
5. For each route assert expected pathname+content; collect document horizontal overflow<=1px; visible controls bounding boxes and44px touch targets; form label/field alignment; broken images complete&&naturalWidth===0 plus HTTP photo errors; image intrinsic/box/object-fit geometry; clipped ancestors; center/corner elementFromPoint checks for important visible controls; page runtime and HTTP errors. Exempt intentional scroll containers only with accessible internal scrolling and no document overflow.
6. Natural scroll0/50%/100% verifies fixed header/footer and sticky interference. Open mobile navigation and one meaningful canonical editor/dropdown per domain, validate dialog inside viewport, no hidden save/close, body scroll lock and restore, Escape/backdrop behavior, keyboard focus containment and return. Open/discard only, no production mutation.
7. Visual inspection of sample and each confirmed defect at affected widths; retain screenshots /tmp, commit compact JSON+Markdown summary and reproducible runner (not cookies/identities). Evidence records compiledSHA/BUILD_ID, width,height,theme,route,state,expected/actual, screenshotSHA if needed. Keep image checks meaningful with synthetic photo fixtures, not blank empty-state app.
8. Domain agents implement only assigned page files; design-system owner handles shared styles/primitives. Every defect maps to issue and acceptance. Recheck affected states, then full matrix after integration. Required release regression/build/browser gates follow repo AGENTS; publish is sole integrator responsibility.

## Reusable repo evidence

- docs/qa/ui-app-241/browser-matrix.mjs:96 scenarios previously (16routes×2widths×3themes); add widths/interaction/scroll/image checks, record actual route failures.
- docs/qa/integration-194/browser.mjs: compiled source gate, fixture readiness, local requests and write blocking, domain focals.
- build-tools/visual-harness/verify-admin-mobile-155.mjs: CDP interception, admin synthetic fixture,44px tabs, scroll restore at390/1440. CHROME_PATH required on Linux if using launchChrome; default path is macOS.
- tests/mobile-form-layout.test.ts: CSS contracts only; explicitly not visual QA.
- tests/com-responsive-tables.test.tsx: dense-table fit uses actual available container width (1080px clients), not viewport; preserve fallback rules rather than cramming columns onto320px.

## Standalone upstream invocation, if adapting it

Set PROJECT_ROOT to a temporary package containing playwright-core (not Scale product deps), CONFIG to explicit Scale routes, BASE to local Next server, CUSTOM_VIEWPORTS='phone-320:320x740:mobile', VIEWPORTS='phone-320,phone-390x844,ipad-mini-portrait-768x1024,ipad-mini-landscape-1024x768,desktop-1440x900', MODE=audit, SECTION_AUDIT=1, PINNED_AUDIT=1, OUT=/tmp/scale-responsive-upstream. Patch temporary copy for executablePath+storageState and block external networks; do not run against auth app without those adaptations. Read summary failureCount/coverage and produce nonzero gate yourself.
