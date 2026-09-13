import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const envFile=path.join(root,'.release.env');
if(existsSync(envFile))for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){const match=/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}
const apiRoot=process.env.SCALE_API_DIR||path.resolve(root,'../scale-core-api');
const run=(command,args,cwd=root)=>execFileSync(command,args,{cwd,stdio:'inherit'});
const fail=message=>{throw new Error(`Release cancelado: ${message}`);};
const succeeds=(command,args,cwd=root)=>{try{execFileSync(command,args,{cwd,stdio:'ignore'});return true;}catch{return false;}};
const assertCleanTracked=(directory,label)=>{if(!succeeds('git',['diff','--quiet'],directory))fail(`${label} tiene cambios rastreados sin guardar.`);if(!succeeds('git',['diff','--cached','--quiet'],directory))fail(`${label} tiene cambios preparados sin commit.`);};
const readJson=file=>JSON.parse(readFileSync(file,'utf8')),writeJson=(file,value)=>writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);
const bumpPatch=version=>{const match=/^(\d+)\.(\d+)\.(\d+)$/.exec(version);if(!match)fail('La versión central no es válida.');return `${match[1]}.${match[2]}.${Number(match[3])+1}`;};
const webhook=(name,url)=>fetch(url,{method:process.env.SCALE_DEPLOY_WEBHOOK_METHOD||'GET',redirect:'error',signal:AbortSignal.timeout(30000)}).then(response=>{if(!response.ok)throw new Error(`${name} respondió HTTP ${response.status}`);console.log(`Deploy solicitado: ${name}.`);});

if(!existsSync(path.join(apiRoot,'.git')))fail(`No se encontró el repositorio API. Configurá SCALE_API_DIR; se esperaba ${apiRoot}.`);
const apiWebhook=process.env.SCALE_API_DEPLOY_WEBHOOK,webWebhook=process.env.SCALE_WEB_DEPLOY_WEBHOOK;
if(Boolean(apiWebhook)!==Boolean(webWebhook))fail('Configurá ambos deploy webhooks o ninguno. Con ambos vacíos se usa el webhook GitHub → Coolify ya configurado.');
assertCleanTracked(root,'frontend');assertCleanTracked(apiRoot,'API');
const releasePath=path.join(root,'release/version.json'),release=readJson(releasePath),next=bumpPatch(release.version);release.version=next;writeJson(releasePath,release);run('node',['build-tools/sync-release-version.mjs']);
writeJson(path.join(apiRoot,'release-version.json'),{version:next,application:'Scale OS'});
for(const filename of ['package.json','package-lock.json']){const target=path.join(apiRoot,filename),json=readJson(target);json.version=next;if(filename==='package-lock.json')json.packages[''].version=next;writeJson(target,json);}
run('npm',['run','footer:check']);run('npm',['run','test:release-regression']);run('npm',['run','build']);run('npm',['run','test:release'],apiRoot);
run('git',['add','.gitignore','.release.env.example','release/version.json','app/app-version.ts','app/access-layout.tsx','app/brand-metadata.ts','app/google-sign-in.tsx','app/layout.tsx','app/registro/page.tsx','app/cliente/ingresar/page.tsx','app/scale-workspace.tsx','build-tools/sync-release-version.mjs','build-tools/release-smoke.mjs','build-tools/release-patch.mjs','tests/release-version.test.mjs','package.json','package-lock.json','public/scale-os.html'],root);run('git',['add','release-version.json','package.json','package-lock.json','server.js','test-auth.mjs'],apiRoot);
run('git',['commit','-m',`chore(release): Scale OS v${next}`],apiRoot);run('git',['push','origin','HEAD:main'],apiRoot);run('git',['commit','-m',`chore(release): Scale OS v${next}`],root);run('git',['push','origin','HEAD:main'],root);
if(apiWebhook&&webWebhook){await webhook('API',apiWebhook);await webhook('frontend',webWebhook);}else console.log('Deploy solicitado por el webhook GitHub → Coolify configurado en ambos repositorios.');
await import('./release-smoke.mjs');
