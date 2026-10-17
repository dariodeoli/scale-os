import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const result={checkedAt:new Date().toISOString(),mainSha:'b965d9dd33113a27f6a53f3fc3cbec651e008922',candidateCi:'39024251669',mainCi:'39024703523',providerSha:null,responses:{}};
for(const [key,url] of Object.entries({status:'https://app.scaleparaguay.com/status',registro:'https://app.scaleparaguay.com/registro',health:'https://api.scaleparaguay.com/health',landing:'https://app.scaleparaguay.com/scale-os.html'})){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)}),b=Buffer.from(await r.arrayBuffer()),s=b.toString();
 result.responses[key]={url,status:r.status};
 if(key==='health'){const h=JSON.parse(s);result.responses[key].health=h;if(!r.ok||!h.ok||h.database!=='ready'||h.release?.version!=='1.0.192')throw Error('API192/database not ready');}
 else if(key==='landing'){const sha=v=>createHash('sha256').update(v).digest('hex');Object.assign(result.responses[key],{remoteSha256:sha(b),mainSha256:sha(readFileSync(new URL('../../public/scale-os.html',import.meta.url)))});if(!r.ok||result.responses[key].remoteSha256!==result.responses[key].mainSha256)throw Error('landing mismatch');}
 else {result.responses[key].visibleVersion=s.replace(/<!--[\s\S]*?-->/g,'').includes('v1.0.192');if(!r.ok||!result.responses[key].visibleVersion)throw Error(key+'192 not ready');}
}
writeFileSync(process.env.SCALE_PUBLIC_PROOF_OUTPUT||'/tmp/scale192-public-proof.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
