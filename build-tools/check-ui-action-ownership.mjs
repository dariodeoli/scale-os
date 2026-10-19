/** Refs #292: contextual CSS must preserve canonical Button ownership. */
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

const result=spawnSync(process.execPath,[resolve(root,'build-tools/qa-ui-action-styles.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,CHROME_PATH:chrome,QA_TAILWIND_CSS:css,QA_REPORT_ONLY:'0'}});
if(result.error){console.error(result.error.message);process.exit(1);}
process.exit(result.status??1);
