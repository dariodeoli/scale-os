/** Explicit browser acceptance gate: no skipped success when Chromium is unavailable. */
import {existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const chrome=process.env.PUPPETEER_EXECUTABLE_PATH||process.env.SCALE_QA_CHROME||'/usr/bin/chromium';
if(!existsSync(chrome)){console.error('Chromium is required: set PUPPETEER_EXECUTABLE_PATH to an installed browser.');process.exit(1);}
// CSS acceptance must compile the current checkout, never reuse another run's /tmp file.
const temporary=mkdtempSync(resolve(tmpdir(),'scale-browser-gates-'));
process.on('exit',()=>rmSync(temporary,{recursive:true,force:true}));
const config=resolve(temporary,'tailwind.config.mjs'),css=resolve(temporary,'tailwind.css');
writeFileSync(config,`import base from ${JSON.stringify(pathToFileURL(resolve(root,'tailwind.config.mjs')).href)};export default {...base,content:[...base.content,${JSON.stringify(resolve(root,'build-tools/qa-ui-tokens.mjs'))},${JSON.stringify(resolve(root,'build-tools/qa-ui-action-styles.mjs'))}]};`);
const compile=spawnSync(process.execPath,[resolve(root,'node_modules/tailwindcss/lib/cli.js'),'-c',config,'-i',resolve(root,'app/tailwind.css'),'-o',css,'--minify'],{cwd:root,stdio:'inherit'});
if(compile.error){console.error(compile.error.message);process.exit(1);}
if(compile.status!==0)process.exit(compile.status||1);
const cases=[
 ['tsx','tests/ui-button-browser.test.tsx'],
 ['node','tests/ui-select-browser.test.mjs'],
 ['node','tests/options-select-browser.test.mjs'],
 ['node','tests/editor-focus-browser-241.test.mjs'],
 ['node','tests/client-matches-browser-241.test.mjs'],
 ['node','tests/client-contacts-browser-184.test.mjs'],
 ['node','tests/workspace-form-lifecycle-browser-241.test.mjs'],
 ['node','tests/access-forms-browser-241.test.mjs'],
 ['node','tests/landing-responsive-browser-265.test.mjs'],
 ['node','tests/tab-scroller-browser-265.test.mjs'],
 ['node','tests/ui-temporal-drafts-browser-241.test.mjs'],
 ['node','tests/ui-numeric-browser-241.test.mjs'],
 ['node','tests/temporal-filter-browser.test.mjs'],
 ['node','tests/quote-composer-browser-241.test.mjs'],
 ['node','tests/report-problem-lifecycle-browser-241.test.mjs'],
 ['tsx','tests/dsn-147-estados.test.tsx'],
 ['tsx','tests/superadmin-form-browser.test.tsx'],
 ['node','build-tools/qa-ui-tokens.mjs'],
 ['node','build-tools/qa-ui-action-styles.mjs'],
];
for(const [runner,file]of cases){
 console.log(`\nBrowser gate: ${file}`);
 const result=spawnSync(runner==='tsx'?resolve(root,'node_modules/.bin/tsx'):process.execPath,[file],{cwd:root,stdio:'inherit',env:{...process.env,PUPPETEER_EXECUTABLE_PATH:chrome,SCALE_QA_CHROME:chrome,QA_TAILWIND_CSS:css}});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}
console.log(`PASS ${cases.length} browser gates. Synthetic local fixtures; production/OAuth/providers are not covered by this command.`);
