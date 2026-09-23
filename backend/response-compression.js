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
const acceptsEncoding=(header,encoding)=>String(header||'').split(',').map(part=>part.trim().toLowerCase().split(';')[0]).includes(encoding);
// Devuelve `{vary, encoding?, run?}`: `vary` marca las respuestas comprimibles
// (aunque no se compriman por tamaño) y `run` resuelve el cuerpo comprimido.
export function compressionPlan(req,text,contentType,status){
 const vary=isCompressible(contentType);
 const size=Buffer.byteLength(text);
 if(status===204||status===304||size<compressionMinBytes||!vary)return {vary};
 const header=req?.headers?.['accept-encoding'];
 if(acceptsEncoding(header,'br'))return {vary,encoding:'br',run:()=>brotliCompressAsync(Buffer.from(text),{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:4,[zlibConstants.BROTLI_PARAM_SIZE_HINT]:size}})};
 if(acceptsEncoding(header,'gzip'))return {vary,encoding:'gzip',run:()=>gzipCompressAsync(Buffer.from(text),{level:6})};
 return {vary};
}
