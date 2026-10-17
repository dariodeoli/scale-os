import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';

// «Reportar un problema», captura de errores del navegador y CSV sin fórmulas.
Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const reactDOM = require('react-dom');
reactDOM.createPortal = (children: React.ReactNode) => children;
const hostDocument = {body: {style: {overflow: ''}}, activeElement: null as unknown, addEventListener() {}, removeEventListener() {}};
Object.defineProperty(globalThis, 'document', {configurable: true, value: hostDocument});
const hostNode = () => ({tagName: 'DIV', tabIndex: -1, isConnected: true, querySelectorAll: () => [], querySelector: () => null, closest: () => null, contains: () => true, focus() { hostDocument.activeElement = this; }});
const {ReportProblemButton, ReportProblemDialog, reportProblemError, reportProblemPayload, REPORT_MAX} = require('../app/report-problem') as typeof import('../app/report-problem');
const {buildClientErrorPayload, createClientErrorReporter, describeThrown, routeWithoutQuery, CLIENT_ERROR_LIMITS} = require('../app/client-error-reporter') as typeof import('../app/client-error-reporter');
const {APP_VERSION} = require('../app/app-version') as typeof import('../app/app-version');
const front = require('../app/csv-safety') as typeof import('../app/csv-safety');
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('');
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('validación y payload del reporte: ≤1000, categoría, ruta sin query y versión de la app', () => {
  assert.equal(reportProblemError('hola mundo', ''), 'Elegí una categoría.');
  assert.equal(reportProblemError('  hey ', 'error'), 'Contanos un poco más del problema.');
  assert.match(reportProblemError('x'.repeat(REPORT_MAX + 1), 'error'), /1000/);
  assert.equal(reportProblemError('No guarda el presupuesto', 'error'), '');
  assert.deepEqual(reportProblemPayload('  No guarda  ', 'datos', '/presupuestos/12?token=abc#x'), {message: 'No guarda', category: 'datos', route: '/presupuestos/12', app_version: APP_VERSION});
});

test('el diálogo valida en línea, envía el reporte y cierra; un 429 del API se muestra en línea', async () => {
  const sent: unknown[] = [];let closed = 0;let fail = '';
  const send = async (payload: unknown) => { if (fail) throw new Error(fail); sent.push(payload); return {}; };
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<ReportProblemDialog onClose={() => { closed++; }} route="/finanzas?mes=2026-10" send={send}/>, {createNodeMock: hostNode}); });
  const root = renderer.root;
  assert.ok(root.findAll(node => node.props.role === 'dialog').length >= 1, 'diálogo con rol');
  assert.ok(text(root).includes('Reportar un problema'));
  const textarea = root.findByType('textarea');
  assert.equal(textarea.props.maxLength, 1000);
  assert.ok(root.findAllByType('button').some(node => text(node) === 'Enviar reporte' && node.props.type === 'submit'));
  const confirm = () => ({props: {onClick: () => root.findByType('form').props.onSubmit({preventDefault() {}})}});
  await act(async () => { confirm().props.onClick(); });
  assert.equal(sent.length, 0);
  assert.ok(text(root).includes('Elegí una categoría.'), 'error en línea, no toast');
  await act(async () => { root.findAll(node => typeof node.props.onChange === 'function' && node.props.label === 'Categoría')[0].props.onChange('lentitud'); });
  await act(async () => { root.findByType('textarea').props.onChange({target: {value: 'La lista de clientes tarda mucho en cargar.'}}); });
  assert.ok(text(root).includes('43/1000'), 'contador de caracteres');
  fail = 'Ya enviaste varios reportes en la última hora.';
  await act(async () => { confirm().props.onClick(); });
  assert.ok(text(root).includes('Ya enviaste varios reportes'), 'el 429 se muestra en línea');
  assert.equal(closed, 0);
  fail = '';
  await act(async () => { confirm().props.onClick(); });
  assert.deepEqual(sent[0], {message: 'La lista de clientes tarda mucho en cargar.', category: 'lentitud', route: '/finanzas', app_version: APP_VERSION});
  assert.equal(closed, 1);
  act(() => renderer.unmount());
});

