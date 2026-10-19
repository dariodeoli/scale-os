import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const args = process.argv.slice(2);
const flag = name => args[args.indexOf(name) + 1];
const source = path.dirname(fileURLToPath(import.meta.url));
try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Se requiere Node 24 o superior.');
  const prefix = path.resolve(args.includes('--prefix') ? flag('--prefix') : path.join(os.homedir(), '.scale-print', 'app'));
  if (await fs.access(prefix).then(() => true, () => false)) throw new Error('Destino existente: detener el agente y elegir otro directorio para conservar la instalación actual.');
  let staging; let from;
  if (args.includes('--from-repo')) from = source;
  else {
    if (!args.includes('--package') || !args.includes('--sha256')) throw new Error('Usar --from-repo o --package archivo.tar.gz --sha256 HASH confiable.');
    const archive = path.resolve(flag('--package')); const expected = flag('--sha256');
    if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('SHA-256 inválido.');
    const hash = createHash('sha256').update(await fs.readFile(archive)).digest('hex');
    if (hash !== expected) throw new Error('SHA-256 no coincide.');
    const listed = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    const detailed = spawnSync('tar', ['-tvzf', archive], { encoding: 'utf8' });
    if (listed.status || detailed.status || listed.stdout.split('\n').filter(Boolean).some(n => !/^print-agent\/(?:[\w.-]+\/)*[\w.-]*$/.test(n) || n.split('/').includes('..')) || detailed.stdout.split('\n').filter(Boolean).some(n => !/^[-d]/.test(n))) throw new Error('Archivo no permitido.');
    staging = await fs.mkdtemp(path.join(os.tmpdir(), 'scale-print-install-'));
    const extract = spawnSync('tar', ['-xzf', archive, '-C', staging], { stdio: 'ignore' });
    if (extract.status) throw new Error('No se pudo extraer el paquete.');
    from = path.join(staging, 'print-agent');
  }
  // Explicit allowlist excludes generated config, tokens, logs, queue and arbitrary archive files.
  const files = ['agent.mjs', 'cli.mjs', 'install.mjs', 'install.sh', 'package.json', 'README.md'];
  await fs.mkdir(prefix, { recursive: true, mode: 0o700 });
  for (const file of files) { const stat = await fs.lstat(path.join(from, file)); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Contenido no permitido.'); await fs.copyFile(path.join(from, file), path.join(prefix, file), fs.constants.COPYFILE_EXCL); }
  if (staging) await fs.rm(staging, { recursive: true });
  console.log(`Agente instalado en ${prefix}. No se inició ni imprimió.\nEmparejar: node "${path.join(prefix, 'cli.mjs')}" pair\nIniciar: node "${path.join(prefix, 'cli.mjs')}" run\nGenerar servicio: node "${path.join(prefix, 'cli.mjs')}" service`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
