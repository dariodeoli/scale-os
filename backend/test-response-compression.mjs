import assert from 'node:assert/strict';
import {brotliDecompress,gunzip} from 'node:zlib';
import {promisify} from 'node:util';
import {compressionPlan,isCompressible} from './response-compression.js';

const text=JSON.stringify({rows:Array.from({length:200},(_,index)=>({id:index,title:'Orden '+index,description:'x'.repeat(60)}))});
const request=header=>({headers:header?{'accept-encoding':header}:{}});

assert.equal(isCompressible('application/json; charset=utf-8'),true);
assert.equal(isCompressible('text/html; charset=utf-8'),true);
assert.equal(isCompressible('application/pdf'),false);
assert.equal(isCompressible('image/webp'),false);

const small=compressionPlan(request('br'),'{"ok":true}','application/json',200);
assert.equal(small.run,undefined,'los cuerpos chicos no se comprimen');
assert.equal(small.vary,true);
const noHeader=compressionPlan(request(null),text,'application/json',200);
assert.equal(noHeader.run,undefined,'sin Accept-Encoding se sirve identidad');
const binary=compressionPlan(request('br'),text,'application/pdf',200);
assert.equal(binary.run,undefined,'los binarios nunca se comprimen');
assert.equal(binary.vary,false);
assert.equal(compressionPlan(request('br'),text,'application/json',204).run,undefined,'204/304 no llevan cuerpo');

const brotli=compressionPlan(request('gzip, deflate, br'),text,'application/json',200);
assert.equal(brotli.encoding,'br','brotli gana cuando el cliente lo acepta');
assert.equal((await promisify(brotliDecompress)(await brotli.run())).toString('utf8'),text,'el contenido decodificado es idéntico');
const gzipPlan=compressionPlan(request('gzip'),text,'application/json',200);
assert.equal(gzipPlan.encoding,'gzip','gzip como respaldo');
const gzipped=await gzipPlan.run();
assert.equal((await promisify(gunzip)(gzipped)).toString('utf8'),text,'el contenido decodificado es idéntico');
assert.ok(gzipped.length<Buffer.byteLength(text)/2,'la respuesta comprime de verdad');

console.log('PASS: compresión brotli/gzip según Accept-Encoding, binarios y cuerpos chicos excluidos, 204/304 sin cuerpo y contenido decodificado idéntico');
