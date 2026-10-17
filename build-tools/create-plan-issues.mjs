#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../docs/backlog/tasks-contracts/', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--create'].includes(args[0])) {
  console.error('Uso: node build-tools/create-plan-issues.mjs --check | --create');
  process.exit(1);
}
const repository = manifest.repository;
if (repository !== 'dariodeoli/scale-os') throw new Error('Repositorio inesperado.');
const prefix = manifest.marker_prefix;
const entries = manifest.issues;
const keys = new Set(entries.map((entry) => entry.key));
if (keys.size !== entries.length || !keys.has('plan')) throw new Error('Claves duplicadas o issue madre ausente.');
const bodies = new Map();
const ordered = [];
const visiting = new Set();
const visited = new Set();
function visit(entry) {
  if (visited.has(entry.key)) return;
  if (visiting.has(entry.key)) throw new Error(`Dependencia circular: ${entry.key}`);
  visiting.add(entry.key);
  for (const dependency of entry.depends_on) {
    const target = entries.find((item) => item.key === dependency);
    if (!target) throw new Error(`Dependencia inexistente: ${dependency}`);
    visit(target);
  }
  visiting.delete(entry.key);
  visited.add(entry.key);
  ordered.push(entry);
}
for (const entry of entries) {
  if (!/^[a-z0-9-]+$/.test(entry.key) || path.basename(entry.body_file) !== entry.body_file) throw new Error('Manifest inválido.');
  const body = readFileSync(path.join(directory, entry.body_file), 'utf8');
  if (!body.includes(`<!-- ${prefix}:${entry.key} -->`)) throw new Error(`Falta marcador en ${entry.key}`);
  bodies.set(entry.key, body);
  visit(entry);
}
if (args[0] === '--check') {
  console.log(`Manifest y cuerpos válidos: ${entries.length} issues. Orden: ${ordered.map((item) => item.key).join(', ')}. Sin acceso ni escritura en GitHub.`);
  process.exit(0);
}
function api(endpoint, { method = 'GET', body, paginate = false } = {}) {
  const argv = ['api', endpoint, '--method', method];
  // Older gh versions lack --slurp. Emit one compact JSON value per page.
  if (paginate) argv.push('--paginate', '--jq', '@json');
  if (body !== undefined) argv.push('--input', '-');
  // Structured argv and JSON stdin only: no shell interpolation or credential handling.
  const result = execFileSync('gh', argv, {
    encoding: 'utf8', input: body === undefined ? undefined : JSON.stringify(body),
    maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
  return paginate ? result.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : JSON.parse(result);
}
const endpoint = `repos/${repository}`;
const found = new Map();
const comments = new Map();
const indexPath = '/tmp/scale-plan-issues-20261017.json';
function saveIndex() {
  writeFileSync(indexPath, JSON.stringify({ repository, issues: [...found].map(([key, value]) => ({ key, number: value.number, url: value.html_url })) }, null, 2) + '\n', { mode: 0o600 });
}
try {
  // Complete all required existing-state reads before the first write.
  const pages = api(`${endpoint}/issues?state=all&per_page=100`, { paginate: true });
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) throw new Error('Respuesta de listado inválida.');
  const existing = pages.flat().filter((issue) => !issue.pull_request);
  for (const entry of entries) {
    const marker = `<!-- ${prefix}:${entry.key} -->`;
    const matches = existing.filter((issue) => issue.body?.includes(marker));
    if (matches.length > 1) throw new Error(`Marcador duplicado existente: ${entry.key}; revisar manualmente.`);
    if (matches.length === 1) {
      found.set(entry.key, matches[0]);
      const result = api(`${endpoint}/issues/${matches[0].number}/comments?per_page=100`, { paginate: true });
      if (!Array.isArray(result) || result.some((page) => !Array.isArray(page))) throw new Error('Respuesta de comentarios inválida.');
      comments.set(entry.key, result.flat());
    }
  }
  for (const entry of ordered) {
    if (found.has(entry.key)) {
      console.log(`Reutilizar ${entry.key}: ${found.get(entry.key).html_url}`);
      continue;
    }
    const mother = found.get('plan');
    const links = entry.depends_on.map((key) => `- ${key}: ${found.get(key).html_url}`).join('\n');
    const body = bodies.get(entry.key) + (mother ? `\nIssue madre: ${mother.html_url}\n` : '') + (links ? `\nDependencias enlazadas:\n\n${links}\n` : '');
    const created = api(`${endpoint}/issues`, { method: 'POST', body: { title: entry.title, body } });
    if (!created.number || !created.html_url) throw new Error(`Creación sin identidad válida: ${entry.key}; releer antes de reintentar.`);
    found.set(entry.key, created);
    comments.set(entry.key, []);
    saveIndex();
    console.log(`Creada ${entry.key}: ${created.html_url}`);
  }
  // Relation comments also repair links after a partially completed prior run.
  for (const entry of ordered) {
    const issue = found.get(entry.key);
    const marker = `<!-- ${prefix}:links:${entry.key} -->`;
    const links = entry.key === 'plan'
      ? entries.filter((item) => item.key !== 'plan').map((item) => `- ${item.title}: ${found.get(item.key).html_url}`)
      : [`- Issue madre: ${found.get('plan').html_url}`, ...entry.depends_on.filter((key) => key !== 'plan').map((key) => `- Depende de ${key}: ${found.get(key).html_url}`)];
    const body = `${marker}\n\nSeguimiento y dependencias del plan:\n\n${links.join('\n')}\n\nEl enlace no indica implementación ni pruebas aprobadas. La compra de papel y las verificaciones físicas tienen seguimiento operativo separado.`;
    const previous = comments.get(entry.key).filter((comment) => comment.body?.includes(marker));
    if (previous.length > 1) throw new Error(`Comentarios de relación duplicados: ${entry.key}; revisar manualmente.`);
    if (!previous.length) api(`${endpoint}/issues/${issue.number}/comments`, { method: 'POST', body: { body } });
    else if (previous[0].body !== body) api(`${endpoint}/issues/comments/${previous[0].id}`, { method: 'PATCH', body: { body } });
  }
  saveIndex();
  console.log(`Índice de URLs guardado en ${indexPath}.`);
} catch (error) {
  // Never print process environment, credentials, or complete API response bodies.
  console.error(`Seguimiento interrumpido: ${error.status !== undefined ? `gh falló (código ${error.status}); revisar acceso/conectividad` : error.message}. No se continúa con más escrituras. Reejecutar --create releerá el estado antes de crear.`);
  process.exitCode = 1;
}
