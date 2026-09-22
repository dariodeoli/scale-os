// Fuente concatenada del workspace para los contratos de código (issue #47).
// El shell (app/scale-workspace.tsx) quedó como marco y las secciones viven en
// app/sections/*.tsx; los contratos que verifican patrones del workspace completo
// leen esta fuente para no atarse a un archivo puntual.
//
// El orden de las secciones respeta el de montaje del shell (el mismo orden en que
// el render las evalúa), para que los contratos que comparan posiciones sigan
// teniendo el mismo significado que antes de la descomposición.
import {readFileSync, readdirSync} from 'node:fs';

const base = new URL('../app/', import.meta.url);

type MutableMap = Map<string, string>;

function sectionOrderFromShell(shell: string): string[] {
  const files: MutableMap = new Map(); // Componente -> archivo
  for (const m of shell.matchAll(/import \{(\w+Section)\} from '\.\/sections\/([\w-]+)';/g)) {
    files.set(m[1], m[2] + '.tsx');
  }
  const order: string[] = [];
  for (const m of shell.matchAll(/<(\w+Section)[\s/>]/g)) {
    const file = files.get(m[1]!);
    if (file && !order.includes(file)) order.push(file);
  }
  for (const file of readdirSync(new URL('sections', base)).sort()) {
    if (!order.includes(file)) order.push(file);
  }
  return order;
}

export function workspaceSource(): string {
  const shell = readFileSync(new URL('scale-workspace.tsx', base), 'utf8');
  const parts = [
    shell,
    readFileSync(new URL('workspace-request.ts', base), 'utf8'),
    readFileSync(new URL('workspace-types.ts', base), 'utf8'),
  ];
  for (const file of sectionOrderFromShell(shell)) {
    parts.push(readFileSync(new URL('sections/' + file, base), 'utf8'));
  }
  return parts.join('\n');
}

export function sectionSource(name: string): string {
  return readFileSync(new URL('sections/' + name, base), 'utf8');
}