test('reporte y logout viven junto a notificaciones, fuera del lateral; Demo no reporta', () => {
  const shell = read('app/scale-workspace.tsx');
  assert.match(shell, /user&&!user\.demo_owner_user_id&&<ReportProblemButton/);
  const start=shell.indexOf('<div className="topbar-utility-actions');
  const end=shell.indexOf('<PageTitleContext.Provider',start);
  const actions=shell.slice(start,end),sidebar=shell.slice(shell.indexOf('const sidebarContent'),start);
  assert.match(actions, /<ReportProblemButton iconOnly\/>/);
  assert.match(actions, /<ScaleIconButton type="button" label="Cerrar sesión"[^>]+onClick=\{logout\}/);
  assert(actions.indexOf('<NotificationBell')<actions.indexOf('<ReportProblemButton'));
  assert(actions.indexOf('<ReportProblemButton')<actions.indexOf('label="Cerrar sesión"'));
  assert(!sidebar.includes('<ReportProblemButton'));
  assert(!sidebar.includes('nav-logout'));
  assert(!shell.includes('ThemeToggle'));
  assert.equal((shell.match(/<ReportProblemButton/g)||[]).length,1);
  const source = read('app/report-problem.tsx');
  assert.match(source, /aria-label="Reportar un problema"/);
  assert.match(source, /\/api\/support\/reports/);
});

test('el icono canónico tiene nombre/tooltip y abre el diálogo reutilizado; cancelar permite reabrir', async () => {
  let renderer!: ReactTestRenderer;
  await act(async()=>{renderer=create(<ReportProblemButton iconOnly/>,{createNodeMock:hostNode});});
  const trigger=()=>renderer.root.findAllByType('button').find(node=>node.props['aria-label']==='Reportar un problema')!;
  assert.equal(trigger().props.title,'Reportar un problema');
  assert.equal(trigger().props.type,'button');
  assert.equal(trigger().props['data-ui-size'],'compact');
  assert.equal(trigger().props['data-ui-icon-button'],'');
  assert.equal(text(trigger()),'','el acceso no agrega texto visible a la fila');
  await act(async()=>trigger().props.onClick());
  assert.equal(renderer.root.findAllByType(ReportProblemDialog).length,1);
  await act(async()=>renderer.root.findByType(ReportProblemDialog).props.onClose());
  assert.equal(renderer.root.findAllByType(ReportProblemDialog).length,0);
  await act(async()=>trigger().props.onClick());
  assert.equal(renderer.root.findAllByType(ReportProblemDialog).length,1);
  act(()=>renderer.unmount());
});

test('captura de errores del navegador: sin query, sin ruido, sin duplicados y con tope por página', async () => {
  assert.equal(routeWithoutQuery('/clientes/1?token=x#a'), '/clientes/1');
  assert.equal(buildClientErrorPayload({message: 'Script error.', kind: 'error'}), null, 'script de otro origen sin detalle');
  assert.equal(buildClientErrorPayload({message: 'ResizeObserver loop completed with undelivered notifications.', kind: 'error'}), null);
  assert.equal(buildClientErrorPayload({message: 'x', stack: 'at f (chrome-extension://abc/x.js:1:1)', kind: 'error'}), null, 'extensiones');
  const payload = buildClientErrorPayload({message: 'x'.repeat(900), stack: 'y'.repeat(9000), kind: 'boundary', route: '/a?b=c'})!;
  assert.equal(payload.message.length, CLIENT_ERROR_LIMITS.message);assert.equal(payload.stack.length, CLIENT_ERROR_LIMITS.stack);
  assert.equal(payload.route, '/a');assert.equal(payload.version, APP_VERSION);
  assert.deepEqual(describeThrown(new TypeError('boom')).message, 'TypeError: boom');
  assert.equal(describeThrown('texto').message, 'texto');
  const bodies: string[] = [];
  const report = createClientErrorReporter(body => { bodies.push(body); });
  assert.equal(report(new Error('Falla A'), 'error', '/x?token=1'), true);
  assert.equal(report(new Error('Falla A'), 'error', '/x'), false, 'no repite el mismo error');
  for (let i = 0; i < 20; i++) report(new Error(`Falla ${i}`), 'unhandledrejection', '/y');
  assert.equal(bodies.length, CLIENT_ERROR_LIMITS.perPage, 'tope por carga de página');
  const first = JSON.parse(bodies[0]);
  assert.equal(first.route, '/x');assert.equal(first.kind, 'error');
  assert.ok(bodies.every(body => body.length <= CLIENT_ERROR_LIMITS.body));
  // Un envío que falla nunca rompe la página.
  const failing = createClientErrorReporter(() => Promise.reject(new Error('red caída')));
  assert.equal(failing(new Error('otra'), 'error', '/'), true);
  await new Promise(resolve => setTimeout(resolve, 0));
  // Montado en el layout raíz y en los boundaries de Next.
  assert.match(read('app/layout.tsx'), /<ClientErrorReporter\/>/);
  assert.match(read('app/error.tsx'), /reportClientError\(error,'boundary'\)/);
  assert.match(read('app/global-error.tsx'), /reportClientError\(error,'boundary'\)/);
  assert.match(read('app/client-error-reporter.tsx'), /credentials: "omit"/, 'sin cookies');
});

