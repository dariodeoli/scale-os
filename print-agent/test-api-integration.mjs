// Real loopback HTTP -> production printing handler -> PGlite -> production PrintAgent.
// Only the final hardware transport is stubbed. No production credentials or physical destinations.
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PrintAgent } from './agent.mjs';
const backend = path.resolve(process.env.SCALE_PRINT_TEST_BACKEND || path.join(import.meta.dirname, '../backend'));
const requireBackend = createRequire(path.join(backend, 'package.json'));
const { PGlite } = requireBackend('@electric-sql/pglite');
const { printing } = await import(pathToFileURL(path.join(backend, 'printing.js')));
const { migrationOrder } = await import(pathToFileURL(path.join(backend, 'scripts/migration-order.mjs')));
const pg = new PGlite();
const db = { query: (sql, values) => pg.query(sql, values), connect: async () => ({ query: (sql, values) => pg.query(sql, values), release() {} }) };
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scale-print-interop-'));
let server;
try {
  await pg.exec(await fs.readFile(path.join(backend, 'schema.sql'), 'utf8'));
  for (const migration of new Set([...migrationOrder, '20261019_thermal_printing.sql'])) await pg.exec(await fs.readFile(path.join(backend, 'migrations', migration), 'utf8'));
  const org = (await db.query("insert into organizations(slug,name) values('interop','Interop fixture') returning id")).rows[0].id;
  const other = (await db.query("insert into organizations(slug,name) values('interop-other','Other fixture') returning id")).rows[0].id;
  const user = (await db.query("insert into users(email,password_hash) values('interop@example.invalid','unused') returning id")).rows[0].id;
  await db.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')", [org, user]);
  const actor = { id: user, organization_id: org, role: 'owner' };
  server = http.createServer(async (req, res) => {
    try {
      await printing({ req, res, url: new URL(req.url, 'https://app.scaleparaguay.com'), db, session: async () => actor,
        body: async () => { let data = ''; for await (const chunk of req) data += chunk; return data ? JSON.parse(data) : {}; },
        send: (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); } });
    } catch { res.writeHead(500); res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, body, token) => {
    const response = await fetch(`${origin}${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Host: 'app.scaleparaguay.com', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, ...await response.json() };
  };
  const base = '/api/agency/printing';
  const printer = await request(`${base}/printers`, { name: 'Interop thermal80', connection: 'cups', destination: 'cups:INTEROP', width_mm: 80 }); assert.equal(printer.status, 201);
  const tpl = await request(`${base}/templates`, { name: 'Interop template', kind: 'test', definition: { widthMm: 80 } }); assert.equal(tpl.status, 201);
  const bridge = await request(`${base}/bridges`, { name: 'Interop computer' }); assert.equal(bridge.status, 201);
  const pair = await request('/api/print/bridges/pair', { code: bridge.pairing_code }); assert.equal(pair.status, 201);
  assert.equal((await request('/api/print/bridges/pair', { code: bridge.pairing_code })).status, 401);
  const config = { apiOrigin: origin, bridgeId: pair.bridge.id, bridgeToken: pair.token };
  const remoteFetch = (url, options) => fetch(url, { ...options, headers: { ...options.headers, Host: 'app.scaleparaguay.com' } });
  const data = { printer_id: printer.printer.id, template_id: tpl.template.id, reference: 'INTEROP-3', copies: 3, idempotency_key: 'interop-three', data: { title: 'Synthetic fixture' } };
  const created = await request(`${base}/jobs`, data); assert.equal(created.status, 201);
  const row = (await db.query('select * from agency_print_jobs where id=$1', [created.job.id])).rows[0];
  const single = Buffer.from(row.payload_base64, 'base64'); const suffix = single.toString('latin1').match(/[A-F0-9]{8}/g)?.at(-1); assert.ok(suffix);
  let sends = 0; let actual;
  const agent = await new PrintAgent({ directory, send: async (target, bytes) => { sends++; assert.equal(target.transport, 'cups'); actual = bytes; return { state: 'aceptado', transport: 'cups' }; } }).open();
  await agent.poll(config, remoteFetch); assert.equal(sends, 1); assert.deepEqual(actual, Buffer.concat([single, single, single]));
  const terminal = (await db.query('select * from agency_print_jobs where id=$1', [created.job.id])).rows[0];
  assert.equal(terminal.state, 'aceptado'); assert.equal(terminal.payload_base64, null); assert.equal(terminal.document_snapshot, null);
  assert.equal((await request(`${base}/jobs/${created.job.id}/confirm`, { suffix: 'WRONG' })).status, 400);
  assert.equal((await request(`${base}/jobs/${created.job.id}/confirm`, { suffix })).job.state, 'confirmado');
  await agent.poll(config, remoteFetch); assert.equal(sends, 1);
  // Another branch's printer is invisible to this bridge.
  await db.query("insert into agency_print_printers(id,organization_id,branch_id,name,connection,destination,width_mm) values('00000000-0000-4000-8000-000000000001',$1,'other','Other branch','cups','cups:OTHER',80)", [org]);
  const scoped = await request('/api/print/bridge/config', undefined, pair.token); assert.equal(scoped.printers.length, 1);
  await db.query("insert into agency_print_printers(id,organization_id,branch_id,name,connection,destination,width_mm) values('00000000-0000-4000-8000-000000000002',$1,'main','Other tenant','cups','cups:FOREIGN',80)", [other]);
  assert.equal((await request('/api/print/bridge/config', undefined, pair.token)).printers.length, 1);
  // Lose result acknowledgement after a real claim/send; force server lease expiration before retry.
  const expired = await request(`${base}/jobs`, { ...data, copies: 1, reference: 'INTEROP-EXPIRE', idempotency_key: 'interop-expire' }); assert.equal(expired.status, 201);
  const failAck = (url, options) => url.endsWith('/result') ? Promise.resolve(new Response('{}', { status: 503 })) : remoteFetch(url, options);
  await assert.rejects(agent.poll(config, failAck), /remote_http_503/); assert.equal(sends, 2);
  await db.query("update agency_print_jobs set leased_until=now()-interval '1 second' where id=$1", [expired.job.id]);
  await agent.poll(config, remoteFetch); assert.equal(sends, 2);
  const local = agent.jobs.find(j => j.id === expired.job.id); assert.equal(local.state, 'incierto'); assert.equal(local.reconciliation_required, true); assert.equal(local.report_http_status, 409);
  assert.equal((await db.query('select state,payload_base64 from agency_print_jobs where id=$1', [expired.job.id])).rows[0].state, 'incierto');
  await agent.poll(config, remoteFetch); assert.equal(sends, 2);
  console.log('Printing API/agent HTTP + PGlite interoperability PASS: pair once, exact 3 copies, tenant/branch scope, terminal payload wipe, human suffix, expired409 reconciliation without duplicate sends. Hardware transport stubbed; no physical print.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await pg.close(); await fs.rm(directory, { recursive: true, force: true });
}
