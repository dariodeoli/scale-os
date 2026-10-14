import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

// #178: los fixtures del harness visual son HTML estático; si una clase
// semántica desaparece de app/ el fixture sigue "pasando" mientras mide algo
// que ya no existe. Este test falla cuando un fixture usa una clase semántica
// que no está en ningún selector CSS ni literal de app/.
const root = fileURLToPath(new URL('..', import.meta.url));
const fixturesDir = join(root, 'build-tools/visual-harness/fixtures');
// Los fixtures de superadmin se rediseñan en paralelo (otra rama).
const SKIP_FIXTURE = /admin|superadmin/i;

// Clases propias del harness que no existen en app/ a propósito.
// Incluye clases que la app arma dinámicamente (`person-container-${size}`,
// `foto-perfil-${forma}`), las de owncoding-ui (`v2-numero`) y utilidades
// Tailwind sin guion (`peer`, `lucide`).
const ALLOWLIST = new Set([
  'harness-fixture',
  'person-container-sm', 'person-container-md', 'person-container-lg',
  'foto-perfil-circulo', 'foto-perfil-persona', 'foto-perfil-logo',
  'v2-numero',
  'lucide', 'peer',
]);

// Utilidades Tailwind (incluye variantes tipo md:, max-md:, [&_x]:).
const TAILWIND = /^(?:-?(?:p[xytblrse]?|m[xytblrse]?|gap(?:-[xy])?|space-[xy]|min-[wh]|max-[wh]|[wh]|size|inset(?:-[xy])?|top|left|right|bottom|z|flex|grid|col|row|order|basis|grow|shrink|text|font|leading|tracking|bg|from|to|via|border|rounded|ring|shadow|outline|opacity|overflow|overscroll|items|justify|content|self|place|aspect|object|line|whitespace|break|truncate|cursor|select|pointer|transition|duration|ease|animate|transform|translate|rotate|scale|origin|fill|stroke|divide|backdrop|blur|underline|no|list|sr|decoration|align|float|columns|table|motion|touch|resize|appearance|snap|scroll|accent|caret|will|mix|filter|brightness|contrast|sticky|fixed|absolute|relative|static|hidden|block|inline|contents|visible|invisible|isolate|uppercase|lowercase|capitalize|italic|tabular|antialiased)(?:-|$))/;

function walk(dir, ext, out = []) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (['node_modules', '.next'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, ext, out);
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(path);
  }
  return out;
}

const appCss = walk(join(root, 'app'), ['.css']).map((f) => readFileSync(f, 'utf8')).join('\n');
const appSrc = walk(join(root, 'app'), ['.tsx', '.ts']).map((f) => readFileSync(f, 'utf8')).join('\n');
const cssClasses = new Set([...appCss.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]));
const srcWords = new Set([...appSrc.matchAll(/[A-Za-z_][\w-]*/g)].map((m) => m[0]));

export function semanticTokens(source) {
  const tokens = new Set();
  for (const match of source.matchAll(/\bclass(?:Name)?="([^"]*)"/g)) {
    const value = match[1].replace(/\$\{[^}]*\}/g, ' ');
    for (const token of value.split(/\s+/)) {
      // Variantes (md:, hover:, [&_a]:) y valores arbitrarios son Tailwind.
      if (!token || token.includes('[') || token.includes(':') || token.includes('$') || token.includes('{')) continue;
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/i.test(token)) continue;
      if (TAILWIND.test(token)) continue;
      tokens.add(token);
    }
  }
  return tokens;
}

const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.mjs') && !SKIP_FIXTURE.test(f));

test('los fixtures no usan clases semánticas inexistentes en app/', () => {
  const missing = [];
  for (const file of files) {
    const source = readFileSync(join(fixturesDir, file), 'utf8');
    for (const token of semanticTokens(source)) {
      if (ALLOWLIST.has(token) || cssClasses.has(token) || srcWords.has(token)) continue;
      missing.push(`${file}: ${token}`);
    }
  }
  assert.deepEqual(missing, [], `Clases de fixtures sin equivalente en app/:\n${missing.join('\n')}`);
});

test('el extractor ignora utilidades Tailwind y variantes', () => {
  const tokens = semanticTokens('<div class="flex min-w-0 md:gap-3 max-md:flex-wrap panel ops-card [&_a]:x">');
  assert.deepEqual([...tokens].sort(), ['ops-card', 'panel']);
});
