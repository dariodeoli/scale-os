import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const sourceRoot=process.env.SCALE_SOURCE_ROOT||process.cwd(),version=JSON.parse(readFileSync(resolve(sourceRoot,'release/version.json'),'utf8')).version;
const mainSha=process.env.SCALE_RELEASE_SHA;if(!/^[a-f0-9]{40}$/.test(mainSha||''))throw Error('Set the verified GitHub merge SHA');
const app='https://app.scaleparaguay.com',api='https://api.scaleparaguay.com',hash=b=>createHash('sha256').update(b).digest('hex');
const result={checkedAt:new Date().toISOString(),version,mainSha,providerSha:null,responses:{}};
const get=async url=>{const r=await fetch(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(20000)});return {status:r.status,body:Buffer.from(await r.arrayBuffer())};};
for(const [key,url] of Object.entries({status:app+'/status',registro:app+'/registro',health:api+'/health',me:app+'/core-api/api/auth/me',providers:app+'/core-api/api/auth/providers',maintenance:app+'/core-api/api/public/maintenance',landing:app+'/scale-os.html'})){
 const r=await get(url);result.responses[key]={url,status:r.status};
 if(key==='me'){if(r.status!==401)throw Error('Unauthenticated auth/me should return401; got'+r.status);}
 else if(r.status!==200)throw Error(key+' not available:'+r.status);
 if(key==='health'){const h=JSON.parse(r.body);result.responses[key].health=h;if(!h.ok||h.database!=='ready'||h.release?.version!==version)throw Error('API version/database not ready');}
 else if(['status','registro'].includes(key)){const visible=r.body.toString().replace(/<!--[\s\S]*?-->/g,'').includes('v'+version);result.responses[key].visibleVersion=visible;if(!visible)throw Error(key+' version not ready');}
 else if(key==='landing'){Object.assign(result.responses[key],{remoteSha256:hash(r.body),mainSha256:hash(readFileSync(resolve(sourceRoot,'public/scale-os.html')))});if(result.responses[key].remoteSha256!==result.responses[key].mainSha256)throw Error('Landing file mismatch');}
}
const home=await get(app+'/');if(home.status!==200)throw Error('Login document not ready');
const scripts=[...new Set([...home.body.toString().matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]))];if(!scripts.length)throw Error('No initial scripts');
result.initialScripts=await Promise.all(scripts.map(async src=>{const url=new URL(src,app);if(url.origin!==app||!url.pathname.startsWith('/_next/static/'))throw Error('Unexpected script origin');const r=await get(url.href);if(r.status!==200)throw Error('Script unavailable');if(/bancos\/(?:atlas|continental|familiar)-(?:compacto|horizontal)/.test(r.body.toString()))throw Error('Financial artwork remains initial');return {path:url.pathname,rawBytes:r.body.length,gzipBytesCalculated:gzipSync(r.body).length};}));
result.initialRawBytes=result.initialScripts.reduce((n,s)=>n+s.rawBytes,0);result.initialGzipBytesCalculated=result.initialScripts.reduce((n,s)=>n+s.gzipBytesCalculated,0);
if(result.initialRawBytes>1750000)throw Error('Initial public JS exceeds budget');
writeFileSync(process.env.SCALE_PUBLIC_PROOF_OUTPUT||'/tmp/scale195-public-proof.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
