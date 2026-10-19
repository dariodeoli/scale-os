import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const release=JSON.parse(readFileSync(new URL('../release/version.json',import.meta.url),'utf8'));
export async function runReleaseSmoke({env=process.env,fetchImpl=fetch,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log}={}){
const expected=env.SCALE_EXPECTED_VERSION||release.version;
const appOrigin=(env.SCALE_APP_ORIGIN||'https://app.scaleparaguay.com').replace(/\/$/,'');
const apiOrigin=(env.SCALE_API_ORIGIN||'https://api.scaleparaguay.com').replace(/\/$/,'');
const deadline=now()+Number(env.SCALE_SMOKE_TIMEOUT_MS||240000);
const probe=async(name,url,status,verify)=>{
 if(!url.startsWith('https://'))throw new Error(`${name} debe usar HTTPS: ${url}`);
 let last='';while(now()<deadline){try{const response=await fetchImpl(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)}),body=await response.text();if(response.status===status&&verify(body,response)){log(`PASS: ${name} (${response.status})`);return;}last=`HTTP ${response.status}${response.status===status?' con respuesta inesperada':''}`;}catch{last='sin respuesta válida';}await pause(5000);}throw new Error(`${name} no confirmó v${expected}: ${last}`);
};
const visibleVersion=body=>body.replace(/<!--[\s\S]*?-->/g,'').includes(`v${expected}`);
const json=verify=>(body,response)=>{try{return /\bapplication\/json\b/i.test(response.headers.get('content-type')||'')&&verify(JSON.parse(body));}catch{return false;}};
await probe('Scale OS público',`${appOrigin}/status`,200,visibleVersion);
await probe('Registro público',`${appOrigin}/registro`,200,visibleVersion);
await probe('API de Scale OS',`${apiOrigin}/health`,200,json(health=>health?.ok===true&&health.database==='ready'&&health.release?.version===expected));
await probe('Sesión anónima por proxy web',`${appOrigin}/core-api/api/auth/me`,401,json(body=>typeof body?.error==='string'&&body.error.length>0));
await probe('Proveedores de acceso por proxy web',`${appOrigin}/core-api/api/auth/providers`,200,json(body=>['google','microsoft','apple'].every(key=>typeof body?.[key]==='boolean')));
await probe('Mantenimiento por proxy web',`${appOrigin}/core-api/api/public/maintenance`,200,json(body=>typeof body?.maintenance==='boolean'));
log(`Smoke test público aprobado para Scale OS v${expected}.`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runReleaseSmoke();
