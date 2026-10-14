// Guardas del contexto de build de producción (Docker/Coolify).
// Origen: en Agendese, evidencias de QA commiteadas inflaron el contexto de
// 300 MB a 2 GB y el build se cortaba. Este test falla si:
//  - `.dockerignore` deja de excluir carpetas/archivos que el build no usa,
//    o empieza a excluir algo que el build sí necesita;
//  - Tailwind vuelve a escanear fuera de las rutas acotadas;
//  - un componente 'use client' importa (directa o transitivamente) un módulo
//    de base de datos (rompe el build de producción);
//  - el contexto real supera 400 MB o trae archivos de más de 5 MB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadDockerignore,measureContext} from '../scripts/verificar-contexto-build.mjs';

const repo=fileURLToPath(new URL('..',import.meta.url));
const MB=1024*1024;
const isExcluded=loadDockerignore(readFileSync(path.join(repo,'.dockerignore'),'utf8'));

test('.dockerignore excluye lo que el build no usa', () => {
  const mustExclude=[
    'docs/qa/148-landing/landing-1440-light.png','docs/ADOPCION-V2.md','design/tokens.fig',
    'tests/build-context.test.mjs','e2e/login.spec.ts','coverage/lcov.info',
    'playwright-report/index.html','test-results/run/trace.zip','work/visual-harness/latest/results.json',
    '.claude/skills/rdi/SKILL.md','.atl/skill-registry.md',
    'evidencia.har','app/qa/red.har','backend/qa/red.har.gz','artefactos/capturas.zip','build.log',
    'build-tools/visual-harness/qa/salida.png','build-tools/visual-harness/captures/x.jpg',
    'node_modules/next/package.json','.next/BUILD_ID','.env','.env.production','.git/HEAD',
  ];
  const leaked=mustExclude.filter(file=>!isExcluded(file));
  assert.deepEqual(leaked,[],`.dockerignore dejó de excluir: ${leaked.join(', ')}`);
});

test('.dockerignore no excluye lo que el build sí necesita', () => {
  const mustInclude=[
    'package.json','package-lock.json','Dockerfile','next.config.mjs','tailwind.config.mjs','postcss.config.mjs',
    'tsconfig.json','middleware.ts','core-api-origin.mjs','.env.example',
    'app/layout.tsx','app/globals.css','app/tailwind.css','app/legacy-routes.json','lib/prisma.ts','types/owncoding-ui.d.ts',
    'content/blog/empresa/2026-10-calendario-de-contenidos.mdx','public/scale-os.html','prisma/schema.prisma',
    'release/version.json','backend/package.json','backend/package-lock.json','backend/release-version.json',
    'build-tools/sync-release-version.mjs','build-tools/sync-landing-footer.tsx','build-tools/sync-seo.ts',
    // Tailwind escanea los fixtures del harness (ver tailwind.config.mjs).
    'build-tools/visual-harness/run.mjs','build-tools/visual-harness/fixtures/clientes.mjs',
  ];
  const dropped=mustInclude.filter(file=>isExcluded(file));
  assert.deepEqual(dropped,[],`.dockerignore excluye archivos que el build usa: ${dropped.join(', ')}`);
});

test('Tailwind escanea solo rutas acotadas', async () => {
  const {default:config}=await import('../tailwind.config.mjs');
  const allowed=['./app/','./build-tools/visual-harness/','./node_modules/owncoding-ui/'];
  const content=Array.isArray(config.content)?config.content:config.content?.files??[];
  assert.ok(content.length>0,'tailwind.config.mjs no declara content');
  for(const glob of content){
    assert.equal(typeof glob,'string',`content con entrada no textual: ${JSON.stringify(glob)}`);
    assert.ok(allowed.some(prefix=>glob.startsWith(prefix)),`Tailwind escanea fuera de las rutas acotadas: ${glob}`);
    assert.doesNotMatch(glob,/(^|\/)(docs|design|tests|e2e|coverage|work|playwright-report|test-results)(\/|$)/,`Tailwind escanea evidencias o tests: ${glob}`);
  }
});

const DB_MODULES=/^(@prisma\/client|prisma|pg|pg-pool|postgres|mongoose|mongodb|mysql2?|better-sqlite3|@neondatabase\/serverless)(\/|$)/;
const EXTENSIONS=['.ts','.tsx','.mts','.js','.mjs','.jsx'];
function resolveLocal(from,specifier){
  const base=specifier.startsWith('@/')?path.join(repo,specifier.slice(2)):path.resolve(path.dirname(from),specifier);
  for(const candidate of [base,...EXTENSIONS.map(ext=>base+ext),...EXTENSIONS.map(ext=>path.join(base,'index'+ext))])
    if(existsSync(candidate)&&statSync(candidate).isFile())return candidate;
  return null;
}
function importsOf(file){
  const source=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
  const specs=[];
  for(const match of source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g)){
    if(/^(?:import|export)\s+type\s/.test(match[0]))continue; // los imports de tipos no llegan al bundle
    specs.push(match[1]??match[2]??match[3]);
  }
  return specs;
}
function walk(dir,out=[]){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);else if(/\.(tsx?|mjs|js)$/.test(entry.name))out.push(full);
  }
  return out;
}

test("ningún componente 'use client' importa la base de datos", () => {
  const clientFiles=walk(path.join(repo,'app')).filter(file=>/^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(readFileSync(file,'utf8')));
  assert.ok(clientFiles.length>0,'no se encontraron componentes cliente');
  const offenders=[];
  for(const entry of clientFiles){
    const seen=new Set(),stack=[[entry,[path.relative(repo,entry)]]];
    while(stack.length){
      const [file,trail]=stack.pop();
      if(seen.has(file))continue;seen.add(file);
      for(const specifier of importsOf(file)){
        if(DB_MODULES.test(specifier)){offenders.push(`${[...trail,specifier].join(' → ')}`);continue;}
        if(!specifier.startsWith('.')&&!specifier.startsWith('@/'))continue;
        const target=resolveLocal(file,specifier);
        if(target&&!target.includes(`${path.sep}node_modules${path.sep}`))stack.push([target,[...trail,path.relative(repo,target)]]);
      }
    }
  }
  assert.deepEqual(offenders,[],`Componentes cliente que llegan a la base de datos:\n${offenders.join('\n')}`);
});

test('el contexto de build real queda bajo 400 MB y sin archivos de más de 5 MB', () => {
  for(const context of ['.','backend']){
    const result=measureContext(path.join(repo,context));
    assert.ok(result.includedBytes<=400*MB,`contexto ${context}: ${(result.includedBytes/MB).toFixed(1)} MB`);
    const heavy=result.included.filter(file=>file.size>5*MB).map(file=>`${file.path} (${(file.size/MB).toFixed(1)} MB)`);
    assert.deepEqual(heavy,[],`contexto ${context}: archivos de más de 5 MB`);
  }
});

test('el repositorio no versiona node_modules (ni como symlink de un worktree)', async () => {
  const {execFileSync}=await import('node:child_process');
  const tracked=execFileSync('git',['ls-files','-z'],{cwd:repo}).toString('utf8').split('\0').filter(Boolean);
  const offenders=tracked.filter(file=>file.split('/').includes('node_modules'));
  assert.deepEqual(offenders,[],`archivos versionados dentro o con nombre node_modules: ${offenders.join(', ')}`);
});