test('CSV: helper único del front con la misma tabla que el API (paridad) y adoptado por todos los exportadores', () => {
  const back = require('../backend/csv-safety.js') as typeof import('../app/csv-safety');
  const cases: unknown[] = ['=1+1', '+cmd', '@SUM(A1)', '-2+3', '  =x', '\t=1', '-', '-12.50', '42', '+595 981123456', 'Ana', '', null, undefined, true, false, 'a,b', 'di "x"', 'x;y'];
  for (const value of cases) {
    assert.equal(front.neutralizeCsvValue(value), back.neutralizeCsvValue(value), `paridad neutralize ${JSON.stringify(value)}`);
    assert.equal(front.csvCell(value), back.csvCell(value), `paridad csvCell ${JSON.stringify(value)}`);
    assert.equal(front.csvCell(value, {delimiter: ';', quote: true}), back.csvCell(value, {delimiter: ';', quote: true}));
  }
  assert.equal(front.neutralizeCsvValue('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
  assert.equal(front.neutralizeCsvValue('-150'), '-150');
  const {clientsCsv} = require('../app/client-bulk') as typeof import('../app/client-bulk');
  const csv = clientsCsv([{id: '1', name: '=cmd|" /C calc"!A0', email: '@evil', phone: '+595 981123456'} as never], {canSeeContact: true, canSeeBilling: false, payments: [], activity: new Map(), stateLabel: () => '-Activo'});
  assert.ok(csv.includes(`"'=cmd|"" /C calc""!A0"`) && csv.includes("'@evil") && csv.includes(',+595 981123456,') && csv.includes("'-Activo"), 'clientes');
  for (const file of ['app/reports-csv.ts', 'app/client-bulk.ts']) assert.match(read(file), /from '\.\/csv-safety'/, `${file} usa el helper`);
  assert.match(read('backend/personal-data.js'), /from '\.\/csv-safety\.js'/);
});

test('single flight starts before validation and a duplicate confirmation sends/closes once',async()=>{
 let renderer!:ReactTestRenderer,calls=0,closed=0,release!:()=>void;
 const send=async()=>{calls++;await new Promise<void>(resolve=>{release=resolve;});};
 await act(async()=>{renderer=create(<ReportProblemDialog onClose={()=>{closed++;}} send={send}/>,{createNodeMock:hostNode});});
 const {ConfirmDialog}=require('../app/dialog') as typeof import('../app/dialog');
 const confirm=()=>renderer.root.findByType(ConfirmDialog).props.onConfirm();
 await act(async()=>{confirm();confirm();});assert.equal(calls,0,'invalid attempts never send');
 await act(async()=>renderer.root.findAll(node=>node.props.label==='Categoría'&&typeof node.props.onChange==='function')[0].props.onChange('error'));
 await act(async()=>renderer.root.findByType('textarea').props.onChange({target:{value:'Reporte sintético válido'}}));
 await act(async()=>{confirm();confirm();});assert.equal(calls,1,'synchronous mutex blocks duplicate callback');
 assert.equal(renderer.root.findByType('textarea').props.disabled,true);
 await act(async()=>{release();});assert.equal(closed,1);
 await act(async()=>{confirm();});assert.equal(calls,1,'successful send is not repeated if a consumer has not unmounted yet');assert.equal(closed,1);
 act(()=>renderer.unmount());
});
