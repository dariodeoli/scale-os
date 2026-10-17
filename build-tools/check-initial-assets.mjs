// Checks built assets, rather than source import spelling, for the login path.
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const targets={login:['/(workspace)/layout','/(workspace)/page'],status:['/status/page'],registro:['/registro/page']};
const budget=1750000;
export function checkInitialAssets(buildDirectory=resolve(ROOT,'.next')){
 if(!readFileSync(resolve(buildDirectory,'BUILD_ID'),'utf8').trim())throw Error('Missing production BUILD_ID');
 const {pages}=JSON.parse(readFileSync(resolve(buildDirectory,'app-build-manifest.json'),'utf8'));
 const result=[];
 for(const [name,entries] of Object.entries(targets)){
  const keys=['/layout',...entries];for(const key of keys)if(!Array.isArray(pages[key]))throw Error(`Missing manifest entry ${key}`);
  // Root error/404 controls are preloaded by Next too, when present.
  const files=[...new Set([...keys,'/error','/_not-found/page'].flatMap(key=>pages[key]||[]))].filter(file=>file.endsWith('.js'));
  let rawBytes=0,gzipBytes=0;
  for(const file of files){
   const asset=resolve(buildDirectory,file);if(!asset.startsWith(resolve(buildDirectory)+'/'))throw Error('Asset outside build');
   if(!statSync(asset).isFile())throw Error(`Missing asset ${file}`);
   const data=readFileSync(asset),source=data.toString();
   if(/bancos\/(?:atlas|continental|familiar)-(?:compacto|horizontal)/.test(source))throw Error(`${name}: financial artwork is in initial JavaScript (${file})`);
   rawBytes+=data.length;gzipBytes+=gzipSync(data).length;
  }
  if(rawBytes>budget)throw Error(`${name}: ${rawBytes} initial raw JS bytes exceeds ${budget}`);
  result.push({name,scripts:files.length,rawBytes,gzipBytes});
 }
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const argument=process.argv.find(value=>value.startsWith('--build-dir='));const results=checkInitialAssets(argument?resolve(argument.slice(12)):undefined);for(const row of results)console.log(`PASS initial ${row.name}: ${row.rawBytes} raw / ${row.gzipBytes} gzip bytes, ${row.scripts} scripts, no financial artwork`);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
