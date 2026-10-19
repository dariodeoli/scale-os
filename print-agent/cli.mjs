#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicJson, PrintAgent, localServer, secureOrigin } from './agent.mjs';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const directory = path.resolve(flag('--data-dir') || path.join(os.homedir(), '.scale-print'));
const configPath = path.join(directory, 'config.json');
const command = args[0] || 'run';
try {
  if (command === 'pair') {
    const apiOrigin = secureOrigin(flag('--api') || 'https://api.scaleparaguay.com');
    if (await fs.access(configPath).then(() => true, () => false)) throw new Error('already_paired_remove_only_after_revocation');
    const code = flag('--code') || (await fs.readFile('/dev/stdin', 'utf8')).trim();
    if (!/^[a-zA-Z0-9-]{6,100}$/.test(code)) throw new Error('invalid_pair_code');
    const response = await fetch(`${apiOrigin}/api/print/bridges/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error('pair_failed');
    const paired = await response.json();
    if (typeof paired.token !== 'string' || paired.token.length < 32 || !paired.bridge?.id) throw new Error('invalid_pair_response');
    await atomicJson(configPath, { apiOrigin, bridgeId: paired.bridge.id, bridgeToken: paired.token, localToken: randomBytes(32).toString('hex'), port: 17890, allowedOrigins: ['https://app.scaleparaguay.com', 'https://sistema.scaleparaguay.com'], printers: [] });
    console.log('Equipo emparejado. Configuración privada guardada; no se imprimió ningún documento.');
  } else if (command === 'service') {
    // Generate only: never load launchctl or enable systemd from the cloud.
    const exe = process.execPath; const cli = fileURLToPath(import.meta.url);
    if (/[\n\r"&<>%$\\]/.test(exe + cli + directory)) throw new Error('unsupported_service_path');
    const service = process.platform === 'darwin'
      ? `<?xml version="1.0"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>com.scale.print</string><key>ProgramArguments</key><array><string>${exe}</string><string>${cli}</string><string>run</string><string>--data-dir</string><string>${directory}</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/></dict></plist>`
      : `[Unit]\nDescription=Scale thermal 80 mm print agent\n[Service]\nExecStart="${exe}" "${cli}" run --data-dir "${directory}"\nRestart=on-failure\nRestartSec=15\nUMask=0077\nNoNewPrivileges=true\n[Install]\nWantedBy=default.target\n`;
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const target = path.join(directory, process.platform === 'darwin' ? 'com.scale.print.plist' : 'scale-print.service');
    await fs.writeFile(target, service, { mode: 0o600 }); console.log(`Servicio generado: ${target}. Activación local pendiente.`);
  } else if (command === 'run') {
    const stat = await fs.stat(configPath); if ((stat.mode & 0o077) !== 0) throw new Error('insecure_config_permissions');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    config.apiOrigin = secureOrigin(config.apiOrigin);
    if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535 || typeof config.localToken !== 'string' || config.localToken.length < 32 || !Array.isArray(config.allowedOrigins)) throw new Error('invalid_config');
    const agent = new PrintAgent({ directory });
    const server = localServer(agent, config);
    // Binding the fixed configured port is the OS-owned process lock, acquired BEFORE opening the queue.
    // A crash releases it automatically; a second process fails before touching persisted jobs.
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '127.0.0.1', resolve); });
    try { await agent.open(); } catch (error) { server.close(); throw error; }
    console.log('Scale Print: loopback activo. Transporte aceptado no confirma papel.');
    let stopping = false; const stop = new AbortController();
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopping = true; stop.abort(); agent.ready = false; });
    // Single-flight polling: no concurrent claims, no automatic replay of uncertain work.
    while (!stopping) {
      try { await agent.drain(); await agent.poll(config); } catch { console.error('Sin sincronización; se conserva la cola. Revisá configuración, autorización y conexión.'); }
      if (!stopping) await delay(15000, undefined, { signal: stop.signal }).catch(() => {});
    }
    await new Promise(resolve => server.close(resolve));
  } else throw new Error('unknown_command');
} catch (error) { console.error(`Scale Print: ${/^[a-z_]+$/.test(error.message) ? error.message : 'operation_failed'}`); process.exitCode = 1; }
