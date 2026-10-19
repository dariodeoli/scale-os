import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';

const MAX_BYTES = 64 * 1024;
const terminal = new Set(['aceptado', 'incierto', 'fallido', 'cancelado', 'confirmado']);
export async function atomicJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
  const handle = await fs.open(tmp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(data)); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(tmp, file); await fs.chmod(file, 0o600);
  const dir = await fs.open(path.dirname(file), 'r'); try { await dir.sync(); } finally { await dir.close(); }
}
export function destination(value, { allowLoopback = false } = {}) {
  const lan = /^lan:(\d{1,3}(?:\.\d{1,3}){3}):9100$/.exec(value || '');
  if (lan) {
    const octets = lan[1].split('.').map(Number);
    const privateIp = octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168);
    if (net.isIP(lan[1]) !== 4 || octets.some(n => n > 255) || (!privateIp && !(allowLoopback && octets[0] === 127))) throw new Error('invalid_destination');
    return { transport: 'lan', host: lan[1], port: 9100 };
  }
  const cups = /^cups:([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})$/.exec(value || '');
  if (cups) return { transport: 'cups', queue: cups[1] };
  throw new Error('unsupported_destination');
}
export function sendLan(target, bytes, { connect = net.createConnection, timeoutMs = 5000 } = {}) {
  return new Promise(resolve => {
    let attempted = false; let done = false;
    const socket = connect({ host: target.host, port: target.port });
    const finish = (state, error_code) => { if (done) return; done = true; socket.destroy(); resolve({ state, transport: 'lan', ...(error_code ? { error_code } : {}) }); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => { attempted = true; socket.end(bytes, () => finish('aceptado')); });
    socket.once('timeout', () => finish(attempted ? 'incierto' : 'fallido', 'transport_timeout'));
    socket.once('error', () => finish(attempted ? 'incierto' : 'fallido', attempted ? 'write_uncertain' : 'connect_failed'));
    socket.once('close', () => { if (!done) finish(attempted ? 'incierto' : 'fallido', 'connection_closed'); });
  });
}
export function sendCups(target, bytes, { spawnProcess = spawn, timeoutMs = 10000 } = {}) {
  return new Promise(resolve => {
    let submitted = false; let settled = false;
    const child = spawnProcess('lp', ['-d', target.queue, '-o', 'raw'], { stdio: ['pipe', 'ignore', 'ignore'], shell: false });
    const finish = (state, error_code) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ state, transport: 'cups', ...(error_code ? { error_code } : {}) }); };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(submitted ? 'incierto' : 'fallido', 'cups_timeout'); }, timeoutMs);
    child.once('spawn', () => { submitted = true; child.stdin.end(bytes); });
    child.stdin.on('error', () => finish(submitted ? 'incierto' : 'fallido', 'cups_stdin_failed'));
    child.once('error', () => finish(submitted ? 'incierto' : 'fallido', 'cups_unavailable'));
    child.once('close', code => finish(code === 0 ? 'aceptado' : submitted ? 'incierto' : 'fallido', code === 0 ? undefined : 'cups_rejected'));
  });
}
export function validateJob(input, printer, opts = {}) {
  if (!input || !/^[\w-]{1,100}$/.test(String(input.id)) || printer?.enabled !== true || input.printer_id !== printer.id || Number(input.width_mm) !== 80 || Number(printer.width_mm) !== 80) throw new Error('invalid_job');
  if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 5) throw new Error('invalid_copies');
  if (typeof input.payload_base64 !== 'string' || input.payload_base64.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.payload_base64)) throw new Error('invalid_payload');
  const bytes = Buffer.from(input.payload_base64, 'base64');
  if (!bytes.length || bytes.length * input.copies > MAX_BYTES || bytes.length !== input.payload_bytes) throw new Error('invalid_payload');
  const target = destination(printer.destination, opts);
  return { bytes, target };
}
export class PrintAgent {
  constructor({ directory, send = async (target, bytes) => target.transport === 'lan' ? sendLan(target, bytes) : sendCups(target, bytes), now = () => Date.now(), allowLoopback = false }) {
    this.directory = directory; this.send = send; this.now = now; this.allowLoopback = allowLoopback; this.ready = false; this.jobs = []; this.busy = false; this.persistence = Promise.resolve();
  }
  async open() {
    try { this.jobs = JSON.parse(await fs.readFile(path.join(this.directory, 'queue.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!Array.isArray(this.jobs)) throw new Error('corrupt_queue');
    for (const job of this.jobs) if (job.state === 'sending') { job.state = 'incierto'; job.error_code = 'restart_during_send'; delete job.payload_base64; }
    await this.save(); this.ready = true; return this;
  }
  save() { this.persistence = this.persistence.then(() => atomicJson(path.join(this.directory, 'queue.json'), this.jobs)); return this.persistence; }
  safe(job) { const { payload_base64, fingerprint, printer, lease_id, ...safe } = job; return safe; }
  async enqueue(input, printer) {
    const known = this.jobs.find(j => j.id === input.id);
    if (known) return this.safe(known);
    validateJob(input, printer, this);
    if (input.lease_id && (typeof input.lease_id !== 'string' || !Number.isFinite(Date.parse(input.leased_until)) || Date.parse(input.leased_until) <= this.now())) throw new Error('expired_lease');
    // Backend controls explicit reprints by creating a new leased job. Local calls cannot bypass the dedupe window.
    const fingerprint = createHash('sha256').update(`${printer.id}:${input.copies}:${input.payload_base64}`).digest('hex');
    if (!input.lease_id && this.jobs.some(j => j.fingerprint === fingerprint && this.now() - j.created_at < 60000)) throw new Error('duplicate_job');
    const job = { id: input.id, printer_id: input.printer_id, copies: input.copies, payload_base64: input.payload_base64, lease_id: input.lease_id, leased_until: input.leased_until, fingerprint, printer, state: 'pendiente', created_at: this.now(), remote: Boolean(input.lease_id), reported: false };
    this.jobs.push(job); await this.save(); return this.safe(job);
  }
  async drain() {
    if (this.busy) return; this.busy = true;
    try {
      for (const job of this.jobs.filter(j => j.state === 'pendiente')) {
        if (job.lease_id && Date.parse(job.leased_until) - this.now() < 30000) { job.state = 'fallido'; job.transport = destination(job.printer.destination, this).transport; job.error_code = 'expired_before_send'; delete job.payload_base64; await this.save(); continue; }
        const target = destination(job.printer.destination, this);
        job.state = 'sending'; await this.save(); // durable intent precedes any bytes; restart is uncertain
        let outcome;
        try { outcome = await this.send(target, Buffer.concat(Array.from({ length: job.copies }, () => Buffer.from(job.payload_base64, 'base64')))); }
        catch { outcome = { state: 'incierto', transport: target.transport, error_code: 'unexpected_transport_error' }; }
        Object.assign(job, outcome); delete job.payload_base64; await this.save();
      }
    } finally { this.busy = false; }
  }
  async cancel(id) {
    const job = this.jobs.find(j => j.id === id);
    if (!job || job.remote || job.state !== 'pendiente') throw new Error('cannot_cancel');
    job.state = 'cancelado'; delete job.payload_base64; await this.save(); return this.safe(job);
  }
  async poll(config, fetcher = fetch) {
    const api = async (route, body, reconcile = false) => {
      const response = await fetcher(`${config.apiOrigin}${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${config.bridgeToken}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (reconcile && [404, 409].includes(response.status)) return { reconciliation_status: response.status };
      if (!response.ok) throw new Error(`remote_http_${response.status}`); return response.json();
    };
    // Flush durable terminal results before obtaining further work; never print again to retry a report.
    const flush = async () => { for (const job of this.jobs.filter(j => j.remote && !j.reported && terminal.has(j.state))) { const response = await api(`/api/print/jobs/${encodeURIComponent(job.id)}/result`, { lease_id: job.lease_id, state: job.state, transport: job.transport, error_code: job.error_code }, true); if (response.reconciliation_status) { job.transport_state = job.state; job.state = 'incierto'; job.reconciliation_required = true; job.report_http_status = response.reconciliation_status; job.error_code = 'remote_result_conflict'; } job.reported = true; await this.save(); } };
    await api('/api/print/bridge/heartbeat', {});
    await flush();
    const remoteConfig = await api('/api/print/bridge/config');
    if (remoteConfig.bridge?.id !== config.bridgeId) throw new Error('bridge_mismatch');
    await this.drain(); await flush();
    const claimed = await api(`/api/print/bridges/${encodeURIComponent(config.bridgeId)}/claim`, {});
    if (claimed.job) {
      const printer = claimed.printer;
      if (!remoteConfig.printers.some(p => p.id === claimed.job.printer_id && p.enabled) || printer?.id !== claimed.job.printer_id || (remoteConfig.bridge.branch_id && printer.branch_id !== remoteConfig.bridge.branch_id)) throw new Error('claim_printer_mismatch');
      // The atomic claim snapshot is the destination authority; config fetched before it may be stale.
      await this.enqueue(claimed.job, printer); await this.drain(); await flush();
    }
  }
}
export function secureOrigin(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid_api_origin');
  return url.origin;
}
function sameToken(actual, expected) { if (typeof actual !== 'string' || typeof expected !== 'string') return false; const a = Buffer.from(actual); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); }
export function localServer(agent, config) {
  return http.createServer(async (req, res) => {
    if (!agent.ready) { res.writeHead(503); return res.end('{"error":"starting"}'); }
    const origin = req.headers.origin;
    if (req.headers.host !== `127.0.0.1:${config.port}` || (origin && !config.allowedOrigins.includes(origin)) || !sameToken(req.headers.authorization, `Bearer ${config.localToken}`)) { res.writeHead(403); return res.end('{"error":"forbidden"}'); }
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    try {
      if (req.method === 'GET' && req.url === '/health') return res.end(JSON.stringify({ ok: true, width_mm: 80, accepted_is_paper_confirmation: false }));
      if (req.method === 'GET' && req.url === '/diagnostico') return res.end(JSON.stringify({ supported_transports: ['lan', 'cups'], usb: 'requires_os_driver_via_cups', queue_count: agent.jobs.length }));
      if (req.method === 'GET' && /^\/jobs\/[\w-]+$/.test(req.url)) { const job = agent.jobs.find(j => j.id === req.url.slice(6)); res.statusCode = job ? 200 : 404; return res.end(JSON.stringify(job ? agent.safe(job) : { error: 'not_found' })); }
      if (req.method === 'POST' && ['/print', '/config'].includes(req.url)) {
        if (config.bridgeId || config.mode !== 'development') { res.statusCode = 403; return res.end('{"error":"remote_api_authority"}'); }
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > MAX_BYTES * 2) throw new Error('request_too_large'); }
        const body = JSON.parse(raw);
        if (req.url === '/config') { // paired authority is immutable from a browser
          const printers = body.printers;
          if (!Array.isArray(printers) || printers.length > 25) throw new Error('invalid_config');
          for (const p of printers) { if (p.width_mm !== 80 || !p.id) throw new Error('invalid_config'); destination(p.destination); }
          config.printers = printers; await atomicJson(path.join(agent.directory, 'config.json'), config); return res.end('{"ok":true}');
        }
        if (body.lease_id || body.manual_reprint || body.reported) throw new Error('remote_job_requires_claim');
        const printer = config.printers?.find(p => p.id === body.printer_id);
        const job = await agent.enqueue(body, printer); res.statusCode = 202; res.end(JSON.stringify(job)); void agent.drain().catch(() => {}); return;
      }
      res.statusCode = 404; res.end('{"error":"not_found"}');
    } catch { res.statusCode = 400; res.end('{"error":"invalid_request"}'); }
  });
}
