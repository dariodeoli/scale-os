import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { destination, PrintAgent, sendLan, sendCups, localServer, atomicJson, secureOrigin } from '../agent.mjs';
const printer = { id: 'p1', width_mm: 80, enabled: true, destination: 'lan:192.168.1.23:9100' };
const input = (id = 'job1') => ({ id, printer_id: 'p1', width_mm: 80, copies: 1, payload_base64: Buffer.from('ESC POS test').toString('base64'), payload_bytes: 12 });
async function agent(t, send) { const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scale-agent-test-')); t.after(() => fs.rm(directory, { recursive: true, force: true })); return new PrintAgent({ directory, send }).open(); }
test('destination forbids arbitrary network/DNS/ports, shell options and 58 mm', async t => {
  for (const value of ['lan:127.0.0.1:9100','lan:169.254.169.254:9100','lan:8.8.8.8:9100','lan:192.168.1.1:80','lan:hostname:9100','cups:-o raw','cups:test;touch x','usb:1']) assert.throws(() => destination(value));
  assert.equal(destination('cups:Thermal_80').transport, 'cups');
  const a = await agent(t); await assert.rejects(a.enqueue({ ...input(), width_mm: 58 }, printer));
  assert.throws(() => secureOrigin('http://api.example.com')); assert.throws(() => secureOrigin('https://user:pass@api.example.com'));
});
test('durable queue, 0600, dedupe, restart uncertain and terminal payload removal', async t => {
  let sends = 0; const a = await agent(t, async () => { sends++; return { state: 'aceptado', transport: 'lan' }; });
  await a.enqueue(input(), printer); assert.equal((await fs.stat(path.join(a.directory, 'queue.json'))).mode & 0o777, 0o600);
  await assert.rejects(a.enqueue(input('different'), printer), /duplicate_job/);
  await Promise.all([a.drain(), a.drain()]); await a.enqueue(input(), printer); await a.drain(); assert.equal(sends, 1);
  assert.equal(a.jobs[0].state, 'aceptado'); assert.equal(a.jobs[0].payload_base64, undefined);
  a.jobs.push({ id: 'crashed', state: 'sending', payload_base64: 'secret' }); await a.save();
  const b = await new PrintAgent({ directory: a.directory, send: async () => { throw new Error('must not send'); } }).open();
  await b.drain(); assert.equal(b.jobs[1].state, 'incierto'); assert.equal(b.jobs[1].payload_base64, undefined);
});
test('LAN before connect failure versus ambiguous write; never fallback', async () => {
  const makeSocket = run => { const s = new EventEmitter(); s.setTimeout = () => {}; s.destroy = () => {}; s.end = (bytes, cb) => run(s, cb); queueMicrotask(() => s.emit('connect')); return s; };
  const before = await sendLan({}, Buffer.from('x'), { connect: () => { const s = new EventEmitter(); s.setTimeout = () => {}; s.destroy = () => {}; queueMicrotask(() => s.emit('error', new Error('refused'))); return s; } });
  assert.equal(before.state, 'fallido');
  assert.equal((await sendLan({}, Buffer.from('x'), { connect: () => makeSocket(s => s.emit('error', new Error('broken'))) })).state, 'incierto');
  assert.equal((await sendLan({}, Buffer.from('x'), { connect: () => makeSocket((s, cb) => cb()) })).state, 'aceptado');
});
test('CUPS raw shell=false and failure after submission stays uncertain', async () => {
  let observed;
  const fake = (command, args, options) => { observed = { command, args, options }; const c = new EventEmitter(); c.stdin = new PassThrough(); c.kill = () => {}; queueMicrotask(() => { c.emit('spawn'); c.emit('close', 1); }); return c; };
  const outcome = await sendCups({ queue: 'Thermal80' }, Buffer.from('x'), { spawnProcess: fake });
  assert.equal(outcome.state, 'incierto'); assert.equal(observed.options.shell, false); assert.deepEqual(observed.args, ['-d', 'Thermal80', '-o', 'raw']);
});
test('remote result retries survive restart without printing a second time; leases expire safely', async t => {
  let sends = 0; const a = await agent(t, async () => { sends++; return { state: 'aceptado', transport: 'lan' }; });
  const job = { ...input(), lease_id: 'lease', leased_until: new Date(Date.now() + 120000).toISOString() };
  let claimed = false; let failResult = true;
  const fetcher = async (url, options) => {
    if (url.endsWith('/heartbeat')) return Response.json({ ok: true });
    if (url.endsWith('/config')) return Response.json({ bridge: { id: 'bridge' }, printers: [printer] });
    if (url.endsWith('/claim')) { const result = claimed ? { job: null } : { job, printer }; claimed = true; return Response.json(result); }
    if (url.endsWith('/result')) { if (failResult) return new Response('', { status: 503 }); assert.equal(JSON.parse(options.body).state, 'aceptado'); return Response.json({ job: {} }); }
    throw new Error('unexpected');
  };
  const config = { apiOrigin: 'https://example.com', bridgeToken: 'private', bridgeId: 'bridge' };
  await assert.rejects(a.poll(config, fetcher)); assert.equal(sends, 1); assert.equal(a.jobs[0].reported, false);
  failResult = false; const b = await new PrintAgent({ directory: a.directory, send: a.send }).open(); await b.poll(config, fetcher); assert.equal(sends, 1); assert.equal(b.jobs[0].reported, true);
  await assert.rejects(b.enqueue({ ...input('expired'), lease_id: 'expired', leased_until: new Date(0).toISOString() }, printer), /expired_lease/);
});
test('local API rejects unauthenticated, wrong Host/Origin and forged remote lease', async t => {
  const a = await agent(t); const config = { port: 0, localToken: 'x'.repeat(64), allowedOrigins: ['https://app.scaleparaguay.com'], printers: [printer], mode: 'development' };
  const server = localServer(a, config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); config.port = server.address().port; t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${config.port}`;
  assert.equal((await fetch(`${url}/health`)).status, 403);
  const headers = { Authorization: `Bearer ${config.localToken}` };
  assert.equal((await fetch(`${url}/health`, { headers })).status, 200);
  assert.equal((await fetch(`${url}/health`, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(`${url}/print`, { method: 'POST', headers, body: JSON.stringify({ ...input(), lease_id: 'forged' }) })).status, 400);
});
test('package checksum installer and repo allowlist exclude runtime credentials', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scale-agent-package-')); t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.resolve(import.meta.dirname, '../..');
  const packed = spawnSync(process.execPath, ['build-tools/pack-print-agent.mjs', directory], { cwd: root, encoding: 'utf8' }); assert.equal(packed.status, 0, packed.stderr);
  const { artifact, sha256 } = JSON.parse(packed.stdout);
  const bad = spawnSync(process.execPath, ['print-agent/install.mjs', '--package', artifact, '--sha256', '0'.repeat(64), '--prefix', path.join(directory, 'bad')], { cwd: root, encoding: 'utf8' }); assert.equal(bad.status, 1);
  const good = spawnSync(process.execPath, ['print-agent/install.mjs', '--package', artifact, '--sha256', sha256, '--prefix', path.join(directory, 'installed')], { cwd: root, encoding: 'utf8' }); assert.equal(good.status, 0, good.stderr);
  assert.deepEqual((await fs.readdir(path.join(directory, 'installed'))).sort(), ['README.md','agent.mjs','cli.mjs','install.mjs','install.sh','package.json'].sort());
});
test('real TCP loopback accepts exactly the intended bytes without a physical destination', async t => {
  const net = await import('node:net'); const received = [];
  const server = net.createServer(socket => { socket.on('data', data => received.push(data)); socket.on('end', () => socket.end()); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const payload = Buffer.from('ONLY LOOPBACK TEST\n');
  const outcome = await sendLan({ host: '127.0.0.1', port: server.address().port }, payload);
  assert.equal(outcome.state, 'aceptado'); await new Promise(resolve => setTimeout(resolve, 10)); assert.deepEqual(Buffer.concat(received), payload);
});
test('near-expiry lease fails before send and local process port excludes second server', async t => {
  let sends = 0; const a = await agent(t, async () => { sends++; return { state: 'aceptado', transport: 'lan' }; });
  await a.enqueue({ ...input(), lease_id: 'soon', leased_until: new Date(Date.now() + 10000).toISOString() }, printer); await a.drain(); assert.equal(sends, 0); assert.equal(a.jobs[0].state, 'fallido');
  const config = { port: 0, localToken: 'x'.repeat(64), allowedOrigins: [] };
  const server = localServer(a, config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const second = localServer(a, config); await assert.rejects(new Promise((resolve, reject) => { second.once('error', reject); second.listen(server.address().port, '127.0.0.1', resolve); }), { code: 'EADDRINUSE' });
});
test('paired mode cannot bypass API jobs or configuration through loopback', async t => {
  const a = await agent(t); const config = { bridgeId: 'paired', port: 0, localToken: 'x'.repeat(64), allowedOrigins: [], printers: [printer] };
  const server = localServer(a, config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); config.port = server.address().port; t.after(() => new Promise(resolve => server.close(resolve)));
  for (const route of ['/print', '/config']) { const response = await fetch(`http://127.0.0.1:${config.port}${route}`, { method: 'POST', headers: { Authorization: `Bearer ${config.localToken}` }, body: JSON.stringify(input()) }); assert.equal(response.status, 403); }
  assert.equal(a.jobs.length, 0);
});
test('expired result HTTP409 reconciles visibly and does not block the next claim or reprint', async t => {
  let sends = 0; let claims = 0;
  const a = await agent(t, async () => { sends++; return { state: 'aceptado', transport: 'lan' }; });
  await a.enqueue({ ...input(), lease_id: 'lease', leased_until: new Date(Date.now() + 120000).toISOString() }, printer); await a.drain();
  const fetcher = async url => {
    if (url.endsWith('/result')) return new Response('{}', { status: 409 });
    if (url.endsWith('/config')) return Response.json({ bridge: { id: 'bridge' }, printers: [printer] });
    if (url.endsWith('/claim')) { claims++; return Response.json({ job: null }); }
    return Response.json({ ok: true });
  };
  await a.poll({ apiOrigin: 'https://example.com', bridgeToken: 'private', bridgeId: 'bridge' }, fetcher);
  assert.equal(sends, 1); assert.equal(claims, 1); assert.equal(a.jobs[0].reconciliation_required, true); assert.equal(a.jobs[0].state, 'incierto'); assert.equal(a.jobs[0].report_http_status, 409);
});
test('single-copy payload expands exactly once and 64KiB total cap includes copies', async t => {
  let actual;
  const a = await agent(t, async (target, bytes) => { actual = bytes; return { state: 'aceptado', transport: 'lan' }; });
  await a.enqueue({ ...input(), copies: 3 }, printer); await a.drain(); assert.deepEqual(actual, Buffer.from('ESC POS test'.repeat(3)));
  const large = Buffer.alloc(14000, 65); await assert.rejects(a.enqueue({ ...input('large'), copies: 5, payload_base64: large.toString('base64'), payload_bytes: large.length }, printer), /invalid_payload/);
});
test('CLI exclusive loopback bind precedes queue opening and releases on graceful restart', async t => {
  const { spawn } = await import('node:child_process'); const net = await import('node:net');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scale-agent-process-')); t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  await atomicJson(path.join(directory, 'config.json'), { apiOrigin: 'https://example.com', bridgeId: 'bridge', bridgeToken: 'x'.repeat(64), localToken: 'y'.repeat(64), port, allowedOrigins: [], printers: [] });
  const stub = path.join(directory, 'fetch.mjs'); await fs.writeFile(stub, "globalThis.fetch=async url=>Response.json(url.endsWith('/config')?{bridge:{id:'bridge'},printers:[]}:url.endsWith('/claim')?{job:null}:{ok:true});");
  const start = () => spawn(process.execPath, ['--import', stub, path.resolve(import.meta.dirname, '../cli.mjs'), 'run', '--data-dir', directory], { stdio: ['ignore','pipe','pipe'] });
  const exit = child => new Promise(resolve => child.once('exit', code => resolve(code)));
  const ready = child => new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('exit', code => reject(new Error(`early exit ${code}`))); });
  const first = start(); t.after(() => { if (first.exitCode === null) first.kill('SIGKILL'); }); await ready(first);
  const second = start(); const secondCode = await exit(second); assert.equal(secondCode, 1);
  const firstExit = exit(first); first.kill('SIGTERM'); assert.equal(await firstExit, 0);
  const third = start(); t.after(() => { if (third.exitCode === null) third.kill('SIGKILL'); }); await ready(third); const thirdExit = exit(third); third.kill('SIGTERM'); assert.equal(await thirdExit, 0);
});
test('claim snapshot is authoritative over a stale config destination', async t => {
  let actual; const a = await agent(t, async target => { actual = target; return { state: 'aceptado', transport: 'lan' }; });
  const snapshot = { ...printer, destination: 'lan:192.168.1.99:9100' };
  const job = { ...input(), lease_id: 'lease', leased_until: new Date(Date.now() + 120000).toISOString() };
  const fetcher = async url => Response.json(url.endsWith('/config') ? { bridge: { id: 'bridge' }, printers: [printer] } : url.endsWith('/claim') ? { job, printer: snapshot } : { ok: true });
  await a.poll({ apiOrigin: 'https://example.com', bridgeId: 'bridge', bridgeToken: 'private' }, fetcher); assert.equal(actual.host, '192.168.1.99');
});
