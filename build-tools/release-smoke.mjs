import {readFileSync} from 'node:fs';

const release=JSON.parse(readFileSync(new URL('../release/version.json',import.meta.url),'utf8'));
const expected=process.env.SCALE_EXPECTED_VERSION||release.version;
const appOrigin=(process.env.SCALE_APP_ORIGIN||'https://app.scaleparaguay.com').replace(/\/$/,'');
const apiOrigin=(process.env.SCALE_API_ORIGIN||'https://admin.scaleparaguay.com').replace(/\/$/,'');
const deadline=Date.now()+Number(process.env.SCALE_SMOKE_TIMEOUT_MS||240000),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const probe=async(name,url,verify)=>{
 if(!url.startsWith('https://'))throw new Error(`${name} debe usar HTTPS: ${url}`);
 let last='';while(Date.now()<deadline){try{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)}),body=await response.text();if(response.ok&&verify(body,response)){console.log(`PASS: ${name} (${response.status})`);return;}last=`HTTP ${response.status}`;}catch(error){last=error instanceof Error?error.message:'sin respuesta';}await pause(5000);}throw new Error(`${name} no confirmó v${expected}: ${last}`);
};
await probe('Scale OS público',`${appOrigin}/status`,body=>body.includes(`v${expected}`));
await probe('Registro público',`${appOrigin}/registro`,body=>body.includes(`v${expected}`));
await probe('API de Scale OS',`${apiOrigin}/health`,body=>{try{const health=JSON.parse(body);return health.ok===true&&health.release?.version===expected;}catch{return false;}});
console.log(`Smoke test público aprobado para Scale OS v${expected}.`);
