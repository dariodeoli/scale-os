/*
 * Minimal Chrome DevTools Protocol client for the visual harness.
 * Uses the global WebSocket available since Node 21, so the harness stays
 * dependency-free. Only page emulation and evaluation are implemented.
 */
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import net from 'node:net';

export const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launchChrome({chromePath = defaultChromePath, extraArgs = []} = {}) {
  const port = await freePort();
  const userDataDir = mkdtempSync(join(tmpdir(), 'sos-dsn-harness-'));
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--mute-audio',
      '--disable-gpu',
      ...extraArgs,
      'about:blank',
    ],
    {stdio: 'ignore'},
  );
  let version = null;
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        version = await response.json();
        break;
      }
    } catch {
      /* Chrome is still starting. */
    }
    await sleep(100);
  }
  if (!version) {
    child.kill('SIGKILL');
    throw new Error('Chrome did not expose the DevTools endpoint in 12s.');
  }
  return {
    port,
    version,
    async close() {
      child.kill('SIGKILL');
      await sleep(120);
      rmSync(userDataDir, {recursive: true, force: true});
    },
  };
}

export class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const {resolve, reject} = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? '')})`));
        else resolve(message.result);
        return;
      }
      if (message.method) {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params);
      }
    });
    socket.addEventListener('close', () => {
      for (const {reject} of this.pending.values()) reject(new Error('CDP socket closed.'));
      this.pending.clear();
    });
  }

  static async connect(webSocketUrl) {
    const socket = new WebSocket(webSocketUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, {once: true});
      socket.addEventListener('error', () => reject(new Error(`Cannot connect to ${webSocketUrl}`)), {once: true});
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.socket.send(JSON.stringify({id, method, params}));
    });
  }

  once(event) {
    return new Promise((resolve) => {
      const listener = (params) => {
        const list = this.listeners.get(event) || [];
        this.listeners.set(event, list.filter((item) => item !== listener));
        resolve(params);
      };
      this.listeners.set(event, [...(this.listeners.get(event) || []), listener]);
    });
  }

  async evaluate(expression, {awaitPromise = true} = {}) {
    const result = await this.send('Runtime.evaluate', {expression, awaitPromise, returnByValue: true});
    if (result.exceptionDetails) {
      throw new Error(`Page evaluation failed: ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description || ''}`);
    }
    return result.result.value;
  }

  close() {
    try {
      this.socket.close();
    } catch {
      /* already closed */
    }
  }
}

export async function openTarget(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await response.json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No page target in Chrome.');
  return Cdp.connect(page.webSocketDebuggerUrl);
}
