import {brotliCompress,gzip,constants as zlibConstants} from 'node:zlib';
import {promisify} from 'node:util';

// Compresión de respuestas JSON del API (#57): brotli cuando el cliente lo
// acepta, gzip como respaldo. Los documentos PDF/HTML del presupuesto y la
// revisión pública se sirven fuera de este helper y siguen sin comprimir; el
// API no tiene endpoints SSE. Los binarios nunca se comprimen.
const brotliCompressAsync=promisify(brotliCompress),gzipCompressAsync=promisify(gzip);
const compressionMinBytes=1024;
const compressibleTypes=['application/json','+json','text/'];
export const isCompressible=type=>{const value=String(type||'').toLowerCase();return compressibleTypes.some(marker=>value.includes(marker));};
// Peso de cada codificación según `Accept-Encoding` (q=0 la deshabilita; `*` habilita cualquiera).
const encodingWeight=(header,encoding)=>{
 for(const part of String(header||'').split(',')){
  const [token,...params]=part.trim().toLowerCase().split(';');
  if(token!==encoding&&token!=='*')continue;
  const quality=params.map(param=>param.trim()).find(param=>param.startsWith('q='));
  const value=quality?Number(quality.slice(2)):1;
  if(!Number.isFinite(value)||value<=0)continue;
  return {weight:value,wildcard:token==='*'};
 }
 return {weight:0,wildcard:false};
};
// Devuelve `{vary, encoding?, run?}`: `vary` marca las respuestas comprimibles
// (aunque no se compriman por tamaño) y `run` resuelve el cuerpo comprimido.
export function compressionPlan(req,text,contentType,status){
 const vary=isCompressible(contentType);
 const size=Buffer.byteLength(text);
 if(status===204||status===304||size<compressionMinBytes||!vary)return {vary};
 const header=req?.headers?.['accept-encoding'];
 const brotli=encodingWeight(header,'br'),gzipWeight=encodingWeight(header,'gzip');
 const brotliChosen=brotli.weight>0&&!brotli.wildcard&&(gzipWeight.weight<=0||gzipWeight.wildcard||brotli.weight>=gzipWeight.weight);
 if(brotliChosen)return {vary,encoding:'br',run:()=>brotliCompressAsync(Buffer.from(text),{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:4,[zlibConstants.BROTLI_PARAM_SIZE_HINT]:size}})};
 if((gzipWeight.weight>0&&!gzipWeight.wildcard)||brotli.wildcard||gzipWeight.wildcard)return {vary,encoding:'gzip',run:()=>gzipCompressAsync(Buffer.from(text),{level:6})};
 return {vary};
}
